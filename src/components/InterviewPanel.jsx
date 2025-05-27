import React, { useState, useEffect, useRef } from 'react';
import { useInterview, Question } from '@/context/InterviewContext';
import AudioRecorder from '@/components/AudioRecorder';
import { Button } from '@/components/ui/button';
import { Code, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MAX_QUESTION_TIME = 120;

const InterviewPanel = ({ interviewId }) => {
  const { currentInterview, getQuestionsForStack, saveAnswer, availableTechStacks, useFreeMode, refreshInterview } = useInterview();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [localAnswers, setLocalAnswers] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(MAX_QUESTION_TIME);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(0);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState('');
  const timerRef = useRef(null);
  const autoSubmitRef = useRef(null);

  useEffect(() => {
    if (!currentInterview && interviewId) {
      refreshInterview(interviewId).then(fetched => {
        if (fetched) {
          // ... (restore progress logic if needed)
        }
      });
    }
    if (typeof getQuestionsForStack === 'function') {
      let allQuestions = [];
      if (currentInterview?.techStackIds && Array.isArray(currentInterview.techStackIds) && currentInterview.techStackIds.length > 0) {
        currentInterview.techStackIds.forEach(stackId => {
          const stackQuestions = getQuestionsForStack(stackId);
          if (stackQuestions && stackQuestions.length > 0) {
            allQuestions = [...allQuestions, ...stackQuestions];
          }
        });
      } else if (currentInterview?.stackId) {
        const stackQuestions = getQuestionsForStack(currentInterview.stackId);
        if (stackQuestions) {
          allQuestions = stackQuestions;
        }
      }
      const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
      setQuestions(shuffledQuestions);
    }
  }, [currentInterview, interviewId, refreshInterview, getQuestionsForStack]);

  const currentQuestion = questions[currentQuestionIndex] || null;

  const handleSaveResponse = async () => {
    if (!currentInterview || !currentQuestion) return;
    setIsSubmitting(true);
    toast.info('Saving your response...');
    try {
      const codeToSave = code;
      const existingAnswer = localAnswers.find(a => a.questionId === currentQuestion.id);
      const audioBlob = existingAnswer?.audioBlob;
      const transcript = existingAnswer?.transcript || '';
      let audioBlobToSave = audioBlob || new Blob([codeToSave], { type: 'audio/webm' });
      await saveAnswer(
        currentInterview.id,
        currentQuestion.id,
        audioBlobToSave,
        transcript,
        showCodeEditor ? codeToSave : ''
      );
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.id));
      toast.success('Response saved!');
    } catch (error) {
      toast.error('Failed to save response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAnswering = () => {
    setTimeRemaining(MAX_QUESTION_TIME);
    setIsAnswering(true);
    setHasTimerStarted(true);
    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prevTime => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
        return Math.max(0, newTime);
      });
    }, 1000);
  };

  const handleNextQuestion = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAnswering(false);
    setHasTimerStarted(false);
    setAutoSubmitCountdown(0);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentInterview || !currentQuestion) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-sm mx-auto flex flex-col gap-4 border border-gray-200">
      <div className="text-xs text-gray-500 mb-1">Question {currentQuestionIndex + 1} of {questions.length}</div>
      <div className="font-semibold text-base mb-2">{currentQuestion.text}</div>
      {hasTimerStarted && (
        <div className={`flex items-center ${timeRemaining <= 30 ? 'text-red-500' : 'text-gray-500'} mb-2 justify-end`}>
          <Clock size={16} className="mr-1" />
          <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
        </div>
      )}
      {isAnswering ? (
        <>
          <AudioRecorder
            onRecordingComplete={(audioBlob, transcript) => {
              if (!currentQuestion) return;
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
              setLocalAnswers(prev => {
                const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
                return [...filtered, localAnswer];
              });
              toast.success('Recording completed! Click "Save Response".');
            }}
            isDisabled={isSubmitting}
            useSpeechRecognition={useFreeMode}
          />
          <div className="mt-2 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              disabled={isSubmitting}
              className="flex items-center gap-2 text-xs px-2 py-1"
            >
              <Code size={14} />
              {showCodeEditor ? 'Hide Code Editor' : 'Show Code Editor'}
            </Button>
          </div>
          {showCodeEditor && (
            <div className="mt-2">
              {/* You can add a compact code editor here if needed */}
              <textarea
                className="w-full border rounded p-2 text-xs"
                rows={4}
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Type your code here..."
              />
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <Button
              variant="default"
              onClick={handleSaveResponse}
              disabled={isSubmitting}
              className="flex-1 text-xs"
            >
              Save Response
            </Button>
            <Button
              variant="outline"
              onClick={handleNextQuestion}
              disabled={isSubmitting}
              className="flex-1 text-xs"
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </>
      ) : (
        <Button onClick={handleStartAnswering} className="w-full text-xs">
          Answer This Question
        </Button>
      )}
    </div>
  );
};

export default InterviewPanel; 