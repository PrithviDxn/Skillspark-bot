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
    score?: number;
    feedback?: string;
    criteria?: {
      technicalAccuracy: number;
      completeness: number;
      clarity: number;
      examples: number;
    };
  }) => {
    console.log('answerAPI.create called with data:', JSON.stringify(answerData, null, 2));
    return api.post('/answers', answerData);
  },
  update: (id: string, answerData: {
    score?: number;
    feedback?: string;
    criteria?: {
      technicalAccuracy: number;
      completeness: number;
      clarity: number;
      examples: number;
    };
  }) => {
    console.log('answerAPI.update called with id:', id);
    console.log('answerAPI.update data:', JSON.stringify(answerData, null, 2));
    
    // Ensure criteria is properly structured if it exists
    if (answerData.criteria) {
      console.log('Criteria object present:', JSON.stringify(answerData.criteria, null, 2));
      
      // Ensure criteria object has all required fields
      const criteriaObj = {
        technicalAccuracy: answerData.criteria.technicalAccuracy || 0,
        completeness: answerData.criteria.completeness || 0,
        clarity: answerData.criteria.clarity || 0,
        examples: answerData.criteria.examples || 0
      };
      
      // Replace the original criteria with our sanitized version
      answerData.criteria = criteriaObj;
      console.log('Sanitized criteria:', JSON.stringify(criteriaObj, null, 2));
    }
    
    return api.put(`/answers/${id}`, answerData);
  },
  batch: (answers: Array<{
    interview: string;
    question: string;
    audioUrl?: string;
    transcript?: string;
    score?: number;
    feedback?: string;
    criteria?: {
      technicalAccuracy: number;
      completeness: number;
      clarity: number;
      examples: number;
    };
  }>) => {
    console.log('answerAPI.batch called with answers:', JSON.stringify(answers, null, 2));
    return api.post('/answers/batch', answers);
  },
};

// Upload endpoints
export const uploadAPI = {
  uploadAudio: (audioFile: File | Blob) => {
    console.log('uploadAPI.uploadAudio called with file:', audioFile);
    
    const formData = new FormData();
    
    // Handle both File and Blob objects
    if (audioFile instanceof File) {
      formData.append('audio', audioFile);
    } else {
      // If it's a Blob, create a File with a proper name and MIME type
      const fileExtension = audioFile.type?.includes('webm') ? '.webm' : '.wav';
      const mimeType = audioFile.type || 'audio/wav';
      formData.append('audio', new File([audioFile], `recording${fileExtension}`, { type: mimeType }));
    }
    
    // Log the FormData entries for debugging
    for (const pair of formData.entries()) {
      console.log('FormData entry:', pair[0], pair[1]);
    }
    
    // Important: Don't set the Content-Type header manually when sending FormData
    // Let the browser set the correct boundary value automatically
    return axios.post(`${BASE_URL}/uploads`, formData, {
      headers: {
        // Removing explicit Content-Type - browser will set it correctly with boundary
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

// AI endpoints
export const aiAPI = {
  transcribe: (audioBlob: Blob) => {
    // Create FormData object to send audio file
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    // Send request with FormData
    return api.post('/ai/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  evaluate: (data: { question: string, transcript: string, techStack?: string }) => 
    api.post('/ai/evaluate', data)
};

export default api; 
 