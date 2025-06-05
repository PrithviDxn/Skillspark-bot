import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

const InterviewScheduler = () => {
  const [interviews, setInterviews] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: '',
    domain: '',
    experienceLevel: '',
    preferredTimeSlots: [],
  });
  const [newTimeSlot, setNewTimeSlot] = useState(null);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await axios.get('/api/scheduling/upcoming');
      setInterviews(response.data);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    }
  };

  const handleOpenDialog = (interview = null) => {
    if (interview) {
      setSelectedInterview(interview);
      setFormData({
        candidateName: interview.candidateInfo.name,
        candidateEmail: interview.candidateInfo.email,
        domain: interview.domain,
        experienceLevel: interview.candidateInfo.experienceLevel,
        preferredTimeSlots: interview.preferredTimeSlots,
      });
    } else {
      setSelectedInterview(null);
      setFormData({
        candidateName: '',
        candidateEmail: '',
        domain: '',
        experienceLevel: '',
        preferredTimeSlots: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedInterview(null);
    setFormData({
      candidateName: '',
      candidateEmail: '',
      domain: '',
      experienceLevel: '',
      preferredTimeSlots: [],
    });
  };

  const handleAddTimeSlot = () => {
    if (newTimeSlot) {
      setFormData({
        ...formData,
        preferredTimeSlots: [...formData.preferredTimeSlots, newTimeSlot],
      });
      setNewTimeSlot(null);
    }
  };

  const handleRemoveTimeSlot = (index) => {
    const updatedTimeSlots = formData.preferredTimeSlots.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      preferredTimeSlots: updatedTimeSlots,
    });
  };

  const handleSubmit = async () => {
    try {
      const candidateInfo = {
        name: formData.candidateName,
        email: formData.candidateEmail,
        experienceLevel: formData.experienceLevel,
      };

      if (selectedInterview) {
        await axios.patch(`/api/scheduling/${selectedInterview.id}`, {
          candidateInfo,
          domain: formData.domain,
          preferredTimeSlots: formData.preferredTimeSlots,
        });
      } else {
        await axios.post('/api/scheduling', {
          candidateInfo,
          domain: formData.domain,
          preferredTimeSlots: formData.preferredTimeSlots,
        });
      }

      handleCloseDialog();
      fetchInterviews();
    } catch (error) {
      console.error('Error saving interview:', error);
    }
  };

  const handleCancelInterview = async (interviewId) => {
    try {
      await axios.delete(`/api/scheduling/${interviewId}`);
      fetchInterviews();
    } catch (error) {
      console.error('Error canceling interview:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Interview Scheduler</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
        >
          Schedule New Interview
        </Button>
      </Box>

      <Grid container spacing={3}>
        {interviews.map((interview) => (
          <Grid item xs={12} md={6} key={interview.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">{interview.candidateInfo.name}</Typography>
                  <Box>
                    <IconButton
                      onClick={() => handleOpenDialog(interview)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleCancelInterview(interview.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary">
                  {interview.candidateInfo.email}
                </Typography>
                <Typography>Domain: {interview.domain}</Typography>
                <Typography>
                  Experience: {interview.candidateInfo.experienceLevel}
                </Typography>
                <Typography>
                  Status: {interview.status}
                </Typography>
                <Typography>
                  Scheduled: {new Date(interview.scheduledTime).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedInterview ? 'Edit Interview' : 'Schedule New Interview'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Candidate Name"
                value={formData.candidateName}
                onChange={(e) =>
                  setFormData({ ...formData, candidateName: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Candidate Email"
                value={formData.candidateEmail}
                onChange={(e) =>
                  setFormData({ ...formData, candidateEmail: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Domain"
                value={formData.domain}
                onChange={(e) =>
                  setFormData({ ...formData, domain: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Experience Level</InputLabel>
                <Select
                  value={formData.experienceLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, experienceLevel: e.target.value })
                  }
                >
                  <MenuItem value="entry">Entry Level</MenuItem>
                  <MenuItem value="mid">Mid Level</MenuItem>
                  <MenuItem value="senior">Senior Level</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Preferred Time Slots
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="New Time Slot"
                    value={newTimeSlot}
                    onChange={setNewTimeSlot}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </LocalizationProvider>
                <Button
                  variant="contained"
                  onClick={handleAddTimeSlot}
                  disabled={!newTimeSlot}
                >
                  Add Time Slot
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.preferredTimeSlots.map((slot, index) => (
                  <Chip
                    key={index}
                    label={new Date(slot).toLocaleString()}
                    onDelete={() => handleRemoveTimeSlot(index)}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedInterview ? 'Update' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InterviewScheduler; 