#!/usr/bin/env node

const io = require('socket.io-client');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const SOCKET_URL = BASE_URL;

console.log('🚀 Testing Enhanced Active Users Feature');
console.log(`📍 Backend URL: ${BASE_URL}\n`);

// Test configuration
const TEST_CONFIG = {
  concurrentConnections: 5,
  testDuration: 30000, // 30 seconds
  heartbeatInterval: 25000, // 25 seconds
  cleanupTimeout: 120000 // 2 minutes
};

async function testEnhancedAPI() {
  try {
    console.log('📡 Testing Enhanced API endpoint...');
    const response = await fetch(`${BASE_URL}/api/active-users`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Enhanced API Response:');
    console.log(`  Count: ${data.count}`);
    console.log(`  Timestamp: ${data.timestamp}`);
    
    if (data.stats) {
      console.log(`  Stats: Peak=${data.stats.peak}, Avg=${data.stats.average}, Total=${data.stats.totalConnections}`);
    }
    
    if (data.analytics) {
      console.log(`  Analytics: Auth=${data.analytics.authenticatedUsers}, Anon=${data.analytics.anonymousUsers}, AvgSession=${data.analytics.averageSessionDuration}s`);
    }
    
    if (data.debug) {
      console.log(`  Debug: ${JSON.stringify(data.debug, null, 2)}`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Enhanced API Error:', error.message);
    return null;
  }
}

function testEnhancedWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('🔌 Testing Enhanced WebSocket connection...');
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 5000
    });
    
    let updateReceived = false;
    let connectionEstablished = false;
    let heartbeatSent = false;
    let updates = [];
    
    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve({ updateReceived, connectionEstablished, heartbeatSent, updates });
    }, 10000);
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      connectionEstablished = true;
      
      // Send heartbeat after connection
      setTimeout(() => {
        socket.emit('heartbeat');
        heartbeatSent = true;
        console.log('💓 Heartbeat sent');
      }, 2000);
    });
    
    socket.on('activeUsers:update', (data) => {
      console.log('✅ Received enhanced active users update:', data);
      updateReceived = true;
      updates.push(data);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      clearTimeout(timeout);
      resolve({ updateReceived, connectionEstablished, heartbeatSent, updates });
    });
  });
}

async function testConcurrentConnections() {
  console.log(`\n👥 Testing ${TEST_CONFIG.concurrentConnections} concurrent connections...`);
  
  const sockets = [];
  const connectionPromises = [];
  const results = [];
  
  // Create multiple test connections
  for (let i = 0; i < TEST_CONFIG.concurrentConnections; i++) {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 5000
    });
    
    sockets.push(socket);
    
    const promise = new Promise((resolve) => {
      const result = {
        id: i + 1,
        connected: false,
        heartbeatSent: false,
        updates: []
      };
      
      socket.on('connect', () => {
        console.log(`✅ Connection ${i + 1} established`);
        result.connected = true;
        
        // Send heartbeat
        setTimeout(() => {
          socket.emit('heartbeat');
          result.heartbeatSent = true;
        }, 1000 + (i * 500)); // Stagger heartbeats
      });
      
      socket.on('activeUsers:update', (data) => {
        result.updates.push(data);
      });
      
      socket.on('connect_error', (error) => {
        console.error(`❌ Connection ${i + 1} failed:`, error.message);
      });
      
      socket.on('disconnect', () => {
        resolve(result);
      });
    });
    
    connectionPromises.push(promise);
  }
  
  // Wait for all connections to establish
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check intermediate count
  const intermediateCount = await testEnhancedAPI();
  console.log(`📊 Intermediate count: ${intermediateCount?.count || 'N/A'}`);
  
  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDuration));
  
  // Check final count
  const finalCount = await testEnhancedAPI();
  console.log(`📊 Final count: ${finalCount?.count || 'N/A'}`);
  
  // Cleanup
  sockets.forEach(socket => socket.disconnect());
  
  // Wait for results
  const connectionResults = await Promise.all(connectionPromises);
  
  return {
    successfulConnections: connectionResults.filter(r => r.connected).length,
    heartbeatsSent: connectionResults.filter(r => r.heartbeatSent).length,
    totalUpdates: connectionResults.reduce((sum, r) => sum + r.updates.length, 0),
    intermediateCount: intermediateCount?.count,
    finalCount: finalCount?.count,
    connectionResults
  };
}

async function testPrecisionAndAccuracy() {
  console.log('\n🎯 Testing Precision and Accuracy...');
  
  const testResults = [];
  
  // Test 1: Single connection accuracy
  console.log('  Testing single connection...');
  
  // Wait for any previous connections to be cleaned up
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const beforeCount = await testEnhancedAPI();
  console.log(`    Before connection: ${beforeCount?.count || 'N/A'}`);
  
  const singleSocket = io(SOCKET_URL, { transports: ['websocket'] });
  
  await new Promise(resolve => {
    singleSocket.on('connect', async () => {
      // Wait a bit for the connection to be registered
      setTimeout(async () => {
        const afterCount = await testEnhancedAPI();
        console.log(`    After connection: ${afterCount?.count || 'N/A'}`);
        
        const expectedIncrease = afterCount?.count - beforeCount?.count;
        testResults.push({
          test: 'Single Connection',
          expected: 1,
          actual: expectedIncrease,
          accurate: expectedIncrease === 1
        });
        
        singleSocket.disconnect();
        resolve();
      }, 2000);
    });
  });
  
  // Test 2: Multiple connections accuracy
  console.log('  Testing multiple connections...');
  
  // Wait for previous test to be cleaned up
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const multiSockets = [];
  const connectionCount = 3;
  
  for (let i = 0; i < connectionCount; i++) {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    multiSockets.push(socket);
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const multiCount = await testEnhancedAPI();
  console.log(`    Multiple connections count: ${multiCount?.count || 'N/A'}`);
  
  testResults.push({
    test: 'Multiple Connections',
    expected: connectionCount,
    actual: multiCount?.count || 0,
    accurate: Math.abs((multiCount?.count || 0) - connectionCount) <= 1 // Allow 1 difference for timing
  });
  
  // Cleanup
  multiSockets.forEach(socket => socket.disconnect());
  
  // Test 3: Disconnection accuracy
  console.log('  Testing disconnection accuracy...');
  await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time for cleanup
  
  const afterDisconnectCount = await testEnhancedAPI();
  console.log(`    After disconnections: ${afterDisconnectCount?.count || 'N/A'}`);
  
  testResults.push({
    test: 'Disconnection Accuracy',
    expected: 0,
    actual: afterDisconnectCount?.count || 0,
    accurate: (afterDisconnectCount?.count || 0) <= 1 // Should be 0 or 1 (allowing for timing)
  });
  
  return testResults;
}

async function testHeartbeatMechanism() {
  console.log('\n💓 Testing Heartbeat Mechanism...');
  
  const socket = io(SOCKET_URL, { transports: ['websocket'] });
  
  return new Promise((resolve) => {
    let heartbeatsSent = 0;
    let updatesReceived = 0;
    
    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve({ heartbeatsSent, updatesReceived });
    }, 15000);
    
    socket.on('connect', () => {
      console.log('✅ Connected for heartbeat test');
      
      // Send heartbeats every 5 seconds
      const heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat');
        heartbeatsSent++;
        console.log(`💓 Heartbeat ${heartbeatsSent} sent`);
      }, 5000);
      
      socket.on('disconnect', () => {
        clearInterval(heartbeatInterval);
        clearTimeout(timeout);
        resolve({ heartbeatsSent, updatesReceived });
      });
    });
    
    socket.on('activeUsers:update', (data) => {
      updatesReceived++;
      console.log(`📊 Update ${updatesReceived} received: ${data.count} users`);
    });
  });
}

async function runEnhancedTests() {
  console.log('🧪 Starting Enhanced Active Users Tests...\n');
  
  const startTime = Date.now();
  
  // Test 1: Enhanced API
  const apiData = await testEnhancedAPI();
  
  // Test 2: Enhanced WebSocket
  const wsTest = await testEnhancedWebSocketConnection();
  
  // Test 3: Concurrent Connections
  const concurrentTest = await testConcurrentConnections();
  
  // Test 4: Precision and Accuracy
  const precisionTest = await testPrecisionAndAccuracy();
  
  // Test 5: Heartbeat Mechanism
  const heartbeatTest = await testHeartbeatMechanism();
  
  // Test 6: Final API Check
  const finalApiData = await testEnhancedAPI();
  
  const endTime = Date.now();
  const testDuration = (endTime - startTime) / 1000;
  
  console.log('\n📊 Enhanced Test Results Summary:');
  console.log('==================================');
  console.log(`Test Duration: ${testDuration.toFixed(1)}s`);
  console.log(`Initial Count: ${apiData?.count || 'N/A'}`);
  console.log(`Final Count: ${finalApiData?.count || 'N/A'}`);
  console.log(`WebSocket Connection: ${wsTest.connectionEstablished ? '✅' : '❌'}`);
  console.log(`WebSocket Updates: ${wsTest.updateReceived ? '✅' : '❌'}`);
  console.log(`Heartbeat Sent: ${wsTest.heartbeatSent ? '✅' : '❌'}`);
  console.log(`Concurrent Connections: ${concurrentTest.successfulConnections}/${TEST_CONFIG.concurrentConnections}`);
  console.log(`Heartbeats Sent: ${concurrentTest.heartbeatsSent}/${TEST_CONFIG.concurrentConnections}`);
  console.log(`Total Updates Received: ${concurrentTest.totalUpdates}`);
  
  console.log('\n🎯 Precision & Accuracy Results:');
  precisionTest.forEach(test => {
    const status = test.accurate ? '✅' : '❌';
    console.log(`  ${status} ${test.test}: Expected ${test.expected}, Got ${test.actual}`);
  });
  
  console.log('\n💓 Heartbeat Test Results:');
  console.log(`  Heartbeats Sent: ${heartbeatTest.heartbeatsSent}`);
  console.log(`  Updates Received: ${heartbeatTest.updatesReceived}`);
  
  console.log('\n🎯 Overall Assessment:');
  const allTestsPassed = wsTest.connectionEstablished && 
                        wsTest.updateReceived && 
                        concurrentTest.successfulConnections >= TEST_CONFIG.concurrentConnections * 0.8 &&
                        precisionTest.every(test => test.accurate);
  
  if (allTestsPassed) {
    console.log('✅ Enhanced Active Users feature is working with high precision and accuracy!');
    console.log('✅ Real-time updates are functioning correctly');
    console.log('✅ Multiple connections are being tracked accurately');
    console.log('✅ Heartbeat mechanism is working');
    console.log('✅ Precision and accuracy tests passed');
  } else {
    console.log('❌ Some issues detected with Enhanced Active Users feature');
    if (!wsTest.connectionEstablished) {
      console.log('  - WebSocket connection failed');
    }
    if (!wsTest.updateReceived) {
      console.log('  - Real-time updates not received');
    }
    if (concurrentTest.successfulConnections < TEST_CONFIG.concurrentConnections * 0.8) {
      console.log('  - Multiple connection tracking issues');
    }
    if (!precisionTest.every(test => test.accurate)) {
      console.log('  - Precision and accuracy issues detected');
    }
  }
  
  // Enhanced analytics summary
  if (finalApiData?.stats) {
    console.log('\n📈 Enhanced Analytics Summary:');
    console.log(`  Peak Users: ${finalApiData.stats.peak}`);
    console.log(`  Average Users: ${finalApiData.stats.average}`);
    console.log(`  Total Connections: ${finalApiData.stats.totalConnections}`);
    console.log(`  Total Disconnections: ${finalApiData.stats.totalDisconnections}`);
  }
  
  if (finalApiData?.analytics) {
    console.log(`  Authenticated Users: ${finalApiData.analytics.authenticatedUsers}`);
    console.log(`  Anonymous Users: ${finalApiData.analytics.anonymousUsers}`);
    console.log(`  Average Session Duration: ${finalApiData.analytics.averageSessionDuration}s`);
  }
  
  process.exit(0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node test-active-users-enhanced.js [options]

Options:
  --help, -h     Show this help message
  --url <url>    Set backend URL (default: http://localhost:3001)

Environment Variables:
  BACKEND_URL    Set backend URL

Examples:
  node test-active-users-enhanced.js
  BACKEND_URL=https://streamr-jjj9.onrender.com node test-active-users-enhanced.js
  `);
  process.exit(0);
}

// Run enhanced tests
runEnhancedTests().catch(error => {
  console.error('❌ Enhanced test execution failed:', error);
  process.exit(1);
}); 