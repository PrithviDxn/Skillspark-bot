import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { answerAPI, uploadAPI, aiAPI } from '@/api';
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
  // All hooks at the top
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
    useFreeMode,
    availableTechStacks,
    refreshInterview 
  } = useInterview();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [localAnswers, setLocalAnswers] = useState<any[]>([]);
  const [showComplete, setShowComplete] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(MAX_QUESTION_TIME);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);
  const [timerWarning, setTimerWarning] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(0);
  const timerRef = useRef<number | null>(null);
  const autoSubmitRef = useRef<number | null>(null);
  
  // Format date/time - moved after all hook declarations
  let formattedDate = '';
  let formattedTime = '';
  
  // Try to fetch interview if not found
  useEffect(() => {
    if (!currentInterview && interviewId) {
      refreshInterview(interviewId).then(fetched => {
        if (fetched) {
          setCurrentInterview(fetched);
          
          // Try to restore progress from storage (try sessionStorage first, then localStorage)
          const savedProgress = sessionStorage.getItem(`interview-progress-${interviewId}`) || 
                              localStorage.getItem(`interview-progress-${interviewId}`);
          if (savedProgress) {
            try {
              const progress = JSON.parse(savedProgress);
              console.log('Restored progress:', progress);
              if (progress.questionIndex !== undefined) {
                // Force a timeout to ensure this happens after initial render
                setTimeout(() => {
                  setCurrentQuestionIndex(progress.questionIndex);
                  console.log('Set question index to:', progress.questionIndex);
                }, 100);
              }
              if (progress.answeredQuestions && Array.isArray(progress.answeredQuestions)) {
                setAnsweredQuestions(new Set(progress.answeredQuestions));
              }
            } catch (e) {
              console.error('Failed to parse saved progress:', e);
            }
          }
        }
      });
    }
    if (currentInterview?.stackId && typeof getQuestionsForStack === 'function') {
      const stackQuestions = getQuestionsForStack(currentInterview.stackId);
      setQuestions(stackQuestions || []);
    }
    if (currentInterview?.scheduledDate) {
      try {
        const dateObj = new Date(currentInterview.scheduledDate);
        formattedDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        formattedTime = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      } catch (error) {
        formattedDate = 'Invalid date';
        formattedTime = 'Invalid time';
      }
    }
  }, [currentInterview, interviewId, refreshInterview, setCurrentInterview, getQuestionsForStack]);
  
  // Save progress to local storage whenever it changes
  useEffect(() => {
    if (interviewId && currentQuestionIndex !== undefined) {
      // Use sessionStorage instead of localStorage for more reliable session persistence
      try {
        sessionStorage.setItem(`interview-progress-${interviewId}`, JSON.stringify({
          questionIndex: currentQuestionIndex,
          answeredQuestions: Array.from(answeredQuestions)
        }));
        // Also save to localStorage as backup
        localStorage.setItem(`interview-progress-${interviewId}`, JSON.stringify({
          questionIndex: currentQuestionIndex,
          answeredQuestions: Array.from(answeredQuestions)
        }));
        console.log('Saved progress to storage:', currentQuestionIndex);
      } catch (e) {
        console.error('Failed to save progress:', e);
      }
    }
  }, [interviewId, currentQuestionIndex, answeredQuestions]);
  
  // Add the autoSubmitCountdown effect here at the top level
  useEffect(() => {
    if (autoSubmitCountdown > 0 && autoSubmitCountdown <= 5) {
      const timer = setTimeout(() => {
        setAutoSubmitCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoSubmitCountdown === 0 && isAnswering) {
      // Only execute this if timer has actually run out (timeRemaining === 0)
      // This check prevents the immediate auto-submit when starting to answer
      if (timeRemaining === 0) {
        handleRecordingComplete(new Blob(), '');
      }
    }
  }, [autoSubmitCountdown, isAnswering, timeRemaining]);
  
  // Get the stackId for convenience
  const stackId = currentInterview?.stackId;
  
  // Define currentQuestion at the top level after all hooks
  const currentQuestion = questions[currentQuestionIndex] || null;
  
  // Define tech stack name and warning
  const techStackName = currentInterview?.stackId ? 
    availableTechStacks.find(stack => stack.id === currentInterview.stackId)?.name || 'Unknown' : 
    'Loading...';
  const techStackWarning = !availableTechStacks.some(stack => stack.id === currentInterview?.stackId) && currentInterview ? 
    'Warning: This tech stack may not have questions available.' : 
    '';

  // Early returns
  if (!user) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="mt-2">You must be logged in to view this interview.</p>
          <Button className="mt-4" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
      </Layout>
    );
  }
  if (!currentInterview) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Interview Not Found</h1>
          <p className="mt-2">The interview could not be found. Please check the link or try refreshing.</p>
          <Button className="mt-4" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
      </Layout>
    );
  }
  if (user.role === 'user' && user._id !== currentInterview.candidateId) {
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
  if (!questions || questions.length === 0) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">No Questions Found</h1>
          <p className="mt-2">No questions are available for this interview's tech stack. Please contact an administrator.</p>
          <Button className="mt-4" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
      </Layout>
    );
  }

  const handleRecordingComplete = async (audioBlob: Blob, transcript?: string) => {
    if (!currentInterview || !questions[currentQuestionIndex]) return;
    setIsSubmitting(true);
    try {
      // Use the currentQuestion defined at the top level
      const answerObj = {
        interview: currentInterview.id,
        questionId: currentQuestion?.id || '',
        audioBlob,
        transcript,
        questionText: currentQuestion?.text || ''
      };
      
      // Store the answer but don't move to next question
      setLocalAnswers(prev => {
        // Replace if already exists for this question
        const filtered = prev.filter(a => a.questionId !== currentQuestion?.id);
        return [...filtered, answerObj];
      });
      
      // Mark as answered but don't change any other state
      if (currentQuestion?.id) {
        setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.id));
      }
      
      // Show a success message
      toast.success('Response recorded! You can re-record or move to the next question.');
      
      // Don't stop the timer or change question - let the user decide when to move on
    } catch (error) {
      console.error('Failed to store answer:', error);
      toast.error('Failed to store answer locally. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAnswering = () => {
    // Ensure time is reset when starting to answer
    setTimeRemaining(MAX_QUESTION_TIME);
    
    setIsAnswering(true);
    setHasTimerStarted(true);
    
    const handleTimeUp = () => {
      // When time is up, show a message and don't auto-submit
      toast.warning("Time's up! Your answer was not recorded. You can try again or navigate to another question.");
      setIsAnswering(false);
      setHasTimerStarted(false);
    };
    
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
                // Time's up - call our new handler instead of auto-skip
                if (autoSubmitRef.current) {
                  window.clearInterval(autoSubmitRef.current);
                  autoSubmitRef.current = null;
                }
                handleTimeUp();
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
      // Prepare answers for batch submission
      const batchAnswers = [];
      for (const local of localAnswers) {
        // 1. Upload audio
        let audioUrl = undefined;
        if (local.audioBlob) {
          try {
            const uploadRes = await uploadAPI.uploadAudio(local.audioBlob);
            audioUrl = uploadRes.data?.url || uploadRes.data?.audioUrl;
          } catch (err) {
            console.error('Audio upload failed:', err);
            toast.error('Audio upload failed for one of your answers.');
          }
        }
        // 2. Transcribe
        let transcript = local.transcript;
        if (!transcript && local.audioBlob) {
          try {
            const transRes = await aiAPI.transcribe(local.audioBlob);
            transcript = transRes.data?.data;
          } catch (err) {
            transcript = '[TRANSCRIPTION FAILED]';
            console.error('Transcription failed:', err);
          }
        }
        // 3. Evaluate
        let score, feedback, criteria;
        if (transcript && local.questionText) {
          try {
            const evalRes = await aiAPI.evaluate({
              question: local.questionText,
              transcript,
              techStack: (
                availableTechStacks.find(s => s.id === currentInterview.stackId)?.name ||
                undefined ||
                undefined
              )
            });
            if (evalRes.data?.data) {
              score = evalRes.data.data.score;
              feedback = evalRes.data.data.feedback;
              criteria = evalRes.data.data.criteria;
            }
          } catch (err) {
            console.error('Evaluation failed:', err);
          }
        }
        batchAnswers.push({
          interview: currentInterview.id,
          question: local.questionId,
          audioUrl,
          transcript,
          score,
          feedback,
          criteria
        });
      }
      if (batchAnswers.length > 0) {
        await answerAPI.batch(batchAnswers);
      }
      await endInterview(currentInterview.id);
      toast.success('Interview submitted successfully!');
      if (user.role === 'admin') {
        navigate(`/admin/report/${currentInterview.id}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to submit answers/interview:', error);
      toast.error('Failed to submit interview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipQuestion = () => {
    // Clear any existing timers
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoSubmitRef.current) {
      window.clearInterval(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }
    
    // Reset states
    setIsAnswering(false);
    setHasTimerStarted(false);
    setAutoSubmitCountdown(0);
    
    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowComplete(true);
    }
  };
  
  // Add a new function to move to next question (separate from skip)
  const handleNextQuestion = () => {
    // Same as skip but with a different message
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoSubmitRef.current) {
      window.clearInterval(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }
    
    // Reset states
    setIsAnswering(false);
    setHasTimerStarted(false);
    setAutoSubmitCountdown(0);
    
    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowComplete(true);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = (answeredQuestions.size / questions.length) * 100;

  // Add a function to detect mock transcripts
  const isMockTranscript = (text?: string): boolean => {
    if (!text) return false;
    
    // Check for our explicit mock markers
    if (text.includes('[MOCK TRANSCRIPT]')) return true;
    
    // Also check for common phrases from mock transcripts
    const mockPhrases = [
      "C is a procedural programming",
      "React's virtual DOM is",
      "Node.js uses an event-driven",
      "Generators in Python are",
      "In Java, an interface defines",
      "Closures in JavaScript occur",
      "Memory management in C is"
    ];
    
    return mockPhrases.some(phrase => text.includes(phrase));
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
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
            {/* Interview Info for Candidate */}
            <div className="mb-6">
              <div className="mb-2 p-3 bg-gray-50 rounded-md border text-sm">
                <div><span className="font-semibold">Tech Stack:</span> {techStackName}</div>
                {techStackWarning && (
                  <div className="text-xs text-red-600 mt-1">{techStackWarning}</div>
                )}
                <div><span className="font-semibold">Scheduled Date:</span> {formattedDate || 'Not specified'}</div>
                <div><span className="font-semibold">Scheduled Time:</span> {formattedTime || 'Not specified'}</div>
                <div><span className="font-semibold">Duration:</span> {currentInterview.duration} min</div>
              </div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium">Question {currentQuestionIndex + 1} of {questions.length}</h2>
                <span className="text-sm text-gray-500">
                  {answeredQuestions.size} answered
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-interview-primary rounded-full" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div>
                  {hasTimerStarted && (
                    <div className={`flex items-center ${timeRemaining <= 30 ? 'text-red-500' : 'text-gray-500'} mb-4 justify-end`}>
                      <Clock size={18} className="mr-2" />
                      <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                  
                  {autoSubmitCountdown > 0 && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 flex items-center">
                      <AlertCircle size={20} className="mr-2" />
                      <span>Time's up! Moving to next question in {autoSubmitCountdown} seconds...</span>
                    </div>
                  )}
                
                  <div className="flex items-center mb-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs font-medium ${getDifficultyColor(currentQuestion?.difficulty || 'medium')}`}>
                      {getDifficultyInitial(currentQuestion?.difficulty || 'medium')}
                    </span>
                    <span className="text-sm font-medium text-gray-500">
                      {currentQuestion?.difficulty?.toUpperCase() || 'MEDIUM'} 
                    </span>
                  </div>
                  
                  {/* Only show question text if user has clicked Answer This Question */}
                  {isAnswering && (
                    <h3 className="text-xl font-medium mb-6">
                      {currentQuestion?.text || 'Loading question...'}
                    </h3>
                  )}
                </div>
                
                {isAnswering ? (
                  <div className="mt-6">
                    <AudioRecorder 
                      onRecordingComplete={handleRecordingComplete} 
                      isDisabled={isSubmitting}
                      useSpeechRecognition={useFreeMode}
                    />
                    <div className="mt-4 flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          // Reset recording state but keep timer running
                          setIsAnswering(false);
                          setTimeout(() => setIsAnswering(true), 100);
                        }}
                        disabled={isSubmitting}
                      >
                        Re-record Response
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleNextQuestion}
                        disabled={isSubmitting}
                      >
                        {currentQuestionIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <Button onClick={handleStartAnswering} className="w-full">
                      Answer This Question
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="mt-6 flex justify-end">
              {currentQuestionIndex === questions.length - 1 ? (
                <Button 
                  variant="outline" 
                  onClick={handleFinishInterview}
                  disabled={isAnswering}
                >
                  Finish Interview
                  <CheckCircle size={16} className="ml-2" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={isAnswering}
                >
                  Next Question
                  <ArrowRight size={16} className="ml-2" />
                </Button>
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
