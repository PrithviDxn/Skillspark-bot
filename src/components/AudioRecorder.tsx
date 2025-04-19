
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Check } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isDisabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onRecordingComplete, 
  isDisabled = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioURL(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        onRecordingComplete(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      
      // Clear timer
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {isRecording ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="record-pulse">
            <div className="p-4 rounded-full bg-interview-danger text-white">
              <Mic size={24} />
            </div>
          </div>
          <div className="microphone-wave">
            <div className="microphone-wave-bar"></div>
            <div className="microphone-wave-bar"></div>
            <div className="microphone-wave-bar"></div>
            <div className="microphone-wave-bar"></div>
            <div className="microphone-wave-bar"></div>
          </div>
          <div className="text-xl font-bold">{formatTime(recordingTime)}</div>
          <Button 
            variant="destructive" 
            onClick={stopRecording}
            className="flex items-center space-x-2"
          >
            <Square size={16} />
            <span>Stop Recording</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          {audioURL ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-interview-success text-white">
                <Check size={24} />
              </div>
              <p className="text-sm text-gray-500">Recording complete</p>
              <audio src={audioURL} controls className="w-full" />
              <Button 
                onClick={startRecording} 
                disabled={isDisabled}
                className="flex items-center space-x-2"
              >
                <Mic size={16} />
                <span>Record Again</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-gray-200 text-gray-700">
                <Mic size={24} />
              </div>
              <p className="text-sm text-gray-500">Click to start recording</p>
              <Button 
                onClick={startRecording} 
                disabled={isDisabled}
                className="flex items-center space-x-2"
              >
                <Mic size={16} />
                <span>Start Recording</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
