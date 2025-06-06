import React, { useEffect, useRef } from 'react';
import Video from 'twilio-video';

const VideoCall = ({ token, roomName }) => {
  const videoRef = useRef(null);
  const roomRef = useRef(null);

  useEffect(() => {
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

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default VideoCall; 