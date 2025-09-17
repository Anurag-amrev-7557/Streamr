const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3001';

async function testActiveUsersAPI() {
  try {
    const response = await fetch(`${BASE_URL}/api/active-users`);
    const data = await response.json();
    console.log('📊 API Response:', data);
    return data.count;
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return null;
  }
}

function createSocketConnection(connectionId) {
  return new Promise((resolve) => {
    console.log(`🔌 Creating connection ${connectionId}...`);
    
    const socket = io(BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: false
    });

    socket.on('connect', () => {
      console.log(`✅ Connection ${connectionId} established:`, socket.id);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ Connection ${connectionId} failed:`, error.message);
      resolve(null);
    });

    socket.on('activeUsers:update', (data) => {
      console.log(`📈 Connection ${connectionId} received update:`, data);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!socket.connected) {
        console.log(`⏰ Connection ${connectionId} timed out`);
        resolve(null);
      }
    }, 5000);
  });
}

async function runTest() {
  console.log('🚀 Starting Active Users Test\n');
  
  // Test 1: Check initial count
  console.log('Step 1: Checking initial count...');
  const initialCount = await testActiveUsersAPI();
  
  // Test 2: Create first connection
  console.log('\nStep 2: Creating first connection...');
  const socket1 = await createSocketConnection(1);
  
  if (socket1) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const countAfter1 = await testActiveUsersAPI();
    console.log(`Count after 1 connection: ${countAfter1}`);
  }
  
  // Test 3: Create second connection
  console.log('\nStep 3: Creating second connection...');
  const socket2 = await createSocketConnection(2);
  
  if (socket2) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const countAfter2 = await testActiveUsersAPI();
    console.log(`Count after 2 connections: ${countAfter2}`);
  }
  
  // Test 4: Disconnect first connection
  console.log('\nStep 4: Disconnecting first connection...');
  if (socket1) {
    socket1.disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const countAfterDisconnect = await testActiveUsersAPI();
    console.log(`Count after disconnect: ${countAfterDisconnect}`);
  }
  
  // Test 5: Disconnect second connection
  console.log('\nStep 5: Disconnecting second connection...');
  if (socket2) {
    socket2.disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const finalCount = await testActiveUsersAPI();
    console.log(`Final count: ${finalCount}`);
  }
  
  console.log('\n✅ Test completed!');
  process.exit(0);
}

runTest().catch(console.error);
