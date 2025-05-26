import { useEffect, useState, useRef } from 'react';
import { Video, connect } from 'twilio-video';
import { useAuth } from '../context/AuthContext';

// TrackRenderer component for robust track attachment
function TrackRenderer({ track, kind, isLocal }) {
  const containerRef = useRef(null);
  const [isAttached, setIsAttached] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 10;

  useEffect(() => {
    let retryTimeout;
    let mounted = true;

    const tryAttach = () => {
      if (!mounted) return;

      if (!track || !track.sid) {
        console.log('[TrackRenderer] Invalid track:', track);
        return;
      }

      if (kind === 'video' && containerRef.current) {
        console.log('[TrackRenderer] Attempting to attach video track:', track.sid, isLocal ? 'local' : 'remote');
        try {
          track.detach().forEach(el => el.remove());
          const mediaElement = track.attach();
          mediaElement.id = `video-${track.sid}`;
          mediaElement.className = `video-participant w-full h-full object-cover rounded-lg ${isLocal ? 'local' : 'remote'}`;
          mediaElement.autoplay = true;
          mediaElement.playsInline = true;
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
          containerRef.current.appendChild(mediaElement);
          setIsAttached(true);
          console.log('[TrackRenderer] Successfully attached video track:', track.sid);
        } catch (error) {
          console.error('[TrackRenderer] Error attaching track:', error);
          if (retryCount < MAX_RETRIES) {
            retryTimeout = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              tryAttach();
            }, 200);
          }
        }
      } else if (kind === 'audio') {
        setIsAttached(true);
      } else if (retryCount < MAX_RETRIES) {
        console.log('[TrackRenderer] Container not ready, retrying...', retryCount + 1);
        retryTimeout = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          tryAttach();
        }, 200);
      }
    };

    tryAttach();

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (track) {
        track.detach().forEach(el => el.remove());
      }
    };
  }, [track, kind, isLocal, retryCount]);

  if (kind === 'video') {
    return (
      <div
        ref={containerRef}
        className="video-container relative flex-1 min-w-[300px] max-w-[calc(50%-8px)] aspect-video bg-gray-900 rounded-lg overflow-hidden"
      />
    );
  } else if (kind === 'audio') {
    return <div style={{ display: 'none' }} />;
  }
  return null;
}

const VideoCall = ({ interviewId }) => {
  const [room, setRoom] = useState(null);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [isWaitingForCandidate, setIsWaitingForCandidate] = useState(false);
  const { user } = useAuth();
  const localStreamRef = useRef(null);
  const [videoContainers, setVideoContainers] = useState([]); 
  const [trackUpdateCount, setTrackUpdateCount] = useState(0);

  // Update video containers when tracks change
  useEffect(() => {
    const tracks = getAllVideoTracks();
    setVideoContainers(tracks.map(({ track, isLocal, kind }) => ({
      track,
      isLocal,
      kind
    })));
  }, [localParticipant, remoteParticipants, trackUpdateCount]);

  useEffect(() => {
    let mounted = true;
    let reconnectTimeout;

    const fetchToken = async () => {
      try {
        console.log('[VideoCall] Fetching video token for interview:', interviewId, 'User:', user?.email, 'UserID:', user?._id);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/video/room/${interviewId}`,
          {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
          }
        );
        const data = await response.json();
        console.log('[VideoCall] Token response:', data);
        
        if (data.success && mounted) {
          await connectToRoom(data.data.token);
          if (user?.role === 'admin' && remoteParticipants.length === 0) {
            setIsWaitingForCandidate(true);
          }
        } else {
          console.error('[VideoCall] Failed to get video token:', data);
          setError('Failed to get video access token');
        }
      } catch (error) {
        console.error('[VideoCall] Error fetching token:', error);
        setError('Failed to connect to video call');
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    };

    const handleBeforeUnload = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (room) {
        room.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    fetchToken();

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(reconnectTimeout);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (room) {
        room.disconnect();
      }
    };
  }, [interviewId, user?.role]);

  useEffect(() => {
    if (user?.role === 'admin') {
      console.log('[VideoCall] Admin remoteParticipants.length:', remoteParticipants.length, remoteParticipants.map(p => p.identity));
      setIsWaitingForCandidate(remoteParticipants.length === 0);
    }
  }, [remoteParticipants, user?.role]);

  const connectToRoom = async (token) => {
    try {
      console.log('[VideoCall] Attempting to connect to room with token. InterviewId:', interviewId, 'User:', user?.email, 'UserID:', user?._id);
      if (room) {
        room.disconnect();
        setRoom(null);
        setLocalParticipant(null);
        setRemoteParticipants([]);
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        localStreamRef.current = stream;
        console.log('Successfully got local media stream');
      } catch (deviceError) {
        console.error('Device access error:', deviceError);
        if (deviceError.name === 'NotFoundError') {
          setError('No camera or microphone found. Please connect a camera and microphone and try again.');
        } else if (deviceError.name === 'NotAllowedError') {
          setError('Camera and microphone access was denied. Please allow access in your browser settings and try again.');
        } else {
          setError(`Device access error: ${deviceError.message}`);
        }
        return;
      }
      console.log('[VideoCall] Connecting to Twilio room...');
      const newRoom = await connect(token, {
        name: `interview-${interviewId}`,
        audio: true,
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      console.log('[VideoCall] Successfully connected to room:', newRoom.sid, 'Room name:', newRoom.name, 'Local identity:', newRoom.localParticipant.identity);
      setRoom(newRoom);
      setLocalParticipant(newRoom.localParticipant);
      newRoom.on('participantConnected', participant => {
        console.log('[VideoCall] New participant connected:', participant.identity);
        setRemoteParticipants(prev => [...prev, participant]);
        setTrackUpdateCount(count => count + 1);
        participant.tracks.forEach(publication => {
          publication.on('subscribed', track => {
            setTrackUpdateCount(count => count + 1);
          });
        });
      });
      newRoom.on('participantDisconnected', participant => {
        console.log('[VideoCall] Participant disconnected:', participant.identity);
        setRemoteParticipants(prev => prev.filter(p => p !== participant));
        setTrackUpdateCount(count => count + 1);
      });
      newRoom.on('trackSubscribed', (track, publication, participant) => {
        setTrackUpdateCount(count => count + 1);
      });
      newRoom.on('trackUnsubscribed', (track, publication, participant) => {
        setTrackUpdateCount(count => count + 1);
      });
      newRoom.localParticipant.tracks.forEach(publication => {
        publication.on('subscribed', track => {
          setTrackUpdateCount(count => count + 1);
        });
      });
      newRoom.participants.forEach(participant => {
        participant.tracks.forEach(publication => {
          publication.on('subscribed', track => {
            setTrackUpdateCount(count => count + 1);
          });
        });
      });
    } catch (error) {
      console.error('[VideoCall] Error connecting to room:', error);
      setError('Failed to connect to video call. Please try refreshing the page.');
    }
  };

  const toggleAudio = () => {
    if (localParticipant) {
      const audioTrack = localParticipant.audioTracks.values().next().value;
      if (audioTrack) {
        audioTrack.track.enable(!audioTrack.track.isEnabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localParticipant) {
      const videoTrack = localParticipant.videoTracks.values().next().value;
      if (videoTrack) {
        videoTrack.track.enable(!videoTrack.track.isEnabled);
      }
    }
  };

  // Helper to get all video tracks (local + remote)
  const getAllVideoTracks = () => {
    const tracks = [];
    if (localParticipant) {
      localParticipant.tracks.forEach(publication => {
        if (publication.track && publication.track.sid) {
          const track = publication.track;
          if (track.kind === 'video' || track.kind === 'audio') {
            tracks.push({
              track,
              isLocal: true,
              kind: track.kind
            });
          }
        }
      });
    }
    remoteParticipants.forEach(participant => {
      participant.tracks.forEach(publication => {
        if (publication.track && publication.track.sid) {
          const track = publication.track;
          if (track.kind === 'video' || track.kind === 'audio') {
            tracks.push({
              track,
              isLocal: false,
              kind: track.kind
            });
          }
        }
      });
    });
    console.log('[VideoCall][getAllVideoTracks] Returning tracks:', tracks.map(t => ({
      sid: t.track.sid,
      kind: t.kind,
      isLocal: t.isLocal
    })));
    return tracks;
  };

  useEffect(() => {
    return () => {
      console.log('Cleaning up VideoCall component');
      if (room) {
        room.disconnect();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [room]);

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Connecting to video call...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  if (isWaitingForCandidate) {
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-900">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-white text-2xl mb-4">Waiting for candidate to join...</div>
          <div className="text-gray-400 mb-8">Your video and audio are ready</div>
          <div className="video-container relative w-[400px] aspect-video">
            {/* Optionally render local video preview here if desired */}
          </div>
          <div className="mt-8 bg-gray-800 p-2 flex justify-center space-x-4">
            <button
              onClick={toggleAudio}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button
              onClick={toggleVideo}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => room && room.disconnect()}
              className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('[VideoCall][render] videoContainers:', videoContainers);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      <div className="flex-1 flex flex-wrap items-center justify-center p-2 gap-2 overflow-hidden">
        {videoContainers.map(({ track, isLocal, kind }) => {
          if (!track || !track.sid) {
            console.log('[VideoCall] Skipping invalid track:', track);
            return null;
          }
          return (
            <TrackRenderer 
              key={`${track.sid}-${kind}`} 
              track={track} 
              kind={kind} 
              isLocal={isLocal} 
            />
          );
        })}
      </div>
      <div className="bg-gray-800 p-2 flex justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
        <button
          onClick={toggleVideo}
          className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={() => room && room.disconnect()}
          className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoCall;

