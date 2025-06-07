import React, { useEffect, useState, useRef } from 'react';
import { Video, connect } from 'twilio-video';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AIInterviewerControls from './AIInterviewerControls';
import BotAvatar from './BotAvatar';

const VideoCall = ({ interviewId }) => {
  console.log('[VideoCall] MOUNTED');
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const [botVideoTrack, setBotVideoTrack] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [videoContainers, setVideoContainers] = useState([]);
  const [mediaUnlocked, setMediaUnlocked] = useState(false);
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInterviewing, setIsInterviewing] = useState(false);

  console.log('[VideoCall] Rendered. isInitialized:', isInitialized, 'user:', user?.role);

  useEffect(() => {
    console.log('[VideoCall] Rendering VideoCall component');
    let localTrack;
    let room;

    async function joinRoom() {
      try {
        // Get local video track
        localTrack = await Video.createLocalVideoTrack();
        
        // Connect to room
        room = await Video.connect(token, {
          name: roomName,
          tracks: [localTrack],
        });

        roomRef.current = room;

        // Attach local track to video element
        if (videoRef.current) {
          localTrack.attach(videoRef.current);
        }

        // Handle participant connections
        room.on('participantConnected', participant => {
          console.log(`Participant connected: ${participant.identity}`);
        });

        room.on('participantDisconnected', participant => {
          console.log(`Participant disconnected: ${participant.identity}`);
        });

      } catch (error) {
        console.error('Error joining room:', error);
      }
    }

    joinRoom();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (localTrack) {
        localTrack.stop();
      }
    };
  }, [token, roomName]);

  // Add this function to handle bot video track
  const handleBotVideoTrack = (track) => {
    console.log('[VideoCall] Received bot video track:', track);
    if (track) {
      setBotVideoTrack(track);
      setVideoContainers(prev => [...prev, {
        track,
        isLocal: false,
        kind: 'video'
      }]);
    }
  };

  // Add this function to handle answer recording
  const handleAnswerRecorded = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('interviewId', interviewId);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/interview/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process answer');
      }

      const data = await response.json();
      if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
      }
    } catch (error) {
      console.error('Error processing answer:', error);
    }
  };

  // Handler to update isInitialized from AIInterviewerControls
  const handleInitialized = (val) => {
    setIsInitialized(val);
  };
  // Handler to update isInterviewing from AIInterviewerControls
  const handleInterviewing = (val) => {
    setIsInterviewing(val);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* Pass handlers and state to AIInterviewerControls */}
      <div className="absolute top-4 left-4 z-50">
        {user?.role === 'admin' && (
          <AIInterviewerControls
            interviewId={interviewId}
            isInitialized={isInitialized}
            setIsInitialized={handleInitialized}
            isInterviewing={isInterviewing}
            setIsInterviewing={handleInterviewing}
          />
        )}
      </div>
      {/* Unlock media button for candidate if remote tracks exist */}
      {user?.role !== 'admin' && videoContainers.some(vc => !vc.isLocal) && !mediaUnlocked && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={unlockMedia}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700"
          >
            Click to enable audio/video
          </button>
        </div>
      )}
      <div className="flex-1 flex flex-wrap items-center justify-center p-2 gap-2 overflow-hidden">
        {videoContainers.map(({ track, isLocal, kind }) => {
          if (!track) {
            console.log('[VideoCall] Skipping invalid track:', track);
            return null;
          }
          return (
            <TrackRenderer 
              key={`${track.sid || track.id || (isLocal ? 'local' : 'remote')}-${kind}-${isLocal ? 'local' : 'remote'}`} 
              track={track} 
              kind={kind} 
              isLocal={isLocal} 
            />
          );
        })}
      </div>
      {/* Bot Avatar only when initialized */}
      {console.log('[VideoCall] isInitialized:', isInitialized, 'user:', user?.role)}
      {user?.role === 'admin' && isInitialized && (
        <>
          {console.log('[VideoCall] Rendering BotAvatar for admin')}
          <BotAvatar
            token={token}
            roomName={`interview-${interviewId}`}
            questionText={currentQuestion}
            onAnswerRecorded={handleAnswerRecorded}
            onVideoTrack={handleBotVideoTrack}
          />
        </>
      )}
    </div>
  );
};

export default VideoCall; 