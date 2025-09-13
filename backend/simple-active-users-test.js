#!/usr/bin/env node

/**
 * Simple Active Users Test
 * Quick test to verify active users tracking is working
 */

const io = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3001';

console.log('🔍 Simple Active Users Test');
console.log('==========================');

async function testActiveUsers() {
  console.log('Creating WebSocket connection...');
  
  const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    timeout: 5000
  });

  return new Promise((resolve) => {
    socket.on('connect', async () => {
      console.log('✅ Connected to backend');
      
      // Test API endpoint
      try {
        const response = await fetch(`${BACKEND_URL}/api/active-users`);
        const data = await response.json();
        console.log(`✅ API response: ${data.count} active users`);
        console.log(`   Timestamp: ${data.timestamp}`);
        
        if (data.debug) {
          console.log(`   Debug: ${JSON.stringify(data.debug)}`);
        }
      } catch (error) {
        console.log(`❌ API test failed: ${error.message}`);
      }

      // Listen for updates
      socket.on('activeUsers:update', (data) => {
        console.log(`✅ Received update: ${data.count} active users`);
      });

      // Wait a bit then disconnect
      setTimeout(() => {
        console.log('Disconnecting...');
        socket.disconnect();
        resolve();
      }, 3000);
    });

    socket.on('connect_error', (error) => {
      console.log(`❌ Connection failed: ${error.message}`);
      resolve();
    });

    // Timeout
    setTimeout(() => {
      console.log('❌ Connection timeout');
      socket.disconnect();
      resolve();
    }, 10000);
  });
}

// Run the test
testActiveUsers().then(() => {
  console.log('\nTest completed!');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
