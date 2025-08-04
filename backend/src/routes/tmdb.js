const express = require('express');
const axios = require('axios');
const https = require('https');
const router = express.Router();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org';

// Create a custom HTTPS agent with relaxed SSL settings
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Allow self-signed certificates
  secureProtocol: 'TLSv1_2_method', // Force TLS 1.2
  ciphers: 'HIGH:!aNULL:!MD5', // Use strong ciphers
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3'
});

// Image proxy endpoint for TMDB images to handle CORS
router.get('/image/*', async (req, res) => {
  try {
    // Get the image path after /image/
    const imagePath = req.path.replace('/image/', '');
    
    // Construct the full TMDB image URL
    const imageUrl = `${TMDB_IMAGE_BASE_URL}${imagePath}`;
    
    console.log('Proxying image request:', imageUrl);

    // Stream the image response
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 30000,
      maxRedirects: 5,
      httpsAgent: httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Streamr/1.0)',
        'Accept': 'image/*',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    // Set appropriate headers for image response
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Length': response.headers['content-length']
    });

    // Pipe the image stream to the response
    response.data.pipe(res);

  } catch (error) {
    console.error('Error proxying image:', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
    
    // Return a placeholder image or error response
    res.status(404).json({
      error: 'Image not found or failed to load',
      status: 404
    });
  }
});

// Proxy endpoint for TMDB API
router.get('/proxy/*', async (req, res) => {
  try {
    console.log('Received TMDB proxy request:', {
      path: req.path,
      query: req.query,
      headers: req.headers
    });

    if (!TMDB_API_KEY) {
      console.error('TMDB API key is not set');
      return res.status(500).json({ 
        error: 'TMDB API key is not configured',
        status: 500
      });
    }

    // Get the path after /proxy/
    const tmdbPath = req.path.replace('/proxy/', '');
    
    // Construct the full TMDB API URL
    const tmdbUrl = `${TMDB_BASE_URL}/${tmdbPath}`;
    
    // Get query parameters and remove api_key if it exists
    const queryParams = new URLSearchParams(req.query);
    queryParams.delete('api_key'); // Remove api_key from query params
    
    // Add API key to query parameters
    queryParams.append('api_key', TMDB_API_KEY);
    
    const fullUrl = `${tmdbUrl}?${queryParams.toString()}`;
    console.log('Making request to TMDB API:', fullUrl);

    // Make request to TMDB API with custom HTTPS agent
    const response = await axios.get(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Accept all responses except 5xx errors
      },
      timeout: 30000, // 30 second timeout
      maxRedirects: 5,
      maxContentLength: 50 * 1024 * 1024, // 50MB max response size
      proxy: false, // Disable proxy
      httpsAgent: httpsAgent
    });

    console.log('Received response from TMDB API:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    // Check if the response is valid
    if (!response.data) {
      console.error('Empty response from TMDB API');
      return res.status(500).json({
        error: 'Empty response from TMDB API',
        status: 500
      });
    }

    // Check if the response is an error
    if (response.data.status_code) {
      console.error('TMDB API error:', response.data);
      return res.status(response.data.status_code).json({
        error: response.data.status_message || 'TMDB API error',
        status: response.data.status_code
      });
    }

    // Return the TMDB API response
    res.json(response.data);
  } catch (error) {
    console.error('Error in TMDB proxy:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('TMDB API error response:', error.response.data);
      return res.status(error.response.status).json({
        error: error.response.data.status_message || 'TMDB API error',
        status: error.response.status
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response from TMDB API');
      return res.status(503).json({
        error: 'No response from TMDB API',
        status: 503,
        details: error.message
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
      return res.status(500).json({
        error: 'Error setting up request to TMDB API',
        status: 500,
        details: error.message
      });
    }
  }
});

module.exports = router; 