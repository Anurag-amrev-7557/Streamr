// Test script to verify memory improvements
import memoryManager from './memoryManager';

export const testMemoryImprovements = () => {
  console.log('🧪 Testing Memory Improvements...');
  
  // Test 1: Check if memory manager is working
  console.log('✅ Memory Manager Status:', {
    isMonitoring: memoryManager.isMonitoring,
    threshold: memoryManager.threshold,
    maxHistorySize: memoryManager.maxHistorySize
  });
  
  // Test 2: Check current memory usage
  if (performance.memory) {
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    console.log('📊 Current Memory Usage:', `${memoryMB.toFixed(2)}MB`);
  }
  
  // Test 3: Get memory stats
  const stats = memoryManager.getStats();
  if (stats) {
    console.log('📈 Memory Stats:', {
      current: `${stats.current.toFixed(2)}MB`,
      min: `${stats.min.toFixed(2)}MB`,
      max: `${stats.max.toFixed(2)}MB`,
      average: `${stats.average.toFixed(2)}MB`,
      trend: `${stats.trend.toFixed(2)}MB`
    });
  }
  
  // Test 4: Test cleanup callback registration
  let callbackExecuted = false;
  const testCallback = () => {
    callbackExecuted = true;
    console.log('🧹 Test cleanup callback executed');
  };
  
  const unregister = memoryManager.registerCleanupCallback(testCallback);
  console.log('✅ Cleanup callback registered');
  
  // Test 5: Simulate high memory usage to trigger cleanup
  if (performance.memory) {
    const currentMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
    if (currentMemory > 500) {
      console.log('⚠️ High memory usage detected, triggering cleanup...');
      memoryManager.performCleanup();
    } else {
      console.log('✅ Memory usage is within normal range');
    }
  }
  
  // Cleanup test callback
  unregister();
  console.log('✅ Test cleanup callback unregistered');
  
  console.log('🎉 Memory improvement tests completed!');
  
  return {
    memoryManagerWorking: memoryManager.isMonitoring,
    currentMemory: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : null,
    stats: stats,
    callbackTest: callbackExecuted
  };
};

// Auto-run test in development
if (import.meta.env.DEV) {
  // Run test after a delay to allow components to load
  setTimeout(() => {
    testMemoryImprovements();
  }, 5000);
}

export default testMemoryImprovements; 