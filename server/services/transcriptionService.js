import { exec } from 'child_process';
import path from 'path';

export const transcribeAudioFile = (filePath) => {
  return new Promise((resolve, reject) => {
    // Get the absolute path to the server directory
    const serverDir = path.resolve(process.cwd());
    
    // Construct the command to activate the virtual environment and run the script
    // Using . instead of source for sh compatibility, and using the full path to python
    const command = `cd "${serverDir}" && . venv/bin/activate && "${path.join(serverDir, 'venv/bin/python')}" "${path.join(serverDir, 'whisper_simple_notepad.py')}" --file "${filePath}"`;
    
    exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      if (error) {
        console.error('Transcription error:', error);
        console.error('stderr:', stderr);
        return reject(stderr || error.message);
      }
      resolve(stdout.trim());
    });
  });
}; 