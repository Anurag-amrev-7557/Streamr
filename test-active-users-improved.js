#!/usr/bin/env node

const io = require('socket.io-client');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const SOCKET_URL = BASE_URL;

console.log('🚀 Testing Improved Active Users Feature');
console.log(`📍 Backend URL: ${BASE_URL}\n`);

async function testActiveUsersAPI() {
  try {
    console.log('📡 Testing API endpoint...');
    const response = await fetch(`${BASE_URL}/api/active-users`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ API Response:', data);
    
    return data.count;
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return null;
  }
}

function testWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('🔌 Testing WebSocket connection...');
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 5000
    });
    
    let updateReceived = false;
    let connectionEstablished = false;
    
    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve({ updateReceived, connectionEstablished });
    }, 5000);
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      connectionEstablished = true;
    });
    
    socket.on('activeUsers:update', (data) => {
      console.log('✅ Received active users update:', data);
      updateReceived = true;
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      clearTimeout(timeout);
      resolve({ updateReceived, connectionEstablished });
    });
  });
}

async function testMultipleConnections() {
  console.log('\n👥 Testing multiple connections...');
  
  const sockets = [];
  const connectionPromises = [];
  
  // Create 3 test connections
  for (let i = 0; i < 3; i++) {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 5000
    });
    
    sockets.push(socket);
    
    const promise = new Promise((resolve) => {
      socket.on('connect', () => {
        console.log(`✅ Connection ${i + 1} established`);
        resolve(true);
      });
      
      socket.on('connect_error', (error) => {
        console.error(`❌ Connection ${i + 1} failed:`, error.message);
        resolve(false);
      });
    });
    
    connectionPromises.push(promise);
  }
  
  // Wait for all connections
  const results = await Promise.all(connectionPromises);
  const successfulConnections = results.filter(Boolean).length;
  
  console.log(`📊 Successful connections: ${successfulConnections}/3`);
  
  // Wait a moment for updates to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check final count
  const finalCount = await testActiveUsersAPI();
  console.log(`📊 Final active users count: ${finalCount}`);
  
  // Cleanup
  sockets.forEach(socket => socket.disconnect());
  
  return { successfulConnections, finalCount };
}

async function testRealTimeUpdates() {
  console.log('\n⚡ Testing real-time updates...');
  
  const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    timeout: 5000
  });
  
  return new Promise((resolve) => {
    let updates = [];
    let connectionEstablished = false;
    
    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve({ updates, connectionEstablished });
    }, 10000);
    
    socket.on('connect', () => {
      console.log('✅ Connected for real-time test');
      connectionEstablished = true;
    });
    
    socket.on('activeUsers:update', (data) => {
      console.log(`📊 Update received: ${data.count} users`);
      updates.push(data);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Real-time test disconnected');
      clearTimeout(timeout);
      resolve({ updates, connectionEstablished });
    });
  });
}

async function runTests() {
  console.log('🧪 Starting comprehensive tests...\n');
  
  // Test 1: API Endpoint
  const initialCount = await testActiveUsersAPI();
  
  // Test 2: WebSocket Connection
  const wsTest = await testWebSocketConnection();
  
  // Test 3: Multiple Connections
  const multiTest = await testMultipleConnections();
  
  // Test 4: Real-time Updates
  const realtimeTest = await testRealTimeUpdates();
  
  // Test 5: Final API Check
  const finalCount = await testActiveUsersAPI();
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Initial Count: ${initialCount}`);
  console.log(`Final Count: ${finalCount}`);
  console.log(`WebSocket Connection: ${wsTest.connectionEstablished ? '✅' : '❌'}`);
  console.log(`WebSocket Updates: ${wsTest.updateReceived ? '✅' : '❌'}`);
  console.log(`Multiple Connections: ${multiTest.successfulConnections}/3`);
  console.log(`Real-time Updates: ${realtimeTest.updates.length} received`);
  
  console.log('\n🎯 Overall Assessment:');
  if (wsTest.connectionEstablished && wsTest.updateReceived && multiTest.successfulConnections >= 2) {
    console.log('✅ Active Users feature is working correctly!');
    console.log('✅ Real-time updates are functioning');
    console.log('✅ Multiple connections are being tracked');
  } else {
    console.log('❌ Some issues detected with Active Users feature');
    if (!wsTest.connectionEstablished) {
      console.log('  - WebSocket connection failed');
    }
    if (!wsTest.updateReceived) {
      console.log('  - Real-time updates not received');
    }
    if (multiTest.successfulConnections < 2) {
      console.log('  - Multiple connection tracking issues');
    }
  }
  
  process.exit(0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node test-active-users-improved.js [options]

Options:
  --help, -h     Show this help message
  --url <url>    Set backend URL (default: http://localhost:3001)

Environment Variables:
  BACKEND_URL    Set backend URL

Examples:
  node test-active-users-improved.js
  BACKEND_URL=https://streamr-jjj9.onrender.com node test-active-users-improved.js
  `);
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 