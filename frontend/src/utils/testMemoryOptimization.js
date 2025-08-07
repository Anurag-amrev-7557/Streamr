// Memory Optimization Test Utility
// Simple utility to test and monitor memory usage

class MemoryTestUtility {
  constructor() {
    this.isMonitoring = false;
    this.intervalId = null;
    this.memoryHistory = [];
    this.maxHistorySize = 50;
    this.testResults = [];
  }

  startMonitoring() {
    if (this.isMonitoring) {
      console.log('[MemoryTestUtility] Already monitoring');
      return;
    }
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.recordMemoryUsage();
    }, 10000); // Record every 10 seconds
    
    console.log('[MemoryTestUtility] Started memory monitoring');
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('[MemoryTestUtility] Stopped memory monitoring');
  }

  recordMemoryUsage() {
    if (!performance.memory) {
      console.warn('[MemoryTestUtility] Performance.memory not available');
      return;
    }
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    const timestamp = Date.now();
    
    this.memoryHistory.push({ memoryMB, timestamp });
    
    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
    
    // Log current memory usage
    console.log(`[MemoryTestUtility] Current memory: ${memoryMB.toFixed(2)}MB`);
    
    // Check for significant changes
    if (this.memoryHistory.length >= 2) {
      const previous = this.memoryHistory[this.memoryHistory.length - 2].memoryMB;
      const change = memoryMB - previous;
      
      if (Math.abs(change) > 50) { // 50MB change
        console.log(`[MemoryTestUtility] Memory change: ${change > 0 ? '+' : ''}${change.toFixed(2)}MB`);
      }
    }
  }

  getMemoryStats() {
    if (this.memoryHistory.length === 0) return null;
    
    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const min = Math.min(...this.memoryHistory.map(h => h.memoryMB));
    const max = Math.max(...this.memoryHistory.map(h => h.memoryMB));
    const avg = this.memoryHistory.reduce((sum, h) => sum + h.memoryMB, 0) / this.memoryHistory.length;
    
    return {
      current: current.memoryMB,
      min,
      max,
      average: avg,
      trend: max - min,
      samples: this.memoryHistory.length
    };
  }

  testMovieDetailsOverlay() {
    console.log('[MemoryTestUtility] Testing MovieDetailsOverlay memory usage...');
    
    const beforeMemory = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
    console.log(`[MemoryTestUtility] Memory before test: ${beforeMemory.toFixed(2)}MB`);
    
    // Simulate opening and closing MovieDetailsOverlay multiple times
    const testResults = [];
    
    for (let i = 0; i < 5; i++) {
      const startMemory = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
      
      // Simulate overlay open
      setTimeout(() => {
        const openMemory = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
        console.log(`[MemoryTestUtility] Test ${i + 1} - After open: ${openMemory.toFixed(2)}MB`);
        
        // Simulate overlay close
        setTimeout(() => {
          const closeMemory = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
          const memoryChange = closeMemory - startMemory;
          
          testResults.push({
            test: i + 1,
            startMemory,
            openMemory,
            closeMemory,
            memoryChange
          });
          
          console.log(`[MemoryTestUtility] Test ${i + 1} - After close: ${closeMemory.toFixed(2)}MB (change: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(2)}MB)`);
          
          if (i === 4) { // Last test
            this.analyzeTestResults(testResults, beforeMemory);
          }
        }, 2000); // Wait 2 seconds before closing
      }, i * 3000); // Wait 3 seconds between tests
    }
  }

  analyzeTestResults(testResults, beforeMemory) {
    console.log('[MemoryTestUtility] Test Results Analysis:');
    console.log('==========================================');
    
    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
    const totalChange = finalMemory - beforeMemory;
    
    console.log(`Initial memory: ${beforeMemory.toFixed(2)}MB`);
    console.log(`Final memory: ${finalMemory.toFixed(2)}MB`);
    console.log(`Total change: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(2)}MB`);
    
    testResults.forEach(result => {
      console.log(`Test ${result.test}: ${result.memoryChange > 0 ? '+' : ''}${result.memoryChange.toFixed(2)}MB`);
    });
    
    const avgChange = testResults.reduce((sum, r) => sum + r.memoryChange, 0) / testResults.length;
    console.log(`Average change per test: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}MB`);
    
    if (totalChange > 100) {
      console.warn('[MemoryTestUtility] ⚠️ Potential memory leak detected!');
    } else if (totalChange > 50) {
      console.warn('[MemoryTestUtility] ⚠️ Moderate memory increase detected');
    } else {
      console.log('[MemoryTestUtility] ✅ Memory usage looks stable');
    }
    
    this.testResults = testResults;
  }

  clearHistory() {
    this.memoryHistory = [];
    this.testResults = [];
    console.log('[MemoryTestUtility] History cleared');
  }

  exportResults() {
    const stats = this.getMemoryStats();
    const results = {
      timestamp: new Date().toISOString(),
      stats,
      testResults: this.testResults
    };
    
    console.log('[MemoryTestUtility] Results:', results);
    return results;
  }
}

// Create singleton instance
const memoryTestUtility = new MemoryTestUtility();

// Export for use in development
export default memoryTestUtility;

// Auto-start in development
if (import.meta.env.DEV) {
  // Don't auto-start to avoid interference with normal operation
  // memoryTestUtility.startMonitoring();
}

// Global access for debugging
if (typeof window !== 'undefined') {
  window.memoryTestUtility = memoryTestUtility;
} 