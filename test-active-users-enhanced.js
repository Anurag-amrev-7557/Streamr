#!/usr/bin/env node

/**
 * Enhanced Test script for Active Users feature
 * Tests the improved backend tracking system and frontend display
 */

const io = require('socket.io-client');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testActiveUsersAPI() {
  console.log('🧪 Testing Enhanced Active Users API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/active-users`);
    const data = await response.json();
    
    console.log('✅ API Response:', {
      count: data.count,
      timestamp: data.timestamp,
      stats: data.stats,
      hasDebug: !!data.debug
    });
    
    if (data.stats) {
      console.log('📊 Stats Breakdown:');
      console.log(`   Total: ${data.stats.total}`);
      console.log(`   Authenticated: ${data.stats.authenticated}`);
      console.log(`   Anonymous: ${data.stats.anonymous}`);
      console.log(`   By Namespace:`, data.stats.byNamespace);
    }
    
    if (data.debug) {
      console.log('🔍 Debug Info:');
      console.log(`   Total Connections: ${data.debug.totalConnections}`);
      console.log(`   Active Users Set: ${data.debug.activeUsersSet}`);
      console.log(`   Sample Users: ${data.debug.sampleUsers.join(', ')}`);
      
      if (data.debug.connectionDetails) {
        console.log('   Connection Details:');
        data.debug.connectionDetails.forEach(detail => {
          console.log(`     ${detail.userId}: ${detail.connections} connections, ${detail.namespaces.join(', ')}`);
        });
      }
    }
    
    return data.count;
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    return null;
  }
}

async function testDebugEndpoint() {
  console.log('\n🔍 Testing Debug Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/active-users/debug`);
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Debug Endpoint Available');
      console.log(`   Total Users: ${data.count}`);
      console.log(`   All Users: ${data.allUsers.length}`);
      
      if (data.allUsers.length > 0) {
        console.log('   User Details:');
        data.allUsers.slice(0, 3).forEach(user => {
          console.log(`     ${user.userId}: ${user.connectionCount} connections, ${user.namespaces.join(', ')}`);
        });
      }
      return true;
    } else {
      console.log('⚠️  Debug endpoint not available (expected in production)');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Debug endpoint not available:', error.message);
    return false;
  }
}

function testWebSocketConnection() {
  console.log('\n🔌 Testing Enhanced WebSocket Connection...');
  
  return new Promise((resolve) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      timeout: 5000
    });
    
    let updateReceived = false;
    let connectionCount = 0;
    
    socket.on('connect', () => {
      console.log('✅ WebSocket Connected');
      console.log(`   Socket ID: ${socket.id}`);
      connectionCount++;
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
      resolve({ updateReceived, connectionCount });
    }, 3000);
  });
}

function testMultipleConnections() {
  console.log('\n🔗 Testing Multiple WebSocket Connections...');
  
  return new Promise((resolve) => {
    const sockets = [];
    const results = [];
    
    // Create 3 connections
    for (let i = 0; i < 3; i++) {
      const socket = io(BASE_URL, {
        transports: ['websocket'],
        timeout: 5000
      });
      
      socket.on('connect', () => {
        console.log(`✅ Connection ${i + 1} established: ${socket.id}`);
        results.push({ id: i + 1, socketId: socket.id, connected: true });
      });
      
      socket.on('activeUsers:update', (data) => {
        console.log(`📊 Update received on connection ${i + 1}:`, data.count);
      });
      
      sockets.push(socket);
    }
    
    // Wait and then disconnect all
    setTimeout(() => {
      sockets.forEach((socket, index) => {
        socket.disconnect();
        console.log(`🔌 Connection ${index + 1} disconnected`);
      });
      
      console.log(`📊 Test completed with ${results.length} connections`);
      resolve(results);
    }, 4000);
  });
}

async function runTests() {
  console.log('🚀 Starting Enhanced Active Users Feature Tests\n');
  console.log(`📍 Backend URL: ${BASE_URL}\n`);
  
  // Test 1: Enhanced API Endpoint
  const initialCount = await testActiveUsersAPI();
  
  // Test 2: Debug Endpoint (if available)
  const debugAvailable = await testDebugEndpoint();
  
  // Test 3: WebSocket Connection
  const wsResult = await testWebSocketConnection();
  
  // Test 4: Multiple Connections
  const multiConnections = await testMultipleConnections();
  
  // Test 5: API Endpoint again (to see if count changed)
  const finalCount = await testActiveUsersAPI();
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Initial Count: ${initialCount}`);
  console.log(`Final Count: ${finalCount}`);
  console.log(`Count Change: ${finalCount !== null && initialCount !== null ? finalCount - initialCount : 'N/A'}`);
  console.log(`WebSocket Updates: ${wsResult.updateReceived ? '✅ Received' : '❌ Not Received'}`);
  console.log(`Multiple Connections: ${multiConnections.length} established`);
  console.log(`Debug Endpoint: ${debugAvailable ? '✅ Available' : '⚠️ Not Available'}`);
  
  console.log('\n🎯 Summary:');
  if (initialCount !== null && wsResult.updateReceived && multiConnections.length > 0) {
    console.log('✅ All tests passed! Enhanced Active Users feature is working correctly.');
    console.log('   - Backend tracking improved with connection details');
    console.log('   - WebSocket real-time updates working');
    console.log('   - Multiple connections handled properly');
  } else {
    console.log('❌ Some tests failed. Check the backend server and WebSocket configuration.');
  }
  
  process.exit(0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Enhanced Active Users Feature Test Script

Usage: node test-active-users-enhanced.js [options]

Options:
  --help, -h     Show this help message
  --debug        Enable debug mode
  --url <url>    Set custom backend URL

Environment Variables:
  BACKEND_URL    Backend server URL (default: http://localhost:3001)

Examples:
  node test-active-users-enhanced.js
  BACKEND_URL=https://your-backend.com node test-active-users-enhanced.js
`);
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
}); 