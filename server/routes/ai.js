import express from 'express';
import { transcribeAudio } from '../controllers/ai.js';

const router = express.Router();

// Transcribe audio to text
router.post('/transcribe', transcribeAudio);

export default router; 