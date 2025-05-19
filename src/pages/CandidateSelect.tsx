import React, { useState, useEffect } from 'react';
import api from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useInterview, TechStack } from '@/context/InterviewContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { interviewAPI } from '@/api/index';

const CandidateSelect: React.FC = () => {
  const { user } = useAuth();
  const { interviews, refreshInterview, availableTechStacks } = useInterview();
  const [isLoading, setIsLoading] = useState(false);
  const [scheduled, setScheduled] = useState<any[]>([]);

  // Helper: normalize interview object fields for scheduledDate, scheduledTime, status
  const getScheduledFields = (iv: any) => {
    // Try both camelCase and snake_case for compatibility
    return {
      scheduledDate: iv.scheduledDate || iv.scheduled_date || '',
      scheduledTime: iv.scheduledTime || iv.scheduled_time || '',
      duration: iv.duration,
      status: iv.status,
      id: iv._id || iv.id, // Fallback to id if _id is missing
      stackId: iv.stackId || iv.techStack || '',
    };
  };
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    // Only show interviews scheduled for this candidate and with correct status
    const filtered = interviews.filter((iv: any) => {
      const { status } = getScheduledFields(iv);
      return iv.candidateId === user._id && (status === 'pending' || status === 'scheduled');
    });
    setScheduled(filtered);
  }, [user, interviews]);

  // Helper to check if interview can be started now
  // Always use scheduledDate (ISO) for logic, ignore scheduledTime for logic
  const canStart = (iv: any) => {
    const { scheduledDate } = getScheduledFields(iv);
    if (!scheduledDate) return false;
    const now = new Date();
    const start = new Date(scheduledDate);
    // Interview can be started if now is within the scheduled window (start to start+duration)
    return now >= start;
  };

  const handleStart = async (interviewId: string) => {
    console.log('handleStart: interviewId =', interviewId, 'typeof:', typeof interviewId);
    setIsLoading(true);
    try {
      // Call the new join endpoint to update interview status to in-progress
      const res = await interviewAPI.join(interviewId, interviewId);
      if (res.data && res.data.success) {
        // Refresh interview in state
        await refreshInterview(interviewId);
        navigate(`/interview/${interviewId}`);
      } else {
        alert('Could not join interview: ' + (res.data?.message || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Could not join interview: ' + (err.response?.data?.message || err.message));
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Your Scheduled Interviews</h1>
          <p className="text-gray-600">
            You can only start an interview during its scheduled time window.
          </p>
        </div>
        {scheduled.length === 0 ? (
          <div className="text-center text-gray-500">No scheduled interviews found. Please wait for an admin to schedule your interview.</div>
        ) : (
          <div className="space-y-6">
            {scheduled.map((iv) => {
              const { id, stackId, scheduledDate, scheduledTime, duration } = getScheduledFields(iv);
              return (
                <Card key={id}>
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-lg mb-1">
  Tech Stack: <span className="font-normal">{
    availableTechStacks.find((stack: TechStack) => stack.id === stackId)?.name || (
      <span className="text-red-500">Unknown</span>
    )
  }</span>
</div>
                      <div className="text-sm text-gray-600 mb-1">
                        Scheduled Date: {scheduledDate ? new Date(scheduledDate).toLocaleDateString() : ''}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Scheduled Time: {scheduledDate ? new Date(scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                      <div className="text-sm text-gray-600">Duration: {duration || 30} min</div>
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-6">
                      <Button
                        onClick={() => handleStart(id)}
                        disabled={!canStart(iv) || isLoading}
                        className="w-full"
                      >
                        {isLoading ? 'Starting...' : <><Play size={16} className="mr-2" />Start Interview</>}
                      </Button>
                      {!canStart(iv) && (
                        <div className="text-xs text-gray-400 mt-2">Interview can only be started during the scheduled window.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CandidateSelect;
