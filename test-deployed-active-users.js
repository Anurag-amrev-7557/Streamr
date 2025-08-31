#!/usr/bin/env node

/**
 * Test script for Active Users feature with deployed backend
 * Tests both the API endpoint and WebSocket functionality
 */

const io = require('socket.io-client');

const DEPLOYED_BACKEND_URL = 'https://streamr-jjj9.onrender.com';

async function testActiveUsersAPI() {
  console.log('🧪 Testing Active Users API on deployed backend...');
  
  try {
    const response = await fetch(`${DEPLOYED_BACKEND_URL}/api/active-users`);
    const data = await response.json();
    
    console.log('✅ API Response:', data);
    console.log(`   Count: ${data.count}`);
    console.log(`   Timestamp: ${data.timestamp}`);
    
    return data.count;
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    return null;
  }
}

function testWebSocketConnection() {
  console.log('\n🔌 Testing WebSocket Connection to deployed backend...');
  
  return new Promise((resolve) => {
    let updateReceived = false;
    
    const socket = io(DEPLOYED_BACKEND_URL, {
      withCredentials: true,
      transports: ['websocket'],
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
    });

    socket.on('activeUsers:update', (data) => {
      console.log('✅ Received active users update:', data);
      updateReceived = true;
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    // Wait for 3 seconds to see if we get any updates
    setTimeout(() => {
      socket.disconnect();
      resolve(updateReceived);
    }, 3000);
  });
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...');
  
  try {
    const response = await fetch(`${DEPLOYED_BACKEND_URL}/api/health`);
    const data = await response.json();
    
    console.log('✅ Health Response:', data);
    return true;
  } catch (error) {
    console.error('❌ Health Test Failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Deployed Backend Active Users Tests\n');
  console.log(`📍 Backend URL: ${DEPLOYED_BACKEND_URL}\n`);
  
  // Test 1: Health endpoint
  const healthOk = await testHealthEndpoint();
  
  // Test 2: API Endpoint
  const initialCount = await testActiveUsersAPI();
  
  // Test 3: WebSocket Connection
  const wsUpdateReceived = await testWebSocketConnection();
  
  // Test 4: API Endpoint again (to see if count changed)
  const finalCount = await testActiveUsersAPI();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Health Check: ${healthOk ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Initial Count: ${initialCount}`);
  console.log(`Final Count: ${finalCount}`);
  console.log(`WebSocket Updates: ${wsUpdateReceived ? '✅ Received' : '❌ Not Received'}`);
  
  if (initialCount !== null && finalCount !== null) {
    console.log(`Count Change: ${finalCount - initialCount}`);
  }
  
  console.log('\n🎯 Summary:');
  if (healthOk && initialCount !== null && wsUpdateReceived) {
    console.log('✅ All tests passed! Active Users feature is working correctly on deployed backend.');
  } else {
    console.log('❌ Some tests failed. Check the deployed backend server and WebSocket configuration.');
  }
  
  process.exit(0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node test-deployed-active-users.js [options]

Options:
  --help, -h    Show this help message

This script tests the active users feature on the deployed backend.
  `);
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 