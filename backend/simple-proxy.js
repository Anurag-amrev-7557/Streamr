#!/usr/bin/env node

/**
 * Simple TMDB Proxy Server
 * Minimal proxy to avoid TLS issues
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = 5001;

// CORS
app.use(cors());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Simple TMDB Proxy' });
});

// TMDB proxy endpoint
app.get('/tmdb/*', async (req, res) => {
  try {
    const path = req.path.replace('/tmdb/', '');
    const query = new URLSearchParams(req.query).toString();
    const tmdbUrl = `https://api.themoviedb.org/3/${path}?${query}`;
    
    console.log('Proxying to:', tmdbUrl);
    
    // Use native https module
    const data = await new Promise((resolve, reject) => {
      https.get(tmdbUrl, (response) => {
        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          try {
            const jsonData = JSON.parse(body);
            resolve(jsonData);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', reject);
    });
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple TMDB Proxy running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`🎬 TMDB: http://localhost:${PORT}/tmdb/*`);
}); 