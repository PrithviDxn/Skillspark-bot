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

// @desc    Upload questions from file
// @route   POST /api/v1/questions/upload
// @access  Private/Admin
router.post('/upload', protect, authorize('admin'), async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }

    const file = req.files.file;
    const techStackId = req.body.techStack;

    if (!techStackId) {
      return res.status(400).json({
        success: false,
        error: 'Please specify a tech stack'
      });
    }

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'docx', 'csv'].includes(extension)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file format. Please upload .txt, .docx, or .csv files only.'
      });
    }

    // Read file content based on type
    let questions = [];
    if (extension === 'txt') {
      const content = file.data.toString('utf-8');
      questions = content.split('\n')
        .filter(line => line.trim())
        .map(line => ({
          techStack: techStackId,
          text: line.trim(),
          difficulty: 'medium' // Default difficulty
        }));
    } else if (extension === 'csv') {
      const content = file.data.toString('utf-8');
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      questions = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            techStack: techStackId,
            text: values[headers.indexOf('text')] || values[0],
            difficulty: values[headers.indexOf('difficulty')] || 'medium'
          };
        });
    } else if (extension === 'docx') {
      // For docx files, we'll need to use a library like mammoth
      // This is a placeholder for docx processing
      return res.status(400).json({
        success: false,
        error: 'DOCX file processing not implemented yet'
      });
    }

    // Validate questions
    const validQuestions = questions.filter(q => 
      q.text && 
      q.text.length > 0 && 
      ['easy', 'medium', 'hard'].includes(q.difficulty)
    );

    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid questions found in the file'
      });
    }

    // Save questions to database
    const savedQuestions = await Question.insertMany(validQuestions);

    res.status(200).json({
      success: true,
      count: savedQuestions.length,
      data: savedQuestions
    });
  } catch (err) {
    console.error('Error uploading questions:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router; 