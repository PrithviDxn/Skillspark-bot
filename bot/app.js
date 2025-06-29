// SkillSpark Bot Backend (Fresh Implementation)
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('ws');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const TranscriptionService = require('./transcription-service');
const OpenAI = require('openai');

// Placeholder for Twilio, OpenAI, and other integrations
// const twilio = require('twilio');
// const OpenAI = require('openai');

const app = express();
const server = http.createServer(app);
const wss = new Server({ server });

// Initialize transcription service
const transcriptionService = new TranscriptionService();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple logging function
function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
}

app.use(bodyParser.json());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl or mobile apps)
    if (!origin) return callback(null, true);

    // Allow localhost for local dev
    if (origin.startsWith('http://localhost')) return callback(null, true);

    // Allow all Netlify deploys and your specific Netlify site
    if (/netlify\.app$/.test(origin)) return callback(null, true);
    if (origin === 'https://cheerful-gelato-34f049.netlify.app') return callback(null, true);

    // Allow your Render domain (if you ever open avatar from there)
    if (origin === 'https://skillspark-bot.onrender.com') return callback(null, true);

    // Otherwise, block
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));

// Serve bot avatar static files
app.use('/avatar', express.static(path.join(__dirname, 'avatar')));

// In-memory state (replace with DB in production)
const sessions = {};

// --- REST API ---
app.post('/api/bot/:sessionId/start', async (req, res) => {
  const { sessionId } = req.params;
  sessions[sessionId] = sessions[sessionId] || { status: 'inactive', questions: [], current: 0 };
  sessions[sessionId].status = 'active';
  
  log(`Starting interview for session ${sessionId}`);
  
  // Send first question if available and interview is starting
  if (sessions[sessionId].questions && sessions[sessionId].questions.length > 0) {
    const question = sessions[sessionId].questions[0];
    log(`Sending first question: "${question.text}"`);
    // Call TTS endpoint to generate and broadcast audio
    try {
      const ttsRes = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: question.text,
      });
      const buffer = Buffer.from(await ttsRes.arrayBuffer());
      broadcast(sessionId, {
        type: 'TTS_AUDIO',
        audioData: buffer.toString('base64'),
        mimeType: 'audio/mp3',
        text: question.text,
      });
    } catch (err) {
      log(`TTS error: ${err.message}`);
      broadcast(sessionId, { type: 'START_INTERVIEW', question: question.text });
    }
  } else {
    log(`No questions available for session ${sessionId}`);
    broadcast(sessionId, { type: 'START_INTERVIEW' });
  }
  
  res.json({ success: true });
});

app.post('/api/bot/:sessionId/pause', (req, res) => {
  const { sessionId } = req.params;
  if (sessions[sessionId]) sessions[sessionId].status = 'paused';
  broadcast(sessionId, { type: 'PAUSE' });
  res.json({ success: true });
});

app.post('/api/bot/:sessionId/resume', (req, res) => {
  const { sessionId } = req.params;
  if (sessions[sessionId]) sessions[sessionId].status = 'active';
  broadcast(sessionId, { type: 'RESUME' });
  res.json({ success: true });
});

app.post('/api/bot/:sessionId/stop', (req, res) => {
  const { sessionId } = req.params;
  if (sessions[sessionId]) sessions[sessionId].status = 'inactive';
  broadcast(sessionId, { type: 'STOP' });
  res.json({ success: true });
});

app.post('/api/bot/:sessionId/instruction', (req, res) => {
  const { sessionId } = req.params;
  const { instruction } = req.body;
  broadcast(sessionId, { type: 'INSTRUCTION', instruction });
  res.json({ success: true });
});

// Set tech stack for a session and fetch questions
app.post('/api/bot/:sessionId/set-techstack', async (req, res) => {
  const { sessionId } = req.params;
  const { techStackId } = req.body;
  if (!techStackId) return res.status(400).json({ error: 'techStackId required' });
  try {
    // Fetch questions for this tech stack from the main API
    const apiUrl = process.env.QUESTION_API_URL || 'http://localhost:5000/api/v1/questions';
    const response = await axios.get(`${apiUrl}?techStack=${techStackId}`);
    const questions = response.data?.data?.map(q => ({ id: q._id, text: q.text })) || [];
    if (!questions.length) return res.status(404).json({ error: 'No questions found for this tech stack' });
    sessions[sessionId] = sessions[sessionId] || {};
    sessions[sessionId].questions = questions;
    sessions[sessionId].current = 0;
    sessions[sessionId].techStackId = techStackId;
    // Do NOT broadcast or start the interview here!
    log(`Loaded ${questions.length} questions for tech stack ${techStackId}`);
    res.json({ success: true, count: questions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add endpoint to go to next question
app.post('/api/bot/:sessionId/next', (req, res) => {
  const { sessionId } = req.params;
  if (!sessions[sessionId] || !sessions[sessionId].questions) return res.status(400).json({ error: 'No questions loaded' });
  sessions[sessionId].current = (sessions[sessionId].current || 0) + 1;
  const idx = sessions[sessionId].current;
  const question = sessions[sessionId].questions[idx];
  if (question) {
    broadcast(sessionId, { type: 'NEXT_QUESTION', question: question.text });
    res.json({ success: true, question: question.text });
  } else {
    broadcast(sessionId, { type: 'END' });
    res.json({ success: false, message: 'No more questions' });
  }
});

// Get captured answers for a session
app.get('/api/bot/:sessionId/answers', (req, res) => {
  const { sessionId } = req.params;
  if (!sessions[sessionId]) return res.status(404).json({ error: 'Session not found' });
  
  const answers = sessions[sessionId].answers || [];
  const questions = sessions[sessionId].questions || [];
  
  // Format answers with questions
  const formattedAnswers = answers.map(answer => ({
    ...answer,
    question: questions[answer.questionIndex]?.text || 'Unknown question'
  }));
  
  res.json({ 
    success: true, 
    answers: formattedAnswers,
    totalAnswers: answers.length,
    totalQuestions: questions.length
  });
});

// Get session status
app.get('/api/bot/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  if (!sessions[sessionId]) return res.status(404).json({ error: 'Session not found' });
  
  res.json({
    success: true,
    status: sessions[sessionId].status || 'inactive',
    currentQuestion: sessions[sessionId].current || 0,
    totalQuestions: sessions[sessionId].questions?.length || 0,
    answersCount: sessions[sessionId].answers?.length || 0,
    techStackId: sessions[sessionId].techStackId
  });
});

// --- Twilio Video Token Endpoint ---
app.post('/api/bot/token', (req, res) => {
  const { identity, room } = req.body;
  if (!identity || !room) return res.status(400).json({ error: 'identity and room required' });

  const AccessToken = twilio.jwt.AccessToken;
  const VideoGrant = AccessToken.VideoGrant;

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { identity }
  );
  token.addGrant(new VideoGrant({ room }));

  res.json({ token: token.toJwt() });
});

// --- WebSocket for bot/avatar communication ---
wss.on('connection', (ws, req) => {
  // Parse sessionId from query string
  const url = new URL(req.url, 'http://localhost');
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return ws.close();
  ws.sessionId = sessionId;

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      
      // Handle messages from avatar/frontend
      if (data.type === 'ANSWER_RECEIVED') {
        // Store the candidate's answer in bot session
        if (!sessions[sessionId]) sessions[sessionId] = {};
        if (!sessions[sessionId].answers) sessions[sessionId].answers = [];
        
        const currentQuestionIndex = sessions[sessionId].current || 0;
        const currentQuestion = sessions[sessionId].questions?.[currentQuestionIndex];
        
        // Transcribe audio if available
        let transcript = data.transcript || '';
        if (data.audioBlob && !transcript) {
          try {
            const audioBuffer = Buffer.from(data.audioBlob, 'base64');
            const transcriptionResult = await transcriptionService.transcribeAudio(
              audioBuffer, 
              `bot-answer-${sessionId}-${Date.now()}.wav`
            );
            
            if (transcriptionResult.success) {
              transcript = transcriptionResult.transcript;
              console.log(`Transcription successful: ${transcript}`);
            } else {
              console.log(`Transcription failed: ${transcriptionResult.error}`);
              transcript = `Audio captured from ${data.participantId} (transcription failed)`;
            }
          } catch (error) {
            console.error('Transcription error:', error);
            transcript = `Audio captured from ${data.participantId} (transcription error)`;
          }
        }
        
        // Store in bot session
        sessions[sessionId].answers.push({
          questionIndex: currentQuestionIndex,
          answer: transcript,
          timestamp: new Date().toISOString(),
          participantId: data.participantId,
          audioBlob: data.audioBlob,
          transcript: transcript
        });
        
        console.log(`Answer stored for session ${sessionId}:`, transcript);
        
        // --- INTEGRATION: Save answer to main database ---
        if (currentQuestion && data.audioBlob) {
          try {
            // Convert base64 audio to buffer
            const audioBuffer = Buffer.from(data.audioBlob, 'base64');
            
            // Upload audio to main server
            const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:5000/api/v1';
            const uploadResponse = await axios.post(`${mainApiUrl}/uploads/audio`, {
              audio: audioBuffer.toString('base64'),
              filename: `bot-answer-${sessionId}-${Date.now()}.wav`
            }, {
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (uploadResponse.data?.success) {
              const audioUrl = uploadResponse.data.audioUrl;
              
              // Create answer in main database
              const answerResponse = await axios.post(`${mainApiUrl}/answers`, {
                interview: sessionId, // This should be the actual interview ID
                question: currentQuestion.id,
                audioUrl: audioUrl,
                transcript: transcript,
                participantId: data.participantId
              });
              
              if (answerResponse.data?.success) {
                console.log(`Answer saved to main database for session ${sessionId}`);
              }
            }
          } catch (error) {
            console.error('Error saving answer to main database:', error);
          }
        }
        
        // Notify admin that answer was received
        broadcast(sessionId, { 
          type: 'ANSWER_STORED', 
          questionIndex: currentQuestionIndex,
          participantId: data.participantId,
          transcript: transcript
        });
      } else if (data.type === 'BOT_READY') {
        // Bot has joined the room and is ready
        broadcast(sessionId, { type: 'BOT_READY' });
      } else if (data.type === 'SPEECH_STARTED') {
        // Bot started speaking
        broadcast(sessionId, { type: 'SPEECH_STARTED' });
      } else if (data.type === 'SPEECH_ENDED') {
        // Bot finished speaking
        broadcast(sessionId, { type: 'SPEECH_ENDED' });
      } else if (data.type === 'PING') {
        // Respond to ping to keep connection alive
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
});

function broadcast(sessionId, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.sessionId === sessionId) {
      client.send(JSON.stringify(message));
    }
  });
}

// --- Question Management (placeholder) ---
function getNextQuestion(sessionId) {
  // TODO: Integrate OpenAI and pre-defined questions
  const q = sessions[sessionId]?.questions || [
    'Tell me about yourself.',
    'What are your strengths?',
    'Describe a challenge you faced.'
  ];
  const idx = sessions[sessionId]?.current || 0;
  return q[idx] || null;
}

// Server-side TTS endpoint
app.post('/api/bot/:sessionId/tts', async (req, res) => {
  const { sessionId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    // Generate TTS audio with OpenAI
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    // Broadcast to all clients in the session
    broadcast(sessionId, {
      type: 'TTS_AUDIO',
      audioData: buffer.toString('base64'),
      mimeType: 'audio/mp3',
      text,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`SkillSpark Bot backend running on port ${PORT}`);
}); 