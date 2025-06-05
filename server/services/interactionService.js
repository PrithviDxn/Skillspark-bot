import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class InteractionService {
  constructor() {
    this.conversationContext = new Map(); // Store conversation context by interview ID
  }

  async generateFollowUpQuestion(interviewId, question, response, analysis, domain) {
    try {
      const context = this.getOrCreateContext(interviewId);
      context.push({ question, response, analysis });

      const prompt = `As an AI interviewer for a ${domain} position, generate a follow-up question based on the candidate's response.
      
      Previous Question: ${question}
      Candidate's Response: ${response}
      Analysis: ${JSON.stringify(analysis)}
      
      Conversation History:
      ${context.map((item, index) => `
      Q${index + 1}: ${item.question}
      Response: ${item.response}
      `).join('\n')}
      
      Generate a follow-up question that:
      1. Probes deeper into the candidate's knowledge
      2. Addresses any gaps or areas for improvement identified in the analysis
      3. Maintains a natural conversation flow
      4. Is specific and relevant to the domain
      
      Format the response as a JSON object:
      {
        "question": string,
        "context": string (explanation of why this follow-up is relevant),
        "expectedAreas": string[] (key areas to evaluate in the response)
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer skilled at asking relevant follow-up questions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      const followUp = JSON.parse(completion.choices[0].message.content);
      return followUp;
    } catch (error) {
      console.error('Error generating follow-up question:', error);
      throw error;
    }
  }

  async generateRealTimeFeedback(analysis) {
    try {
      const prompt = `Generate real-time feedback based on the following response analysis:
      ${JSON.stringify(analysis)}
      
      The feedback should:
      1. Be constructive and encouraging
      2. Highlight specific strengths
      3. Suggest areas for improvement
      4. Be concise and actionable
      
      Format the response as a JSON object:
      {
        "feedback": string,
        "strengthHighlight": string,
        "improvementSuggestion": string,
        "tone": "positive" | "neutral" | "constructive"
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer providing constructive feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error generating real-time feedback:', error);
      throw error;
    }
  }

  async generateClarificationQuestion(interviewId, question, response, analysis) {
    try {
      const prompt = `Generate a clarification question based on the candidate's response.
      
      Original Question: ${question}
      Response: ${response}
      Analysis: ${JSON.stringify(analysis)}
      
      The clarification question should:
      1. Address any ambiguities in the response
      2. Seek specific examples or details
      3. Help better understand the candidate's thought process
      4. Be non-confrontational and encouraging
      
      Format the response as a JSON object:
      {
        "question": string,
        "reason": string (explanation of what needs clarification),
        "tone": "curious" | "clarifying" | "exploratory"
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer skilled at asking clarifying questions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error generating clarification question:', error);
      throw error;
    }
  }

  getOrCreateContext(interviewId) {
    if (!this.conversationContext.has(interviewId)) {
      this.conversationContext.set(interviewId, []);
    }
    return this.conversationContext.get(interviewId);
  }

  clearContext(interviewId) {
    this.conversationContext.delete(interviewId);
  }
}

export default new InteractionService(); 