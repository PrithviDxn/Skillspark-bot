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

    // Create mouth
    const mouth = document.createElement('div');
    mouth.style.width = '60px';
    mouth.style.height = '30px';
    mouth.style.borderBottom = '3px solid #2C3E50';
    mouth.style.borderRadius = '0 0 30px 30px';
    mouth.style.position = 'absolute';
    mouth.style.bottom = '60px';
    mouth.style.left = '50%';
    mouth.style.transform = 'translateX(-50%)';

    // Add elements to face
    face.appendChild(leftEye);
    face.appendChild(rightEye);
    face.appendChild(mouth);

    // Create question text container
    const questionContainer = document.createElement('div');
    questionContainer.style.width = '80%';
    questionContainer.style.padding = '20px';
    questionContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    questionContainer.style.borderRadius = '8px';
    questionContainer.style.marginTop = '20px';
    questionContainer.style.textAlign = 'center';
    questionContainer.style.fontSize = '24px';
    questionContainer.style.color = '#2C3E50';
    questionContainer.style.fontFamily = 'Arial, sans-serif';
    questionContainer.textContent = questionText || '';

    // Add elements to avatar
    avatar.appendChild(face);
    avatar.appendChild(questionContainer);

    // Add animation
    const animate = () => {
      face.style.transform = `scale(${1 + Math.sin(Date.now() / 1000) * 0.02})`;
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
      }
    };
  }, [questionText]);

  // Join room and publish video track
  useEffect(() => {
    let localTrack;
    let room;

    async function joinRoom() {
      try {
        // Create video track from avatar element
        localTrack = await Video.createLocalVideoTrack({
          name: 'bot-avatar',
          video: { width: 640, height: 480, frameRate: 15 },
          mediaStreamTrack: avatarRef.current.captureStream(15).getVideoTracks()[0],
        });

        // Connect to room
        room = await Video.connect(token, {
          name: roomName,
          tracks: [localTrack],
          dominantSpeaker: false,
          networkQuality: false,
          audio: false,
        });

        videoTrackRef.current = localTrack;
        roomRef.current = room;

        // Notify parent component about the video track
        if (onVideoTrack) {
          onVideoTrack(localTrack);
        }

        // Start recording when room is connected
        startRecording();
      } catch (error) {
        console.error('Error joining room:', error);
      }
    }

    joinRoom();

    return () => {
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
      console.error('Error starting recording:', error);
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Speak question using speech synthesis
  useEffect(() => {
    if (questionText) {
      const utterance = new SpeechSynthesisUtterance(questionText);
      window.speechSynthesis.speak(utterance);
    }
  }, [questionText]);

  return (
    <div
      ref={avatarRef}
      style={{ display: 'none' }}
    />
  );
};

export default BotAvatar; 