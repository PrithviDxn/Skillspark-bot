import OpenAI from 'openai';
import ErrorResponse from '../utils/errorResponse.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// @desc    Transcribe audio with OpenAI Whisper
// @route   POST /api/v1/ai/transcribe
// @access  Private
export const transcribeAudio = async (req, res, next) => {
  try {
    // Check if file exists
    if (!req.files || !req.files.audio) {
      return next(new ErrorResponse('Please upload an audio file', 400));
    }

    const audioFile = req.files.audio;

    // Check if it's an audio file
    if (!audioFile.mimetype.startsWith('audio')) {
      return next(new ErrorResponse('Please upload an audio file', 400));
    }

    // Create a transcription with OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile.data,
      model: "whisper-1",
      language: "en"
    });

    res.status(200).json({
      success: true,
      data: transcription.text
    });
  } catch (err) {
    console.error('Transcription error:', err);
    return next(new ErrorResponse('Error transcribing audio', 500));
  }
};

// @desc    Evaluate answer with OpenAI GPT
// @route   POST /api/v1/ai/evaluate
// @access  Private
export const evaluateAnswer = async (req, res, next) => {
  try {
    const { question, transcript, techStack } = req.body;

    if (!question || !transcript) {
      return next(new ErrorResponse('Please provide both question and transcript', 400));
    }

    // Create evaluation prompt
    const prompt = `
    As an expert interviewer in ${techStack || 'technology'}, evaluate the following answer to this technical question.
    
    Question: ${question}
    
    Answer transcript: ${transcript}
    
    Evaluate this answer based on:
    1. Technical accuracy (40%)
    2. Completeness (30%)
    3. Clarity of explanation (20%)
    4. Example usage (10%)
    
    Provide your evaluation in JSON format with the following structure:
    {
      "score": (a number between 1-10),
      "feedback": (detailed feedback including strengths and areas for improvement),
      "criteria": {
        "technicalAccuracy": (score out of 10),
        "completeness": (score out of 10),
        "clarity": (score out of 10),
        "examples": (score out of 10)
      }
    }
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    // Parse the response
    const evaluationResponse = JSON.parse(completion.choices[0].message.content);

    res.status(200).json({
      success: true,
      data: evaluationResponse
    });
  } catch (err) {
    console.error('Evaluation error:', err);
    return next(new ErrorResponse('Error evaluating answer', 500));
  }
};

export default {
  transcribeAudio,
  evaluateAnswer
}; 