import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInterview, Question } from '@/context/InterviewContext';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AudioRecorder from '@/components/AudioRecorder';
import { ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Maximum time per question in seconds (2 minutes)
const MAX_QUESTION_TIME = 120;

const Interview: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    currentInterview, 
    setCurrentInterview,
    interviews, 
    getQuestionsForStack, 
    saveAnswer,
    endInterview,
    useFreeMode
  } = useInterview();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [showComplete, setShowComplete] = useState(false);
  
  // New states for enhanced features
  const [timeRemaining, setTimeRemaining] = useState(MAX_QUESTION_TIME);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);
  const [timerWarning, setTimerWarning] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(0);
  
  // Refs
  const timerRef = useRef<number | null>(null);
  const autoSubmitRef = useRef<number | null>(null);

  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  
  // Listen for transcript updates from AudioRecorder
  useEffect(() => {
    const handleTranscriptUpdate = (event: CustomEvent) => {
      const { text, isFinal } = event.detail;
      setCurrentTranscript(text);
    };
    
    // Add event listener
    document.addEventListener('transcriptupdate', handleTranscriptUpdate as EventListener);
    
    // Cleanup
    return () => {
      document.removeEventListener('transcriptupdate', handleTranscriptUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    // Find the interview if we don't have it in state
    if (!currentInterview && interviewId) {
      const interview = interviews.find(i => i.id === interviewId);
      if (interview) {
        setCurrentInterview(interview);
        
        // Load questions for this stack
        const loadedQuestions = getQuestionsForStack(interview.stackId);
        setQuestions(loadedQuestions);
        
        // Initialize answered questions
        const answered = new Set<string>();
        interview.answers.forEach(answer => {
          answered.add(answer.questionId);
        });
        setAnsweredQuestions(answered);
      } else {
        // Interview not found, redirect
        navigate('/');
      }
    } else if (currentInterview) {
      // Load questions for this stack
      const loadedQuestions = getQuestionsForStack(currentInterview.stackId);
      setQuestions(loadedQuestions);
      
      // Initialize answered questions
      const answered = new Set<string>();
      currentInterview.answers.forEach(answer => {
        answered.add(answer.questionId);
      });
      setAnsweredQuestions(answered);
    }
    
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (autoSubmitRef.current) {
        window.clearInterval(autoSubmitRef.current);
      }
    };
  }, [currentInterview, interviewId, interviews, setCurrentInterview, getQuestionsForStack, navigate]);

  // Reset timer when changing questions
  useEffect(() => {
    setTimeRemaining(MAX_QUESTION_TIME);
    setHasTimerStarted(false);
    setTimerWarning(false);
    setAutoSubmitCountdown(0);
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (autoSubmitRef.current) {
      window.clearInterval(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }
  }, [currentQuestionIndex]);

  // Ensure the user has access to this interview
  if (!user || !currentInterview || (user.role === 'user' && user._id !== currentInterview.candidateId)) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="mt-2">You don't have permission to view this interview.</p>
          <Button className="mt-4" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  
  const handleAnswerSubmit = async (audioBlob: Blob, transcript?: string) => {
    if (!currentInterview || !currentQuestion) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the actual transcript captured during recording
      await saveAnswer(currentInterview.id, currentQuestion.id, audioBlob, transcript);
      
      // Add this question to answered questions
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.id));
      
      // Clear current transcript for the next question
      setCurrentTranscript('');
      
      // Move to next question if available
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setShowComplete(true);
      }
      
      setIsAnswering(false);
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error('Failed to save your answer. Please try again.');
    } finally {
      setIsSubmitting(false);
      setHasTimerStarted(false);
    }
  };

  const handleStartAnswering = () => {
    setIsAnswering(true);
    setHasTimerStarted(true);
    
    // Start the timer
    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prevTime => {
        const newTime = prevTime - 1;
        
        // Show warning when 30 seconds left
        if (newTime === 30) {
          setTimerWarning(true);
          toast.warning('30 seconds remaining for this question!');
        }
        
        // When time runs out, start auto-submit countdown
        if (newTime <= 0) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // Start auto-submit countdown (5 seconds)
          setAutoSubmitCountdown(5);
          autoSubmitRef.current = window.setInterval(() => {
            setAutoSubmitCountdown(prev => {
              const newCount = prev - 1;
              if (newCount <= 0) {
                // Time's up - auto skip
                if (autoSubmitRef.current) {
                  window.clearInterval(autoSubmitRef.current);
                  autoSubmitRef.current = null;
                }
                handleSkipQuestion();
                return 0;
              }
              return newCount;
            });
          }, 1000);
        }
        
        return Math.max(0, newTime);
      });
    }, 1000);
  };

  const handleFinishInterview = async () => {
    if (!currentInterview) return;
    
    setIsSubmitting(true);
    
    try {
      await endInterview(currentInterview.id);
      
      toast.success('Interview submitted successfully!');
      
      if (user.role === 'admin') {
        navigate(`/admin/report/${currentInterview.id}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to end interview:', error);
      toast.error('Failed to submit interview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipQuestion = () => {
    // Clear timers
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (autoSubmitRef.current) {
      window.clearInterval(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowComplete(true);
    }
    setIsAnswering(false);
    setHasTimerStarted(false);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = (answeredQuestions.size / questions.length) * 100;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4">
        {showComplete ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-interview-success mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Interview Complete!</h2>
              <p className="text-gray-600 mb-6">
                You've answered {answeredQuestions.size} out of {questions.length} questions. 
                Your responses will be evaluated by our AI system.
              </p>
              <Button onClick={handleFinishInterview} disabled={isSubmitting} className="min-w-40">
                {isSubmitting ? 'Submitting...' : 'Submit Interview'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-xs font-medium 
                  ${currentQuestion?.difficulty === 'easy' ? 'bg-green-100 text-green-800' : 
                    currentQuestion?.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'}`}
                >
                  {currentQuestion?.difficulty?.toUpperCase() || 'MEDIUM'}
                </div>
                
                {hasTimerStarted && (
                  <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium
                    ${timerWarning ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    <Clock size={12} />
                    <span>{formatTime(timeRemaining)}</span>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">{currentQuestion?.text || 'Loading question...'}</h2>
              
              {isAnswering ? (
                <div className="space-y-4">
                  <AudioRecorder 
                    onRecordingComplete={handleAnswerSubmit} 
                    isDisabled={isSubmitting}
                    useSpeechRecognition={true}
                  />
                  
                  {currentTranscript && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-medium text-blue-700 mb-1">Live Transcript:</p>
                      <p className="text-sm text-gray-700">{currentTranscript}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-between mt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleSkipQuestion}
                      disabled={isSubmitting}
                    >
                      Skip Question
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button 
                    onClick={() => {
                      setIsAnswering(true);
                      setHasTimerStarted(true);
                      handleStartAnswering();
                    }}
                    className="w-full"
                  >
                    Start Answering
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

// Helper function to get color for difficulty badges
const getDifficultyColor = (difficulty: string): string => {
  switch(difficulty) {
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

// Helper function to get first letter for difficulty badge
const getDifficultyInitial = (difficulty: string): string => {
  return difficulty.charAt(0).toUpperCase();
};

export default Interview;
