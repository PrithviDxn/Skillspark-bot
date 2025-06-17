// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const roomName = urlParams.get('room');

// DOM elements
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const localVideo = document.getElementById('local-video');

// Logging function
function log(message) {
    const time = new Date().toLocaleTimeString();
    logEl.innerHTML += `<div>[${time}] ${message}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
}

// WebSocket connection
let ws = null;
let room = null;
let hasJoinedRoom = false;

// --- Web Audio API setup for TTS streaming ---
let audioContext = null;
let ttsDestination = null;
let ttsAudioTrack = null;

function setupTTSStream() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        ttsDestination = audioContext.createMediaStreamDestination();
        ttsAudioTrack = ttsDestination.stream.getAudioTracks()[0];
    }
}

// --- TTS function that routes audio to the MediaStreamDestination ---
function speakQuestionToRoom(text) {
    if (!('speechSynthesis' in window)) {
        log('TTS not supported in this browser.');
        return;
    }
    setupTTSStream();
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    // Connect TTS to Web Audio API
    const source = audioContext.createMediaStreamSource(ttsDestination.stream);
    source.connect(audioContext.destination);
    // Use SpeechSynthesisUtterance events to log
    utterance.onstart = () => log('Bot speaking: ' + text);
    utterance.onend = () => log('Bot finished speaking.');
    // Use the browser's default output, but also route to Twilio
    window.speechSynthesis.speak(utterance);
}

// Connect to WebSocket
function connectWebSocket() {
    // Use wss:// if the page is loaded over HTTPS, otherwise ws://
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws?sessionId=${sessionId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
        log('WebSocket connected');
        statusEl.textContent = 'Connected';
        statusEl.className = 'connected';
        // Join the room ONCE after WebSocket connects
        if (!hasJoinedRoom) {
            await joinRoom();
            hasJoinedRoom = true;
        }
    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        log(`Received: ${JSON.stringify(data)}`);

        if (data.type === 'START') {
            log('START received: Ready to ask question or trigger TTS.');
        } else if (data.type === 'QUESTION') {
            log(`Question: ${data.question}`);
            // --- TTS: Speak the question aloud and route to Twilio ---
            speakQuestionToRoom(data.question);
        }
    };

    ws.onclose = () => {
        log('WebSocket disconnected');
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'disconnected';
        // Try to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
        log(`WebSocket error: ${error.message}`);
    };
}

// Create a synthetic video track (canvas-based animated avatar)
function createVideoTrack() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let blink = false;
    let mouthOpen = false;
    let frame = 0;

    function drawAvatar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Face
        ctx.beginPath();
        ctx.arc(320, 240, 150, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffe0b2';
        ctx.fill();
        ctx.closePath();
        // Eyes
        ctx.beginPath();
        ctx.arc(270, 210, 20, 0, 2 * Math.PI);
        ctx.arc(370, 210, 20, 0, 2 * Math.PI);
        ctx.fillStyle = blink ? '#ffe0b2' : '#222';
        ctx.fill();
        ctx.closePath();
        // Pupils
        if (!blink) {
            ctx.beginPath();
            ctx.arc(270, 215, 8, 0, 2 * Math.PI);
            ctx.arc(370, 215, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#4a4a4a';
            ctx.fill();
            ctx.closePath();
        }
        // Mouth
        ctx.beginPath();
        if (mouthOpen) {
            ctx.ellipse(320, 300, 40, 30, 0, 0, Math.PI * 2);
        } else {
            ctx.ellipse(320, 300, 40, 10, 0, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#d84315';
        ctx.fill();
        ctx.closePath();
        // Blush
        ctx.beginPath();
        ctx.ellipse(240, 270, 18, 8, 0, 0, Math.PI * 2);
        ctx.ellipse(400, 270, 18, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffb6b6';
        ctx.fill();
        ctx.closePath();
    }

    function animate() {
        frame++;
        // Blink every ~2 seconds
        if (frame % 60 === 0) blink = true;
        if (frame % 65 === 0) blink = false;
        // Mouth moves every 30 frames
        if (frame % 30 === 0) mouthOpen = !mouthOpen;
        drawAvatar();
        requestAnimationFrame(animate);
    }
    animate();
    const stream = canvas.captureStream(30); // 30 FPS
    const videoTrack = stream.getVideoTracks()[0];
    return videoTrack;
}

// Create a synthetic audio track (silent MediaStreamTrack)
function createSilentAudioTrack() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    oscillator.connect(dst);
    oscillator.start();
    oscillator.frequency.value = 0; // Silent
    const track = dst.stream.getAudioTracks()[0];
    return track;
}

// Join Twilio Video Room
async function joinRoom() {
    try {
        // Get token from backend
        const response = await fetch('/api/bot/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                room: roomName,
                identity: 'AI Interviewer'
            })
        });

        const { token } = await response.json();
        log('Got token from backend');

        // Create synthetic video track
        const videoTrack = createVideoTrack();
        // --- Use TTS audio track for Twilio ---
        setupTTSStream();
        const audioTrack = ttsAudioTrack;

        // Connect to room with synthetic tracks
        room = await Twilio.Video.connect(token, {
            name: roomName,
            tracks: [videoTrack, audioTrack]
        });

        log('Connected to room: ' + roomName);

        // Handle room events
        room.on('participantConnected', participant => {
            log(`Participant connected: ${participant.identity}`);
        });

        room.on('participantDisconnected', participant => {
            log(`Participant disconnected: ${participant.identity}`);
        });

        // Handle local participant's media
        room.localParticipant.videoTracks.forEach(publication => {
            publication.track.attach(localVideo);
        });

    } catch (error) {
        log(`Error joining room: ${error.message}`);
    }
}

// Start the bot
if (sessionId && roomName) {
    log(`Starting bot for session: ${sessionId}, room: ${roomName}`);
    connectWebSocket();
} else {
    log('Error: Missing sessionId or room parameters');
    statusEl.textContent = 'Error: Missing Parameters';
} 