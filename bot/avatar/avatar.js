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
let isSpeaking = false;
let isInterviewActive = false;

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
    
    if (!isInterviewActive) {
        log('Interview not active, not speaking.');
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
    
    // Use SpeechSynthesisUtterance events to log and control animation
    utterance.onstart = () => {
        log('Bot speaking: ' + text);
        isSpeaking = true;
        // Notify backend that speech started
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SPEECH_STARTED' }));
        }
    };
    
    utterance.onend = () => {
        log('Bot finished speaking.');
        isSpeaking = false;
        // Notify backend that speech ended
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SPEECH_ENDED' }));
        }
    };
    
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

        if (data.type === 'START_INTERVIEW') {
            log('Interview started!');
            isInterviewActive = true;
            if (data.question) {
                speakQuestionToRoom(data.question);
            }
        } else if (data.type === 'NEXT_QUESTION') {
            log(`Next question: ${data.question}`);
            speakQuestionToRoom(data.question);
        } else if (data.type === 'PAUSE') {
            log('Interview paused');
            isInterviewActive = false;
            window.speechSynthesis.pause();
        } else if (data.type === 'RESUME') {
            log('Interview resumed');
            isInterviewActive = true;
            window.speechSynthesis.resume();
        } else if (data.type === 'STOP') {
            log('Interview stopped');
            isInterviewActive = false;
            window.speechSynthesis.cancel();
        } else if (data.type === 'END') {
            log('Interview ended - no more questions');
            isInterviewActive = false;
            window.speechSynthesis.cancel();
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
        
        // Mouth - only animate when speaking
        ctx.beginPath();
        if (isSpeaking) {
            // Animate mouth when speaking
            if (frame % 10 === 0) mouthOpen = !mouthOpen;
        } else {
            // Keep mouth closed when not speaking
            mouthOpen = false;
        }
        
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

// Function to capture and process candidate answers
function setupAnswerCapture() {
    if (!room) return;
    
    // Listen to all participants except the bot
    room.participants.forEach(participant => {
        if (participant.identity !== 'AI Interviewer') {
            setupParticipantAudioCapture(participant);
        }
    });
    
    // Listen for new participants
    room.on('participantConnected', participant => {
        log(`Participant connected: ${participant.identity}`);
        if (participant.identity !== 'AI Interviewer') {
            setupParticipantAudioCapture(participant);
        }
    });
}

function setupParticipantAudioCapture(participant) {
    // Listen for audio tracks from this participant
    participant.on('trackSubscribed', track => {
        if (track.kind === 'audio') {
            log(`Listening to audio from ${participant.identity}`);
            
            // Create a MediaRecorder to capture audio
            const mediaRecorder = new MediaRecorder(track.mediaStreamTrack);
            let audioChunks = [];
            let isRecording = false;
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstart = () => {
                log(`Started recording ${participant.identity}`);
                isRecording = true;
            };
            
            mediaRecorder.onstop = async () => {
                log(`Stopped recording ${participant.identity}`);
                isRecording = false;
                
                // Create audio blob
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioChunks = [];
                
                log(`Captured ${audioBlob.size} bytes of audio from ${participant.identity}`);
                
                // Convert audio blob to base64 for WebSocket transmission
                const base64Audio = await blobToBase64(audioBlob);
                
                // Try to transcribe the audio (placeholder for now)
                let transcript = '';
                try {
                    // In production, you'd send this to a transcription service
                    // For now, we'll use a placeholder
                    transcript = `Audio captured from ${participant.identity} (${audioBlob.size} bytes)`;
                    
                    // TODO: Integrate with OpenAI Whisper or similar service
                    // const transcriptionResponse = await fetch('/api/transcribe', {
                    //     method: 'POST',
                    //     body: audioBlob
                    // });
                    // const transcriptionData = await transcriptionResponse.json();
                    // transcript = transcriptionData.transcript;
                } catch (error) {
                    console.error('Transcription error:', error);
                    transcript = `Audio captured from ${participant.identity} (transcription failed)`;
                }
                
                // Send to backend
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'ANSWER_RECEIVED',
                        participantId: participant.identity,
                        answer: transcript,
                        audioBlob: base64Audio,
                        transcript: transcript
                    }));
                }
            };
            
            // Start recording when participant speaks (simplified - just record continuously for now)
            // In production, you'd use voice activity detection
            mediaRecorder.start(1000); // Record in 1-second chunks
            
            // Stop recording after 30 seconds (simplified approach)
            setTimeout(() => {
                if (isRecording) {
                    mediaRecorder.stop();
                }
            }, 30000);
        }
    });
}

// Helper function to convert blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1]; // Remove data URL prefix
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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

        // Setup answer capture
        setupAnswerCapture();
        
        // Notify backend that bot is ready
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'BOT_READY' }));
        }

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