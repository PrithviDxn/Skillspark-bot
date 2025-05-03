import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';
import ErrorResponse from '../utils/errorResponse.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Cohere client
const cohereApiKey = process.env.COHERE_API_KEY || '';

// Log Cohere API key status at startup
console.log('\n==== COHERE AI CONFIGURATION ====');
console.log('Cohere API Key configured:', !!cohereApiKey);
console.log('Cohere API Key first 5 chars:', cohereApiKey ? cohereApiKey.substring(0, 5) + '...' : 'Not set');
console.log('============================\n');

// Create Cohere client only if API key is available
let cohere = null;
if (cohereApiKey) {
  try {
    cohere = new CohereClient({
      token: cohereApiKey,
    });
    console.log('Cohere client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Cohere client:', error.message);
  }
}

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
    const { question, transcript, techStack, code, codeLanguage } = req.body;

    if (!question || (!transcript && !code)) {
      return next(new ErrorResponse('Please provide question and either transcript or code', 400));
    }

    console.log('\n🔍🔍🔍 EVALUATION USING COHERE AI 🔍🔍🔍');
    console.log('Question:', question.substring(0, 100) + '...');
    console.log('Transcript length:', transcript ? transcript.length : 'No transcript');
    console.log('Code provided:', !!code);
    console.log('Code provided for evaluation');
    console.log('Tech Stack:', techStack || 'Not specified');
    console.log('Cohere API Key available:', !!process.env.COHERE_API_KEY);
    console.log('Cohere API Key:', process.env.COHERE_API_KEY ? process.env.COHERE_API_KEY.substring(0, 5) + '...' : 'Not set');
    console.log('Cohere client initialized:', !!cohere);
    console.log('Attempting to call Cohere API...');

    // Create evaluation prompt for Cohere
    const prompt = `
    As an expert interviewer in ${techStack || 'technology'}, evaluate the following answer to this technical question. You must be extremely strict and fair in your evaluation.
    
    Question: ${question}
    
    ${transcript ? `Answer transcript: ${transcript}` : 'No verbal answer was provided.'}
    ${code ? `
    Code submission:
    \`\`\`
    ${code}
    \`\`\`
    ` : ''}
    
    CRITICAL EVALUATION INSTRUCTIONS:
    1. RELEVANCE CHECK (MOST IMPORTANT): First, determine if the answer is relevant to the question. 
       - If the answer is completely irrelevant, just a greeting, or merely states the candidate's name without addressing the technical question, you MUST assign a score of 1/10 for ALL criteria (technicalAccuracy, completeness, clarity, examples) and an overall score of 1/10.
       - Feedback should clearly state that the answer is irrelevant to the technical question asked.
    
    2. COMPLETENESS CHECK: For relevant answers, assess whether the answer covers the key concepts required. Missing important concepts should significantly reduce the score.
    
    3. TECHNICAL ACCURACY: For relevant answers, verify that the technical information provided is correct. Inaccurate information should result in a lower score.
    
    4. LENGTH CHECK: Very short answers (less than 50 words) that don't adequately address the question should receive a low score (1-2).
    
    Evaluate this answer based on:
    1. Technical accuracy (40%)
    2. Completeness (30%)
    3. Clarity of explanation (20%)
    4. Example usage (10%)
    
    STRICT SCORING GUIDELINES:
    1: Completely irrelevant or just a greeting
    2-3: Poor answer with major gaps or errors
    4-5: Basic answer with significant gaps
    6-7: Good answer with minor gaps
    8-10: Excellent, comprehensive answer
    
    Provide your evaluation in JSON format with the following structure:
    {
      "score": (a number between 1-10),
      "feedback": (detailed feedback including why the score was given and areas for improvement),
      "criteria": {
        "technicalAccuracy": (score out of 10),
        "completeness": (score out of 10),
        "clarity": (score out of 10),
        "examples": (score out of 10)
      }
    }
    `;

    // Make sure Cohere API key is configured
    if (!cohereApiKey) {
      console.error('Cohere API key is not configured. Please set COHERE_API_KEY in your environment variables.');
      return next(new ErrorResponse('Cohere API key is not configured. Please set COHERE_API_KEY in your environment variables.', 500));
    }
    
    // Initialize Cohere client if not already initialized
    if (!cohere) {
      try {
        cohere = new CohereClient({
          token: cohereApiKey,
        });
        console.log('Cohere client initialized on-demand');
      } catch (error) {
        console.error('Failed to initialize Cohere client:', error.message);
        return next(new ErrorResponse(`Failed to initialize Cohere client: ${error.message}`, 500));
      }
    }
    
    try {
      console.log('Making Cohere API request with these parameters:');
      console.log('- Model: command');
      console.log('- Temperature: 0.3');
      console.log('- Max Tokens: 800');
      console.log('- Prompt preview:', prompt.substring(0, 200) + '...');
      
      // Call Cohere API
      try {
        console.log('Sending request to Cohere API...');
        const cohereResponse = await cohere.generate({
          prompt: prompt,
          model: 'command',  // Using Cohere's command model
          temperature: 0.3,
          maxTokens: 800,
        });

        console.log('Cohere API response received!');
        console.log('Response status:', cohereResponse?.statusCode || 'Unknown');
        
        if (!cohereResponse.generations || cohereResponse.generations.length === 0) {
          throw new Error('No generations returned from Cohere API');
        }
        
        const generatedText = cohereResponse.generations[0].text;
        console.log('Generated text length:', generatedText.length);
        console.log('Generated text preview:', generatedText.substring(0, 100) + '...');
        
        // Try to extract JSON from the response
        const jsonRegex = /{[\s\S]*}/g;
        const jsonMatch = generatedText.match(jsonRegex);
        console.log('JSON match found:', !!jsonMatch);
        
        let evaluationResponse;

        if (jsonMatch) {
          try {
            evaluationResponse = JSON.parse(jsonMatch[0]);
            console.log('Successfully parsed JSON response:', evaluationResponse);
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
      
      // Return the error to the client instead of falling back
      return next(new ErrorResponse(`Cohere AI evaluation failed: ${cohereError.message}. Please check your Cohere API key and try again.`, 500));
    }
  } catch (err) {
    console.error('Evaluation error:', err);
    return next(new ErrorResponse('Error evaluating answer', 500));
  }
};

// Simple fallback evaluation function if Cohere API fails
const createFallbackEvaluation = (question, transcript, techStack, code) => {
  // Extract question-specific keywords from the question
  const questionLower = question.toLowerCase();
  let questionKeywords = [];
  
  // Add question-specific keywords based on the question content
  if (questionLower.includes('react')) {
    questionKeywords = ['component', 'jsx', 'virtual dom', 'state', 'props', 'hooks', 'lifecycle', 'render'];
  } else if (questionLower.includes('node')) {
    questionKeywords = ['event loop', 'callback', 'async', 'express', 'middleware', 'server'];
  } else if (questionLower.includes('python')) {
    questionKeywords = ['list', 'tuple', 'dictionary', 'class', 'function', 'django', 'flask'];
  } else if (questionLower.includes('java')) {
    questionKeywords = ['class', 'interface', 'inheritance', 'polymorphism', 'spring'];
  }
  
  // General technical terms
  const generalKeywords = [
    'algorithm', 'performance', 'optimization', 'design', 'pattern',
    'architecture', 'framework', 'library', 'function', 'method'
  ];
  
  // Tech stack specific terms
  const techStackKeywords = techStack ? [
    ...(techStack.toLowerCase().includes('react') ? 
      ['component', 'jsx', 'virtual dom', 'state', 'props', 'hooks'] : []),
    ...(techStack.toLowerCase().includes('node') ? 
      ['event loop', 'callback', 'async', 'express', 'middleware'] : []),
    ...(techStack.toLowerCase().includes('python') ? 
      ['list', 'tuple', 'dictionary', 'class', 'function', 'django', 'flask'] : []),
    ...(techStack.toLowerCase().includes('java') ? 
      ['class', 'interface', 'inheritance', 'polymorphism', 'spring'] : [])
  ] : [];
  
  // Combine all keywords, prioritizing question-specific ones
  const keywords = [...questionKeywords, ...techStackKeywords, ...generalKeywords];
  
  // Count keywords in transcript and code
  const normalizedTranscript = transcript ? transcript.toLowerCase() : '';
  const normalizedCode = code ? code.toLowerCase() : '';
  
  // Check if the answer is just a greeting or very short
  const isJustGreeting = normalizedTranscript.match(/^\s*(hi|hello|hey|greetings|my name is)\b.*?$/i);
  const wordCount = normalizedTranscript.split(/\s+/).filter(w => w.length > 0).length;
  const isVeryShort = wordCount < 20;
  const isTesting = normalizedTranscript.toLowerCase().includes('testing') || normalizedTranscript.toLowerCase().includes('test');
  
  // If it's just a greeting, testing message, or very short, give a score of 1
  if (isJustGreeting || isVeryShort || isTesting) {
    return {
      score: 1,
      feedback: `This answer is ${isJustGreeting ? 'just a greeting' : isTesting ? 'just a test message' : 'too short'} and does not address the technical question. A complete answer should explain the technical concepts in detail. Irrelevant answers receive a score of 1/10.`,
      criteria: {
        technicalAccuracy: 1,
        completeness: 1,
        clarity: 1,
        examples: 1
      }
    };
  }
  
  // Count question-specific keywords (these are most important)
  const questionKeywordCount = questionKeywords.filter(keyword => 
    normalizedTranscript.includes(keyword.toLowerCase()) || 
    normalizedCode.includes(keyword.toLowerCase())
  ).length;
  
  // Count all keywords
  const transcriptKeywordCount = keywords.filter(keyword => 
    normalizedTranscript.includes(keyword.toLowerCase())
  ).length;
  
  const codeKeywordCount = keywords.filter(keyword => 
    normalizedCode.includes(keyword.toLowerCase())
  ).length;
  
  const totalKeywordCount = transcriptKeywordCount + codeKeywordCount;
  
  // Calculate relevance score - heavily weighted by question-specific keywords
  const relevanceScore = questionKeywords.length > 0 ? 
    Math.min(10, (questionKeywordCount / questionKeywords.length) * 10) : 5;
  
  // Calculate keyword score - based on total keywords
  const keywordScore = Math.min(10, (totalKeywordCount / 8) * 10);
  
  // Calculate length scores
  const transcriptLength = transcript ? transcript.length : 0;
  const codeLength = code ? code.length : 0;
  
  const transcriptLengthScore = Math.min(10, (transcriptLength / 500) * 10);
  const codeLengthScore = Math.min(10, (codeLength / 200) * 10);
  
  // Weight the length scores based on what was provided
  let lengthScore;
  if (transcript && code) {
    lengthScore = (transcriptLengthScore * 0.6) + (codeLengthScore * 0.4);
  } else if (transcript) {
    lengthScore = transcriptLengthScore;
  } else if (code) {
    lengthScore = codeLengthScore;
  } else {
    lengthScore = 0;
  }
  
  // Calculate final score with weights - relevance is most important
  const score = Math.round((relevanceScore * 0.5 + keywordScore * 0.3 + lengthScore * 0.2) * 10) / 10;
  
  // Generate appropriate feedback
  let feedback = 'This evaluation was generated using a fallback system. ';
  
  if (relevanceScore < 5) {
    feedback += 'The answer does not seem to directly address the question asked. ';
  }
  
  if (transcript && code) {
    feedback += `Your verbal answer contains ${transcriptKeywordCount} relevant technical terms and is ${transcriptLength} characters long. `;
    feedback += `Your code submission contains ${codeKeywordCount} relevant technical terms and is ${codeLength} characters long.`;
  } else if (transcript) {
    feedback += `Your verbal answer contains ${transcriptKeywordCount} relevant technical terms and is ${transcriptLength} characters long.`;
  } else if (code) {
    feedback += `Your code submission contains ${codeKeywordCount} relevant technical terms and is ${codeLength} characters long.`;
  }
  
  return {
    score: Math.min(10, score),
    feedback,
    criteria: {
      technicalAccuracy: Math.round(relevanceScore * 10) / 10,
      completeness: Math.round(keywordScore * 10) / 10,
      clarity: transcript ? Math.min(wordCount / 10, 10) : 3, // Clarity based on word count
      examples: (normalizedTranscript.includes('example') || normalizedCode.length > 50) ? 7 : 3
    }
  };
};

export default {
  transcribeAudio,
  evaluateAnswer
};