import axios from 'axios';
import { transcribeAudioFile } from '../services/transcriptionService.js';
import Interview from '../models/Interview.js';
import fs from 'fs';

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

    // Transcribe the audio
    const transcript = await transcribeAudioFile(tempFilePath);

    // Update the interview with the transcript
    await Interview.findOneAndUpdate(
      { twilioRoomSid: RoomSid },
      { $set: { transcript } }
    );

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    res.status(200).send('Recording processed successfully');
  } catch (err) {
    console.error('Error in Twilio recording webhook:', err);
    res.status(500).send('Error processing recording');
  }
}; 