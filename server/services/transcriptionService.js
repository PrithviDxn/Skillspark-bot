import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Keep track of ongoing transcriptions to prevent duplicates
const activeTranscriptions = new Map();

// Function to get the correct Python executable path
function getPythonPath() {
  const isWindows = process.platform === 'win32';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production (Render), Python is available system-wide
    return 'python3';
  }
  
  // In development, use the virtual environment
  const venvPath = path.join(rootDir, 'venv');
  return isWindows 
    ? path.join(venvPath, 'Scripts', 'python.exe')
    : path.join(venvPath, 'bin', 'python');
}

// Function to get the correct script path
function getScriptPath() {
  return path.join(rootDir, 'transcribe_faster_whisper.py');
}

// Function to ensure required directories exist
function ensureDirectories() {
  const dirs = ['uploads', 'tmp'];
  dirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// Initialize directories
ensureDirectories();

/**
 * Transcribe audio file using faster-whisper
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} roomSid - Twilio Room SID for deduplication
 * @returns {Promise<object>} - Transcription result
 */
export async function transcribeAudio(audioFilePath, roomSid) {
  // Check if transcription is already in progress for this room
  if (activeTranscriptions.has(roomSid)) {
    console.log(`Transcription already in progress for RoomSid: ${roomSid}`);
    return activeTranscriptions.get(roomSid);
  }

  const transcriptionPromise = new Promise((resolve, reject) => {
    try {
      console.log('Starting transcription with faster-whisper...');
      
      const pythonPath = getPythonPath();
      const scriptPath = getScriptPath();
      
      console.log('Using Python path:', pythonPath);
      console.log('Using script path:', scriptPath);
      console.log('Audio file path:', audioFilePath);

      const process = spawn(pythonPath, [scriptPath, audioFilePath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let transcription = '';
      let segments = [];
      let errorOutput = '';
      let hasOutput = false;
      let lastProgressTime = Date.now();

      // Set a timeout for the transcription process
      const timeout = setTimeout(() => {
        process.kill();
        const error = 'Transcription timed out after 5 minutes';
        console.error(error);
        activeTranscriptions.delete(roomSid);
        reject({
          success: false,
          error: error
        });
      }, 5 * 60 * 1000); // 5 minutes timeout

      process.stdout.on('data', (data) => {
        hasOutput = true;
        lastProgressTime = Date.now();
        
        try {
          const result = JSON.parse(data.toString());
          
          // Handle progress messages
          if (result.type === 'progress') {
            console.log(`Transcription progress: ${result.message}`);
            return;
          }
          
          if (result.success) {
            transcription = result.text;
            segments = result.segments;
          } else {
            errorOutput = result.error;
          }
        } catch (e) {
          console.error('Error parsing Python output:', e);
          errorOutput = data.toString();
        }
      });

      process.stderr.on('data', (data) => {
        hasOutput = true;
        lastProgressTime = Date.now();
        console.error('Python error:', data.toString());
        errorOutput += data.toString();
      });

      // Check for process hanging
      const progressCheck = setInterval(() => {
        const timeSinceLastProgress = Date.now() - lastProgressTime;
        if (timeSinceLastProgress > 30000) { // 30 seconds without progress
          console.error('No progress for 30 seconds, killing process');
          clearInterval(progressCheck);
          process.kill();
          activeTranscriptions.delete(roomSid);
          reject({
            success: false,
            error: 'Transcription process hung for 30 seconds'
          });
        }
      }, 5000); // Check every 5 seconds

      process.on('close', (code) => {
        clearTimeout(timeout);
        clearInterval(progressCheck);
        activeTranscriptions.delete(roomSid);

        if (!hasOutput) {
          console.error('No output received from Python process');
          reject({
            success: false,
            error: 'No output received from transcription process'
          });
          return;
        }

        if (code === 0 && transcription) {
          console.log('Transcription completed successfully');
          resolve({
            success: true,
            text: transcription,
            segments: segments,
            language: 'en' // faster-whisper will detect language automatically
          });
        } else {
          console.error('Transcription failed:', errorOutput);
          reject({
            success: false,
            error: errorOutput || 'Transcription failed'
          });
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        clearInterval(progressCheck);
        activeTranscriptions.delete(roomSid);
        console.error('Failed to start Python process:', error);
        reject({
          success: false,
          error: `Failed to start transcription process: ${error.message}`
        });
      });

    } catch (error) {
      activeTranscriptions.delete(roomSid);
      console.error('Transcription error:', error);
      reject({
        success: false,
        error: error.message
      });
    }
  });

  // Store the promise in the active transcriptions map
  activeTranscriptions.set(roomSid, transcriptionPromise);
  return transcriptionPromise;
} 