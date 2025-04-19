import express from 'express';
import TechStack from '../models/TechStack.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all tech stacks
// @route   GET /api/v1/techstacks
// @access  Public
router.get('/', async (req, res) => {
  try {
    const techStacks = await TechStack.find();

    res.status(200).json({
      success: true,
      count: techStacks.length,
      data: techStacks
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Get single tech stack
// @route   GET /api/v1/techstacks/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const techStack = await TechStack.findById(req.params.id);

    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }

    res.status(200).json({
      success: true,
      data: techStack
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Create new tech stack
// @route   POST /api/v1/techstacks
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Attempting to create tech stack with data:', req.body);
    
    // Check if required fields are present
    if (!req.body.name || !req.body.description) {
      console.log('Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Please provide name and description'
      });
    }
    
    const techStack = await TechStack.create(req.body);
    console.log('Tech stack created successfully:', techStack);

    res.status(201).json({
      success: true,
      data: techStack
    });
  } catch (err) {
    console.error('Error creating tech stack:', err);
    
    // Check for duplicate key error (MongoDB code 11000)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A tech stack with that name already exists'
      });
    }
    
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Update tech stack
// @route   PUT /api/v1/techstacks/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    let techStack = await TechStack.findById(req.params.id);

    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }

    techStack = await TechStack.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: techStack
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Delete tech stack
// @route   DELETE /api/v1/techstacks/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const techStack = await TechStack.findById(req.params.id);

    if (!techStack) {
      return res.status(404).json({
        success: false,
        error: 'Tech stack not found'
      });
    }

    await techStack.deleteOne();

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