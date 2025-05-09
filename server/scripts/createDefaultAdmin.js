import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Default admin credentials
const DEFAULT_ADMIN = {
  name: 'Default Admin',
  email: 'admin@skillspark.com',
  password: 'Admin@123',
  role: 'admin'
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Check if admin account exists
 */
const adminExists = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    return adminCount > 0;
  } catch (error) {
    console.error(`Error checking for admin accounts: ${error.message}`);
    return false;
  }
};

/**
 * Create default admin account
 */
const createDefaultAdmin = async () => {
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);

    // Create the admin user
    const admin = await User.create({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      role: DEFAULT_ADMIN.role
    });

    console.log(`Default admin account created with email: ${DEFAULT_ADMIN.email}`);
    return admin;
  } catch (error) {
    console.error(`Error creating default admin: ${error.message}`);
    return null;
  }
};

/**
 * Main function to check and create admin if needed
 */
const initializeAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if admin exists
    const hasAdmin = await adminExists();

    if (hasAdmin) {
      console.log('Admin account already exists. No action needed.');
    } else {
      console.log('No admin account found. Creating default admin...');
      const admin = await createDefaultAdmin();
      if (admin) {
        console.log('Default admin account created successfully.');
        console.log('Email: ' + DEFAULT_ADMIN.email);
        console.log('Password: ' + DEFAULT_ADMIN.password);
      } else {
        console.log('Failed to create default admin account.');
      }
    }

    // Disconnect from database
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error(`Error in initializeAdmin: ${error.message}`);
  }
};

// Run the initialization
initializeAdmin();
