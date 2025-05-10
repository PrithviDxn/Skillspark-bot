import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Load env vars
dotenv.config();

// Admin credentials
const admin = {
  email: 'admin@skillspark.com',
  password: 'Admin@123'
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Test login process
const testLogin = async () => {
  try {
    console.log('Testing login with:', admin);
    
    // Find user
    const user = await User.findOne({ email: admin.email }).select('+password');
    
    if (!user) {
      console.log('User not found in database');
      return;
    }
    
    console.log('User found:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordLength: user.password ? user.password.length : 0
    });
    
    // Test password match manually
    console.log('Testing password match...');
    
    // Test with bcrypt directly
    const isMatchBcrypt = await bcrypt.compare(admin.password, user.password);
    console.log(`Password match with bcrypt.compare: ${isMatchBcrypt}`);
    
    // Test with User model method
    const isMatchModel = await user.matchPassword(admin.password);
    console.log(`Password match with user.matchPassword: ${isMatchModel}`);
    
    // Simulate login route logic
    if (isMatchModel) {
      console.log('Login would succeed');
    } else {
      console.log('Login would fail with 401 Unauthorized');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await testLogin();
  process.exit();
};

// Run the script
main();
