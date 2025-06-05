import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

interface AdminControlsProps {
  onStartInterview: (domain: string, customInstructions: string) => void;
  onPauseInterview: () => void;
  onResumeInterview: () => void;
  onEndInterview: () => void;
  isInterviewActive: boolean;
  isPaused: boolean;
}

const AdminControls: React.FC<AdminControlsProps> = ({
  onStartInterview,
  onPauseInterview,
  onResumeInterview,
  onEndInterview,
  isInterviewActive,
  isPaused,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  const handleStartInterview = () => {
    onStartInterview(domain, customInstructions);
    setSettingsOpen(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Admin Controls</Typography>
        <Tooltip title="Interview Settings">
          <IconButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box display="flex" gap={2} mt={2}>
        {!isInterviewActive ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayIcon />}
            onClick={() => setSettingsOpen(true)}
          >
            Start Interview
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayIcon />}
                onClick={onResumeInterview}
              >
                Resume
              </Button>
            ) : (
              <Button
                variant="contained"
                color="warning"
                startIcon={<PauseIcon />}
                onClick={onPauseInterview}
              >
                Pause
              </Button>
            )}
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={onEndInterview}
            >
              End Interview
            </Button>
          </>
        )}
      </Box>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Interview Settings</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Domain</InputLabel>
              <Select
                value={domain}
                label="Domain"
                onChange={(e) => setDomain(e.target.value)}
              >
                <MenuItem value="frontend">Frontend Development</MenuItem>
                <MenuItem value="backend">Backend Development</MenuItem>
                <MenuItem value="fullstack">Full Stack Development</MenuItem>
                <MenuItem value="mobile">Mobile Development</MenuItem>
                <MenuItem value="devops">DevOps</MenuItem>
                <MenuItem value="data-science">Data Science</MenuItem>
                <MenuItem value="machine-learning">Machine Learning</MenuItem>
                <MenuItem value="ai">Artificial Intelligence</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Custom Instructions"
              multiline
              rows={4}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Enter any specific instructions or focus areas for the interview..."
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStartInterview}
            variant="contained"
            color="primary"
            disabled={!domain}
          >
            Start Interview
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AdminControls; 