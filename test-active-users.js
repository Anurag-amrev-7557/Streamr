#!/usr/bin/env node

/**
 * Test script for Active Users feature
 * Tests both the API endpoint and WebSocket functionality
 */

const io = require('socket.io-client');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testActiveUsersAPI() {
  console.log('🧪 Testing Active Users API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/active-users`);
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
  console.log('\n🔌 Testing WebSocket Connection...');
  
  return new Promise((resolve) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      timeout: 5000
    });
    
    let updateReceived = false;
    
    socket.on('connect', () => {
      console.log('✅ WebSocket Connected');
      console.log(`   Socket ID: ${socket.id}`);
    });
    
    socket.on('activeUsers:update', (data) => {
      console.log('✅ Active Users Update Received:', data);
      updateReceived = true;
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket Connection Error:', error.message);
    });
    
    // Wait for potential updates
    setTimeout(() => {
      socket.disconnect();
      console.log('🔌 WebSocket Disconnected');
      resolve(updateReceived);
    }, 3000);
  });
}

async function runTests() {
  console.log('🚀 Starting Active Users Feature Tests\n');
  console.log(`📍 Backend URL: ${BASE_URL}\n`);
  
  // Test 1: API Endpoint
  const initialCount = await testActiveUsersAPI();
  
  // Test 2: WebSocket Connection
  const wsUpdateReceived = await testWebSocketConnection();
  
  // Test 3: API Endpoint again (to see if count changed)
  const finalCount = await testActiveUsersAPI();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Initial Count: ${initialCount}`);
  console.log(`Final Count: ${finalCount}`);
  console.log(`WebSocket Updates: ${wsUpdateReceived ? '✅ Received' : '❌ Not Received'}`);
  
  if (initialCount !== null && finalCount !== null) {
    console.log(`Count Change: ${finalCount - initialCount}`);
  }
  
  console.log('\n🎯 Summary:');
  if (initialCount !== null && wsUpdateReceived) {
    console.log('✅ All tests passed! Active Users feature is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the backend server and WebSocket configuration.');
  }
  
  process.exit(0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Active Users Feature Test Script

Usage: node test-active-users.js [options]

Options:
  --help, -h     Show this help message
  --url <url>    Set backend URL (default: http://localhost:3001)

Environment Variables:
  BACKEND_URL    Backend server URL

Examples:
  node test-active-users.js
  BACKEND_URL=https://my-backend.com node test-active-users.js
  `);
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
}); 