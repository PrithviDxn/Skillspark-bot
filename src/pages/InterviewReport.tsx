import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInterview, Question, Interview as InterviewType, Answer } from '@/context/InterviewContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, Download, CheckCircle, XCircle, Info } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

type QuestionWithAnswer = {
  question: Question;
  answer: Answer | undefined;
};

// Add this interface for radar chart data
interface RadarChartData {
  subject: string;
  score: number;
  fullMark: number;
}

const InterviewReport: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  const { interviews, getQuestionsForStack, availableTechStacks } = useInterview();
  const navigate = useNavigate();
  
  const [interview, setInterview] = useState<InterviewType | null>(null);
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState<QuestionWithAnswer[]>([]);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [criteriaAverages, setCriteriaAverages] = useState<RadarChartData[] | null>(null);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  
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
          
          // Calculate criteria averages for radar chart
          const criteriaSum = {
            technicalAccuracy: 0,
            completeness: 0,
            clarity: 0,
            examples: 0,
            count: 0
          };
          
          // Process feedback to extract strengths and weaknesses
          const allStrengths: string[] = [];
          const allWeaknesses: string[] = [];
          
          answeredQuestions.forEach(answer => {
            if (answer.criteria) {
              criteriaSum.technicalAccuracy += answer.criteria.technicalAccuracy;
              criteriaSum.completeness += answer.criteria.completeness;
              criteriaSum.clarity += answer.criteria.clarity;
              criteriaSum.examples += answer.criteria.examples;
              criteriaSum.count++;
            }
            
            // Extract strengths and weaknesses from feedback
            const feedback = answer.feedback || '';
            if (feedback.includes('Strengths:')) {
              const strengthsSection = feedback.split('Strengths:')[1].split('Areas for improvement:')[0];
              const strengthPoints = strengthsSection.split('-').filter(item => item.trim().length > 0);
              
              strengthPoints.forEach(point => {
                const trimmed = point.trim();
                if (trimmed && !allStrengths.includes(trimmed)) {
                  allStrengths.push(trimmed);
                }
              });
            }
            
            if (feedback.includes('Areas for improvement:')) {
              const weaknessesSection = feedback.split('Areas for improvement:')[1];
              const weaknessPoints = weaknessesSection.split('-').filter(item => item.trim().length > 0);
              
              weaknessPoints.forEach(point => {
                const trimmed = point.trim();
                if (trimmed && !allWeaknesses.includes(trimmed)) {
                  allWeaknesses.push(trimmed);
                }
              });
            }
          });
          
          setStrengths(allStrengths.slice(0, 5)); // Limit to top 5
          setWeaknesses(allWeaknesses.slice(0, 5)); // Limit to top 5
          
          if (criteriaSum.count > 0) {
            setCriteriaAverages([
              {
                subject: 'Technical Accuracy',
                score: criteriaSum.technicalAccuracy / criteriaSum.count,
                fullMark: 10
              },
              {
                subject: 'Completeness',
                score: criteriaSum.completeness / criteriaSum.count,
                fullMark: 10
              },
              {
                subject: 'Clarity',
                score: criteriaSum.clarity / criteriaSum.count,
                fullMark: 10
              },
              {
                subject: 'Examples',
                score: criteriaSum.examples / criteriaSum.count,
                fullMark: 10
              }
            ]);
          }
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

  const getScoreText = (score: number | undefined) => {
    if (score === undefined) return 'Not Evaluated';
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Satisfactory';
    return 'Needs Improvement';
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
        
        {/* Summary Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Interview Performance Summary</CardTitle>
            <CardDescription>
              Overall assessment of the candidate's performance in this interview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <div className={`p-4 rounded-lg text-center ${averageScore ? (averageScore >= 7 ? 'bg-green-50' : averageScore >= 5 ? 'bg-yellow-50' : 'bg-red-50') : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-500 mb-1">Average Score</div>
                <div className="text-3xl font-bold">
                  {averageScore !== null ? averageScore.toFixed(1) : 'N/A'}
                  <span className="text-sm font-normal"> / 10</span>
                </div>
                {averageScore !== null && (
                  <div className="text-xs mt-1">
                    {getScoreText(averageScore)}
                  </div>
                )}
              </div>
            </div>
            
            {criteriaAverages && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-72">
                  <h3 className="text-sm font-medium text-center mb-2">Performance by Criteria</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={criteriaAverages}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.5}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Strengths</h3>
                    <ul className="space-y-2">
                      {strengths.length > 0 ? (
                        strengths.map((strength, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{strength}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500">No specific strengths identified</li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Areas for Improvement</h3>
                    <ul className="space-y-2">
                      {weaknesses.length > 0 ? (
                        weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-start">
                            <XCircle size={16} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{weakness}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500">No specific areas for improvement identified</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <h2 className="text-xl font-bold mb-4">Detailed Question Responses</h2>
        
        {questionsWithAnswers.map(({ question, answer }) => (
          <Card key={question.id} className="mb-6">
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center mb-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 
                        ${question.difficulty === 'easy' ? 'bg-green-100 text-green-800' : 
                          question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}
                      >
                        {question.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium">{question.text}</h3>
                  </div>
                  
                  {answer?.score !== undefined && (
                    <div className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 
                      ${answer.score >= 8 ? 'border-green-400 text-green-700' : 
                        answer.score >= 6 ? 'border-yellow-400 text-yellow-700' : 
                        'border-red-400 text-red-700'}`}
                    >
                      <div className="text-xl font-bold">{answer.score}</div>
                      <div className="text-xs">/ 10</div>
                    </div>
                  )}
                </div>
              </div>
              
              {answer ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Info size={16} className="mr-1" /> Audio Response
                    </h4>
                    {answer.audioUrl ? (
                      <audio src={answer.audioUrl} controls className="w-full" />
                    ) : (
                      <p className="text-sm text-gray-500">Audio not available</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Info size={16} className="mr-1" /> Transcript
                    </h4>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                      {answer.transcript || 'No transcript available'}
                    </div>
                  </div>
                  
                  {answer.feedback && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Info size={16} className="mr-1" /> AI Feedback
                      </h4>
                      <div className="p-4 bg-blue-50 rounded-lg text-sm whitespace-pre-line">
                        {answer.feedback}
                      </div>
                    </div>
                  )}
                  
                  {answer.criteria && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Info size={16} className="mr-1" /> Criteria Breakdown
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(answer.criteria).map(([key, value]) => (
                          <div key={key} className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </div>
                            <div className="text-lg font-medium">{value} <span className="text-xs">/ 10</span></div>
                          </div>
                        ))}
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
