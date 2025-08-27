#!/usr/bin/env node

/**
 * Test script to verify rate limiting improvements
 * This script tests the backend rate limiting configuration
 */

const axios = require('axios');

const BASE_URL = 'https://streamr-jjj9.onrender.com/api';
const ENDPOINTS = [
  '/tmdb/trending',
  '/tmdb/popular', 
  '/tmdb/top-rated',
  '/tmdb/upcoming',
  '/tmdb/now-playing'
];

async function testRateLimiting() {
  console.log('🧪 Testing rate limiting improvements...\n');
  
  try {
    // Test 1: Single request to verify endpoint is working
    console.log('✅ Test 1: Single request test');
    const singleResponse = await axios.get(`${BASE_URL}${ENDPOINTS[0]}`);
    console.log(`   Status: ${singleResponse.status}`);
    console.log(`   Rate limit headers:`, {
      'X-RateLimit-Limit': singleResponse.headers['x-ratelimit-limit'],
      'X-RateLimit-Remaining': singleResponse.headers['x-ratelimit-remaining'],
      'X-RateLimit-Reset': singleResponse.headers['x-ratelimit-reset']
    });
    
    // Test 2: Multiple rapid requests to test rate limiting
    console.log('\n✅ Test 2: Multiple rapid requests test');
    const promises = ENDPOINTS.map(endpoint => 
      axios.get(`${BASE_URL}${endpoint}`).catch(err => ({ error: err.response?.status || err.message }))
    );
    
    const results = await Promise.allSettled(promises);
    let successCount = 0;
    let rateLimitedCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        successCount++;
        console.log(`   ${ENDPOINTS[index]}: ✅ Success`);
      } else if (result.value.error === 429) {
        rateLimitedCount++;
        console.log(`   ${ENDPOINTS[index]}: 🚫 Rate Limited (429)`);
      } else {
        console.log(`   ${ENDPOINTS[index]}: ❌ Error: ${result.value.error}`);
      }
    });
    
    console.log(`\n📊 Results:`);
    console.log(`   Successful requests: ${successCount}`);
    console.log(`   Rate limited requests: ${rateLimitedCount}`);
    console.log(`   Total requests: ${results.length}`);
    
    // Test 3: Sequential requests with delays
    console.log('\n✅ Test 3: Sequential requests with delays');
    for (let i = 0; i < 3; i++) {
      try {
        const response = await axios.get(`${BASE_URL}${ENDPOINTS[i]}`);
        console.log(`   Request ${i + 1}: ✅ Success (${response.status})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`   Request ${i + 1}: 🚫 Rate Limited (429)`);
        } else {
          console.log(`   Request ${i + 1}: ❌ Error: ${error.response?.status || error.message}`);
        }
      }
    }
    
    console.log('\n🎯 Rate limiting test completed!');
    console.log('   If you see fewer 429 errors, the improvements are working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testRateLimiting(); 