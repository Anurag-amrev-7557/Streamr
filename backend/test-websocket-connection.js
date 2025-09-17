const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3001';

function testWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('🔌 Testing WebSocket connection...');
    
    const socket = io(BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: false
    });

    let updateReceived = false;

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
    });

    socket.on('activeUsers:update', (data) => {
      console.log('📈 Received activeUsers:update:', data);
      updateReceived = true;
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      resolve(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    // Wait for updates
    setTimeout(() => {
      socket.disconnect();
      resolve(updateReceived);
    }, 5000);
  });
}

async function runTest() {
  console.log('🚀 Testing WebSocket Connection\n');
  
  const result = await testWebSocketConnection();
  
  console.log('\n📊 Test Result:');
  console.log(`WebSocket Updates: ${result ? '✅ Received' : '❌ Not Received'}`);
  
  if (result) {
    console.log('✅ WebSocket connection is working correctly!');
  } else {
    console.log('❌ WebSocket connection has issues.');
  }
  
  process.exit(0);
}

runTest().catch(console.error);
