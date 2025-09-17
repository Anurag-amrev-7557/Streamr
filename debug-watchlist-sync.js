const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001/api';

// Helper function to check backend status
const checkBackendStatus = async () => {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/`);
    if (response.data.includes('Streamr Backend API is running')) {
      console.log('✅ Backend is running and healthy');
      return true;
    } else {
      console.log('⚠️  Backend responded but with unexpected content');
      return true; // Still consider it running
    }
  } catch (error) {
    console.error('❌ Backend is not accessible:', error.message);
    return false;
  }
};

// Helper function to check if user is authenticated
const checkAuthStatus = async (token) => {
  if (!token) {
    console.log('⚠️  No auth token provided');
    return false;
  }

  try {
    const response = await axios.get(`${BASE_URL}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ User is authenticated:', response.data.data.username);
      return true;
    } else {
      console.log('❌ Authentication failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error.response?.data || error.message);
    return false;
  }
};

// Helper function to get current watchlist from backend
const getBackendWatchlist = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/watchlist`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Backend watchlist retrieved successfully');
      return response.data.data.watchlist;
    } else {
      console.log('❌ Failed to get backend watchlist:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting backend watchlist:', error.response?.data || error.message);
    return null;
  }
};

// Helper function to sync watchlist to backend
const syncWatchlistToBackend = async (token, watchlist) => {
  try {
    console.log('🔄 Attempting to sync watchlist to backend...');
    console.log('📊 Items to sync:', watchlist.length);
    
    const response = await axios.post(`${BASE_URL}/user/watchlist/sync`, {
      watchlist: watchlist
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Watchlist synced to backend successfully!');
      console.log('📊 Backend now has:', response.data.data.watchlist.length, 'items');
      return true;
    } else {
      console.log('❌ Sync failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Sync error:', error.response?.data || error.message);
    return false;
  }
};

// Main debug function
const debugWatchlistSync = async () => {
  console.log('🔍 Debugging Watchlist Sync Issue...\n');
  
  // Check backend status
  const backendRunning = await checkBackendStatus();
  if (!backendRunning) {
    console.log('\n💡 Please start the backend server first:');
    console.log('   cd backend && npm start');
    return;
  }
  
  // Check if we have an auth token
  let authToken = process.env.AUTH_TOKEN;
  if (!authToken && process.argv.includes('--token')) {
    const tokenIndex = process.argv.indexOf('--token');
    if (tokenIndex + 1 < process.argv.length) {
      authToken = process.argv[tokenIndex + 1];
    }
  }
  
  if (!authToken) {
    console.log('\n🔑 Please provide an auth token:');
    console.log('   Option 1: Set AUTH_TOKEN environment variable');
    console.log('   Option 2: Run with --token <your_token>');
    console.log('\n💡 Example: AUTH_TOKEN=your_token node debug-watchlist-sync.js');
    console.log('💡 Example: node debug-watchlist-sync.js --token your_token');
    return;
  }
  
  console.log('🔑 Using auth token:', authToken.substring(0, 20) + '...\n');
  
  // Check authentication
  const isAuthenticated = await checkAuthStatus(authToken);
  if (!isAuthenticated) {
    console.log('\n💡 Please check your auth token or re-login to get a fresh token');
    return;
  }
  
  // Get current backend watchlist
  console.log('📋 Checking current backend watchlist...');
  const backendWatchlist = await getBackendWatchlist(authToken);
  
  if (backendWatchlist) {
    console.log('📊 Backend watchlist has:', backendWatchlist.length, 'items');
    if (backendWatchlist.length > 0) {
      console.log('📝 First few items:');
      backendWatchlist.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title} (ID: ${item.id})`);
      });
    }
  }
  
  // Check localStorage data (this would be from the frontend)
  console.log('\n💾 To check localStorage data, please:');
  console.log('   1. Open your browser to the frontend app');
  console.log('   2. Open DevTools (F12)');
  console.log('   3. Go to Application → Local Storage');
  console.log('   4. Look for the "watchlist" key');
  console.log('   5. Copy the value and paste it here when prompted');
  
  // Ask user to provide localStorage data
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\n📋 Please paste the localStorage watchlist data (or press Enter to skip): ', async (input) => {
    if (input.trim()) {
      try {
        const localStorageWatchlist = JSON.parse(input);
        console.log('\n📊 LocalStorage watchlist has:', localStorageWatchlist.length, 'items');
        
        if (localStorageWatchlist.length > 0) {
          console.log('📝 First few items:');
          localStorageWatchlist.slice(0, 3).forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.title} (ID: ${item.id})`);
          });
        }
        
        // Compare with backend
        if (backendWatchlist) {
          const backendCount = backendWatchlist.length;
          const localCount = localStorageWatchlist.length;
          
          console.log('\n🔍 Comparison:');
          console.log(`   Backend: ${backendCount} items`);
          console.log(`   LocalStorage: ${localCount} items`);
          
          if (backendCount === 0 && localCount > 0) {
            console.log('\n⚠️  Backend is empty but localStorage has data!');
            console.log('🔄 Attempting to sync localStorage data to backend...');
            
            const syncSuccess = await syncWatchlistToBackend(authToken, localStorageWatchlist);
            if (syncSuccess) {
              console.log('\n🎉 Sync completed! Your watchlist should now be in the backend.');
            } else {
              console.log('\n❌ Sync failed. Check the error messages above.');
            }
          } else if (backendCount > 0 && localCount > 0) {
            console.log('\n📊 Both backend and localStorage have data');
            console.log('🔄 Syncing localStorage data to backend to ensure consistency...');
            
            const syncSuccess = await syncWatchlistToBackend(authToken, localStorageWatchlist);
            if (syncSuccess) {
              console.log('\n🎉 Sync completed!');
            } else {
              console.log('\n❌ Sync failed. Check the error messages above.');
            }
          }
        }
        
      } catch (error) {
        console.error('❌ Error parsing localStorage data:', error.message);
        console.log('💡 Please make sure you copied the entire JSON data correctly');
      }
    } else {
      console.log('\n⏭️  Skipping localStorage check');
    }
    
    rl.close();
  });
};

// Run the debug function
debugWatchlistSync();
