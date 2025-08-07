// MovieDetailsOverlay Memory Optimizer
// Specialized memory management for the MovieDetailsOverlay component

class MovieDetailsMemoryOptimizer {
  constructor() {
    this.isActive = false;
    this.cleanupCallbacks = new Set();
    this.memoryCheckInterval = null;
    this.performanceMetrics = [];
    this.maxMetrics = 30; // Reduced from 50 to 30
    this.memoryThresholds = {
      warning: 250, // MB
      critical: 400, // MB
      emergency: 600  // MB
    };
    this.cleanupInterval = 30000; // 30 seconds
  }

  // Start memory monitoring
  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('[MovieDetailsMemoryOptimizer] Starting memory monitoring');
    
    // Monitor memory usage
    if (performance.memory) {
      this.memoryCheckInterval = setInterval(() => {
        this.checkMemoryUsage();
      }, this.cleanupInterval);
    }
  }

  // Stop memory monitoring
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    console.log('[MovieDetailsMemoryOptimizer] Stopping memory monitoring');
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  // Check current memory usage and trigger cleanup if needed
  checkMemoryUsage() {
    if (!performance.memory) return;
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    const timestamp = Date.now();
    
    // Store performance metric
    this.performanceMetrics.push({
      memory: memoryMB,
      timestamp,
      type: 'memory_check'
    });
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetrics);
    }
    
    // Check thresholds and trigger cleanup
    if (memoryMB > this.memoryThresholds.emergency) {
      console.error(`[MovieDetailsMemoryOptimizer] EMERGENCY: Memory usage ${memoryMB.toFixed(2)}MB`);
      this.emergencyCleanup();
    } else if (memoryMB > this.memoryThresholds.critical) {
      console.warn(`[MovieDetailsMemoryOptimizer] CRITICAL: Memory usage ${memoryMB.toFixed(2)}MB`);
      this.criticalCleanup();
    } else if (memoryMB > this.memoryThresholds.warning) {
      console.warn(`[MovieDetailsMemoryOptimizer] WARNING: Memory usage ${memoryMB.toFixed(2)}MB`);
      this.warningCleanup();
    }
  }

  // Warning level cleanup
  warningCleanup() {
    // Clear performance metrics
    this.performanceMetrics = [];
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear image caches
    this.clearImageCaches();
  }

  // Critical level cleanup
  criticalCleanup() {
    this.warningCleanup();
    
    // Clear localStorage caches
    this.clearLocalStorageCaches();
    
    // Clear any global references
    this.clearGlobalReferences();
  }

  // Emergency level cleanup
  emergencyCleanup() {
    this.criticalCleanup();
    
    // Execute all registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[MovieDetailsMemoryOptimizer] Cleanup callback failed:', error);
      }
    });
    
    // Force aggressive cleanup
    this.aggressiveCleanup();
  }

  // Clear image caches
  clearImageCaches() {
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('image') || cacheName.includes('movie')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  }

  // Clear localStorage caches
  clearLocalStorageCaches() {
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
  }

  // Clear global references
  clearGlobalReferences() {
    if (typeof window !== 'undefined') {
      // Clear any global references that might be holding onto data
      if (window.movieDetailsCache) {
        delete window.movieDetailsCache;
      }
      if (window.movieDetailsOverlayRefs) {
        delete window.movieDetailsOverlayRefs;
      }
      if (window.movieDetailsPerformanceMetrics) {
        delete window.movieDetailsPerformanceMetrics;
      }
    }
  }

  // Aggressive cleanup for emergency situations
  aggressiveCleanup() {
    // Clear all intervals and timeouts
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    
    // Clear any remaining DOM references
    const elements = document.querySelectorAll('[data-movie-overlay]');
    elements.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  }

  // Register cleanup callback
  registerCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  // Get memory statistics
  getMemoryStats() {
    if (!performance.memory) return null;
    
    const current = performance.memory.usedJSHeapSize / 1024 / 1024;
    const peak = performance.memory.peakJSHeapSize / 1024 / 1024;
    const total = performance.memory.totalJSHeapSize / 1024 / 1024;
    
    return {
      current: current.toFixed(2),
      peak: peak.toFixed(2),
      total: total.toFixed(2),
      percentage: ((current / total) * 100).toFixed(1)
    };
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return [...this.performanceMetrics];
  }

  // Cleanup on destroy
  destroy() {
    this.stop();
    this.cleanupCallbacks.clear();
    this.performanceMetrics = [];
  }
}

// Create singleton instance
const movieDetailsMemoryOptimizer = new MovieDetailsMemoryOptimizer();

// Export for use in components
export default movieDetailsMemoryOptimizer;

// Export utility functions
export const optimizeMovieDetailsMemory = () => {
  console.log('[MovieDetailsMemoryOptimizer] Running memory optimization');
  
  // Get current memory stats
  const stats = movieDetailsMemoryOptimizer.getMemoryStats();
  if (stats) {
    console.log(`Memory stats: ${stats.current}MB / ${stats.total}MB (${stats.percentage}%)`);
  }
  
  // Run cleanup
  movieDetailsMemoryOptimizer.warningCleanup();
  
  return stats;
};

// Export memory monitoring function
export const monitorMovieDetailsMemory = (duration = 60000) => {
  const startTime = Date.now();
  const memoryReadings = [];
  
  const interval = setInterval(() => {
    if (performance.memory) {
      const memory = performance.memory.usedJSHeapSize / 1024 / 1024;
      memoryReadings.push({
        time: Date.now() - startTime,
        memory: memory
      });
      
      console.log(`MovieDetails Memory at ${Date.now() - startTime}ms: ${memory.toFixed(2)}MB`);
    }
  }, 10000); // Every 10 seconds
  
  setTimeout(() => {
    clearInterval(interval);
    
    if (memoryReadings.length > 1) {
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];
      const memoryIncrease = lastReading.memory - firstReading.memory;
      
      console.log(`📊 MovieDetails Memory monitoring results:`);
      console.log(`   Duration: ${duration / 1000}s`);
      console.log(`   Initial memory: ${firstReading.memory.toFixed(2)}MB`);
      console.log(`   Final memory: ${lastReading.memory.toFixed(2)}MB`);
      console.log(`   Memory change: ${memoryIncrease.toFixed(2)}MB`);
      
      if (memoryIncrease > 50) {
        console.warn(`⚠️  Significant memory increase detected: ${memoryIncrease.toFixed(2)}MB`);
      } else {
        console.log(`✅ Memory usage stable (increase < 50MB)`);
      }
    }
  }, duration);
  
  return () => clearInterval(interval);
}; 