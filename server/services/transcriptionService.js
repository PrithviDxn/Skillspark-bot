import { exec } from 'child_process';

export const transcribeAudioFile = (filePath) => {
  return new Promise((resolve, reject) => {
    exec(`python whisper_simple_notepad.py --file "${filePath}"`, (error, stdout, stderr) => {
      if (error) return reject(stderr || error.message);
      resolve(stdout.trim());
    });
  });
}; 