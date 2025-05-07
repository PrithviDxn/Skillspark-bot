import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { answerAPI, uploadAPI, aiAPI } from '@/api';
import { useInterview, Question } from '@/context/InterviewContext';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AudioRecorder from '@/components/AudioRecorder';
import CodeEditor from '@/components/CodeEditor';
import { ArrowRight, CheckCircle, Clock, AlertCircle, Code } from 'lucide-react';
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
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState('');
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
    // Load questions from all tech stacks associated with this interview
    if (typeof getQuestionsForStack === 'function') {
      let allQuestions: Question[] = [];
      
      // First check for multiple tech stacks (new format)
      if (currentInterview?.techStackIds && Array.isArray(currentInterview.techStackIds) && currentInterview.techStackIds.length > 0) {
        // Load questions from each tech stack and combine them
        currentInterview.techStackIds.forEach(stackId => {
          const stackQuestions = getQuestionsForStack(stackId);
          if (stackQuestions && stackQuestions.length > 0) {
            allQuestions = [...allQuestions, ...stackQuestions];
          }
        });
      } 
      // Fallback to single tech stack (backward compatibility)
      else if (currentInterview?.stackId) {
        const stackQuestions = getQuestionsForStack(currentInterview.stackId);
        if (stackQuestions) {
          allQuestions = stackQuestions;
        }
      }
      
      // Shuffle the questions to mix them up from different tech stacks
      const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
      setQuestions(shuffledQuestions);
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

  // Function to save both code and audio response with a single button
  const handleSaveResponse = async () => {
    if (!currentInterview || !currentQuestion) return;
    
    setIsSubmitting(true);
    toast.info('Saving your response...');
    
    try {
      // Get the latest code from the state
      const codeToSave = code;
      
      // Find the existing audio recording for this question (if any)
      const existingAnswer = localAnswers.find(a => a.questionId === currentQuestion.id);
      const audioBlob = existingAnswer?.audioBlob;
      const transcript = existingAnswer?.transcript || '';
      
      // Create a local answer object to display immediately (do this early to improve perceived performance)
      const localAnswer = {
        id: Date.now().toString(),
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        audioBlob: audioBlob,
        audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : '',
        transcript: transcript,
        code: showCodeEditor ? codeToSave : '',
        score: null, // Will be updated later
        feedback: null, // Will be updated later
        criteria: null // Will be updated later
      };
      
      // Add to local answers array immediately
      setLocalAnswers(prev => {
        // Replace if already exists for this question
        const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
        return [...filtered, localAnswer];
      });
      
      // Mark this question as answered immediately
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.id));
      
      // Save progress to sessionStorage immediately
      const progress = {
        questionIndex: currentQuestionIndex,
        answeredQuestions: Array.from(answeredQuestions).concat(currentQuestion.id)
      };
      sessionStorage.setItem(`interview-progress-${interviewId}`, JSON.stringify(progress));
      localStorage.setItem(`interview-progress-${interviewId}`, JSON.stringify(progress));
      
      // Upload the audio file if available - do this in parallel
      let audioUploadPromise = Promise.resolve('');
      let audioUrl = existingAnswer?.audioUrl || '';
      if (audioBlob) {
        audioUploadPromise = uploadAPI.uploadAudio(audioBlob)
          .then(response => {
            audioUrl = response.data.data.fileUrl;
            console.log('Audio uploaded successfully:', audioUrl);
            return audioUrl;
          })
          .catch(uploadError => {
            console.error('Error uploading audio:', uploadError);
            toast.error('Failed to upload audio');
            return '';
          });
      }
      
      // AI evaluation - do this in parallel
      let aiEvaluationPromise = Promise.resolve(null);
      if (transcript || (showCodeEditor && codeToSave)) {
        // Get the tech stack name
        const techStackName = availableTechStacks.find(s => s.id === currentInterview.stackId)?.name || 'Unknown';
        
        console.log('Sending to AI for evaluation:', {
          question: currentQuestion.text,
          transcript: transcript || 'No verbal response provided.',
          techStack: techStackName,
          code: showCodeEditor ? codeToSave : undefined
        });
        
        // Make sure we're sending non-empty values
        aiEvaluationPromise = aiAPI.evaluate({
          question: currentQuestion.text,
          transcript: transcript || 'No verbal response provided.',
          techStack: techStackName,
          code: showCodeEditor && codeToSave ? codeToSave : undefined
        })
        .then(evaluationResponse => {
          if (evaluationResponse.data && evaluationResponse.data.data) {
            console.log('AI evaluation received:', evaluationResponse.data.data);
            return evaluationResponse.data.data;
          } else {
            console.error('AI evaluation response missing data:', evaluationResponse);
            toast.error('Invalid AI evaluation response format');
            return null;
          }
        })
        .catch(aiError => {
          console.error('Error getting AI evaluation:', aiError);
          toast.error('Failed to get AI evaluation');
          return null;
        });
      }
      
      // Wait for both promises to complete
      const [audioUrlResult, aiEvaluation] = await Promise.all([
        audioUploadPromise,
        aiEvaluationPromise
      ]);
      
      // Update local answer with AI evaluation results
      if (aiEvaluation) {
        setLocalAnswers(prev => {
          return prev.map(a => {
            if (a.questionId === currentQuestion.id) {
              return {
                ...a,
                score: aiEvaluation.score || null,
                feedback: aiEvaluation.feedback || null,
                criteria: aiEvaluation.criteria || null
              };
            }
            return a;
          });
        });
      }
      
      // Save the answer to the database
      try {
        // Create a blob from the audio URL if we have one
        let audioBlobToSave: Blob | null = null;
        if (audioBlob) {
          audioBlobToSave = audioBlob;
        } else {
          // Create an empty blob with the code as text content
          const codeText = showCodeEditor ? codeToSave : '';
          audioBlobToSave = new Blob([codeText], { type: 'audio/webm' });
        }
        
        // Call saveAnswer with the correct parameters according to the interface
        await saveAnswer(
          currentInterview.id,
          currentQuestion.id,
          audioBlobToSave,
          transcript, // Pass transcript as the 4th parameter
          showCodeEditor ? codeToSave : '' // Pass code as the 5th parameter
        );
        console.log('Answer saved to database');
      } catch (saveError) {
        console.error('Error saving answer to database:', saveError);
      }
      
      toast.success('Response saved successfully! Click "Next Question" when you are ready to continue.');
      // Do NOT automatically navigate to the next question - let the user decide when to move on
      // This fixes the issue where the UI would be confusing after saving a response
    } catch (error) {
      console.error('Error saving response:', error);
      toast.error('Failed to save response');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRecordingComplete = async (audioBlob: Blob, transcript?: string) => {
    if (!currentInterview || !currentQuestion) return;
    
    setIsSubmitting(true);
    
    try {
      console.log('Recording complete with transcript:', transcript);
      
      // Check if transcript is empty or contains the placeholder text
      const actualTranscript = transcript && !transcript.includes('[TRANSCRIPT FROM WEB SPEECH API NOT AVAILABLE]') 
        ? transcript 
        : '';
        
      console.log('Using transcript:', actualTranscript);
      
      // Upload the audio file to get a URL
      let audioUrl = '';
      try {
        const uploadResponse = await uploadAPI.uploadAudio(audioBlob);
        audioUrl = uploadResponse.data.data.fileUrl;
        console.log('Audio uploaded successfully:', audioUrl);
      } catch (uploadError) {
        console.error('Error uploading audio:', uploadError);
        toast.error('Failed to upload audio');
      }
      
      // If we have a transcript and code, send to AI for evaluation
      let aiEvaluation = null;
      if (actualTranscript || (showCodeEditor && code)) {
        try {
          console.log('Sending to AI for evaluation:', {
            question: currentQuestion.text,
            transcript: actualTranscript,
            techStack: currentInterview.stackName,
            code: showCodeEditor ? code : undefined
          });
          
          const evaluationResponse = await aiAPI.evaluate({
            question: currentQuestion.text,
            transcript: actualTranscript || 'No verbal response provided.',
            techStack: currentInterview.stackName,
            code: showCodeEditor ? code : undefined
          });
          
          aiEvaluation = evaluationResponse.data.data;
          console.log('AI evaluation received:', aiEvaluation);
        } catch (aiError) {
          console.error('Error getting AI evaluation:', aiError);
          toast.error('Failed to get AI evaluation');
        }
      }
      
      // Save the answer to the database
      try {
        // Create a blob from the audio URL
        let audioBlobToSave: Blob;
        try {
          // Convert the audio URL back to a blob
          const response = await fetch(audioUrl);
          audioBlobToSave = await response.blob();
        } catch (error) {
          console.error('Error converting audio URL to blob:', error);
          // Create an empty blob as fallback
          audioBlobToSave = new Blob([], { type: 'audio/webm' });
        }
        
        // Call saveAnswer with individual parameters
        await saveAnswer(
          currentInterview.id,
          currentQuestion.id,
          audioBlobToSave,
          actualTranscript,
          showCodeEditor ? code : ''
        );
        console.log('Answer saved to database');
      } catch (saveError) {
        console.error('Error saving answer to database:', saveError);
      }
      
      // Create a local answer object to display immediately
      const localAnswer = {
        id: Date.now().toString(),
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        audioBlob,
        audioUrl: URL.createObjectURL(audioBlob),
        transcript: actualTranscript,
        code: showCodeEditor ? code : '',
        score: aiEvaluation?.score || null,
        feedback: aiEvaluation?.feedback || null,
        criteria: aiEvaluation?.criteria || null
      };
      
      // Add to local answers array
      setLocalAnswers(prev => {
        // Replace if already exists for this question
        const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
        return [...filtered, localAnswer];
      });
      
      // Mark this question as answered
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.id));
      
      // Save progress to sessionStorage
      const progress = {
        questionIndex: currentQuestionIndex,
        answeredQuestions: Array.from(answeredQuestions).concat(currentQuestion.id)
      };
      sessionStorage.setItem(`interview-progress-${interviewId}`, JSON.stringify(progress));
      localStorage.setItem(`interview-progress-${interviewId}`, JSON.stringify(progress));
      
      toast.success('Answer recorded and evaluated! You can continue editing your code or move to the next question when ready.');
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error('Failed to save answer');
    } finally {
      setIsSubmitting(false);
      // Don't automatically end answering or clear the code editor
      // setIsAnswering(false);
      // setShowCodeEditor(false);
      // setCode('');
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
      
      // Process each local answer
      for (const local of localAnswers) {
        // 1. Upload audio
        let audioUrl = undefined;
        if (local.audioBlob) {
          try {
            console.log('[DEBUG] Uploading audio blob:', local.audioBlob);
            const uploadRes = await uploadAPI.uploadAudio(local.audioBlob);
            console.log('[DEBUG] Upload response data:', uploadRes.data);
            
            // Extract the URL from the normalized response
            audioUrl = uploadRes.data?.url;
            
            // If that's not available, try other possible locations
            if (!audioUrl) {
              audioUrl = uploadRes.data?.data?.fileUrl || uploadRes.data?.fileUrl || uploadRes.data?.audioUrl;
              console.log('[DEBUG] Using fallback URL location:', audioUrl);
            }
            
            console.log('[DEBUG] Final extracted audioUrl:', audioUrl);
          } catch (err) {
            console.error('Audio upload failed:', err);
            toast.error('Audio upload failed for one of your answers.');
          }
        }
        
        // 2. Use transcript from AudioRecorder component
        let transcript = local.transcript;
        if (!transcript && local.audioBlob) {
          // If transcript is missing but we have audio, use a placeholder
          transcript = '[TRANSCRIPT FROM WEB SPEECH API NOT AVAILABLE]';
          console.log('[DEBUG] Using placeholder for missing transcript');
        }
        
        // Log the transcript for debugging
        if (transcript) {
          console.log('[DEBUG] Using transcript:', transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''));
        }
        
        // 3. Evaluate using Cohere AI
        let score = 0, feedback = '';
        let criteria: { technicalAccuracy: number; completeness: number; clarity: number; examples: number } = {
          technicalAccuracy: 0,
          completeness: 0,
          clarity: 0,
          examples: 0
        };
        if (transcript && local.questionText) {
          try {
            console.log('[DEBUG] Using Cohere AI for evaluation');
            const techStackName = availableTechStacks.find(s => s.id === currentInterview.stackId)?.name || '';
            
            // Use the AI API for evaluation
            const evaluationResponse = await aiAPI.evaluate({
              question: local.questionText,
              transcript: transcript,
              techStack: techStackName,
              code: local.code || '',
              codeLanguage: local.codeLanguage || 'javascript'
            });
            
            if (evaluationResponse.data && evaluationResponse.data.data) {
              const evaluation = evaluationResponse.data.data;
              score = evaluation.score;
              feedback = evaluation.feedback;
              criteria = evaluation.criteria;
              
              console.log('[DEBUG] Cohere AI evaluation successful:', { 
                score, 
                criteriaKeys: Object.keys(criteria),
                technicalAccuracy: criteria.technicalAccuracy,
                completeness: criteria.completeness,
                clarity: criteria.clarity,
                examples: criteria.examples
              });
            }
          } catch (err) {
            console.error('Local evaluation failed:', err);
            // Create a basic evaluation if the service fails
            score = 5; // Default middle score
            feedback = 'Your answer has been recorded, but automatic evaluation failed. An admin will review your response.';
            criteria = {
              technicalAccuracy: 5,
              completeness: 5,
              clarity: 5,
              examples: 5
            };
          }
        }
        
        // 4. Create the answer object to be sent to the server
        console.log('[DEBUG] Creating answer object with audioUrl:', audioUrl);
        batchAnswers.push({
          interview: currentInterview.id,
          question: local.questionId,
          audioUrl,
          transcript,
          code: local.code || '',
          codeLanguage: local.codeLanguage || 'javascript',
          score,
          feedback,
          criteria
        });
        
        console.log('[DEBUG] Answer object pushed to batch:', {
          questionId: local.questionId,
          audioUrl,
          transcript: transcript ? transcript.substring(0, 30) + '...' : 'undefined',
          score
        });
      }
      if (batchAnswers.length > 0) {
        try {
          await answerAPI.batch(batchAnswers);
          console.log('Batch answers submitted successfully:', batchAnswers.length);
        } catch (batchError) {
          console.error('Failed to submit batch answers:', batchError);
          toast.error('Some answers may not have been saved properly. Please contact support.');
          
          // Try to submit answers one by one as fallback
          for (const answer of batchAnswers) {
            try {
              await answerAPI.create(answer);
              console.log('Individual answer submitted successfully:', answer.question);
            } catch (singleError) {
              console.error('Failed to submit individual answer:', singleError);
            }
          }
        }
      }
      
      try {
        await endInterview(currentInterview.id);
        toast.success('Interview submitted successfully!');
        if (user.role === 'admin') {
          navigate(`/admin/report/${currentInterview.id}`);
        } else {
          navigate('/');
        }
      } catch (endError) {
        console.error('Failed to end interview:', endError);
        toast.error('Failed to mark interview as completed, but your answers were saved.');
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
                      onRecordingComplete={(audioBlob, transcript) => {
                        // Store the recording in local state without saving to database yet
                        if (!currentQuestion) return;
                        
                        // Create a local answer object to display immediately
                        const localAnswer = {
                          id: Date.now().toString(),
                          questionId: currentQuestion.id,
                          questionText: currentQuestion.text,
                          audioBlob,
                          audioUrl: URL.createObjectURL(audioBlob),
                          transcript: transcript || '',
                          code: showCodeEditor ? code : '',
                          score: null,
                          feedback: null,
                          criteria: null
                        };
                        
                        // Add to local answers array
                        setLocalAnswers(prev => {
                          // Replace if already exists for this question
                          const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
                          return [...filtered, localAnswer];
                        });
                        
                        toast.success('Recording completed! Click "Save Response" when you are ready to submit.');
                      }} 
                      isDisabled={isSubmitting}
                      useSpeechRecognition={useFreeMode}
                    />
                    
                    <div className="mt-4 flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCodeEditor(!showCodeEditor)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2"
                      >
                        <Code size={16} />
                        {showCodeEditor ? 'Hide Code Editor' : 'Show Code Editor'}
                      </Button>
                    </div>
                    
                    {showCodeEditor && (
                      <div className="mt-4">
                        <CodeEditor
                          initialValue={code}
                          onChange={setCode}
                          onSave={(value) => {
                            setCode(value);
                            toast.success('Code saved!');
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-center gap-4">
                      <Button 
                        variant="default" 
                        onClick={handleSaveResponse}
                        disabled={isSubmitting}
                        className="flex-1 max-w-xs"
                      >
                        Save Response
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleNextQuestion}
                        disabled={isSubmitting}
                        className="flex-1 max-w-xs"
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
