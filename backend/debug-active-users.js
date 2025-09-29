#!/usr/bin/env node

/**
 * Debug Active Users Count
 * Helps diagnose why the count might be showing incorrectly
 */

const io = require('socket.io-client');
const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_URL = `${BACKEND_URL}/api/active-users`;

console.log('🔍 Debug Active Users Count');
console.log('==========================');

async function debugActiveUsers() {
  console.log(`Testing against: ${BACKEND_URL}\n`);

  // Test 1: Check API endpoint
  console.log('1. Checking API endpoint...');
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    console.log(`✅ API Response: ${data.count} users`);
    console.log(`   Stats: ${data.stats.total} total, ${data.stats.authenticated} auth, ${data.stats.anonymous} anon`);
    if (data.debug) {
      console.log(`   Debug: ${JSON.stringify(data.debug, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ API Error: ${error.message}`);
  }

  // Test 2: Check WebSocket connection
  console.log('\n2. Testing WebSocket connection...');
  const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    timeout: 5000
  });

  return new Promise((resolve) => {
    socket.on('connect', async () => {
      console.log('✅ WebSocket connected');
      
      // Check API again after connection
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        console.log(`✅ After WebSocket connection: ${data.count} users`);
      } catch (error) {
        console.log(`❌ API Error after connection: ${error.message}`);
      }
    });

    socket.on('activeUsers:update', (data) => {
      console.log(`✅ WebSocket update received: ${data.count} users`);
      console.log(`   Timestamp: ${data.timestamp}`);
      if (data.serverTime) {
        console.log(`   Server time: ${new Date(data.serverTime).toISOString()}`);
      }
    });

    socket.on('connect_error', (error) => {
      console.log(`❌ WebSocket connection error: ${error.message}`);
    });

    // Test 3: Create multiple connections
    console.log('\n3. Testing multiple connections...');
    setTimeout(async () => {
      const sockets = [];
      
      // Create 3 additional connections
      for (let i = 0; i < 3; i++) {
        const newSocket = io(BACKEND_URL, {
          transports: ['websocket'],
          timeout: 5000
        });
        sockets.push(newSocket);
        
        newSocket.on('connect', () => {
          console.log(`✅ Additional connection ${i + 1} established`);
        });
        
        newSocket.on('activeUsers:update', (data) => {
          console.log(`✅ Update on connection ${i + 1}: ${data.count} users`);
        });
      }

      // Wait for all connections
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check final count
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        console.log(`✅ Final count with 4 connections: ${data.count} users`);
        console.log(`   Expected: 4, Got: ${data.count}`);
        
        if (data.count === 4) {
          console.log('✅ Count is accurate!');
        } else if (data.count < 4) {
          console.log('❌ Count is too low - possible cleanup issue');
        } else {
          console.log('❌ Count is too high - possible duplicate tracking');
        }
      } catch (error) {
        console.log(`❌ Final API check failed: ${error.message}`);
      }

      // Clean up
      socket.disconnect();
      sockets.forEach(s => s.disconnect());
      
      console.log('\n📊 Debug Summary:');
      console.log('=================');
      console.log('If you see "1" in the frontend but API shows different:');
      console.log('- Check browser console for WebSocket errors');
      console.log('- Check if frontend is using cached data');
      console.log('- Verify WebSocket connection is working');
      console.log('- Check if there are multiple frontend instances');
      
      resolve();
    }, 2000);
  });
}

// Run the debug
debugActiveUsers().catch(error => {
  console.error('Debug failed:', error);
  process.exit(1);
});
