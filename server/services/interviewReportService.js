import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class InterviewReportService {
  constructor() {
    this.reports = new Map(); // Store reports by interview ID
  }

  async createReport(interviewId, candidateInfo, domain) {
    const report = {
      interviewId,
      candidateInfo,
      domain,
      timestamp: new Date(),
      questions: [],
      summary: null,
      evaluation: null
    };

    this.reports.set(interviewId, report);
    return report;
  }

  async addQuestionResponse(interviewId, question, response) {
    const report = this.reports.get(interviewId);
    if (!report) {
      throw new Error('Interview report not found');
    }

    // Analyze the response using GPT-4
    const analysis = await this.analyzeResponse(question, response, report.domain);
    
    report.questions.push({
      question,
      response,
      analysis,
      timestamp: new Date()
    });

    return report;
  }

  async generateSummary(interviewId) {
    const report = this.reports.get(interviewId);
    if (!report) {
      throw new Error('Interview report not found');
    }

    const prompt = `Generate a comprehensive interview summary for a ${report.domain} interview.
    Candidate: ${report.candidateInfo.name}
    
    Questions and Responses:
    ${report.questions.map((q, i) => `
    Q${i + 1}: ${q.question}
    Response: ${q.response}
    Analysis: ${q.analysis}
    `).join('\n')}
    
    Please provide:
    1. Overall performance summary
    2. Key strengths
    3. Areas for improvement
    4. Technical depth assessment
    5. Communication skills evaluation
    6. Final recommendation`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert technical interviewer providing detailed interview analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4-turbo-preview"
    });

    report.summary = completion.choices[0].message.content;
    return report;
  }

  async analyzeResponse(question, response, domain) {
    const prompt = `Analyze the following interview response for a ${domain} position:
    
    Question: ${question}
    Response: ${response}
    
    Please evaluate:
    1. Technical accuracy
    2. Depth of knowledge
    3. Clarity of explanation
    4. Problem-solving approach
    5. Areas for improvement`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert technical interviewer providing detailed response analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4-turbo-preview"
    });

    return completion.choices[0].message.content;
  }

  getReport(interviewId) {
    return this.reports.get(interviewId);
  }

  getAllReports() {
    return Array.from(this.reports.values());
  }
}

export default new InterviewReportService(); 