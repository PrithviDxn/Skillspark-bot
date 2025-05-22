import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useInterview } from '@/context/InterviewContext';
import Layout from '@/components/Layout';
import ToggleAIMode from '@/components/ToggleAIMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Save, Trash2, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { interviewAPI, userAPI } from '@/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { interviews, fetchInterviews } = useInterview();
  const [isDeletingInterviews, setIsDeletingInterviews] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCandidates();
    }
  }, [user]);

  const fetchCandidates = async () => {
    try {
      const response = await userAPI.getAll();
      if (response.data && response.data.data) {
        const users = response.data.data.filter((u: any) => u.role === 'user');
        setCandidates(users);
      }
    } catch (error) {
      toast.error('Failed to fetch candidates');
    }
  };

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully');
  };

  const handleDeleteAllPendingInterviews = async () => {
    if (!confirm('Are you sure you want to delete all pending interviews? This action cannot be undone.')) {
      return;
    }

    setIsDeletingInterviews(true);
    try {
      // Get all pending interviews
      const pendingInterviews = interviews.filter(interview => interview.status !== 'completed');
      
      // Delete each interview
      const deletePromises = pendingInterviews.map(interview => 
        interviewAPI.delete(interview.id)
      );
      
      await Promise.all(deletePromises);
      
      // Refresh the interviews list
      await fetchInterviews();
      toast.success('All pending interviews deleted successfully');
    } catch (error) {
      console.error('Error deleting interviews:', error);
      toast.error('Failed to delete some interviews');
    } finally {
      setIsDeletingInterviews(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!selectedCandidateId) return;
    const candidate = candidates.find(c => c._id === selectedCandidateId);
    if (!candidate) return;
    if (!confirm(`Are you sure you want to permanently delete candidate "${candidate.name}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeletingCandidate(true);
    try {
      await userAPI.delete(selectedCandidateId);
      toast.success('Candidate deleted successfully');
      setSelectedCandidateId('');
      fetchCandidates();
    } catch (error) {
      toast.error('Failed to delete candidate');
    } finally {
      setIsDeletingCandidate(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-gray-500">Configure your interview system settings</p>
          </div>
          <Button onClick={handleSaveSettings} className="flex items-center">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" />
                AI Settings
              </CardTitle>
              <CardDescription>
                Configure the AI evaluation and speech recognition options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleAIMode />
              
              <div className="mt-4 bg-blue-50 p-4 rounded-md text-sm text-blue-700">
                <p className="font-semibold">Note about AI services:</p>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>Free mode uses browser's Web Speech API and rule-based local evaluation</li>
                  <li>Paid mode uses OpenAI's Whisper for transcription and GPT-4 for evaluations</li>
                  <li>To use paid mode, you must set your OpenAI API key in the .env file</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {user?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                  Additional settings available to administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-md p-4 mb-6">
                  <h3 className="font-medium mb-2">Interview Management</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Manage pending interviews in the system
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAllPendingInterviews}
                    disabled={isDeletingInterviews || interviews.filter(i => i.status !== 'completed').length === 0}
                    className="flex items-center"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeletingInterviews ? 'Deleting...' : 'Delete All Pending Interviews'}
                  </Button>
                </div>
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Remove Candidate</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Select a candidate to permanently remove them from the system
                  </p>
                  <div className="flex items-center gap-4 mb-4">
                    <Select
                      value={selectedCandidateId}
                      onValueChange={setSelectedCandidateId}
                      disabled={candidates.length === 0}
                    >
                      <SelectTrigger className="w-[260px]">
                        <SelectValue placeholder={candidates.length === 0 ? 'No candidates found' : 'Select candidate'} />
                      </SelectTrigger>
                      <SelectContent>
                        {candidates.map(candidate => (
                          <SelectItem key={candidate._id} value={candidate._id}>
                            {candidate.name} ({candidate.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteCandidate}
                      disabled={!selectedCandidateId || isDeletingCandidate}
                      className="flex items-center"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      {isDeletingCandidate ? 'Deleting...' : 'Delete Candidate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Settings; 