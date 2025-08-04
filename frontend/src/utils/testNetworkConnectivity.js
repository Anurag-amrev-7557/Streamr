// Test script for network connectivity improvements
import { checkBasicConnectivity, checkApiConnectivity, getNetworkStatus, createRetryableFetch } from './networkUtils.js';

export const testNetworkConnectivity = async () => {
  console.log('🧪 Testing Network Connectivity...');
  
  // Test 1: Basic connectivity
  console.log('\n1. Testing basic connectivity...');
  const basicOnline = checkBasicConnectivity();
  console.log(`   Basic connectivity: ${basicOnline ? '✅ Online' : '❌ Offline'}`);
  
  // Test 2: API connectivity
  console.log('\n2. Testing API connectivity...');
  try {
    const apiOnline = await checkApiConnectivity();
    console.log(`   API connectivity: ${apiOnline ? '✅ Available' : '❌ Unavailable'}`);
  } catch (error) {
    console.log(`   API connectivity: ❌ Error - ${error.message}`);
  }
  
  // Test 3: Network status
  console.log('\n3. Network status...');
  const status = getNetworkStatus();
  console.log(`   Connection type: ${status.connectionType}`);
  console.log(`   Downlink: ${status.downlink || 'unknown'} Mbps`);
  console.log(`   RTT: ${status.rtt || 'unknown'} ms`);
  
  // Test 4: Retryable fetch
  console.log('\n4. Testing retryable fetch...');
  const retryableFetch = createRetryableFetch(2, 1000);
  try {
    const response = await retryableFetch('https://api.themoviedb.org/3/configuration');
    console.log(`   Retryable fetch: ✅ Success (${response.status})`);
  } catch (error) {
    console.log(`   Retryable fetch: ❌ Failed - ${error.message}`);
  }
  
  console.log('\n✅ Network connectivity test completed!');
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testNetworkConnectivity = testNetworkConnectivity;
  console.log('🧪 Network connectivity test available: testNetworkConnectivity()');
} 