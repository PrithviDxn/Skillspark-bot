import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class SchedulingService {
  constructor() {
    this.interviews = new Map(); // Store interviews by ID
    this.candidates = new Map(); // Store candidate information
  }

  async scheduleInterview(candidateInfo, domain, preferredTimeSlots) {
    try {
      const interviewId = uuidv4();
      
      // Generate interview questions based on domain and candidate info
      const questions = await this.generateQuestions(domain, candidateInfo);
      
      const interview = {
        id: interviewId,
        candidateInfo,
        domain,
        status: 'scheduled',
        scheduledTime: this.findOptimalTimeSlot(preferredTimeSlots),
        questions,
        duration: 45, // Default duration in minutes
        roomSid: null,
        adminId: null,
        customInstructions: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.interviews.set(interviewId, interview);
      this.candidates.set(candidateInfo.email, {
        ...candidateInfo,
        interviewHistory: []
      });

      return interview;
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw error;
    }
  }

  async generateQuestions(domain, candidateInfo) {
    try {
      const prompt = `Generate 5 technical interview questions for a ${domain} position.
      
      Candidate Information:
      ${JSON.stringify(candidateInfo, null, 2)}
      
      Requirements:
      1. Questions should be tailored to the candidate's experience level
      2. Include a mix of theoretical and practical questions
      3. Cover key areas of ${domain}
      4. Include at least one system design question
      5. Include at least one problem-solving question
      
      Format the response as a JSON object:
      {
        "questions": [
          {
            "question": string,
            "type": "theoretical" | "practical" | "system-design" | "problem-solving",
            "difficulty": "easy" | "medium" | "hard",
            "expectedAnswer": string,
            "evaluationCriteria": string[]
          }
        ]
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer creating tailored interview questions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content).questions;
    } catch (error) {
      console.error('Error generating questions:', error);
      throw error;
    }
  }

  findOptimalTimeSlot(preferredTimeSlots) {
    // Sort time slots by preference and availability
    const sortedSlots = preferredTimeSlots.sort((a, b) => {
      // First sort by preference
      if (a.preference !== b.preference) {
        return a.preference - b.preference;
      }
      // Then sort by time
      return new Date(a.time) - new Date(b.time);
    });

    // Find the first available slot
    for (const slot of sortedSlots) {
      if (this.isTimeSlotAvailable(slot.time)) {
        return slot.time;
      }
    }

    // If no preferred slots are available, find the next available slot
    return this.findNextAvailableSlot();
  }

  isTimeSlotAvailable(time) {
    const interviewTime = new Date(time);
    const now = new Date();

    // Check if the time is in the future
    if (interviewTime <= now) {
      return false;
    }

    // Check if there's any overlap with existing interviews
    for (const interview of this.interviews.values()) {
      if (interview.status === 'scheduled') {
        const existingTime = new Date(interview.scheduledTime);
        const timeDiff = Math.abs(interviewTime - existingTime);
        if (timeDiff < interview.duration * 60 * 1000) {
          return false;
        }
      }
    }

    return true;
  }

  findNextAvailableSlot() {
    const now = new Date();
    let candidateTime = new Date(now);
    
    // Look for the next available slot in the next 7 days
    for (let i = 0; i < 7; i++) {
      for (let hour = 9; hour < 17; hour++) {
        candidateTime.setHours(hour, 0, 0, 0);
        if (this.isTimeSlotAvailable(candidateTime)) {
          return candidateTime;
        }
      }
      candidateTime.setDate(candidateTime.getDate() + 1);
    }

    throw new Error('No available time slots found in the next 7 days');
  }

  async updateInterviewStatus(interviewId, status, adminId = null) {
    const interview = this.interviews.get(interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    interview.status = status;
    interview.updatedAt = new Date();
    
    if (adminId) {
      interview.adminId = adminId;
    }

    this.interviews.set(interviewId, interview);
    return interview;
  }

  async rescheduleInterview(interviewId, newTimeSlot) {
    const interview = this.interviews.get(interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    if (!this.isTimeSlotAvailable(newTimeSlot)) {
      throw new Error('Time slot is not available');
    }

    interview.scheduledTime = newTimeSlot;
    interview.updatedAt = new Date();

    this.interviews.set(interviewId, interview);
    return interview;
  }

  async cancelInterview(interviewId) {
    const interview = this.interviews.get(interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    interview.status = 'cancelled';
    interview.updatedAt = new Date();

    this.interviews.set(interviewId, interview);
    return interview;
  }

  getInterview(interviewId) {
    return this.interviews.get(interviewId);
  }

  getCandidateInterviews(candidateEmail) {
    const candidate = this.candidates.get(candidateEmail);
    if (!candidate) {
      return [];
    }

    return Array.from(this.interviews.values())
      .filter(interview => interview.candidateInfo.email === candidateEmail)
      .sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
  }

  getUpcomingInterviews() {
    const now = new Date();
    return Array.from(this.interviews.values())
      .filter(interview => 
        interview.status === 'scheduled' && 
        new Date(interview.scheduledTime) > now
      )
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  }
}

export default new SchedulingService(); 