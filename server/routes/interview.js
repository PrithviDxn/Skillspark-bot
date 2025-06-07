import express from 'express';
import twilio from 'twilio';
import { protect } from '../middleware/auth.js';
import Interview from '../models/Interview.js';
import { generateAccessToken } from '../services/twilioService.js';
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

// @desc    Initialize bot for interview
// @route   POST /api/v1/interview/:id/initialize
// @access  Private (Admin only)
router.post('/:id/initialize', protect, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Generate bot token
    const botToken = await generateAccessToken(interview._id, 'bot');

    // Get first question
    const firstQuestion = interview.questions[0]?.text || 'Welcome to the interview!';

    res.status(200).json({
      success: true,
      data: {
        token: botToken,
        question: firstQuestion
      }
    });
  } catch (error) {
    console.error('Error initializing bot:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize bot' });
  }
});

// @desc    Start interview
// @route   POST /api/v1/interview/:id/start
// @access  Private (Admin only)
router.post('/:id/start', protect, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Update interview status
    interview.status = 'in-progress';
    await interview.save();

    // Get first question
    const firstQuestion = interview.questions[0]?.text || 'Welcome to the interview!';

    res.status(200).json({
      success: true,
      data: {
        question: firstQuestion
      }
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ success: false, error: 'Failed to start interview' });
  }
});

// @desc    End interview
// @route   POST /api/v1/interview/:id/end
// @access  Private (Admin only)
router.post('/:id/end', protect, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Update interview status
    interview.status = 'completed';
    await interview.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Interview ended successfully'
      }
    });
  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({ success: false, error: 'Failed to end interview' });
  }
});

// @desc    Process answer and get next question
// @route   POST /api/v1/interview/:id/answer
// @access  Private
router.post('/:id/answer', protect, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    // Get current question index
    const currentIndex = interview.currentQuestionIndex || 0;
    
    // Get next question
    const nextQuestion = interview.questions[currentIndex + 1]?.text || null;

    // Update current question index
    interview.currentQuestionIndex = currentIndex + 1;
    await interview.save();

    res.status(200).json({
      success: true,
      data: {
        nextQuestion
      }
    });
  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).json({ success: false, error: 'Failed to process answer' });
  }
});

export default router; 