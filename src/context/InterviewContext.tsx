import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { techStackAPI, questionAPI, aiAPI, interviewAPI, answerAPI, uploadAPI, roleAPI } from '@/api';

// Types
export type TechStack = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  techStacks: string[];
};

export type Question = {
  id: string;
  stackId: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export type Answer = {
  id: string;
  questionId: string;
  audioUrl?: string;
  transcript?: string;
  code?: string;
  codeLanguage?: string;
  codeEvaluation?: string;
  score?: number;
  feedback?: string;
  criteria?: {
    technicalAccuracy: number;
    completeness: number;
    clarity: number;
    examples: number;
  };
};

export type Interview = {
  id: string;
  candidateId: string;
  roleId?: string; // New field for role
  stackId?: string; // Now optional since we can have multiple tech stacks
  techStackIds?: string[]; // New field for multiple tech stacks
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  answers: Answer[];
};

type InterviewContextType = {
  availableTechStacks: TechStack[];
  availableRoles: Role[];
  questionsByStack: Record<string, Question[]>;
  currentInterview: Interview | null;
  setCurrentInterview: React.Dispatch<React.SetStateAction<Interview | null>>;
  interviews: Interview[];
  startInterview: (candidateId: string, roleId: string, techStackIds: string[]) => Promise<Interview>;
  endInterview: (interviewId: string) => Promise<void>;
  getQuestionsForStack: (stackId: string) => Question[];
  saveAnswer: (interviewId: string, questionId: string, audioBlob: Blob, transcript?: string, code?: string) => Promise<void>;
  getInterviewDetails: (interviewId: string) => Interview | null;
  refreshInterview: (interviewId: string) => Promise<Interview | null>;
  isLoading: boolean;
  refreshTechStacks: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshQuestions: (stackId: string) => Promise<void>;
  useFreeMode: boolean;
  setUseFreeMode: React.Dispatch<React.SetStateAction<boolean>>;
};

// Mock tech stacks removed - we now use only API data

// Create the context
const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

// Mock transcription function has been removed - we now use real transcription

// Mock AI evaluation function (in a real app this would use GPT or other LLM)
const mockEvaluateAnswer = async (question: string, transcript: string): Promise<{ score: number, feedback: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate random score between 6 and 10
  const score = Math.floor(Math.random() * 5) + 6;
  
  // Mock feedback based on score
  let feedback;
  if (score >= 9) {
    feedback = "Excellent answer that demonstrates deep understanding of the concept. The explanation was clear, comprehensive, and included relevant examples.";
  } else if (score >= 7) {
    feedback = "Good answer that covers the main points. Some additional detail or examples would have strengthened the response.";
  } else {
    feedback = "Satisfactory answer that addresses the basic concept. The explanation could be more precise and include more technical details.";
  }
  
  return { score, feedback };
};

// Function to determine emoji for tech stack
const getTechStackEmoji = (name: string) => {
  const emojiMap: Record<string, string> = {
    'React': '⚛️',
    'Python': '🐍',
    'Node.js': '🟢',
    'Java': '☕',
    'JavaScript': '𝗝𝗦',
    'TypeScript': 'TS',
    'Angular': '🅰️',
    'Vue': '🟩',
    'PHP': '🐘',
    'Ruby': '💎',
    'C#': '🎯',
    'Go': '🐹',
    'Swift': '🐦',
    'Kotlin': '🎯',
    'Rust': '🦀',
  };
  
  return emojiMap[name] || '🔧';
};

// Add these interfaces
interface ApiTechStack {
  _id: string;
  name: string;
  description: string;
}

interface ApiQuestion {
  _id: string;
  techStack: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Add this interface for API interview data
interface ApiInterview {
  _id: string;
  candidate: { _id: string } | string;
  techStack: { _id: string } | string;
  techStacks?: Array<{ _id: string } | string>; // Add support for multiple tech stacks
  role?: { _id: string } | string; // Add support for role
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
}

// Add this interface for API answer data
interface ApiAnswer {
  _id: string;
  question: string;
  interview: string;
  audioUrl?: string;
  transcript?: string;
  code?: string;
  codeLanguage?: string;
  codeEvaluation?: string;
  score?: number;
  feedback?: string;
  criteria?: {
    technicalAccuracy: number;
    completeness: number;
    clarity: number;
    examples: number;
  }
}

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[DEBUG][InterviewContext] Provider mounted');
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTechStacks, setAvailableTechStacks] = useState<TechStack[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [questionsByStack, setQuestionsByStack] = useState<Record<string, Question[]>>({});
  const [useFreeMode, setUseFreeMode] = useState<boolean>(true); // Default to free mode
  
  // Debug: Print all questions for all stacks whenever questionsByStack changes
  useEffect(() => {
    console.log('[DEBUG][InterviewContext] questionsByStack changed:', questionsByStack);
    if (!questionsByStack || Object.keys(questionsByStack).length === 0) {
      console.warn('[DEBUG][InterviewContext] questionsByStack is empty or undefined!', new Error().stack);
    } else {
      Object.entries(questionsByStack).forEach(([stackId, questions]) => {
        const stackName = availableTechStacks.find(s => s.id === stackId)?.name || stackId;
        console.log(`[DEBUG][InterviewContext] Stack: ${stackId} ${stackName}`);
        console.log('[DEBUG][InterviewContext] Questions:', questions);
      });
    }
  }, [questionsByStack, availableTechStacks]);

  // Fetch tech stacks, roles, and interviews on mount
  useEffect(() => {
    fetchTechStacks();
    fetchRoles();
    fetchInterviews();
  }, []);

  // Function to fetch tech stacks from API
  const fetchTechStacks = async () => {
    setIsLoading(true);
    try {
      const response = await techStackAPI.getAll();
      if (response.data && response.data.data) {
        const techStacks = response.data.data.map((stack: ApiTechStack) => ({
          id: stack._id,
          name: stack.name,
          description: stack.description,
          icon: getTechStackEmoji(stack.name)
        }));
        setAvailableTechStacks(techStacks);
        
        // Fetch questions for each tech stack
        techStacks.forEach((stack: TechStack) => {
          fetchQuestionsForStack(stack.id);
        });
        // Debug: Print each stack and its questions after a short delay to ensure fetches complete
        setTimeout(() => {
          techStacks.forEach((stack: TechStack) => {
            console.log('[DEBUG][InterviewContext] Stack:', stack.id, stack.name);
            console.log('[DEBUG][InterviewContext] Questions:', questionsByStack[stack.id]);
          });
        }, 1500); // Wait for fetches to likely complete

      }
    } catch (error) {
      console.error('Error fetching tech stacks:', error);
      toast.error('Failed to load tech stacks');
      // No longer using mock data fallbacks
      setAvailableTechStacks([]);
      setQuestionsByStack({});
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to fetch roles from API
  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await roleAPI.getAll();
      if (response.data && response.data.data) {
        const roles = response.data.data.map((role: any) => ({
          id: role._id,
          name: role.name,
          description: role.description,
          techStacks: Array.isArray(role.techStacks) ? role.techStacks.map((stack: any) => 
            typeof stack === 'object' ? stack._id : stack
          ) : []
        }));
        setAvailableRoles(roles);
        console.log('[DEBUG][InterviewContext] Fetched roles:', roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
      setAvailableRoles([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to refresh roles
  const refreshRoles = async (): Promise<void> => {
    try {
      await fetchRoles();
      toast.success('Roles refreshed');
    } catch (error) {
      console.error('Error refreshing roles:', error);
      toast.error('Failed to refresh roles');
    }
  };

  // Debug: Print all questions for all stacks whenever questionsByStack changes
  useEffect(() => {
    console.log('[DEBUG][InterviewContext] questionsByStack changed:', questionsByStack);
    if (!questionsByStack || Object.keys(questionsByStack).length === 0) {
      console.warn('[DEBUG][InterviewContext] questionsByStack is empty or undefined!', new Error().stack);
    } else {
      Object.entries(questionsByStack).forEach(([stackId, questions]) => {
        const stackName = availableTechStacks.find(s => s.id === stackId)?.name || stackId;
        console.log(`[DEBUG][InterviewContext] Stack: ${stackId} ${stackName}`);
        console.log('[DEBUG][InterviewContext] Questions:', questions);
      });
    }
  }, [questionsByStack, availableTechStacks]);

  const fetchQuestionsForStack = async (stackId: string) => {
    console.log('[DEBUG][InterviewContext] fetchQuestionsForStack called for stackId:', stackId);
    try {
      const response = await questionAPI.getByTechStack(stackId);
      console.log(`[fetchQuestionsForStack] API response for stackId ${stackId}:`, response.data);
      if (response.data && response.data.data) {
        const questions = response.data.data
  .filter((q: ApiQuestion): q is ApiQuestion & { techStack: { _id: string } | string } =>
    !!q.techStack && ((typeof q.techStack === 'object' && q.techStack !== null && '_id' in q.techStack) || typeof q.techStack === 'string')
  )
  .map((q: ApiQuestion) => ({
    id: q._id,
    stackId: typeof q.techStack === 'object' && q.techStack !== null && '_id' in q.techStack ? q.techStack._id : 
            (typeof q.techStack === 'string' ? q.techStack : stackId),
    text: q.text,
    difficulty: q.difficulty
  }));
        console.log(`[fetchQuestionsForStack] Mapped questions for stackId ${stackId}:`, questions);
        setQuestionsByStack(prev => {
          const updated = {
            ...prev,
            [stackId]: questions
          };
          console.log(`[fetchQuestionsForStack] Updated questionsByStack for stackId ${stackId}:`, updated);
          return updated;
        });
      }
    } catch (error) {
      console.error(`Error fetching questions for stack ${stackId}:`, error);
      toast.error(`Failed to load questions for ${stackId}`);
    }
  };

  const getQuestionsForStack = (stackId: string): Question[] => {
    const result = questionsByStack[stackId] || [];
    console.log('[DEBUG][InterviewContext] getQuestionsForStack called for stackId:', stackId, '->', result);
    return result;
  };

  const startInterview = async (candidateId: string, stackId: string): Promise<Interview> => {
    setIsLoading(true);
    
    try {
      // Use current date/time in proper format
      const now = new Date();
      const scheduledDate = now.toISOString(); // full ISO string
      const scheduledTime = now.toTimeString().substring(0, 5); // "HH:MM"
      // Call the actual API instead of simulating
      const response = await interviewAPI.create({
        candidate: candidateId,
        techStack: stackId,
        scheduledDate,
        scheduledTime,
        duration: 30
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('Failed to create interview');
      }
      
      const apiInterview = response.data.data;
      // Always fetch the latest interview data from the backend to ensure correct field mapping
      const refreshed = await refreshInterview(apiInterview._id || apiInterview.id);
      if (!refreshed) {
        throw new Error('Failed to fetch interview after creation');
      }
      // Type guard: ensure stackId and candidateId are strings
      const safeInterview = {
        ...refreshed,
        stackId: typeof refreshed.stackId === 'object' && refreshed.stackId !== null ? (refreshed.stackId._id || '') : refreshed.stackId,
        candidateId: typeof refreshed.candidateId === 'object' && refreshed.candidateId !== null ? (refreshed.candidateId._id || '') : refreshed.candidateId,
      };
      setInterviews(prev => [...prev, safeInterview]);
      setCurrentInterview(safeInterview);
      toast.success('Interview started!');
      return safeInterview;
    } catch (error) {
      console.error('Failed to start interview:', error);
      toast.error('Failed to start interview. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswer = async (interviewId: string, questionId: string, audioBlob: Blob, transcript?: string, code?: string, codeLanguage?: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Get the interview
      const interview = interviews.find(i => i.id === interviewId);
      if (!interview) {
        throw new Error('Interview not found');
      }
      
      // Create object URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Find the question and tech stack
      const stackId = interview.stackId;
      const stack = availableTechStacks.find(s => s.id === stackId);
      
      // Find the question from our state
      const question = questionsByStack[stackId]?.find(q => q.id === questionId) ||
        Object.values(questionsByStack)
        .flat()
        .find(q => q.id === questionId);
        
      if (!question) {
        throw new Error('Question not found');
      }
      
      let finalTranscript = transcript;
      let score, feedback, criteria;
      // We no longer use mock transcripts
      
      // Get the transcription
      if (!finalTranscript) {
        try {
          if (useFreeMode) {
            // In free mode, we now use the real transcription API as well
            const transcriptionResponse = await aiAPI.transcribe(audioBlob);
            if (transcriptionResponse.data && transcriptionResponse.data.data) {
              finalTranscript = transcriptionResponse.data.data.text || transcriptionResponse.data.data;
              console.log('Using real transcript (free mode):', finalTranscript.substring(0, 30));
            }
          } else {
            // In paid mode, always use the real transcription API
            const transcriptionResponse = await aiAPI.transcribe(audioBlob);
            if (transcriptionResponse.data && transcriptionResponse.data.data) {
              // Handle both response formats - either data.data.text or just data.data as the transcript
              finalTranscript = transcriptionResponse.data.data.text || transcriptionResponse.data.data;
              
              if (!finalTranscript) {
                throw new Error('Transcription failed');
              }
              console.log('Real transcript obtained:', finalTranscript.substring(0, 30));
            } else {
              throw new Error('Invalid transcription response format');
            }
          }
        } catch (error) {
          console.error('Transcription error:', error);
          
          // IMPORTANT CHANGE: Don't fall back to mock transcription
          // Instead, set a clear error message as the transcript
          finalTranscript = "[TRANSCRIPTION FAILED] Unable to transcribe audio. Please check audio quality or try again.";
          toast.error('Transcription failed. Check error logs for details.');
        }
      }
      
      // Check answer quality
      const wordCount = finalTranscript.trim().split(/\s+/).length;
      console.log(`Answer word count: ${wordCount} for question: ${question.text.substring(0, 30)}...`);
      
      if (wordCount < 5 && !finalTranscript.includes('[TRANSCRIPTION FAILED]')) {
        toast.warning('Your answer is too short or incomplete. Please provide a more detailed response.');
      }
      
      // Always use Cohere AI for evaluation regardless of free mode
      try {
        // Paid mode - Use OpenAI services
        try {
          // Skip to evaluation - we already handled transcription above
          const evaluationResponse = await aiAPI.evaluate({
            question: question.text,
            transcript: finalTranscript,
            techStack: stack?.name,
            code: code,
            codeLanguage: codeLanguage
          });
          
          if (evaluationResponse.data && evaluationResponse.data.data) {
            const evaluation = evaluationResponse.data.data;
            score = evaluation.score;
            feedback = evaluation.feedback;
            criteria = evaluation.criteria;
            
            // Check if evaluation method info is available
            const evaluationMethod = evaluationResponse.data.evaluationMethod || 'unknown';
            console.log(`✅ Answer evaluated using ${evaluationMethod.toUpperCase()} AI`);
            
            // Add evaluation method to feedback
            if (evaluationMethod === 'cohere') {
              feedback = `[EVALUATED BY COHERE AI] \n\n${feedback}`;
              toast.success('Answer evaluated using Cohere AI');
            } else if (evaluationMethod === 'fallback') {
              feedback = `[EVALUATED BY FALLBACK SYSTEM] \n\n${feedback}`;
              toast.info('Answer evaluated using fallback system');
            }
          } else {
            throw new Error('Evaluation failed');
          }
        } catch (error) {
          console.error('Evaluation error:', error);
          toast.error('Evaluation failed, using backup method');
          // Fallback to mock evaluation in case of failure
          const mockEval = await mockEvaluateAnswer(question.text, finalTranscript);
          score = mockEval.score;
          feedback = `[MOCK EVALUATION] ${mockEval.feedback}\n\nNote: This is an auto-generated mock evaluation because the AI evaluation service failed.`;
        }
      } catch (error) {
        console.error('Evaluation error:', error);
        toast.error('Evaluation failed, using backup method');
        // Fallback to mock evaluation in case of failure
        const mockEval = await mockEvaluateAnswer(question.text, finalTranscript);
        score = mockEval.score;
        feedback = `[MOCK EVALUATION] ${mockEval.feedback}\n\nNote: This is an auto-generated mock evaluation because the AI evaluation service failed.`;
      }
      
      // Extract code evaluation from feedback if available
      let codeEvaluation = '';
      if (code && feedback) {
        // Look for code-specific feedback in the overall feedback
        const codeEvalRegex = /(?:Code Assessment|Code evaluation|Code submission|Code analysis):([\s\S]*?)(?=\n\n|$)/i;
        const match = feedback.match(codeEvalRegex);
        if (match) {
          codeEvaluation = match[0];
        } else {
          // If no specific section found, create a generic one
          codeEvaluation = 'Code was evaluated as part of the overall response.';
        }
      }
      
      // Create answer object with properly formatted transcript
      // Make sure transcript is a string, not an object
      const transcriptToSave = typeof finalTranscript === 'object' && finalTranscript !== null && 'text' in finalTranscript ? 
        finalTranscript.text as string : 
        (typeof finalTranscript === 'string' ? finalTranscript : '');
        
      const answer: Answer = {
        id: Date.now().toString(), // Temporary ID
        questionId: questionId,
        audioUrl: audioUrl,
        transcript: transcriptToSave,
        code: code || '',
        codeLanguage: codeLanguage || '',
        codeEvaluation: codeEvaluation,  // Include code evaluation
        score,
        feedback,
        criteria
      };
      
      console.log("Created answer object with criteria:", criteria);
      
      // Try to upload the audio and save the answer to the database
      try {
        // Pass the Blob directly to the uploadAPI instead of creating a File
        console.log('Uploading audio file, size:', audioBlob.size, 'bytes', 'type:', audioBlob.type);
        
        // Create a more reliable Blob with explicit type if missing
        let uploadBlob = audioBlob;
        if (!audioBlob.type || audioBlob.type === '') {
          // If no type, create a new Blob with audio/webm type (most common for recordings)
          uploadBlob = new Blob([audioBlob], { type: 'audio/webm' });
          console.log('Created new blob with explicit type:', uploadBlob.type);
        }
        
        // Use the uploadAPI to handle the file upload properly
        const uploadResponse = await uploadAPI.uploadAudio(uploadBlob);
        
        console.log('Upload response received:', uploadResponse);
        
        if (!uploadResponse.data || uploadResponse.data.success === false) {
          console.error('Upload failed with response:', uploadResponse);
          throw new Error('Failed to upload audio');
        }
        
        // Extract the file URL from the response
        const serverAudioUrl = uploadResponse.data.data.fileUrl;
        console.log('File uploaded successfully with URL:', serverAudioUrl);
        
        // Ensure we have properly formatted criteria
        const formattedCriteria = criteria ? {
          technicalAccuracy: criteria.technicalAccuracy || 0,
          completeness: criteria.completeness || 0,
          clarity: criteria.clarity || 0,
          examples: criteria.examples || 0
        } : undefined;
        
        console.log("Formatted criteria for initial save:", formattedCriteria);
        
        // Log what we're about to save to the database
        console.log('Saving answer to database with data:', {
          interview: interviewId,
          question: questionId,
          hasTranscript: !!finalTranscript,
          transcriptLength: finalTranscript ? finalTranscript.length : 0,
          hasAudioUrl: !!serverAudioUrl,
          hasCode: !!code,
          codeLength: code ? code.length : 0,
          hasScore: score !== undefined,
          score: score,
          hasFeedback: !!feedback,
          feedbackLength: feedback ? feedback.length : 0,
          hasCriteria: !!formattedCriteria
        });
        
        // Now save the answer with ALL data including evaluation in one step
        // Ensure transcript is properly formatted as a string before saving
        const transcriptToSave = typeof finalTranscript === 'object' && finalTranscript !== null && 'text' in finalTranscript ? 
          finalTranscript.text as string : 
          (typeof finalTranscript === 'string' ? finalTranscript : '');
          
        const answerResponse = await answerAPI.create({
          interview: interviewId,
          question: questionId,
          transcript: transcriptToSave || '',
          audioUrl: serverAudioUrl || '',
          code: code || '',
          codeLanguage: codeLanguage || 'javascript',
          score: score !== undefined ? score : null,
          feedback: feedback || '',
          criteria: formattedCriteria || {
            technicalAccuracy: 0,
            completeness: 0,
            clarity: 0,
            examples: 0
          }
        });
        
        console.log("Complete answer created in database:", answerResponse.data);
        
        // If we got a response, update the local answer ID with the server-generated one
        if (answerResponse.data && answerResponse.data.data) {
          const createdAnswerId = answerResponse.data.data._id;
          answer.id = createdAnswerId;
        }
      } catch (error) {
        console.error('Failed to save answer to database:', error);
        toast.warning('Answer saved locally but failed to store on server');
        // Continue with local state update even if API fails
      }
      
      // Update interview with new answer in local state
      const updatedInterview = {
        ...interview,
        answers: [...interview.answers, answer]
      };
      
      // Update interviews state
      setInterviews(prev => 
        prev.map(i => (i.id === interviewId ? updatedInterview : i))
      );
      
      // Update current interview if it's the one being updated
      if (currentInterview?.id === interviewId) {
        setCurrentInterview(updatedInterview);
      }
      
      toast.success('Answer saved!');
    } catch (error) {
      console.error('Failed to save answer:', error);
      toast.error('Failed to save answer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const endInterview = async (interviewId: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Call the actual API
      await interviewAPI.update(interviewId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      
      // Update local state
      const updatedInterviews = interviews.map(interview => 
        interview.id === interviewId
          ? {
              ...interview,
              status: 'completed' as const,
              completedAt: new Date().toISOString()
            }
          : interview
      );
      
      setInterviews(updatedInterviews);
      
      // If current interview is being ended, update it too
      if (currentInterview?.id === interviewId) {
        const updatedInterview = updatedInterviews.find(i => i.id === interviewId);
        if (updatedInterview) {
          setCurrentInterview(updatedInterview);
        }
      }
      
      toast.success('Interview completed!');
    } catch (error) {
      console.error('Failed to end interview:', error);
      toast.error('Failed to end interview. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getInterviewDetails = (interviewId: string): Interview | null => {
    return interviews.find(i => i.id === interviewId) || null;
  };

  const refreshTechStacks = async (): Promise<void> => {
    try {
      await fetchTechStacks();
      toast.success('Tech stacks refreshed');
    } catch (error) {
      console.error('Error refreshing tech stacks:', error);
      toast.error('Failed to refresh tech stacks');
    }
  };

  const refreshQuestions = async (stackId: string): Promise<void> => {
    try {
      await fetchQuestionsForStack(stackId);
      toast.success('Questions refreshed');
    } catch (error) {
      console.error(`Error refreshing questions for stack ${stackId}:`, error);
      toast.error('Failed to refresh questions');
    }
  };

  // Function to fetch interviews from API
  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      const response = await interviewAPI.getAll();
      if (response.data && response.data.data) {
        const apiInterviews = response.data.data as ApiInterview[];
        
        // Convert API format to our internal format
        const formattedInterviews: Interview[] = apiInterviews.map((interview: ApiInterview) => ({
          id: interview._id,
          candidateId: typeof interview.candidate === 'object' ? interview.candidate._id : interview.candidate,
          stackId: typeof interview.techStack === 'object' ? interview.techStack._id : interview.techStack,
          status: interview.status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
          createdAt: interview.createdAt,
          completedAt: interview.completedAt,
          scheduledDate: interview.scheduledDate,
          scheduledTime: interview.scheduledTime,
          duration: interview.duration,
          answers: []
        }));

        // Fetch answers for each interview
        const interviewsWithAnswers = await Promise.all(
          formattedInterviews.map(async (interview) => {
            try {
              const answersResponse = await answerAPI.getByInterview(interview.id);
              if (answersResponse.data && answersResponse.data.data) {
                console.log(`Fetched ${answersResponse.data.data.length} answers for interview ${interview.id}`);
                
                const answers = answersResponse.data.data.map((answer: ApiAnswer) => {
                  // Log the answer data to debug
                  console.log(`Answer from API: id=${answer._id}, questionId=${answer.question}`);
                  
                  return {
                    id: answer._id,
                    questionId: answer.question,
                    audioUrl: answer.audioUrl,
                    transcript: answer.transcript,
                    score: answer.score,
                    feedback: answer.feedback,
                    criteria: answer.criteria
                  };
                });
                return { ...interview, answers };
              }
              return interview;
            } catch (error) {
              console.error(`Error fetching answers for interview ${interview.id}:`, error);
              return interview;
            }
          })
        );
        
        setInterviews(interviewsWithAnswers);
        console.log('Interviews loaded from API:', interviewsWithAnswers.length);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast.error('Failed to load interviews');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch a specific interview's details including answers
  const refreshInterview = async (interviewId: string): Promise<Interview | null> => {
    setIsLoading(true);
    try {
      // Get the interview details
      console.log('[refreshInterview] Fetching interview for id:', interviewId);
      const interviewResponse = await interviewAPI.getById(interviewId);
      console.log('[refreshInterview] interviewAPI.getById response:', interviewResponse.data);
      if (!interviewResponse.data || !interviewResponse.data.data) {
        throw new Error('Failed to fetch interview');
      }
      
      const apiInterview = interviewResponse.data.data as ApiInterview;
      console.log('[refreshInterview] apiInterview:', apiInterview);
      
      // Convert to our internal format
      // Debug: Map API interview to internal Interview type
      console.log('[refreshInterview] Mapping apiInterview to Interview type');
      
      // Process tech stacks - handle both single and multiple tech stacks
      let techStackIds: string[] = [];
      
      // First check if we have techStacks array (new format)
      if (apiInterview.techStacks && Array.isArray(apiInterview.techStacks)) {
        techStackIds = apiInterview.techStacks.map(stack => 
          typeof stack === 'object' ? stack._id : stack as string
        );
        console.log('[refreshInterview] Found techStacks array:', techStackIds);
      }
      
      // Always include the single techStack for backward compatibility
      const singleStackId = typeof apiInterview.techStack === 'object' ? 
        apiInterview.techStack._id : apiInterview.techStack as string;
      
      // If we don't have techStackIds yet, use the single stack
      if (techStackIds.length === 0 && singleStackId) {
        techStackIds = [singleStackId];
        console.log('[refreshInterview] Using single techStack:', singleStackId);
      }
      
      // Get role ID if present
      const roleId = apiInterview.role ? 
        (typeof apiInterview.role === 'object' ? apiInterview.role._id : apiInterview.role as string) : 
        undefined;
      
      const formattedInterview: Interview = {
        id: apiInterview._id, // Use only _id from API
        candidateId: typeof apiInterview.candidate === 'object' ? apiInterview.candidate._id : apiInterview.candidate as string,
        stackId: singleStackId, // Keep for backward compatibility
        techStackIds: techStackIds, // Add the array of tech stack IDs
        roleId: roleId, // Add role ID if present
        status: apiInterview.status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
        createdAt: apiInterview.createdAt,
        completedAt: apiInterview.completedAt,
        scheduledDate: apiInterview.scheduledDate,
        scheduledTime: apiInterview.scheduledTime,
        duration: apiInterview.duration,
        answers: []
      };
      
      console.log('[refreshInterview] Formatted interview with techStackIds:', formattedInterview);
      
      console.log('[refreshInterview] Fetching answers for interview:', interviewId);
      // Fetch all answers for this interview
      try {
        const answersResponse = await answerAPI.getByInterview(interviewId);
        if (answersResponse.data && answersResponse.data.data) {
          console.log(`Fetched ${answersResponse.data.data.length} answers for interview ${interviewId}`);
          
          formattedInterview.answers = answersResponse.data.data.map((answer: ApiAnswer) => ({
            id: answer._id,
            questionId: answer.question,
            audioUrl: answer.audioUrl,
            transcript: answer.transcript,
            code: answer.code || '',
            codeLanguage: answer.codeLanguage || '',
            codeEvaluation: answer.codeEvaluation || '',
            score: answer.score,
            feedback: answer.feedback,
            criteria: answer.criteria
          }));
        }
      } catch (error) {
        console.error(`Error fetching answers for interview ${interviewId}:`, error);
      }
      
      // Update the interviews state
      setInterviews(prev => {
        const updated = prev.map(i => i.id === interviewId ? formattedInterview : i);
        
        // If interview wasn't in the list, add it
        if (!prev.some(i => i.id === interviewId)) {
          updated.push(formattedInterview);
        }
        
        return updated;
      });
      
      // If this is the current interview, update it
      if (currentInterview?.id === interviewId) {
        setCurrentInterview(formattedInterview);
      }
      
      toast.success('Interview data refreshed');
      return formattedInterview;
    } catch (error) {
      console.error('Error refreshing interview:', error);
      toast.error('Failed to refresh interview data');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <InterviewContext.Provider
      value={{
        availableTechStacks,
        availableRoles,
        questionsByStack,
        currentInterview,
        setCurrentInterview,
        interviews,
        startInterview,
        endInterview,
        getQuestionsForStack,
        saveAnswer,
        getInterviewDetails,
        refreshInterview,
        isLoading,
        refreshTechStacks,
        refreshRoles,
        refreshQuestions,
        useFreeMode,
        setUseFreeMode
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};
