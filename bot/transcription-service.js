// Transcription Service Integration for Bot
const axios = require('axios');

class TranscriptionService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = 'https://api.openai.com/v1/audio/transcriptions';
  }

  async transcribeAudio(audioBuffer, filename = 'audio.wav') {
    try {
      if (!this.openaiApiKey) {
        console.log('OpenAI API key not available, skipping transcription');
        return {
          success: false,
          transcript: 'Transcription service not configured',
          error: 'OpenAI API key not available'
        };
      }

      // Create form data for OpenAI API
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', audioBuffer, {
        filename: filename,
        contentType: 'audio/wav'
      });
      form.append('model', 'whisper-1');
      form.append('response_format', 'text');

      // Send to OpenAI Whisper API
      const response = await axios.post(this.openaiApiUrl, form, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          ...form.getHeaders()
        }
      });

      return {
        success: true,
        transcript: response.data,
        error: null
      };
    } catch (error) {
      console.error('Transcription error:', error.response?.data || error.message);
      return {
        success: false,
        transcript: 'Transcription failed',
        error: error.message
      };
    }
  }

  // Alternative: Use local transcription if available
  async transcribeLocal(audioBuffer) {
    try {
      // This would use a local transcription service like faster-whisper
      // For now, return a placeholder
      return {
        success: false,
        transcript: 'Local transcription not implemented',
        error: 'Local transcription service not available'
      };
    } catch (error) {
      return {
        success: false,
        transcript: 'Local transcription failed',
        error: error.message
      };
    }
  }
}

module.exports = TranscriptionService; 