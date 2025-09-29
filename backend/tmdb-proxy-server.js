#!/usr/bin/env node

/**
 * TMDB Proxy Server
 * This server works around the Node.js v22.17.1 TLS issue by using
 * different HTTP client configurations and providing a local proxy
 */

// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { request } = require('undici');

const app = express();
const PORT = process.env.PROXY_PORT || 5001;

// Verify required environment variables
if (!process.env.TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY is not set in environment variables');
  console.error('Please check your .env file or set TMDB_API_KEY environment variable');
  process.exit(1);
}

console.log('✅ Environment loaded successfully');
console.log('📡 TMDB API Key:', process.env.TMDB_API_KEY ? 'Configured' : 'Missing');

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// CORS middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://streamr-see.web.app'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TMDB Proxy Server',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// TMDB API proxy
app.get('/api/*', async (req, res) => {
  try {
    const apiPath = req.path.replace('/api/', '');
    const queryString = new URLSearchParams(req.query).toString();
    
    // Construct TMDB URL
    const tmdbUrl = `https://api.themoviedb.org/3/${apiPath}?${queryString}`;
    
    console.log(`Proxying request to: ${tmdbUrl}`);
    
    // Make request using undici
    const { statusCode, body, headers } = await request(tmdbUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Streamr-Proxy/1.0'
      }
    });
    
    const data = await body.json();
    
    // Set CORS headers
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    
    res.status(statusCode).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      error: 'Proxy request failed',
      details: error.message
    });
  }
});

// Specific endpoints for common TMDB requests
app.get('/trending', async (req, res) => {
  try {
    const { time_window = 'week', media_type = 'all', page = 1 } = req.query;
    const tmdbUrl = `https://api.themoviedb.org/3/trending/${media_type}/${time_window}?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`;
    
    console.log('Fetching trending:', tmdbUrl);
    
    const { statusCode, body } = await request(tmdbUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Streamr-Proxy/1.0'
      }
    });
    
    const data = await body.json();
    res.status(statusCode).json(data);
    
  } catch (error) {
    console.error('Trending error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch trending',
      details: error.message
    });
  }
});

app.get('/popular', async (req, res) => {
  try {
    const { media_type = 'movie', page = 1 } = req.query;
    const tmdbUrl = `https://api.themoviedb.org/3/${media_type}/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`;
    
    console.log('Fetching popular:', tmdbUrl);
    
    const { statusCode, body } = await request(tmdbUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Streamr-Proxy/1.0'
      }
    });
    
    const data = await body.json();
    res.status(statusCode).json(data);
    
  } catch (error) {
    console.error('Popular error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch popular',
      details: error.message
    });
  }
});

app.get('/top-rated', async (req, res) => {
  try {
    const { media_type = 'movie', page = 1 } = req.query;
    const tmdbUrl = `https://api.themoviedb.org/3/${media_type}/top_rated?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`;
    
    console.log('Fetching top rated:', tmdbUrl);
    
    const { statusCode, body } = await request(tmdbUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Streamr-Proxy/1.0'
      }
    });
    
    const data = await body.json();
    res.status(statusCode).json(data);
    
  } catch (error) {
    console.error('Top rated error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch top rated',
      details: error.message
    });
  }
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log('🚀 TMDB Proxy Server running on port', PORT);
  console.log('📡 Health check: http://localhost:' + PORT + '/health');
  console.log('🎬 Trending: http://localhost:' + PORT + '/trending');
  console.log('🔥 Popular: http://localhost:' + PORT + '/popular');
  console.log('⭐ Top Rated: http://localhost:' + PORT + '/top-rated');
  console.log('🔗 Generic proxy: http://localhost:' + PORT + '/api/*');
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down TMDB Proxy Server...');
  server.close(() => {
    console.log('✅ TMDB Proxy Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down TMDB Proxy Server...');
  server.close(() => {
    console.log('✅ TMDB Proxy Server stopped');
    process.exit(0);
  });
});

module.exports = app; 