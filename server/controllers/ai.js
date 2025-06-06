import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export const transcribeAudio = async (req, res) => {
  try {
    const { audioPath } = req.body;
    if (!audioPath) {
      return res.status(400).json({ error: 'Audio path is required' });
    }

    // Use faster-whisper for transcription
    const command = `faster-whisper --model large-v2 --language en "${audioPath}"`;
    const { stdout } = await execAsync(command);
    
    // Extract the transcribed text from the output
    const transcription = stdout.trim();
    
    res.json({ text: transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
};