import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Check if running in development mode
const isDev = process.argv.includes('--dev');
const isProduction = process.env.NODE_ENV === 'production';

// Function to run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const process = spawn(command, args, {
      ...options,
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

// Function to install Python requirements
async function installRequirements() {
  try {
    console.log('Installing Python requirements...');
    
    // First upgrade pip
    const pipCmd = isProduction ? 'pip3' : 'pip';
    await runCommand(pipCmd, ['install', '--upgrade', 'pip'], { cwd: rootDir });
    
    // Install requirements
    await runCommand(pipCmd, ['install', '-r', 'requirements.txt'], { cwd: rootDir });
    
    // Verify installation
    console.log('Verifying faster-whisper installation...');
    await runCommand('python3', ['-c', 'import faster_whisper; print("faster-whisper installed successfully")'], { cwd: rootDir });
    
    console.log('Python requirements installed successfully');
  } catch (error) {
    console.error('Failed to install Python requirements:', error);
    throw error;
  }
}

// Function to create required directories
function createDirectories() {
  const dirs = ['uploads', 'tmp'];
  dirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Creating ${dir} directory...`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// Main setup function
async function setup() {
  try {
    // Create required directories
    createDirectories();

    if (!isProduction) {
      // Only create virtual environment in development
      const isWindows = process.platform === 'win32';
      const pythonCmd = isWindows ? 'python' : 'python3';
      const venvPath = path.join(rootDir, 'venv');

      // Check if venv already exists
      if (!fs.existsSync(venvPath)) {
        console.log('Creating Python virtual environment...');
        await runCommand(pythonCmd, ['-m', 'venv', 'venv'], { cwd: rootDir });
        console.log('Virtual environment created successfully');
      } else {
        console.log('Virtual environment already exists');
      }
    }

    // Install requirements
    await installRequirements();

    console.log('Setup completed successfully!');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setup(); 