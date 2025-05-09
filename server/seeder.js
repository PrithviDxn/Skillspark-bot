import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load models
import User from './models/User.js';
import TechStack from './models/TechStack.js';
import Question from './models/Question.js';

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// Sample users
const users = [
  {
    name: 'Candidate User',
    email: 'candidate@example.com',
    password: 'password123',
    role: 'user'
  }
];

// Sample tech stacks
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

// Sample questions
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

// Import sample data
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await TechStack.deleteMany();
    await Question.deleteMany();

    // Create users with hashed passwords
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        return user;
      })
    );

    await User.insertMany(hashedUsers);
    console.log('Users imported');

    // Create tech stacks
    const createdTechStacks = await TechStack.insertMany(techStacks);
    console.log('Tech stacks imported');

    // Create questions for each tech stack
    for (const techStack of createdTechStacks) {
      await createQuestions(techStack._id, techStack.name);
    }

    console.log('Data imported successfully');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete all data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await TechStack.deleteMany();
    await Question.deleteMany();

    console.log('Data destroyed');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Check if -i or -d flag is provided
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please use -i to import or -d to delete data');
  process.exit();
} 