import React, { useEffect, useRef, useCallback } from 'react';
import Video from 'twilio-video';

const BotAvatar = ({ token, roomName, questionText, onAnswerRecorded }) => {
  const canvasRef = useRef(null);
  const videoTrackRef = useRef(null);
  const roomRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Initialize audio context and speech synthesis
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Draw avatar on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, 640, 480);
    
    // Draw face
    ctx.beginPath();
    ctx.arc(320, 240, 100, 0, Math.PI * 2);
    ctx.fillStyle = '#ECF0F1';
    ctx.fill();
    
    // Draw eyes
    ctx.beginPath();
    ctx.arc(290, 220, 10, 0, Math.PI * 2);
    ctx.arc(350, 220, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#2C3E50';
    ctx.fill();
    
    // Draw mouth
    ctx.beginPath();
    ctx.arc(320, 270, 30, 0, Math.PI);
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw question text
    if (questionText) {
      ctx.font = '24px Arial';
      ctx.fillStyle = '#2C3E50';
      ctx.fillText(questionText, 120, 400);
    }
  }, [questionText]);

  // Start recording audio
  const startRecording = useCallback(async () => {
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
  }, [onAnswerRecorded]);

  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Join room and publish video track
  useEffect(() => {
    let localTrack;
    let room;

    async function joinRoom() {
      try {
        // Create video track from canvas
        localTrack = await Video.createLocalVideoTrack({
          name: 'bot-avatar',
          video: { width: 640, height: 480, frameRate: 15 },
          mediaStreamTrack: canvasRef.current.captureStream(15).getVideoTracks()[0],
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
  }, [token, roomName, startRecording, stopRecording]);

  // Speak question using speech synthesis
  useEffect(() => {
    if (questionText) {
      const utterance = new SpeechSynthesisUtterance(questionText);
      window.speechSynthesis.speak(utterance);
    }
  }, [questionText]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      style={{ display: 'none' }}
    />
  );
};

export default BotAvatar; 