import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
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
import { Plus, Archive, Clipboard, ClipboardCheck, UserPlus, Upload, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { userAPI, questionAPI, interviewAPI } from '@/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Question } from '@/context/InterviewContext';
import TechStackGrid from '@/components/TechStackGrid';

// Add this interface for user data
interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { availableTechStacks, interviews, getQuestionsForStack, refreshQuestions, fetchInterviews } = useInterview();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedStack, setSelectedStack] = useState<string>('');
  const [selectedStackForBrowse, setSelectedStackForBrowse] = useState<string>('');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

   // Find tech stack name by ID
   const getStackNameById = (id: string) => {
    const stack = availableTechStacks.find(s => s.id === id);
    return stack ? stack.name : 'Unknown';
  };                                                      
  
  // Add sorting states
  const [pendingSortBy, setPendingSortBy] = useState<'nearest' | 'stack' | 'status'>('nearest');
  const [completedSortBy, setCompletedSortBy] = useState<'recent' | 'stack'>('recent');
  // Separate filter states for pending and completed interviews
  const [pendingMonthFilter, setPendingMonthFilter] = useState<string>('all');
  const [completedMonthFilter, setCompletedMonthFilter] = useState<string>('all');
  
  const completedInterviews = interviews.filter(interview => interview.status === 'completed');
  const pendingInterviews = interviews.filter(interview => interview.status !== 'completed');

  const [interviewList, setInterviewList] = useState<any[]>([]);

  // Ref and state to sync Pending Interviews card height to Schedule Interview card
  const scheduleCardRef = useRef<HTMLDivElement>(null);
  const [pendingCardHeight, setPendingCardHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (scheduleCardRef.current) {
      setPendingCardHeight(scheduleCardRef.current.offsetHeight);
    }
  }, [availableTechStacks, adminUsers, pendingInterviews.length]);

  // Check for stored active tab in localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('adminActiveTab');
    if (savedTab) {
      setActiveTab(savedTab);
      localStorage.removeItem('adminActiveTab'); // Remove it after using
    }
  }, []);

  // Save active tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  // Get current month in YYYY-MM format for default filter
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Generate last 12 months for filtering
  const getLast12Months = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthString = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      const monthDisplay = month.toLocaleString('default', { month: 'long', year: 'numeric' });
      months.push({ value: monthString, label: monthDisplay });
    }
    
    return months;
  };
  
  // Filter pending interviews by month
  const filteredPendingInterviews = useMemo(() => {
    if (pendingMonthFilter === 'all') return pendingInterviews;
    
    return pendingInterviews.filter((interview) => {
      const interviewDate = new Date(interview.scheduledDate);
      const interviewMonth = `${interviewDate.getFullYear()}-${String(interviewDate.getMonth() + 1).padStart(2, '0')}`;
      return interviewMonth === pendingMonthFilter;
    });
  }, [pendingInterviews, pendingMonthFilter]);
  
  // Filter completed interviews by month
  const filteredCompletedInterviews = useMemo(() => {
    if (completedMonthFilter === 'all') return completedInterviews;
    
    return completedInterviews.filter((interview) => {
      const interviewDate = new Date(interview.completedAt || interview.scheduledDate);
      const month = interviewDate.getMonth() + 1; // JS months are 0-indexed
      return month.toString() === completedMonthFilter;
    });
  }, [completedInterviews, completedMonthFilter]);
  
  // Sort completed interviews by completedAt date (most recent first)
  const sortedCompletedInterviews = useMemo(() => {
    return [...filteredCompletedInterviews].sort((a, b) => {
      const dateA = new Date(a.completedAt || a.scheduledDate);
      const dateB = new Date(b.completedAt || b.scheduledDate);
      return dateB.getTime() - dateA.getTime(); // Sort in descending order (newest first)
    });
  }, [filteredCompletedInterviews]);

  // Sort pending interviews based on selected criteria
  const sortedPendingInterviews = useMemo(() => {
    return [...filteredPendingInterviews].sort((a, b) => {
      switch (pendingSortBy) {
        case 'nearest':
          const dateA = new Date(a.scheduledDate);
          const dateB = new Date(b.scheduledDate);
          return dateA.getTime() - dateB.getTime();
        case 'stack': {
          const stackA = typeof a.stackId === 'string' ? getStackNameById(a.stackId) : '';
          const stackB = typeof b.stackId === 'string' ? getStackNameById(b.stackId) : '';
          console.log('Sorting by stack:', { a, b, stackA, stackB });
          return String(stackA).localeCompare(String(stackB));
        }
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [filteredPendingInterviews, pendingSortBy]);

  // Ref for the latest scheduled interview
  const latestScheduledRef = useRef<HTMLDivElement>(null);

  // Find the interview with the latest scheduledDate
  const latestScheduledInterviewId = useMemo(() => {
    if (sortedPendingInterviews.length === 0) return null;
    return sortedPendingInterviews.reduce((latest, curr) => {
      return new Date(curr.scheduledDate) > new Date(latest.scheduledDate) ? curr : latest;
    }, sortedPendingInterviews[0]).id;
  }, [sortedPendingInterviews]);

  // Scroll into view when the list updates
  useEffect(() => {
    if (latestScheduledRef.current) {
      latestScheduledRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [sortedPendingInterviews.length, latestScheduledInterviewId]);

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

  // Add polling to fetch interviews every 10 seconds
  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const response = await interviewAPI.getAll();
        if (response.data && response.data.data) {
          setInterviewList(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching interviews:', error);
      }
    };

    fetchInterviews(); // Initial fetch
    const interval = setInterval(fetchInterviews, 10000); // Poll every 10 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

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

 

  // Find difficulty color class
  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Add state for edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editQuestionDifficulty, setEditQuestionDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Add state for admin user edit dialog
  const [showAdminEditDialog, setShowAdminEditDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminRole, setEditAdminRole] = useState('admin');

  const handleEditAdmin = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditAdminName(admin.name);
    setEditAdminEmail(admin.email);
    setEditAdminRole(admin.role);
    setShowAdminEditDialog(true);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this administrator?')) return;
    
    try {
      await userAPI.delete(adminId);
      toast.success('Administrator deleted successfully');
      // If the deleted admin is the current user, log out
      if (user && user._id === adminId) {
        // Optionally, you can use your auth context's logout method if available
        window.location.href = '/login';
      } else {
        fetchAdminUsers();
      }
    } catch (error) {
      console.error('Error deleting administrator:', error);
      toast.error('Failed to delete administrator');
    }
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return;
    
    try {
      await userAPI.update(editingAdmin._id, {
        name: editAdminName,
        email: editAdminEmail,
        role: editAdminRole
      });
      toast.success('Administrator updated successfully');
      setShowAdminEditDialog(false);
      fetchAdminUsers();
    } catch (error) {
      console.error('Error updating administrator:', error);
      toast.error('Failed to update administrator');
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditAdmin(admin)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin._id)}
                      >
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

      {/* Edit Admin Dialog */}
      <Dialog open={showAdminEditDialog} onOpenChange={setShowAdminEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>
              Update administrator details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-admin-name">Name</Label>
              <Input
                id="edit-admin-name"
                value={editAdminName}
                onChange={(e) => setEditAdminName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-admin-email">Email</Label>
              <Input
                id="edit-admin-email"
                type="email"
                value={editAdminEmail}
                onChange={(e) => setEditAdminEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAdmin}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Find the live interview (status === 'in-progress')
  const currentLiveInterview = interviewList.find(iv => iv.status === 'in-progress');

  // Update remaining references to liveInterview
  const liveInterview = currentLiveInterview;

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
          <Link to="/admin/tech-stack-roles" className="px-4 py-2 font-medium text-interview-primary hover:text-interview-primary/80">
            Role Manager
          </Link>
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
            {/* Left column: Schedule Interview */}
            <div>
              <Card ref={scheduleCardRef} style={{ height: '732px' }}>
                <CardHeader>
                  <CardTitle>Schedule Interview</CardTitle>
                  <CardDescription>
                    Schedule an interview for a candidate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InterviewScheduler />
                </CardContent>
              </Card>
            </div>
            {/* Right column: Pending Interviews (top) */}
            <div>
              {/* Pending Interviews: fixed height to match Schedule Interview, now at the top */}
              <Card style={{ height: '732px' }}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Pending Interviews</CardTitle>
                    <CardDescription>
                      Interviews that are scheduled or in progress
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Select 
                      value={pendingMonthFilter} 
                      onValueChange={(value) => {
                        setPendingMonthFilter(value);
                        setPendingSortBy('nearest');
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {getLast12Months().map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={pendingSortBy} 
                      onValueChange={(value) => setPendingSortBy(value as 'nearest' | 'stack' | 'status')}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nearest">Nearest Date</SelectItem>
                        <SelectItem value="stack">Tech Stack</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent style={{ height: '660px', paddingTop: 0 }}>
                  {sortedPendingInterviews.length > 0 ? (
                    <div className="h-full overflow-y-auto space-y-4 pr-2 [&>*:last-child]:mb-0">
                      {sortedPendingInterviews.map(interview => {
                        const techStack = availableTechStacks.find(
                          stack => stack.id === interview.stackId
                        );
                        const isLatest = interview.id === latestScheduledInterviewId;
                        return (
                          <div 
                            key={interview.id} 
                            ref={isLatest ? latestScheduledRef : undefined}
                            className="p-4 border rounded-md flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium">
                                {techStack?.name || 'Unknown'} Interview
                              </p>
                              <p className="text-sm text-gray-500">
                                Scheduled: {interview.scheduledDate
                                  ? new Date(interview.scheduledDate).toLocaleString()
                                  : 'N/A'}
                              </p>
                              <div className="mt-1">
                                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                  {interview.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {interview.status === 'scheduled' && (
                                <Button variant="default" size="sm" asChild>
                                  <Link to={`/video/${interview.id}`}>
                                    Start Interview
                                  </Link>
                                </Button>
                              )}
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/admin/report/${interview.id}`}>
                                  View
                                </Link>
                              </Button>
                            </div>
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
              <div className="flex space-x-2">
                <Select value={completedMonthFilter} onValueChange={setCompletedMonthFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {getLast12Months().map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={completedSortBy} onValueChange={(value: 'recent' | 'stack') => setCompletedSortBy(value)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="stack">Tech Stack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <QuestionManager showUploadSection={false} />
              </CardContent>
            </Card>
          </div>
          
          {/* Individual Question Management - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle>Add Single Question</CardTitle>
              <CardDescription>
                Add a single question to the selected tech stack
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionManager showUploadSection={false} />
            </CardContent>
          </Card>
          <TechStackGrid />
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
                        <div className="ml-4 flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              // Open edit dialog
                              setEditingQuestion(question);
                              setEditQuestionText(question.text);
                              setEditQuestionDifficulty(question.difficulty);
                              setShowEditDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this question?')) {
                                try {
                                  await questionAPI.delete(question.id);
                                  toast.success('Question deleted successfully');
                                  await refreshQuestions(selectedStackForBrowse);
                                } catch (error) {
                                  console.error('Error deleting question:', error);
                                  toast.error('Failed to delete question');
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Add Edit Question Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Make changes to the question and its difficulty level
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-question-text">Question</Label>
              <Textarea
                id="edit-question-text"
                placeholder="Enter your question here..."
                className="min-h-[100px]"
                value={editQuestionText}
                onChange={(e) => setEditQuestionText(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-question-difficulty">Difficulty</Label>
              <Select 
                value={editQuestionDifficulty} 
                onValueChange={(value) => {
                  if (value === 'easy' || value === 'medium' || value === 'hard') {
                    setEditQuestionDifficulty(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingQuestion) return;
                
                try {
                  await questionAPI.update(editingQuestion.id, {
                    text: editQuestionText,
                    difficulty: editQuestionDifficulty
                  });
                  toast.success('Question updated successfully');
                  await refreshQuestions(selectedStackForBrowse);
                  setShowEditDialog(false);
                } catch (error) {
                  console.error('Error updating question:', error);
                  toast.error('Failed to update question');
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminDashboard;
