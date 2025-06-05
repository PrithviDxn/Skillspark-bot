import express from 'express';
import interviewReportService from '../services/interviewReportService.js';

const router = express.Router();

// Create a new interview report
router.post('/', async (req, res) => {
  try {
    const { interviewId, candidateInfo, domain } = req.body;
    const report = await interviewReportService.createReport(interviewId, candidateInfo, domain);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a question response to the report
router.post('/:interviewId/responses', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { question, response } = req.body;
    const report = await interviewReportService.addQuestionResponse(interviewId, question, response);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate the final interview summary
router.post('/:interviewId/summary', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const report = await interviewReportService.generateSummary(interviewId);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific interview report
router.get('/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const report = interviewReportService.getReport(interviewId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all interview reports
router.get('/', async (req, res) => {
  try {
    const reports = interviewReportService.getAllReports();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 