import React, { useEffect, useRef } from 'react';
import Video from 'twilio-video';

const BotAvatar = ({ token, roomName, questionText, onAnswerRecorded, onVideoTrack }) => {
  const avatarRef = useRef(null);
  const videoTrackRef = useRef(null);
  const roomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Initialize avatar
  useEffect(() => {
    console.log('[BotAvatar] Mounted');
    const avatar = avatarRef.current;
    if (!avatar) return;

    // Set up avatar styles
    avatar.style.width = '640px';
    avatar.style.height = '480px';
    avatar.style.backgroundColor = '#2C3E50';
    avatar.style.borderRadius = '8px';
    avatar.style.position = 'relative';
    avatar.style.overflow = 'hidden';
    avatar.style.display = 'flex';
    avatar.style.flexDirection = 'column';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';

    // Create face elements
    const face = document.createElement('div');
    face.style.width = '200px';
    face.style.height = '200px';
    face.style.backgroundColor = '#ECF0F1';
    face.style.borderRadius = '50%';
    face.style.position = 'relative';
    face.style.marginBottom = '20px';

    // Create eyes
    const leftEye = document.createElement('div');
    leftEye.style.width = '20px';
    leftEye.style.height = '20px';
    leftEye.style.backgroundColor = '#2C3E50';
    leftEye.style.borderRadius = '50%';
    leftEye.style.position = 'absolute';
    leftEye.style.top = '60px';
    leftEye.style.left = '50px';

    const rightEye = document.createElement('div');
    rightEye.style.width = '20px';
    rightEye.style.height = '20px';
    rightEye.style.backgroundColor = '#2C3E50';
    rightEye.style.borderRadius = '50%';
    rightEye.style.position = 'absolute';
    rightEye.style.top = '60px';
    rightEye.style.right = '50px';

    // Add eyes to face
    face.appendChild(leftEye);
    face.appendChild(rightEye);

    // Add face to avatar
    avatar.appendChild(face);

    // Create mouth
    const mouth = document.createElement('div');
    mouth.style.width = '100px';
    mouth.style.height = '20px';
    mouth.style.backgroundColor = '#2C3E50';
    mouth.style.borderRadius = '10px';
    mouth.style.position = 'absolute';
    mouth.style.bottom = '40px';
    mouth.style.left = '50%';
    mouth.style.transform = 'translateX(-50%)';

    // Add mouth to face
    face.appendChild(mouth);

    // Add text display
    const textDisplay = document.createElement('div');
    textDisplay.style.position = 'absolute';
    textDisplay.style.bottom = '20px';
    textDisplay.style.left = '50%';
    textDisplay.style.transform = 'translateX(-50%)';
    textDisplay.style.color = '#ECF0F1';
    textDisplay.style.fontSize = '24px';
    textDisplay.style.textAlign = 'center';
    textDisplay.style.width = '80%';
    textDisplay.style.padding = '10px';
    textDisplay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    textDisplay.style.borderRadius = '8px';
    textDisplay.textContent = questionText || '';

    // Add text display to avatar
    avatar.appendChild(textDisplay);

    // Update text when question changes
    if (questionText) {
      textDisplay.textContent = questionText;
    }

    // Cleanup function
    return () => {
      if (avatar) {
        avatar.innerHTML = '';
      }
    };
  }, [questionText]);

  // Join room and publish video track
  useEffect(() => {
    let localTrack;
    let room;

    async function joinRoom() {
      try {
        console.log('[BotAvatar] Joining room:', roomName);
        
        // Create video track from avatar element
        const stream = avatarRef.current.captureStream(15);
        const videoTrack = stream.getVideoTracks()[0];
        
        localTrack = await Video.createLocalVideoTrack({
          name: 'bot-avatar',
          video: { width: 640, height: 480, frameRate: 15 },
          mediaStreamTrack: videoTrack
        });

        console.log('[BotAvatar] Created video track:', localTrack);

        // Connect to room with bot identity
        room = await Video.connect(token, {
          name: roomName,
          tracks: [localTrack],
          dominantSpeaker: false,
          networkQuality: false,
          audio: false,
          identity: 'bot'
        });

        console.log('[BotAvatar] Connected to room:', room.sid);

        videoTrackRef.current = localTrack;
        roomRef.current = room;

        // Notify parent component about the video track
        if (onVideoTrack) {
          onVideoTrack(localTrack);
        }

        // Start recording when room is connected
        startRecording();
      } catch (error) {
        console.error('[BotAvatar] Error joining room:', error);
      }
    }

    joinRoom();

    return () => {
      console.log('[BotAvatar] Cleaning up');
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
      }
      stopRecording();
    };
  }, [token, roomName, onVideoTrack]);

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        onAnswerRecorded(audioBlob);
      };

      mediaRecorderRef.current.start();
    } catch (error) {
      console.error('[BotAvatar] Error starting recording:', error);
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div 
      ref={avatarRef}
      style={{
        width: '640px',
        height: '480px',
        backgroundColor: '#2C3E50',
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden'
      }}
    />
  );
};

export default BotAvatar; 