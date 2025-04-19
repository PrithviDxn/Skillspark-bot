import express from 'express';
import Answer from '../models/Answer.js';
import Interview from '../models/Interview.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get answers with interview filter
// @route   GET /api/v1/answers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    // Filter by interview if provided
    if (req.query.interview) {
      query.interview = req.query.interview;
      
      // Check if user is authorized to access this interview's answers
      const interview = await Interview.findById(req.query.interview);
      
      if (!interview) {
        return res.status(404).json({
          success: false,
          error: 'Interview not found'
        });
      }
      
      // Make sure user is owner or admin
      const candidateId = interview.candidate._id || interview.candidate;
      if (candidateId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access these answers'
        });
      }
    } else if (req.user.role !== 'admin') {
      // If no interview filter and not admin, only show answers related to user's interviews
      const userInterviews = await Interview.find({ candidate: req.user.id });
      const userInterviewIds = userInterviews.map(interview => interview._id);
      
      query.interview = { $in: userInterviewIds };
    }
    
    const answers = await Answer.find(query)
      .populate('interview', 'candidate techStack status')
      .populate('question', 'text difficulty');

    res.status(200).json({
      success: true,
      count: answers.length,
      data: answers
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Get single answer
// @route   GET /api/v1/answers/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id)
      .populate('interview', 'candidate techStack status')
      .populate('question', 'text difficulty');

    if (!answer) {
      return res.status(404).json({
        success: false,
        error: 'Answer not found'
      });
    }

    // Get the interview to check authorization
    const interview = await Interview.findById(answer.interview);

    // Make sure user is owner or admin
    const candidateId = interview.candidate._id || interview.candidate;
    if (candidateId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this answer'
      });
    }

    res.status(200).json({
      success: true,
      data: answer
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Create new answer
// @route   POST /api/v1/answers
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    // Check if the interview exists and user is authorized
    const interview = await Interview.findById(req.body.interview);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }
    
    // Make sure user is owner or admin
    const candidateId = interview.candidate._id || interview.candidate;
    if (candidateId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create answers for this interview'
      });
    }
    
    const answer = await Answer.create(req.body);

    res.status(201).json({
      success: true,
      data: answer
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Update answer
// @route   PUT /api/v1/answers/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        error: 'Answer not found'
      });
    }

    // Get the interview to check authorization
    const interview = await Interview.findById(answer.interview);

    // For regular users, only allow updating if they are the interview candidate
    // For admins, only allow updating score and feedback
    if (req.user.role === 'admin') {
      // Only allow admin to update score and feedback
      const allowedUpdates = ['score', 'feedback'];
      
      Object.keys(req.body).forEach(key => {
        if (!allowedUpdates.includes(key)) {
          delete req.body[key];
        }
      });
    } else {
      const candidateId = interview.candidate._id || interview.candidate;
      if (candidateId.toString() === req.user.id) {
        // Only allow candidate to update audioUrl and transcript
        const allowedUpdates = ['audioUrl', 'transcript'];
        
        Object.keys(req.body).forEach(key => {
          if (!allowedUpdates.includes(key)) {
            delete req.body[key];
          }
        });
      } else {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this answer'
        });
      }
    }

    answer = await Answer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: answer
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Delete answer
// @route   DELETE /api/v1/answers/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        error: 'Answer not found'
      });
    }

    await answer.deleteOne();

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