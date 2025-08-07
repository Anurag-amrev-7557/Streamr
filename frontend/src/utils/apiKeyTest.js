// TMDB API Key Test Utility
import { TMDB_API_KEY } from '../services/tmdbService.js';

export const testTMDBAPIKey = async () => {
  console.log('🔑 Testing TMDB API Key Configuration...');
  
  // Check if API key is configured
  if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined' || TMDB_API_KEY === '') {
    console.error('❌ TMDB API Key is not configured!');
    console.error('Please set the VITE_TMDB_API_KEY environment variable in your .env file');
    return {
      configured: false,
      valid: false,
      error: 'API key not configured'
    };
  }
  
  console.log('✅ TMDB API Key is configured');
  console.log('🔑 API Key (first 8 chars):', TMDB_API_KEY.substring(0, 8) + '...');
  
  try {
    // Test the API key with a simple request
    const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${TMDB_API_KEY}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 401) {
      console.error('❌ TMDB API Key is invalid or expired!');
      return {
        configured: true,
        valid: false,
        error: 'API key is invalid or expired'
      };
    }
    
    if (!response.ok) {
      console.error('❌ TMDB API request failed with status:', response.status);
      return {
        configured: true,
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    const data = await response.json();
    console.log('✅ TMDB API Key is valid and working!');
    console.log('📊 API Response:', data);
    
    return {
      configured: true,
      valid: true,
      data: data
    };
    
  } catch (error) {
    console.error('❌ TMDB API test failed:', error.message);
    return {
      configured: true,
      valid: false,
      error: error.message
    };
  }
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testTMDBAPIKey = testTMDBAPIKey;
  console.log('🔑 API Key test utility available:');
  console.log('- testTMDBAPIKey()');
} 