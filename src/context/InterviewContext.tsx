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
  questionsByStack: Record<string, Question[]>;
  currentInterview: Interview | null;
  setCurrentInterview: React.Dispatch<React.SetStateAction<Interview | null>>;
  interviews: Interview[];
  startInterview: (candidateId: string, stackId: string) => Promise<Interview>;
  endInterview: (interviewId: string) => Promise<void>;
  getQuestionsForStack: (stackId: string) => Question[];
  saveAnswer: (interviewId: string, questionId: string, audioBlob: Blob, transcript?: string) => Promise<void>;
  getInterviewDetails: (interviewId: string) => Interview | null;
  refreshInterview: (interviewId: string) => Promise<Interview | null>;
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
const mockTranscribe = async (audioBlob: Blob, techStack?: string): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Tech stack specific responses
  const techStackResponses: Record<string, string[]> = {
    'React': [
    "React's virtual DOM is an in-memory representation of the real DOM. When state changes occur, React creates a new virtual DOM tree, compares it with the previous one (diffing), and updates only the parts that have changed in the real DOM. This process minimizes direct DOM manipulation, which is slow, resulting in better performance.",
    "React hooks are functions that let you use state and other React features in functional components. Before hooks, stateful logic required class components. Hooks like useState and useEffect allow us to add state and lifecycle methods to functional components, making them more powerful while keeping code cleaner and more reusable.",
      "JSX is a syntax extension for JavaScript that looks similar to HTML or XML. It allows us to write HTML structures in the same file as JavaScript code. React doesn't require JSX, but it makes the code more readable and writing templates more intuitive. Behind the scenes, JSX is transformed into regular JavaScript function calls."
    ],
    'Python': [
    "Generators in Python are functions that use the yield statement to return values one at a time, suspending execution until the next value is requested. Unlike regular functions that compute all values at once and return them, generators produce values lazily, which is memory-efficient when working with large datasets.",
      "Python uses dynamic typing, which means variable types are determined at runtime, not compile time. This allows for greater flexibility but requires more testing to catch type errors. Python 3.5+ introduced type hints, allowing developers to indicate expected types without enforcing them.",
      "List comprehensions in Python provide a concise way to create lists based on existing sequences. They consist of an expression followed by a for clause and optional if clauses. For example, [x**2 for x in range(10) if x % 2 == 0] creates a list of squares of even numbers from 0 to 9."
    ],
    'Node.js': [
    "Node.js uses an event-driven, non-blocking I/O model. The event loop allows Node.js to perform non-blocking operations despite JavaScript being single-threaded. It works by offloading operations to the system kernel whenever possible and registering callbacks to be executed when operations complete, allowing the program to handle many connections concurrently.",
      "Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. It's designed for building web applications and APIs, and has become the standard server framework for Node.js.",
      "Node.js package manager (npm) is the world's largest software registry, with approximately 1.3 million packages. It consists of a command line client and an online database of public and private packages. It allows developers to install, share, and manage dependencies in their applications."
    ],
    'Java': [
    "In Java, an interface defines a contract of what a class can do without implementation details, while an abstract class can provide both method signatures and implementations. A class can implement multiple interfaces but extend only one abstract class. Use interfaces for unrelated classes that need to share behavior, and abstract classes for related classes that share code.",
      "Java's garbage collection automatically handles memory management by identifying and removing objects that are no longer being used by the program. This prevents memory leaks and reduces the burden on developers. The Java Virtual Machine (JVM) has several garbage collection algorithms that can be selected based on application needs.",
      "Java's threading model allows for concurrent execution within a single process. The Runnable interface and Thread class provide ways to create and manage threads. Java 5 introduced the java.util.concurrent package with higher-level concurrency utilities like ExecutorService, which simplifies thread management."
    ],
    'C': [
      "C is a procedural programming language with static typing. Unlike object-oriented languages, C focuses on functions and has no built-in support for classes or objects. Its strength lies in its efficiency, portability, and direct access to memory through pointers.",
      "Memory management in C is manual, requiring explicit allocation with malloc() and deallocation with free(). This gives programmers precise control but also responsibility for preventing memory leaks and dangling pointers. Modern languages often use garbage collection to automate this process.",
      "C's preprocessor directives like #include and #define operate before compilation. #include inserts content from header files, while #define creates macros that substitute text. These powerful features enable code organization and parameterization, but can lead to subtle bugs if overused."
    ],
    'JavaScript': [
      "Closures in JavaScript occur when a function retains access to its lexical scope even when executed outside that scope. This allows for data encapsulation and the creation of factory functions. Closures are commonly used in event handlers, callbacks, and for creating private variables.",
      "Promises in JavaScript represent the eventual completion or failure of an asynchronous operation and its resulting value. They're used to handle asynchronous operations more cleanly than callbacks, avoiding 'callback hell'. The async/await syntax, built on promises, makes asynchronous code look and behave more like synchronous code.",
      "JavaScript's prototypal inheritance differs from classical inheritance in other languages. Each object has a prototype from which it inherits properties. When accessing a property, JavaScript looks up the prototype chain until it finds the property or reaches the end. This allows for dynamic inheritance patterns."
    ]
  };
  
  // Default responses for any tech stack not specifically covered
  const defaultResponses = [
    "This programming language/framework offers several key features like type safety, memory management, and a rich ecosystem of libraries. Its architecture is designed to handle both simple scripts and complex applications.",
    "The main advantage of this technology is its performance and versatility. Developers can use it for a wide range of applications, from web development to system programming, depending on the specific requirements.",
    "Best practices include maintaining clean, modular code with proper documentation. Error handling should be comprehensive, and code should be tested thoroughly before deployment. Performance optimizations should be considered when dealing with large datasets or high traffic."
  ];
  
  // Get responses for the specified tech stack, or use defaults
  const responses = techStackResponses[techStack || ''] || defaultResponses;
  
  // Return a random response from the appropriate list
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

// Add this interface for API interview data
interface ApiInterview {
  _id: string;
  candidate: { _id: string } | string;
  techStack: { _id: string } | string;
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
  score?: number;
  feedback?: string;
  criteria?: {
    technicalAccuracy: number;
    completeness: number;
    clarity: number;
    examples: number;
  };
}

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[DEBUG][InterviewContext] Provider mounted');
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTechStacks, setAvailableTechStacks] = useState<TechStack[]>([]);
  const [questionsByStack, setQuestionsByStack] = useState<Record<string, Question[]>>({});

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
  const [useFreeMode, setUseFreeMode] = useState<boolean>(true); // Default to free mode

  // Fetch tech stacks and interviews on mount
  useEffect(() => {
    fetchTechStacks();
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
      toast.error('Failed to load tech stacks, using mock data');
      setAvailableTechStacks(mockTechStacks);
      setQuestionsByStack(mockQuestions);
    } finally {
      setIsLoading(false);
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
    !!q.techStack && ((typeof q.techStack === 'object' && !!q.techStack._id) || typeof q.techStack === 'string')
  )
  .map((q: ApiQuestion) => ({
    id: q._id,
    stackId: typeof q.techStack === 'object' && q.techStack !== null ? q.techStack._id : 
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
      let usedMockTranscript = false; // Flag to track if mock transcript was used
      
      // Get the transcription
      if (!finalTranscript) {
        try {
          if (useFreeMode) {
            // In free mode, still use mock transcribe but mark it clearly
            finalTranscript = await mockTranscribe(audioBlob, stack?.name);
            usedMockTranscript = true; // Set the flag
            finalTranscript = `[MOCK TRANSCRIPT] ${finalTranscript}`;
            console.log('Using mock transcript (free mode):', finalTranscript.substring(0, 30));
          } else {
            // In paid mode, always use the real transcription API
            const transcriptionResponse = await aiAPI.transcribe(audioBlob);
            finalTranscript = transcriptionResponse.data.data;
            
            if (!finalTranscript) {
              throw new Error('Transcription failed');
            }
            console.log('Real transcript obtained:', finalTranscript.substring(0, 30));
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
      
      // Continue with evaluation either way
      if (useFreeMode) {
        // Free mode - use rule-based evaluation
        const evaluation = freeEvaluationService.evaluateAnswer(
          question.text, 
          finalTranscript, 
          stack?.name
        );
        
        score = evaluation.score;
        feedback = evaluation.feedback;
        criteria = evaluation.criteria;
        
        // Add note about mock transcript if applicable
        if (usedMockTranscript) {
          feedback = `[USING MOCK DATA] ${feedback}\n\nNote: This evaluation is based on auto-generated mock data, not your actual response.`;
        }
        
        toast.success('Answer evaluated using local AI');
      } else {
        // Paid mode - Use OpenAI services
        try {
          // Skip to evaluation - we already handled transcription above
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
          feedback = `[MOCK EVALUATION] ${mockEval.feedback}\n\nNote: This is an auto-generated mock evaluation because the AI evaluation service failed.`;
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
        
        // Now save the answer with ALL data including evaluation in one step
        const answerResponse = await answerAPI.create({
          interview: interviewId,
          question: questionId,
          transcript: finalTranscript,
          audioUrl: serverAudioUrl,
          score: score,
          feedback: feedback,
          criteria: formattedCriteria
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
      const formattedInterview: Interview = {
        id: apiInterview._id, // Use only _id from API
        candidateId: typeof apiInterview.candidate === 'object' ? apiInterview.candidate._id : apiInterview.candidate as string,
        stackId: typeof apiInterview.techStack === 'object' ? apiInterview.techStack._id : apiInterview.techStack as string,
        status: apiInterview.status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
        createdAt: apiInterview.createdAt,
        completedAt: apiInterview.completedAt,
        scheduledDate: apiInterview.scheduledDate,
        scheduledTime: apiInterview.scheduledTime,
        duration: apiInterview.duration,
        answers: []
      };
      
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
