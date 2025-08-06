// Comprehensive Memory Management Utility
class MemoryManager {
  constructor() {
    this.isMonitoring = false;
    this.intervalId = null;
    this.memoryHistory = [];
    this.maxHistorySize = 30;
    this.threshold = 800; // MB
    this.cleanupCallbacks = new Set();
    this.lastCleanup = 0;
    this.cleanupCooldown = 30000; // 30 seconds
  }

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, 30000); // Check every 30 seconds - reduced frequency to prevent performance impact
    
    console.log('[MemoryManager] Started monitoring memory usage');
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('[MemoryManager] Stopped monitoring memory usage');
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
    if (this.memoryHistory.length >= 6) { // Check over 90 seconds
      const recent = this.memoryHistory.slice(-6);
      const first = recent[0].memoryMB;
      const last = recent[recent.length - 1].memoryMB;
      const increase = last - first;
      
      if (increase > 300) { // 300MB increase over 90 seconds
        console.warn(`[MemoryManager] Potential memory leak detected: ${increase.toFixed(2)}MB increase over 90s`);
        this.performCleanup();
      }
    }
    
    // Check for high memory usage
    if (memoryMB > this.threshold) {
      console.warn(`[MemoryManager] High memory usage: ${memoryMB.toFixed(2)}MB`);
      this.performCleanup();
    }
  }

  performCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupCooldown) {
      return; // Skip if cleanup was recent
    }
    
    this.lastCleanup = now;
    console.log('[MemoryManager] Performing comprehensive cleanup...');
    
    // Execute all registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[MemoryManager] Cleanup callback failed:', error);
      }
    });
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear memory history to free up space
    this.memoryHistory = [];
    
    console.log('[MemoryManager] Cleanup completed');
  }

  registerCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
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

  // Utility method to clear common memory sources
  clearCommonCaches() {
    // Clear any global caches
    if (window.movieDetailsCache) {
      delete window.movieDetailsCache;
    }
    
    // Clear any localStorage caches if they're too large
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('cache') || key.includes('temp')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[MemoryManager] Failed to clear localStorage:', error);
    }
    
    // Clear any sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('[MemoryManager] Failed to clear sessionStorage:', error);
    }
  }
}

// Create singleton instance
const memoryManager = new MemoryManager();

// Auto-start in development
if (import.meta.env.DEV) {
  memoryManager.start();
}

export default memoryManager; 