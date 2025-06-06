import React, { useState, useEffect } from 'react';
import TechStackSelector from './TechStackSelector';
import BotAvatar from './BotAvatar';

const InterviewRoom = ({ token, roomName }) => {
  const [selectedStack, setSelectedStack] = useState('');
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [interviewReport, setInterviewReport] = useState([]);

  // Load questions based on selected tech stack
  useEffect(() => {
    if (selectedStack) {
      // In a real app, this would be an API call to your backend
      const stackQuestions = {
        frontend: [
          "Explain the concept of Virtual DOM in React.",
          "What are React Hooks and how do they work?",
          "Explain the difference between state and props.",
          "What is Redux and when would you use it?",
          "How do you handle performance optimization in React?"
        ],
        backend: [
          "Explain RESTful API design principles.",
          "What is middleware in Express.js?",
          "How do you handle database migrations?",
          "Explain the concept of caching and its benefits.",
          "How do you implement authentication and authorization?"
        ],
        // Add more tech stacks and their questions
      };
      setQuestions(stackQuestions[selectedStack] || []);
    }
  }, [selectedStack]);

  const startInterview = () => {
    if (selectedStack && questions.length > 0) {
      setIsInterviewStarted(true);
      setCurrentQuestionIndex(0);
      setInterviewReport([]);
    }
  };

  const handleAnswerRecorded = (audioBlob) => {
    // Create a new report entry
    const reportEntry = {
      question: questions[currentQuestionIndex],
      answer: audioBlob,
      timestamp: new Date().toISOString()
    };

    setInterviewReport(prev => [...prev, reportEntry]);

    // Move to next question or end interview
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      endInterview();
    }
  };

  const endInterview = () => {
    setIsInterviewStarted(false);
    // Here you would typically send the interview report to your backend
    console.log('Interview Report:', interviewReport);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {!isInterviewStarted ? (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Interview Setup</h2>
          <TechStackSelector
            selectedStack={selectedStack}
            onStackChange={setSelectedStack}
          />
          <button
            onClick={startInterview}
            disabled={!selectedStack}
            className={`mt-6 w-full py-2 px-4 rounded-md text-white font-medium
              ${selectedStack
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
              }`}
          >
            Start Interview
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="text-xl font-semibold mb-4">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h3>
            <p className="text-lg mb-4">{questions[currentQuestionIndex]}</p>
          </div>
          
          <BotAvatar
            token={token}
            roomName={roomName}
            questionText={questions[currentQuestionIndex]}
            onAnswerRecorded={handleAnswerRecorded}
          />
        </div>
      )}
    </div>
  );
};

export default InterviewRoom; 