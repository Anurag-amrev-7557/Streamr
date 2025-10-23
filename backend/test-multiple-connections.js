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

function createMultipleConnections(count) {
  return new Promise((resolve) => {
    const sockets = [];
    let connectedCount = 0;
    let updatesReceived = 0;
    
    console.log(`🔌 Creating ${count} connections...`);
    
    for (let i = 0; i < count; i++) {
      const socket = io(BASE_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: false
      });
      
      socket.on('connect', () => {
        connectedCount++;
        console.log(`✅ Connection ${i + 1} established: ${socket.id}`);
        
        if (connectedCount === count) {
          console.log(`🎉 All ${count} connections established!`);
        }
      });
      
      socket.on('activeUsers:update', (data) => {
        updatesReceived++;
        console.log(`📈 Connection ${i + 1} received update: ${data.count} users`);
      });
      
      socket.on('connect_error', (error) => {
        console.error(`❌ Connection ${i + 1} failed:`, error.message);
      });
      
      sockets.push(socket);
    }
    
    // Wait for all connections and updates
    setTimeout(() => {
      console.log(`\n📊 Results:`);
      console.log(`Connections established: ${connectedCount}/${count}`);
      console.log(`Updates received: ${updatesReceived}`);
      
      // Disconnect all sockets
      sockets.forEach((socket, index) => {
        socket.disconnect();
        console.log(`🔌 Connection ${index + 1} disconnected`);
      });
      
      resolve({ connectedCount, updatesReceived });
    }, 10000); // Wait 10 seconds
  });
}

async function runTest() {
  console.log('🚀 Testing Multiple Connections for Active Users\n');
  
  // Test 1: Check initial count
  console.log('Step 1: Checking initial count...');
  const initialCount = await testActiveUsersAPI();
  
  // Test 2: Create 3 connections
  console.log('\nStep 2: Creating 3 connections...');
  const result = await createMultipleConnections(3);
  
  // Test 3: Check final count
  console.log('\nStep 3: Checking final count...');
  const finalCount = await testActiveUsersAPI();
  
  console.log('\n🎯 Test Summary:');
  console.log(`Initial count: ${initialCount}`);
  console.log(`Final count: ${finalCount}`);
  console.log(`Connections established: ${result.connectedCount}/3`);
  console.log(`Updates received: ${result.updatesReceived}`);
  
  if (result.connectedCount === 3 && result.updatesReceived > 0) {
    console.log('✅ Active users tracking is working correctly!');
  } else {
    console.log('❌ Active users tracking has issues.');
  }
  
  process.exit(0);
}

runTest().catch(console.error);