import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Edit } from 'lucide-react';

interface TranscriptViewerProps {
  transcript?: string;
  answerId: string;
  onReload?: (answerId: string) => Promise<void>;
  onManualEntry?: (answerId: string, transcript: string) => void;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ 
  transcript, 
  answerId, 
  onReload,
  onManualEntry
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleReload = async () => {
    if (!onReload) return;
    
    setIsLoading(true);
    try {
      await onReload(answerId);
      toast.success("Transcript data refreshed");
    } catch (err) {
      toast.error("Failed to reload transcript");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = () => {
    if (!onManualEntry) return;
    
    const manualTranscript = prompt("Enter transcript manually:");
    if (manualTranscript) {
      onManualEntry(answerId, manualTranscript);
      toast.success("Transcript updated manually");
    }
  };

  return (
    <div className="w-full">
      {transcript ? (
        <div className="relative bg-gray-50 p-4 rounded-md">
          <pre className="text-sm whitespace-pre-wrap">{transcript}</pre>
          <div className="flex justify-end mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={handleReload}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                "Refresh Transcript"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600 mb-2">[TRANSCRIPT NOT AVAILABLE]</p>
          <p className="text-xs text-gray-500">
            {transcript !== undefined && `Transcript length: ${transcript.length} characters`}
          </p>
          <div className="mt-3 flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={handleReload}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                "Refresh Transcript"
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={handleManualEntry}
            >
              <Edit className="mr-1 h-3 w-3" />
              Enter Manually
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptViewer;
