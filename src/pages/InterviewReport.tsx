import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInterview, Question, Interview as InterviewType } from '@/context/InterviewContext';
import { answerAPI } from '@/api';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, ChevronLeft, Clock, User, CheckCircle, XCircle, AlertCircle, Info, Code, MessageSquare, BarChart, Download, RefreshCw } from 'lucide-react';
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
  code?: string;
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
  code?: string;
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

const InterviewReport = () => {
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
    navigate('/admin/dashboard');
  };

  // Function to check if a question and answer match
  const isMatchingQuestionAndAnswer = (question: Question, answer: Answer): boolean => {
    // If the answer has a questionId that's an object with an _id property
    if (typeof answer.questionId === 'object' && answer.questionId && '_id' in answer.questionId) {
      return question.id === answer.questionId._id;
    }
    
    // If the answer has a questionId that's a string
    if (typeof answer.questionId === 'string') {
      return question.id === answer.questionId;
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
      let foundInterview = interviews.find(i => i.id === reportId);
      
      if (!foundInterview) {
        // If not found in context, try to refresh
        const refreshedInterview = await refreshInterview(reportId);
        
        if (!refreshedInterview) {
          setError('Interview not found');
          setLoading(false);
          return;
        }
        
        foundInterview = refreshedInterview;
      }
      
      setInterview(foundInterview);
      
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
          const criteriaAveragesData = [
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
          ];
          
          setCriteriaAverages(criteriaAveragesData);
        }
      }
      
      // Get questions for all tech stacks associated with this interview
      let allQuestions: Question[] = [];
      
      // First check for multiple tech stacks (new format)
      if (foundInterview?.techStackIds && Array.isArray(foundInterview.techStackIds) && foundInterview.techStackIds.length > 0) {
        console.log(`Interview has ${foundInterview.techStackIds.length} tech stacks:`, foundInterview.techStackIds);
        
        // Load questions from each tech stack and combine them
        foundInterview.techStackIds.forEach(stackId => {
          const stackQuestions = getQuestionsForStack(stackId);
          if (stackQuestions && stackQuestions.length > 0) {
            console.log(`Found ${stackQuestions.length} questions for stack ${stackId}`);
            allQuestions = [...allQuestions, ...stackQuestions];
          }
        });
      } 
      // Fallback to single tech stack (backward compatibility)
      else if (foundInterview?.stackId) {
        const stackQuestions = getQuestionsForStack(foundInterview.stackId);
        if (stackQuestions && stackQuestions.length > 0) {
          console.log(`Found ${stackQuestions.length} questions for stack ${foundInterview.stackId}`);
          allQuestions = stackQuestions;
        }
      }
      
      let qaMap: QuestionWithAnswer[] = [];
      
      if (allQuestions && allQuestions.length > 0) {
        console.log(`Found ${allQuestions.length} total questions across all tech stacks`);
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
        qaMap = allQuestions.map(question => {
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
            matchingAnswer ? `FOUND (id: ${matchingAnswer.id}, hasAudio: ${!!matchingAnswer.audioUrl}, hasTranscript: ${!!matchingAnswer.transcript}, hasCode: ${!!matchingAnswer.code})` : 'NOT FOUND'}`);
          
          return {
            question,
            answer: matchingAnswer
          };
        });
        
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

  // Call fetchInterviewData when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (reportId) {
        await fetchInterviewData();
      }
    };
    
    loadData();
  }, [reportId, fetchInterviewData]);

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
                        audioUrl: apiAnswer.audioUrl,
                        code: apiAnswer.code
                      } 
                    } 
                  : qa
              )
            );
            
            toast.success("Audio URL updated from database");
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching answer by ID:", error);
      }
      
      toast.error("Could not find audio URL in database");
    } catch (error) {
      console.error("Error fetching audio:", error);
      toast.error("Failed to fetch audio data");
    }
  };

  // Function to handle audio error
  const handleAudioError = (answerId: string) => {
    console.log("Audio error for answer ID:", answerId);
    fetchAnswerAudio(answerId);
  };

  // Function to handle transcript reload
  const handleTranscriptReload = async (answerId: string) => {
    console.log(`Reloading transcript for answer ${answerId}`);
    toast.info("Fetching transcript data directly...");
      
    // First try to get the answer directly from the API
    try {
      const answerResponse = await answerAPI.getById(answerId);
      console.log("Answer API response:", answerResponse.data);
      
      if (answerResponse.data?.success && answerResponse.data?.data) {
        const apiAnswer = answerResponse.data.data;
        console.log("API answer data:", apiAnswer);
        
        // Update all answer data from the API response
        console.log("Found answer data in API response:", {
          hasTranscript: !!apiAnswer.transcript,
          hasAudio: !!apiAnswer.audioUrl,
          hasCode: !!apiAnswer.code,
          hasScore: apiAnswer.score !== undefined,
          hasFeedback: !!apiAnswer.feedback,
          hasCriteria: !!apiAnswer.criteria
        });
        
        // Force update all answer data from the API response
        setQuestionsWithAnswers(prev => 
          prev.map(qa => 
            qa.answer?.id === answerId 
              ? { 
                  ...qa, 
                  answer: { 
                    ...qa.answer, 
                    transcript: apiAnswer.transcript || '',
                    audioUrl: apiAnswer.audioUrl || '',
                    code: apiAnswer.code || '',
                    score: apiAnswer.score,
                    feedback: apiAnswer.feedback || '',
                    criteria: apiAnswer.criteria || {
                      technicalAccuracy: 0,
                      completeness: 0,
                      clarity: 0,
                      examples: 0
                    }
                  } 
                } 
              : qa
          )
        );
        
        // Add a small delay to ensure the UI updates properly
        setTimeout(() => {
          // Log the updated state to verify changes
          const updatedAnswer = questionsWithAnswers.find(qa => qa.answer?.id === answerId)?.answer;
          console.log("Updated answer data after reload:", {
            id: updatedAnswer?.id,
            hasTranscript: !!updatedAnswer?.transcript,
            transcriptLength: updatedAnswer?.transcript?.length || 0,
            hasAudio: !!updatedAnswer?.audioUrl,
            audioUrl: updatedAnswer?.audioUrl,
            hasCode: !!updatedAnswer?.code,
            hasScore: updatedAnswer?.score !== undefined,
            hasFeedback: !!updatedAnswer?.feedback,
            hasCriteria: !!updatedAnswer?.criteria
          });
        }, 500);
        
        toast.success("Answer data loaded successfully");
        return;
      } else {
        console.error("API response doesn't contain answer data");
        toast.error("Failed to load answer data");
      }
    } catch (error) {
      console.error("Error fetching answer:", error);
      toast.error("Error loading answer data");
    }
  };

  // Function to handle manual transcript entry
  const handleManualTranscript = async (answerId: string, audioUrl?: string) => {
    try {
      const manualTranscript = prompt("Enter the transcript manually:");
      
      if (manualTranscript === null) {
        // User cancelled
        return;
      }
      
      if (!manualTranscript.trim()) {
        toast.error("Transcript cannot be empty");
        return;
      }
      
      toast.info("Saving manual transcript...");
      console.log("Saving manual transcript for answer ID:", answerId);
      
      // Update the answer in the database
      try {
        const updateResponse = await answerAPI.update(answerId, {
          transcript: manualTranscript
        });
        
        console.log("Update response:", updateResponse.data);
        
        if (updateResponse.data?.success) {
          // Force update the transcript in the UI
          setQuestionsWithAnswers(prev => 
            prev.map(qa => 
              qa.answer?.id === answerId 
                ? { 
                    ...qa, 
                    answer: { 
                      ...qa.answer, 
                      transcript: manualTranscript
                    } 
                  } 
                : qa
            )
          );
          
          toast.success("Manual transcript saved successfully");
        } else {
          toast.error("Failed to save manual transcript");
        }
      } catch (error) {
        console.error("Error updating answer:", error);
        toast.error("Failed to save manual transcript");
      }
    } catch (error) {
      console.error("Error handling manual transcript:", error);
      toast.error("Failed to process manual transcript");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <Button 
          variant="outline" 
          onClick={handleBack}
          className="mb-6 flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Loading interview report...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">
            <p>{error}</p>
          </div>
        ) : interview ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-4">Interview Report</h1>
              
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium">{interview.scheduledDate || 'Not scheduled'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium">{interview.scheduledTime || 'Not scheduled'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium capitalize">{interview.status}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {averageScore !== null && (
                        <div className="flex items-center">
                          <div className={`h-5 w-5 mr-2 ${averageScore >= 7 ? 'text-green-500' : averageScore >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {averageScore >= 7 ? <CheckCircle /> : averageScore >= 4 ? <AlertCircle /> : <XCircle />}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Average Score</p>
                            <p className="font-medium">{averageScore.toFixed(1)} / 10</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <MessageSquare className="h-5 w-5 text-gray-500 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Questions Answered</p>
                          <p className="font-medium">{questionsWithAnswers.filter(qa => qa.answer).length} / {questionsWithAnswers.length}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <BarChart className="h-5 w-5 text-gray-500 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Completion Rate</p>
                          <p className="font-medium">
                            {questionsWithAnswers.length > 0 
                              ? Math.round((questionsWithAnswers.filter(qa => qa.answer).length / questionsWithAnswers.length) * 100)
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {criteriaAverages && criteriaAverages.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Performance Overview</CardTitle>
                    <CardDescription>Average scores across all evaluation criteria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={criteriaAverages}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} />
                          <Radar
                            name="Candidate Score"
                            dataKey="score"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                          />
                          <Tooltip />
                          <RechartsLegend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <h2 className="text-2xl font-bold mb-4">Questions & Answers</h2>
            
            {questionsWithAnswers && questionsWithAnswers.length > 0 ? (
              questionsWithAnswers.map((qa, index) => (
                <Card key={qa.question.id} className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-start">
                      <span className="bg-gray-100 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                        {index + 1}
                      </span>
                      <span>{qa.question.text}</span>
                    </CardTitle>
                    <CardDescription>
                      Difficulty: <span className="capitalize">{qa.question.difficulty || 'medium'}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {qa.answer ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`h-6 w-6 mr-2 ${qa.answer.score && qa.answer.score >= 7 ? 'text-green-500' : qa.answer.score && qa.answer.score >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {qa.answer.score && qa.answer.score >= 7 ? <CheckCircle /> : <XCircle />}
                            </div>
                            <span className="font-medium">
                              Score: {qa.answer.score !== undefined ? `${qa.answer.score} / 10` : 'Not evaluated'}
                            </span>
                            <button 
                              onClick={() => {
                                console.log('Answer details:', qa.answer);
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
                            onManualEntry={(answerId) => handleManualTranscript(answerId, qa.answer?.audioUrl)}
                          />
                        </div>
                        
                        {qa.answer.code && qa.answer.code.trim() !== '' && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                              <Code size={16} className="mr-1" /> Code Submission
                            </h4>
                            <div className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
                              <pre className="whitespace-pre-wrap break-words">
                                <code>{qa.answer.code}</code>
                              </pre>
                            </div>
                          </div>
                        )}
                        
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
