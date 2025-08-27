// MovieDetailsOverlay Memory Optimizer
// Specialized memory management for MovieDetailsOverlay component

class MovieDetailsMemoryOptimizer {
  constructor() {
    this.isMonitoring = false;
    this.intervalId = null;
    this.memoryHistory = [];
    this.maxHistorySize = 20;
    this.threshold = 100; // MB - More aggressive threshold for MovieDetailsOverlay (reduced from 150)
    this.criticalThreshold = 200; // MB - More aggressive critical threshold (reduced from 250)
    this.cleanupCallbacks = new Set();
    this.lastCleanup = 0;
    this.cleanupCooldown = 30000; // 30 seconds - Less frequent cleanup to reduce overhead
    this.cacheSize = 0;
    this.maxCacheSize = 10; // Further reduced cache size
  }

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, 30000); // Check every 30 seconds - optimized frequency to reduce performance impact
    
    console.log('[MovieDetailsMemoryOptimizer] Started monitoring memory usage');
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('[MovieDetailsMemoryOptimizer] Stopped monitoring memory usage');
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
    if (this.memoryHistory.length >= 4) { // Check over 40 seconds
      const recent = this.memoryHistory.slice(-4);
      const first = recent[0].memoryMB;
      const last = recent[recent.length - 1].memoryMB;
      const increase = last - first;
      
      if (increase > 150) { // 150MB increase over 40 seconds (reduced from 200)
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
          console.warn(`[MovieDetailsMemoryOptimizer] Potential memory leak detected: ${increase.toFixed(2)}MB increase over 40s`);
        }
        this.performCleanup();
      }
    }
    
    // Check for high memory usage
    if (memoryMB > this.criticalThreshold) {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
        console.error(`[MovieDetailsMemoryOptimizer] Critical memory usage: ${memoryMB.toFixed(2)}MB`);
      }
      this.performEmergencyCleanup();
    } else if (memoryMB > this.threshold) {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
        console.warn(`[MovieDetailsMemoryOptimizer] High memory usage: ${memoryMB.toFixed(2)}MB`);
      }
      this.performCleanup();
    }
  }

  performCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupCooldown) {
      return; // Skip if cleanup was recent
    }
    
    this.lastCleanup = now;
    console.log('[MovieDetailsMemoryOptimizer] Performing cleanup...');
    
    // Execute all registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[MovieDetailsMemoryOptimizer] Cleanup callback failed:', error);
      }
    });
    
    // Clear memory history to free up space
    this.memoryHistory = [];
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    console.log('[MovieDetailsMemoryOptimizer] Cleanup completed');
  }

  performEmergencyCleanup() {
    console.error('[MovieDetailsMemoryOptimizer] Performing emergency cleanup...');
    
    // Clear all caches immediately
    this.clearAllCaches();
    
    // Execute all cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[MovieDetailsMemoryOptimizer] Emergency cleanup callback failed:', error);
      }
    });
    
    // Clear memory history
    this.memoryHistory = [];
    
    // Force garbage collection
    if (window.gc) {
      window.gc();
    }
    
    // Clear browser caches
    this.clearBrowserCaches();
    
    console.error('[MovieDetailsMemoryOptimizer] Emergency cleanup completed');
  }

  clearAllCaches() {
    // Clear any global caches
    if (window.movieDetailsCache) {
      delete window.movieDetailsCache;
    }
    
    // Clear localStorage caches
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('movie') || key.includes('cache') || key.includes('temp')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[MovieDetailsMemoryOptimizer] Failed to clear localStorage:', error);
    }
    
    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('[MovieDetailsMemoryOptimizer] Failed to clear sessionStorage:', error);
    }
  }

  clearBrowserCaches() {
    // Clear image caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('image') || cacheName.includes('movie')) {
            caches.delete(cacheName);
          }
        });
      });
    }
    
    // Clear any remaining references
    if (typeof window !== 'undefined') {
      // Clear any global variables that might be holding references
      const globalVars = ['movieDetailsCache', 'imageCache', 'tempCache'];
      globalVars.forEach(varName => {
        if (window[varName]) {
          delete window[varName];
        }
      });
    }
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
      trend: max - min,
      cacheSize: this.cacheSize
    };
  }

  clearHistory() {
    this.memoryHistory = [];
  }

  // Utility method to check if memory usage is acceptable
  isMemoryUsageAcceptable() {
    if (!performance.memory) return true;
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    return memoryMB < this.threshold;
  }

  // Utility method to get current memory usage
  getCurrentMemoryUsage() {
    if (!performance.memory) return 0;
    return performance.memory.usedJSHeapSize / 1024 / 1024;
  }
}

// Create singleton instance
const movieDetailsMemoryOptimizer = new MovieDetailsMemoryOptimizer();

// Auto-start in development
if (import.meta.env.DEV) {
  movieDetailsMemoryOptimizer.start();
}

export default movieDetailsMemoryOptimizer; 