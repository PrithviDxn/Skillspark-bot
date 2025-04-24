import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  audioUrl?: string;
  answerId?: string;
  onReload?: (answerId: string) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, answerId, onReload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(audioUrl);
  const [attemptCount, setAttemptCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fallback function if the main URL fails
  const getFallbackUrl = (url: string): string => {
    if (!url) return '';
    
    // Extract filename from URL
    const filename = url.split('/').pop() || url;
    
    // Base URL (without /api/v1)
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const baseServerUrl = baseUrl.includes('/api/v1') 
      ? baseUrl.substring(0, baseUrl.lastIndexOf('/api/v1')) 
      : baseUrl;
    
    // If the URL is already a full URL but failed, try the direct server path
    if (url.startsWith('http')) {
      return `${baseServerUrl}/uploads/${filename}`;
    }
    
    // If it was a relative URL, try the absolute URL
    return `${baseServerUrl}${url.startsWith('/') ? url : `/${url}`}`;
  };

  useEffect(() => {
    // Reset error state when audioUrl changes
    setError(null);
    setCurrentUrl(audioUrl);
    setAttemptCount(0);
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
          setError('Failed to play audio');
          toast.error('Failed to play audio');
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleReload = () => {
    if (answerId && onReload) {
      setError(null);
      onReload(answerId);
    } else if (audioUrl && error) {
      // If the current URL failed, try a fallback URL
      const fallbackUrl = getFallbackUrl(audioUrl);
      
      console.log(`Trying fallback URL:`, fallbackUrl);
      setCurrentUrl(fallbackUrl);
      setAttemptCount(prev => prev + 1);
      setError(null);
      toast.info(`Trying alternative audio URL format`);
    } else {
      toast.error('Cannot reload audio: missing answer ID or reload handler');
    }
  };

  const handleError = () => {
    console.error('Audio failed to load:', currentUrl);
    
    // Only try one fallback automatically to avoid infinite loops
    if (audioUrl && attemptCount === 0) {
      const fallbackUrl = getFallbackUrl(audioUrl);
      
      console.log(`Auto-trying fallback URL:`, fallbackUrl);
      setCurrentUrl(fallbackUrl);
      setAttemptCount(1);
    } else {
      setError('Failed to load audio file');
    }
  };

  if (!audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-md">
        <p className="text-gray-500 mb-2">No audio available</p>
        {answerId && onReload && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={handleReload}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Reload Audio
          </Button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-md">
        <p className="text-red-500 mb-2">{error}</p>
        <div className="text-xs text-gray-500 mb-2">Last attempted URL: {currentUrl?.substring(0, 30)}...</div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs"
          onClick={handleReload}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Try Different Format
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <audio 
        ref={audioRef} 
        src={currentUrl} 
        onEnded={() => setIsPlaying(false)}
        onError={handleError}
        className="hidden"
      />
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
          onClick={handleMuteToggle}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Button>
        <div className="text-xs text-gray-400 flex-grow truncate">
          {currentUrl && `URL: ${currentUrl.split('/').pop() || '...'}`}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs"
          onClick={handleReload}
        >
          <RefreshCw className="mr-1 h-3 w-3" /> 
          Reload Audio
        </Button>
      </div>
    </div>
  );
};

export default AudioPlayer;
