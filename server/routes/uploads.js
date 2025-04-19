import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/auth.js';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// @desc    Upload audio file
// @route   POST /api/v1/uploads
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    console.log('Upload request received');
    
    // Check if file was uploaded
    if (!req.files) {
      console.log('No files were uploaded');
      return res.status(400).json({
        success: false,
        error: 'No files were uploaded'
      });
    }
    
    if (!req.files.audio) {
      console.log('Audio file not found in request');
      console.log('Available files:', Object.keys(req.files));
      return res.status(400).json({
        success: false,
        error: 'Please upload a file with the field name "audio"'
      });
    }

    const file = req.files.audio;
    console.log('File received:', file.name, file.size, 'bytes', file.mimetype);
    
    // Check file type
    if (!file.mimetype.startsWith('audio/')) {
      console.log('Invalid file type:', file.mimetype);
      return res.status(400).json({
        success: false,
        error: `Only audio files are allowed. Received: ${file.mimetype}`
      });
    }
    
    // Create a unique filename
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.name)}`;
    
    // Set upload path
    const uploadDir = path.join(__dirname, '../uploads');
    console.log('Upload directory:', uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Uploads directory created');
    }
    
    const uploadPath = path.join(uploadDir, uniqueFilename);
    console.log('File will be saved to:', uploadPath);
    
    try {
      // Use the mv() method to move the file to the uploads directory
      await file.mv(uploadPath);
      console.log('File moved successfully');
    } catch (mvError) {
      console.error('Error moving file:', mvError);
      return res.status(500).json({
        success: false,
        error: `Error saving file: ${mvError.message}`
      });
    }
    
    // Create file URL
    const fileUrl = `/uploads/${uniqueFilename}`;
    
    console.log('Upload successful, returning URL:', fileUrl);
    res.status(200).json({
      success: true,
      data: {
        fileName: uniqueFilename,
        fileUrl: fileUrl
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({
      success: false,
      error: `Server error during upload: ${err.message}`
    });
  }
});

export default router; 