#!/usr/bin/env node

/**
 * Simple test to check current rate limiting status
 */

const axios = require('axios');

const BASE_URL = 'https://streamr-jjj9.onrender.com/api';

async function checkRateLimitStatus() {
  console.log('🔍 Checking current rate limiting status...\n');
  
  try {
    // Test health endpoint first
    console.log('✅ Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log(`   Health endpoint: ✅ Success (${healthResponse.status})`);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`   Health endpoint: 🚫 Rate Limited (429)`);
        console.log(`   Retry after: ${error.response.data.retryAfter}s`);
      } else {
        console.log(`   Health endpoint: ❌ Error: ${error.response?.status || error.message}`);
      }
    }
    
    // Test TMDB trending endpoint
    console.log('\n✅ Testing TMDB trending endpoint...');
    try {
      const trendingResponse = await axios.get(`${BASE_URL}/tmdb/trending`);
      console.log(`   TMDB trending: ✅ Success (${trendingResponse.status})`);
      
      // Check rate limit headers
      const headers = trendingResponse.headers;
      console.log(`   Rate limit headers:`);
      console.log(`     X-RateLimit-Limit: ${headers['x-ratelimit-limit'] || 'Not set'}`);
      console.log(`     X-RateLimit-Remaining: ${headers['x-ratelimit-remaining'] || 'Not set'}`);
      console.log(`     X-RateLimit-Reset: ${headers['x-ratelimit-reset'] || 'Not set'}`);
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`   TMDB trending: 🚫 Rate Limited (429)`);
        console.log(`   Error details:`, error.response.data);
        console.log(`   Retry after: ${error.response.data.retryAfter}s`);
        console.log(`   Endpoint: ${error.response.data.endpoint}`);
        console.log(`   Timestamp: ${error.response.data.timestamp}`);
      } else {
        console.log(`   TMDB trending: ❌ Error: ${error.response?.status || error.message}`);
      }
    }
    
    // Wait a bit and try again to see if rate limit resets
    console.log('\n⏳ Waiting 5 seconds to test rate limit behavior...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n✅ Testing TMDB trending endpoint again...');
    try {
      const trendingResponse2 = await axios.get(`${BASE_URL}/tmdb/trending`);
      console.log(`   TMDB trending (retry): ✅ Success (${trendingResponse2.status})`);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`   TMDB trending (retry): 🚫 Still Rate Limited (429)`);
        console.log(`   Retry after: ${error.response.data.retryAfter}s`);
      } else {
        console.log(`   TMDB trending (retry): ❌ Error: ${error.response?.status || error.message}`);
      }
    }
    
    console.log('\n📊 Rate limiting analysis:');
    console.log('   If you see 429 errors, the backend rate limiting is active');
    console.log('   If you see success after waiting, rate limiting is working as expected');
    console.log('   The retry-after value shows how long to wait before retrying');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
checkRateLimitStatus(); 