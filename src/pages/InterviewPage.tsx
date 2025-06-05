import React, { useState } from 'react';
import { Box, Container, Tabs, Tab, Paper } from '@mui/material';
import VideoInterview from '../components/VideoInterview';
import InterviewReport from '../components/InterviewReport';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`interview-tabpanel-${index}`}
      aria-labelledby={`interview-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const InterviewPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [interviewComplete, setInterviewComplete] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleInterviewComplete = (report: any) => {
    setInterviewId(report.interviewId);
    setInterviewComplete(true);
    setCurrentTab(1); // Switch to report tab
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ mt: 4, mb: 4 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="interview tabs"
          centered
        >
          <Tab label="Interview" />
          <Tab 
            label="Report" 
            disabled={!interviewComplete}
          />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <VideoInterview onInterviewComplete={handleInterviewComplete} />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {interviewId && <InterviewReport interviewId={interviewId} />}
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default InterviewPage; 