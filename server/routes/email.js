import express from 'express';
import { sendInterviewInvitation, verifyInterviewToken } from '../controllers/email.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.post('/send-invitation/:id', protect, sendInterviewInvitation);

// Public routes
router.get('/verify-token/:id', verifyInterviewToken);

export default router;
