const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { authenticate } = require('../middleware/auth');

// Proxy endpoint to fetch files from deployed backend when not available locally
router.get('/proxy/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const localFilePath = path.join(__dirname, '../../uploads', filename);
    
    // Check if file exists locally first
    if (fs.existsSync(localFilePath)) {
      return res.sendFile(localFilePath);
    }
    
    // If not available locally, try to fetch from deployed backend
    const deployedUrl = `https://streamr-jjj9.onrender.com/uploads/${filename}`;
    
    console.log(`📁 File ${filename} not found locally, proxying from: ${deployedUrl}`);
    
    const response = await fetch(deployedUrl);
    
    if (!response.ok) {
      console.log(`❌ Failed to fetch ${filename} from deployed backend: ${response.status}`);
      return res.status(404).json({ 
        error: 'File not found',
        message: 'File not available locally or on deployed backend'
      });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the response
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Error proxying file:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to proxy file from deployed backend'
    });
  }
});

// Health check for upload routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Upload routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
