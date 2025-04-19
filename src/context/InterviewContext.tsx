import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { techStackAPI, questionAPI, aiAPI, interviewAPI, answerAPI, uploadAPI } from '@/api';
import freeEvaluationService from '@/services/FreeEvaluationService';

// Types
export type TechStack = {
  id: string;
  name: string;
  description: string;
  icon: string;
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
  stackId: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  completedAt?: string;
  answers: Answer[];
};

type InterviewContextType = {
  availableTechStacks: TechStack[];
  questionsByStack: Record<string, Question[]>;
  currentInterview: Interview | null;
  setCurrentInterview: React.Dispatch<React.SetStateAction<Interview | null>>;
  interviews: Interview[];
  startInterview: (candidateId: string, stackId: string) => Promise<Interview>;
  endInterview: (interviewId: string) => Promise<void>;
  getQuestionsForStack: (stackId: string) => Question[];
  saveAnswer: (interviewId: string, questionId: string, audioBlob: Blob, transcript?: string) => Promise<void>;
  getInterviewDetails: (interviewId: string) => Interview | null;
  isLoading: boolean;
  refreshTechStacks: () => Promise<void>;
  refreshQuestions: (stackId: string) => Promise<void>;
  useFreeMode: boolean;
  setUseFreeMode: React.Dispatch<React.SetStateAction<boolean>>;
};

// Mock data - will use as fallback if API calls fail
const mockTechStacks: TechStack[] = [
  {
    id: '1',
    name: 'React',
    description: 'Frontend JavaScript library for building user interfaces',
    icon: '⚛️'
  },
  {
    id: '2',
    name: 'Python',
    description: 'General-purpose programming language',
    icon: '🐍'
  },
  {
    id: '3',
    name: 'Node.js',
    description: 'JavaScript runtime for server-side applications',
    icon: '🟢'
  },
  {
    id: '4',
    name: 'Java',
    description: 'Object-oriented programming language',
    icon: '☕'
  }
];

const mockQuestions: Record<string, Question[]> = {
  '1': [
    {
      id: '101',
      stackId: '1',
      text: 'Explain the concept of virtual DOM in React and how it improves performance.',
      difficulty: 'medium'
    },
    {
      id: '102',
      stackId: '1',
      text: 'What are React hooks and how do they change the way we write components?',
      difficulty: 'medium'
    },
    {
      id: '103',
      stackId: '1',
      text: 'Compare and contrast React Context API vs Redux for state management.',
      difficulty: 'hard'
    },
    {
      id: '104',
      stackId: '1',
      text: 'What is the purpose of key prop when rendering a list of elements?',
      difficulty: 'easy'
    },
    {
      id: '105',
      stackId: '1',
      text: 'Explain the React component lifecycle methods and their hooks equivalents.',
      difficulty: 'medium'
    }
  ],
  '2': [
    {
      id: '201',
      stackId: '2',
      text: 'What are Python generators and how do they differ from regular functions?',
      difficulty: 'medium'
    },
    {
      id: '202',
      stackId: '2',
      text: 'Explain decorators in Python with an example.',
      difficulty: 'hard'
    },
    {
      id: '203',
      stackId: '2',
      text: 'What are Python context managers and when would you use them?',
      difficulty: 'medium'
    },
    {
      id: '204',
      stackId: '2',
      text: 'Explain the difference between lists and tuples in Python.',
      difficulty: 'easy'
    },
    {
      id: '205',
      stackId: '2',
      text: 'How does memory management work in Python?',
      difficulty: 'hard'
    }
  ],
  '3': [
    {
      id: '301',
      stackId: '3',
      text: 'Explain the event loop in Node.js.',
      difficulty: 'medium'
    },
    {
      id: '302',
      stackId: '3',
      text: 'What is the purpose of middleware in Express.js?',
      difficulty: 'medium'
    },
    {
      id: '303',
      stackId: '3',
      text: 'How would you handle authentication in a Node.js application?',
      difficulty: 'hard'
    },
    {
      id: '304',
      stackId: '3',
      text: 'What are streams in Node.js and when would you use them?',
      difficulty: 'hard'
    },
    {
      id: '305',
      stackId: '3',
      text: 'Explain the difference between process.nextTick() and setImmediate().',
      difficulty: 'medium'
    }
  ],
  '4': [
    {
      id: '401',
      stackId: '4',
      text: 'Explain the difference between an interface and an abstract class in Java.',
      difficulty: 'medium'
    },
    {
      id: '402',
      stackId: '4',
      text: 'What are Java generics and why are they useful?',
      difficulty: 'medium'
    },
    {
      id: '403',
      stackId: '4',
      text: 'Explain Java memory management and garbage collection.',
      difficulty: 'hard'
    },
    {
      id: '404',
      stackId: '4',
      text: 'What are synchronized methods and blocks in Java?',
      difficulty: 'medium'
    },
    {
      id: '405',
      stackId: '4',
      text: 'Explain the concept of Java streams and functional programming in Java 8+.',
      difficulty: 'hard'
    }
  ]
};

// Create the context
const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

// Mock transcription function (in a real app this would use Whisper API)
const mockTranscribe = async (audioBlob: Blob): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock responses based on random selection
  const responses = [
    "React's virtual DOM is an in-memory representation of the real DOM. When state changes occur, React creates a new virtual DOM tree, compares it with the previous one (diffing), and updates only the parts that have changed in the real DOM. This process minimizes direct DOM manipulation, which is slow, resulting in better performance.",
    "React hooks are functions that let you use state and other React features in functional components. Before hooks, stateful logic required class components. Hooks like useState and useEffect allow us to add state and lifecycle methods to functional components, making them more powerful while keeping code cleaner and more reusable.",
    "Generators in Python are functions that use the yield statement to return values one at a time, suspending execution until the next value is requested. Unlike regular functions that compute all values at once and return them, generators produce values lazily, which is memory-efficient when working with large datasets.",
    "Node.js uses an event-driven, non-blocking I/O model. The event loop allows Node.js to perform non-blocking operations despite JavaScript being single-threaded. It works by offloading operations to the system kernel whenever possible and registering callbacks to be executed when operations complete, allowing the program to handle many connections concurrently.",
    "In Java, an interface defines a contract of what a class can do without implementation details, while an abstract class can provide both method signatures and implementations. A class can implement multiple interfaces but extend only one abstract class. Use interfaces for unrelated classes that need to share behavior, and abstract classes for related classes that share code.",
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

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

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTechStacks, setAvailableTechStacks] = useState<TechStack[]>([]);
  const [questionsByStack, setQuestionsByStack] = useState<Record<string, Question[]>>({});
  const [useFreeMode, setUseFreeMode] = useState<boolean>(true); // Default to free mode

  // Fetch tech stacks on mount
  useEffect(() => {
    fetchTechStacks();
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
      }
    } catch (error) {
      console.error('Error fetching tech stacks:', error);
      toast.error('Failed to load tech stacks, using mock data');
      setAvailableTechStacks(mockTechStacks);
      setQuestionsByStack(mockQuestions);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch questions for a specific tech stack
  const fetchQuestionsForStack = async (stackId: string) => {
    try {
      const response = await questionAPI.getByTechStack(stackId);
      if (response.data && response.data.data) {
        const questions = response.data.data.map((q: ApiQuestion) => ({
          id: q._id,
          stackId: q.techStack,
          text: q.text,
          difficulty: q.difficulty
        }));
        
        setQuestionsByStack(prev => ({
          ...prev,
          [stackId]: questions
        }));
      }
    } catch (error) {
      console.error(`Error fetching questions for stack ${stackId}:`, error);
      // If API call fails, use mock data as fallback if available
      if (mockQuestions[stackId]) {
        setQuestionsByStack(prev => ({
          ...prev,
          [stackId]: mockQuestions[stackId]
        }));
      }
    }
  };

  const getQuestionsForStack = (stackId: string): Question[] => {
    return questionsByStack[stackId] || [];
  };

  const startInterview = async (candidateId: string, stackId: string): Promise<Interview> => {
    setIsLoading(true);
    
    try {
      // Call the actual API instead of simulating
      const response = await interviewAPI.create({
        candidate: candidateId,
        techStack: stackId,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: new Date().toISOString().split('T')[1].substring(0, 5),
        duration: 30
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('Failed to create interview');
      }
      
      const apiInterview = response.data.data;
      
      // Convert API format to our internal format
      const newInterview: Interview = {
        id: apiInterview._id,
        candidateId: apiInterview.candidate,
        stackId: apiInterview.techStack,
        status: 'in-progress',
        createdAt: apiInterview.createdAt,
        answers: []
      };
      
      setInterviews(prev => [...prev, newInterview]);
      setCurrentInterview(newInterview);
      toast.success('Interview started!');
      
      return newInterview;
    } catch (error) {
      console.error('Failed to start interview:', error);
      toast.error('Failed to start interview. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswer = async (interviewId: string, questionId: string, audioBlob: Blob, transcript?: string): Promise<void> => {
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
      
      if (useFreeMode) {
        // Free mode - use browser Speech Recognition if transcript provided, otherwise use mock
        if (!finalTranscript) {
          finalTranscript = await mockTranscribe(audioBlob);
        }
        
        // Use our rule-based evaluation service
        const evaluation = freeEvaluationService.evaluateAnswer(
          question.text, 
          finalTranscript, 
          stack?.name
        );
        
        score = evaluation.score;
        feedback = evaluation.feedback;
        criteria = evaluation.criteria;
        
        toast.success('Answer evaluated using local AI');
      } else {
        // Paid mode - Use OpenAI services
        // Step 1: Transcribe audio with Whisper API if no transcript provided
        if (!finalTranscript) {
          try {
            const transcriptionResponse = await aiAPI.transcribe(audioBlob);
            finalTranscript = transcriptionResponse.data.data;
            
            if (!finalTranscript) {
              throw new Error('Transcription failed');
            }
          } catch (error) {
            console.error('Transcription error:', error);
            toast.error('Transcription failed, using backup method');
            // Fallback to mock transcription in case of failure
            finalTranscript = await mockTranscribe(audioBlob);
          }
        }
        
        // Step 2: Evaluate answer with OpenAI GPT
        try {
          const evaluationResponse = await aiAPI.evaluate({
            question: question.text,
            transcript: finalTranscript,
            techStack: stack?.name
          });
          
          if (evaluationResponse.data && evaluationResponse.data.data) {
            const evaluation = evaluationResponse.data.data;
            score = evaluation.score;
            feedback = evaluation.feedback;
            criteria = evaluation.criteria;
          } else {
            throw new Error('Evaluation failed');
          }
        } catch (error) {
          console.error('Evaluation error:', error);
          toast.error('Evaluation failed, using backup method');
          // Fallback to mock evaluation in case of failure
          const mockEval = await mockEvaluateAnswer(question.text, finalTranscript);
          score = mockEval.score;
          feedback = mockEval.feedback;
        }
      }
      
      // Create answer object
      const answer: Answer = {
        id: Date.now().toString(),
        questionId,
        audioUrl,
        transcript: finalTranscript,
        score,
        feedback,
        criteria
      };
      
      // Try to upload the audio and save the answer to the database
      try {
        // Pass the Blob directly to the uploadAPI instead of creating a File
        console.log('Uploading audio file, size:', audioBlob.size, 'bytes');
        
        // Use the uploadAPI to handle the file upload properly
        const uploadResponse = await uploadAPI.uploadAudio(audioBlob);
        
        console.log('Upload response received:', uploadResponse);
        
        if (!uploadResponse.data || uploadResponse.data.success === false) {
          console.error('Upload failed with response:', uploadResponse);
          throw new Error('Failed to upload audio');
        }
        
        // Extract the file URL from the response
        const serverAudioUrl = uploadResponse.data.data.fileUrl;
        console.log('File uploaded successfully with URL:', serverAudioUrl);
        
        // Now save the answer with the proper server-side audio URL
        const answerResponse = await answerAPI.create({
          interview: interviewId,
          question: questionId,
          transcript: finalTranscript,
          audioUrl: serverAudioUrl
        });
        
        // If we got a response, update the local answer ID with the server-generated one
        if (answerResponse.data && answerResponse.data.data) {
          const createdAnswerId = answerResponse.data.data._id;
          answer.id = createdAnswerId;
          
          // Then update the answer with score, feedback, etc.
          await answerAPI.update(createdAnswerId, {
            score: score,
            feedback: feedback
          });
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

  return (
    <InterviewContext.Provider
      value={{
        availableTechStacks,
        questionsByStack,
        currentInterview,
        setCurrentInterview,
        interviews,
        startInterview,
        endInterview,
        getQuestionsForStack,
        saveAnswer,
        getInterviewDetails,
        isLoading,
        refreshTechStacks,
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
