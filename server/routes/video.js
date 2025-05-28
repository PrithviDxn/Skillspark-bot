import express from 'express';
import { createVideoRoom, generateAccessToken } from '../services/twilioService.js';
import { protect } from '../middleware/auth.js';
import { handleTwilioRecordingWebhook } from '../controllers/twilioRecordingController.js';

const router = express.Router();

// @desc    Create video room for interview
// @route   POST /api/v1/video/room/:interviewId
// @access  Private
router.post('/room/:interviewId', protect, async (req, res, next) => {
  console.log('Video room endpoint hit!');
  try {
    const interviewId = req.params.interviewId;
    const identity = req.user.id;

    // Create a video room
    const roomSid = await createVideoRoom(interviewId);

    // Generate access token
    const token = await generateAccessToken(interviewId, identity);

    res.status(200).json({
      success: true,
      data: {
        roomSid,
        token
      }
    });
  } catch (error) {
    console.error('Error in video room creation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create video room'
    });
  }
});

router.post('/recording-webhook', handleTwilioRecordingWebhook);

export default router; 