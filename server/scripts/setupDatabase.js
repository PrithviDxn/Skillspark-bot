import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';

// Import existing models
import User from '../models/User.js';
import TechStack from '../models/TechStack.js';
import Question from '../models/Question.js';
import Role from '../models/Role.js';

// Load env vars
dotenv.config();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });

// We're using the existing models imported at the top of the file

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@skillspark.com',
    password: 'Admin@123',
    role: 'admin'
  },
  {
    name: 'Candidate User',
    email: 'candidate@example.com',
    password: 'password123',
    role: 'user'
  }
];

const techStacks = [
  {
    name: 'JavaScript',
    description: 'A programming language for the web'
  },
  {
    name: 'React',
    description: 'A JavaScript library for building user interfaces'
  },
  {
    name: 'Node.js',
    description: 'JavaScript runtime built on Chrome\'s V8 JavaScript engine'
  },
  {
    name: 'Python',
    description: 'A programming language for general-purpose programming'
  }
];

const roles = [
  {
    name: 'Frontend Developer',
    description: 'Specializes in developing user interfaces and client-side functionality'
  },
  {
    name: 'Backend Developer',
    description: 'Focuses on server-side logic, databases, and application integration'
  },
  {
    name: 'Full Stack Developer',
    description: 'Works on both client and server-side development'
  }
];

// Create questions for a tech stack
const createQuestions = async (techStackId, techStackName) => {
  const questions = [
    {
      techStack: techStackId,
      text: `Explain how ${techStackName} works under the hood.`,
      difficulty: 'hard'
    },
    {
      techStack: techStackId,
      text: `What are the key features of ${techStackName}?`,
      difficulty: 'easy'
    },
    {
      techStack: techStackId,
      text: `Describe a complex problem you solved using ${techStackName}.`,
      difficulty: 'medium'
    }
  ];

  await Question.insertMany(questions);
  console.log(`Created sample questions for ${techStackName}`);
};

// Associate tech stacks with roles
const associateTechStacksWithRoles = async (techStacks, roles) => {
  try {
    // Frontend Developer: JavaScript, React
    const frontendRole = roles.find(role => role.name === 'Frontend Developer');
    const jsStack = techStacks.find(stack => stack.name === 'JavaScript');
    const reactStack = techStacks.find(stack => stack.name === 'React');
    
    if (frontendRole && jsStack && reactStack) {
      frontendRole.techStacks = [jsStack._id, reactStack._id];
      await frontendRole.save();
      console.log('Associated tech stacks with Frontend Developer role');
    }
    
    // Backend Developer: Node.js, Python
    const backendRole = roles.find(role => role.name === 'Backend Developer');
    const nodeStack = techStacks.find(stack => stack.name === 'Node.js');
    const pythonStack = techStacks.find(stack => stack.name === 'Python');
    
    if (backendRole && nodeStack && pythonStack) {
      backendRole.techStacks = [nodeStack._id, pythonStack._id];
      await backendRole.save();
      console.log('Associated tech stacks with Backend Developer role');
    }
    
    // Full Stack Developer: All tech stacks
    const fullstackRole = roles.find(role => role.name === 'Full Stack Developer');
    
    if (fullstackRole) {
      fullstackRole.techStacks = techStacks.map(stack => stack._id);
      await fullstackRole.save();
      console.log('Associated tech stacks with Full Stack Developer role');
    }
  } catch (error) {
    console.error('Error associating tech stacks with roles:', error);
  }
};

// Clear database and import fresh data
const resetDatabase = async () => {
  try {
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await TechStack.deleteMany({});
    await Question.deleteMany({});
    await Role.deleteMany({});
    console.log('All collections cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
};

// Create users with hashed passwords
const createUsers = async () => {
  try {
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        return user;
      })
    );

    const createdUsers = await User.insertMany(hashedUsers);
    console.log('Users created:');
    createdUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}), Role: ${user.role}`);
    });
    
    // Test admin login
    const adminUser = await User.findOne({ email: 'admin@skillspark.com' }).select('+password');
    if (adminUser) {
      const isMatch = await bcrypt.compare('Admin@123', adminUser.password);
      console.log(`Admin password verification: ${isMatch ? 'PASSED' : 'FAILED'}`);
    }
    
    return createdUsers;
  } catch (error) {
    console.error('Error creating users:', error);
    return [];
  }
};

// Create tech stacks
const createTechStacks = async () => {
  try {
    const createdTechStacks = await TechStack.insertMany(techStacks);
    console.log('Tech stacks created:');
    createdTechStacks.forEach(stack => {
      console.log(`- ${stack.name}: ${stack.description}`);
    });
    return createdTechStacks;
  } catch (error) {
    console.error('Error creating tech stacks:', error);
    return [];
  }
};

// Create roles
const createRoles = async () => {
  try {
    const createdRoles = await Role.insertMany(roles);
    console.log('Roles created:');
    createdRoles.forEach(role => {
      console.log(`- ${role.name}: ${role.description}`);
    });
    return createdRoles;
  } catch (error) {
    console.error('Error creating roles:', error);
    return [];
  }
};

// Main setup function
const setupDatabase = async () => {
  try {
    // Reset database
    await resetDatabase();
    
    // Create users
    const createdUsers = await createUsers();
    
    // Create tech stacks
    const createdTechStacks = await createTechStacks();
    
    // Create questions for each tech stack
    for (const techStack of createdTechStacks) {
      await createQuestions(techStack._id, techStack.name);
    }
    
    // Create roles
    const createdRoles = await createRoles();
    
    // Associate tech stacks with roles
    await associateTechStacksWithRoles(createdTechStacks, createdRoles);
    
    console.log('\nDatabase setup completed successfully!');
    console.log('\nDefault login credentials:');
    console.log('Admin: admin@skillspark.com / Admin@123');
    console.log('Candidate: candidate@example.com / password123');
    
    // Disconnect from database
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error setting up database:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Check if script is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Running database setup script...');
  setupDatabase();
}

// Export for use in other files
export { setupDatabase };
