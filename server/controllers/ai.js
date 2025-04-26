import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';
import ErrorResponse from '../utils/errorResponse.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Cohere client
const cohereApiKey = process.env.COHERE_API_KEY || '';
const cohere = new CohereClient({
  token: cohereApiKey,
});

// Log Cohere API key status at startup
console.log('\n==== COHERE AI CONFIGURATION ====');
console.log('Cohere API Key configured:', !!cohereApiKey);
console.log('Cohere API Key first 5 chars:', cohereApiKey ? cohereApiKey.substring(0, 5) + '...' : 'Not set');
console.log('============================\n');

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

// @desc    Evaluate answer with Cohere AI
// @route   POST /api/v1/ai/evaluate
// @access  Private
export const evaluateAnswer = async (req, res, next) => {
  try {
    const { question, transcript, techStack } = req.body;

    if (!question || !transcript) {
      return next(new ErrorResponse('Please provide both question and transcript', 400));
    }

    console.log('\n🔍🔍🔍 EVALUATION USING COHERE AI 🔍🔍🔍');
    console.log('Question:', question.substring(0, 100) + '...');
    console.log('Transcript length:', transcript.length);
    console.log('Tech Stack:', techStack || 'Not specified');
    console.log('Cohere API Key available:', !!process.env.COHERE_API_KEY);
    console.log('Cohere API Key:', process.env.COHERE_API_KEY ? process.env.COHERE_API_KEY.substring(0, 5) + '...' : 'Not set');
    console.log('Cohere client initialized:', !!cohere);
    console.log('Attempting to call Cohere API...');

    // Create evaluation prompt for Cohere
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

    try {
      console.log('Making Cohere API request with these parameters:');
      console.log('- Model: command');
      console.log('- Temperature: 0.3');
      console.log('- Max Tokens: 800');
      
      // Call Cohere API
      try {
        console.log('Sending request to Cohere API...');
        const cohereResponse = await cohere.generate({
          prompt: prompt,
          model: 'command',  // Using Cohere's command model
          temperature: 0.3,
          maxTokens: 800,
          returnLikelihoods: 'NONE',
        });
        
        console.log('Cohere API request successful!');
        console.log('Response object keys:', Object.keys(cohereResponse));
        console.log('Has generations array:', !!cohereResponse.generations);
        console.log('Generations array length:', cohereResponse.generations?.length || 0);

        // Extract the generated text
        const generatedText = cohereResponse.generations[0].text;
        console.log('\n✅✅✅ COHERE AI EVALUATION SUCCESSFUL ✅✅✅');
        console.log('Response length:', generatedText.length);
        console.log('First 100 chars:', generatedText.substring(0, 100) + '...');
        console.log('Last 100 chars:', generatedText.substring(generatedText.length - 100) + '...');

      // Extract the JSON part from the response
      let jsonMatch = generatedText.match(/\{[\s\S]*\}/m);
      let evaluationResponse;

      if (jsonMatch) {
        try {
          evaluationResponse = JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          console.error('Error parsing JSON from Cohere response:', jsonError);
          // Fallback to a structured response if JSON parsing fails
          evaluationResponse = {
            score: 5,
            feedback: generatedText,
            criteria: {
              technicalAccuracy: 5,
              completeness: 5,
              clarity: 5,
              examples: 5
            }
          };
        }
      } else {
        // If no JSON found, create a structured response from the text
        evaluationResponse = {
          score: 5,
          feedback: generatedText,
          criteria: {
            technicalAccuracy: 5,
            completeness: 5,
            clarity: 5,
            examples: 5
          }
        };
      }

      res.status(200).json({
        success: true,
        data: evaluationResponse,
        evaluationMethod: 'cohere'
      });
      } catch (innerError) {
        console.error('Error accessing Cohere response:', innerError);
        throw innerError; // Re-throw to be caught by the outer catch block
      }
    } catch (cohereError) {
      console.error('\n❌❌❌ COHERE API ERROR ❌❌❌');
      console.error('Error type:', cohereError.name);
      console.error('Error message:', cohereError.message);
      console.error('Error stack:', cohereError.stack);
      console.log('Falling back to local evaluation method');
      
      // Fallback to FreeEvaluationService-like logic if Cohere fails
      const fallbackEvaluation = createFallbackEvaluation(question, transcript, techStack);
      
      res.status(200).json({
        success: true,
        data: fallbackEvaluation,
        evaluationMethod: 'fallback',
        note: 'Used fallback evaluation due to Cohere API error'
      });
    }
  } catch (err) {
    console.error('Evaluation error:', err);
    return next(new ErrorResponse('Error evaluating answer', 500));
  }
};

// Simple fallback evaluation function if Cohere API fails
const createFallbackEvaluation = (question, transcript, techStack) => {
  // Very simple keyword-based evaluation
  const keywords = [
    // General technical terms
    'algorithm', 'performance', 'optimization', 'design', 'pattern',
    'architecture', 'framework', 'library', 'function', 'method',
    
    // Tech stack specific terms
    ...(techStack?.toLowerCase().includes('react') ? 
      ['component', 'jsx', 'virtual dom', 'state', 'props', 'hooks'] : []),
    ...(techStack?.toLowerCase().includes('node') ? 
      ['event loop', 'callback', 'async', 'express', 'middleware'] : []),
    ...(techStack?.toLowerCase().includes('python') ? 
      ['list', 'tuple', 'dictionary', 'class', 'function', 'django', 'flask'] : []),
    ...(techStack?.toLowerCase().includes('java') ? 
      ['class', 'interface', 'inheritance', 'polymorphism', 'spring'] : [])
  ];
  
  // Count keywords in transcript
  const normalizedTranscript = transcript.toLowerCase();
  const keywordCount = keywords.filter(keyword => 
    normalizedTranscript.includes(keyword.toLowerCase())
  ).length;
  
  // Calculate a simple score based on keyword matches and transcript length
  const keywordScore = Math.min(10, (keywordCount / 5) * 10);
  const lengthScore = Math.min(10, (transcript.length / 500) * 10);
  const score = Math.round((keywordScore * 0.7 + lengthScore * 0.3) * 10) / 10;
  
  return {
    score: Math.min(10, score),
    feedback: `This evaluation was generated using a fallback system. Your answer contains ${keywordCount} relevant technical terms and is ${transcript.length} characters long.`,
    criteria: {
      technicalAccuracy: Math.round(keywordScore * 10) / 10,
      completeness: Math.round(lengthScore * 10) / 10,
      clarity: 5, // Default middle score
      examples: normalizedTranscript.includes('example') ? 7 : 3
    }
  };
};

export default {
  transcribeAudio,
  evaluateAnswer
};