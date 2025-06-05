import OpenAI from 'openai';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AudioProcessingService {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir);
    }
  }

  async processAudioStream(audioStream, interviewId) {
    try {
      // Create a unique filename for this audio segment
      const filename = path.join(this.tempDir, `${interviewId}-${uuidv4()}.webm`);
      
      // Write the audio stream to a file
      const writeStream = fs.createWriteStream(filename);
      await new Promise((resolve, reject) => {
        audioStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Convert audio to text using OpenAI's Whisper API
      const transcription = await this.transcribeAudio(filename);

      // Clean up the temporary file
      fs.unlinkSync(filename);

      return transcription;
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }

  async transcribeAudio(audioFilePath) {
    try {
      const audioFile = fs.createReadStream(audioFilePath);
      
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "text"
      });

      return response;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  async analyzeResponse(transcription, question, domain) {
    try {
      const prompt = `Analyze the following interview response for a ${domain} position:
      
      Question: ${question}
      Response: ${transcription}
      
      Please evaluate:
      1. Technical accuracy
      2. Depth of knowledge
      3. Clarity of explanation
      4. Problem-solving approach
      5. Areas for improvement
      
      Format the response as a JSON object with the following structure:
      {
        "technicalAccuracy": number (0-10),
        "knowledgeDepth": number (0-10),
        "clarity": number (0-10),
        "problemSolving": number (0-10),
        "overallScore": number (0-10),
        "strengths": string[],
        "weaknesses": string[],
        "detailedAnalysis": string
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer providing detailed response analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing response:', error);
      throw error;
    }
  }

  async cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

export default new AudioProcessingService(); 