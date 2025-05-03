import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a role name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  techStacks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TechStack'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Role = mongoose.model('Role', RoleSchema);

export default Role;
