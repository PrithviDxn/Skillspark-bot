import React, { useEffect, useState, useRef } from 'react';
import { Video, connect } from 'twilio-video';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AIInterviewerControls_DEBUG from './AIInterviewerControls_DEBUG';
import BotAvatar from './BotAvatar';
import TechStackSelector from './TechStackSelector';

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
  const [room, setRoom] = useState(null);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [isWaitingForCandidate, setIsWaitingForCandidate] = useState(false);
  const [trackUpdateCount, setTrackUpdateCount] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const navigate = useNavigate();
  const [meetingEnded, setMeetingEnded] = useState(false);
  // Candidate answer recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  // Add state for selectedTechStack
  const [selectedTechStack, setSelectedTechStack] = useState('');

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

  // Update video containers when tracks change
  useEffect(() => {
    const tracks = getAllVideoTracks();
    const containers = tracks.map(({ track, isLocal, kind }) => ({
      track,
      isLocal,
      kind
    }));

    // Add bot video track if available
    if (botVideoTrack) {
      containers.push({
        track: botVideoTrack,
        isLocal: false,
        kind: 'video'
      });
    }

    setVideoContainers(containers);
  }, [localParticipant, remoteParticipants, trackUpdateCount, botVideoTrack]);

  // Add this function to handle bot video track
  const handleBotVideoTrack = (track) => {
    console.log('[VideoCall] Received bot video track:', track);
    if (track) {
      setBotVideoTrack(track);
      // Add bot participant to remote participants
      setRemoteParticipants(prev => [...prev, {
        identity: 'bot',
        tracks: [track]
      }]);
    }
  };

  // Add this function to handle answer recording
  const handleAnswerRecorded = async (audioBlob) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('interviewId', interviewId);
      formData.append('question', currentQuestion);

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
      } else if (data.done) {
        setCurrentQuestion('Interview complete!');
        setMeetingEnded(true);
      }
    } catch (error) {
      console.error('Error processing answer:', error);
      setToastMessage('Error processing answer. Please try again.');
    } finally {
      setIsUploading(false);
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

  // Modified stopRecording to trigger next question immediately
  const stopRecording = async () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    // Immediately trigger next question
    setIsUploading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/interview/${interviewId}/next-question`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.question) {
        setCurrentQuestion(data.question);
      } else if (data.done) {
        setCurrentQuestion('Interview complete!');
        setMeetingEnded(true);
      }
    } catch (err) {
      setToastMessage('Error advancing to next question.');
    }
    setIsUploading(false);
  };

  // Modified recorder.onstop to upload in background
  const startRecording = async () => {
    setRecordedChunks([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
        // Upload in background
        handleAnswerRecorded(audioBlob);
        setIsRecording(false);
        setMediaRecorder(null);
        setRecordedChunks([]);
      };
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setToastMessage('Could not access microphone: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* Tech Stack Selector: Show before interview starts */}
      {!isInterviewing && (
        <div className="absolute top-4 right-4 z-50">
          <TechStackSelector
            selectedStack={selectedTechStack}
            onStackChange={setSelectedTechStack}
          />
        </div>
      )}
      {/* Debug: Render check for admin controls */}
      {console.log('[VideoCall] user:', user, 'role:', user?.role, 'should render admin controls:', user?.role === 'admin')}
      <div style={{color: 'blue', fontWeight: 'bold'}}>DEBUG: ADMIN CONTROLS RENDER CHECK</div>
      {/* Pass handlers and state to AIInterviewerControls */}
      <div className="absolute top-4 left-4 z-50">
        {user?.role === 'admin' && (
          <AIInterviewerControls_DEBUG
            interviewId={interviewId}
            isInitialized={isInitialized}
            setIsInitialized={handleInitialized}
            isInterviewing={isInterviewing}
            setIsInterviewing={handleInterviewing}
            selectedTechStack={selectedTechStack}
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
      {/* Candidate Record/Submit Answer UI */}
      {user?.role === 'candidate' && currentQuestion && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center">
          <div className="mb-2 text-lg font-semibold text-white bg-gray-800 px-4 py-2 rounded shadow">{currentQuestion}</div>
          {!isRecording && !isUploading && (
            <button
              onClick={startRecording}
              className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 font-bold text-lg"
              disabled={isRecording || isUploading}
            >
              <span role="img" aria-label="mic">🎤</span> Record Answer
            </button>
          )}
          {isRecording && (
            <button
              onClick={stopRecording}
              className="bg-red-600 text-white px-6 py-2 rounded shadow hover:bg-red-700 font-bold text-lg mt-2"
            >
              <span role="img" aria-label="stop">⏹️</span> Stop & Submit
            </button>
          )}
          {isUploading && (
            <div className="text-white mt-2">{toastMessage}</div>
          )}
        </div>
      )}
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