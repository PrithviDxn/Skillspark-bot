import { parentPort } from 'worker_threads';
import { transcribeAudioFile } from '../services/transcriptionService.js';
import Interview from '../models/Interview.js';
import fs from 'fs';

parentPort.on('message', async (data) => {
  const { tempFilePath, RoomSid } = data;
  try {
    console.log('Starting transcription in worker for RoomSid:', RoomSid);
    const transcript = await transcribeAudioFile(tempFilePath);
    console.log('Transcript generated in worker:', transcript && transcript.slice ? transcript.slice(0, 200) : transcript);
    
    const updatedInterview = await Interview.findOneAndUpdate(
      { twilioRoomSid: RoomSid },
      { $set: { transcript } },
      { new: true }
    );
    console.log('Updated interview after saving transcript:', updatedInterview ? updatedInterview._id : 'NOT FOUND');
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFilePath);
      console.log('Temporary file cleaned up:', tempFilePath);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
    }
    
    parentPort.postMessage({ success: true, transcript });
  } catch (error) {
    console.error('Error in transcription worker:', error);
    parentPort.postMessage({ success: false, error: error.message });
  }
}); 