import { Readable } from 'stream';
import interviewReportService from './interviewReportService.js';
import audioProcessingService from './audioProcessingService.js';
import Question from '../models/Question.js';
import TechStack from '../models/TechStack.js';

// Try to import canvas, but don't fail if it's not available
let canvas;
try {
  const canvasModule = await import('canvas');
  canvas = canvasModule;
} catch (error) {
  console.warn('Canvas module not available. Avatar generation will be disabled.');
}

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
    this.hasCanvas = !!canvas;
    this.startTime = null;
  }

  async initialize() {
    await this.initializeQuestions(this.domain);
    if (this.hasCanvas) {
      await this.initializeAvatar();
      await this.publishAvatarToRoom();
    }
  }

  async initializeQuestions(domain) {
    // Find the tech stack by name
    const techStack = await TechStack.findOne({ name: domain });
    if (!techStack) throw new Error(`Tech stack '${domain}' not found.`);
    // Fetch all questions for this tech stack
    const questions = await Question.find({ techStack: techStack._id }).sort({ createdAt: 1 });
    if (!questions.length) throw new Error(`No questions found for tech stack '${domain}'.`);
    this.questions = questions.map(q => q.text);
    this.currentQuestionIndex = 0;
  }

  async initializeAvatar() {
    // Create a static avatar image using canvas
    this.avatarCanvas = canvas.createCanvas(640, 480);
    const ctx = this.avatarCanvas.getContext('2d');
    // Draw a simple avatar (circle face, eyes, smile)
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, 640, 480);
    ctx.beginPath();
    ctx.arc(320, 240, 100, 0, Math.PI * 2);
    ctx.fillStyle = '#ECF0F1';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(290, 220, 10, 0, Math.PI * 2);
    ctx.arc(350, 220, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#2C3E50';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(320, 270, 30, 0, Math.PI);
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Create a readable stream from the canvas (static image)
    const buffer = this.avatarCanvas.toBuffer('image/png');
    this.avatarStream = new Readable();
    this.avatarStream.push(buffer);
    this.avatarStream.push(null);
  }

  async publishAvatarToRoom() {
    // This is a placeholder. Actual Twilio video publishing would require client-side logic or a media server.
    // Here, you would use Twilio Video APIs to publish the avatarStream as a video track to the room.
    // For now, just log that the avatar would be published.
    console.log('Bot avatar would be published to the Twilio room as a video track.');
  }

  async startInterview(candidateInfo) {
    this.isActive = true;
    this.startTime = new Date();
    await interviewReportService.createReport(this.roomSid, candidateInfo, this.domain);
  }

  async recordAnswer(audioPath, text) {
    const currentQuestion = this.questions[this.currentQuestionIndex];
    await interviewReportService.addQuestionResponse(
      this.roomSid,
      currentQuestion,
      { audio: audioPath, text }
    );
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.questions.length) {
      return this.questions[this.currentQuestionIndex];
    } else {
      this.isActive = false;
      return null;
    }
  }

  async endInterview() {
    this.isActive = false;
    // No evaluation or LLM logic, just return the report
    return interviewReportService.getReport(this.roomSid);
  }
}

export default AIInterviewer; 