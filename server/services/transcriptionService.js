import { execFile } from 'child_process';
import path from 'path';

/**
 * Transcribe audio file using Faster-Whisper (Python)
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
export function transcribeAudio(audioFilePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve('transcribe_faster_whisper.py');
    execFile('/opt/render/project/src/venv/bin/python', [scriptPath, audioFilePath], (error, stdout, stderr) => {
      if (error) {
        console.error('Faster-Whisper error:', error, stderr);
        return reject(stderr || error.message);
      }
      resolve(stdout.trim());
    });
  });
} 