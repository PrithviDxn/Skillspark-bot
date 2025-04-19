# SkillSpark Interview AI

An AI-powered interview platform that helps candidates practice technical interviews.

## Features

- Scheduled interviews for technical skills assessment
- Multiple tech stacks support
- Audio recording and transcription
- AI evaluation and feedback

## Tech Stack

- Frontend: React, Vite, Shadcn UI, TypeScript
- Backend: Node.js, Express, MongoDB
- Authentication: JWT

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
```
git clone https://github.com/your-username/skill-spark-interview-ai.git
cd skill-spark-interview-ai
```

2. Install dependencies
```
npm install
```

3. Set up environment variables
```
# Create a .env file in the root directory with the following variables
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
```

4. Seed the database with sample data
```
npm run seed
```

5. Run the application
```
# Run frontend and backend concurrently
npm run dev:all

# Or run them separately
npm run dev       # Frontend
npm run server:dev # Backend
```

6. Access the application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## API Endpoints

### Auth
- POST /api/v1/auth/register - Register user
- POST /api/v1/auth/login - Login user
- GET /api/v1/auth/me - Get current user
- GET /api/v1/auth/logout - Logout user

### Users
- GET /api/v1/users - Get all users (Admin only)
- GET /api/v1/users/:id - Get single user (Admin only)
- POST /api/v1/users - Create user (Admin only)
- PUT /api/v1/users/:id - Update user (Admin or own profile)
- DELETE /api/v1/users/:id - Delete user (Admin only)

### Tech Stacks
- GET /api/v1/techstacks - Get all tech stacks
- GET /api/v1/techstacks/:id - Get single tech stack
- POST /api/v1/techstacks - Create tech stack (Admin only)
- PUT /api/v1/techstacks/:id - Update tech stack (Admin only)
- DELETE /api/v1/techstacks/:id - Delete tech stack (Admin only)

### Questions
- GET /api/v1/questions - Get all questions (with optional tech stack filter)
- GET /api/v1/questions/:id - Get single question
- POST /api/v1/questions - Create question (Admin only)
- PUT /api/v1/questions/:id - Update question (Admin only)
- DELETE /api/v1/questions/:id - Delete question (Admin only)

### Interviews
- GET /api/v1/interviews - Get all interviews (Admin gets all, users get their own)
- GET /api/v1/interviews/:id - Get single interview
- POST /api/v1/interviews - Create interview (Admin only)
- PUT /api/v1/interviews/:id - Update interview status
- DELETE /api/v1/interviews/:id - Delete interview (Admin only)

### Answers
- GET /api/v1/answers - Get answers (with optional interview filter)
- GET /api/v1/answers/:id - Get single answer
- POST /api/v1/answers - Create answer
- PUT /api/v1/answers/:id - Update answer (candidates: audio/transcript, admins: score/feedback)
- DELETE /api/v1/answers/:id - Delete answer (Admin only)

### File Uploads
- POST /api/v1/uploads - Upload audio file (requires authentication)
- GET /uploads/:filename - Access uploaded files

## License

This project is licensed under the MIT License.
