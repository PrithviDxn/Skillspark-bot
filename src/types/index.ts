// User related interfaces
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
}

// Tech Stack related interfaces
export interface TechStack {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface TechStackData {
  name: string;
  description: string;
}

// Question related interfaces
export interface Question {
  _id: string;
  techStack: string | TechStack;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export interface QuestionData {
  techStack: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Interview related interfaces
export interface Interview {
  _id: string;
  candidate: string | User;
  techStack: string | TechStack;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  createdBy?: string | User;
}

export interface InterviewData {
  candidate: string;
  techStack: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
}

export interface InterviewUpdateData {
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  completedAt?: string;
}

// Answer related interfaces
export interface Answer {
  _id: string;
  interview: string | Interview;
  question: string | Question;
  audioUrl?: string;
  transcript?: string;
  score?: number;
  feedback?: string;
  createdAt: string;
}

export interface AnswerData {
  interview: string;
  question: string;
  audioUrl?: string;
  transcript?: string;
}

export interface AnswerUpdateData {
  score?: number;
  feedback?: string;
  criteria?: {
    technicalAccuracy: number;
    completeness: number;
    clarity: number;
    examples: number;
  };
}

// API response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
}

export interface ApiErrorResponse {
  success: false;
  error: string;
} 