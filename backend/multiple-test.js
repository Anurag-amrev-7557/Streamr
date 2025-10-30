#!/usr/bin/env node

/**
 * Test multiple connections for session-based active user tracking
 */

const { io } = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3001';

console.log('🚀 Testing Multiple Connections');
console.log('===============================');

async function testMultipleConnections() {
  const connections = [];
  const maxConnections = 3;
  
  console.log(`Creating ${maxConnections} connections...`);
  
  // Create multiple connections
  for (let i = 1; i <= maxConnections; i++) {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000
    });
    
    connections.push(socket);
    
    socket.on('connect', () => {
      console.log(`✅ Connection ${i} connected: ${socket.id}`);
    });
    
    socket.on('activeUsers:update', (data) => {
      console.log(`📈 Connection ${i} received update: ${data.count} active users`);
    });
    
    socket.on('connect_error', (error) => {
      console.log(`❌ Connection ${i} failed: ${error.message}`);
    });
    
    // Wait between connections
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Wait for all connections to establish
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test API endpoint
  try {
    const response = await fetch(`${BACKEND_URL}/api/active-users`);
    const data = await response.json();
    console.log(`\n📡 API Response: ${data.count} active users`);
    
    if (data.debug) {
      console.log(`   Debug Info:`);
      console.log(`   - Total Connections: ${data.debug.totalConnections}`);
      console.log(`   - Active Users Set: ${data.debug.activeUsersSet}`);
      console.log(`   - Active Sessions Map: ${data.debug.activeSessionsMap}`);
      console.log(`   - Sample Users: ${data.debug.sampleUsers.join(', ')}`);
    }
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
  }
  
  // Disconnect all connections
  console.log('\n🔌 Disconnecting all connections...');
  connections.forEach((socket, index) => {
    socket.disconnect();
    console.log(`   Connection ${index + 1} disconnected`);
  });
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test final count
  try {
    const response = await fetch(`${BACKEND_URL}/api/active-users`);
    const data = await response.json();
    console.log(`\n📡 Final API Response: ${data.count} active users`);
  } catch (error) {
    console.log(`❌ Final API test failed: ${error.message}`);
  }
}

// Run the test
testMultipleConnections().then(() => {
  console.log('\n✅ Multiple connections test completed!');
  process.exit(0);
}).catch(console.error);
