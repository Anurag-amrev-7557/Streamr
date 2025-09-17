// Test script to debug frontend authentication
// Run this in the browser console

console.log('🧪 Testing Frontend Authentication Flow...\n');

// Test 1: Check current authentication state
console.log('📊 Current Authentication State:');
const accessToken = localStorage.getItem('accessToken');
const refreshToken = localStorage.getItem('refreshToken');
const user = localStorage.getItem('user');

console.log('Access Token:', accessToken ? 'Present' : 'Missing');
console.log('Refresh Token:', refreshToken ? 'Present' : 'Missing');
console.log('User:', user ? 'Present' : 'Missing');

if (accessToken) {
  console.log('Token length:', accessToken.length);
  console.log('Token preview:', accessToken.substring(0, 20) + '...');
}

// Test 2: Check watchlist state
console.log('\n📝 Watchlist State:');
const watchlist = localStorage.getItem('watchlist');
if (watchlist) {
  try {
    const parsed = JSON.parse(watchlist);
    console.log('Local watchlist items:', parsed.length);
    if (parsed.length > 0) {
      console.log('Sample item:', parsed[0]);
    }
  } catch (error) {
    console.error('Error parsing watchlist:', error);
  }
} else {
  console.log('No watchlist in localStorage');
}

// Test 3: Test API connectivity with current token
console.log('\n🌐 Testing API Connectivity:');
if (accessToken) {
  console.log('Testing with current access token...');
  
  // Test the watchlist endpoint
  fetch('https://streamr-jjj9.onrender.com/api/user/watchlist', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('Watchlist endpoint response status:', response.status);
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  })
  .then(data => {
    console.log('✅ Watchlist endpoint working:', data);
    console.log('Backend watchlist items:', data.data?.watchlist?.length || 0);
  })
  .catch(error => {
    console.error('❌ Watchlist endpoint failed:', error.message);
  });
  
  // Test the profile endpoint
  fetch('https://streamr-jjj9.onrender.com/api/user/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('Profile endpoint response status:', response.status);
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  })
  .then(data => {
    console.log('✅ Profile endpoint working:', data);
  })
  .catch(error => {
    console.error('❌ Profile endpoint failed:', error.message);
  });
  
} else {
  console.log('❌ No access token available for API testing');
}

// Test 4: Check for authentication context
console.log('\n🔍 Authentication Context Check:');
if (window.authContext) {
  console.log('✅ Auth context available');
  console.log('User state:', window.authContext.user);
  console.log('Loading state:', window.authContext.loading);
} else {
  console.log('❌ Auth context not available');
}

// Test 5: Check for watchlist context
console.log('\n📋 Watchlist Context Check:');
if (window.watchlistContext) {
  console.log('✅ Watchlist context available');
  console.log('Watchlist state:', window.watchlistContext.watchlist);
  console.log('Is initialized:', window.watchlistContext.isInitialized);
  console.log('Last backend sync:', window.watchlistContext.lastBackendSync);
} else {
  console.log('❌ Watchlist context not available');
}

// Test 6: Manual authentication test
console.log('\n🔐 Manual Authentication Test:');
console.log('To test login, run this command:');
console.log('await testLogin("your-email@example.com", "your-password")');

// Function to test login
window.testLogin = async (email, password) => {
  console.log('Testing login with:', email);
  
  try {
    const response = await fetch('https://streamr-jjj9.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log('Login response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful:', data);
      
      // Check if accessToken is present
      if (data.data && data.data.accessToken) {
        console.log('✅ Access token received');
        
        // Test if the token works
        const testResponse = await fetch('https://streamr-jjj9.onrender.com/api/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data.data.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (testResponse.ok) {
          console.log('✅ Token validation successful');
          
          // Store the token
          localStorage.setItem('accessToken', data.data.accessToken);
          console.log('✅ Token stored in localStorage');
          
          // Test watchlist endpoint
          const watchlistResponse = await fetch('https://streamr-jjj9.onrender.com/api/user/watchlist', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${data.data.accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (watchlistResponse.ok) {
            const watchlistData = await watchlistResponse.json();
            console.log('✅ Watchlist endpoint accessible:', watchlistData);
          } else {
            console.error('❌ Watchlist endpoint failed:', watchlistResponse.status);
          }
          
        } else {
          console.error('❌ Token validation failed:', testResponse.status);
        }
      } else {
        console.error('❌ No access token in response');
      }
      
    } else {
      const errorData = await response.json();
      console.error('❌ Login failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error);
  }
};

// Test 7: Manual watchlist sync test
console.log('\n🔄 Manual Watchlist Sync Test:');
console.log('To test watchlist sync, run this command:');
console.log('await testWatchlistSync()');

window.testWatchlistSync = async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.error('❌ No access token available');
    return;
  }
  
  console.log('Testing watchlist sync...');
  
  const testMovie = {
    id: 999999,
    title: 'Test Movie for Sync',
    type: 'movie',
    poster_path: '/test-poster.jpg',
    overview: 'This is a test movie',
    year: '2024',
    rating: 8.5,
    genres: ['Action'],
    release_date: '2024-01-01',
    duration: '2h 15m',
    addedAt: new Date().toISOString()
  };
  
  try {
    // Test adding to watchlist
    const addResponse = await fetch('https://streamr-jjj9.onrender.com/api/user/watchlist', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ movieData: testMovie })
    });
    
    if (addResponse.ok) {
      console.log('✅ Movie added to watchlist');
      
      // Test syncing watchlist
      const syncResponse = await fetch('https://streamr-jjj9.onrender.com/api/user/watchlist/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ watchlist: [testMovie] })
      });
      
      if (syncResponse.ok) {
        console.log('✅ Watchlist sync successful');
      } else {
        console.error('❌ Watchlist sync failed:', syncResponse.status);
      }
      
    } else {
      console.error('❌ Failed to add movie:', addResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Watchlist sync test failed:', error);
  }
};

console.log('\n📋 Debug Summary:');
console.log('1. Check if you have an access token in localStorage');
console.log('2. Verify the token is valid by testing API endpoints');
console.log('3. Check if the watchlist context is properly initialized');
console.log('4. Test manual authentication and sync operations');
console.log('5. Look for any console errors during the process');

console.log('\n🚀 Next Steps:');
console.log('1. Run the authentication tests above');
console.log('2. Check the browser console for any error messages');
console.log('3. Monitor the Network tab for failed API requests');
console.log('4. Verify that the token is being sent in the Authorization header');
