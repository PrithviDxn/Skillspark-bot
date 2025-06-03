import 'dotenv/config';
import { transcribeAudio } from './services/transcriptionService.js';

async function testTranscription() {
  try {
    console.log('Testing transcription service...');
    console.log('OpenAI API Key configured:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');
    
    // Replace this with a path to a test audio file
    const testAudioPath = './test-audio.wav';
    
    console.log('Starting transcription...');
    const transcript = await transcribeAudio(testAudioPath);
    console.log('Transcription result:', transcript);
  } catch (error) {
    console.error('Error testing transcription:', error);
  }
}

testTranscription(); 