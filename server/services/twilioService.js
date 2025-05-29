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
    // If found, return its SID
    return existingRoom.sid;
  } catch (error) {
    // If not found, create a new room
    if (error.status === 404) {
      const room = await client.video.rooms.create({
        uniqueName: roomName,
        type: 'group',
        maxParticipants: 2,
        recordParticipantsOnConnect: true,
        statusCallback: 'https://skill-spark-interview-ai-1.onrender.com/api/v1/video/recording-webhook',
        statusCallbackMethod: 'POST'
      });
      return room.sid;
    } else {
      // If it's a different error, rethrow
      console.error('Error creating or fetching Twilio video room:', error);
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