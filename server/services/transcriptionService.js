import { exec } from 'child_process';
import path from 'path';

export const transcribeAudioFile = (filePath) => {
  return new Promise((resolve, reject) => {
    // Get the absolute path to the server directory
    const serverDir = path.resolve(process.cwd());
    
    // Use the absolute path to the Python executable in the virtual environment
    const pythonPath = '/opt/render/project/src/venv/bin/python';
    const scriptPath = path.join(serverDir, 'server', 'whisper_simple_notepad.py');
    
    // Construct the command to run the Python script
    const command = `"${pythonPath}" "${scriptPath}" --file "${filePath}"`;
    
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