import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { techStackAPI } from '@/api';
import { useInterview } from '@/context/InterviewContext';
import axios, { AxiosError } from 'axios';

type TechStack = {
  _id: string;
  name: string;
  description: string;
};

interface TechStackManagerProps {
  displayFullCard?: boolean;
}

const TechStackManager: React.FC<TechStackManagerProps> = ({ displayFullCard = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackDescription, setNewStackDescription] = useState('');
  const { refreshTechStacks } = useInterview();

  const handleAddTechStack = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStackName.trim()) {
      toast.error('Please enter a tech stack name');
      return;
    }
    
    if (!newStackDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await techStackAPI.create({
        name: newStackName.trim(),
        description: newStackDescription.trim()
      });
      
      if (response.data && response.data.data) {
        toast.success(`Tech stack "${newStackName}" added successfully`);
        
        // Reset form
        setNewStackName('');
        setNewStackDescription('');
        
        // Refresh the tech stacks in the context
        await refreshTechStacks();
      }
    } catch (error: unknown) {
      console.error('Error adding tech stack:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
          const errorData = axiosError.response.data as { error?: string };
          toast.error(`Failed to add tech stack: ${errorData.error || 'Unknown error'}`);
        } else {
          toast.error('Failed to add tech stack: Server error');
        }
      } else {
        toast.error('Failed to add tech stack');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAddTechStackForm = () => (
    <form onSubmit={handleAddTechStack} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="stack-name">Tech Stack Name</Label>
        <Input
          id="stack-name"
          placeholder="e.g. React, Python, Java"
          value={newStackName}
          onChange={(e) => setNewStackName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stack-description">Description</Label>
        <Textarea
          id="stack-description"
          placeholder="Brief description of the technology stack"
          value={newStackDescription}
          onChange={(e) => setNewStackDescription(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        {isSubmitting ? 'Adding...' : 'Add Tech Stack'}
      </Button>
    </form>
  );

  return renderAddTechStackForm();
};

export default TechStackManager; 