import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Check, MicOff } from 'lucide-react';

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
  useSpeechRecognition = true
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
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
        
        // Update both transcripts
        const fullTranscript = finalTranscript || interimTranscript;
        setLiveTranscript(fullTranscript);
        setTranscript((prev) => prev + ' ' + finalTranscript); // Only add final transcripts to the saved version
        
        // Emit transcript update event so parent components can show real-time transcript
        const transcriptEvent = new CustomEvent('transcriptupdate', { 
          detail: { text: fullTranscript, isFinal: !!finalTranscript }
        });
        document.dispatchEvent(transcriptEvent);
      };
      
      // Handle errors
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        
        // If no speech detected, try to restart
        if (event.error === 'no-speech' && isRecording) {
          try {
            recognitionRef.current?.stop();
            setTimeout(() => {
              if (isRecording && recognitionRef.current) {
                recognitionRef.current.start();
              }
            }, 100);
          } catch (e) {
            console.error('Error restarting speech recognition:', e);
          }
        }
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
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isDisabled}
          className={isRecording ? "bg-red-500 hover:bg-red-600" : ""}
        >
          {isRecording ? (
            <>
              <MicOff className="mr-2 h-4 w-4" /> Stop ({formatTime(recordingTime)})
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" /> Record Answer
            </>
          )}
        </Button>
        
        {audioURL && (
          <audio src={audioURL} controls className="w-full" />
        )}
      </div>
      
      {useSpeechRecognition && (
        <div className="text-sm">
          {isRecording && liveTranscript && (
            <div className="p-2 bg-gray-50 rounded border">
              <p className="font-medium text-xs mb-1 text-gray-500">Live Transcription:</p>
              <p className="italic text-gray-700">{liveTranscript}</p>
            </div>
          )}
          
          {transcript && !isRecording && (
            <div className="p-2 bg-gray-100 rounded border">
              <p className="font-medium text-xs mb-1 text-gray-600">Transcription:</p>
              <p className="text-gray-800">{transcript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
