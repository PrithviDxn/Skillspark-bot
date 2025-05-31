import { exec } from 'child_process';
import path from 'path';

export const transcribeAudioFile = (filePath) => {
  return new Promise((resolve, reject) => {
    // Get the absolute path to the server directory
    const serverDir = path.resolve(process.cwd());
    
    // Construct the command to run the Python script directly with the virtual environment's Python
    const command = `"${path.join(serverDir, 'venv/bin/python')}" "${path.join(serverDir, 'whisper_simple_notepad.py')}" --file "${filePath}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Transcription error:', error);
        console.error('stderr:', stderr);
        return reject(stderr || error.message);
      }
      resolve(stdout.trim());
    });
  });
}; 