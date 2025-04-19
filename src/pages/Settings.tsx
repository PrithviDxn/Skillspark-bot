import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import ToggleAIMode from '@/components/ToggleAIMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { user } = useAuth();

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully');
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

        <div className="grid gap-6">
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
              <CardContent>
                <p className="text-sm text-gray-500">
                  Additional admin settings will be added in future updates.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Settings; 