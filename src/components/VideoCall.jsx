import { useEffect, useState, useRef } from 'react';
import { Video, connect } from 'twilio-video';

const VideoCall = ({ interviewId }) => {
  const [room, setRoom] = useState(null);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const videoContainerRef = useRef(null);
  const tracksRef = useRef(new Set());
  const localStreamRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  const bufferedTracksRef = useRef([]);

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

  useEffect(() => {
    let mounted = true;
    let reconnectTimeout;

    const fetchToken = async () => {
      try {
        console.log('Fetching video token for interview:', interviewId);
        const response = await fetch(`/api/v1/video/room/${interviewId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        console.log('Token response:', data);
        
        if (data.success && mounted) {
          await connectToRoom(data.data.token);
        } else {
          console.error('Failed to get video token:', data);
          setError('Failed to get video access token');
        }
      } catch (error) {
        console.error('Error fetching token:', error);
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
  }, [interviewId]);

  const connectToRoom = async (token) => {
    try {
      console.log('Attempting to connect to room with token');
      
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

      const room = await connect(token, {
        name: `interview-${interviewId}`,
        audio: true,
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      console.log('Successfully connected to room:', room);

      setRoom(room);
      setLocalParticipant(room.localParticipant);
      console.log('Local participant tracks:', Array.from(room.localParticipant.tracks.values()));

      // Attach local participant tracks immediately if available
      room.localParticipant.tracks.forEach(publication => {
        if (publication.track) {
          tracksRef.current.add(publication.track);
          addTrackToDOM(publication.track, true);
        }
        publication.on('subscribed', track => {
          tracksRef.current.add(track);
          addTrackToDOM(track, true);
        });
      });

      // Fallback: Retry attaching tracks after 500ms if not attached
      setTimeout(() => {
        room.localParticipant.tracks.forEach(publication => {
          if (publication.track) {
            // Check if already attached by looking for the element
            if (!document.getElementById(`video-${publication.track.sid}`)) {
              console.log('[Fallback] Attaching track:', publication.track, 'isLocal:', true);
              tracksRef.current.add(publication.track);
              addTrackToDOM(publication.track, true);
            }
          }
        });
      }, 500);

      // Handle room disconnection
      room.on('disconnected', () => {
        console.log('Room disconnected');
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          // Attempt to reconnect after a short delay
          setTimeout(() => {
            fetchToken();
          }, 2000);
        } else {
          setError('Connection lost. Please refresh the page to reconnect.');
        }
      });

      // Attach remote participants' tracks
      room.participants.forEach(participant => {
        participant.tracks.forEach(publication => {
          if (publication.track) {
            tracksRef.current.add(publication.track);
            addTrackToDOM(publication.track, false);
          }
          publication.on('subscribed', track => {
            tracksRef.current.add(track);
            addTrackToDOM(track, false);
          });
        });
      });

      // Listen for new remote participants
      room.on('participantConnected', participant => {
        setRemoteParticipants(prev => [...prev, participant]);
        participant.tracks.forEach(publication => {
          if (publication.track) {
            tracksRef.current.add(publication.track);
            addTrackToDOM(publication.track, false);
          }
          publication.on('subscribed', track => {
            tracksRef.current.add(track);
            addTrackToDOM(track, false);
          });
        });
      });

      // Listen for participant disconnection
      room.on('participantDisconnected', participant => {
        setRemoteParticipants(prev => prev.filter(p => p !== participant));
        removeParticipantTracks(participant);
      });

      // Listen for track subscriptions (for all participants)
      room.on('trackSubscribed', (track, publication, participant) => {
        tracksRef.current.add(track);
        addTrackToDOM(track, participant === room.localParticipant);
      });

      room.on('trackUnsubscribed', (track, publication, participant) => {
        tracksRef.current.delete(track);
        removeTrackFromDOM(track);
      });

    } catch (error) {
      console.error('Error connecting to room:', error);
      setError('Failed to connect to video call');
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
        attachTrackWhenReady(track, isLocal);
      });
    }
    // Fallback: try to attach every 500ms for 5 seconds
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      if (videoContainerRef.current) {
        realAddTrackToDOM(track, isLocal);
        clearInterval(interval);
      } else if (++attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
    // Also try immediately
    attachTrackWhenReady(track, isLocal);
  };

  // The real function that attaches tracks
  const realAddTrackToDOM = (track, isLocal) => {
    console.log('Attaching track:', track.sid, 'isLocal:', isLocal);
    
    // First remove any existing elements for this track
    const existingElement = document.getElementById(`video-${track.sid}`);
    if (existingElement) {
      console.log('Removing existing element for track:', track.sid);
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
    
    console.log('Created media element:', mediaElement.id);
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.appendChild(mediaElement);
    
    if (videoContainerRef.current) {
      console.log('Appending to video container');
      videoContainerRef.current.appendChild(container);
    } else {
      console.error('Video container not available for track:', track.sid);
    }
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

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div ref={videoContainerRef} className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Video elements will be added here dynamically */}
      </div>
      <div className="bg-gray-800 p-4 flex justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
        <button
          onClick={toggleVideo}
          className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={() => room && room.disconnect()}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoCall;

