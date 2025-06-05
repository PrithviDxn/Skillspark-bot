import OpenAI from 'openai';
import twilio from 'twilio';
import { createCanvas } from 'canvas';
import { Readable } from 'stream';
import interviewReportService from './interviewReportService.js';
import audioProcessingService from './audioProcessingService.js';
import interactionService from './interactionService.js';
import evaluationService from './evaluationService.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class AIInterviewer {
  constructor(roomSid, domain, customInstructions = '') {
    this.roomSid = roomSid;
    this.domain = domain;
    this.customInstructions = customInstructions;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.isActive = false;
    this.room = null;
    this.avatarCanvas = null;
    this.avatarStream = null;
    
    // Metrics tracking
    this.startTime = null;
    this.responseTimes = [];
    this.technicalScores = [];
    this.communicationScores = [];
  }

  async initialize() {
    try {
      // Generate initial questions based on domain
      const prompt = `Generate 5 technical interview questions for ${this.domain}. 
      ${this.customInstructions ? `Additional context: ${this.customInstructions}` : ''}
      Format the response as a JSON array of questions.`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer. Generate relevant and challenging questions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(completion.choices[0].message.content);
      this.questions = response.questions;

      // Initialize avatar
      await this.initializeAvatar();

      // Join the Twilio room
      const token = await this.generateBotToken();
      this.room = await this.connectToRoom(token);

      return true;
    } catch (error) {
      console.error('Error initializing AI interviewer:', error);
      throw error;
    }
  }

  async initializeAvatar() {
    // Create canvas for avatar
    this.avatarCanvas = createCanvas(640, 480);
    const ctx = this.avatarCanvas.getContext('2d');

    // Draw base avatar (a simple animated face)
    this.drawAvatar(ctx);

    // Create a readable stream from the canvas
    this.avatarStream = new Readable({
      read() {
        // This will be called when the stream needs more data
      }
    });

    // Start animation loop
    this.startAvatarAnimation();
  }

  drawAvatar(ctx) {
    const width = this.avatarCanvas.width;
    const height = this.avatarCanvas.height;

    // Clear canvas
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, width, height);

    // Draw face
    ctx.beginPath();
    ctx.arc(width/2, height/2, 100, 0, Math.PI * 2);
    ctx.fillStyle = '#ECF0F1';
    ctx.fill();

    // Draw eyes
    const eyeRadius = 10;
    const eyeOffset = 30;
    ctx.beginPath();
    ctx.arc(width/2 - eyeOffset, height/2 - 20, eyeRadius, 0, Math.PI * 2);
    ctx.arc(width/2 + eyeOffset, height/2 - 20, eyeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#2C3E50';
    ctx.fill();

    // Draw mouth
    ctx.beginPath();
    ctx.arc(width/2, height/2 + 20, 30, 0, Math.PI);
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Add some animation
    const time = Date.now() / 1000;
    const mouthCurve = Math.sin(time * 2) * 10;
    ctx.beginPath();
    ctx.arc(width/2, height/2 + 20, 30 + mouthCurve, 0, Math.PI);
    ctx.stroke();
  }

  startAvatarAnimation() {
    const animate = () => {
      if (!this.isActive) return;

      const ctx = this.avatarCanvas.getContext('2d');
      this.drawAvatar(ctx);

      // Convert canvas to buffer
      const buffer = this.avatarCanvas.toBuffer('image/png');
      this.avatarStream.push(buffer);

      // Schedule next frame
      setTimeout(animate, 1000 / 30); // 30 FPS
    };

    animate();
  }

  async generateBotToken() {
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { identity: 'ai-interviewer' }
    );

    const videoGrant = new VideoGrant({
      room: this.roomSid
    });

    token.addGrant(videoGrant);
    return token.toJwt();
  }

  async connectToRoom(token) {
    const { connect, createLocalVideoTrack } = await import('twilio-video');
    
    // Create video track from avatar stream
    const videoTrack = await createLocalVideoTrack({
      width: 640,
      height: 480,
      frameRate: 30,
      name: 'ai-avatar'
    });

    // Connect to room with video track
    const room = await connect(token, {
      name: this.roomSid,
      audio: true,
      video: videoTrack
    });

    return room;
  }

  async startInterview(candidateInfo) {
    try {
      this.isActive = true;
      this.startTime = new Date();
      
      // Create interview report
      await interviewReportService.createReport(
        this.roomSid,
        candidateInfo,
        this.domain
      );

      // Start asking questions
      await this.askNextQuestion();
    } catch (error) {
      console.error('Error starting interview:', error);
      throw error;
    }
  }

  async processResponse(audioStream) {
    try {
      const currentQuestion = this.questions[this.currentQuestionIndex];
      const responseStartTime = new Date();
      
      // Process audio and get transcription
      const transcription = await audioProcessingService.processAudioStream(
        audioStream,
        this.roomSid
      );

      // Analyze the response
      const analysis = await audioProcessingService.analyzeResponse(
        transcription,
        currentQuestion,
        this.domain
      );

      // Track metrics
      const responseTime = Math.floor((new Date() - responseStartTime) / 1000);
      this.responseTimes.push(responseTime);
      this.technicalScores.push(analysis.technicalScore);
      this.communicationScores.push(analysis.communicationScore);

      // Generate real-time feedback
      const feedback = await interactionService.generateRealTimeFeedback(analysis);
      
      // Add response to interview report
      await interviewReportService.addQuestionResponse(
        this.roomSid,
        currentQuestion,
        transcription,
        analysis
      );

      // Determine if we need a follow-up or clarification
      let nextQuestion;
      if (analysis.overallScore < 7) {
        // If the response needs clarification
        const clarification = await interactionService.generateClarificationQuestion(
          this.roomSid,
          currentQuestion,
          transcription,
          analysis
        );
        nextQuestion = clarification;
      } else {
        // Generate a follow-up question
        const followUp = await interactionService.generateFollowUpQuestion(
          this.roomSid,
          currentQuestion,
          transcription,
          analysis,
          this.domain
        );
        nextQuestion = followUp;
      }

      // Move to next question
      this.currentQuestionIndex++;
      if (this.currentQuestionIndex < this.questions.length) {
        await this.askNextQuestion();
      } else {
        await this.endInterview();
      }

      return {
        analysis,
        feedback,
        nextQuestion
      };
    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    }
  }

  async endInterview() {
    try {
      this.isActive = false;
      
      // Get all responses for evaluation
      const report = await interviewReportService.getReport(this.roomSid);
      
      // Generate comprehensive evaluation
      const evaluation = await evaluationService.generateEvaluation(
        this.roomSid,
        report.questions,
        this.domain
      );
      
      // Update report with evaluation
      report.evaluation = evaluation;
      await interviewReportService.updateReport(this.roomSid, report);
      
      // Clean up temporary audio files
      await audioProcessingService.cleanupTempFiles();
      
      // Clear interaction context
      interactionService.clearContext(this.roomSid);
      
      // Disconnect from room
      if (this.room) {
        this.room.disconnect();
      }

      return report;
    } catch (error) {
      console.error('Error ending interview:', error);
      throw error;
    }
  }

  async askNextQuestion() {
    if (!this.isActive || this.currentQuestionIndex >= this.questions.length) {
      return;
    }

    const question = this.questions[this.currentQuestionIndex];
    
    // Convert question to speech
    const speechResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: question
    });

    // Play the audio in the room
    const audioBuffer = await speechResponse.arrayBuffer();
    const audioTrack = await this.room.localParticipant.publishTrack(audioBuffer, {
      name: 'ai-question',
      kind: 'audio'
    });

    this.currentQuestionIndex++;
  }

  async processAnswer(audioData) {
    // Convert audio to text using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioData,
      model: "whisper-1"
    });

    // Generate follow-up question based on the answer
    const prompt = `Previous question: ${this.questions[this.currentQuestionIndex - 1]}
    Candidate's answer: ${transcription.text}
    Generate a follow-up question based on the answer.`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert technical interviewer. Generate relevant follow-up questions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4-turbo-preview"
    });

    const followUpQuestion = completion.choices[0].message.content;
    this.questions.push(followUpQuestion);

    return {
      question: this.questions[this.currentQuestionIndex - 1],
      answer: transcription.text,
      followUpQuestion
    };
  }

  async getMetrics() {
    const now = new Date();
    const timeElapsed = this.startTime ? Math.floor((now - this.startTime) / 1000) : 0;
    
    // Calculate average response time
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    // Calculate average scores
    const technicalScore = this.technicalScores.length > 0
      ? Math.round(this.technicalScores.reduce((a, b) => a + b, 0) / this.technicalScores.length)
      : 0;

    const communicationScore = this.communicationScores.length > 0
      ? Math.round(this.communicationScores.reduce((a, b) => a + b, 0) / this.communicationScores.length)
      : 0;

    return {
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      averageResponseTime,
      technicalScore,
      communicationScore,
      timeElapsed
    };
  }
}

export default AIInterviewer; 