// Debug utility for TMDB API key issues
import { TMDB_API_KEY } from '../services/tmdbService.js';

export const debugApiKey = async () => {
  console.log('🔍 Debugging TMDB API Key Issues...');
  console.log('=====================================');
  
  // 1. Check if API key is loaded
  console.log('1. API Key Configuration:');
  console.log(`   - API Key exists: ${!!TMDB_API_KEY}`);
  console.log(`   - API Key length: ${TMDB_API_KEY ? TMDB_API_KEY.length : 0}`);
  console.log(`   - API Key value: ${TMDB_API_KEY ? `${TMDB_API_KEY.substring(0, 8)}...${TMDB_API_KEY.substring(TMDB_API_KEY.length - 4)}` : 'undefined'}`);
  
  if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined' || TMDB_API_KEY === '') {
    console.error('❌ API Key is not properly configured!');
    return;
  }
  
  // 2. Test basic network connectivity
  console.log('\n2. Network Connectivity:');
  try {
    const response = await fetch('https://httpbin.org/status/200', {
      method: 'HEAD',
      cache: 'no-cache'
    });
    console.log(`   - Basic connectivity: ✅ (${response.status})`);
  } catch (error) {
    console.error(`   - Basic connectivity: ❌ ${error.message}`);
  }
  
  // 3. Test TMDB API without key
  console.log('\n3. TMDB API (without key):');
  try {
    const response = await fetch('https://api.themoviedb.org/3/configuration', {
      method: 'HEAD',
      cache: 'no-cache'
    });
    console.log(`   - Status: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error(`   - Error: ${error.message}`);
  }
  
  // 4. Test TMDB API with key
  console.log('\n4. TMDB API (with key):');
  try {
    const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${TMDB_API_KEY}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-cache'
    });
    
    console.log(`   - Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   - Response: ✅ Valid');
      console.log(`   - Images base URL: ${data.images?.base_url || 'Not found'}`);
    } else if (response.status === 401) {
      console.error('   - Error: ❌ Unauthorized - API key is invalid or expired');
      console.error('   - Solution: Check your API key at https://www.themoviedb.org/settings/api');
    } else {
      console.error(`   - Error: ❌ HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`   - Network Error: ${error.message}`);
  }
  
  // 5. Check environment variables
  console.log('\n5. Environment Variables:');
  console.log(`   - VITE_TMDB_API_KEY: ${import.meta.env.VITE_TMDB_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`   - NODE_ENV: ${import.meta.env.NODE_ENV || 'Not set'}`);
  console.log(`   - DEV: ${import.meta.env.DEV}`);
  
  console.log('\n=====================================');
  console.log('🔍 Debug complete!');
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.debugApiKey = debugApiKey;
  console.log('🔍 API key debug utility available: debugApiKey()');
} 