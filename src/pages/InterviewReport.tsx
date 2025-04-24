import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInterview, Question, Interview as InterviewType } from '@/context/InterviewContext';
import { answerAPI } from '@/api';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, Download, CheckCircle, XCircle, Info, RefreshCw, ChevronLeft } from 'lucide-react';
import AudioPlayer from '@/components/AudioPlayer';
import TranscriptViewer from '@/components/TranscriptViewer';
import RadarChartDisplay from '@/components/RadarChartDisplay';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend as RechartsLegend
} from 'recharts';
import { toast } from 'sonner';

// Define QuestionObject interface for embedded question data
interface QuestionObject {
  _id: string;
  text: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Add interface for API answer data
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

// Extended Answer interface to handle questionId either as string or object
interface Answer {
  id: string;
  questionId: string | QuestionObject;
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

// Add a function to properly format audio URLs
const getFullAudioUrl = (relativeUrl?: string): string | undefined => {
  if (!relativeUrl) return undefined;
  
  // If it's already an absolute URL, return it as is
  if (relativeUrl.startsWith('http')) {
    console.log('Audio URL is already absolute:', relativeUrl);
    return relativeUrl;
  }
  
  // Extract just the filename if it's a path
  const filename = relativeUrl.split('/').pop() || relativeUrl;
  
  // Base URL (without /api/v1)
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  const baseServerUrl = baseUrl.includes('/api/v1') 
    ? baseUrl.substring(0, baseUrl.lastIndexOf('/api/v1')) 
    : baseUrl;
  
  // Construct the most likely correct URL format
  // This is the format that matches how the server stores and serves files
  const correctUrl = `${baseServerUrl}/uploads/${filename}`;
  
  console.log('Constructed audio URL:', correctUrl);
  return correctUrl;
};

const InterviewReport: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  const { interviews, getQuestionsForStack, availableTechStacks, refreshQuestions, refreshInterview } = useInterview();
  const navigate = useNavigate();
  
  const [interview, setInterview] = useState<InterviewType | null>(null);
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState<QuestionWithAnswer[]>([]);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [criteriaAverages, setCriteriaAverages] = useState<RadarChartData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to handle going back to the dashboard
  const handleBack = () => {
    // Set active tab to 'reports' in localStorage
    localStorage.setItem('adminActiveTab', 'reports');
    // Navigate back to dashboard using react-router
    navigate('/admin/dashboard');
  };

  // Function to check if a question and answer match
  const isMatchingQuestionAndAnswer = (question: Question, answer: Answer): boolean => {
    // If the questionId is an object, compare its _id with the question.id
    if (typeof answer.questionId === 'object' && answer.questionId) {
      const questionObj = answer.questionId as QuestionObject;
      return questionObj._id === question.id;
    }
    
    // If the questionId is a string, compare directly
    if (typeof answer.questionId === 'string') {
      return answer.questionId === question.id;
    }
    
    return false;
  };

  // Fetch interview data and map questions to answers
  const fetchInterviewData = useCallback(async () => {
    if (!reportId) {
      setError('No interview ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Find the interview in the context
      const foundInterview = interviews.find(i => i.id === reportId);
      
      if (!foundInterview) {
        // If not found in context, try to refresh
        await refreshInterview(reportId);
        const refreshedInterview = interviews.find(i => i.id === reportId);
        
        if (!refreshedInterview) {
          setError('Interview not found');
          setLoading(false);
          return;
        }
        
        setInterview(refreshedInterview);
      } else {
        setInterview(foundInterview);
      }
      
      // Calculate average score
      const scores = foundInterview?.answers
        .filter(a => typeof a.score === 'number')
        .map(a => a.score as number);
      
      if (scores && scores.length > 0) {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        setAverageScore(Math.round(avgScore * 10) / 10);
      }
      
      // Calculate criteria averages
      if (foundInterview?.answers && foundInterview.answers.length > 0) {
        const criteriaSum = {
          technicalAccuracy: 0,
          completeness: 0,
          clarity: 0,
          examples: 0,
          count: 0
        };
        
        foundInterview.answers.forEach(answer => {
          if (answer.criteria) {
            criteriaSum.technicalAccuracy += answer.criteria.technicalAccuracy || 0;
            criteriaSum.completeness += answer.criteria.completeness || 0;
            criteriaSum.clarity += answer.criteria.clarity || 0;
            criteriaSum.examples += answer.criteria.examples || 0;
            criteriaSum.count++;
          }
        });
        
        if (criteriaSum.count > 0) {
          const criteriaAveragesData = ([
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
          
          console.log("Radar chart data:", criteriaAveragesData);
          setCriteriaAverages(criteriaAveragesData);
        }
      }
      
      // Get questions for the interview's tech stack
      if (foundInterview?.stackId) {
        const questions = getQuestionsForStack(foundInterview.stackId);
        
        let qaMap: QuestionWithAnswer[] = [];
        
        if (questions && questions.length > 0) {
          console.log(`Found ${questions.length} questions for stack ${foundInterview.stackId}`);
          console.log(`Found ${foundInterview.answers.length} answers for interview ${foundInterview.id}`);
        
          // First, create a map of question IDs to their corresponding answers
          const questionIdToAnswerMap = new Map();
          
          // Process embedded question objects in answers first
          foundInterview.answers.forEach(answer => {
            if (typeof answer.questionId === 'object' && answer.questionId) {
              const questionObj = answer.questionId as QuestionObject;
              questionIdToAnswerMap.set(questionObj._id, answer);
              console.log(`Mapped answer ${answer.id} to question ID ${questionObj._id} from embedded object`);
            }
          });
          
          // Map questions to their answers
          qaMap = questions.map(question => {
            // First check if we have a direct mapping from the questionId map
            if (questionIdToAnswerMap.has(question.id)) {
              const answer = questionIdToAnswerMap.get(question.id);
              console.log(`Question ${question.id} (${question.text.substring(0, 30)}...) -> Answer MAPPED DIRECTLY`);
              return {
                question,
                answer
              };
            }
            
            // Otherwise, try to find a matching answer
            const matchingAnswer = foundInterview.answers.find(answer => 
              isMatchingQuestionAndAnswer(question, answer)
            );
            
            console.log(`Question ${question.id} (${question.text.substring(0, 30)}...) -> Answer ${
              matchingAnswer ? `FOUND (id: ${matchingAnswer.id}, hasAudio: ${!!matchingAnswer.audioUrl}, hasTranscript: ${!!matchingAnswer.transcript})` : 'NOT FOUND'}`);
            
            // Additional debug logging for answer content
            if (matchingAnswer) {
              console.log('Full answer data:', JSON.stringify({
                id: matchingAnswer.id,
                questionId: matchingAnswer.questionId,
                audioUrl: matchingAnswer.audioUrl,
                transcriptLength: matchingAnswer.transcript ? matchingAnswer.transcript.length : 0,
                score: matchingAnswer.score,
                hasFeedback: !!matchingAnswer.feedback,
                hasCriteria: !!matchingAnswer.criteria
              }, null, 2));
            }
            
            return {
              question,
              answer: matchingAnswer
            };
          });
        } else {
          // FALLBACK: If no questions available for this stack, create placeholder questions for each answer
          console.log('No questions found for stack, creating placeholder questions for answers');
          
          if (foundInterview.answers && foundInterview.answers.length > 0) {
            console.log(`Creating placeholder questions for ${foundInterview.answers.length} answers`);
            
            // Try to refresh questions for this stack as a first step
            await refreshQuestions(foundInterview.stackId);
            
            qaMap = foundInterview.answers.map(answer => {
              // Extract question info if embedded in the answer
              if (typeof answer.questionId === 'object' && answer.questionId) {
                const questionObj = answer.questionId as QuestionObject;
                
                // Create a question object from the embedded question data
                const question: Question = {
                  id: questionObj._id,
                  text: questionObj.text,
                  stackId: foundInterview.stackId,
                  difficulty: questionObj.difficulty || 'medium'
                };
                
                console.log(`Created question from embedded data: ${question.id} (${question.text.substring(0, 30)}...)`);
                
                return {
                  question,
                  answer
                };
              }
              
              // Try to find the question in all available stacks
              const allQuestions = availableTechStacks
                .flatMap(stack => getQuestionsForStack(stack.id));
                
              // First look for exact match by ID
              let actualQuestionId: string;
              
              if (typeof answer.questionId === 'object' && answer.questionId) {
                const questionObj = answer.questionId as QuestionObject;
                actualQuestionId = questionObj._id;
              } else {
                actualQuestionId = answer.questionId as string;
              }
              
              const exactMatchQuestion = allQuestions.find(q => q.id === actualQuestionId);
              
              if (exactMatchQuestion) {
                console.log(`Found exact match question: ${exactMatchQuestion.id} (${exactMatchQuestion.text.substring(0, 30)}...)`);
                return {
                  question: exactMatchQuestion,
                  answer
                };
              }
              
              // If no exact match, create a placeholder question
              const placeholderQuestion: Question = {
                id: typeof answer.questionId === 'string' ? answer.questionId : 'unknown',
                text: 'Unknown Question',
                stackId: foundInterview.stackId,
                difficulty: 'medium'
              };
              
              console.log(`Created placeholder question: ${placeholderQuestion.id}`);
              
              return {
                question: placeholderQuestion,
                answer
              };
            });
          }
        }
        
        console.log(`Final QA map has ${qaMap.length} items`);
        setQuestionsWithAnswers(qaMap);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching interview data:', error);
      setError('Failed to load interview data');
      setLoading(false);
    }
  }, [reportId, interviews, getQuestionsForStack, availableTechStacks, refreshQuestions, refreshInterview]);

  useEffect(() => {
    fetchInterviewData();
  }, [fetchInterviewData]);

  // Function to fetch audio URL directly from the database
  const fetchAnswerAudio = async (answerId: string) => {
    try {
      toast.info("Fetching audio data directly...");
      console.log("Fetching audio for answer ID:", answerId);
      
      // First try to get the answer directly from the API
      try {
        const answerResponse = await answerAPI.getById(answerId);
        console.log("Answer API response:", answerResponse.data);
        
        if (answerResponse.data?.success && answerResponse.data?.data) {
          const apiAnswer = answerResponse.data.data;
          console.log("API answer data:", apiAnswer);
          
          if (apiAnswer.audioUrl) {
            console.log("Found audio URL in API response:", apiAnswer.audioUrl);
            
            // Force update the audio URL from the API response
            setQuestionsWithAnswers(prev => 
              prev.map(qa => 
                qa.answer?.id === answerId 
                  ? { 
                      ...qa, 
                      answer: { 
                        ...qa.answer, 
                        audioUrl: apiAnswer.audioUrl
                      } 
                    } 
                  : qa
              )
            );
            
            toast.success("Audio URL updated from database");
            return;
          }
        }
      } catch (apiError) {
        console.error("Error fetching from answer API:", apiError);
      }
      
      // Fallback to direct fetch if the API call fails
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/answers/${answerId}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        console.error("Error fetching answer:", response.status);
        toast.error("Failed to fetch audio URL");
        return;
      }
      
      const data = await response.json();
      console.log("DIRECT DB ANSWER FOR AUDIO:", data);
      
      if (!data.success || !data.data) {
        toast.error("Invalid answer data format");
        return;
      }
      
      const apiAnswer = data.data;
      
      if (!apiAnswer.audioUrl) {
        toast.error("No audio URL found in database record");
        return;
      }
      
      // Force update the audio URL from the raw database record
      setQuestionsWithAnswers(prev => 
        prev.map(qa => 
          qa.answer?.id === answerId 
            ? { 
                ...qa, 
                answer: { 
                  ...qa.answer, 
                  audioUrl: apiAnswer.audioUrl
                } 
              } 
            : qa
        )
      );
      
      toast.success("Audio URL updated from database");
    } catch (error) {
      console.error("Error fetching audio URL:", error);
      toast.error("Failed to fetch audio data");
    }
  };

  // Function to handle audio error
  const handleAudioError = (answerId: string) => {
    console.error(`Audio error for answer ${answerId}`);
    toast.error("Failed to load audio file");
  };

  // Function to handle transcript reload
  const handleTranscriptReload = async (answerId: string) => {
    try {
      toast.info("Attempting to reload transcript...");
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/answers/${answerId}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        console.error("Error fetching answer:", response.status);
        toast.error("Failed to fetch transcript");
        return;
      }
      
      const data = await response.json();
      console.log("DIRECT DB ANSWER FOR TRANSCRIPT:", data);
      
      if (!data.success || !data.data) {
        toast.error("Invalid answer data format");
        return;
      }
      
      const apiAnswer = data.data;
      
      if (!apiAnswer.transcript) {
        toast.error("No transcript found in database record");
        return;
      }
      
      // Force update the transcript from the raw database record
      setQuestionsWithAnswers(prev => 
        prev.map(qa => 
          qa.answer?.id === answerId 
            ? { 
                ...qa, 
                answer: { 
                  ...qa.answer, 
                  transcript: apiAnswer.transcript
                } 
              } 
            : qa
        )
      );
      
      toast.success("Transcript updated from database");
    } catch (error) {
      console.error("Error fetching transcript:", error);
      toast.error("Failed to fetch transcript data");
    }
  };

  // Function to handle manual transcript entry
  const handleManualTranscript = async (answerId: string, audioUrl?: string) => {
    try {
      toast.info("Attempting to manually transcribe audio...");
      
      // First make sure we have the audio URL
      if (!audioUrl) {
        toast.error("No audio available to transcribe");
        return;
      }
      
      // Get the audio file
      const fullAudioUrl = getFullAudioUrl(audioUrl);
      if (!fullAudioUrl) {
        toast.error("Could not construct audio URL");
        return;
      }
      
      const audioResponse = await fetch(fullAudioUrl);
      if (!audioResponse.ok) {
        toast.error("Failed to fetch audio file");
        return;
      }
      
      // Convert to blob
      const audioBlob = await audioResponse.blob();
      
      // Manually create a transcript
      const manualTranscript = "[Manually transcribed] This is a placeholder transcript. The actual audio content couldn't be automatically transcribed.";
      
      // Find the answer in the current state
      const currentAnswer = questionsWithAnswers.find(qa => qa.answer?.id === answerId)?.answer;
      if (!currentAnswer) {
        toast.error("Answer not found in current state");
        return;
      }
      
      // Create an updated answer with the manual transcript
      const updatedAnswer: Answer = {
        ...currentAnswer,
        transcript: manualTranscript
      };
      
      // Update the answer in the database
      await answerAPI.update(answerId, { 
        score: currentAnswer.score,
        feedback: currentAnswer.feedback,
        transcript: manualTranscript
      });
      
      // Update local state
      setQuestionsWithAnswers(prev => {
        return prev.map(qa => {
          if (qa.answer && qa.answer.id === answerId) {
            return {
              ...qa,
              answer: updatedAnswer
            };
          }
          return qa;
        });
      });
      
      toast.success("Manual transcript added!");
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("Error during transcription");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="default"
              className="mr-2"
              onClick={handleBack}
            >
              <ChevronLeft className="mr-1" size={16} />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Interview Report</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => console.log('Debug clicked')}>
              Show Debug
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchInterviewData()}>
              <RefreshCw className="mr-1" size={14} /> Refresh Data
            </Button>
            <Button variant="default" size="sm" onClick={() => fetchInterviewData()}>
              Force Complete Reload
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-10">
            <p>Loading interview data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">
            <p>{error}</p>
          </div>
        ) : interview ? (
          <>
            <div className="mb-8">
              {/* Get tech stack name from availableTechStacks */}
              <h1 className="text-3xl font-bold mb-2">
                {availableTechStacks.find(stack => stack.id === interview.stackId)?.name || 'Technical'} Interview Report
              </h1>
              <div className="flex items-center space-x-4 text-gray-600 mb-2">
                <div className="flex items-center">
                  <Calendar className="mr-1" size={16} />
                  <span>{new Date(interview.scheduledDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}, {interview.scheduledTime}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-1" size={16} />
                  <span>{interview.status.charAt(0).toUpperCase() + interview.status.slice(1).replace('-', ' ')}</span>
                </div>
              </div>
              <div className="flex items-center text-gray-600">
                <User className="mr-1" size={16} />
                {/* We don't have candidate name in the context, so we'll show a formatted ID */}
                <span>Candidate {interview.candidateId.substring(0, 8)}</span>
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Interview Performance Summary</CardTitle>
                <CardDescription>
                  Overall assessment of the candidate's performance in this interview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 mb-2">Questions</div>
                    <div className="text-4xl font-bold">{questionsWithAnswers.length}</div>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 mb-2">Answered</div>
                    <div className="text-4xl font-bold">{questionsWithAnswers.filter(qa => qa.answer).length}</div>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 mb-2">Average Score</div>
                    <div className="text-4xl font-bold">
                      {averageScore !== null ? averageScore : 'N/A'}
                      <span className="text-lg"> / 10</span>
                    </div>
                    <div className="text-sm mt-1 text-red-600 font-medium">
                      {averageScore !== null && averageScore < 5 ? 'Needs Improvement' : 
                       averageScore !== null && averageScore < 7 ? 'Average' : 'Good'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Performance by Criteria</h3>
                    <div className="bg-gray-50 p-4 rounded-lg" style={{ height: '280px' }}>
                      {criteriaAverages && criteriaAverages.length > 0 ? (
                        <div className="h-full">
                          <RadarChartDisplay data={criteriaAverages} />
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          <p>No criteria data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Strengths</h3>
                    <ul className="space-y-2">
                      {averageScore && averageScore > 3 ? (
                        <>
                          <li className="flex items-start">
                            <CheckCircle className="text-green-500 mr-2 mt-1" size={16} />
                            <span>Provided a comprehensive answer addressing all parts of the question</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="text-green-500 mr-2 mt-1" size={16} />
                            <span>Explanation was generally understandable</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="text-green-500 mr-2 mt-1" size={16} />
                            <span>Used some examples to support the explanation</span>
                          </li>
                        </>
                      ) : (
                        <li className="text-gray-500">No significant strengths identified</li>
                      )}
                    </ul>
                    
                    <h3 className="text-lg font-medium mt-6 mb-4">Areas for Improvement</h3>
                    <ul className="space-y-2">
                      {averageScore && averageScore < 7 ? (
                        <>
                          <li className="flex items-start">
                            <XCircle className="text-red-500 mr-2 mt-1" size={16} />
                            <span>Technical accuracy needs significant improvement</span>
                          </li>
                          <li className="flex items-start">
                            <XCircle className="text-red-500 mr-2 mt-1" size={16} />
                            <span>Could improve clarity with better structure and transitions</span>
                          </li>
                          <li className="flex items-start">
                            <XCircle className="text-red-500 mr-2 mt-1" size={16} />
                            <span>Lacked examples to illustrate the concepts</span>
                          </li>
                        </>
                      ) : (
                        <li className="text-gray-500">No significant areas for improvement identified</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <h2 className="text-xl font-bold mb-4">Questions & Answers</h2>
            
            {questionsWithAnswers.length > 0 ? (
              questionsWithAnswers.map((qa, index) => (
                <Card key={qa.question.id} className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Question {index + 1}: {qa.question.text}
                    </CardTitle>
                    <CardDescription>
                      Difficulty: <span className="capitalize">{qa.question.difficulty || 'medium'}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {qa.answer ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Info size={16} className="mr-1" /> Score
                          </h4>
                          <div className="flex items-center">
                            <div className="text-3xl font-bold mr-2">
                              {qa.answer.score !== undefined ? qa.answer.score : 'N/A'}
                              {qa.answer.score !== undefined && <span className="text-lg">/10</span>}
                            </div>
                            {qa.answer.score !== undefined && (
                              <div className={`ml-2 px-2 py-1 rounded text-xs ${
                                qa.answer.score >= 7 ? 'bg-green-100 text-green-800' : 
                                qa.answer.score >= 5 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {qa.answer.score >= 7 ? 'Good' : qa.answer.score >= 5 ? 'Average' : 'Needs Improvement'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Info size={16} className="mr-1" /> Audio Response
                          </h4>
                          {/* Debug info */}
                          <div className="text-xs text-gray-400 mb-2">
                            Debug: Answer ID: {qa.answer.id.substring(0, 8)}...
                            {qa.answer.audioUrl ? ` | Audio: ${qa.answer.audioUrl.substring(0, 15)}...` : ' | No audio URL'}
                            <button 
                              onClick={() => {
                                console.log('Full answer data:', qa.answer);
                                console.log('Possible audio URL:', qa.answer.audioUrl ? getFullAudioUrl(qa.answer.audioUrl) : 'None');
                              }}
                              className="ml-2 underline"
                            >
                              Log Details
                            </button>
                          </div>
                          <AudioPlayer 
                            audioUrl={qa.answer.audioUrl ? getFullAudioUrl(qa.answer.audioUrl) : undefined}
                            answerId={qa.answer.id}
                            onReload={() => qa.answer?.id && fetchAnswerAudio(qa.answer.id)}
                          />
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Info size={16} className="mr-1" /> Transcript
                          </h4>
                          <TranscriptViewer 
                            transcript={qa.answer.transcript}
                            answerId={qa.answer.id}
                            onReload={() => qa.answer?.id && handleTranscriptReload(qa.answer.id)}
                            onManualEntry={(answerId, transcript) => handleManualTranscript(answerId, qa.answer.audioUrl)}
                          />
                        </div>
                        
                        {qa.answer.feedback && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                              <Info size={16} className="mr-1" /> AI Feedback
                            </h4>
                            <div className="p-4 bg-blue-50 rounded-lg text-sm whitespace-pre-line">
                              {qa.answer.feedback}
                            </div>
                          </div>
                        )}
                        
                        {qa.answer.criteria && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                              <Info size={16} className="mr-1" /> Criteria Breakdown
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {qa.answer.criteria && Object.entries(qa.answer.criteria).map(([key, value]) => {
                                // Skip if value is not a number
                                if (typeof value !== 'number') return null;
                                
                                return (
                                  <div key={key} className="p-3 bg-gray-50 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </div>
                                    <div className="text-lg font-medium">{value} <span className="text-xs">/ 10</span></div>
                                  </div>
                                );
                              })}
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
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>No questions found for this interview</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>No interview data found</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InterviewReport;
