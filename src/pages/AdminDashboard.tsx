import React, { useState, useEffect } from 'react';
import { useInterview } from '@/context/InterviewContext';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import QuestionManager from '@/components/QuestionManager';
import TechStackManager from '@/components/TechStackManager';
import TechStackList from '@/components/TechStackList';
import InterviewScheduler from '@/components/InterviewScheduler';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Archive, Clipboard, ClipboardCheck, UserPlus, Upload, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { userAPI } from '@/api';

// Add this interface for user data
interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { availableTechStacks, interviews, getQuestionsForStack } = useInterview();
  const [activeTab, setActiveTab] = useState<'interviews' | 'techStacks' | 'users' | 'browse' | 'reports'>('interviews');
  const [selectedStack, setSelectedStack] = useState<string>('');
  const [selectedStackForBrowse, setSelectedStackForBrowse] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  
  // Add sorting states
  const [pendingSortBy, setPendingSortBy] = useState<'date' | 'stack' | 'status'>('date');
  const [completedSortBy, setCompletedSortBy] = useState<'date' | 'stack'>('date');
  
  const completedInterviews = interviews.filter(interview => interview.status === 'completed');
  const pendingInterviews = interviews.filter(interview => interview.status !== 'completed');

  // Sort interviews based on criteria
  const sortedPendingInterviews = [...pendingInterviews].sort((a, b) => {
    if (pendingSortBy === 'date') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Most recent first
    } else if (pendingSortBy === 'stack') {
      const stackA = availableTechStacks.find(stack => stack.id === a.stackId)?.name || '';
      const stackB = availableTechStacks.find(stack => stack.id === b.stackId)?.name || '';
      return stackA.localeCompare(stackB);
    } else { // status
      return a.status.localeCompare(b.status);
    }
  });

  const sortedCompletedInterviews = [...completedInterviews].sort((a, b) => {
    if (completedSortBy === 'date') {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    } else { // stack
      const stackA = availableTechStacks.find(stack => stack.id === a.stackId)?.name || '';
      const stackB = availableTechStacks.find(stack => stack.id === b.stackId)?.name || '';
      return stackA.localeCompare(stackB);
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['txt', 'docx', 'csv'].includes(extension)) {
      toast.error('Invalid file format. Please upload .txt, .docx, or .csv files only.');
      return;
    }

    // Demo only - in real app this would send to backend
    toast.success(`File "${file.name}" uploaded successfully (demo)`);
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchAdminUsers();
    }
  }, [activeTab]);

  const fetchAdminUsers = async () => {
    setIsLoadingAdmins(true);
    try {
      const response = await userAPI.getAll();
      if (response.data && response.data.data) {
        // Filter to only get users with role 'admin'
        const admins = response.data.data.filter((user: AdminUser) => user.role === 'admin');
        setAdminUsers(admins);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast.error('Failed to load admin users');
    } finally {
      setIsLoadingAdmins(false);
    }
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

  // Get questions for the selected tech stack
  const getQuestionsForSelectedStack = () => {
    if (!selectedStackForBrowse) return [];
    return getQuestionsForStack(selectedStackForBrowse);
  };

  // Find tech stack name by ID
  const getStackNameById = (id: string) => {
    const stack = availableTechStacks.find(s => s.id === id);
    return stack ? stack.name : 'Unknown';
  };

  // Find difficulty color class
  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderUserManagementTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Create and manage administrator accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Create Administrator Account</h3>
            <p className="text-gray-600 mb-4">
              Create a new administrator account with full system access and privileges.
            </p>
            <Button asChild>
              <Link to="/admin/create" className="flex items-center">
                <UserPlus size={16} className="mr-2" />
                Create Admin Account
              </Link>
            </Button>
          </div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-2">Current Administrators</h3>
            <p className="text-gray-600 mb-4">
              View and manage existing administrator accounts.
            </p>
            
            {isLoadingAdmins ? (
              <div className="text-center py-8">
                <p>Loading administrators...</p>
              </div>
            ) : adminUsers.length > 0 ? (
              <div className="space-y-4">
                {adminUsers.map((admin) => (
                  <div key={admin._id} className="border rounded-md p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold">No administrators found</h3>
                <p className="mt-1 text-sm">Create your first admin account using the form above</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">Manage interviews, tech stacks, and users</p>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b overflow-x-auto">
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
              activeTab === 'reports'
                ? 'text-interview-primary border-b-2 border-interview-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'techStacks'
                ? 'text-interview-primary border-b-2 border-interview-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('techStacks')}
          >
            Tech Stack Manager
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'browse'
                ? 'text-interview-primary border-b-2 border-interview-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('browse')}
          >
            Tech Stack Questions
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'users'
                ? 'text-interview-primary border-b-2 border-interview-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
        </div>
      </div>
      
      {activeTab === 'interviews' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <InterviewScheduler />
            </div>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pending Interviews</CardTitle>
                  <CardDescription>
                    Interviews that are scheduled or in progress
                  </CardDescription>
                </div>
                <Select value={pendingSortBy} onValueChange={(value: 'date' | 'stack' | 'status') => setPendingSortBy(value)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="stack">Sort by Tech Stack</SelectItem>
                    <SelectItem value="status">Sort by Status</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {sortedPendingInterviews.length > 0 ? (
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {sortedPendingInterviews.map(interview => {
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
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Completed Interviews</CardTitle>
                <CardDescription>
                  Interviews that have been completed and evaluated
                </CardDescription>
              </div>
              <Select value={completedSortBy} onValueChange={(value: 'date' | 'stack') => setCompletedSortBy(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="stack">Sort by Tech Stack</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {sortedCompletedInterviews.length > 0 ? (
                <div className="space-y-4">
                  {sortedCompletedInterviews.map(interview => {
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
      ) : activeTab === 'techStacks' ? (
        <div className="space-y-6">
          {/* Top grid for Add Tech Stack and Upload Questions side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tech Stack Management - Left Column */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Tech Stack</CardTitle>
                <CardDescription>
                  Create a new technology stack for interview questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TechStackManager />
              </CardContent>
            </Card>
            
            {/* Upload Questions - Right Column */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Questions File</CardTitle>
                <CardDescription>
                  Upload questions in bulk using .txt, .docx, or .csv files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stack-select">Select Tech Stack</Label>
                    <Select value={selectedStack} onValueChange={setSelectedStack}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a tech stack" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTechStacks.map((stack) => (
                          <SelectItem key={stack.id} value={stack.id}>
                            {stack.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload File</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".txt,.docx,.csv"
                        className="flex-1"
                        onChange={handleFileUpload}
                      />
                      <Button variant="secondary">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Supported formats: .txt, .docx, .csv
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Individual Question Management - Full Width */}
          <QuestionManager showUploadSection={false} />
        </div>
      ) : activeTab === 'browse' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Browse Tech Stack Questions</CardTitle>
              <CardDescription>
                Select a tech stack to view its questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableTechStacks.map((stack) => (
                  <div 
                    key={stack.id} 
                    className={`border rounded-md p-4 cursor-pointer transition-colors hover:border-interview-primary ${selectedStackForBrowse === stack.id ? 'border-interview-primary bg-interview-primary/5' : ''}`}
                    onClick={() => setSelectedStackForBrowse(stack.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{stack.icon}</div>
                      <div>
                        <h3 className="font-medium">{stack.name}</h3>
                        <p className="text-sm text-gray-500">
                          {getQuestionsForStack(stack.id).length} questions
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedStackForBrowse && (
            <Card>
              <CardHeader>
                <CardTitle>{getStackNameById(selectedStackForBrowse)} Questions</CardTitle>
                <CardDescription>
                  Questions for the selected tech stack
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getQuestionsForSelectedStack().map((question) => (
                    <div key={question.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{question.text}</p>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        renderUserManagementTab()
      )}
    </Layout>
  );
};

export default AdminDashboard;
