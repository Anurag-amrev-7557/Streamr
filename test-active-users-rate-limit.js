#!/usr/bin/env node

/**
 * Test script to verify active-users endpoint rate limiting
 * This helps ensure the endpoint can handle the expected load
 */

const https = require('https');

const API_BASE = 'https://streamr-jjj9.onrender.com';
const ENDPOINT = '/api/active-users';

// Test configuration
const TEST_CONFIG = {
  requestsPerSecond: 2, // 2 requests per second
  totalRequests: 20,    // Test with 20 requests
  delayBetweenBatches: 1000 // 1 second between batches
};

let successCount = 0;
let rateLimitCount = 0;
let errorCount = 0;
let startTime = Date.now();

function makeRequest(requestNumber) {
  return new Promise((resolve) => {
    const req = https.get(`${API_BASE}${ENDPOINT}`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          successCount++;
          console.log(`✅ Request ${requestNumber}: Success (${res.statusCode}) - ${responseTime}ms`);
        } else if (res.statusCode === 429) {
          rateLimitCount++;
          console.log(`🚫 Request ${requestNumber}: Rate Limited (${res.statusCode}) - ${responseTime}ms`);
          
          try {
            const errorData = JSON.parse(data);
            console.log(`   Retry after: ${errorData.retryAfter}s`);
          } catch (e) {
            console.log(`   Response: ${data}`);
          }
        } else {
          errorCount++;
          console.log(`❌ Request ${requestNumber}: Error (${res.statusCode}) - ${responseTime}ms`);
        }
        
        resolve();
      });
    });
    
    req.on('error', (err) => {
      errorCount++;
      console.log(`❌ Request ${requestNumber}: Network Error - ${err.message}`);
      resolve();
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      errorCount++;
      console.log(`⏰ Request ${requestNumber}: Timeout`);
      resolve();
    });
  });
}

async function runTest() {
  console.log('🧪 Testing Active Users Endpoint Rate Limiting');
  console.log(`📍 Endpoint: ${API_BASE}${ENDPOINT}`);
  console.log(`⚡ Rate: ${TEST_CONFIG.requestsPerSecond} requests/second`);
  console.log(`📊 Total: ${TEST_CONFIG.totalRequests} requests`);
  console.log('─'.repeat(60));
  
  startTime = Date.now();
  
  // Make requests in batches
  for (let i = 0; i < TEST_CONFIG.totalRequests; i += TEST_CONFIG.requestsPerSecond) {
    const batch = [];
    
    // Create batch of requests
    for (let j = 0; j < TEST_CONFIG.requestsPerSecond && (i + j) < TEST_CONFIG.totalRequests; j++) {
      const requestNumber = i + j + 1;
      batch.push(makeRequest(requestNumber));
    }
    
    // Execute batch
    await Promise.all(batch);
    
    // Small delay between batches
    if (i + TEST_CONFIG.requestsPerSecond < TEST_CONFIG.totalRequests) {
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.delayBetweenBatches));
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  console.log('─'.repeat(60));
  console.log('📊 Test Results:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`🚫 Rate Limited: ${rateLimitCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log(`📈 Success Rate: ${((successCount / TEST_CONFIG.totalRequests) * 100).toFixed(1)}%`);
  
  if (rateLimitCount > 0) {
    console.log('\n⚠️  Rate limiting detected - endpoint may be too restrictive');
  } else if (successCount === TEST_CONFIG.totalRequests) {
    console.log('\n🎉 All requests successful - rate limiting is appropriate');
  }
}

// Run the test
runTest().catch(console.error); 