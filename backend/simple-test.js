#!/usr/bin/env node

/**
 * Simple test for session-based active user tracking
 */

const { io } = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3001';

console.log('🚀 Testing Session-Based Active User Tracking');
console.log('============================================');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log('');

async function testActiveUsers() {
  console.log('📡 Testing API endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/active-users`);
    const data = await response.json();
    
    console.log(`✅ API Response: ${data.count} active users`);
    console.log(`   Timestamp: ${data.timestamp}`);
    
    if (data.debug) {
      console.log(`   Debug Info: ${data.debug.totalConnections} connections, ${data.debug.activeUsersSet} users`);
    }
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
    return;
  }
  
  console.log('\n🔌 Testing WebSocket connection...');
  
  const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    timeout: 5000
  });
  
  return new Promise((resolve) => {
    socket.on('connect', async () => {
      console.log(`✅ Connected: ${socket.id}`);
      
      // Test API again after connection
      setTimeout(async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/active-users`);
          const data = await response.json();
          console.log(`📈 After connection: ${data.count} active users`);
        } catch (error) {
          console.log(`❌ API test failed: ${error.message}`);
        }
      }, 1000);
      
      // Listen for updates
      socket.on('activeUsers:update', (data) => {
        console.log(`📈 Received update: ${data.count} active users`);
      });
      
      // Disconnect after 3 seconds
      setTimeout(() => {
        console.log('🔌 Disconnecting...');
        socket.disconnect();
        resolve();
      }, 3000);
    });
    
    socket.on('connect_error', (error) => {
      console.log(`❌ Connection failed: ${error.message}`);
      resolve();
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Disconnected: ${reason}`);
    });
  });
}

// Run the test
testActiveUsers().then(() => {
  console.log('\n✅ Test completed!');
  process.exit(0);
}).catch(console.error);
