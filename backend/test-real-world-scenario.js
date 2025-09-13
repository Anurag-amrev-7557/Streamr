const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3001';

async function getActiveUsersCount() {
  try {
    const response = await fetch(`${BASE_URL}/api/active-users`);
    const data = await response.json();
    return {
      count: data.count,
      total: data.stats.total,
      connections: data.debug.totalConnections,
      mapSize: data.debug.activeUsersMap
    };
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return null;
  }
}

function createPersistentConnection(connectionId) {
  return new Promise((resolve) => {
    console.log(`🔌 Creating persistent connection ${connectionId}...`);
    
    const socket = io(BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true, // Enable reconnection
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    let connected = false;
    let updatesReceived = 0;
    let lastCount = 0;

    socket.on('connect', () => {
      connected = true;
      console.log(`✅ Connection ${connectionId} established: ${socket.id}`);
      resolve({ 
        socket, 
        connected: true, 
        id: connectionId,
        updates: 0,
        lastCount: 0
      });
    });

    socket.on('activeUsers:update', (data) => {
      updatesReceived++;
      lastCount = data.count;
      console.log(`📈 Connection ${connectionId} received update: ${data.count} users (update #${updatesReceived})`);
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ Connection ${connectionId} failed:`, error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Connection ${connectionId} disconnected: ${reason}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Connection ${connectionId} reconnected (attempt ${attemptNumber})`);
    });

    // Timeout after 5 seconds if not connected
    setTimeout(() => {
      if (!connected) {
        resolve({ 
          socket: null, 
          connected: false, 
          id: connectionId,
          updates: 0,
          lastCount: 0
        });
      }
    }, 5000);
  });
}

async function runRealWorldTest() {
  console.log('🚀 Testing Real-World Scenario (Persistent Connections)\n');
  
  const connections = [];
  const maxConnections = 5;
  
  // Step 1: Check initial count
  console.log('Step 1: Checking initial count...');
  let initialCount = await getActiveUsersCount();
  console.log(`Initial: Count=${initialCount.count}, Total=${initialCount.total}, Connections=${initialCount.connections}, MapSize=${initialCount.mapSize}\n`);
  
  // Step 2: Create persistent connections
  console.log('Step 2: Creating persistent connections...');
  for (let i = 1; i <= maxConnections; i++) {
    const connection = await createPersistentConnection(i);
    if (connection.connected) {
      connections.push(connection);
    }
    
    // Check count after each connection
    const count = await getActiveUsersCount();
    console.log(`After connection ${i}: Count=${count.count}, Total=${count.total}, Connections=${count.connections}, MapSize=${count.mapSize}`);
    
    // Wait a bit between connections
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\nCreated ${connections.length} persistent connections\n`);
  
  // Step 3: Monitor count over time (simulate real usage)
  console.log('Step 3: Monitoring count over time (simulating real usage)...');
  for (let i = 0; i < 15; i++) {
    const count = await getActiveUsersCount();
    console.log(`Time ${i + 1}: Count=${count.count}, Total=${count.total}, Connections=${count.connections}, MapSize=${count.mapSize}`);
    
    // Simulate some connections disconnecting and reconnecting
    if (i === 5 && connections.length > 0) {
      console.log('🔄 Simulating connection drop and reconnect...');
      const conn = connections[0];
      if (conn.socket) {
        conn.socket.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
        conn.socket.connect();
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Step 4: Disconnect all connections
  console.log('\nStep 4: Disconnecting all connections...');
  connections.forEach((conn, index) => {
    if (conn.socket) {
      conn.socket.disconnect();
      console.log(`🔌 Disconnected connection ${conn.id}`);
    }
  });
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Step 5: Check final count
  console.log('\nStep 5: Checking final count...');
  const finalCount = await getActiveUsersCount();
  console.log(`Final: Count=${finalCount.count}, Total=${finalCount.total}, Connections=${finalCount.connections}, MapSize=${finalCount.mapSize}\n`);
  
  // Analysis
  console.log('📊 Real-World Scenario Analysis:');
  console.log('=================================');
  console.log(`Initial count: ${initialCount.count}`);
  console.log(`Final count: ${finalCount.count}`);
  console.log(`Expected final count: 0 (all disconnected)`);
  console.log(`Count increase: ${finalCount.count - initialCount.count}`);
  
  if (finalCount.count > initialCount.count) {
    console.log('❌ ISSUE: Count is higher than expected - potential memory leak!');
    console.log('   This could be due to:');
    console.log('   - Connections not being properly cleaned up');
    console.log('   - Reconnection creating duplicate entries');
    console.log('   - Cleanup logic not working correctly');
  } else if (finalCount.count === 0) {
    console.log('✅ GOOD: Count returned to 0 - cleanup working correctly');
  } else {
    console.log('⚠️ WARNING: Count is not 0 but not increasing - partial cleanup issue');
  }
  
  process.exit(0);
}

runRealWorldTest().catch(console.error);
