import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl?: string;
  answerId: string;
  onReload?: (answerId: string) => Promise<void>;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, answerId, onReload }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  // Function to get full audio URL with different fallback options
  const getFullAudioUrl = (url?: string) => {
    if (!url) return '';
    
    // If it's already a full URL, return it
    if (url.startsWith('http')) {
      return url;
    }
    
    // Get the base URL without /api/v1 if present
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const baseApiUrl = baseUrl.endsWith('/api/v1') 
      ? baseUrl.substring(0, baseUrl.length - 7) 
      : baseUrl;
    
    // Extract filename if path is included
    const filename = url.split('/').pop() || url;
    
    // Return direct path to uploads folder
    return `${baseApiUrl}/uploads/${filename}`;
  };

  useEffect(() => {
    if (audioUrl) {
      setAudioSrc(getFullAudioUrl(audioUrl));
      setError(false);
    } else {
      setError(true);
    }
  }, [audioUrl]);

  const handleReload = async () => {
    if (!onReload) return;
    
    setIsLoading(true);
    try {
      await onReload(answerId);
      toast.success("Audio data refreshed");
      setError(false);
    } catch (err) {
      toast.error("Failed to reload audio");
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    console.error("Audio error:", e);
    console.error("Audio URL that failed:", audioSrc);
    setError(true);
    
    // Try alternative URL formats
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const baseApiUrl = baseUrl.endsWith('/api/v1') 
      ? baseUrl.substring(0, baseUrl.length - 7) 
      : baseUrl;
    
    if (audioUrl) {
      const filename = audioUrl.split('/').pop() || audioUrl;
      
      // Try different URL patterns
      const alternativeUrls = [
        `${baseApiUrl}/uploads/${filename}`,
        `${baseUrl}/uploads/${filename}`,
        `/uploads/${filename}`,
        `${baseApiUrl}/${audioUrl}`,
        `${baseUrl}/${audioUrl}`
      ];
      
      console.log("Trying alternative URLs:", alternativeUrls);
      
      // Set to the first alternative
      setAudioSrc(alternativeUrls[0]);
    }
  };

  return (
    <div className="w-full">
      {!error && audioSrc ? (
        <div>
          <audio 
            src={audioSrc} 
            controls 
            className="w-full" 
            onError={handleAudioError}
          />
          <div className="flex justify-end mt-1">
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
                "Reload Audio"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600 mb-2">Audio not available</p>
          <p className="text-xs text-gray-500">The candidate may not have recorded an answer for this question.</p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs mt-2"
            onClick={handleReload}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Loading...
              </>
            ) : (
              "Attempt to Reload Audio"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
