import express from 'express';
import schedulingService from '../services/schedulingService.js';

const router = express.Router();

// Schedule a new interview
router.post('/', async (req, res) => {
  try {
    const { candidateInfo, domain, preferredTimeSlots } = req.body;
    const interview = await schedulingService.scheduleInterview(
      candidateInfo,
      domain,
      preferredTimeSlots
    );
    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all upcoming interviews
router.get('/upcoming', async (req, res) => {
  try {
    const interviews = schedulingService.getUpcomingInterviews();
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific interview
router.get('/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const interview = schedulingService.getInterview(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all interviews for a candidate
router.get('/candidate/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const interviews = schedulingService.getCandidateInterviews(email);
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update interview status
router.patch('/:interviewId/status', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { status, adminId } = req.body;
    const interview = await schedulingService.updateInterviewStatus(
      interviewId,
      status,
      adminId
    );
    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reschedule interview
router.patch('/:interviewId/reschedule', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { newTimeSlot } = req.body;
    const interview = await schedulingService.rescheduleInterview(
      interviewId,
      newTimeSlot
    );
    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel interview
router.delete('/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const interview = await schedulingService.cancelInterview(interviewId);
    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 