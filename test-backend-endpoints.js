// Backend API Endpoints Test Script
// Run this in your browser console to test backend connectivity

console.log('🔍 TESTING BACKEND API ENDPOINTS...\n');

// Test 1: Check if we can reach the backend
console.log('🌐 TEST 1: BACKEND CONNECTIVITY');
console.log('Testing connection to localhost:3001...');

fetch('http://localhost:3001/api/health')
  .then(response => {
    if (response.ok) {
      console.log('✅ Backend is accessible');
      return response.json();
    } else {
      console.log('❌ Backend responded with error:', response.status);
    }
  })
  .then(data => {
    if (data) {
      console.log('Backend response:', data);
    }
  })
  .catch(error => {
    console.log('❌ Backend not accessible:', error.message);
    console.log('Make sure the backend is running on port 3001');
  });

// Test 2: Check authentication requirement
console.log('\n🔐 TEST 2: AUTHENTICATION REQUIREMENT');
console.log('Testing watchlist endpoint without authentication...');

fetch('http://localhost:3001/api/user/watchlist')
  .then(response => {
    if (response.status === 401) {
      console.log('✅ Authentication required (correct behavior)');
      return response.json();
    } else {
      console.log('❌ Unexpected response:', response.status);
    }
  })
  .then(data => {
    if (data) {
      console.log('Response:', data);
    }
  })
  .catch(error => {
    console.log('❌ Request failed:', error.message);
  });

// Test 3: Check CORS headers
console.log('\n🌍 TEST 3: CORS HEADERS');
console.log('Testing CORS configuration...');

fetch('http://localhost:3001/api/health', {
  method: 'OPTIONS'
})
  .then(response => {
    console.log('✅ OPTIONS request successful');
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    });
  })
  .catch(error => {
    console.log('❌ OPTIONS request failed:', error.message);
  });

// Test 4: Check if we have authentication token
console.log('\n🎫 TEST 4: AUTHENTICATION TOKEN CHECK');
const token = localStorage.getItem('accessToken');
if (token) {
  console.log('✅ Access token found');
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 20) + '...');
  
  // Test 5: Test authenticated endpoint
  console.log('\n🔓 TEST 5: AUTHENTICATED ENDPOINT TEST');
  console.log('Testing watchlist endpoint with authentication...');
  
  fetch('http://localhost:3001/api/user/watchlist', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      if (response.ok) {
        console.log('✅ Authenticated request successful');
        return response.json();
      } else {
        console.log('❌ Authenticated request failed:', response.status, response.statusText);
      }
    })
    .then(data => {
      if (data) {
        console.log('Response:', data);
      }
    })
    .catch(error => {
      console.log('❌ Authenticated request error:', error.message);
    });
  
} else {
  console.log('❌ No access token found');
  console.log('You need to be logged in to test authenticated endpoints');
}

// Test 6: Test sync endpoint (if authenticated)
if (token) {
  console.log('\n🔄 TEST 6: SYNC ENDPOINT TEST');
  console.log('Testing watchlist sync endpoint...');
  
  const testWatchlist = [
    {
      id: 999999,
      title: 'Test Movie for Backend Test',
      poster_path: '/test-poster.jpg',
      type: 'movie',
      year: '2024',
      rating: 8.5,
      genres: ['Action', 'Adventure'],
      release_date: '2024-01-01',
      duration: '2h 15m',
      director: 'Test Director',
      cast: ['Test Actor 1', 'Test Actor 2'],
      addedAt: new Date().toISOString()
    }
  ];
  
  fetch('http://localhost:3001/api/user/watchlist/sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ watchlist: testWatchlist })
  })
    .then(response => {
      if (response.ok) {
        console.log('✅ Sync endpoint test successful');
        return response.json();
      } else {
        console.log('❌ Sync endpoint test failed:', response.status, response.statusText);
      }
    })
    .then(data => {
      if (data) {
        console.log('Sync response:', data);
      }
    })
    .catch(error => {
      console.log('❌ Sync endpoint test error:', error.message);
    });
}

console.log('\n📋 BACKEND TEST SUMMARY:');
console.log('- Backend should be accessible on localhost:3001');
console.log('- Health endpoint should return status: ok');
console.log('- Watchlist endpoints should require authentication');
console.log('- CORS should be properly configured');
console.log('- Authenticated requests should work');
console.log('- Sync endpoint should accept POST requests');

console.log('\n🚨 IF BACKEND TESTS FAIL:');
console.log('1. Check if backend is running: npm run dev in backend folder');
console.log('2. Check if port 3001 is available');
console.log('3. Check backend console for error messages');
console.log('4. Verify MongoDB connection');
console.log('5. Check environment variables');

console.log('\n🚀 READY TO TEST BACKEND!');
console.log('Run this script to verify backend connectivity.');
console.log('Then run the watchlist test script to test the complete functionality.'); 