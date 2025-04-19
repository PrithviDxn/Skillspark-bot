import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useInterview, TechStack } from '@/context/InterviewContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

const CandidateSelect: React.FC = () => {
  const { user } = useAuth();
  const { availableTechStacks, startInterview } = useInterview();
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartInterview = async () => {
    if (!selectedStack || !user) return;
    
    setIsLoading(true);
    try {
      const interview = await startInterview(user._id, selectedStack);
      navigate(`/interview/${interview.id}`);
    } catch (error) {
      console.error('Failed to start interview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== 'user') {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="mt-2">You need to be logged in as a candidate to view this page.</p>
          <Button className="mt-4" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Select Your Technology Stack</h1>
          <p className="text-gray-600">
            Choose the technology you'd like to be interviewed on
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {availableTechStacks.map((stack) => (
            <div
              key={stack.id}
              className={`tech-stack-card ${selectedStack === stack.id ? 'selected' : ''}`}
              onClick={() => setSelectedStack(stack.id)}
            >
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{stack.icon}</div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{stack.name}</h3>
                  <p className="text-gray-600 text-sm">{stack.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">What to expect</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You will be asked 5 technical questions related to your selected technology.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Questions will vary in difficulty from easy to challenging.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Answer each question by recording your voice response.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your answers will be evaluated after the interview is complete.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>The entire process takes approximately 15-20 minutes.</span>
                </li>
              </ul>
            </div>
            
            <Button 
              onClick={handleStartInterview} 
              disabled={!selectedStack || isLoading}
              className="w-full"
            >
              {isLoading ? (
                'Starting Interview...'
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Start Interview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CandidateSelect;
