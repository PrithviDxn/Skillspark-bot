import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  techStack: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TechStack',
    required: [true, 'Please specify a tech stack']
  },
  text: {
    type: String,
    required: [true, 'Please add question text'],
    trim: true
  },
  difficulty: {
    type: String,
    required: [true, 'Please specify difficulty level'],
    enum: ['easy', 'medium', 'hard']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Question = mongoose.model('Question', QuestionSchema);

export default Question; 