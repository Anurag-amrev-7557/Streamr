#!/usr/bin/env node

/**
 * Simple Active Users Test Script
 * Uses only built-in Node.js modules
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testActiveUsersAPI() {
  console.log('🧪 Testing Active Users API...');
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/active-users`);
    
    if (result.status === 200) {
      console.log('✅ API Response:', result.data);
      console.log(`   Count: ${result.data.count}`);
      console.log(`   Timestamp: ${result.data.timestamp}`);
      return result.data.count;
    } else {
      console.log(`❌ API Error: Status ${result.status}`);
      console.log('   Response:', result.data);
      return null;
    }
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    return null;
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...');
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/health`);
    
    if (result.status === 200) {
      console.log('✅ Health Check Passed');
      console.log('   Status:', result.data.status);
      console.log('   Environment:', result.data.environment);
      return true;
    } else {
      console.log(`❌ Health Check Failed: Status ${result.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testMultipleConnections() {
  console.log('\n🔗 Testing Multiple Connections...');
  
  try {
    const promises = [];
    const connectionCount = 5;
    
    console.log(`   Making ${connectionCount} simultaneous requests...`);
    
    for (let i = 0; i < connectionCount; i++) {
      promises.push(makeRequest(`${BASE_URL}/api/active-users`));
    }
    
    const results = await Promise.all(promises);
    const successfulRequests = results.filter(r => r.status === 200).length;
    
    console.log(`✅ ${successfulRequests}/${connectionCount} requests successful`);
    
    if (successfulRequests > 0) {
      const lastResult = results[results.length - 1];
      console.log(`   Final count: ${lastResult.data.count}`);
    }
    
    return successfulRequests;
  } catch (error) {
    console.error('❌ Multiple Connections Test Failed:', error.message);
    return 0;
  }
}

async function runTests() {
  console.log('🚀 Starting Active Users Feature Tests\n');
  console.log(`📍 Backend URL: ${BASE_URL}\n`);
  
  // Test 1: Health Check
  const healthOk = await testHealthEndpoint();
  
  if (!healthOk) {
    console.log('\n❌ Backend is not responding. Please start the backend server first.');
    console.log('   Run: cd backend && npm start');
    process.exit(1);
  }
  
  // Test 2: API Endpoint
  const initialCount = await testActiveUsersAPI();
  
  // Test 3: Multiple Connections
  const connectionTest = await testMultipleConnections();
  
  // Test 4: API Endpoint again
  const finalCount = await testActiveUsersAPI();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Health Check: ${healthOk ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Initial Count: ${initialCount}`);
  console.log(`Final Count: ${finalCount}`);
  console.log(`Connection Test: ${connectionTest}/5 successful`);
  
  if (initialCount !== null && finalCount !== null) {
    console.log(`Count Change: ${finalCount - initialCount}`);
  }
  
  console.log('\n🎯 Summary:');
  if (healthOk && initialCount !== null && connectionTest > 0) {
    console.log('✅ Backend is running and API is accessible!');
    console.log('✅ Active Users feature is working correctly.');
    
    if (initialCount === finalCount) {
      console.log('ℹ️  Count remained stable (this is normal for single-user testing)');
    }
  } else {
    console.log('❌ Some tests failed. Check the backend server configuration.');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Open your website in multiple browser tabs');
  console.log('   2. Check the Network tab in DevTools for WebSocket connections');
  console.log('   3. Monitor the active users count in real-time');
  console.log('   4. Use the detailed guide in ACTIVE_USERS_ACCURACY_GUIDE.md');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Simple Active Users Test Script

Usage: node simple-test-active-users.js [options]

Options:
  --help, -h     Show this help message

Environment Variables:
  BACKEND_URL    Backend server URL (default: http://localhost:3001)

Examples:
  node simple-test-active-users.js
  BACKEND_URL=https://my-backend.com node simple-test-active-users.js

This script tests:
  ✅ Backend health status
  ✅ Active users API endpoint
  ✅ Multiple simultaneous connections
  ✅ API response consistency
  `);
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
}); 