import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

interface QuestionResponse {
  question: string;
  response: string;
  analysis: string;
  timestamp: Date;
}

interface InterviewReport {
  interviewId: string;
  candidateInfo: {
    name: string;
    email: string;
  };
  domain: string;
  timestamp: Date;
  questions: QuestionResponse[];
  summary: string;
}

interface InterviewReportProps {
  interviewId: string;
}

const InterviewReport: React.FC<InterviewReportProps> = ({ interviewId }) => {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/interview-reports/${interviewId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch interview report');
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [interviewId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!report) {
    return (
      <Box p={3}>
        <Typography>No report found for this interview.</Typography>
      </Box>
    );
  }

  const renderSummary = () => {
    const sections = report.summary.split('\n\n');
    return sections.map((section, index) => (
      <Box key={index} mb={2}>
        <Typography variant="h6" gutterBottom>
          {section.split('\n')[0]}
        </Typography>
        <Typography variant="body1">
          {section.split('\n').slice(1).join('\n')}
        </Typography>
      </Box>
    ));
  };

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Interview Report
        </Typography>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" color="textSecondary">
              Candidate
            </Typography>
            <Typography variant="body1">{report.candidateInfo.name}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" color="textSecondary">
              Domain
            </Typography>
            <Chip label={report.domain} color="primary" />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" color="textSecondary">
              Date
            </Typography>
            <Typography variant="body1">
              {new Date(report.timestamp).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>

        <Typography variant="h5" gutterBottom>
          Summary
        </Typography>
        {renderSummary()}

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Question & Answer Analysis
        </Typography>
        {report.questions.map((qa, index) => (
          <Accordion key={index} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" width="100%">
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  Q{index + 1}: {qa.question}
                </Typography>
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Good"
                  color="success"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  icon={<WarningIcon />}
                  label="Needs Improvement"
                  color="warning"
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Response:
                </Typography>
                <Typography variant="body1" paragraph>
                  {qa.response}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Analysis:
                </Typography>
                <Typography variant="body1">
                  {qa.analysis}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );
};

export default InterviewReport; 