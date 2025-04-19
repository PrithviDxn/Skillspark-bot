import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { techStackAPI } from '@/api';
import { useInterview } from '@/context/InterviewContext';

type TechStack = {
  _id: string;
  name: string;
  description: string;
};

const TechStackList: React.FC = () => {
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshTechStacks } = useInterview();

  // Fetch tech stacks from the API
  useEffect(() => {
    const fetchTechStacks = async () => {
      setIsLoading(true);
      try {
        const response = await techStackAPI.getAll();
        if (response.data && response.data.data) {
          setTechStacks(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching tech stacks:', error);
        toast.error('Failed to load tech stacks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTechStacks();
  }, []);

  const handleArchiveTechStack = async (id: string, name: string) => {
    try {
      await techStackAPI.delete(id);
      setTechStacks(techStacks.filter(stack => stack._id !== id));
      toast.success(`Tech stack "${name}" archived successfully`);
      
      // Refresh the tech stacks in the context
      await refreshTechStacks();
    } catch (error) {
      console.error('Error archiving tech stack:', error);
      toast.error('Failed to archive tech stack');
    }
  };

  // Function to get an emoji for each tech stack
  const getTechStackEmoji = (name: string) => {
    const emojiMap: Record<string, string> = {
      'React': '⚛️',
      'Python': '🐍',
      'Node.js': '🟢',
      'Java': '☕',
      'JavaScript': '𝗝𝗦',
      'TypeScript': 'TS',
      'Angular': '🅰️',
      'Vue': '🟩',
      'PHP': '🐘',
      'Ruby': '💎',
      'C#': '🎯',
      'Go': '🐹',
      'Swift': '🐦',
      'Kotlin': '🎯',
      'Rust': '🦀',
    };
    
    return emojiMap[name] || '🔧';
  };

  return (
    <>
      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading tech stacks...</p>
        </div>
      ) : techStacks.length > 0 ? (
        <div className="space-y-4">
          {techStacks.map((stack) => (
            <div key={stack._id} className="border rounded-md overflow-hidden">
              <div className="bg-gray-50 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{getTechStackEmoji(stack.name)}</div>
                  <div>
                    <h3 className="font-medium">{stack.name}</h3>
                    <p className="text-sm text-gray-500">{stack.description}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleArchiveTechStack(stack._id, stack.name)}
                >
                  <Archive size={16} className="mr-2" />
                  Archive
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold">No tech stacks found</h3>
          <p className="mt-1 text-sm">Add your first tech stack using the form above</p>
        </div>
      )}
    </>
  );
};

export default TechStackList; 