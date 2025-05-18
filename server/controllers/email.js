import ErrorResponse from '../utils/errorResponse.js';
import { sendInterviewInvitation } from '../services/emailService.js';
import Interview from '../models/Interview.js';
import Candidate from '../models/Candidate.js';
import Role from '../models/Role.js';
import TechStack from '../models/TechStack.js';
import User from '../models/User.js';

/**
 * Send interview invitation email to candidate
 * @route POST /api/v1/email/send-invitation/:id
 * @access Private
 */
const sendInterviewInvitationEmail = async (req, res, next) => {
  try {
    console.log('Sending interview invitation email...');
    const interviewId = req.params.id;
    console.log('Interview ID:', interviewId);
    
    // Find the interview
    console.log('Finding interview in database...');
    const interview = await Interview.findById(interviewId)
      .populate('candidate')
      .populate('role')
      .populate('techStack')
      .populate('techStacks');
    
    console.log('Interview found:', interview ? 'Yes' : 'No');
    
    if (!interview) {
      return next(new ErrorResponse(`Interview not found with id of ${interviewId}`, 404));
    }
    
    // Get candidate email
    const candidateEmail = interview.candidate.email || interview.candidate;
    
    // Get candidate name (if available)
    let candidateName = '';
    if (typeof interview.candidate === 'object' && interview.candidate.name) {
      candidateName = interview.candidate.name;
    } else if (typeof candidateEmail === 'string') {
      // Extract name from email (before @)
      candidateName = candidateEmail.split('@')[0];
    }
    
    // Get role name
    let roleName = 'the position';
    if (interview.role) {
      if (typeof interview.role === 'object' && interview.role.name) {
        roleName = interview.role.name;
      } else if (typeof interview.role === 'string') {
        // Try to fetch role name
        try {
          const role = await Role.findById(interview.role);
          if (role) {
            roleName = role.name;
          }
        } catch (err) {
          console.error('Error fetching role:', err);
        }
      }
    }
    
    // Get tech stacks
    let techStackNames = [];
    
    // Check for multiple tech stacks first
    if (interview.techStacks && Array.isArray(interview.techStacks) && interview.techStacks.length > 0) {
      techStackNames = interview.techStacks.map(stack => {
        if (typeof stack === 'object' && stack.name) {
          return stack.name;
        }
        return '';
      }).filter(name => name !== '');
    } 
    // Fallback to single tech stack
    else if (interview.techStack) {
      if (typeof interview.techStack === 'object' && interview.techStack.name) {
        techStackNames.push(interview.techStack.name);
      } else if (typeof interview.techStack === 'string') {
        // Try to fetch tech stack name
        try {
          const stack = await TechStack.findById(interview.techStack);
          if (stack) {
            techStackNames.push(stack.name);
          }
        } catch (err) {
          console.error('Error fetching tech stack:', err);
        }
      }
    }
    
    // Format date and time
    const interviewDate = new Date(interview.scheduledDate);
    const formattedDate = interviewDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = interview.scheduledTime;
    
    // Generate interview link with token
    // This link will only work during the scheduled time window
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const interviewLink = `${baseUrl}/interview/${interviewId}?token=${interview._id}`;
    
    // Send email
    const emailResult = await sendInterviewInvitation({
      to: candidateEmail,
      candidateName,
      companyName: req.user ? req.user.company || 'SkillSpark' : 'SkillSpark',
      role: roleName,
      date: formattedDate,
      time: formattedTime,
      duration: interview.duration || 60,
      interviewLink,
      interviewId: interview._id.toString()
    });
    
    res.status(200).json({
      success: true,
      data: emailResult
    });
  } catch (error) {
    console.error('Error sending interview invitation:', error);
    next(error);
  }
};

/**
 * Verify if an interview token is valid for joining
 * @route GET /api/v1/email/verify-token/:id
 * @access Public
 */
const verifyInterviewToken = async (req, res, next) => {
  try {
    const interviewId = req.params.id;
    const { token } = req.query;
    
    // Find the interview
    const interview = await Interview.findById(interviewId);
    
    if (!interview) {
      return next(new ErrorResponse(`Interview not found with id of ${interviewId}`, 404));
    }
    
    // Verify token matches interview id
    if (token !== interview._id.toString()) {
      return next(new ErrorResponse('Invalid interview token', 401));
    }
    
    // Check if interview is scheduled for now or within the next 10 minutes
    const now = new Date();
    const scheduledDateTime = new Date(`${interview.scheduledDate}T${interview.scheduledTime}`);
    
    // Calculate time window (scheduled time to scheduled time + 10 minutes)
    const timeWindowEnd = new Date(scheduledDateTime);
    timeWindowEnd.setMinutes(timeWindowEnd.getMinutes() + 10);
    
    // Calculate a buffer time (5 minutes before scheduled time)
    const bufferTime = new Date(scheduledDateTime);
    bufferTime.setMinutes(bufferTime.getMinutes() - 5);
    
    // Check if current time is within the allowed window (between scheduled time and end time)
    // Strictly enforce that candidates cannot join before the scheduled time
    const isWithinTimeWindow = now >= scheduledDateTime && now <= timeWindowEnd;
    
    // Check if candidate is trying to join too early
    const isTooEarly = now < scheduledDateTime;
    
    if (!isWithinTimeWindow) {
      let message = 'Interview is not currently active';
      let statusCode = 403;
      
      if (isTooEarly) {
        // Calculate minutes until interview starts
        const minutesUntilStart = Math.ceil((scheduledDateTime.getTime() - now.getTime()) / (1000 * 60));
        message = `Interview has not started yet. Please join at the scheduled time in ${minutesUntilStart} minute(s).`;
        statusCode = 403; // Forbidden - not allowed to join yet
      } else if (now > timeWindowEnd) {
        message = 'Interview time window has expired. The link is only valid for 10 minutes after the scheduled start time. Please contact the recruiter.';
        statusCode = 410; // Gone - resource no longer available
      }
      
      return res.status(statusCode).json({
        success: false,
        message,
        scheduledTime: scheduledDateTime,
        currentTime: now,
        timeWindowEnd,
        isTooEarly,
        isExpired: now > timeWindowEnd
      });
    }
    
    // If we reach here, the token is valid and the time is right
    res.status(200).json({
      success: true,
      message: 'Interview token is valid',
      interview: {
        id: interview._id,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime,
        duration: interview.duration
      }
    });
  } catch (error) {
    console.error('Error verifying interview token:', error);
    next(error);
  }
};

export {
  sendInterviewInvitationEmail as sendInterviewInvitation,
  verifyInterviewToken
};
