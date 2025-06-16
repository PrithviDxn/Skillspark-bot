import twilio from 'twilio';

const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

  const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  {
    accountSid: process.env.TWILIO_ACCOUNT_SID
  }
);

const createVideoRoom = async (interviewId) => {
  const roomName = `interview-${interviewId}`;
  try {
    // Try to fetch the room first
    const existingRoom = await client.video.rooms(roomName).fetch();
    console.log(`[Twilio] Found existing room ${roomName} with SID ${existingRoom.sid}`);
    
    // Clean up any stale participants
    const participants = await existingRoom.participants().list();
    console.log(`[Twilio] Room ${roomName} has ${participants.length} participants:`, 
      participants.map(p => ({
        identity: p.identity,
        status: p.status,
        lastUpdated: p.dateUpdated
      }))
    );
    
    for (const participant of participants) {
      // If participant has been disconnected for more than 5 minutes, remove them
      const disconnectedTime = new Date(participant.dateUpdated);
      const now = new Date();
      const minutesSinceDisconnect = (now - disconnectedTime) / (1000 * 60);
      
      if (minutesSinceDisconnect > 5) {
        await participant.remove();
        console.log(`[Twilio] Removed stale participant ${participant.identity} from room ${roomName} (disconnected ${minutesSinceDisconnect.toFixed(1)} minutes ago)`);
      }
    }
    
    // If found, return its SID
    return existingRoom.sid;
  } catch (error) {
    // If not found, create a new room
    if (error.status === 404) {
      console.log(`[Twilio] Creating new room ${roomName}`);
      const room = await client.video.rooms.create({
        uniqueName: roomName,
        type: 'group',
        maxParticipants: 4, // Increased to allow candidate, admin, bot, and one extra
        recordParticipantsOnConnect: true,
        statusCallback: 'https://skill-spark-interview-ai-1.onrender.com/api/v1/video/recording-webhook',
        statusCallbackMethod: 'POST'
      });
      console.log(`[Twilio] Created new room ${roomName} with SID ${room.sid}`);
      
      // Save the room SID to the interview
      const Interview = (await import('../models/Interview.js')).default;
      await Interview.findByIdAndUpdate(interviewId, { twilioRoomSid: room.sid });
      return room.sid;
    } else {
      // If it's a different error, rethrow
      console.error('[Twilio] Error creating or fetching video room:', error);
      throw error;
    }
  }
};

const generateAccessToken = async (interviewId, identity) => {
  try {
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { identity }
    );
    
    const videoGrant = new VideoGrant({
      room: `interview-${interviewId}`
    });

    token.addGrant(videoGrant);
    return token.toJwt();
  } catch (error) {
    console.error('Error generating Twilio access token:', error);
    throw error;
  }
};

export {
  createVideoRoom,
  generateAccessToken
};