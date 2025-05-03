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
    
    // Log the incoming data including criteria if present
    console.log('Creating new answer with data:', {
      interview: req.body.interview,
      question: req.body.question,
      hasAudioUrl: !!req.body.audioUrl,
      hasTranscript: !!req.body.transcript,
      hasScore: req.body.score !== undefined,
      hasFeedback: !!req.body.feedback,
      hasCriteria: !!req.body.criteria,
      criteriaData: req.body.criteria
    });
    
    const answer = await Answer.create(req.body);
    
    // Log the created answer to check if criteria was saved
    console.log('New answer created:', {
      id: answer._id,
      hasScore: answer.score !== undefined,
      hasCriteria: !!answer.criteria,
      criteria: answer.criteria
    });

    res.status(201).json({
      success: true,
      data: answer
    });
  } catch (err) {
    console.error('Error creating answer:', err);
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
      // Only allow admin to update score, feedback, and criteria
      const allowedUpdates = ['score', 'feedback', 'criteria'];
      
      Object.keys(req.body).forEach(key => {
        if (!allowedUpdates.includes(key)) {
          delete req.body[key];
        }
      });

      // Log what we're about to update if criteria is present
      if (req.body.criteria) {
        console.log('About to update answer with criteria:', JSON.stringify(req.body.criteria));
      }
    } else {
      const candidateId = interview.candidate._id || interview.candidate;
      if (candidateId.toString() === req.user.id) {
        // Allow candidate to update audioUrl, transcript, and code
        const allowedUpdates = ['audioUrl', 'transcript', 'code', 'codeLanguage'];
        
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

    // Use a different approach to update criteria
    const updateData = { ...req.body };
    
    // Extract criteria to set it separately
    const criteriaData = updateData.criteria;
    delete updateData.criteria;

    // First update regular fields
    answer = await Answer.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    // If criteria data was provided, update it specifically
    if (criteriaData) {
      console.log('Setting criteria data directly:', JSON.stringify(criteriaData));
      answer.criteria = criteriaData;
      await answer.save();
    }

    // Log the updated answer to check if criteria was saved
    console.log('Updated answer:', {
      id: answer._id,
      hasCriteria: !!answer.criteria,
      criteria: answer.criteria
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

// @desc    Debug route to get raw answer data
// @route   GET /api/v1/answers/debug/:id
// @access  Private (Admin only)
router.get('/debug/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // Get the answer directly using findById without populate
    const answer = await Answer.findById(req.params.id);
    
    if (!answer) {
      return res.status(404).json({
        success: false,
        error: 'Answer not found'
      });
    }
    
    // Return the raw answer document with all fields
    res.status(200).json({
      success: true,
      data: {
        answer,
        hasScore: answer.score !== undefined,
        hasFeedback: answer.feedback !== undefined,
        hasCriteria: answer.criteria !== undefined,
        criteriaFields: answer.criteria ? Object.keys(answer.criteria) : [],
        criteriaIsObject: answer.criteria ? typeof answer.criteria === 'object' : false
      }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// @desc    Batch upload answers
// @route   POST /api/v1/answers/batch
// @access  Private
router.post('/batch', protect, async (req, res) => {
  try {
    const answers = req.body; // array of answers
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: 'Request body must be an array of answers' });
    }
    const results = [];
    for (const ans of answers) {
      // Upsert by interview+question
      let answer = await Answer.findOneAndUpdate(
        { interview: ans.interview, question: ans.question },
        ans,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(answer);
    }
    res.status(201).json({ success: true, data: results });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router; 