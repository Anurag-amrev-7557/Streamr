// Test script to verify TMDB API fix
const axios = require('axios');

async function testTMDBEndpoints() {
  const baseUrl = 'https://streamr-jjj9.onrender.com/api';
  
  console.log('🧪 Testing TMDB endpoints after fix...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log('✅ Health endpoint:', healthResponse.data.status);
    
    // Test TMDB health endpoint
    console.log('\n2. Testing TMDB health endpoint...');
    const tmdbHealthResponse = await axios.get(`${baseUrl}/tmdb/health`);
    console.log('✅ TMDB health endpoint:', tmdbHealthResponse.data.message);
    
    // Test trending endpoint
    console.log('\n3. Testing trending endpoint...');
    const trendingResponse = await axios.get(`${baseUrl}/tmdb/trending`);
    console.log('✅ Trending endpoint: Success!');
    console.log('   Results count:', trendingResponse.data.results?.length || 'N/A');
    
    // Test popular endpoint
    console.log('\n4. Testing popular endpoint...');
    const popularResponse = await axios.get(`${baseUrl}/tmdb/popular`);
    console.log('✅ Popular endpoint: Success!');
    console.log('   Results count:', popularResponse.data.results?.length || 'N/A');
    
    // Test top-rated endpoint
    console.log('\n5. Testing top-rated endpoint...');
    const topRatedResponse = await axios.get(`${baseUrl}/tmdb/top-rated`);
    console.log('✅ Top-rated endpoint: Success!');
    console.log('   Results count:', topRatedResponse.data.results?.length || 'N/A');
    
    console.log('\n🎉 All TMDB endpoints are working!');
    
  } catch (error) {
    console.error('\n❌ Error testing endpoints:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data?.error || error.message);
      console.error('   Details:', error.response.data?.details || 'No details');
    } else {
      console.error('   Error:', error.message);
    }
  }
}

// Run the test
testTMDBEndpoints(); 