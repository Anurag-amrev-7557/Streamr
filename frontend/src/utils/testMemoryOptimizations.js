// Test script for memory optimizations
export const testMemoryOptimizations = () => {
  console.log('🧪 Testing memory optimizations...');
  
  // Test memory monitor
  if (typeof performance !== 'undefined' && performance.memory) {
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    console.log(`Current memory usage: ${memoryMB.toFixed(2)}MB`);
    
    if (memoryMB > 500) {
      console.warn('⚠️ Memory usage is high, optimizations should be active');
    } else {
      console.log('✅ Memory usage is within normal range');
    }
  }
  
  // Test garbage collection availability
  if (window.gc) {
    console.log('✅ Garbage collection is available');
  } else {
    console.log('⚠️ Garbage collection not available (run with --expose-gc flag)');
  }
  
  // Test performance monitoring
  const startTime = performance.now();
  setTimeout(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`Performance timing test: ${duration.toFixed(2)}ms`);
  }, 100);
  
  console.log('🧪 Memory optimization tests completed');
};

// Export for use in development
if (import.meta.env.DEV) {
  window.testMemoryOptimizations = testMemoryOptimizations;
} 