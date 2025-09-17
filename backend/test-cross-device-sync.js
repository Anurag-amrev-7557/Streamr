const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3001';

// Simulate different devices with different user agents and IPs
const devices = [
  {
    name: 'Desktop Chrome',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ip: '192.168.1.100'
  },
  {
    name: 'Mobile Safari',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ip: '192.168.1.101'
  },
  {
    name: 'Android Chrome',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    ip: '192.168.1.102'
  },
  {
    name: 'Tablet iPad',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ip: '192.168.1.103'
  }
];

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

function createDeviceConnection(device, deviceIndex) {
  return new Promise((resolve) => {
    console.log(`🔌 Creating connection for ${device.name}...`);
    
    const socket = io(BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: false,
      extraHeaders: {
        'User-Agent': device.userAgent,
        'X-Forwarded-For': device.ip
      }
    });

    let updatesReceived = 0;
    let lastCount = 0;

    socket.on('connect', () => {
      console.log(`✅ ${device.name} connected: ${socket.id}`);
    });

    socket.on('activeUsers:update', (data) => {
      updatesReceived++;
      lastCount = data.count;
      console.log(`📈 ${device.name} received update: ${data.count} users (update #${updatesReceived})`);
    });

    socket.on('connect_error', (error) => {
      console.error(`❌ ${device.name} connection failed:`, error.message);
      resolve({ device: device.name, connected: false, updates: 0, lastCount: 0 });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 ${device.name} disconnected: ${reason}`);
    });

    // Wait for connection and updates
    setTimeout(() => {
      socket.disconnect();
      resolve({ 
        device: device.name, 
        connected: socket.connected, 
        updates: updatesReceived, 
        lastCount: lastCount 
      });
    }, 8000); // Wait 8 seconds
  });
}

async function runCrossDeviceTest() {
  console.log('🚀 Starting Cross-Device Synchronization Test\n');
  
  // Test 1: Check initial count
  console.log('Step 1: Checking initial count...');
  const initialCount = await testActiveUsersAPI();
  
  // Test 2: Create connections from different devices
  console.log('\nStep 2: Creating connections from different devices...');
  const deviceResults = [];
  
  for (let i = 0; i < devices.length; i++) {
    const result = await createDeviceConnection(devices[i], i);
    deviceResults.push(result);
    
    // Small delay between devices
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test 3: Check final count
  console.log('\nStep 3: Checking final count...');
  const finalCount = await testActiveUsersAPI();
  
  // Test 4: Check if all devices see the same count
  console.log('\n📊 Cross-Device Test Results:');
  console.log('============================');
  console.log(`Initial count: ${initialCount}`);
  console.log(`Final count: ${finalCount}`);
  console.log('\nDevice Results:');
  
  let allConnected = true;
  let allSameCount = true;
  const counts = [];
  
  deviceResults.forEach((result, index) => {
    console.log(`${result.device}: ${result.connected ? '✅' : '❌'} Connected, ${result.updates} updates, last count: ${result.lastCount}`);
    counts.push(result.lastCount);
    if (!result.connected) allConnected = false;
  });
  
  // Check if all devices saw the same count
  const uniqueCounts = [...new Set(counts.filter(c => c > 0))];
  if (uniqueCounts.length > 1) {
    allSameCount = false;
    console.log(`⚠️ Different counts seen: ${uniqueCounts.join(', ')}`);
  }
  
  console.log('\n🎯 Synchronization Assessment:');
  if (allConnected && allSameCount) {
    console.log('✅ All devices connected and synchronized correctly!');
  } else if (allConnected && !allSameCount) {
    console.log('⚠️ All devices connected but counts are not synchronized');
    console.log('   This indicates a real-time update synchronization issue');
  } else {
    console.log('❌ Some devices failed to connect or synchronize');
  }
  
  process.exit(0);
}

runCrossDeviceTest().catch(console.error);
