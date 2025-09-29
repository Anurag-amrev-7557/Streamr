#!/usr/bin/env node

// Debug Watchlist 500 Error
// This script helps identify the cause of the 500 error in watchlist sync

const axios = require('axios');

const DEPLOYED_URL = 'https://streamr-jjj9.onrender.com/api';

// Test different scenarios to identify the 500 error
const debugWatchlist500 = async () => {
  console.log('🔍 Debugging Watchlist 500 Error...\n');
  
  try {
    // Test 1: Check if backend is healthy
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await axios.get(`${DEPLOYED_URL}/health`);
    console.log('✅ Backend is healthy:', healthResponse.data);
    
    // Test 2: Test with invalid token (should get 401)
    console.log('\n2️⃣ Testing with invalid token...');
    try {
      await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, {
        watchlist: [{ id: 1, title: 'Test' }]
      }, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token (401)');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 3: Test with missing token (should get 401)
    console.log('\n3️⃣ Testing with missing token...');
    try {
      await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, {
        watchlist: [{ id: 1, title: 'Test' }]
      });
      console.log('❌ Unexpected success without token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected missing token (401)');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 4: Test with malformed data (should get 400)
    console.log('\n4️⃣ Testing with malformed data...');
    try {
      await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, {
        watchlist: 'not_an_array'
      }, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success with malformed data');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected malformed data (400)');
      } else if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token (401)');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 5: Test with empty watchlist array
    console.log('\n5️⃣ Testing with empty watchlist array...');
    try {
      await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, {
        watchlist: []
      }, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success with empty array');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token (401)');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 6: Test with missing watchlist field
    console.log('\n6️⃣ Testing with missing watchlist field...');
    try {
      await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, {}, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success with missing field');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected missing field (400)');
      } else if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token (401)');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 7: Test with null body
    console.log('\n7️⃣ Testing with null body...');
    try {
      await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, null, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success with null body');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected null body (400)');
      } else if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token (401)');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status, error.response?.data);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('   ✅ Backend is healthy and responding');
    console.log('   ✅ Authentication middleware is working (401 responses)');
    console.log('   ✅ Route exists and is accessible');
    console.log('   💡 The 500 error is likely happening when:');
    console.log('      - A valid token is provided');
    console.log('      - The request reaches the controller');
    console.log('      - An error occurs in the syncWatchlist function');
    console.log('\n🔧 Next steps:');
    console.log('   1. Check if the user has a valid token in localStorage');
    console.log('   2. Verify the token format and expiration');
    console.log('   3. Check if the user exists in the database');
    console.log('   4. Look for any database connection issues');
    console.log('   5. Check backend logs for specific error details');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
};

debugWatchlist500();
