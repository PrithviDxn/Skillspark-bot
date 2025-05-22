import { useEffect, useState, useRef } from 'react';
import { Video, connect } from 'twilio-video';
import { useAuth } from '../context/AuthContext';

const VideoCall = ({ interviewId }) => {
  const [room, setRoom] = useState(null);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [isWaitingForCandidate, setIsWaitingForCandidate] = useState(false);
  const { user } = useAuth();
  const videoContainerRef = useRef(null);
  const tracksRef = useRef(new Set());
  const localStreamRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  const bufferedTracksRef = useRef([]);
  const [videoContainers, setVideoContainers] = useState([]);

  // Attach buffered tracks when the container is ready
  useEffect(() => {
    if (videoContainerRef.current && bufferedTracksRef.current.length > 0) {
      console.log('Processing buffered tracks:', bufferedTracksRef.current.length);
      bufferedTracksRef.current.forEach(({ track, isLocal }) => {
        realAddTrackToDOM(track, isLocal);
      });
      bufferedTracksRef.current = [];
    }
  }, [videoContainerRef.current]);

  // Update video containers when tracks change
  useEffect(() => {
    const tracks = getAllVideoTracks();
    setVideoContainers(tracks.map(({ track }) => ({
      id: track.sid,
      isLocal: track.isLocal
    })));
  }, [localParticipant, remoteParticipants]);

  // Add a new effect to handle track attachment retries
  useEffect(() => {
    let retryTimeout;
    
    const retryAttachTracks = () => {
      if (room && videoContainerRef.current) {
        console.log('Retrying track attachment for room:', room.sid);
        room.localParticipant.tracks.forEach(publication => {
          if (publication.track) {
            const existingElement = document.getElementById(`video-${publication.track.sid}`);
            if (!existingElement) {
              console.log('Retrying attachment for track:', publication.track.sid);
              tracksRef.current.add(publication.track);
              addTrackToDOM(publication.track, true);
            }
          }
        });
      }
    };

    // Retry track attachment after a short delay
    if (room) {
      retryTimeout = setTimeout(retryAttachTracks, 1000);
    }

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [room]);

  // Attach local participant tracks when both the participant and container are ready
  useEffect(() => {
    if (localParticipant && videoContainerRef.current) {
      localParticipant.tracks.forEach(publication => {
        if (publication.track) {
          // Check if already attached
          const existingElement = document.getElementById(`video-${publication.track.sid}`);
          if (!existingElement) {
            tracksRef.current.add(publication.track);
            addTrackToDOM(publication.track, true);
          }
        }
      });
    }
  }, [localParticipant, videoContainerRef.current]);

  useEffect(() => {
    let mounted = true;
    let reconnectTimeout;

    const fetchToken = async () => {
      try {
        console.log('[VideoCall] Fetching video token for interview:', interviewId, 'User:', user?.email, 'UserID:', user?._id);
        const response = await fetch(`/api/v1/video/room/${interviewId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        console.log('[VideoCall] Token response:', data);
        
        if (data.success && mounted) {
          await connectToRoom(data.data.token);
          // If user is admin and no remote participants, show waiting room
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
      // Clean up before page unload
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (room) {
        room.disconnect();
      }
    };

    // Add beforeunload event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    fetchToken();

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(reconnectTimeout);

      // Clean up all tracks
      tracksRef.current.forEach(track => {
        if (track.stop) {
          track.stop();
        }
        track.detach().forEach(el => el.remove());
      });
      tracksRef.current.clear();

      // Stop local stream if it exists
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Disconnect from room
      if (room) {
        room.disconnect();
      }

      // Clear video container
      if (videoContainerRef.current) {
        while (videoContainerRef.current.firstChild) {
          videoContainerRef.current.removeChild(videoContainerRef.current.firstChild);
        }
      }
    };
  }, [interviewId, user?.role]);

  // Update waiting room state when participants change
  useEffect(() => {
    if (user?.role === 'admin') {
      console.log('[VideoCall] Admin remoteParticipants.length:', remoteParticipants.length, remoteParticipants.map(p => p.identity));
      setIsWaitingForCandidate(remoteParticipants.length === 0);
    }
  }, [remoteParticipants, user?.role]);

  const connectToRoom = async (token) => {
    try {
      console.log('[VideoCall] Attempting to connect to room with token. InterviewId:', interviewId, 'User:', user?.email, 'UserID:', user?._id);
      
      // Clean up any existing connections first
      if (room) {
        console.log('Cleaning up existing room connection');
        room.disconnect();
        setRoom(null);
        setLocalParticipant(null);
        setRemoteParticipants([]);
        tracksRef.current.clear();
        if (videoContainerRef.current) {
          while (videoContainerRef.current.firstChild) {
            videoContainerRef.current.removeChild(videoContainerRef.current.firstChild);
          }
        }
      }

      // First check if we can access the devices
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        // Store the stream reference
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
      console.log('[VideoCall] Local participant tracks:', Array.from(newRoom.localParticipant.tracks.values()));

      // Attach local participant tracks immediately if available
      newRoom.localParticipant.tracks.forEach(publication => {
        if (publication.track) {
          console.log('[VideoCall] Attaching local track:', publication.track.kind);
          tracksRef.current.add(publication.track);
          addTrackToDOM(publication.track, true);
        }
        publication.on('subscribed', track => {
          console.log('[VideoCall] Local track subscribed:', track.kind);
          tracksRef.current.add(track);
          addTrackToDOM(track, true);
        });
      });

      // Attach remote participants' tracks
      newRoom.participants.forEach(participant => {
        console.log('[VideoCall] Attaching tracks for remote participant:', participant.identity);
        participant.tracks.forEach(publication => {
          if (publication.track) {
            console.log('[VideoCall] Attaching remote track:', publication.track.kind);
            tracksRef.current.add(publication.track);
            addTrackToDOM(publication.track, false);
          }
          publication.on('subscribed', track => {
            console.log('[VideoCall] Remote track subscribed:', track.kind);
            tracksRef.current.add(track);
            addTrackToDOM(track, false);
          });
        });
      });

      // Listen for new remote participants
      newRoom.on('participantConnected', participant => {
        console.log('[VideoCall] New participant connected:', participant.identity);
        setRemoteParticipants(prev => [...prev, participant]);
        participant.tracks.forEach(publication => {
          if (publication.track) {
            console.log('[VideoCall] Attaching new participant track:', publication.track.kind);
            tracksRef.current.add(publication.track);
            addTrackToDOM(publication.track, false);
          }
          publication.on('subscribed', track => {
            console.log('[VideoCall] New participant track subscribed:', track.kind);
            tracksRef.current.add(track);
            addTrackToDOM(track, false);
          });
        });
      });

      // Listen for participant disconnection
      newRoom.on('participantDisconnected', participant => {
        console.log('[VideoCall] Participant disconnected:', participant.identity);
        setRemoteParticipants(prev => prev.filter(p => p !== participant));
        removeParticipantTracks(participant);
      });

      // Listen for track subscriptions (for all participants)
      newRoom.on('trackSubscribed', (track, publication, participant) => {
        console.log('[VideoCall] Track subscribed:', track.kind, 'from participant:', participant.identity);
        tracksRef.current.add(track);
        addTrackToDOM(track, participant === newRoom.localParticipant);
      });

      newRoom.on('trackUnsubscribed', (track, publication, participant) => {
        console.log('[VideoCall] Track unsubscribed:', track.kind, 'from participant:', participant.identity);
        tracksRef.current.delete(track);
        removeTrackFromDOM(track);
      });

      // Handle room disconnection
      newRoom.on('disconnected', () => {
        console.log('[VideoCall] Room disconnected');
        setRoom(null);
        setLocalParticipant(null);
        setRemoteParticipants([]);
        tracksRef.current.clear();
      });

    } catch (error) {
      console.error('[VideoCall] Error connecting to room:', error);
      setError('Failed to connect to video call. Please try refreshing the page.');
    }
  };

  const attachTrackWhenReady = (track, isLocal) => {
    // If container is ready, attach immediately
    if (videoContainerRef.current) {
      realAddTrackToDOM(track, isLocal);
      return;
    }
    // Otherwise, observe for container
    const observer = new MutationObserver(() => {
      if (videoContainerRef.current) {
        realAddTrackToDOM(track, isLocal);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  // Buffering logic for track attachment (override)
  const addTrackToDOM = (track, isLocal) => {
    // Listen for trackStarted event (Twilio)
    if (track.on && typeof track.on === 'function') {
      track.on('started', () => {
        realAddTrackToDOM(track, isLocal);
      });
    }
    // Fallback: try to attach every 500ms for 5 seconds
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      realAddTrackToDOM(track, isLocal);
      if (++attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
    // Also try immediately
    realAddTrackToDOM(track, isLocal);
  };

  // The real function that attaches tracks
  const realAddTrackToDOM = (track, isLocal) => {
    const containerId = `video-container-${track.sid}`;
    const container = document.getElementById(containerId);
    if (!container) {
      console.log('Container not ready for track:', track.sid);
      bufferedTracksRef.current.push({ track, isLocal });
      return;
    }
    // Remove any existing video element for this track
    const existingElement = document.getElementById(`video-${track.sid}`);
    if (existingElement) {
      existingElement.remove();
    }
    // Detach any existing attachments
    track.detach().forEach(el => el.remove());
    // Create and attach new element
    const mediaElement = track.attach();
    mediaElement.id = `video-${track.sid}`;
    mediaElement.className = `video-participant ${isLocal ? 'local' : 'remote'}`;
    mediaElement.autoplay = true;
    mediaElement.playsInline = true;
    container.appendChild(mediaElement);
  };

  const removeTrackFromDOM = (track) => {
    const videoElement = document.getElementById(`video-${track.sid}`);
    if (videoElement) {
      const container = videoElement.parentElement;
      if (container) {
        container.remove();
      } else {
        videoElement.remove();
      }
    }
  };

  const removeParticipantTracks = (participant) => {
    participant.tracks.forEach(publication => {
      if (publication.track) {
        tracksRef.current.delete(publication.track);
        removeTrackFromDOM(publication.track);
      }
    });
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
    // Local participant
    if (localParticipant) {
      localParticipant.tracks.forEach(publication => {
        if (publication.track && publication.track.kind === 'video') {
          tracks.push({ track: publication.track, isLocal: true });
        }
      });
    }
    // Remote participants
    remoteParticipants.forEach(participant => {
      participant.tracks.forEach(publication => {
        if (publication.track && publication.track.kind === 'video') {
          tracks.push({ track: publication.track, isLocal: false });
        }
      });
    });
    return tracks;
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      console.log('Cleaning up VideoCall component');
      if (room) {
        room.disconnect();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      tracksRef.current.clear();
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
            <div className="video-participant local w-full h-full object-cover rounded-lg"></div>
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

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      <div className="flex-1 flex flex-wrap items-center justify-center p-2 gap-2 overflow-hidden" ref={videoContainerRef}>
        {videoContainers.map(({ id, isLocal }) => (
          <div 
            key={id} 
            className="video-container relative flex-1 min-w-[300px] max-w-[calc(50%-8px)] aspect-video" 
            id={`video-container-${id}`}
          >
            <div 
              id={`video-${id}`} 
              className={`video-participant w-full h-full object-cover rounded-lg ${isLocal ? 'local' : 'remote'}`}
            ></div>
          </div>
        ))}
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

