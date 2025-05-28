import axios from 'axios';
import { transcribeAudioFile } from '../services/transcriptionService.js';
import Interview from '../models/Interview.js';
import fs from 'fs';

export const handleTwilioRecordingWebhook = async (req, res) => {
  try {
    const { RecordingUrl, RoomSid, StatusCallbackEvent } = req.body;
    if (StatusCallbackEvent !== 'recording-completed') {
      return res.status(200).send('Not a completed recording event');
    }
    const audioUrl = `${RecordingUrl}.wav`;
    const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    const audioBuffer = Buffer.from(audioResponse.data, 'binary');
    const tempFilePath = `/tmp/${RoomSid}.wav`;
    fs.writeFileSync(tempFilePath, audioBuffer);
    const transcript = await transcribeAudioFile(tempFilePath);
    await Interview.findOneAndUpdate(
      { twilioRoomSid: RoomSid },
      { $set: { transcript } }
    );
    res.status(200).send('Recording processed');
  } catch (err) {
    console.error('Error in Twilio recording webhook:', err);
    res.status(500).send('Error processing recording');
  }
}; 