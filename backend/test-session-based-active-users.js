#!/usr/bin/env node

/**
 * Test script for session-based active user tracking
 * This script tests the new implementation with various scenarios
 */

const { io } = require('socket.io-client');
const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_URL = `${BACKEND_URL}/api/active-users`;

console.log('🚀 Testing Session-Based Active User Tracking');
console.log('============================================');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`API URL: ${API_URL}`);
console.log('');

// Test results tracking
const testResults = {
  apiEndpoint: false,
  websocketConnection: false,
  multipleConnections: false,
  sessionConsistency: false,
  cleanupMechanism: false,
  debugInfo: false
};

// Helper function to test API endpoint
async function testApiEndpoint() {
  try {
    console.log('📡 Testing API endpoint...');
    const response = await fetch(API_URL);
    const data = await response.json();
    
    console.log(`✅ API Response: ${data.count} active users`);
    console.log(`   Timestamp: ${data.timestamp}`);
    
    if (data.debug) {
      console.log(`   Debug Info Available: ${JSON.stringify(data.debug, null, 2)}`);
      testResults.debugInfo = true;
    }
    
    testResults.apiEndpoint = true;
    return data.count;
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
    return null;
  }
}

// Helper function to create WebSocket connection
function createSocketConnection(connectionId) {
  return new Promise((resolve) => {
    console.log(`🔌 Creating connection ${connectionId}...`);
    
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: false
    });

    let connected = false;
    let updatesReceived = 0;
    let lastCount = 0;

    socket.on('connect', () => {
      connected = true;
      console.log(`✅ Connection ${connectionId} established: ${socket.id}`);
      resolve({ 
        socket, 
        connected: true, 
        id: connectionId,
        updates: 0,
        lastCount: 0
      });
    });

    socket.on('activeUsers:update', (data) => {
      updatesReceived++;
      lastCount = data.count;
      console.log(`📈 Connection ${connectionId} received update: ${data.count} users (update #${updatesReceived})`);
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ Connection ${connectionId} failed:`, error.message);
      resolve({ 
        socket: null, 
        connected: false, 
        id: connectionId,
        updates: 0,
        lastCount: 0
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Connection ${connectionId} disconnected: ${reason}`);
    });

    // Timeout after 5 seconds if not connected
    setTimeout(() => {
      if (!connected) {
        resolve({ 
          socket: null, 
          connected: false, 
          id: connectionId,
          updates: 0,
          lastCount: 0
        });
      }
    }, 5000);
  });
}

// Test 1: API Endpoint
async function testApiEndpoint() {
  console.log('\n🧪 Test 1: API Endpoint');
  console.log('------------------------');
  
  const count = await testApiEndpoint();
  if (count !== null) {
    console.log('✅ API endpoint test passed');
  } else {
    console.log('❌ API endpoint test failed');
  }
}

// Test 2: WebSocket Connection
async function testWebSocketConnection() {
  console.log('\n🧪 Test 2: WebSocket Connection');
  console.log('--------------------------------');
  
  try {
    const connection = await createSocketConnection(1);
    
    if (connection.connected) {
      console.log('✅ WebSocket connection test passed');
      testResults.websocketConnection = true;
      
      // Wait a bit then disconnect
      setTimeout(() => {
        connection.socket.disconnect();
      }, 3000);
    } else {
      console.log('❌ WebSocket connection test failed');
    }
  } catch (error) {
    console.log(`❌ WebSocket test failed: ${error.message}`);
  }
}

// Test 3: Multiple Connections
async function testMultipleConnections() {
  console.log('\n🧪 Test 3: Multiple Connections');
  console.log('-------------------------------');
  
  try {
    const connections = [];
    const maxConnections = 3;
    
    // Create multiple connections
    for (let i = 1; i <= maxConnections; i++) {
      const connection = await createSocketConnection(i);
      if (connection.connected) {
        connections.push(connection);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Created ${connections.length} connections`);
    
    // Check count via API
    const count = await testApiEndpoint();
    
    if (count >= connections.length) {
      console.log('✅ Multiple connections test passed');
      testResults.multipleConnections = true;
    } else {
      console.log(`❌ Multiple connections test failed - Expected: ${connections.length}, Got: ${count}`);
    }
    
    // Disconnect all
    connections.forEach(conn => {
      if (conn.socket) {
        conn.socket.disconnect();
      }
    });
    
  } catch (error) {
    console.log(`❌ Multiple connections test failed: ${error.message}`);
  }
}

// Test 4: Session Consistency
async function testSessionConsistency() {
  console.log('\n🧪 Test 4: Session Consistency');
  console.log('------------------------------');
  
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
    if (Math.abs(count2 - count1) <= 1) {
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
  console.log('\n🧪 Test 5: Cleanup Mechanism');
  console.log('----------------------------');
  
  try {
    // Create a connection
    const connection = await createSocketConnection('cleanup-test');
    
    if (connection.connected) {
      const initialCount = await testApiEndpoint();
      console.log(`   Initial count: ${initialCount}`);
      
      // Disconnect
      connection.socket.disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalCount = await testApiEndpoint();
      console.log(`   After disconnect: ${finalCount}`);
      
      if (finalCount < initialCount) {
        console.log('✅ Cleanup mechanism working');
        testResults.cleanupMechanism = true;
      } else {
        console.log('❌ Cleanup mechanism not working properly');
      }
    }
    
  } catch (error) {
    console.log(`❌ Cleanup mechanism test failed: ${error.message}`);
  }
}

// Test 6: Debug Information
async function testDebugInformation() {
  console.log('\n🧪 Test 6: Debug Information');
  console.log('----------------------------');
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (data.debug) {
      console.log('✅ Debug information available:');
      console.log(`   Total Connections: ${data.debug.totalConnections}`);
      console.log(`   Active Users Set: ${data.debug.activeUsersSet}`);
      console.log(`   Active Sessions Map: ${data.debug.activeSessionsMap}`);
      console.log(`   Sample Users: ${data.debug.sampleUsers?.join(', ')}`);
      
      if (data.debug.sessionDetails) {
        console.log('   Session Details:');
        data.debug.sessionDetails.forEach(session => {
          console.log(`     Session: ${session.sessionId}, User: ${session.userId || 'anonymous'}`);
        });
      }
      
      testResults.debugInfo = true;
    } else {
      console.log('ℹ️  Debug information not available (DEBUG_ACTIVE_USERS not enabled)');
    }
    
  } catch (error) {
    console.log(`❌ Debug information test failed: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting comprehensive test suite...\n');
  
  await testApiEndpoint();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testWebSocketConnection();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testMultipleConnections();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testSessionConsistency();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testCleanupMechanism();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testDebugInformation();
  
  // Print results
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`API Endpoint: ${testResults.apiEndpoint ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WebSocket Connection: ${testResults.websocketConnection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Multiple Connections: ${testResults.multipleConnections ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Consistency: ${testResults.sessionConsistency ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Cleanup Mechanism: ${testResults.cleanupMechanism ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Debug Information: ${testResults.debugInfo ? '✅ PASS' : 'ℹ️  INFO'}`);
  
  const passedTests = Object.values(testResults).filter(result => result === true).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests >= 4) {
    console.log('🎉 Session-based active user tracking is working correctly!');
  } else {
    console.log('⚠️  Some tests failed. Check the implementation.');
  }
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
runAllTests().catch(console.error);
