import express from 'express';
import Interview from '../models/Interview.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all interviews (admin gets all, user gets only their own)
// @route   GET /api/v1/interviews
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    // If user is not admin, only show their interviews
    if (req.user.role !== 'admin') {
      query.candidate = req.user.id;
    }
    
    const interviews = await Interview.find(query)
      .populate('candidate', 'name email')
      .populate('techStack', 'name description')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: interviews.length,
      data: interviews
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Get single interview
// @route   GET /api/v1/interviews/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('candidate', 'name email')
      .populate('techStack', 'name description')
      .populate('createdBy', 'name email');

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    // Make sure user is owner or admin
    // Handle both populated and non-populated candidate field
    const candidateId = interview.candidate._id || interview.candidate;
    if (candidateId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this interview'
      });
    }

    res.status(200).json({
      success: true,
      data: interview
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Create new interview
// @route   POST /api/v1/interviews
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    // Add user id as createdBy
    req.body.createdBy = req.user.id;
    
    // Only admins can schedule interviews for any candidate
    console.log('[INTERVIEW CREATE] req.body:', req.body);
    const interview = await Interview.create(req.body);

    res.status(201).json({
      success: true,
      data: interview
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Update interview
// @route   PUT /api/v1/interviews/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    // Make sure user is owner or admin
    // Handle both populated and non-populated candidate field
    const candidateId = interview.candidate._id || interview.candidate;
    if (candidateId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this interview'
      });
    }

    // Allow candidates to only update status
    if (req.user.role !== 'admin') {
      // Only allow candidate to update status
      const allowedUpdates = ['status'];
      
      Object.keys(req.body).forEach(key => {
        if (!allowedUpdates.includes(key)) {
          delete req.body[key];
        }
      });
    }

    interview = await Interview.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: interview
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Delete interview
// @route   DELETE /api/v1/interviews/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    await interview.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Start interview (candidate only, only during scheduled window)
// @route   POST /api/v1/interviews/:id/start
// @access  Private (Candidate only)
router.post('/:id/start', protect, async (req, res) => {
  try {
    console.log('POST /:id/start called with id:', req.params.id, 'typeof:', typeof req.params.id);

    const interview = await Interview.findById(req.params.id);
    console.log('Interview.findById result:', interview);
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }
    // Only candidate can start their own interview
    const candidateId = interview.candidate._id || interview.candidate;
    if (candidateId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    // Combine scheduledDate and scheduledTime
    const scheduledStart = new Date(`${interview.scheduledDate}T${interview.scheduledTime}`);
    const now = new Date();
    const scheduledEnd = new Date(scheduledStart.getTime() + (interview.duration || 30) * 60000);
    if (now < scheduledStart) {
      return res.status(403).json({ success: false, error: 'Interview has not started yet.' });
    }
    if (now > scheduledEnd) {
      return res.status(403).json({ success: false, error: 'Interview window has passed.' });
    }
    // Only allow if interview is scheduled (not already started/completed)
    if (interview.status !== 'scheduled') {
      return res.status(400).json({ success: false, error: 'Interview cannot be started in current state.' });
    }
    interview.status = 'in-progress';
    await interview.save();
    res.status(200).json({ success: true, data: interview });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router; 