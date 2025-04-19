import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth endpoints
export const authAPI = {
  register: (userData: { name: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  login: (userData: { email: string; password: string }) =>
    api.post('/auth/login', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
    return api.get('/auth/logout');
  },
};

// Tech Stack endpoints
export const techStackAPI = {
  getAll: () => api.get('/techstacks'),
  getById: (id: string) => api.get(`/techstacks/${id}`),
  create: (techStackData: { name: string; description: string }) =>
    api.post('/techstacks', techStackData),
  update: (id: string, techStackData: { name?: string; description?: string }) =>
    api.put(`/techstacks/${id}`, techStackData),
  delete: (id: string) => api.delete(`/techstacks/${id}`),
};

// Question endpoints
export const questionAPI = {
  getAll: () => api.get('/questions'),
  getByTechStack: (techStackId: string) => api.get(`/questions?techStack=${techStackId}`),
  getById: (id: string) => api.get(`/questions/${id}`),
  create: (questionData: { techStack: string; text: string; difficulty: string }) =>
    api.post('/questions', questionData),
  update: (id: string, questionData: { text?: string; difficulty?: string }) =>
    api.put(`/questions/${id}`, questionData),
  delete: (id: string) => api.delete(`/questions/${id}`),
};

// Interview endpoints
export const interviewAPI = {
  getAll: () => api.get('/interviews'),
  getById: (id: string) => api.get(`/interviews/${id}`),
  create: (interviewData: {
    candidate: string;
    techStack: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
  }) => api.post('/interviews', interviewData),
  update: (id: string, interviewData: {
    status?: string;
    completedAt?: string;
  }) => api.put(`/interviews/${id}`, interviewData),
  delete: (id: string) => api.delete(`/interviews/${id}`),
};

// Answer endpoints
export const answerAPI = {
  getByInterview: (interviewId: string) => api.get(`/answers?interview=${interviewId}`),
  create: (answerData: {
    interview: string;
    question: string;
    audioUrl?: string;
    transcript?: string;
  }) => api.post('/answers', answerData),
  update: (id: string, answerData: {
    score?: number;
    feedback?: string;
  }) => api.put(`/answers/${id}`, answerData),
};

// Upload endpoints
export const uploadAPI = {
  uploadAudio: (audioFile: File) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    // Create a custom axios instance for file uploads with multipart/form-data content type
    return axios.post(`${BASE_URL}/uploads`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  }
};

// User endpoints
export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (userData: { name: string; email: string; password: string; role?: string }) =>
    api.post('/users', userData),
  update: (id: string, userData: { name?: string; email?: string; password?: string; role?: string }) =>
    api.put(`/users/${id}`, userData),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export default api; 
 