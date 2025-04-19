import express from 'express';
import { transcribeAudio, evaluateAnswer } from '../controllers/ai.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// AI Routes
router.post('/transcribe', transcribeAudio);
router.post('/evaluate', evaluateAnswer);

export default router; 