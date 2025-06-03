import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInterview } from '@/context/InterviewContext';
import { interviewAPI } from '@/api/index';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, Building, Code } from 'lucide-react';
import { format } from 'date-fns/format';
import { toast } from 'sonner';
import SendInvitationButton from '@/components/SendInvitationButton';

interface Candidate {
  _id: string;
  name: string;
  email: string;
}

interface Role {
  _id: string;
  name: string;
  description: string;
}

interface TechStack {
  _id: string;
  name: string;
  description: string;
}

interface DetailedInterview {
  _id: string;
  candidate: Candidate;
  role?: Role;
  techStack: TechStack;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const InterviewDetails = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshInterview } = useInterview();
  
  const [interview, setInterview] = useState<DetailedInterview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviewDetails = async () => {
      if (!interviewId) return;
      
      try {
        setLoading(true);
        const response = await interviewAPI.getById(interviewId);
        
        if (response.data?.data) {
          setInterview(response.data.data);
        } else {
          toast.error('Failed to load interview details');
        }
      } catch (error) {
        console.error('Error fetching interview details:', error);
        toast.error('Error loading interview details');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewDetails();
  }, [interviewId]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      // Format: YYYY-MM-DD
      const dateParts = date.split('-').map(part => parseInt(part, 10));
      
      // Format: HH:MM (24-hour)
      const timeParts = time.split(':').map(part => parseInt(part, 10));
      
      const dateObj = new Date(
        dateParts[0], // year
        dateParts[1] - 1, // month (0-indexed)
        dateParts[2], // day
        timeParts[0], // hour
        timeParts[1] // minute
      );
      
      return format(dateObj, 'PPP p'); // e.g., "April 29, 2023 at 2:30 PM"
    } catch (error) {
      console.error('Error formatting date/time:', error);
      return `${date} at ${time}`;
    }
  };

  const handleInvitationSuccess = () => {
    toast.success('Interview invitation sent successfully!');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="mr-2"
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Interview Details</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading interview details...</p>
          </div>
        ) : interview ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Interview Information</CardTitle>
                <CardDescription>
                  Details about the scheduled interview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex items-start">
                    <User className="mr-2 h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Candidate</p>
                      <p>{interview.candidate.name}</p>
                      <p className="text-sm text-gray-500">{interview.candidate.email}</p>
                    </div>
                  </div>

                  {interview.role && (
                    <div className="flex items-start">
                      <Building className="mr-2 h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Role</p>
                        <p>{interview.role.name}</p>
                        <p className="text-sm text-gray-500">{interview.role.description}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start">
                    <Code className="mr-2 h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Tech Stack</p>
                      <p>{interview.techStack.name}</p>
                      <p className="text-sm text-gray-500">{interview.techStack.description}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Calendar className="mr-2 h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Scheduled Date & Time</p>
                      <p>{formatDateTime(interview.scheduledDate, interview.scheduledTime)}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="mr-2 h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Duration</p>
                      <p>{interview.duration} minutes</p>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="font-medium">Status</p>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      interview.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : interview.status === 'scheduled' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  <SendInvitationButton 
                    interviewId={interview._id} 
                    onSuccess={handleInvitationSuccess}
                    disabled={interview.status !== 'scheduled'}
                  />
                  
                  {interview.status === 'completed' && (
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/interview-report/${interview._id}`)}
                    >
                      View Report
                    </Button>
                  )}
                </div>
                
                {interview.status === 'scheduled' && (
                  <Button 
                    onClick={() => navigate(`/interview/${interview._id}`)}
                  >
                    Start Interview
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="text-center py-10">
            <p>Interview not found</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBack}
              className="mt-4"
            >
              Return to Dashboard
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InterviewDetails;
