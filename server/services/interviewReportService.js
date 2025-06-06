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

  async addQuestionResponse(interviewId, question, answer) {
    const report = this.reports.get(interviewId);
    if (!report) {
      throw new Error('Interview report not found');
    }
    report.questions.push({
      question,
      answer, // { audio, text }
      timestamp: new Date()
    });
    return report;
  }

  getReport(interviewId) {
    return this.reports.get(interviewId);
  }

  getAllReports() {
    return Array.from(this.reports.values());
  }
}

export default new InterviewReportService(); 