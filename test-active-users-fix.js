const io = require('socket.io-client');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function getActiveUsersCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/active-users`);
    const data = await response.json();
    return data.count;
  } catch (error) {
    console.error('Error fetching active users:', error);
    return null;
  }
}

function createConnection(connectionId) {
  return new Promise((resolve, reject) => {
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      auth: {
        token: null // Anonymous connection
      }
    });

    socket.on('connect', () => {
      console.log(`✅ Connection ${connectionId} established`);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ Connection ${connectionId} failed:`, error.message);
      reject(error);
    });

    socket.on('activeUsers:update', (data) => {
      console.log(`📊 Connection ${connectionId} received active users update:`, data.count);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!socket.connected) {
        reject(new Error(`Connection ${connectionId} timeout`));
      }
    }, 10000);
  });
}

async function testActiveUsersFix() {
  console.log('🧪 Testing Active Users Fix');
  console.log('============================');

  try {
    // Get initial count
    const initialCount = await getActiveUsersCount();
    console.log(`📊 Initial active users count: ${initialCount}`);

    // Create multiple connections
    const connections = [];
    const connectionCount = 5;

    console.log(`\n🔌 Creating ${connectionCount} connections...`);
    for (let i = 1; i <= connectionCount; i++) {
      try {
        const socket = await createConnection(i);
        connections.push(socket);
        
        // Wait a bit between connections
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check count after each connection
        const currentCount = await getActiveUsersCount();
        console.log(`📊 After connection ${i}: ${currentCount} active users`);
      } catch (error) {
        console.error(`❌ Failed to create connection ${i}:`, error.message);
      }
    }

    // Wait for all connections to stabilize
    console.log('\n⏳ Waiting for connections to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const finalCount = await getActiveUsersCount();
    console.log(`📊 Final active users count: ${finalCount}`);

    // Test reconnection (simulate network issues)
    console.log('\n🔄 Testing reconnection...');
    if (connections.length > 0) {
      const testSocket = connections[0];
      testSocket.disconnect();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      const countAfterDisconnect = await getActiveUsersCount();
      console.log(`📊 After disconnect: ${countAfterDisconnect} active users`);

      // Reconnect
      testSocket.connect();
      await new Promise(resolve => setTimeout(resolve, 2000));
      const countAfterReconnect = await getActiveUsersCount();
      console.log(`📊 After reconnect: ${countAfterReconnect} active users`);
    }

    // Test multiple disconnections
    console.log('\n🔌 Testing multiple disconnections...');
    const disconnectCount = Math.min(3, connections.length);
    for (let i = 0; i < disconnectCount; i++) {
      connections[i].disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const count = await getActiveUsersCount();
      console.log(`📊 After disconnecting connection ${i + 1}: ${count} active users`);
    }

    // Final count
    const finalFinalCount = await getActiveUsersCount();
    console.log(`\n📊 Final final count: ${finalFinalCount} active users`);

    // Analysis
    console.log('\n📈 Analysis:');
    console.log(`- Initial count: ${initialCount}`);
    console.log(`- After ${connectionCount} connections: ${finalCount}`);
    console.log(`- Expected increase: ${connectionCount}`);
    console.log(`- Actual increase: ${finalCount - initialCount}`);
    
    if (finalCount - initialCount === connectionCount) {
      console.log('✅ Test PASSED: Active users count is accurate!');
    } else {
      console.log('❌ Test FAILED: Active users count is not accurate!');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up connections...');
    connections.forEach((socket, index) => {
      if (socket.connected) {
        socket.disconnect();
        console.log(`🔌 Disconnected connection ${index + 1}`);
      }
    });

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    const cleanupCount = await getActiveUsersCount();
    console.log(`📊 Count after cleanup: ${cleanupCount}`);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testActiveUsersFix().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
