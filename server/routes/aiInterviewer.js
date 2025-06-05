import express from 'express';
import {
  initializeAIInterviewer,
  startInterview,
  pauseInterview,
  resumeInterview,
  endInterview,
  getInterviewStatus
} from '../controllers/aiInterviewerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require authentication
router.use(protect);

// Initialize AI interviewer
router.post('/:interviewId/initialize', initializeAIInterviewer);

// Get interview status and metrics
router.get('/:interviewId/status', getInterviewStatus);

// Control interview flow
router.post('/:interviewId/start', startInterview);
router.post('/:interviewId/pause', pauseInterview);
router.post('/:interviewId/resume', resumeInterview);
router.post('/:interviewId/end', endInterview);

export default router; 