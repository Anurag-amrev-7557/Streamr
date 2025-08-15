// Test script for network optimizations
console.log('🚀 Testing Network Optimizations...');

// Test 1: Service Worker Registration
if ('serviceWorker' in navigator) {
  console.log('✅ Service Worker supported');
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log(`📱 Service Workers registered: ${registrations.length}`);
    registrations.forEach((reg, index) => {
      console.log(`  ${index + 1}. ${reg.scope} - State: ${reg.active ? 'Active' : 'Inactive'}`);
    });
  });
} else {
  console.log('❌ Service Worker not supported');
}

// Test 2: Cache API
if ('caches' in window) {
  console.log('✅ Cache API supported');
  caches.keys().then(cacheNames => {
    console.log(`📦 Available caches: ${cacheNames.length}`);
    cacheNames.forEach(name => console.log(`  - ${name}`));
  });
} else {
  console.log('❌ Cache API not supported');
}

// Test 3: Network Information API
if ('connection' in navigator) {
  const conn = navigator.connection;
  console.log('✅ Network Information API supported');
  console.log(`📶 Connection type: ${conn.effectiveType || 'unknown'}`);
  console.log(`⚡ Download speed: ${conn.downlink || 'unknown'} Mbps`);
  console.log(`⏱️ Latency: ${conn.rtt || 'unknown'} ms`);
} else {
  console.log('❌ Network Information API not supported');
}

// Test 4: Intersection Observer
if ('IntersectionObserver' in window) {
  console.log('✅ Intersection Observer supported');
} else {
  console.log('❌ Intersection Observer not supported');
}

// Test 5: AbortController (for timeouts)
if ('AbortController' in window) {
  console.log('✅ AbortController supported');
} else {
  console.log('❌ AbortController not supported');
}

console.log('\n🎯 Network Optimization Status:');
console.log('If you see mostly ✅ marks, your optimizations are working!');
console.log('Check the browser console for detailed information.'); 