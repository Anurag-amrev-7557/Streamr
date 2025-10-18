#!/usr/bin/env node

/**
 * Comprehensive Active Users Accuracy Test
 * Tests the accuracy of active users tracking across multiple scenarios
 */

const io = require('socket.io-client');
const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_URL = `${BACKEND_URL}/api/active-users`;

console.log('🔍 Active Users Accuracy Test');
console.log('============================');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`API URL: ${API_URL}`);
console.log('');

let testResults = {
  apiEndpoint: false,
  websocketConnection: false,
  realTimeUpdates: false,
  multipleConnections: false,
  cleanupMechanism: false,
  sessionConsistency: false
};

// Test 1: API Endpoint Accuracy
async function testApiEndpoint() {
  console.log('🧪 Test 1: API Endpoint Accuracy');
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (response.ok && typeof data.count === 'number') {
      console.log(`✅ API endpoint working - Count: ${data.count}`);
      console.log(`   Timestamp: ${data.timestamp}`);
      if (data.debug) {
        console.log(`   Debug info: ${JSON.stringify(data.debug)}`);
      }
      testResults.apiEndpoint = true;
      return data.count;
    } else {
      console.log('❌ API endpoint returned invalid data');
      return null;
    }
  } catch (error) {
    console.log(`❌ API endpoint failed: ${error.message}`);
    return null;
  }
}

// Test 2: WebSocket Connection
async function testWebSocketConnection() {
  console.log('\n🔌 Test 2: WebSocket Connection');
  return new Promise((resolve) => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      timeout: 5000
    });

    let connected = false;
    let receivedUpdate = false;

    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      connected = true;
    });

    socket.on('activeUsers:update', (data) => {
      console.log(`✅ Received active users update: ${data.count}`);
      receivedUpdate = true;
      testResults.websocketConnection = true;
      testResults.realTimeUpdates = true;
      socket.disconnect();
      resolve({ connected, receivedUpdate });
    });

    socket.on('connect_error', (error) => {
      console.log(`❌ WebSocket connection failed: ${error.message}`);
      resolve({ connected: false, receivedUpdate: false });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!connected) {
        console.log('❌ WebSocket connection timeout');
        socket.disconnect();
        resolve({ connected: false, receivedUpdate: false });
      }
    }, 10000);
  });
}

// Test 3: Multiple Connections Accuracy
async function testMultipleConnections() {
  console.log('\n👥 Test 3: Multiple Connections Accuracy');
  
  const sockets = [];
  const initialCount = await testApiEndpoint();
  
  try {
    // Create 3 connections
    for (let i = 0; i < 3; i++) {
      const socket = io(BACKEND_URL, {
        transports: ['websocket'],
        timeout: 5000
      });
      sockets.push(socket);
      
      await new Promise(resolve => {
        socket.on('connect', resolve);
        socket.on('connect_error', resolve);
      });
    }

    // Wait for updates to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check final count
    const finalCount = await testApiEndpoint();
    
    if (finalCount !== null && finalCount >= initialCount + 3) {
      console.log(`✅ Multiple connections working - Initial: ${initialCount}, Final: ${finalCount}`);
      testResults.multipleConnections = true;
    } else {
      console.log(`❌ Multiple connections failed - Expected: ${initialCount + 3}, Got: ${finalCount}`);
    }

    // Clean up connections
    sockets.forEach(socket => socket.disconnect());
    
  } catch (error) {
    console.log(`❌ Multiple connections test failed: ${error.message}`);
  }
}

// Test 4: Session Consistency
async function testSessionConsistency() {
  console.log('\n🔄 Test 4: Session Consistency');
  
  try {
    const socket1 = io(BACKEND_URL, {
      transports: ['websocket'],
      timeout: 5000
    });

    await new Promise(resolve => {
      socket1.on('connect', resolve);
      socket1.on('connect_error', resolve);
    });

    const count1 = await testApiEndpoint();
    console.log(`   Initial connection count: ${count1}`);

    // Disconnect and reconnect
    socket1.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const socket2 = io(BACKEND_URL, {
      transports: ['websocket'],
      timeout: 5000
    });

    await new Promise(resolve => {
      socket2.on('connect', resolve);
      socket2.on('connect_error', resolve);
    });

    const count2 = await testApiEndpoint();
    console.log(`   After reconnect count: ${count2}`);

    // The count should be consistent (not double-counting)
    if (count2 === count1) {
      console.log('✅ Session consistency maintained');
      testResults.sessionConsistency = true;
    } else {
      console.log(`❌ Session consistency failed - Count changed from ${count1} to ${count2}`);
    }

    socket2.disconnect();
    
  } catch (error) {
    console.log(`❌ Session consistency test failed: ${error.message}`);
  }
}

// Test 5: Cleanup Mechanism
async function testCleanupMechanism() {
  console.log('\n🧹 Test 5: Cleanup Mechanism');
  
  try {
    // Create multiple connections
    const sockets = [];
    for (let i = 0; i < 5; i++) {
      const socket = io(BACKEND_URL, {
        transports: ['websocket'],
        timeout: 5000
      });
      sockets.push(socket);
      
      await new Promise(resolve => {
        socket.on('connect', resolve);
        socket.on('connect_error', resolve);
      });
    }

    const countWithConnections = await testApiEndpoint();
    console.log(`   Count with 5 connections: ${countWithConnections}`);

    // Disconnect all
    sockets.forEach(socket => socket.disconnect());
    await new Promise(resolve => setTimeout(resolve, 2000));

    const countAfterDisconnect = await testApiEndpoint();
    console.log(`   Count after disconnect: ${countAfterDisconnect}`);

    // Count should decrease significantly
    if (countAfterDisconnect < countWithConnections) {
      console.log('✅ Cleanup mechanism working');
      testResults.cleanupMechanism = true;
    } else {
      console.log('❌ Cleanup mechanism may not be working properly');
    }
    
  } catch (error) {
    console.log(`❌ Cleanup mechanism test failed: ${error.message}`);
  }
}

// Test 6: Rate Limiting
async function testRateLimiting() {
  console.log('\n⏱️ Test 6: Rate Limiting');
  
  try {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(fetch(API_URL));
    }

    const responses = await Promise.all(promises);
    const successfulResponses = responses.filter(r => r.ok);
    const rateLimitedResponses = responses.filter(r => r.status === 429);

    console.log(`   Successful requests: ${successfulResponses.length}/20`);
    console.log(`   Rate limited requests: ${rateLimitedResponses.length}/20`);

    if (successfulResponses.length >= 15) {
      console.log('✅ Rate limiting is appropriately configured');
    } else {
      console.log('❌ Rate limiting may be too restrictive');
    }
    
  } catch (error) {
    console.log(`❌ Rate limiting test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting comprehensive active users accuracy tests...\n');

  // Run all tests
  await testApiEndpoint();
  await testWebSocketConnection();
  await testMultipleConnections();
  await testSessionConsistency();
  await testCleanupMechanism();
  await testRateLimiting();

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;
  
  Object.entries(testResults).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Active users tracking is accurate.');
  } else {
    console.log('⚠️ Some tests failed. Check the issues above.');
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (!testResults.apiEndpoint) {
    console.log('- Check if backend is running on the correct port');
    console.log('- Verify the API endpoint is accessible');
  }
  if (!testResults.websocketConnection) {
    console.log('- Check WebSocket configuration in backend');
    console.log('- Verify CORS settings allow WebSocket connections');
  }
  if (!testResults.multipleConnections) {
    console.log('- Check for duplicate user tracking in backend');
    console.log('- Verify session handling is working correctly');
  }
  if (!testResults.cleanupMechanism) {
    console.log('- Check periodic cleanup mechanism in backend');
    console.log('- Verify disconnect handlers are working');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node test-active-users-accuracy.js [options]

Options:
  --help, -h          Show this help message
  BACKEND_URL=url     Set backend URL (default: http://localhost:3001)

Examples:
  node test-active-users-accuracy.js
  BACKEND_URL=https://your-backend.com node test-active-users-accuracy.js
`);
  process.exit(0);
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
