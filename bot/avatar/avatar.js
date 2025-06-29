// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const roomName = urlParams.get('room');

// DOM elements
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const localVideo = document.getElementById('local-video');
const testAudioBtn = document.getElementById('test-audio');
const testTTSBtn = document.getElementById('test-tts');

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
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// --- Web Audio API setup for TTS streaming ---
let audioContext = null;
let ttsDestination = null;
let ttsAudioTrack = null;
let ttsSource = null;
let audioGainNode = null;

function setupTTSStream() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        ttsDestination = audioContext.createMediaStreamDestination();
        ttsAudioTrack = ttsDestination.stream.getAudioTracks()[0];
        
        // Create a gain node to control audio output
        audioGainNode = audioContext.createGain();
        audioGainNode.gain.value = 0.8; // Set volume to 80%
        audioGainNode.connect(ttsDestination);
        
        // Create a silent oscillator to keep the track active
        const silentOscillator = audioContext.createOscillator();
        const silentGainNode = audioContext.createGain();
        silentGainNode.gain.value = 0; // Silent
        silentOscillator.connect(silentGainNode);
        silentGainNode.connect(ttsDestination);
        silentOscillator.start();
        
        log('TTS audio stream setup complete');
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
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Use SpeechSynthesisUtterance events to log and control animation
    utterance.onstart = () => {
        log('Bot speaking: ' + text);
        isSpeaking = true;
        
        // Only generate audio tones for actual interview questions, not test audio
        if (isInterviewActive && text.length > 10) { // Only for longer text (questions)
            // Create audio feedback for Twilio - generate tones for each word
            const words = text.split(' ');
            let wordIndex = 0;
            
            const speakNextWord = () => {
                if (wordIndex < words.length && isSpeaking && isInterviewActive) {
                    // Create a brief tone for each word
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    // Vary frequency slightly for each word to make it more natural
                    const baseFreq = 440; // A4
                    const freq = baseFreq + (wordIndex * 10) % 100;
                    oscillator.frequency.value = freq;
                    
                    gainNode.gain.value = 0.2; // Lower volume for Twilio
                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioGainNode);
                    
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.1);
                    
                    wordIndex++;
                    // Schedule next word
                    setTimeout(speakNextWord, 200 + Math.random() * 100);
                }
            };
            
            // Start speaking words
            setTimeout(speakNextWord, 100);
        }
        
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
    
    // Use the browser's default output for local audio
    window.speechSynthesis.speak(utterance);
}

// Connect to WebSocket with improved reconnection logic
function connectWebSocket() {
    // Use wss:// if the page is loaded over HTTPS, otherwise ws://
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws?sessionId=${sessionId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
        log('WebSocket connected');
        statusEl.textContent = 'Connected';
        statusEl.className = 'connected';
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
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
                log(`Speaking question: "${data.question}"`);
                speakQuestionToRoom(data.question);
            } else {
                log('No question provided in START_INTERVIEW');
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

    ws.onclose = (event) => {
        log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'disconnected';
        
        // Only attempt reconnection if it wasn't a clean close and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
            log(`Attempting to reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            setTimeout(connectWebSocket, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
            log('Max reconnection attempts reached. Please refresh the page.');
        }
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
    let lastBlinkTime = 0;
    let blinkDuration = 0;
    let animationId = null;
    let lastFrameTime = 0;

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

    function animate(currentTime) {
        // Use time-based animation instead of frame-based for better performance
        if (!lastFrameTime) lastFrameTime = currentTime;
        const deltaTime = currentTime - lastFrameTime;
        
        // Update frame counter (30 FPS target)
        if (deltaTime >= 33) { // 1000ms / 30fps ≈ 33ms
            frame++;
            lastFrameTime = currentTime;
            
            // Improved blinking logic - more natural timing
            if (!blink && currentTime - lastBlinkTime > 2000 + Math.random() * 3000) {
                blink = true;
                blinkDuration = 150 + Math.random() * 100; // 150-250ms blink
                lastBlinkTime = currentTime;
            } else if (blink && currentTime - lastBlinkTime > blinkDuration) {
                blink = false;
            }
        }
        
        drawAvatar();
        animationId = requestAnimationFrame(animate);
    }
    
    // Start animation immediately
    animationId = requestAnimationFrame(animate);
    
    // Fallback animation using setInterval for when page is not focused
    let fallbackInterval = null;
    
    function startFallbackAnimation() {
        if (!fallbackInterval) {
            fallbackInterval = setInterval(() => {
                frame++;
                const currentTime = Date.now();
                
                // Blinking logic for fallback
                if (!blink && currentTime - lastBlinkTime > 2000 + Math.random() * 3000) {
                    blink = true;
                    blinkDuration = 150 + Math.random() * 100;
                    lastBlinkTime = currentTime;
                } else if (blink && currentTime - lastBlinkTime > blinkDuration) {
                    blink = false;
                }
                
                drawAvatar();
            }, 33); // ~30 FPS
        }
    }
    
    function stopFallbackAnimation() {
        if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
        }
    }
    
    // Ensure animation continues even when page is not focused
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden, switch to fallback animation
            log('Page hidden - switching to fallback animation');
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            startFallbackAnimation();
        } else {
            // Page is visible again, switch back to requestAnimationFrame
            log('Page visible - switching back to main animation');
            stopFallbackAnimation();
            if (!animationId) {
                animationId = requestAnimationFrame(animate);
            }
        }
    });
    
    const stream = canvas.captureStream(30); // 30 FPS
    const videoTrack = stream.getVideoTracks()[0];
    
    // Add cleanup function to stop animation when needed
    videoTrack.stop = function() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        stopFallbackAnimation();
    };
    
    return videoTrack;
}

// Create a proper audio track for Twilio
function createAudioTrack() {
    setupTTSStream();
    return ttsAudioTrack;
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
        // Create proper audio track for Twilio
        const audioTrack = createAudioTrack();

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
    
    // Add event listeners for test buttons
    testAudioBtn.addEventListener('click', testAudio);
    testTTSBtn.addEventListener('click', testTTS);
    
    // Handle page visibility changes to maintain WebSocket connection
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            log('Page hidden - maintaining connection');
        } else {
            log('Page visible - checking connection');
            // Check if WebSocket is still connected
            if (ws && ws.readyState !== WebSocket.OPEN) {
                log('WebSocket not connected, attempting to reconnect');
                connectWebSocket();
            }
        }
    });
    
    // Handle page focus/blur events
    window.addEventListener('focus', () => {
        log('Page focused');
    });
    
    window.addEventListener('blur', () => {
        log('Page blurred');
    });
    
    // Keep the page alive and prevent sleep
    let keepAliveInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Send a ping to keep the connection alive
            ws.send(JSON.stringify({ type: 'PING' }));
        }
    }, 30000); // Every 30 seconds
    
    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(keepAliveInterval);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Page unload');
        }
    });
    
} else {
    log('Error: Missing sessionId or room parameters');
    statusEl.textContent = 'Error: Missing Parameters';
}

// Test functions
function testAudio() {
    if (!audioContext) {
        setupTTSStream();
    }
    
    log('Testing audio output...');
    
    // Create a test tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.value = 0.3;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioGainNode);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1);
    
    log('Audio test complete - you should hear a 1-second tone');
}

function testTTS() {
    log('Testing TTS...');
    
    // Use a separate TTS instance for testing that doesn't interfere with interview
    if (!('speechSynthesis' in window)) {
        log('TTS not supported in this browser.');
        return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create test utterance
    const testUtterance = new SpeechSynthesisUtterance('This is a test of the text to speech system. Can you hear me?');
    testUtterance.lang = 'en-US';
    testUtterance.rate = 0.9;
    testUtterance.pitch = 1;
    testUtterance.volume = 1;
    
    testUtterance.onstart = () => {
        log('Test TTS started');
    };
    
    testUtterance.onend = () => {
        log('Test TTS finished');
    };
    
    // Use browser's default output for test (no Twilio audio)
    window.speechSynthesis.speak(testUtterance);
} 