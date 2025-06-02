import axios from 'axios';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Interview from '../models/Interview.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handleTwilioRecordingWebhook = async (req, res) => {
  try {
    console.log('Twilio webhook req.body:', req.body);
    const { MediaUri, RoomSid, StatusCallbackEvent, Type } = req.body;

    // Only process completed recording events
    if (StatusCallbackEvent !== 'recording-completed') {
      return res.status(200).send('Not a completed recording event');
    }

    // Only process audio recordings
    if (Type !== 'audio') {
      return res.status(200).send('Not an audio recording');
    }

    // Check if MediaUri exists
    if (!MediaUri) {
      console.error('No MediaUri in Twilio webhook payload:', req.body);
      return res.status(400).send('Missing MediaUri');
    }

    // Construct the full Twilio API URL
    const audioUrl = `https://video.twilio.com${MediaUri}`;
    console.log('Fetching audio from:', audioUrl);

    // Download the audio file
    const audioResponse = await axios.get(audioUrl, { 
      responseType: 'arraybuffer',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      }
    });

    const audioBuffer = Buffer.from(audioResponse.data, 'binary');
    const tempFilePath = `/tmp/${RoomSid}.wav`;
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Log the RoomSid and check if the Interview exists
    console.log('RoomSid from webhook:', RoomSid);
    const interview = await Interview.findOne({ twilioRoomSid: RoomSid });
    console.log('Interview found for RoomSid:', interview ? interview._id : 'NOT FOUND');

    if (!interview) {
      console.error('No interview found for RoomSid:', RoomSid);
      return res.status(404).send('Interview not found');
    }

    // Start transcription in a worker thread
    const worker = new Worker(path.join(__dirname, '../workers/transcriptionWorker.js'));
    worker.postMessage({ tempFilePath, RoomSid });

    worker.on('message', async (result) => {
      if (result.success) {
        console.log('Transcription completed successfully for RoomSid:', RoomSid);
        console.log('Transcript:', result.transcript);
        
        // Update the interview with the transcript
        const updatedInterview = await Interview.findOneAndUpdate(
          { twilioRoomSid: RoomSid },
          { $set: { transcript: result.transcript } },
          { new: true }
        );
        console.log('Updated interview after saving transcript:', updatedInterview ? updatedInterview._id : 'NOT FOUND');
      } else {
        console.error('Transcription failed for RoomSid:', RoomSid, 'Error:', result.error);
      }
      worker.terminate();
    });

    worker.on('error', (error) => {
      console.error('Worker error for RoomSid:', RoomSid, error);
      worker.terminate();
    });

    // Respond immediately
    res.status(200).send('Recording processing started');
  } catch (err) {
    console.error('Error in Twilio recording webhook:', err);
    res.status(500).send('Error processing recording');
  }
}; 