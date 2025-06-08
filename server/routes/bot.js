import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { sendToInterview } from '../websocket.js';

const router = express.Router();

// Start the interview
router.post('/start/:interviewId', protect, authorize('admin'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    // Send start message to all participants
    sendToInterview(interviewId, {
      type: 'START_INTERVIEW',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Interview started'
    });
  } catch (err) {
    console.error('Error starting interview:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to start interview'
    });
  }
});

// Pause the interview
router.post('/pause/:interviewId', protect, authorize('admin'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    sendToInterview(interviewId, {
      type: 'PAUSE_INTERVIEW',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Interview paused'
    });
  } catch (err) {
    console.error('Error pausing interview:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to pause interview'
    });
  }
});

// Resume the interview
router.post('/resume/:interviewId', protect, authorize('admin'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    sendToInterview(interviewId, {
      type: 'RESUME_INTERVIEW',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Interview resumed'
    });
  } catch (err) {
    console.error('Error resuming interview:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to resume interview'
    });
  }
});

// Stop the interview
router.post('/stop/:interviewId', protect, authorize('admin'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    sendToInterview(interviewId, {
      type: 'STOP_INTERVIEW',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Interview stopped'
    });
  } catch (err) {
    console.error('Error stopping interview:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to stop interview'
    });
  }
});

// Get bot status
router.get('/status/:interviewId', protect, async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    // TODO: Implement actual status check from database
    res.json({
      success: true,
      status: 'active', // or 'paused', 'inactive'
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error getting bot status:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get bot status'
    });
  }
});

export default router; 