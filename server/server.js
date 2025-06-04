import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';


import videoRoutes from './routes/video.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import techStackRoutes from './routes/techStacks.js';
import questionRoutes from './routes/questions.js';
import interviewRoutes from './routes/interviews.js';
import answerRoutes from './routes/answers.js';
import uploadRoutes from './routes/uploads.js';
import aiRoutes from './routes/ai.js';
import roleRoutes from './routes/roles.js';
import emailRoutes from './routes/email.js';


const app = express();

// Updated CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow local development (localhost)
    if (origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    
    // List of allowed domains (Netlify, Render, Vercel)
    const allowedDomains = [
      /\.netlify\.app$/,  // All Netlify previews
      /\.vercel\.app$/,   // All Vercel previews
      'https://skillsparkai.netlify.app',  // Your live Netlify frontend
      'https://skill-spark-interview-ai.onrender.com',  // Your Render backend (if frontend makes requests to itself)
    ];
    
    // Check if the origin matches any allowed domain
    if (allowedDomains.some(domain => {
      if (typeof domain === 'string') return origin === domain;
      return domain.test(origin); // For regex patterns
    })) {
      return callback(null, true);
    }
    
    // Block if not allowed
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,  // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'],  // Allowed headers
}));


// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Import database setup script (will only run if explicitly called)
import { setupDatabase } from './scripts/setupDatabase.js';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created:', uploadsDir);
} else {
  console.log('Uploads directory exists:', uploadsDir);
  
  // Check if it's writable
  try {
    fs.accessSync(uploadsDir, fs.constants.W_OK);
    console.log('Uploads directory is writable');
  } catch (err) {
    console.error('Uploads directory is not writable:', err);
  }
}

// Create temp directory for file uploads if it doesn't exist
const tempDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('Temp directory created:', tempDir);
} else {
  console.log('Temp directory exists:', tempDir);
  
  // Check if it's writable
  try {
    fs.accessSync(tempDir, fs.constants.W_OK);
    console.log('Temp directory is writable');
  } catch (err) {
    console.error('Temp directory is not writable:', err);
  }
}


// Parse JSON bodies
app.use(express.json());
// Parse URL-encoded bodies (for Twilio webhooks)
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp'),
  createParentPath: true,
  debug: false,
  abortOnLimit: true,
  parseNested: true, // Enable parsing of nested objects
  safeFileNames: true, // Replace special characters in filenames
  preserveExtension: true, // Keep file extensions
  uploadTimeout: 60000, // 60 seconds timeout
  uriDecodeFileNames: true // Decode URI encoded filenames
}));

// Set static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/techstacks', techStackRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/answers', answerRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/video', videoRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('SkillSpark API is running...');
});

// Catch-all route for 404s
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
}); 