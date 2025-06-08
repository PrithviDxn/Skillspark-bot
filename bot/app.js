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

// Placeholder for Twilio, OpenAI, and other integrations
// const twilio = require('twilio');
// const OpenAI = require('openai');

const app = express();
const server = http.createServer(app);
const wss = new Server({ server });

app.use(bodyParser.json());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://skill-spark-interview-ai.netlify.app',
    'https://skillsparkai.netlify.app',
  ],
  credentials: true
}));

// In-memory state (replace with DB in production)
const sessions = {};

// --- REST API ---
app.post('/api/bot/:sessionId/start', (req, res) => {
  const { sessionId } = req.params;
  sessions[sessionId] = sessions[sessionId] || { status: 'inactive', questions: [], current: 0 };
  sessions[sessionId].status = 'active';
  // Send first question if available
  if (sessions[sessionId].questions && sessions[sessionId].questions.length > 0) {
    const question = sessions[sessionId].questions[0];
    broadcast(sessionId, { type: 'QUESTION', question });
  }
  broadcast(sessionId, { type: 'START' });
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
    const questions = response.data?.data?.map(q => q.text) || [];
    if (!questions.length) return res.status(404).json({ error: 'No questions found for this tech stack' });
    sessions[sessionId] = sessions[sessionId] || {};
    sessions[sessionId].questions = questions;
    sessions[sessionId].current = 0;
    sessions[sessionId].techStackId = techStackId;
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
    broadcast(sessionId, { type: 'QUESTION', question });
    res.json({ success: true, question });
  } else {
    broadcast(sessionId, { type: 'END' });
    res.json({ success: false, message: 'No more questions' });
  }
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

  ws.on('message', (msg) => {
    // Handle messages from avatar/frontend (e.g., answer, status)
    // TODO: Store answers, process audio, etc.
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

// --- Start Server ---
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`SkillSpark Bot backend running on port ${PORT}`);
}); 