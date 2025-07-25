import { useEffect, useState, useRef } from 'react';
import { Video, connect } from 'twilio-video';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AIInterviewerControls from './AIInterviewerControls';

// TrackRenderer component for robust track attachment
function TrackRenderer({ track, kind, isLocal }) {
  const containerRef = useRef(null);
  const [isAttached, setIsAttached] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 10;

  // Log on render
  console.log('[TrackRenderer][render]', { kind, isLocal, track });

  useEffect(() => {
    let retryTimeout;
    let mounted = true;

    const tryAttach = () => {
      if (!mounted) return;

      if (!track) {
        console.log('[TrackRenderer] Invalid track:', track);
        return;
      }

      if (kind === 'video' && containerRef.current) {
        // Force enable and restart if possible
        if (typeof track.enable === 'function') track.enable();
        if (typeof track.restart === 'function') track.restart();
        console.log('[TrackRenderer] Attempting to attach video track:', {
          sid: track.sid,
          id: track.id,
          isLocal,
          containerReady: !!containerRef.current,
          trackEnabled: track.isEnabled
        });
        try {
          track.detach().forEach(el => el.remove());
          const mediaElement = track.attach();
          mediaElement.id = `video-${track.sid || track.id || (isLocal ? 'local' : 'remote')}`;
          mediaElement.className = `video-participant w-full h-full object-cover rounded-lg ${isLocal ? 'local' : 'remote'}`;
          mediaElement.autoplay = true;
          mediaElement.playsInline = true;
          mediaElement.muted = false;
          mediaElement.volume = 1.0;
          mediaElement.onerror = (e) => {
            console.error('[TrackRenderer] Video element error:', e);
          };
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
          containerRef.current.appendChild(mediaElement);
          setIsAttached(true);
          console.log('[TrackRenderer] Successfully attached video track:', {
            sid: track.sid,
            id: track.id,
            isLocal,
            elementId: mediaElement.id
          });
          // Log video element state
          setTimeout(() => {
            console.log('[TrackRenderer] Video element state:', {
              paused: mediaElement.paused,
              ended: mediaElement.ended,
              readyState: mediaElement.readyState,
              srcObject: mediaElement.srcObject,
              videoWidth: mediaElement.videoWidth,
              videoHeight: mediaElement.videoHeight
            });
          }, 500);
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
        if (track && !isLocal) {
          track.detach().forEach(el => el.remove());
          let audioElement;
          audioElement = track.attach();
          audioElement.autoplay = true;
          audioElement.muted = false;
          audioElement.volume = 1.0;
          audioElement.style.display = 'none';
          document.body.appendChild(audioElement);
          console.log('[TrackRenderer] Attached remote audio track:', track.sid || track.id);
          return () => {
            if (audioElement) {
              audioElement.remove();
            }
            if (track && !isLocal) {
              track.detach().forEach(el => el.remove());
            }
          };
        }
        setIsAttached(true);
      } else if (retryCount < MAX_RETRIES) {
        console.log('[TrackRenderer] Container not ready, retrying...', {
          retryCount: retryCount + 1,
          kind,
          isLocal,
          trackSid: track.sid,
          trackId: track.id
        });
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
      >
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 12,
          zIndex: 10
        }}>
          {isLocal ? 'Local' : 'Remote'}
        </div>
      </div>
    );
  } else if (kind === 'audio') {
    return null;
  }
  return null;
}

// Add this helper function
function setupParticipantTrackListeners(participant, setTrackUpdateCount) {
  // For all existing publications
  participant.tracks.forEach(publication => {
    if (publication.track) {
      setTrackUpdateCount(count => count + 1);
    }
    publication.on('subscribed', () => setTrackUpdateCount(count => count + 1));
    publication.on('unsubscribed', () => setTrackUpdateCount(count => count + 1));
    publication.on('trackEnabled', () => setTrackUpdateCount(count => count + 1));
    publication.on('trackDisabled', () => setTrackUpdateCount(count => count + 1));
  });
  // For future publications
  participant.on('trackPublished', publication => {
    publication.on('subscribed', () => setTrackUpdateCount(count => count + 1));
    publication.on('unsubscribed', () => setTrackUpdateCount(count => count + 1));
    publication.on('trackEnabled', () => setTrackUpdateCount(count => count + 1));
    publication.on('trackDisabled', () => setTrackUpdateCount(count => count + 1));
    setTrackUpdateCount(count => count + 1);
  });
  participant.on('trackUnpublished', () => setTrackUpdateCount(count => count + 1));
}

const VideoCall = ({ interviewId }) => {
  const [room, setRoom] = useState(null);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [isWaitingForCandidate, setIsWaitingForCandidate] = useState(false);
  const { user } = useAuth();
  const [videoContainers, setVideoContainers] = useState([]); 
  const [trackUpdateCount, setTrackUpdateCount] = useState(0);
  // New state for mic/cam and toast
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [mediaUnlocked, setMediaUnlocked] = useState(false);
  const navigate = useNavigate();
  const [meetingEnded, setMeetingEnded] = useState(false);

  // Toast effect
  useEffect(() => {
    if (toastMessage) {
      const timeout = setTimeout(() => setToastMessage(''), 2000);
      return () => clearTimeout(timeout);
    }
  }, [toastMessage]);

  // Update video containers when tracks change
  useEffect(() => {
    const tracks = getAllVideoTracks();
    setVideoContainers(tracks.map(({ track, isLocal, kind }) => ({
      track,
      isLocal,
      kind
    })));
  }, [localParticipant, remoteParticipants, trackUpdateCount]);

  // Update isAudioEnabled/isVideoEnabled when localParticipant changes
  useEffect(() => {
    if (localParticipant) {
      // Audio
      let enabled = true;
      for (let pub of localParticipant.audioTracks.values()) {
        if (pub.track && pub.track.isEnabled === false) enabled = false;
      }
      setIsAudioEnabled(enabled);
      // Video
      enabled = true;
      for (let pub of localParticipant.videoTracks.values()) {
        if (pub.track && pub.track.isEnabled === false) enabled = false;
      }
      setIsVideoEnabled(enabled);
    }
  }, [localParticipant, trackUpdateCount]);

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
      console.log('[VideoCall] Connecting to Twilio room...');
      const newRoom = await connect(token, {
        name: `interview-${interviewId}`,
        audio: true,
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      console.log('[VideoCall] Successfully connected to room:', newRoom.sid, 'Room name:', newRoom.name, 'Local identity:', newRoom.localParticipant.identity);
      setRoom(newRoom);
      setLocalParticipant(newRoom.localParticipant);
      // --- Listen for local track events and update state ---
      newRoom.localParticipant.tracks.forEach(publication => {
        if (publication.track) {
          setTrackUpdateCount(count => count + 1);
        }
        publication.on('subscribed', track => {
          setTrackUpdateCount(count => count + 1);
        });
        publication.on('trackPublished', () => {
          setTrackUpdateCount(count => count + 1);
        });
      });
      newRoom.localParticipant.on('trackPublished', () => {
        setTrackUpdateCount(count => count + 1);
      });
      // --- End local track event listeners ---
      newRoom.on('participantConnected', participant => {
        console.log('[VideoCall][Twilio] participantConnected:', participant.identity, participant);
        setRemoteParticipants(prev => {
          const updated = [...prev, participant];
          console.log('[VideoCall][remoteParticipants][after connect]', updated.map(p => p.identity), updated);
          return updated;
        });
        setupParticipantTrackListeners(participant, setTrackUpdateCount);
        setTrackUpdateCount(count => count + 1);
      });
      newRoom.on('participantDisconnected', participant => {
        console.log('[VideoCall][Twilio] participantDisconnected:', participant.identity, participant);
        setRemoteParticipants(prev => {
          const updated = prev.filter(p => p !== participant);
          console.log('[VideoCall][remoteParticipants][after disconnect]', updated.map(p => p.identity), updated);
          return updated;
        });
        setTrackUpdateCount(count => count + 1);
      });
      newRoom.on('trackSubscribed', (track, publication, participant) => {
        console.log('[VideoCall][Twilio] trackSubscribed:', {
          participant: participant?.identity,
          kind: track.kind,
          sid: track.sid,
          id: track.id,
          publication
        });
        setTrackUpdateCount(count => count + 1);
      });
      newRoom.on('trackUnsubscribed', (track, publication, participant) => {
        console.log('[VideoCall][Twilio] trackUnsubscribed:', {
          participant: participant?.identity,
          kind: track.kind,
          sid: track.sid,
          id: track.id,
          publication
        });
        setTrackUpdateCount(count => count + 1);
      });
      // Add all existing participants to remoteParticipants
      const initialParticipants = Array.from(newRoom.participants.values());
      setRemoteParticipants(initialParticipants);
      initialParticipants.forEach(participant => {
        console.log('[VideoCall][Twilio] initial participant:', participant.identity, participant);
        setupParticipantTrackListeners(participant, setTrackUpdateCount);
      });
      // Log all participants in the room
      console.log('[VideoCall][Twilio] All participants in room:', initialParticipants.map(p => p.identity));
    } catch (error) {
      console.error('[VideoCall] Error connecting to room:', error);
      setError('Failed to connect to video call. Please try refreshing the page.');
    }
  };

  const toggleAudio = () => {
    if (localParticipant) {
      const audioTrack = localParticipant.audioTracks.values().next().value;
      if (audioTrack) {
        const newState = !audioTrack.track.isEnabled;
        audioTrack.track.enable(newState);
        setIsAudioEnabled(newState);
        setToastMessage(newState ? 'Mic is on' : 'Mic is off');
      }
    }
  };

  const toggleVideo = () => {
    if (localParticipant) {
      const videoTrack = localParticipant.videoTracks.values().next().value;
      if (videoTrack) {
        const newState = !videoTrack.track.isEnabled;
        videoTrack.track.enable(newState);
        setIsVideoEnabled(newState);
        setToastMessage(newState ? 'Camera is on' : 'Camera is off');
      }
    }
  };

  // Updated getAllVideoTracks function
  const getAllVideoTracks = () => {
    const tracks = [];
    if (localParticipant) {
      localParticipant.tracks.forEach(publication => {
        if (publication.track) {
          const track = publication.track;
          if (track.kind === 'video' || track.kind === 'audio') {
            // Ensure track is fully ready (has id or sid)
            if (track.id || track.sid) {
              tracks.push({
                track,
                isLocal: true,
                kind: track.kind
              });
            }
          }
        }
      });
    }
    remoteParticipants.forEach(participant => {
      if (participant.identity === localParticipant?.identity) return; // skip self
      participant.tracks.forEach(publication => {
        if (publication.track) {
          const track = publication.track;
          if (track.kind === 'video' || track.kind === 'audio') {
            // Ensure track is fully ready (has id or sid)
            if (track.id || track.sid) {
              tracks.push({
                track,
                isLocal: false,
                kind: track.kind
              });
            }
          }
        }
      });
    });
    console.log('[VideoCall][getAllVideoTracks] Returning tracks:', tracks.map(t => ({
      sid: t.track.sid,
      kind: t.kind,
      isLocal: t.isLocal,
      trackId: t.track.id,
      participantIdentity: t.track?.participant?.identity
    })));
    return tracks;
  };

  useEffect(() => {
    return () => {
      console.log('Cleaning up VideoCall component');
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  // Helper to play all media elements (for autoplay policy)
  const unlockMedia = () => {
    const videos = Array.from(document.querySelectorAll('video'));
    const audios = Array.from(document.querySelectorAll('audio'));
    videos.forEach(v => { try { v.muted = false; v.volume = 1.0; v.play(); } catch (e) { console.error('Video play error', e); } });
    audios.forEach(a => { try { a.muted = false; a.volume = 1.0; a.play(); } catch (e) { console.error('Audio play error', e); } });
    setMediaUnlocked(true);
  };

  // Add a useEffect to log remoteParticipants on every change
  useEffect(() => {
    console.log('[VideoCall][remoteParticipants][state]', remoteParticipants.map(p => p.identity), remoteParticipants);
  }, [remoteParticipants]);

  const handleEndCall = async () => {
    if (room) {
      room.disconnect();
    }
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/interviews/${interviewId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Failed to mark interview as completed:', err);
    }
    setMeetingEnded(true);
  };

  if (meetingEnded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <div className="text-3xl text-white mb-4">Meeting Ended</div>
        <div className="mb-8 text-gray-400">Thank you for attending the interview.</div>
        <button
          className="px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 text-lg"
          onClick={() => {
            if (user?.role === 'admin') {
              navigate('/admin/dashboard');
            } else {
              navigate('/dashboard');
            }
          }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

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
    // Find the local video track
    const localVideo = videoContainers.find(vc => vc.isLocal && vc.kind === 'video');
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-900">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-white text-2xl mb-4">Waiting for candidate to join...</div>
          <div className="text-gray-400 mb-8">Your video and audio are ready</div>
          <div className="video-container relative w-[400px] aspect-video">
            {localVideo && (
              <TrackRenderer
                key={`${localVideo.track.sid}-waiting`}
                track={localVideo.track}
                kind={localVideo.kind}
                isLocal={localVideo.isLocal}
              />
            )}
          </div>
          <div className="mt-8 bg-gray-800 p-2 flex justify-center space-x-4">
            <button
              onClick={toggleAudio}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            >
              {/* Mic icon, slashed if muted */}
              {isAudioEnabled ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a3 3 0 016 0v6a3 3 0 01-3 3m-7-3a7 7 0 0014 0m-7 7v4m0 0H8m4 0h4M3 3l18 18" />
                </svg>
              )}
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
              onClick={handleEndCall}
              className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.517l1.128-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3L3 21" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('[VideoCall][render] videoContainers:', videoContainers);

  const renderAdminControls = () => {
    if (user?.role === 'admin') {
      return (
        <div className="absolute top-4 left-4 z-50">
          <AIInterviewerControls interviewId={interviewId} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {renderAdminControls()}
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
      <div className="bg-gray-800 p-2 flex justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
        >
          {/* Mic icon, slashed if muted */}
          {isAudioEnabled ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a3 3 0 016 0v6a3 3 0 01-3 3m-7-3a7 7 0 0014 0m-7 7v4m0 0H8m4 0h4M3 3l18 18" />
            </svg>
          )}
        </button>
        <button
          onClick={toggleVideo}
          className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
        >
          {/* Video icon, slashed if off */}
          {isVideoEnabled ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zm-6-6l16 16" />
            </svg>
          )}
        </button>
        <button
          onClick={handleEndCall}
          className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.517l1.128-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3L3 21" />
          </svg>
        </button>
      </div>
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded shadow-lg z-50 text-lg animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default VideoCall;

