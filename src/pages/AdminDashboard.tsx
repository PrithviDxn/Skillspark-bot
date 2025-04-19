import React, { useState } from 'react';
import { useInterview } from '@/context/InterviewContext';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import QuestionManager from '@/components/QuestionManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Archive, Clipboard, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { availableTechStacks, interviews } = useInterview();
  const [activeTab, setActiveTab] = useState<'interviews' | 'techStacks'>('interviews');
  
  const [newStackName, setNewStackName] = useState('');
  const [newStackDesc, setNewStackDesc] = useState('');
  
  const completedInterviews = interviews.filter(interview => interview.status === 'completed');
  const pendingInterviews = interviews.filter(interview => interview.status !== 'completed');

  const handleAddTechStack = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Tech stack added (demo only)');
    setNewStackName('');
    setNewStackDesc('');
  };

  const handleUploadQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Questions uploaded (demo only)');
  };

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="mt-2">You don't have permission to view this page.</p>
          <Button className="mt-4" asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">Manage interviews, tech stacks, and questions</p>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'interviews'
                ? 'text-interview-primary border-b-2 border-interview-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('interviews')}
          >
            Interviews
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'techStacks'
                ? 'text-interview-primary border-b-2 border-interview-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('techStacks')}
          >
            Tech Stacks & Questions
          </button>
        </div>
      </div>
      
      {activeTab === 'interviews' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Interviews</CardTitle>
                <CardDescription>
                  Interviews that are scheduled or in progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingInterviews.length > 0 ? (
                  <div className="space-y-4">
                    {pendingInterviews.map(interview => {
                      const techStack = availableTechStacks.find(
                        stack => stack.id === interview.stackId
                      );
                      
                      return (
                        <div 
                          key={interview.id} 
                          className="p-4 border rounded-md flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">
                              {techStack?.name || 'Unknown'} Interview
                            </p>
                            <p className="text-sm text-gray-500">
                              Started: {new Date(interview.createdAt).toLocaleString()}
                            </p>
                            <div className="mt-1">
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                {interview.status}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/report/${interview.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clipboard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold">No pending interviews</h3>
                    <p className="mt-1 text-sm">Start a new interview with a candidate</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Completed Interviews</CardTitle>
                <CardDescription>
                  Interviews that have been completed and evaluated
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedInterviews.length > 0 ? (
                  <div className="space-y-4">
                    {completedInterviews.map(interview => {
                      const techStack = availableTechStacks.find(
                        stack => stack.id === interview.stackId
                      );
                      
                      return (
                        <div 
                          key={interview.id} 
                          className="p-4 border rounded-md flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">
                              {techStack?.name || 'Unknown'} Interview
                            </p>
                            <p className="text-sm text-gray-500">
                              Completed: {interview.completedAt ? new Date(interview.completedAt).toLocaleString() : 'Unknown'}
                            </p>
                            <div className="mt-1">
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                completed
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/report/${interview.id}`}>
                              View Report
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold">No completed interviews</h3>
                    <p className="mt-1 text-sm">Completed interviews will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <QuestionManager />
          
          <Card>
            <CardHeader>
              <CardTitle>Available Tech Stacks</CardTitle>
              <CardDescription>
                Tech stacks and their associated questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableTechStacks.map((stack) => (
                  <div key={stack.id} className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{stack.icon}</div>
                        <div>
                          <h3 className="font-medium">{stack.name}</h3>
                          <p className="text-sm text-gray-500">{stack.description}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Archive size={16} className="mr-2" />
                        Archive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
