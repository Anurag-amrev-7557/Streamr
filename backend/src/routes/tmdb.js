const express = require('express');
const axios = require('axios');
const https = require('https');
const { request } = require('undici');
const router = express.Router();
const { rateLimiters } = require('../middleware/rateLimit');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org';

// Proxy server configuration for TLS fallback
const PROXY_BASE_URL = process.env.TMDB_PROXY_URL || 'http://localhost:5001';

// Helper function to make request through proxy server
async function makeProxyRequest(endpoint, queryParams = {}) {
  try {
    const queryString = new URLSearchParams(queryParams).toString();
    const proxyUrl = `${PROXY_BASE_URL}${endpoint}?${queryString}`;
    
    console.log('Making proxy request to:', proxyUrl);
    
    const response = await axios.get(proxyUrl, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Proxy request failed:', error.message);
    throw new Error(`Proxy request failed: ${error.message}`);
  }
}

// Helper function to make HTTPS requests using undici (modern HTTP client)
async function makeUndiciRequest(url) {
  try {
    const { statusCode, body, headers } = await request(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Streamr/1.0'
      }
    });
    
    const data = await body.json();
    return { status: statusCode, data, headers };
  } catch (error) {
    throw new Error(`Undici request failed: ${error.message}`);
  }
}

// Helper function to make HTTPS requests using native module (fallback)
function makeHttpsRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (error) {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Disable custom HTTPS agent to avoid TLS conflicts
// Use default Node.js HTTPS behavior
const httpsAgent = null;

// Health check endpoint for debugging
router.get('/health', (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tmdb_api_key: TMDB_API_KEY ? 'configured' : 'missing',
      tmdb_base_url: TMDB_BASE_URL,
      environment: process.env.NODE_ENV || 'development'
    };
    
    console.log('TMDB Health Check:', healthStatus);
    res.json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Image proxy endpoint for TMDB images to handle CORS
router.get('/image/*', async (req, res) => {
  try {
    // Get the image path after /image/
    const imagePath = req.path.replace('/image/', '');
    
    // Construct the full TMDB image URL
    const imageUrl = `${TMDB_IMAGE_BASE_URL}${imagePath}`;
    
    console.log('Proxying image request:', imageUrl);

    // Use default axios configuration to avoid TLS conflicts
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 30000,
      maxRedirects: 5,
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

// Trending movies endpoint
router.get('/trending', rateLimiters.tmdb, async (req, res) => {
  try {
    console.log('Trending endpoint called with query:', req.query);
    
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is not set');
      return res.status(500).json({ 
        error: 'TMDB API key is not configured',
        status: 500,
        details: 'Please check your environment configuration'
      });
    }

    const timeWindow = req.query.time_window || 'week';
    const mediaType = req.query.media_type || 'all';
    const page = req.query.page || 1;
    
    const tmdbUrl = `${TMDB_BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    
    console.log('Fetching trending content from:', tmdbUrl);

    // Use undici as primary method to avoid TLS conflicts
    try {
      const response = await makeUndiciRequest(tmdbUrl);
      
      console.log('TMDB API response status:', response.status);
      
      if (response.data && response.data.status_code) {
        console.error('TMDB API returned error:', response.data);
        return res.status(response.data.status_code).json({
          error: response.data.status_message || 'TMDB API error',
          status: response.data.status_code,
          details: response.data
        });
      }

      res.json(response.data);
    } catch (error) {
      console.error('Undici request failed:', error.message);
      // Fallback to axios if undici fails
      try {
        const axiosResponse = await axios.get(tmdbUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Streamr/1.0'
          },
          timeout: 30000
        });
        
        const data = axiosResponse.data;
        
        if (data && data.status_code) {
          console.error('TMDB API returned error:', data);
          return res.status(data.status_code).json({
            error: data.status_message || 'TMDB API error',
            status: data.status_code,
            details: data
          });
        }
        
        res.json(data);
      } catch (axiosError) {
        console.error('Axios fallback failed:', axiosError.message);
        // Final fallback to axios
        try {
          const axiosResponse = await axios.get(tmdbUrl, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Streamr/1.0'
            },
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: function (status) {
              return status >= 200 && status < 500;
            }
          });
          
          if (axiosResponse.data && axiosResponse.data.status_code) {
            console.error('TMDB API returned error:', axiosResponse.data);
            return res.status(axiosResponse.data.status_code).json({
              error: axiosResponse.data.status_message || 'TMDB API error',
              status: axiosResponse.data.status_code,
              details: axiosResponse.data
            });
          }
          
          res.json(axiosResponse.data);
        } catch (axiosError) {
          console.error('All HTTP clients failed:', axiosError.message);
          throw axiosError;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching trending content:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    // Try proxy fallback for TLS/connection issues
    if (error.code === 'ECONNRESET' || error.message.includes('TLS') || error.message.includes('ECONNRESET')) {
      console.log('Attempting proxy fallback for trending content...');
      try {
        const proxyData = await makeProxyRequest('/trending', {
          time_window: timeWindow,
          media_type: mediaType,
          page: page
        });
        console.log('Proxy fallback successful for trending');
        return res.json(proxyData);
      } catch (proxyError) {
        console.error('Proxy fallback failed:', proxyError.message);
      }
    }
    
    if (error.response) {
      // The request was made and the server responded with a status code
      return res.status(error.response.status).json({
        error: 'TMDB API error',
        status: error.response.status,
        details: error.response.data || error.message
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        error: 'No response from TMDB API',
        status: 503,
        details: error.message
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        error: 'Failed to fetch trending content',
        status: 500,
        details: error.message
      });
    }
  }
});

// Popular movies endpoint
router.get('/popular', rateLimiters.tmdb, async (req, res) => {
  try {
    console.log('Popular endpoint called with query:', req.query);
    
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is not set');
      return res.status(500).json({ 
        error: 'TMDB API key is not configured',
        status: 500,
        details: 'Please check your environment configuration'
      });
    }

    const mediaType = req.query.media_type || 'movie';
    const page = req.query.page || 1;
    
    const tmdbUrl = `${TMDB_BASE_URL}/${mediaType}/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    
    console.log('Fetching popular content from:', tmdbUrl);

    // Use undici client to avoid TLS conflicts
    try {
      const { statusCode, body } = await request(tmdbUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Streamr/1.0'
        }
      });
      
      const data = await body.json();
      
      if (data && data.status_code) {
        console.error('TMDB API returned error:', data);
        return res.status(data.status_code).json({
          error: data.status_message || 'TMDB API error',
          status: data.status_code,
          details: data
        });
      }
      
      res.json(data);
      return;
    } catch (undiciError) {
      console.error('Undici request failed:', undiciError.message);
      // Fallback to axios
      const response = await axios.get(tmdbUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Streamr/1.0'
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      
      if (response.data && response.data.status_code) {
        console.error('TMDB API returned error:', response.data);
        return res.status(response.data.status_code).json({
          error: response.data.status_message || 'TMDB API error',
          status: response.data.status_code,
          details: response.data
        });
      }
      
      res.json(response.data);
      return;
    }
  } catch (error) {
    console.error('=== ERROR IN POPULAR ENDPOINT ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Error cause:', error.cause);
    console.error('Error response:', error.response);
    console.error('Error request:', error.request);
    console.error('================================');
    
    // Try proxy fallback for TLS/connection issues
    if (error.code === 'ECONNRESET' || error.message.includes('TLS') || error.message.includes('ECONNRESET')) {
      console.log('Attempting proxy fallback for popular content...');
      try {
        const proxyData = await makeProxyRequest('/popular', {
          media_type: mediaType,
          page: page
        });
        console.log('Proxy fallback successful for popular');
        return res.json(proxyData);
      } catch (proxyError) {
        console.error('Proxy fallback failed:', proxyError.message);
      }
    } else {
      console.log('Error does not match proxy fallback conditions');
      console.log('Error code:', error.code);
      console.log('Error message contains TLS:', error.message.includes('TLS'));
      console.log('Error message contains ECONNRESET:', error.message.includes('ECONNRESET'));
    }
    
    if (error.response) {
      // The request was made and the server responded with a status code
      return res.status(error.response.status).json({
        error: 'TMDB API error',
        status: error.response.status,
        details: error.response.data || error.message
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        error: 'No response from TMDB API',
        status: 503,
        details: error.message
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        error: 'Failed to fetch popular content',
        status: 500,
        details: error.message
      });
    }
  }
});

// Top rated movies endpoint
router.get('/top-rated', rateLimiters.tmdb, async (req, res) => {
  try {
    console.log('Top-rated endpoint called with query:', req.query);
    
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is not set');
      return res.status(500).json({ 
        error: 'TMDB API key is not configured',
        status: 500,
        details: 'Please check your environment configuration'
      });
    }

    const mediaType = req.query.media_type || 'movie';
    const page = req.query.page || 1;
    
    const tmdbUrl = `${TMDB_BASE_URL}/${mediaType}/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    
    console.log('Fetching top rated content from:', tmdbUrl);

    // Use default axios configuration to avoid TLS conflicts
    const response = await axios.get(tmdbUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Streamr/1.0'
      },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });

    console.log('TMDB API response status:', response.status);
    
    if (response.data && response.data.status_code) {
      console.error('TMDB API returned error:', response.data);
      return res.status(response.data.status_code).json({
        error: response.data.status_message || 'TMDB API error',
        status: response.data.status_code,
        details: response.data
      });
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching top rated content:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    // Try proxy fallback for TLS/connection issues
    if (error.code === 'ECONNRESET' || error.message.includes('TLS') || error.message.includes('ECONNRESET')) {
      console.log('Attempting proxy fallback for top rated content...');
      try {
        const proxyData = await makeProxyRequest('/top-rated', {
          media_type: mediaType,
          page: page
        });
        console.log('Proxy fallback successful for top rated');
        return res.json(proxyData);
      } catch (proxyError) {
        console.error('Proxy fallback failed:', proxyError.message);
      }
    }
    
    if (error.response) {
      // The request was made and the server responded with a status code
      return res.status(error.response.status).json({
        error: 'TMDB API error',
        status: error.response.status,
        details: error.response.data || error.message
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        error: 'No response from TMDB API',
        status: 503,
        details: error.message
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        error: 'Failed to fetch top rated content',
        status: 500,
        details: error.message
      });
    }
  }
});

// Upcoming movies endpoint
router.get('/upcoming', rateLimiters.tmdb, async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is not set');
      return res.status(500).json({ 
        error: 'TMDB API key is not configured',
        status: 500
      });
    }

    const page = req.query.page || 1;
    
    const tmdbUrl = `${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    
    console.log('Fetching upcoming movies:', tmdbUrl);

    // Use default axios configuration to avoid TLS conflicts
    const response = await axios.get(tmdbUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      maxRedirects: 5
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching upcoming movies:', error.message);
    res.status(500).json({
      error: 'Failed to fetch upcoming movies',
      status: 500,
      details: error.message
    });
  }
});

// Now playing movies endpoint
router.get('/now-playing', rateLimiters.tmdb, async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      console.error('TMDB API key is not set');
      return res.status(500).json({ 
        error: 'TMDB API key is not configured',
        status: 500
      });
    }

    const page = req.query.page || 1;
    
    const tmdbUrl = `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    
    console.log('Fetching now playing movies:', tmdbUrl);

    // Use default axios configuration to avoid TLS conflicts
    const response = await axios.get(tmdbUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      maxRedirects: 5
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching now playing movies:', error.message);
    res.status(500).json({
      error: 'Failed to fetch now playing movies',
      status: 500,
      details: error.message
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

    // Use default axios configuration to avoid TLS conflicts
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
      proxy: false // Disable proxy
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