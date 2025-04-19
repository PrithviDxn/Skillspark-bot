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
// @access  Private (Previously Admin only, now any authenticated user)
router.post('/', protect, async (req, res) => {
  try {
    // Add user id as createdBy
    req.body.createdBy = req.user.id;
    
    // If user is not an admin, they can only create interviews for themselves
    if (req.user.role !== 'admin') {
      req.body.candidate = req.user.id;
    }
    
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

export default router; 