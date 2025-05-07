import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Check, AlertCircle } from 'lucide-react';

// Define SpeechRecognition types
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

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Mock transcript detection has been removed

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
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const latestTranscriptRef = useRef<string>('');

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

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
    if (!useSpeechRecognition) return false;
    
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        
        // Configure speech recognition
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        // Handle results
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let currentInterimTranscript = '';
          let finalTranscriptUpdate = '';
          
          // Use a more type-safe way to iterate through results
          const resultLength = Object.keys(event.results).length;
          for (let i = event.resultIndex; i < resultLength; i++) {
            // Ensure the result exists
            if (event.results[i]) {
              const transcriptText = event.results[i][0]?.transcript || '';
              if (event.results[i].isFinal) {
                finalTranscriptUpdate += transcriptText + ' ';
                
                // Add to full transcript
                setTranscript(prevTranscript => 
                  prevTranscript ? `${prevTranscript.trim()} ${transcriptText.trim()}` : transcriptText.trim()
                );
                
                // Reset interim transcript
                setInterimTranscript('');
                
                // Dispatch custom event for final transcript update
                document.dispatchEvent(new CustomEvent('transcriptupdate', {
                  detail: { 
                    text: transcriptText.trim(),
                    isFinal: true
                  }
                }));
              } else {
                currentInterimTranscript += transcriptText;
              }
            }
          }
          
          // Only update interim transcript if it changed
          if (currentInterimTranscript) {
            setInterimTranscript(currentInterimTranscript);
            
            // Dispatch custom event for interim transcript update
            document.dispatchEvent(new CustomEvent('transcriptupdate', {
              detail: { 
                text: currentInterimTranscript,
                isFinal: false
              }
            }));
          }

          // Log transcript updates for debugging
          if (finalTranscriptUpdate) {
            console.log('Final transcript update:', finalTranscriptUpdate);
          }
          if (currentInterimTranscript) {
            console.log('Interim transcript:', currentInterimTranscript);
          }
        };
        
        // Handle errors
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsTranscribing(false);
        };
        
        setIsTranscribing(true);
        return true;
      }
    }
    
    console.warn('Speech recognition not supported in this browser');
    return false;
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioURL(null);
    setTranscript('');
    setInterimTranscript('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        console.log('url audio', url);
        
        // Use the latest transcript from the ref instead of the state
        // This ensures we get the most up-to-date transcript value
        const finalTranscript = latestTranscriptRef.current || "[TRANSCRIPT FROM WEB SPEECH API NOT AVAILABLE]";
        console.log('Recording complete. Latest transcript from ref:', finalTranscript);
        onRecordingComplete(audioBlob, finalTranscript);
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
        try {
          recognitionRef.current.stop();
          setIsTranscribing(false);
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
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
          {useSpeechRecognition && (
            <div className="mt-2 p-3 bg-gray-100 rounded-md w-full max-h-24 overflow-y-auto">
              {transcript && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600 font-semibold">Transcript:</p>
                  <p className="text-sm text-gray-800">{transcript}</p>
                </div>
              )}
              {interimTranscript && (
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Currently speaking:</p>
                  <p className="text-sm text-gray-500 italic">{interimTranscript}</p>
                </div>
              )}
              {isTranscribing && !transcript && !interimTranscript && (
                <p className="text-sm text-gray-500 italic">Waiting for speech...</p>
              )}
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
