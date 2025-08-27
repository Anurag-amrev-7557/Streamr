/**
 * Comprehensive MIME Type Fix Test Script
 * Run this in the browser console to test and fix service worker functionality
 */

console.log('🧪 Comprehensive MIME type fix testing...');

// Global error tracking
let mimeTypeErrors = [];
let serviceWorkerErrors = [];
let fetchErrors = [];

// Test 1: Check if service worker is registered
async function testServiceWorkerRegistration() {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('✅ Service Worker is registered:', registration);
        console.log('✅ Active Service Worker:', registration.active);
        console.log('✅ Service Worker scope:', registration.scope);
        console.log('✅ Service Worker script URL:', registration.active?.scriptURL);
        return true;
      } else {
        console.log('❌ No Service Worker registration found');
        return false;
      }
    } else {
      console.log('❌ Service Worker not supported');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking service worker:', error);
    return false;
  }
}

// Test 2: Test fetching JavaScript files with detailed MIME type checking
async function testJavaScriptFetch() {
  const testFiles = [
    '/src/main.jsx',
    '/src/App.jsx',
    '/src/components/StreamingPlayer.jsx'
  ];
  
  const results = [];
  
  for (const file of testFiles) {
    try {
      const response = await fetch(file);
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      console.log(`📄 ${file}:`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Content-Length: ${contentLength}`);
      console.log(`   Status: ${response.status}`);
      
      let isValid = false;
      let issue = null;
      
      if (contentType && contentType.includes('application/javascript')) {
        console.log('   ✅ MIME type is correct');
        isValid = true;
      } else if (contentType && contentType.includes('text/html')) {
        console.log('   ❌ MIME type is incorrect (text/html)');
        issue = 'MIME type mismatch';
        mimeTypeErrors.push({ file, contentType, issue });
      } else if (contentType && contentType.includes('text/plain')) {
        console.log('   ⚠️ MIME type is text/plain (may cause issues)');
        issue = 'Unexpected MIME type';
      } else {
        console.log('   ⚠️ Unexpected MIME type');
        issue = 'Unknown MIME type';
        mimeTypeErrors.push({ file, contentType, issue });
      }
      
      results.push({ file, isValid, contentType, issue });
      
    } catch (error) {
      console.error(`❌ Error testing ${file}:`, error);
      fetchErrors.push({ file, error: error.message });
      results.push({ file, isValid: false, error: error.message });
    }
  }
  
  const validCount = results.filter(r => r.isValid).length;
  const totalCount = results.length;
  
  console.log(`\n📊 JavaScript MIME Type Results: ${validCount}/${totalCount} files have correct MIME types`);
  
  return validCount === totalCount;
}

// Test 3: Test service worker message handling
async function testServiceWorkerMessages() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      // Send a test message
      registration.active.postMessage({
        type: 'TEST_MESSAGE',
        data: 'Hello from test script'
      });
      
      console.log('✅ Test message sent to service worker');
      return true;
    } else {
      console.log('❌ No active service worker to test messages');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing service worker messages:', error);
    return false;
  }
}

// Test 4: Enhanced MIME type error detection
function checkForMimeTypeErrors() {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('MIME type') || 
        message.includes('Expected a JavaScript') ||
        message.includes('module script') ||
        message.includes('text/html')) {
      mimeTypeErrors.push({
        type: 'console.error',
        message,
        timestamp: new Date().toISOString()
      });
      console.warn('🚨 MIME type error detected:', message);
    }
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.includes('MIME type') || 
        message.includes('Expected a JavaScript') ||
        message.includes('module script')) {
      mimeTypeErrors.push({
        type: 'console.warn',
        message,
        timestamp: new Date().toISOString()
      });
    }
    originalWarn.apply(console, args);
  };
  
  // Reset after 10 seconds
  setTimeout(() => {
    console.error = originalError;
    console.warn = originalWarn;
    
    if (mimeTypeErrors.length === 0) {
      console.log('✅ No MIME type errors detected');
    } else {
      console.log(`⚠️ ${mimeTypeErrors.length} MIME type errors detected`);
      console.log('📋 Error details:', mimeTypeErrors);
    }
  }, 10000);
  
  return mimeTypeErrors.length;
}

// Test 5: Service worker status and health check
async function testServiceWorkerHealth() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('❌ No service worker registration found');
      return false;
    }
    
    console.log('🔍 Service Worker Health Check:');
    console.log('   State:', registration.active?.state);
    console.log('   Script URL:', registration.active?.scriptURL);
    console.log('   Scope:', registration.scope);
    
    // Check if service worker is responding
    if (registration.active) {
      try {
        // Send a ping message
        const pingPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 5000);
          
          const messageHandler = (event) => {
            if (event.data?.type === 'PONG') {
              clearTimeout(timeout);
              navigator.serviceWorker.removeEventListener('message', messageHandler);
              resolve(true);
            }
          };
          
          navigator.serviceWorker.addEventListener('message', messageHandler);
          
          registration.active.postMessage({ type: 'PING' });
        });
        
        const isResponding = await pingPromise;
        console.log('   Responsive:', isResponding ? '✅ Yes' : '❌ No');
        
        return isResponding;
      } catch (error) {
        console.log('   Responsive: ❌ Error testing');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking service worker health:', error);
    return false;
  }
}

// Test 6: Force service worker cleanup and re-registration
async function forceServiceWorkerCleanup() {
  try {
    console.log('🔄 Force cleaning up service workers...');
    
    // Get all registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Unregister all
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ Unregistered:', registration.scope);
    }
    
    // Clear all caches
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log('✅ Cleared cache:', cacheName);
    }
    
    console.log('✅ Service worker cleanup completed');
    
    // Wait a bit and try to re-register
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to re-register
    if (window.serviceWorkerManager) {
      console.log('🔄 Attempting to re-register service worker...');
      const success = await window.serviceWorkerManager.register();
      console.log('Re-registration result:', success ? '✅ Success' : '❌ Failed');
      return success;
    } else {
      console.log('⚠️ Service worker manager not available');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during force cleanup:', error);
    return false;
  }
}

// Test 7: Check for network and fetch issues
async function testNetworkIssues() {
  try {
    console.log('🌐 Testing network connectivity...');
    
    // Test basic fetch
    const response = await fetch('/');
    console.log('✅ Basic fetch successful:', response.status);
    
    // Test JavaScript file fetch
    const jsResponse = await fetch('/src/main.jsx');
    console.log('✅ JavaScript fetch successful:', jsResponse.status);
    
    // Check for CORS issues
    const corsResponse = await fetch('/src/main.jsx', {
      method: 'HEAD'
    });
    console.log('✅ CORS check passed');
    
    return true;
  } catch (error) {
    console.error('❌ Network test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive MIME type fix tests...\n');
  
  const results = {
    registration: await testServiceWorkerRegistration(),
    javascriptFetch: await testJavaScriptFetch(),
    messages: await testServiceWorkerMessages(),
    health: await testServiceWorkerHealth(),
    network: await testNetworkIssues(),
    mimeErrors: checkForMimeTypeErrors()
  };
  
  console.log('\n📊 Comprehensive Test Results:');
  console.log('Service Worker Registration:', results.registration ? '✅ PASS' : '❌ FAIL');
  console.log('JavaScript MIME Type:', results.javascriptFetch ? '✅ PASS' : '❌ FAIL');
  console.log('Service Worker Messages:', results.messages ? '✅ PASS' : '❌ FAIL');
  console.log('Service Worker Health:', results.health ? '✅ PASS' : '❌ FAIL');
  console.log('Network Connectivity:', results.network ? '✅ PASS' : '❌ FAIL');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! MIME type issues should be resolved.');
  } else {
    console.log('⚠️ Some tests failed. Check the console for details.');
    
    // Provide specific recommendations
    if (!results.javascriptFetch) {
      console.log('\n💡 MIME Type Issues Detected:');
      console.log('   - Check your development server configuration');
      console.log('   - Ensure proper MIME type headers are set');
      console.log('   - Try restarting your development server');
    }
    
    if (!results.health) {
      console.log('\n💡 Service Worker Health Issues:');
      console.log('   - Service worker may not be responding');
      console.log('   - Try force cleanup: testMimeTypeFixes.forceServiceWorkerCleanup()');
    }
  }
  
  return results;
}

// Export for use in console
window.testMimeTypeFixes = {
  runAllTests,
  testServiceWorkerRegistration,
  testJavaScriptFetch,
  testServiceWorkerMessages,
  testServiceWorkerHealth,
  testNetworkIssues,
  forceServiceWorkerCleanup,
  checkForMimeTypeErrors,
  
  // Utility functions
  getMimeTypeErrors: () => mimeTypeErrors,
  getServiceWorkerErrors: () => serviceWorkerErrors,
  getFetchErrors: () => fetchErrors,
  clearErrors: () => {
    mimeTypeErrors = [];
    serviceWorkerErrors = [];
    fetchErrors = [];
    console.log('✅ Error logs cleared');
  }
};

console.log('🧪 Comprehensive MIME type test functions loaded.');
console.log('💡 Run testMimeTypeFixes.runAllTests() to test everything.');
console.log('💡 Run testMimeTypeFixes.forceServiceWorkerCleanup() to force cleanup.');
console.log('💡 Check testMimeTypeFixes.getMimeTypeErrors() for detailed error info.'); 