import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Transcribe audio file using Faster-Whisper (Python)
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
export function transcribeAudio(audioFilePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', 'transcribe_faster_whisper.py');
    console.log('Using Python script at:', scriptPath);
    console.log('Using audio file at:', audioFilePath);
    
    execFile('/opt/render/project/src/venv/bin/python', [scriptPath, audioFilePath], (error, stdout, stderr) => {
      if (error) {
        console.error('Faster-Whisper error:', error, stderr);
        return reject(stderr || error.message);
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) {
          return reject(result.error || 'Transcription failed');
        }
        resolve(result);
      } catch (parseError) {
        console.error('Error parsing transcription result:', parseError);
        reject('Invalid transcription result format');
      }
    });
  });
} 