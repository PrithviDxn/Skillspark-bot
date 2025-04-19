
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInterview, Question, Interview as InterviewType, Answer } from '@/context/InterviewContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, Download } from 'lucide-react';

type QuestionWithAnswer = {
  question: Question;
  answer: Answer | undefined;
};

const InterviewReport: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  const { interviews, getQuestionsForStack, availableTechStacks } = useInterview();
  const navigate = useNavigate();
  
  const [interview, setInterview] = useState<InterviewType | null>(null);
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState<QuestionWithAnswer[]>([]);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  
  useEffect(() => {
    if (reportId) {
      const foundInterview = interviews.find(i => i.id === reportId);
      
      if (foundInterview) {
        setInterview(foundInterview);
        
        // Get questions for this stack
        const questions = getQuestionsForStack(foundInterview.stackId);
        
        // Map questions to their answers
        const qaMap = questions.map(question => ({
          question,
          answer: foundInterview.answers.find(a => a.questionId === question.id)
        }));
        
        setQuestionsWithAnswers(qaMap);
        
        // Calculate average score
        const answeredQuestions = foundInterview.answers.filter(a => a.score !== undefined);
        
        if (answeredQuestions.length > 0) {
          const total = answeredQuestions.reduce((sum, answer) => sum + (answer.score || 0), 0);
          setAverageScore(total / answeredQuestions.length);
        }
      }
    }
  }, [reportId, interviews, getQuestionsForStack]);
  
  // Get tech stack name
  const techStack = interview
    ? availableTechStacks.find(stack => stack.id === interview.stackId)
    : null;
  
  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="mt-2">Only administrators can view interview reports.</p>
          <Button className="mt-4" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
      </Layout>
    );
  }
  
  if (!interview) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Interview Not Found</h1>
          <p className="mt-2">The requested interview report could not be found.</p>
          <Button className="mt-4" onClick={() => navigate('/admin/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const getScoreColor = (score: number | undefined) => {
    if (score === undefined) return 'bg-gray-200 text-gray-800';
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/dashboard')}
          className="mb-6"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {techStack?.name || 'Unknown'} Interview Report
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar size={16} className="mr-1" />
                <span>
                  {formatDate(interview.createdAt)}
                </span>
              </div>
              <div className="flex items-center">
                <Clock size={16} className="mr-1" />
                <span>
                  {interview.status}
                </span>
              </div>
              <div className="flex items-center">
                <User size={16} className="mr-1" />
                <span>
                  Candidate #{interview.candidateId}
                </span>
              </div>
            </div>
          </div>
          
          <Button className="flex items-center">
            <Download size={16} className="mr-2" />
            Export Report
          </Button>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500 mb-1">Questions</div>
                <div className="text-3xl font-bold">
                  {questionsWithAnswers.length}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500 mb-1">Answered</div>
                <div className="text-3xl font-bold">
                  {interview.answers.length}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500 mb-1">Average Score</div>
                <div className="text-3xl font-bold">
                  {averageScore !== null ? averageScore.toFixed(1) : 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <h2 className="text-xl font-bold mb-4">Question Responses</h2>
        
        {questionsWithAnswers.map(({ question, answer }) => (
          <Card key={question.id} className="mb-6">
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">{question.text}</h3>
                  <div className="flex items-center">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 mr-2">
                      {question.difficulty}
                    </span>
                    {answer?.score !== undefined && (
                      <span className={`text-xs px-2 py-1 rounded ${getScoreColor(answer.score)}`}>
                        Score: {answer.score}/10
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {answer ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Audio Response
                    </h4>
                    {answer.audioUrl ? (
                      <audio src={answer.audioUrl} controls className="w-full" />
                    ) : (
                      <p className="text-sm text-gray-500">Audio not available</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Transcript
                    </h4>
                    <div className="p-3 bg-gray-50 rounded text-sm">
                      {answer.transcript || 'No transcript available'}
                    </div>
                  </div>
                  
                  {answer.feedback && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        AI Feedback
                      </h4>
                      <div className="p-3 bg-blue-50 rounded text-sm">
                        {answer.feedback}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No answer provided for this question</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
};

export default InterviewReport;
