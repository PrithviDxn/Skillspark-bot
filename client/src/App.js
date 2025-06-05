import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import InterviewScheduler from './components/InterviewScheduler';
import VideoCall from './components/VideoCall';

function App() {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SkillSpark AI Interviewer
          </Typography>
          <Button color="inherit" component={Link} to="/">
            Interviews
          </Button>
          <Button color="inherit" component={Link} to="/video">
            Video Call
          </Button>
        </Toolbar>
      </AppBar>

      <Container>
        <Routes>
          <Route path="/" element={<InterviewScheduler />} />
          <Route path="/video" element={<VideoCall />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App; 