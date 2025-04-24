import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Edit } from 'lucide-react';

interface TranscriptViewerProps {
  transcript?: string;
  answerId: string;
  onReload?: (answerId: string) => Promise<void>;
  onManualEntry?: (answerId: string, transcript: string) => Promise<void>;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ 
  transcript, 
  answerId, 
  onReload, 
  onManualEntry 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [manualTranscript, setManualTranscript] = useState('');

  const handleReload = async () => {
    if (!onReload) return;
    
    setIsLoading(true);
    try {
      await onReload(answerId);
      toast.success("Transcript refreshed");
    } catch (err) {
      console.error("Error reloading transcript:", err);
      toast.error("Failed to reload transcript");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setManualTranscript(transcript || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!onManualEntry) return;
    
    setIsLoading(true);
    try {
      await onManualEntry(answerId, manualTranscript);
      toast.success("Transcript updated");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating transcript:", err);
      toast.error("Failed to update transcript");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="w-full">
        <textarea
          value={manualTranscript}
          onChange={(e) => setManualTranscript(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md min-h-[100px]"
          placeholder="Enter transcript manually..."
        />
        <div className="flex justify-end space-x-2 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    );
  }

  // Display debug info for transcript
  const displayDebugInfo = () => {
    console.log('Transcript data:', {
      answerId,
      hasTranscript: !!transcript,
      transcriptLength: transcript?.length || 0,
      transcriptPreview: transcript?.substring(0, 50)
    });
    toast.info('Transcript debug info logged to console');
  };

  return (
    <div className="w-full">
      {transcript ? (
        <div className="bg-gray-50 p-3 rounded-md text-sm">
          <p className="whitespace-pre-wrap">{transcript}</p>
          <div className="flex justify-end mt-2 space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={displayDebugInfo}
            >
              Debug Info
            </Button>
            {onReload && (
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
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Reload
                  </>
                )}
              </Button>
            )}
            {onManualEntry && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={handleEdit}
                disabled={isLoading}
              >
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600 mb-2">No transcript available</p>
          <div className="text-xs text-gray-400 mb-2">
            Answer ID: {answerId.substring(0, 8)}...
          </div>
          <div className="flex space-x-2">
            {onReload && (
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
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Reload
                  </>
                )}
              </Button>
            )}
            {onManualEntry && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={handleEdit}
                disabled={isLoading}
              >
                <Edit className="mr-1 h-3 w-3" />
                Enter Manually
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptViewer;
