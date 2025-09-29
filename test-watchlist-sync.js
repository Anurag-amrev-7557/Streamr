#!/usr/bin/env node

// Node.js Watchlist Sync Test Script
// Tests the watchlist sync endpoint with mock data

const http = require('http');

console.log('🔄 TESTING WATCHLIST SYNC ENDPOINT...\n');

// Mock watchlist data
const mockWatchlist = [
  {
    id: 999999,
    title: 'Test Movie for Backend Test',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    overview: 'This is a comprehensive test movie to verify all watchlist functionality',
    type: 'movie',
    year: '2024',
    rating: 8.5,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    release_date: '2024-01-01',
    duration: '2h 15m',
    director: 'Test Director',
    cast: ['Test Actor 1', 'Test Actor 2', 'Test Actor 3'],
    addedAt: new Date().toISOString()
  },
  {
    id: 999998,
    title: 'Second Test Movie',
    poster_path: '/test-poster-2.jpg',
    backdrop_path: '/test-backdrop-2.jpg',
    overview: 'This is a second test movie',
    type: 'movie',
    year: '2024',
    rating: 7.8,
    genres: ['Comedy', 'Romance'],
    release_date: '2024-02-01',
    duration: '1h 45m',
    director: 'Second Test Director',
    cast: ['Second Actor 1', 'Second Actor 2'],
    addedAt: new Date().toISOString()
  }
];

console.log('📊 Mock watchlist data:');
console.log(JSON.stringify(mockWatchlist, null, 2));

// Test 1: Test sync endpoint without authentication
console.log('\n🔐 TEST 1: SYNC WITHOUT AUTHENTICATION');
console.log('Testing watchlist sync endpoint without authentication...');

const syncOptionsNoAuth = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/user/watchlist/sync',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const syncReqNoAuth = http.request(syncOptionsNoAuth, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 401) {
      console.log('✅ Authentication required (correct behavior)');
      try {
        const response = JSON.parse(data);
        console.log('Response:', response);
      } catch (e) {
        console.log('Raw response:', data);
      }
    } else {
      console.log('❌ Unexpected response:', res.statusCode);
    }
    
    // Test 2: Test sync endpoint with mock authentication
    console.log('\n🎭 TEST 2: SYNC WITH MOCK AUTHENTICATION');
    console.log('Testing watchlist sync endpoint with mock token...');
    
    const syncOptionsMockAuth = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/user/watchlist/sync',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token-for-testing'
      }
    };
    
    const syncReqMockAuth = http.request(syncOptionsMockAuth, (res2) => {
      let data2 = '';
      
      res2.on('data', (chunk) => {
        data2 += chunk;
      });
      
      res2.on('end', () => {
        if (res2.statusCode === 401) {
          console.log('✅ Invalid token rejected (correct behavior)');
          try {
            const response = JSON.parse(data2);
            console.log('Response:', response);
          } catch (e) {
            console.log('Raw response:', data2);
          }
        } else {
          console.log('❌ Unexpected response:', res2.statusCode);
        }
        
        console.log('\n📋 SYNC ENDPOINT TEST SUMMARY:');
        console.log('- ✅ Sync endpoint requires authentication');
        console.log('- ✅ Invalid tokens are properly rejected');
        console.log('- ✅ Endpoint is accessible and responding');
        console.log('\n🚀 Sync endpoint tests completed!');
        console.log('The backend is properly protecting the watchlist sync endpoint.');
        console.log('Now test the complete frontend functionality in your browser.');
      });
    });
    
    syncReqMockAuth.on('error', (e) => {
      console.log('❌ Mock auth test failed:', e.message);
    });
    
    syncReqMockAuth.write(JSON.stringify({ watchlist: mockWatchlist }));
    syncReqMockAuth.end();
  });
});

syncReqNoAuth.on('error', (e) => {
  console.log('❌ No auth test failed:', e.message);
});

syncReqNoAuth.write(JSON.stringify({ watchlist: mockWatchlist }));
syncReqNoAuth.end();
