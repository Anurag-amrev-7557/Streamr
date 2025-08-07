// Simple Memory Fix Utility
// Run this in browser console to fix memory issues

// Global memory fix function
window.fixMemory = () => {
  console.log('🔧 Starting memory fix...');
  
  // Clear localStorage (keep essential items)
  const essentialKeys = ['user', 'auth', 'settings', 'theme'];
  const keysToRemove = Object.keys(localStorage).filter(key => !essentialKeys.includes(key));
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ Cleared ${keysToRemove.length} localStorage items`);
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('🗑️ Cleared sessionStorage');
  
  // Clear browser caches
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
      console.log('🗑️ Cleared browser caches');
    });
  }
  
  // Clear all timeouts and intervals
  const highestTimeoutId = setTimeout(() => {}, 0);
  const highestIntervalId = setInterval(() => {}, 0);
  
  let clearedTimers = 0;
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
    clearedTimers++;
  }
  for (let i = 0; i < highestIntervalId; i++) {
    clearInterval(i);
    clearedTimers++;
  }
  console.log(`⏰ Cleared ${clearedTimers} timers`);
  
  // Clear images that are not visible
  const images = document.querySelectorAll('img');
  let optimizedImages = 0;
  images.forEach(img => {
    if (img.offsetParent === null) {
      img.src = '';
      optimizedImages++;
    }
  });
  console.log(`🖼️ Optimized ${optimizedImages} images`);
  
  // Force garbage collection
  if (window.gc) {
    window.gc();
    console.log('🗑️ Forced garbage collection');
  }
  
  // Check memory after fix
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize / 1024 / 1024;
    const limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;
    console.log(`📊 Memory after fix: ${used.toFixed(2)}MB / ${limit.toFixed(2)}MB`);
  }
  
  console.log('✅ Memory fix completed!');
};

// Quick memory check
window.checkMemory = () => {
  if (!performance.memory) {
    console.log('⚠️ Performance.memory not available');
    return;
  }
  
  const used = performance.memory.usedJSHeapSize / 1024 / 1024;
  const limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;
  const percentage = ((used / limit) * 100).toFixed(2);
  
  console.log(`📊 Memory: ${used.toFixed(2)}MB / ${limit.toFixed(2)}MB (${percentage}%)`);
  
  if (percentage > 80) {
    console.error('🚨 CRITICAL: Memory usage is very high!');
  } else if (percentage > 60) {
    console.warn('⚠️ WARNING: Memory usage is high');
  } else {
    console.log('✅ Memory usage is acceptable');
  }
};

// Emergency cleanup
window.emergencyCleanup = () => {
  console.log('🚨 EMERGENCY CLEANUP');
  
  // Clear everything
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear all timers aggressively
  const highestTimeoutId = setTimeout(() => {}, 0);
  const highestIntervalId = setInterval(() => {}, 0);
  
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
  }
  for (let i = 0; i < highestIntervalId; i++) {
    clearInterval(i);
  }
  
  // Clear all images
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    img.src = '';
  });
  
  // Multiple garbage collections
  if (window.gc) {
    for (let i = 0; i < 5; i++) {
      window.gc();
    }
  }
  
  console.log('✅ Emergency cleanup completed');
};

console.log(`
🧠 Memory Fix Tools Available:

1. checkMemory() - Check current memory usage
2. fixMemory() - Perform memory cleanup
3. emergencyCleanup() - Aggressive emergency cleanup

Usage:
- checkMemory() // Check memory
- fixMemory() // Clean up memory
- emergencyCleanup() // Emergency cleanup
`); 