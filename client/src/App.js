import React, { useState, useEffect } from 'react';
import InterviewRoom from './components/InterviewRoom';

function App() {
  const [token, setToken] = useState(null);
  const [roomName, setRoomName] = useState(null);

  useEffect(() => {
    // In a real app, you would fetch the token from your backend
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identity: 'interviewer',
            room: 'interview-room'
          }),
        });
        const data = await response.json();
        setToken(data.token);
        setRoomName(data.room);
      } catch (error) {
        console.error('Error fetching token:', error);
      }
    };

    fetchToken();
  }, []);

  if (!token || !roomName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Interview System...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <InterviewRoom token={token} roomName={roomName} />
    </div>
  );
}

export default App; 