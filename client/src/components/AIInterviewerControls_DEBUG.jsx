import React, { useState, useEffect } from 'react';
import { useInterview } from '../context/InterviewContext';

const AIInterviewerControls_DEBUG = ({ 
  interviewId, 
  isInitialized, 
  setIsInitialized, 
  isInterviewing, 
  setIsInterviewing 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentQuestion, setCurrentQuestion } = useInterview();
  const [isBotStarting, setIsBotStarting] = useState(false);
  const [botStarted, setBotStarted] = useState(false);

  const initializeBot = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[AIInterviewerControls] Initializing bot for interview:', interviewId);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/interview/${interviewId}/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize bot');
      }

      console.log('[AIInterviewerControls] Bot initialized successfully:', data);
      setIsInitialized(true);
      
      // Set first question if available
      if (data.question) {
        setCurrentQuestion(data.question);
      }
    } catch (err) {
      console.error('[AIInterviewerControls] Error initializing bot:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startInterview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[AIInterviewerControls] Starting interview:', interviewId);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/interview/${interviewId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview');
      }

      console.log('[AIInterviewerControls] Interview started successfully:', data);
      setIsInterviewing(true);
      
      // Set first question if available
      if (data.question) {
        setCurrentQuestion(data.question);
      }
    } catch (err) {
      console.error('[AIInterviewerControls] Error starting interview:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const endInterview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[AIInterviewerControls] Ending interview:', interviewId);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/interview/${interviewId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to end interview');
      }

      console.log('[AIInterviewerControls] Interview ended successfully:', data);
      setIsInterviewing(false);
      setIsInitialized(false);
      setCurrentQuestion('');
    } catch (err) {
      console.error('[AIInterviewerControls] Error ending interview:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startBot = async () => {
    setIsBotStarting(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/interview/${interviewId}/start-bot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start bot');
      }
      setBotStarted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBotStarting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <div className="space-y-4">
        <div className="text-lg font-semibold">AI Interviewer Controls</div>
        
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        
        <div className="space-y-2">
          {!isInitialized ? (
            <button
              onClick={initializeBot}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Initializing...' : 'Initialize Bot'}
            </button>
          ) : !isInterviewing ? (
            <button
              onClick={startInterview}
              disabled={isLoading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Starting...' : 'Start Interview'}
            </button>
          ) : (
            <button
              onClick={endInterview}
              disabled={isLoading}
              className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Ending...' : 'End Interview'}
            </button>
          )}
          <button
            onClick={startBot}
            disabled={isBotStarting || botStarted}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isBotStarting ? 'Starting Bot...' : botStarted ? 'Bot Started' : 'Start Bot'}
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Status: {isLoading ? 'Loading...' : isInterviewing ? 'Interview in progress' : isInitialized ? 'Bot initialized' : 'Not initialized'}
        </div>
      </div>
    </div>
  );
};

export default AIInterviewerControls_DEBUG; 