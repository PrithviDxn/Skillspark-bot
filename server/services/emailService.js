import { Resend } from 'resend';

// Initialize Resend with API key (if available)
let resend;
try {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set in environment variables. Email functionality will be limited.');
    // Create a mock resend instance for development
    resend = {
      emails: {
        send: async (options) => {
          console.log('MOCK EMAIL SENT:', options);
          return { id: 'mock-email-id', message: 'Mock email sent successfully' };
        }
      }
    };
  } else {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('Resend initialized with API key');
  }
} catch (error) {
  console.error('Error initializing Resend:', error);
  // Fallback to mock implementation
  resend = {
    emails: {
      send: async (options) => {
        console.log('FALLBACK MOCK EMAIL SENT:', options);
        return { id: 'mock-email-id', message: 'Mock email sent successfully' };
      }
    }
  };
}

/**
 * Send an interview invitation email to a candidate
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.candidateName - Candidate's name
 * @param {string} options.companyName - Company name
 * @param {string} options.role - Job role
 * @param {string} options.date - Formatted interview date
 * @param {string} options.time - Formatted interview time
 * @param {number} options.duration - Interview duration in minutes
 * @param {string} options.interviewLink - Link to join the interview
 * @param {string} options.interviewId - Interview ID for video call
 * @returns {Promise<Object>} - Response from email service
 */
const sendInterviewInvitation = async (options) => {
  console.log('Email service: sendInterviewInvitation called with options:', JSON.stringify(options, null, 2));
  
  const {
    to,
    candidateName,
    companyName,
    role,
    date,
    time,
    duration,
    interviewLink,
    interviewId
  } = options;

  if (!interviewId) {
    throw new Error('interviewId is required for sending interview invitation');
  }

  try {
    // Use Resend's default domain for sending
    const fromEmail = 'onboarding@resend.dev';
    // Use the RESEND_DOMAIN value as the reply-to address
    const replyToEmail = process.env.RESEND_DOMAIN || 'noreply@skillspark.ai';
    console.log('Using from email:', fromEmail);
    console.log('Using reply-to email:', replyToEmail);
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const interviewLink = `${baseUrl}/video/${interviewId}`;
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: [to],
      reply_to: replyToEmail,
      subject: `Interview Invitation: ${role} Position at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">Interview Invitation</h1>
          </div>
          
          <p>Hello ${candidateName || 'Candidate'},</p>
          
          <p>You have been invited to an interview for the <strong>${role}</strong> position at <strong>${companyName}</strong>.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4f46e5;">Interview Details</h3>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${interviewLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Interview</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #6b7280;">
            <p><strong>Important Notes:</strong></p>
            <ul>
              <li>The interview link will only be active at the scheduled time.</li>
              <li>You can join the interview up to 30 minutes after the scheduled start time.</li>
              <li>Please ensure you have a stable internet connection and a quiet environment.</li>
              <li>Have your camera and microphone ready for the interview.</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">Good luck!</p>
          <p>The ${companyName} Hiring Team</p>
        </div>
      `,
      interviewLink: interviewLink,
      videoCallUrl: `${baseUrl}/video/${interviewId}`
    });
    
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

export {
  sendInterviewInvitation
};
