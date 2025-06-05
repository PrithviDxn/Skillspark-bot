import AIInterviewer from '../services/aiInterviewerService.js';
import Interview from '../models/Interview.js';

// Store active AI interviewers
const activeInterviewers = new Map();

export const initializeAIInterviewer = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { domain, customInstructions } = req.body;

    // Find the interview
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    // Check if AI interviewer is already active
    if (activeInterviewers.has(interviewId)) {
      return res.status(400).json({
        success: false,
        error: 'AI interviewer is already active for this interview'
      });
    }

    // Create and initialize AI interviewer
    const aiInterviewer = new AIInterviewer(
      interview.twilioRoomSid,
      domain,
      customInstructions
    );

    await aiInterviewer.initialize();
    activeInterviewers.set(interviewId, aiInterviewer);

    res.status(200).json({
      success: true,
      message: 'AI interviewer initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing AI interviewer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize AI interviewer'
    });
  }
};

export const startInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const aiInterviewer = activeInterviewers.get(interviewId);

    if (!aiInterviewer) {
      return res.status(404).json({
        success: false,
        error: 'AI interviewer not found for this interview'
      });
    }

    await aiInterviewer.startInterview();

    res.status(200).json({
      success: true,
      message: 'Interview started'
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start interview'
    });
  }
};

export const pauseInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const aiInterviewer = activeInterviewers.get(interviewId);

    if (!aiInterviewer) {
      return res.status(404).json({
        success: false,
        error: 'AI interviewer not found for this interview'
      });
    }

    await aiInterviewer.pauseInterview();

    res.status(200).json({
      success: true,
      message: 'Interview paused'
    });
  } catch (error) {
    console.error('Error pausing interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause interview'
    });
  }
};

export const resumeInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const aiInterviewer = activeInterviewers.get(interviewId);

    if (!aiInterviewer) {
      return res.status(404).json({
        success: false,
        error: 'AI interviewer not found for this interview'
      });
    }

    await aiInterviewer.resumeInterview();

    res.status(200).json({
      success: true,
      message: 'Interview resumed'
    });
  } catch (error) {
    console.error('Error resuming interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume interview'
    });
  }
};

export const endInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const aiInterviewer = activeInterviewers.get(interviewId);

    if (!aiInterviewer) {
      return res.status(404).json({
        success: false,
        error: 'AI interviewer not found for this interview'
      });
    }

    await aiInterviewer.endInterview();
    activeInterviewers.delete(interviewId);

    res.status(200).json({
      success: true,
      message: 'Interview ended'
    });
  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end interview'
    });
  }
};

export const getInterviewStatus = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const aiInterviewer = activeInterviewers.get(interviewId);

    if (!aiInterviewer) {
      return res.status(404).json({
        success: false,
        error: 'AI interviewer not found for this interview'
      });
    }

    // Get interview metrics
    const metrics = await aiInterviewer.getMetrics();
    const status = aiInterviewer.isActive ? 'in-progress' : 'paused';

    res.status(200).json({
      success: true,
      status,
      metrics: {
        questionsAnswered: metrics.currentQuestionIndex,
        totalQuestions: metrics.totalQuestions,
        averageResponseTime: metrics.averageResponseTime,
        technicalScore: metrics.technicalScore,
        communicationScore: metrics.communicationScore,
        timeElapsed: metrics.timeElapsed
      }
    });
  } catch (error) {
    console.error('Error getting interview status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interview status'
    });
  }
}; 