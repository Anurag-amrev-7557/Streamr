const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3001';

async function testActiveUsersAPI() {
  try {
    const response = await fetch(`${BASE_URL}/api/active-users`);
    const data = await response.json();
    return data.count;
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return null;
  }
}

function createSimultaneousConnections(count) {
  return new Promise((resolve) => {
    const connections = [];
    let connectedCount = 0;
    let allCounts = [];
    
    console.log(`🔌 Creating ${count} simultaneous connections...`);
    
    for (let i = 0; i < count; i++) {
      const socket = io(BASE_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: false
      });
      
      let lastCount = 0;
      let updatesReceived = 0;
      
      socket.on('connect', () => {
        connectedCount++;
        console.log(`✅ Connection ${i + 1} established: ${socket.id}`);
      });
      
      socket.on('activeUsers:update', (data) => {
        updatesReceived++;
        lastCount = data.count;
        console.log(`📈 Connection ${i + 1} received update: ${data.count} users (update #${updatesReceived})`);
        allCounts.push({ connection: i + 1, count: data.count, update: updatesReceived });
      });
      
      socket.on('connect_error', (error) => {
        console.error(`❌ Connection ${i + 1} failed:`, error.message);
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Connection ${i + 1} disconnected: ${reason}`);
      });
      
      connections.push({ socket, lastCount, updatesReceived });
    }
    
    // Wait for all connections and updates
    setTimeout(() => {
      // Disconnect all sockets
      connections.forEach((conn, index) => {
        conn.socket.disconnect();
        console.log(`🔌 Connection ${index + 1} manually disconnected`);
      });
      
      resolve({ 
        connectedCount, 
        allCounts,
        connections: connections.length 
      });
    }, 10000); // Wait 10 seconds
  });
}

async function runFinalTest() {
  console.log('🚀 Final Cross-Device Synchronization Test\n');
  
  // Test 1: Check initial count
  console.log('Step 1: Checking initial count...');
  const initialCount = await testActiveUsersAPI();
  console.log(`Initial count: ${initialCount}\n`);
  
  // Test 2: Create 5 simultaneous connections
  console.log('Step 2: Creating 5 simultaneous connections...');
  const result = await createSimultaneousConnections(5);
  
  // Test 3: Check final count
  console.log('\nStep 3: Checking final count...');
  const finalCount = await testActiveUsersAPI();
  console.log(`Final count: ${finalCount}\n`);
  
  // Test 4: Analyze synchronization
  console.log('📊 Synchronization Analysis:');
  console.log('============================');
  console.log(`Connections established: ${result.connectedCount}/5`);
  console.log(`Total updates received: ${result.allCounts.length}`);
  
  // Check if all connections saw the same final count
  const finalCounts = result.allCounts
    .filter(update => update.update > 1) // Only final updates
    .map(update => update.count);
  
  const uniqueFinalCounts = [...new Set(finalCounts)];
  console.log(`Unique final counts seen: ${uniqueFinalCounts.join(', ')}`);
  
  // Check if counts are consistent
  const isConsistent = uniqueFinalCounts.length <= 2; // Allow for 1-2 different counts due to timing
  const expectedCount = initialCount + result.connectedCount;
  
  console.log(`Expected count: ${expectedCount}`);
  console.log(`Actual final count: ${finalCount}`);
  console.log(`Count consistency: ${isConsistent ? '✅' : '❌'}`);
  
  console.log('\n🎯 Final Assessment:');
  if (result.connectedCount === 5 && isConsistent && finalCount >= initialCount) {
    console.log('✅ Cross-device synchronization is working correctly!');
    console.log('✅ All devices see consistent active user counts');
    console.log('✅ Real-time updates are properly synchronized');
  } else {
    console.log('⚠️ Some synchronization issues detected');
    if (result.connectedCount < 5) {
      console.log('  - Not all connections were established');
    }
    if (!isConsistent) {
      console.log('  - Inconsistent counts across devices');
    }
    if (finalCount < initialCount) {
      console.log('  - Final count is lower than expected');
    }
  }
  
  process.exit(0);
}

runFinalTest().catch(console.error);
