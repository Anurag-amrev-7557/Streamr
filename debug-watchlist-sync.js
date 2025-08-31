// Debug script to test watchlist sync functionality
console.log('🔍 Debugging watchlist sync...');

// Test 1: Check if userAPI exists
function testUserAPI() {
  console.log('\n1. Testing userAPI availability...');
  
  if (typeof window !== 'undefined' && window.userAPI) {
    console.log('✅ userAPI is available');
    console.log('Available methods:', Object.keys(window.userAPI));
  } else {
    console.log('❌ userAPI is not available');
    console.log('This might be because the script is running outside the React app context');
  }
}

// Test 2: Check authentication token
function testAuthToken() {
  console.log('\n2. Testing authentication token...');
  
  const token = localStorage.getItem('accessToken');
  if (token) {
    console.log('✅ Access token found:', token.substring(0, 20) + '...');
  } else {
    console.log('❌ No access token found');
    console.log('User might not be logged in');
  }
}

// Test 3: Test API endpoint directly
async function testAPIEndpoint() {
  console.log('\n3. Testing API endpoint directly...');
  
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.log('❌ Cannot test API without access token');
    return;
  }
  
  try {
    // Test the watchlist sync endpoint
    const testData = {
      watchlist: [
        {
          id: 999999,
          title: 'Test Movie for Debug',
          type: 'movie',
          poster_path: '/test-poster.jpg',
          addedAt: new Date().toISOString()
        }
      ]
    };
    
    console.log('Sending test data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('/api/user/watchlist/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful:', data);
    } else {
      const errorData = await response.text();
      console.log('❌ API call failed:', errorData);
    }
  } catch (error) {
    console.error('❌ API call error:', error);
  }
}

// Test 4: Test userAPI.syncWatchlist function
async function testUserAPISync() {
  console.log('\n4. Testing userAPI.syncWatchlist function...');
  
  if (typeof window === 'undefined' || !window.userAPI) {
    console.log('❌ userAPI not available for testing');
    return;
  }
  
  try {
    const testData = [
      {
        id: 999998,
        title: 'Test Movie via userAPI',
        type: 'movie',
        poster_path: '/test-poster-2.jpg',
        addedAt: new Date().toISOString()
      }
    ];
    
    console.log('Calling userAPI.syncWatchlist with:', JSON.stringify(testData, null, 2));
    
    const result = await window.userAPI.syncWatchlist(testData);
    console.log('✅ userAPI.syncWatchlist result:', result);
  } catch (error) {
    console.error('❌ userAPI.syncWatchlist error:', error);
  }
}

// Test 5: Check current watchlist state
function checkCurrentState() {
  console.log('\n5. Checking current watchlist state...');
  
  // Check localStorage
  try {
    const watchlistLocal = localStorage.getItem('watchlist');
    if (watchlistLocal) {
      const parsed = JSON.parse(watchlistLocal);
      console.log('✅ Watchlist in localStorage:', parsed.length, 'items');
      console.log('Items:', parsed.map(item => ({ id: item.id, title: item.title })));
    } else {
      console.log('❌ No watchlist in localStorage');
    }
  } catch (error) {
    console.error('❌ Error reading localStorage:', error);
  }
  
  // Check if we're in a React context
  if (typeof window !== 'undefined' && window.React) {
    console.log('✅ React context detected');
  } else {
    console.log('⚠️ Not in React context (this is normal for test script)');
  }
}

// Test 6: Simulate the exact flow from WatchlistContext
async function simulateWatchlistContextFlow() {
  console.log('\n6. Simulating WatchlistContext flow...');
  
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.log('❌ Cannot simulate without access token');
    return;
  }
  
  try {
    // Simulate the exact data structure that would be sent
    const formattedMovie = {
      id: 999997,
      title: 'Simulated Movie',
      type: 'movie',
      poster_path: '/simulated-poster.jpg',
      backdrop_path: '/simulated-backdrop.jpg',
      overview: 'This is a simulated movie for testing',
      year: 2024,
      rating: 8.5,
      genres: ['Action', 'Adventure'],
      release_date: '2024-01-01',
      duration: '2h 15m',
      director: 'Test Director',
      cast: ['Test Actor 1', 'Test Actor 2'],
      addedAt: new Date().toISOString()
    };
    
    console.log('Simulated movie data:', JSON.stringify(formattedMovie, null, 2));
    
    // Simulate the API call
    const response = await fetch('/api/user/watchlist/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        watchlist: [formattedMovie] 
      })
    });
    
    console.log('Simulation response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Simulation successful:', data);
    } else {
      const errorData = await response.text();
      console.log('❌ Simulation failed:', errorData);
    }
  } catch (error) {
    console.error('❌ Simulation error:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting watchlist sync debugging...\n');
  
  testUserAPI();
  testAuthToken();
  await testAPIEndpoint();
  await testUserAPISync();
  checkCurrentState();
  await simulateWatchlistContextFlow();
  
  console.log('\n✅ All debugging tests completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Check the console output above for any errors');
  console.log('2. If API calls are failing, check backend logs');
  console.log('3. If authentication is failing, check login status');
  console.log('4. If data is not being sent correctly, check the data structure');
  console.log('5. Try adding a movie to watchlist in the actual app and check console logs');
}

// Run tests when script is loaded
if (typeof window !== 'undefined') {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
  } else {
    runAllTests();
  }
} else {
  console.log('This debug script is designed to run in a browser environment');
}
