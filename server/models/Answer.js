import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  interview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: [true, 'Please specify an interview']
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: [true, 'Please specify a question']
  },
  audioUrl: {
    type: String
  },
  transcript: {
    type: String
  },
  score: {
    type: Number,
    min: 0,
    max: 10
  },
  feedback: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Answer = mongoose.model('Answer', AnswerSchema);

export default Answer; 