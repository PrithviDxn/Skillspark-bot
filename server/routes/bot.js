import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Start the interview
router.post('/start/:interviewId', protect, authorize('admin'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    // This endpoint is now a placeholder; actual bot logic is in the new bot backend
    res.json({
      success: true,
      message: 'Interview started (handled by new bot backend)'
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
    res.json({
      success: true,
      message: 'Interview paused (handled by new bot backend)'
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
    res.json({
      success: true,
      message: 'Interview resumed (handled by new bot backend)'
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
    res.json({
      success: true,
      message: 'Interview stopped (handled by new bot backend)'
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