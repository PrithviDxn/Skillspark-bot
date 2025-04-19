import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInterview, Question } from '@/context/InterviewContext';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AudioRecorder from '@/components/AudioRecorder';
import { ArrowRight, CheckCircle } from 'lucide-react';

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
    endInterview
  } = useInterview();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [showComplete, setShowComplete] = useState(false);

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
  }, [currentInterview, interviewId, interviews, setCurrentInterview, getQuestionsForStack, navigate]);

  // Ensure the user has access to this interview
  if (!user || !currentInterview || (user.role === 'candidate' && user.id !== currentInterview.candidateId)) {
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
  
  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!currentInterview || !currentQuestion) return;
    
    setIsSubmitting(true);
    
    try {
      await saveAnswer(currentInterview.id, currentQuestion.id, audioBlob);
      
      // Mark question as answered
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.id));
      
      // If it's the last question, show completion
      if (currentQuestionIndex === questions.length - 1) {
        setShowComplete(true);
      } else {
        // Otherwise move to the next question
        setCurrentQuestionIndex(prev => prev + 1);
      }
      
      setIsAnswering(false);
    } catch (error) {
      console.error('Failed to save answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAnswering = () => {
    setIsAnswering(true);
  };

  const handleFinishInterview = async () => {
    if (!currentInterview) return;
    
    setIsSubmitting(true);
    
    try {
      await endInterview(currentInterview.id);
      
      if (user.role === 'admin') {
        navigate(`/admin/report/${currentInterview.id}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to end interview:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowComplete(true);
    }
    setIsAnswering(false);
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
                You've answered all the questions. The administrator will review your responses.
              </p>
              <Button onClick={handleFinishInterview} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Finish Interview'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium">Question {currentQuestionIndex + 1} of {questions.length}</h2>
                <span className="text-sm text-gray-500">
                  {answeredQuestions.size} answered
                </span>
              </div>
              <div className="interview-progress-bar">
                <div 
                  className="interview-progress-bar-fill" 
                  style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <Card className="question-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-1">
                  {currentQuestion?.text || 'Loading question...'}
                </h3>
                <div className="flex items-center mb-4">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                    Difficulty: {currentQuestion?.difficulty || 'medium'}
                  </span>
                </div>
                
                {isAnswering ? (
                  <div className="mt-6">
                    <AudioRecorder onRecordingComplete={handleRecordingComplete} isDisabled={isSubmitting} />
                    <div className="mt-4 flex justify-between">
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
                  <div className="mt-6">
                    <Button onClick={handleStartAnswering} className="w-full">
                      Answer This Question
                    </Button>
                    <div className="mt-4 text-center">
                      <button
                        onClick={handleSkipQuestion}
                        className="text-sm text-gray-500 hover:text-gray-900"
                      >
                        Skip to next question
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="mt-6 flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0 || isAnswering}
              >
                Previous Question
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQuestionIndex === questions.length - 1 || isAnswering}
              >
                Next Question
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Interview;
