import React, { useState, useEffect } from 'react';
import { Box, Grid } from '@mui/material';
import { connect, Room, LocalParticipant, RemoteParticipant } from 'twilio-video';
import AdminControls from './AdminControls';

interface VideoInterviewProps {
  onInterviewComplete: (report: any) => void;
}

const VideoInterview: React.FC<VideoInterviewProps> = ({ onInterviewComplete }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  const connectToRoom = async (token: string) => {
    try {
      const room = await connect(token, {
        name: 'interview-room',
        audio: true,
        video: true
      });

      setRoom(room);
      setLocalParticipant(room.localParticipant);

      room.on('participantConnected', (participant) => {
        setRemoteParticipants((prev) => [...prev, participant]);
      });

      room.on('participantDisconnected', (participant) => {
        setRemoteParticipants((prev) => prev.filter((p) => p.sid !== participant.sid));
      });

      return room;
    } catch (error) {
      console.error('Error connecting to room:', error);
      throw error;
    }
  };

  const handleStartInterview = async (domain: string, customInstructions: string) => {
    try {
      // Get token from server
      const response = await fetch('/api/interview/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain, customInstructions }),
      });

      if (!response.ok) {
        throw new Error('Failed to get token');
      }

      const { token } = await response.json();
      await connectToRoom(token);
      setIsInterviewActive(true);
    } catch (error) {
      console.error('Error starting interview:', error);
    }
  };

  const handlePauseInterview = async () => {
    try {
      await fetch('/api/interview/pause', { method: 'POST' });
      setIsPaused(true);
    } catch (error) {
      console.error('Error pausing interview:', error);
    }
  };

  const handleResumeInterview = async () => {
    try {
      await fetch('/api/interview/resume', { method: 'POST' });
      setIsPaused(false);
    } catch (error) {
      console.error('Error resuming interview:', error);
    }
  };

  const handleEndInterview = async () => {
    try {
      const response = await fetch('/api/interview/end', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to end interview');
      }

      const report = await response.json();
      onInterviewComplete(report);
      setIsInterviewActive(false);
      setIsPaused(false);

      if (room) {
        room.disconnect();
        setRoom(null);
      }
    } catch (error) {
      console.error('Error ending interview:', error);
    }
  };

  return (
    <Box>
      <AdminControls
        onStartInterview={handleStartInterview}
        onPauseInterview={handlePauseInterview}
        onResumeInterview={handleResumeInterview}
        onEndInterview={handleEndInterview}
        isInterviewActive={isInterviewActive}
        isPaused={isPaused}
      />

      <Grid container spacing={2}>
        {localParticipant && (
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: 'relative',
                paddingTop: '56.25%', // 16:9 aspect ratio
                backgroundColor: '#000',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              {localParticipant.videoTracks.forEach((publication) => {
                const track = publication.track;
                if (track) {
                  const element = track.attach();
                  element.style.position = 'absolute';
                  element.style.top = '0';
                  element.style.left = '0';
                  element.style.width = '100%';
                  element.style.height = '100%';
                  element.style.objectFit = 'cover';
                }
              })}
            </Box>
          </Grid>
        )}

        {remoteParticipants.map((participant) => (
          <Grid item xs={12} md={6} key={participant.sid}>
            <Box
              sx={{
                position: 'relative',
                paddingTop: '56.25%',
                backgroundColor: '#000',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              {participant.videoTracks.forEach((publication) => {
                const track = publication.track;
                if (track) {
                  const element = track.attach();
                  element.style.position = 'absolute';
                  element.style.top = '0';
                  element.style.left = '0';
                  element.style.width = '100%';
                  element.style.height = '100%';
                  element.style.objectFit = 'cover';
                }
              })}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default VideoInterview; 