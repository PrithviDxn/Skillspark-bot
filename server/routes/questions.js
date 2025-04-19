import express from 'express';
import Question from '../models/Question.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all questions with optional tech stack filter
// @route   GET /api/v1/questions
// @access  Public
router.get('/', async (req, res) => {
  try {
    let query = {};
    
    // Filter by tech stack if provided
    if (req.query.techStack) {
      query.techStack = req.query.techStack;
    }
    
    const questions = await Question.find(query)
      .populate('techStack', 'name description');

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Get single question
// @route   GET /api/v1/questions/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('techStack', 'name description');

    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Create new question
// @route   POST /api/v1/questions
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const question = await Question.create(req.body);

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Update question
// @route   PUT /api/v1/questions/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    let question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Delete question
// @route   DELETE /api/v1/questions/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    await question.deleteOne();

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