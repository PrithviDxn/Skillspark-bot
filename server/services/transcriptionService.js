import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep track of ongoing transcriptions to prevent duplicates
const activeTranscriptions = new Map();

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
      
      // Get the absolute path to the Python script
      const scriptPath = path.join(__dirname, '..', 'transcribe_faster_whisper.py');
      console.log('Script path:', scriptPath);
      console.log('Audio file path:', audioFilePath);

      // Get the path to the virtual environment's Python
      const venvPython = process.platform === 'win32' 
        ? path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe')
        : path.join(__dirname, '..', 'venv', 'bin', 'python');

      // Run the Python script using the virtual environment's Python
      const pythonProcess = spawn(venvPython, [
        scriptPath,
        audioFilePath
      ]);

      let transcription = '';
      let segments = [];
      let errorOutput = '';
      let hasOutput = false;
      let lastProgressTime = Date.now();

      // Set a timeout for the transcription process
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        const error = 'Transcription timed out after 5 minutes';
        console.error(error);
        activeTranscriptions.delete(roomSid);
        reject({
          success: false,
          error: error
        });
      }, 5 * 60 * 1000); // 5 minutes timeout

      pythonProcess.stdout.on('data', (data) => {
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

      pythonProcess.stderr.on('data', (data) => {
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
          pythonProcess.kill();
          activeTranscriptions.delete(roomSid);
          reject({
            success: false,
            error: 'Transcription process hung for 30 seconds'
          });
        }
      }, 5000); // Check every 5 seconds

      pythonProcess.on('close', (code) => {
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

      pythonProcess.on('error', (error) => {
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