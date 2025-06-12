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

// Connect to WebSocket
function connectWebSocket() {
    // Use the same host for WebSocket as the current page
    const wsUrl = `ws://${window.location.host}/ws?sessionId=${sessionId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        log('WebSocket connected');
        statusEl.textContent = 'Connected';
        statusEl.className = 'connected';
    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        log(`Received: ${JSON.stringify(data)}`);

        if (data.type === 'START') {
            await joinRoom();
        } else if (data.type === 'QUESTION') {
            // Handle question (you can add text-to-speech here)
            log(`Question: ${data.question}`);
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

        // Connect to room
        room = await Twilio.Video.connect(token, {
            name: roomName,
            audio: true,
            video: true
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