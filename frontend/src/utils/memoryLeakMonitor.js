// Memory Leak Monitor Utility
class MemoryLeakMonitor {
  constructor() {
    this.memoryHistory = [];
    this.maxHistorySize = 50;
    this.threshold = 500; // MB
    this.isMonitoring = false;
    this.intervalId = null;
  }

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, 10000); // Check every 10 seconds instead of 3
    
    console.log('[MemoryLeakMonitor] Started monitoring memory usage');
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('[MemoryLeakMonitor] Stopped monitoring memory usage');
  }

  checkMemory() {
    if (!performance.memory) return;
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    const timestamp = Date.now();
    
    this.memoryHistory.push({ memoryMB, timestamp });
    
    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
    
    // Check for memory leaks (continuous increase)
    if (this.memoryHistory.length >= 10) {
      const recent = this.memoryHistory.slice(-10);
      const first = recent[0].memoryMB;
      const last = recent[recent.length - 1].memoryMB;
      const increase = last - first;
      
      if (increase > 200) { // 200MB increase over 100 seconds (increased threshold)
        console.warn(`[MemoryLeakMonitor] Potential memory leak detected: ${increase.toFixed(2)}MB increase over 100s`);
        this.suggestCleanup();
      }
    }
    
    // Check for high memory usage
    if (memoryMB > this.threshold) {
      console.warn(`[MemoryLeakMonitor] High memory usage: ${memoryMB.toFixed(2)}MB`);
      this.suggestCleanup();
    }
  }

  suggestCleanup() {
    console.log('[MemoryLeakMonitor] Suggesting cleanup actions:');
    console.log('1. Clear component state');
    console.log('2. Abort pending requests');
    console.log('3. Clear cached data');
    console.log('4. Force garbage collection');
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  getStats() {
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
      trend: max - min
    };
  }

  clearHistory() {
    this.memoryHistory = [];
  }
}

// Create singleton instance
const memoryLeakMonitor = new MemoryLeakMonitor();

// Auto-start in development
if (import.meta.env.DEV) {
  memoryLeakMonitor.start();
}

export default memoryLeakMonitor; 