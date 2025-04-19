import mongoose from 'mongoose';

const TechStackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a tech stack name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const TechStack = mongoose.model('TechStack', TechStackSchema);

export default TechStack; 