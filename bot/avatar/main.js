import { connect, createLocalVideoTrack } from 'twilio-video';

const app = document.getElementById('app');

// --- Config (from query params or defaults) ---
const params = new URLSearchParams(window.location.search);
const SESSION_ID = params.get('sessionId') || 'demo-session';
const ROOM_NAME = params.get('room') || 'demo-room';
const BACKEND_URL = params.get('backend') || 'http://localhost:5000';
const WS_URL = (window.location.hostname === 'localhost')
  ? `ws://localhost:5000?sessionId=${SESSION_ID}`
  : `wss://YOUR_BACKEND_URL?sessionId=${SESSION_ID}`; // Replace with your Render backend URL

// --- Avatar UI (canvas) ---
app.innerHTML = `
  <canvas id="avatar-canvas" width="200" height="200" style="border-radius:50%;background:#2C3E50;display:block;margin:40px auto;"></canvas>
  <div id="status" style="margin-top:16px;color:#fff;font-weight:bold;">Inactive</div>
  <div id="question" style="margin-top:8px;color:#fff;"></div>
  <div id="video-status" style="margin-top:8px;color:#fff;font-size:12px;"></div>
`;

const avatarCanvas = document.getElementById('avatar-canvas');
const statusEl = document.getElementById('status');
const questionEl = document.getElementById('question');
const videoStatusEl = document.getElementById('video-status');

// Draw a simple avatar face on the canvas
function drawAvatarFace(ctx) {
  ctx.clearRect(0, 0, 200, 200);
  // Face
  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, 2 * Math.PI);
  ctx.fillStyle = '#ECF0F1';
  ctx.fill();
  // Eyes
  ctx.beginPath();
  ctx.arc(70, 90, 10, 0, 2 * Math.PI);
  ctx.arc(130, 90, 10, 0, 2 * Math.PI);
  ctx.fillStyle = '#2C3E50';
  ctx.fill();
  // Mouth
  ctx.beginPath();
  ctx.arc(100, 120, 30, 0, Math.PI);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#2C3E50';
  ctx.stroke();
}
const ctx = avatarCanvas.getContext('2d');
drawAvatarFace(ctx);

function setStatus(status) {
  statusEl.textContent = status;
}
function setQuestion(q) {
  questionEl.textContent = q || '';
}
function speak(text) {
  if (!text) return;
  // Optionally animate mouth here
  const utter = new window.SpeechSynthesisUtterance(text);
  utter.onstart = () => {
    // Animate mouth open
    ctx.clearRect(70, 120, 60, 30);
    ctx.beginPath();
    ctx.arc(100, 135, 20, 0, Math.PI, false);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#2C3E50';
    ctx.stroke();
  };
  utter.onend = () => {
    // Redraw normal mouth
    ctx.clearRect(70, 120, 60, 30);
    ctx.beginPath();
    ctx.arc(100, 120, 30, 0, Math.PI);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#2C3E50';
    ctx.stroke();
  };
  window.speechSynthesis.speak(utter);
}

// --- WebSocket: Listen for backend commands ---
const ws = new WebSocket(WS_URL);
ws.onopen = () => setStatus('Connected');
ws.onclose = () => setStatus('Disconnected');
ws.onerror = () => setStatus('Error');
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'START') setStatus('Active');
  if (msg.type === 'PAUSE') setStatus('Paused');
  if (msg.type === 'RESUME') setStatus('Active');
  if (msg.type === 'STOP') setStatus('Inactive');
  if (msg.type === 'INSTRUCTION' && msg.instruction) {
    setQuestion(msg.instruction);
    speak(msg.instruction);
  }
};

// --- Twilio Video Join ---
async function joinTwilioRoom() {
  videoStatusEl.textContent = 'Joining Twilio room...';
  // Fetch token from backend
  const res = await fetch(`${BACKEND_URL}/api/bot/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'bot', room: ROOM_NAME })
  });
  const data = await res.json();
  if (!data.token) {
    videoStatusEl.textContent = 'Failed to get Twilio token';
    return;
  }
  // Create video track from avatar canvas
  const stream = avatarCanvas.captureStream(15);
  const [videoTrack] = stream.getVideoTracks();
  const localVideoTrack = await createLocalVideoTrack({
    name: 'bot-avatar',
    video: { width: 200, height: 200, frameRate: 15 },
    mediaStreamTrack: videoTrack
  });
  // Join room
  connect(data.token, {
    name: ROOM_NAME,
    tracks: [localVideoTrack],
    dominantSpeaker: false,
    networkQuality: false,
    audio: false,
    video: true,
    identity: 'bot'
  }).then(room => {
    videoStatusEl.textContent = `Joined Twilio room: ${ROOM_NAME}`;
    // Optionally: handle room events
    room.on('disconnected', () => {
      videoStatusEl.textContent = 'Disconnected from Twilio room';
    });
  }).catch(err => {
    videoStatusEl.textContent = 'Failed to join Twilio room: ' + err.message;
  });
}

joinTwilioRoom(); 