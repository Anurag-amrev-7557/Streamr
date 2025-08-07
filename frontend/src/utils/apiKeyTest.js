// Test TMDB API key functionality
import { TMDB_API_KEY } from '../services/tmdbService.js';

export const testApiKey = async () => {
  console.log('🔑 Testing TMDB API Key...');
  
  if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined' || TMDB_API_KEY === '') {
    console.error('❌ TMDB API Key is missing or invalid!');
    console.error('Please set the VITE_TMDB_API_KEY environment variable in your .env file');
    return false;
  }
  
  console.log('✅ TMDB API Key is configured');
  console.log(`🔑 API Key: ${TMDB_API_KEY.substring(0, 8)}...${TMDB_API_KEY.substring(TMDB_API_KEY.length - 4)}`);
  
  try {
    const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${TMDB_API_KEY}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Key is valid and working!');
      console.log('📊 API Response:', data);
      return true;
    } else if (response.status === 401) {
      console.error('❌ API Key is invalid or expired!');
      console.error('Please check your TMDB API key at: https://www.themoviedb.org/settings/api');
      return false;
    } else {
      console.error(`❌ API request failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error when testing API key:', error);
    return false;
  }
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testApiKey = testApiKey;
  console.log('🔑 API key test available: testApiKey()');
} 