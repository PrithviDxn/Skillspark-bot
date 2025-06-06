import express from 'express';
import twilio from 'twilio';
const { jwt: { AccessToken }, VideoGrant } = twilio;

const router = express.Router();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const client = twilio(apiKey, apiSecret, { accountSid });

// Generate Twilio token for video
router.post('/token', async (req, res) => {
  try {
    const { identity, room } = req.body;
    
    // Create an access token
    const accessToken = new AccessToken(
      accountSid,
      apiKey,
      apiSecret
    );

    // Set the identity
    accessToken.identity = identity;

    // Grant video access
    const videoGrant = new VideoGrant({
      room: room
    });
    accessToken.addGrant(videoGrant);

    // Generate the token
    const token = accessToken.toJwt();

    res.json({
      token: token,
      room: room
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Store interview report
router.post('/report', async (req, res) => {
  try {
    const { candidateId, techStack, report } = req.body;
    
    // Here you would typically store the report in your database
    // For now, we'll just log it
    console.log('Interview Report:', {
      candidateId,
      techStack,
      report,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error storing report:', error);
    res.status(500).json({ error: 'Failed to store report' });
  }
});

export default router; 