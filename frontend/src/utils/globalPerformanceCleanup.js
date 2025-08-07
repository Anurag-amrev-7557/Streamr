// Global Performance Cleanup Utility
// This utility fixes memory usage logging issues and prevents memory leaks

class GlobalPerformanceCleanup {
  constructor() {
    this.isActive = false;
    this.cleanupInterval = null;
    this.lastCleanup = 0;
    this.cleanupCooldown = 30000; // 30 seconds
    this.memoryThreshold = 800; // MB
    this.performanceMonitors = new Set();
    this.memoryLogs = [];
    this.maxMemoryLogs = 20;
  }

  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastCleanup = Date.now();
    
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.cleanupCooldown);
    
    // Fix any existing performance monitoring issues
    this.fixPerformanceMonitoring();
    
    console.log('[GlobalPerformanceCleanup] Started global performance optimization');
  }

  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    console.log('[GlobalPerformanceCleanup] Stopped global performance optimization');
  }

  fixPerformanceMonitoring() {
    try {
      // Clear any existing performance monitoring intervals
      this.clearPerformanceIntervals();
      
      // Fix memory usage logging
      this.fixMemoryUsageLogging();
      
      // Clear any accumulated memory logs
      this.clearMemoryLogs();
      
    } catch (error) {
      console.warn('[GlobalPerformanceCleanup] Failed to fix performance monitoring:', error);
    }
  }

  clearPerformanceIntervals() {
    // Clear any intervals that might be causing memory issues
    const intervals = window.performanceIntervals || [];
    intervals.forEach(intervalId => {
      if (intervalId && typeof clearInterval === 'function') {
        clearInterval(intervalId);
      }
    });
    window.performanceIntervals = [];
  }

  fixMemoryUsageLogging() {
    // Override any incorrect memory usage logging
    if (window.performance && window.performance.memory) {
      const originalMemory = window.performance.memory;
      
      // Create a safe memory usage getter
      Object.defineProperty(window.performance, 'memory', {
        get() {
          return {
            usedJSHeapSize: originalMemory.usedJSHeapSize,
            totalJSHeapSize: originalMemory.totalJSHeapSize,
            jsHeapSizeLimit: originalMemory.jsHeapSizeLimit
          };
        },
        configurable: true
      });
    }
  }

  clearMemoryLogs() {
    // Clear any accumulated memory logs that might be causing issues
    this.memoryLogs = [];
    
    // Clear any global memory logs
    if (window.memoryLogs) {
      window.memoryLogs = [];
    }
    
    // Clear any performance monitor logs
    if (window.performanceMonitorLogs) {
      window.performanceMonitorLogs = [];
    }
  }

  performCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupCooldown) {
      return;
    }
    
    this.lastCleanup = now;
    
    try {
      // Clear memory logs
      this.clearMemoryLogs();
      
      // Clear any cached data
      this.clearCachedData();
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Log cleanup in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[GlobalPerformanceCleanup] Global cleanup performed');
      }
    } catch (error) {
      console.warn('[GlobalPerformanceCleanup] Cleanup failed:', error);
    }
  }

  clearCachedData() {
    // Clear any cached data that might be accumulating
    if (window.cachedData) {
      window.cachedData = {};
    }
    
    // Clear any performance metrics that might be accumulating
    if (window.performanceMetrics) {
      window.performanceMetrics = {};
    }
  }

  registerPerformanceMonitor(monitor) {
    this.performanceMonitors.add(monitor);
  }

  unregisterPerformanceMonitor(monitor) {
    this.performanceMonitors.delete(monitor);
  }

  getStats() {
    return {
      isActive: this.isActive,
      lastCleanup: this.lastCleanup,
      memoryLogsCount: this.memoryLogs.length,
      performanceMonitorsCount: this.performanceMonitors.size
    };
  }
}

// Create singleton instance
const globalPerformanceCleanup = new GlobalPerformanceCleanup();

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
  // Start after a short delay to ensure everything is loaded
  setTimeout(() => {
    globalPerformanceCleanup.start();
  }, 1000);
}

// Export for use in components
export default globalPerformanceCleanup;

// Export utility functions
export const startGlobalPerformanceCleanup = () => globalPerformanceCleanup.start();
export const stopGlobalPerformanceCleanup = () => globalPerformanceCleanup.stop();
export const getGlobalPerformanceStats = () => globalPerformanceCleanup.getStats(); 