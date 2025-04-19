import React from 'react';
import { useInterview } from '@/context/InterviewContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';

const ToggleAIMode: React.FC = () => {
  const { useFreeMode, setUseFreeMode } = useInterview();

  return (
    <div className="flex items-center space-x-4 rounded-md border p-4">
      <div className="flex-1 space-y-1">
        <div className="flex items-center">
          <Label htmlFor="ai-mode" className="font-medium">Free AI Mode</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 text-gray-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Free mode uses browser Web Speech API and local evaluation.
                  Paid mode uses OpenAI Whisper and GPT for more accurate results.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-gray-500">
          {useFreeMode 
            ? "Using browser-based speech recognition and local evaluation (free)" 
            : "Using OpenAI Whisper and GPT-4 (requires API key)"
          }
        </p>
      </div>
      <Switch
        id="ai-mode"
        checked={useFreeMode}
        onCheckedChange={setUseFreeMode}
      />
    </div>
  );
};

export default ToggleAIMode; 