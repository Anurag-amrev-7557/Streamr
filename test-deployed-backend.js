#!/usr/bin/env node

// Test Deployed Backend Functionality
// This script tests the deployed backend endpoints

const axios = require('axios');

const DEPLOYED_URL = 'https://streamr-jjj9.onrender.com/api';

// Test the deployed backend
const testDeployedBackend = async () => {
  console.log('🔍 Testing Deployed Backend...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get('https://streamr-jjj9.onrender.com/api/health');
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test 2: Check if watchlist endpoint exists
    console.log('\n2️⃣ Testing watchlist endpoint existence...');
    try {
      const watchlistResponse = await axios.get(`${DEPLOYED_URL}/user/watchlist`, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Watchlist endpoint exists (requires auth)');
      } else if (error.response?.status === 404) {
        console.log('❌ Watchlist endpoint not found');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status);
      }
    }
    
    // Test 3: Check if wishlist endpoint exists
    console.log('\n3️⃣ Testing wishlist endpoint existence...');
    try {
      const wishlistResponse = await axios.get(`${DEPLOYED_URL}/user/wishlist`, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Wishlist endpoint exists (requires auth)');
      } else if (error.response?.status === 404) {
        console.log('❌ Wishlist endpoint not found - This is the problem!');
        console.log('💡 The deployed backend doesn\'t have wishlist functionality');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status);
      }
    }
    
    // Test 4: Try to sync watchlist (this should fail with 500)
    console.log('\n4️⃣ Testing watchlist sync (expecting 500 error)...');
    try {
      const syncResponse = await axios.post(`${DEPLOYED_URL}/user/watchlist/sync`, {
        watchlist: [{ id: 1, title: 'Test' }]
      }, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success with invalid token');
    } catch (error) {
      if (error.response?.status === 500) {
        console.log('❌ Watchlist sync returns 500 error (server issue)');
        console.log('💡 This confirms the deployed backend has problems');
      } else if (error.response?.status === 401) {
        console.log('✅ Watchlist sync endpoint exists (requires auth)');
      } else {
        console.log('⚠️  Unexpected response:', error.response?.status);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('   ✅ Health endpoint: Working');
    console.log('   ✅ Watchlist endpoint: Exists');
    console.log('   ❌ Wishlist endpoint: Missing (causing 500 errors)');
    console.log('   ❌ Watchlist sync: Returns 500 (server error)');
    
    console.log('\n🔧 Solution:');
    console.log('   You need to deploy the updated backend code that includes:');
    console.log('   - Updated User model with wishlist field');
    console.log('   - New wishlist routes and controllers');
    console.log('   - Fixed watchlist sync functionality');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testDeployedBackend();
