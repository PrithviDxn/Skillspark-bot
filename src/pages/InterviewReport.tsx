import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInterview, Question, Interview as InterviewType } from '@/context/InterviewContext';
import { answerAPI } from '@/api';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, Download, CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { toast } from 'sonner';

// Define QuestionObject interface for embedded question data
interface QuestionObject {
  _id: string;
  text: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  // @ts-ignore - We need to allow additional properties
  [key: string]: any;
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
    return relativeUrl;
  }
  
  // Otherwise, prepend the API base URL
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  // Remove '/api/v1' from the base URL if it exists
  const baseApiUrl = baseUrl.endsWith('/api/v1') 
    ? baseUrl.substring(0, baseUrl.length - 7) 
    : baseUrl;
  
  // Ensure the relative URL starts with a slash
  const formattedPath = relativeUrl.startsWith('/') 
    ? relativeUrl 
    : `/${relativeUrl}`;
  
  return `${baseApiUrl}${formattedPath}`;
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
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  const loadInterviewData = useCallback(async () => {
    if (reportId) {
      let foundInterview = interviews.find(i => i.id === reportId);
      
      // If not found in state or we're refreshing, try to fetch from server
      if (!foundInterview || isRefreshing) {
        console.log('Interview not found in state or refreshing, fetching from server');
        const refreshedInterview = await refreshInterview(reportId);
        if (refreshedInterview) {
          foundInterview = refreshedInterview;
        }
        setIsRefreshing(false);
      }
      
      if (foundInterview) {
        console.log('Found interview:', foundInterview);
        setInterview(foundInterview);
        
        // Get questions for this stack
        const questions = getQuestionsForStack(foundInterview.stackId);
        console.log('Questions for stack:', questions);
        
        // Debug answers
        console.log('Found interview answers:', foundInterview.answers);
        console.log('Answer details:',
          foundInterview.answers.map(a => ({
            id: a.id,
            questionId: a.questionId,
            hasTranscript: !!a.transcript,
            transcriptLength: a.transcript ? a.transcript.length : 0
          }))
        );

        // If we have no answers, try to refresh the interview data one more time
        if (foundInterview.answers.length === 0) {
          console.log('No answers found, attempting to refresh interview data');
          // Do a forced refresh by calling the API directly
          try {
            console.log('Fetching answers for empty interview');
            const answersResponse = await answerAPI.getByInterview(reportId);
            
            if (answersResponse.data && answersResponse.data.data && answersResponse.data.data.length > 0) {
              console.log('Found answers directly from API:', answersResponse.data.data.length);
              // Update the interview with the found answers
              const freshAnswers = answersResponse.data.data.map((answer: ApiAnswer) => ({
                id: answer._id,
                questionId: answer.question,
                audioUrl: answer.audioUrl,
                transcript: answer.transcript,
                score: answer.score,
                feedback: answer.feedback,
                criteria: answer.criteria
              }));
              
              foundInterview = {
                ...foundInterview,
                answers: freshAnswers
              };
              
              console.log('Updated interview with fresh answers:', freshAnswers.length);
            } else {
              console.log('No answers found from direct API call');
            }
          } catch (err) {
            console.error('Error fetching answers directly:', err);
          }
          
          // Still refresh through context to keep everything in sync
          const refreshedInterview = await refreshInterview(reportId);
          if (refreshedInterview && refreshedInterview.answers.length > 0) {
            foundInterview = refreshedInterview;
            console.log('Refreshed interview with answers:', foundInterview.answers);
          }
        }

        let qaMap: QuestionWithAnswer[] = [];
        
        // First check if we have any questions from the tech stack
        if (questions && questions.length > 0) {
          // Updated method with proper type checking for the questionId comparison
          const isMatchingQuestionAndAnswer = (question: Question, answer: Answer) => {
            // Get the actual questionId whether it's a string or an object with _id property
            let actualQuestionId: string;
            
            if (typeof answer.questionId === 'object' && answer.questionId) {
              const questionObj = answer.questionId as QuestionObject;
              actualQuestionId = questionObj._id;
            } else {
              actualQuestionId = answer.questionId as string;
            }
            
            // Log the comparison attempt for debugging
            console.log(`Comparing question ${question.id} with answer.questionId ${actualQuestionId}`);
            
            // Method 1: Direct ID match (most reliable)
            if (actualQuestionId === question.id) {
              console.log(`✅ Direct ID match found for question ${question.id}`);
              return true;
            }
            
            // Method 2: If IDs are MongoDb ObjectIds, they might be stringified differently
            // So check if one contains the other
            if (typeof actualQuestionId === 'string' && typeof question.id === 'string') {
              if ((actualQuestionId.includes(question.id) || question.id.includes(actualQuestionId)) && 
                  (actualQuestionId.length > 10 || question.id.length > 10)) { // Only for longer IDs which are likely DB IDs
                console.log(`✅ Substring ID match found: question ${question.id} - answer ${actualQuestionId}`);
                return true;
              }
            }
            
            // Method 3: Check if answer.questionId is an object with text property and compare directly
            if (typeof answer.questionId === 'object' && answer.questionId) {
              const questionObj = answer.questionId as QuestionObject;
              if (questionObj.text === question.text) {
                console.log(`✅ Direct text match found for question ${question.id}`);
                return true;
              }
            }
            
            // Method 4: If tech stack had only one question with this text, it's likely the same
            // This is a fallback for cases where IDs don't match at all
            const normalizedQuestionText = question.text.toLowerCase().trim();
            const matchingQuestionsWithSameText = questions.filter(q => 
              q.text.toLowerCase().trim() === normalizedQuestionText
            );
            
            if (matchingQuestionsWithSameText.length === 1) {
              console.log(`✅ Single question text match for: "${question.text.substring(0, 20)}..."`);
              return true;
            }
            
            console.log(`❌ No match for question ${question.id} - answer ${JSON.stringify(actualQuestionId)}`);
            return false;
          };
        
        // Map questions to their answers
          qaMap = questions.map(question => {
            // Find a matching answer for this question - but don't reuse answers that are already matched
            // Keep track of already mapped answers to prevent duplicates
            const alreadyMappedAnswerIds = qaMap.map(q => q.answer?.id).filter(Boolean);
            
            // Find matching answer, but exclude already mapped ones
            const matchingAnswer = foundInterview.answers.find(answer => 
              !alreadyMappedAnswerIds.includes(answer.id) && 
              isMatchingQuestionAndAnswer(question, answer)
            );
            
            // Add more detailed logging
            console.log(`Question ${question.id} (${question.text.substring(0, 20)}...) -> Answer:`, 
              matchingAnswer ? `FOUND (id: ${matchingAnswer.id}, hasAudio: ${!!matchingAnswer.audioUrl}, hasTranscript: ${!!matchingAnswer.transcript})` : 'NOT FOUND');
            
            // Additional debug logging for answer content
            if (matchingAnswer) {
              console.log('Full answer data:', JSON.stringify({
                id: matchingAnswer.id,
                questionId: matchingAnswer.questionId,
                audioUrl: matchingAnswer.audioUrl,
                fullAudioUrl: getFullAudioUrl(matchingAnswer.audioUrl),
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
                console.log('Found embedded question in answer:', answer.questionId);
                
                // Cast to QuestionObject type for TypeScript
                const questionObj = answer.questionId as QuestionObject;
                
                // Create question from embedded data
                const placeholder: Question = {
                  id: questionObj._id || `placeholder-${Date.now()}`,
                  stackId: foundInterview.stackId,
                  text: questionObj.text,
                  difficulty: questionObj.difficulty || 'medium'
                };
                
                return {
                  question: placeholder,
                  answer: answer
                };
              }

              // Original fallback code for finding questions
              console.log('Full answer data for placeholder question:', answer);
              
              // Try to find the original question from any tech stack
              const allQuestions = Object.values(availableTechStacks)
                .flatMap(stack => getQuestionsForStack(stack.id));
                
              // First look for exact match by ID
              let actualQuestionId: string;
              
              if (typeof answer.questionId === 'object' && answer.questionId) {
                const questionObj = answer.questionId as QuestionObject;
                actualQuestionId = questionObj._id;
              } else {
                actualQuestionId = answer.questionId as string;
              }
              
              const matchingQuestion = allQuestions.find(q => q.id === actualQuestionId);
              if (matchingQuestion) {
                console.log('Found matching question in stack:', matchingQuestion);
                return {
                  question: matchingQuestion,
                  answer: answer
                };
              }
              
              // Next try substring match (some databases store IDs differently)
              if (typeof actualQuestionId === 'string') {
                const substringMatchQuestion = allQuestions.find(q => 
                  (typeof q.id === 'string') && (q.id.includes(actualQuestionId) || actualQuestionId.includes(q.id))
                );
                
                if (substringMatchQuestion) {
                  console.log('Found substring matching question:', substringMatchQuestion);
                  return {
                    question: substringMatchQuestion,
                    answer: answer
                  };
                }
              }
              
              // Create a placeholder with a default question
              const questionText = "Question not found in database";
              
              console.log(`Using placeholder question text: ${questionText}`);
              
              // Create a placeholder question based on the answer
              const placeholder: Question = {
                id: typeof answer.questionId === 'string' ? answer.questionId : `placeholder-${Date.now()}`,
                stackId: foundInterview.stackId,
                text: questionText,
                difficulty: 'medium'
              };
              
              return {
                question: placeholder,
                answer: answer
              };
            });
          } else {
            console.error('No questions and no answers available for this interview', foundInterview);
          }
        }
        
        setQuestionsWithAnswers(qaMap);
        
        // Calculate average score
        const answeredQuestions = foundInterview.answers.filter(a => a.score !== undefined);
        console.log(`Found ${answeredQuestions.length} answers with scores:`, 
          answeredQuestions.map(a => ({ id: a.id, score: a.score, hasCriteria: !!a.criteria })));
        
        if (answeredQuestions.length > 0) {
          const total = answeredQuestions.reduce((sum, answer) => sum + (answer.score || 0), 0);
          const avgScore = total / answeredQuestions.length;
          console.log(`Calculated average score: ${avgScore} from total ${total}`);
          setAverageScore(avgScore);
          
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
            console.log(`Processing answer ${answer.id}:`, answer);
            
            // Debug the full answer object to see its structure
            console.log('Full answer object:', JSON.stringify(answer, null, 2));
            
            // Always increment the count, even if criteria are missing
            criteriaSum.count++;
            
            if (answer.criteria) {
              console.log('Processing criteria for answer:', answer.id, answer.criteria);
              // Create a safe accessor function to avoid undefined errors
              const getCriteriaValue = (field) => {
                if (!answer.criteria || typeof answer.criteria[field] !== 'number') {
                  console.log(`Missing or invalid criteria field ${field} for answer:`, answer.id);
                  return 0;
                }
                return answer.criteria[field];
              };
              
              criteriaSum.technicalAccuracy += getCriteriaValue('technicalAccuracy');
              criteriaSum.completeness += getCriteriaValue('completeness');
              criteriaSum.clarity += getCriteriaValue('clarity');
              criteriaSum.examples += getCriteriaValue('examples');
            } else {
              console.log('No criteria found for answer:', answer.id);
              // If no criteria, just use the overall score for all criteria as a fallback
              if (answer.score) {
                const fallbackScore = answer.score;
                criteriaSum.technicalAccuracy += fallbackScore;
                criteriaSum.completeness += fallbackScore;
                criteriaSum.clarity += fallbackScore;
                criteriaSum.examples += fallbackScore;
              }
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
            console.log('Set criteria averages:', criteriaSum);
          } else if (averageScore !== null) {
            // If we have an average score but no criteria, create default criteria based on the average
            console.log('Creating default criteria based on average score:', averageScore);
            setCriteriaAverages([
              { subject: 'Technical Accuracy', score: averageScore, fullMark: 10 },
              { subject: 'Completeness', score: averageScore, fullMark: 10 },
              { subject: 'Clarity', score: averageScore, fullMark: 10 },
              { subject: 'Examples', score: averageScore, fullMark: 10 }
            ]);
          }
        }
      }
    }
  }, [reportId, interviews, getQuestionsForStack, refreshInterview, isRefreshing, availableTechStacks]);
  
  useEffect(() => {
    loadInterviewData();
  }, [loadInterviewData]);
  
  const refreshData = async () => {
    if (reportId) {
      setIsRefreshing(true);
      await refreshInterview(reportId);
      loadInterviewData();
    }
  };
  
  // Get tech stack name
  const techStack = interview
    ? availableTechStacks.find(stack => stack.id === interview.stackId)
    : null;
  
  // Update the fetchAnswerDirectly function to pull the necessary data and properly parse it
  const fetchAnswerDirectly = async (answerId: string) => {
    try {
      toast.info("Fetching answer data directly...");
      
      // Check if the answer already has detailed data
      console.log("Current answer in state:", 
        interview.answers.find(a => a.id === answerId));
      
      // Use the answerAPI to get the specific answer by ID
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/answers/${answerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error("Error fetching answer:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        toast.error("Failed to fetch answer details");
        return;
      }
      
      const data = await response.json();
      console.log("Fetched answer directly:", data);
      
      if (data.success && data.data) {
        const answer = data.data;
        
        // Create a properly formatted answer object
        const formattedAnswer = {
          id: answer._id,
          questionId: answer.question,
          audioUrl: answer.audioUrl,
          transcript: answer.transcript,
          score: answer.score,
          feedback: answer.feedback,
          criteria: answer.criteria
        };
        
        console.log("Formatted answer data:", formattedAnswer);
        
        // Update the interview in state with the fetched answer data
        setInterview(prev => {
          if (!prev) return prev;
          
          // Replace the answer with our newly fetched data
          const updatedAnswers = prev.answers.map(a => 
            a.id === answerId ? formattedAnswer : a
          );
          
          return {
            ...prev,
            answers: updatedAnswers
          };
        });
        
        // Also update questionsWithAnswers to ensure the UI reflects the new data
        setQuestionsWithAnswers(prev => {
          return prev.map(qa => {
            if (qa.answer && qa.answer.id === answerId) {
              return {
                ...qa,
                answer: formattedAnswer
              };
            }
            return qa;
          });
        });
        
        toast.success("Answer data refreshed - please check if audio and transcript are now visible");
      } else {
        toast.error("Failed to fetch answer or invalid data format");
      }
    } catch (error) {
      console.error("Error fetching answer:", error);
      toast.error("Failed to fetch answer details");
    }
  };
  
  // Add a new section at the top of the debug information for a direct database check
  // Update the debug information section
  const forceCompleteReload = async () => {
    try {
      toast.info("Force reloading all data and bypassing mock transcript...");
      
      // Step 1: Fetch the interview details directly
      const token = localStorage.getItem('token');
      
      // Step 2: Fetch all answers for this interview directly - this is the key step
      const answersResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/answers?interview=${reportId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!answersResponse.ok) {
        console.error("Error fetching answers:", answersResponse.status);
        toast.error("Failed to fetch answers data");
        return;
      }
      
      const answersData = await answersResponse.json();
      console.log("DIRECT DB ANSWERS:", answersData);
      
      if (!answersData.success || !answersData.data) {
        toast.error("Invalid answers data format");
        return;
      }
      
      const apiAnswers = answersData.data;
      
      // Step 3: Manually update the transcript and other data for each answer
      if (apiAnswers && apiAnswers.length > 0) {
        setInterview(prev => {
          if (!prev) return prev;
          
          const updatedAnswers = prev.answers.map((prevAnswer, index) => {
            // Find the corresponding answer in the API data
            const apiAnswer = apiAnswers.find(a => a._id === prevAnswer.id);
            
            if (apiAnswer) {
              console.log(`Updating answer ${prevAnswer.id} with direct DB data`);
              console.log("Original transcript:", prevAnswer.transcript?.substring(0, 30));
              console.log("DB transcript:", apiAnswer.transcript?.substring(0, 30));
              
              return {
                ...prevAnswer,
                transcript: apiAnswer.transcript || prevAnswer.transcript,
                audioUrl: apiAnswer.audioUrl || prevAnswer.audioUrl,
                score: apiAnswer.score || prevAnswer.score,
                feedback: apiAnswer.feedback || prevAnswer.feedback,
                criteria: apiAnswer.criteria || prevAnswer.criteria
              };
            }
            
            return prevAnswer;
          });
          
          return {
            ...prev,
            answers: updatedAnswers
          };
        });
        
        // Also update the QA mapping to ensure the UI reflects the changes
        setQuestionsWithAnswers(prev => {
          return prev.map(qa => {
            if (qa.answer) {
              // Find the corresponding answer in the API data
              const apiAnswer = apiAnswers.find(a => a._id === qa.answer?.id);
              
              if (apiAnswer) {
                return {
                  ...qa,
                  answer: {
                    ...qa.answer,
                    transcript: apiAnswer.transcript || qa.answer.transcript,
                    audioUrl: apiAnswer.audioUrl || qa.answer.audioUrl,
                    score: apiAnswer.score || qa.answer.score,
                    feedback: apiAnswer.feedback || qa.answer.feedback,
                    criteria: apiAnswer.criteria || qa.answer.criteria
                  }
                };
              }
            }
            
            return qa;
          });
        });
        
        toast.success("Direct database data loaded successfully");
      }
    } catch (error) {
      console.error("Error in force reload:", error);
      toast.error("Failed to reload data");
    }
  };
  
  // Replace the existing transcript refresh function with a more focused one
  const reloadAnswerTranscript = async (answerId: string) => {
    try {
      toast.info("Bypassing mock transcript and fetching real data...");
      
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
        toast.error("Failed to fetch answer transcript");
        return;
      }
      
      const data = await response.json();
      console.log("DIRECT DB ANSWER:", data);
      
      if (!data.success || !data.data) {
        toast.error("Invalid answer data format");
        return;
      }
      
      const apiAnswer = data.data;
      
      // Check if this is a mock transcript by comparing to known mock responses
      const mockC = "C's preprocessor directives li";
      
      if (apiAnswer.transcript?.startsWith(mockC)) {
        toast.error("WARNING: Database contains mock transcript. Real transcript may be missing.");
      }
      
      // Force update the transcript from the raw database record
      setQuestionsWithAnswers(prev => 
        prev.map(qa => 
          qa.answer?.id === answerId 
            ? { 
                ...qa, 
                answer: { 
                  ...qa.answer, 
                  transcript: apiAnswer.transcript,
                  audioUrl: apiAnswer.audioUrl,
                  score: apiAnswer.score,
                  feedback: apiAnswer.feedback,
                  criteria: apiAnswer.criteria
                } 
              } 
            : qa
        )
      );
      
      toast.success("Raw transcript data loaded directly from database");
    } catch (error) {
      console.error("Error fetching transcript:", error);
      toast.error("Failed to fetch transcript data");
    }
  };
  
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
                  {interview.completedAt ? `Completed: ${formatDate(interview.completedAt)}` : 'In Progress'}
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
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)}>
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </Button>
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw size={16} className="mr-1" /> Refresh Data
            </Button>
            <Button variant="default" size="sm" onClick={forceCompleteReload}>
              Force Complete Reload
          </Button>
          </div>
        </div>
        
        {showDebug && (
          <Card className="mb-6 bg-gray-50">
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Direct Database Check</h3>
                  <div className="flex gap-2 mt-1">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => {
                        const answerId = interview.answers[0]?.id;
                        if (answerId) {
                          // Skip the mock transcription by directly fetching from database
                          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/answers/${answerId}`, {
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              'Content-Type': 'application/json',
                            }
                          })
                          .then(response => response.json())
                          .then(data => {
                            console.log("DIRECT DB DATA:", data);
                            if (data.success && data.data) {
                              // Show the raw server data in an alert
                              const answer = data.data;
                              alert(
                                `DIRECT DATABASE DATA:\n\n` +
                                `ID: ${answer._id}\n` +
                                `Question: ${answer.question}\n` +
                                `Audio URL: ${answer.audioUrl}\n` +
                                `Transcript: ${answer.transcript?.substring(0, 100)}...\n` +
                                `Score: ${answer.score}\n`
                              );
                            }
                          })
                          .catch(error => {
                            console.error("Error checking database:", error);
                            toast.error("Failed to check database record");
                          });
                        }
                      }}
                    >
                      Check DB Directly
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Interview ID: {interview.id}</h3>
                  <p className="text-xs">Stack ID: {interview.stackId}</p>
                  <p className="text-xs">Status: {interview.status}</p>
                  <p className="text-xs">Answers Count: {interview.answers.length}</p>
                  <p className="text-xs">Answered Questions Count: {interview.answers.filter(a => a.score !== undefined).length}</p>
                  <p className="text-xs">Average Score: {averageScore !== null ? averageScore.toFixed(1) : 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Answer Scores:</h3>
                  <pre className="text-xs bg-gray-100 p-2 overflow-auto max-h-32">
                    {JSON.stringify(interview.answers.map(a => ({
                      id: a.id,
                      questionId: a.questionId,
                      score: a.score,
                      hasCriteria: !!a.criteria,
                      criteriaKeys: a.criteria ? Object.keys(a.criteria) : []
                    })), null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Tech Stack Information:</h3>
                  <p className="text-xs">Selected Stack: {techStack ? `${techStack.name} (${techStack.id})` : 'Not Found'}</p>
                  <p className="text-xs">Available Stacks: {availableTechStacks.map(s => `${s.name} (${s.id})`).join(', ')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Questions in Stack:</h3>
                  <p className="text-xs">Count: {getQuestionsForStack(interview.stackId).length}</p>
                  <pre className="text-xs bg-gray-100 p-2 overflow-auto max-h-32">
                    {JSON.stringify(getQuestionsForStack(interview.stackId).map(q => ({ id: q.id, text: q.text.substring(0, 30) })), null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Interview Answers:</h3>
                  <pre className="text-xs bg-gray-100 p-2 overflow-auto max-h-32">
                    {JSON.stringify(interview.answers.map(a => ({ id: a.id, questionId: a.questionId, hasTranscript: !!a.transcript })), null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Mapped Q&A:</h3>
                  <pre className="text-xs bg-gray-100 p-2 overflow-auto max-h-32">
                    {JSON.stringify(questionsWithAnswers.map(qa => ({ 
                      questionId: qa.question.id, 
                      questionText: qa.question.text.substring(0, 30),
                      hasAnswer: !!qa.answer,
                      answerId: qa.answer?.id
                    })), null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Full Answer Data:</h3>
                  <pre className="text-xs bg-gray-100 p-2 overflow-auto max-h-32">
                    {JSON.stringify(interview.answers.map(a => ({
                      id: a.id,
                      questionId: typeof a.questionId === 'object' ? a.questionId._id : a.questionId,
                      audioUrl: a.audioUrl,
                      transcript: a.transcript ? `${a.transcript.substring(0, 30)}...` : null,
                      score: a.score,
                      feedback: a.feedback ? `${a.feedback.substring(0, 30)}...` : null
                    })), null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">Answer Debug Tools:</h3>
                  <div className="flex gap-2 mt-1">
                    {interview.answers.map(answer => (
                      <Button 
                        key={answer.id} 
                        size="sm" 
                        variant="outline" 
                        onClick={() => fetchAnswerDirectly(answer.id)}
                      >
                        Fetch Answer {answer.id.substring(0, 6)}...
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
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
                  {interview.answers.length > 0 ? Math.max(questionsWithAnswers.length, interview.answers.length) : 0}
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
                  {averageScore !== null ? averageScore.toFixed(1) : (interview.answers.length > 0 ? 'Calculating...' : 'N/A')}
                  <span className="text-sm font-normal"> / 10</span>
                </div>
                {averageScore !== null && (
                  <div className="text-xs mt-1">
                    {getScoreText(averageScore)}
                  </div>
                )}
              </div>
            </div>
            
            {criteriaAverages && criteriaAverages.length > 0 ? (
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
            ) : (
              interview.answers.length > 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-500">Evaluation data is loading or not available</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
        
        <h2 className="text-xl font-bold mb-4">Detailed Question Responses</h2>
        
        {questionsWithAnswers.length > 0 ? (
          questionsWithAnswers.map(({ question, answer }) => (
            <Card key={question.id || `question-${Math.random()}`} className="mb-6">
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
                          {question.difficulty ? question.difficulty.toUpperCase() : 'UNKNOWN'}
                    </span>
                      </div>
                      <h3 className="text-lg font-medium">{question.text || 'Question text not available'}</h3>
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
                      <div>
                        <audio 
                          src={getFullAudioUrl(answer.audioUrl)} 
                          controls 
                          className="w-full" 
                          onError={(e) => console.error("Audio error:", e)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Audio URL: {getFullAudioUrl(answer.audioUrl)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Audio not available - URL: {answer.audioUrl ?? "No URL provided"}
                      </p>
                    )}
                  </div>
                  
                  <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Info size={16} className="mr-1" /> Transcript
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="ml-2 h-7 text-xs"
                          onClick={() => reloadAnswerTranscript(answer.id)}
                        >
                          Refresh Transcript
                        </Button>
                    </h4>
                      <div className="p-4 bg-gray-50 rounded-lg text-sm">
                        {answer.transcript ? (
                          <>
                            <p>{answer.transcript}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Transcript length: {answer.transcript.length} characters
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No transcript available. Check if transcript is loaded correctly: 
                            {JSON.stringify({hasAnswer: !!answer, hasTranscript: !!answer.transcript})}
                          </p>
                        )}
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
                          {answer.criteria && Object.entries(answer.criteria).map(([key, value]) => {
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
      </div>
    </Layout>
  );
};

export default InterviewReport;

