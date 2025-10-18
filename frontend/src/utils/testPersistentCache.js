// Test utility for persistent cache functionality
import performanceOptimizationService from '../services/performanceOptimizationService';

export const testPersistentCache = () => {
  console.log('🧪 Testing Persistent Cache...');
  
  // Test 1: Check if service is initialized
  console.log('✅ Service initialized:', !!performanceOptimizationService);
  
  // Test 2: Check cache stats
  const stats = performanceOptimizationService.getCacheStats();
  console.log('📊 Initial cache stats:', stats);
  
  // Test 3: Test setting and getting cache
  const testData = { test: 'data', timestamp: Date.now() };
  performanceOptimizationService.setCachedSection('test-section', testData);
  
  // Test 4: Check if data was cached
  const cachedData = performanceOptimizationService.getCachedSection('test-section');
  console.log('💾 Cached data retrieved:', cachedData);
  
  // Test 5: Check if section is marked as cached
  const isCached = performanceOptimizationService.isSectionCached('test-section');
  console.log('🔍 Section cached status:', isCached);
  
  // Test 6: Check updated stats
  const updatedStats = performanceOptimizationService.getCacheStats();
  console.log('📊 Updated cache stats:', updatedStats);
  
  // Test 7: Test cache persistence (save to localStorage)
  performanceOptimizationService.savePersistentCache();
  console.log('💾 Cache saved to localStorage');
  
  // Test 8: Clear cache and restore
  performanceOptimizationService.clearPersistentCache();
  console.log('🗑️ Cache cleared');
  
  // Test 9: Restore from localStorage
  performanceOptimizationService.initializePersistentCache();
  const restoredStats = performanceOptimizationService.getCacheStats();
  console.log('🔄 Restored cache stats:', restoredStats);
  
  console.log('🎯 Persistent Cache Test Complete!');
  
  return {
    success: true,
    initialStats: stats,
    finalStats: restoredStats,
    testData: cachedData
  };
};

// Test cache performance
export const testCachePerformance = async () => {
  console.log('⚡ Testing Cache Performance...');
  
  const startTime = performance.now();
  
  // Simulate multiple cache operations
  for (let i = 0; i < 100; i++) {
    performanceOptimizationService.setCachedSection(`perf-test-${i}`, { data: i });
  }
  
  const setTime = performance.now() - startTime;
  
  // Test retrieval performance
  const retrieveStart = performance.now();
  for (let i = 0; i < 100; i++) {
    performanceOptimizationService.getCachedSection(`perf-test-${i}`);
  }
  
  const retrieveTime = performance.now() - retrieveStart;
  
  console.log('📊 Performance Results:', {
    setTime: `${setTime.toFixed(2)}ms`,
    retrieveTime: `${retrieveTime.toFixed(2)}ms`,
    totalTime: `${(setTime + retrieveTime).toFixed(2)}ms`
  });
  
  return { setTime, retrieveTime, totalTime: setTime + retrieveTime };
};

// Export for use in console
if (typeof window !== 'undefined') {
  window.testPersistentCache = testPersistentCache;
  window.testCachePerformance = testCachePerformance;
} 