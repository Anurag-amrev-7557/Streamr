// Test script to check backend connectivity
// Run this in the browser console to verify backend access

console.log('🔍 Testing Backend Connectivity...\n');

// Test 1: Check current API configuration
console.log('🌐 API Configuration Check:');
console.log('Current API URL:', window.location.origin);

// Test 2: Check if we can access the watchlist context
if (typeof window !== 'undefined' && window.watchlistContext) {
  console.log('✅ Watchlist context is available');
  const context = window.watchlistContext;
  
  // Test 3: Check authentication
  console.log('\n🔐 Authentication Check:');
  const token = localStorage.getItem('accessToken');
  if (token) {
    console.log('✅ Access token found');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
  } else {
    console.log('❌ No access token found');
    console.log('This is why backend sync is failing!');
  }
  
  // Test 4: Test backend connectivity directly
  console.log('\n🌐 Direct Backend Connectivity Test:');
  
  // Test local backend
  console.log('Testing local backend (localhost:3001)...');
  fetch('http://localhost:3001/api/health')
    .then(response => {
      if (response.ok) {
        console.log('✅ Local backend is accessible');
        return response.json();
      } else {
        console.log('❌ Local backend responded with error:', response.status);
      }
    })
    .then(data => {
      if (data) console.log('Local backend response:', data);
    })
    .catch(error => {
      console.log('❌ Local backend not accessible:', error.message);
    });
  
  // Test deployed backend
  console.log('\nTesting deployed backend (streamr-jjj9.onrender.com)...');
  fetch('https://streamr-jjj9.onrender.com/api/health')
    .then(response => {
      if (response.ok) {
        console.log('✅ Deployed backend is accessible');
        return response.json();
      } else {
        console.log('❌ Deployed backend responded with error:', response.status);
      }
    })
    .then(data => {
      if (data) console.log('Deployed backend response:', data);
    })
    .catch(error => {
      console.log('❌ Deployed backend not accessible:', error.message);
    });
  
  // Test 5: Test watchlist endpoints
  console.log('\n🎬 Testing Watchlist Endpoints:');
  
  if (token) {
    // Test getWatchlist endpoint
    console.log('Testing GET /api/user/watchlist...');
    fetch('https://streamr-jjj9.onrender.com/api/user/watchlist', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ GET /api/user/watchlist endpoint accessible');
        return response.json();
      } else {
        console.log('❌ GET /api/user/watchlist failed:', response.status, response.statusText);
      }
    })
    .then(data => {
      if (data) console.log('Response:', data);
    })
    .catch(error => {
      console.log('❌ GET /api/user/watchlist error:', error.message);
    });
    
    // Test syncWatchlist endpoint
    console.log('\nTesting POST /api/user/watchlist/sync...');
    fetch('https://streamr-jjj9.onrender.com/api/user/watchlist/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ watchlist: [] })
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ POST /api/user/watchlist/sync endpoint accessible');
        return response.json();
      } else {
        console.log('❌ POST /api/user/watchlist/sync failed:', response.status, response.statusText);
      }
    })
    .then(data => {
      if (data) console.log('Response:', data);
    })
    .catch(error => {
      console.log('❌ POST /api/user/watchlist/sync error:', error.message);
    });
  }
  
  // Test 6: Check current watchlist state
  console.log('\n📊 Current Watchlist State:');
  context.logWatchlistState();
  
} else {
  console.log('❌ Watchlist context not available');
}

// Test 7: Manual testing commands
console.log('\n🛠️ Manual Testing Commands:');
console.log('1. Test local backend: fetch("http://localhost:3001/api/health")');
console.log('2. Test deployed backend: fetch("https://streamr-jjj9.onrender.com/api/health")');
console.log('3. Check authentication: localStorage.getItem("accessToken")');
console.log('4. Test watchlist context: window.watchlistContext.logWatchlistState()');

console.log('\n📋 Expected Results:');
console.log('- At least one backend should be accessible');
console.log('- Authentication token should exist');
console.log('- Watchlist endpoints should be accessible with token');

console.log('\n🚨 If All Tests Fail:');
console.log('1. Backend server is not running');
console.log('2. Authentication token is missing or expired');
console.log('3. CORS issues preventing access');
console.log('4. Network connectivity problems');

console.log('\n🚀 Ready to Test!');
console.log('Check the console for connectivity test results.');
