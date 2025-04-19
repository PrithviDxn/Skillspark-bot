import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Check } from 'lucide-react';

// Add SpeechRecognition types
interface Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [key: number]: {
      isFinal: boolean;
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, transcript?: string) => void;
  isDisabled?: boolean;
  useSpeechRecognition?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onRecordingComplete, 
  isDisabled = false,
  useSpeechRecognition = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      stopRecording();
      
      // Clean up speech recognition if active
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = () => {
    if (!useSpeechRecognition) return;
    
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      
      // Configure speech recognition
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      // Handle results
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update transcript
        setTranscript(finalTranscript || interimTranscript);
      };
      
      // Handle errors
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
      };
      
      return true;
    } else {
      console.warn('Speech recognition not supported in this browser');
      return false;
    }
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioURL(null);
    setTranscript('');
    
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
        onRecordingComplete(audioBlob, transcript);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start speech recognition if enabled
      if (useSpeechRecognition) {
        const isSupported = initSpeechRecognition();
        if (isSupported && recognitionRef.current) {
          recognitionRef.current.start();
        }
      }
      
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
      
      // Stop speech recognition if enabled
      if (useSpeechRecognition && recognitionRef.current) {
        recognitionRef.current.stop();
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
          {useSpeechRecognition && transcript && (
            <div className="mt-2 p-3 bg-gray-100 rounded-md w-full max-h-24 overflow-y-auto">
              <p className="text-sm text-gray-600">{transcript}</p>
            </div>
          )}
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
            <div className="flex flex-col items-center space-y-4 w-full">
              <div className="p-4 rounded-full bg-interview-success text-white">
                <Check size={24} />
              </div>
              <p className="text-sm text-gray-500">Recording complete</p>
              <audio src={audioURL} controls className="w-full" />
              {useSpeechRecognition && transcript && (
                <div className="mt-2 p-3 bg-gray-100 rounded-md w-full">
                  <h4 className="text-sm font-medium mb-1">Transcript:</h4>
                  <p className="text-sm">{transcript}</p>
                </div>
              )}
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
