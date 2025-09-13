// Test script to check for network hanging issues
console.log('🔍 Testing for network hanging issues...');

// Test basic fetch with timeout
async function testFetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const start = performance.now();
    const response = await fetch(url, { signal: controller.signal });
    const duration = performance.now() - start;
    clearTimeout(timeoutId);
    
    console.log(`✅ ${url} - ${response.status} (${duration.toFixed(0)}ms)`);
    return { success: true, duration, status: response.status };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log(`⏰ ${url} - TIMEOUT after ${timeout}ms`);
    } else {
      console.log(`❌ ${url} - ERROR: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

// Test TMDB API endpoints
async function testTMDBEndpoints() {
  console.log('\n🎬 Testing TMDB API endpoints...');
  
  const endpoints = [
    'https://api.themoviedb.org/3/trending/movie/week?api_key=test',
    'https://api.themoviedb.org/3/movie/popular?api_key=test',
    'https://api.themoviedb.org/3/movie/top_rated?api_key=test'
  ];
  
  for (const endpoint of endpoints) {
    await testFetchWithTimeout(endpoint, 3000);
  }
}

// Test backend proxy endpoints
async function testBackendEndpoints() {
  console.log('\n🔧 Testing backend proxy endpoints...');
  
  const baseUrl = 'https://streamr-jjj9.onrender.com/api';
  const endpoints = [
    `${baseUrl}/tmdb/proxy/movie/popular?page=1`,
    `${baseUrl}/tmdb/proxy/movie/top_rated?page=1`,
    `${baseUrl}/tmdb/proxy/discover/movie?with_genres=28&page=1`
  ];
  
  for (const endpoint of endpoints) {
    await testFetchWithTimeout(endpoint, 10000);
  }
}

// Test local development endpoints
async function testLocalEndpoints() {
  console.log('\n🏠 Testing local development endpoints...');
  
  const baseUrl = 'http://localhost:3001/api';
  const endpoints = [
    `${baseUrl}/tmdb/proxy/movie/popular?page=1`,
    `${baseUrl}/tmdb/proxy/movie/top_rated?page=1`,
    `${baseUrl}/tmdb/proxy/discover/movie?with_genres=28&page=1`
  ];
  
  for (const endpoint of endpoints) {
    await testFetchWithTimeout(endpoint, 5000);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting network hang tests...\n');
  
  try {
    await testTMDBEndpoints();
    await testBackendEndpoints();
    await testLocalEndpoints();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

// Auto-run if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.testNetworkHang = runAllTests;
  console.log('💡 Run testNetworkHang() in console to test network endpoints');
} else {
  // Node.js environment
  runAllTests();
} 