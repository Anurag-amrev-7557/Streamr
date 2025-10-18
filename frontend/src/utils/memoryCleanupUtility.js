// Comprehensive Memory Cleanup Utility
// This utility provides centralized memory management and cleanup functions

class MemoryCleanupUtility {
  constructor() {
    this.cleanupCallbacks = new Set();
    this.intervalId = null;
    this.isMonitoring = false;
    this.memoryThreshold = 1200; // FIXED: Increased from 800MB to 1200MB to reduce false positives
    this.cleanupInterval = 600000; // FIXED: Increased from 5 minutes to 10 minutes
    this.lastCleanup = Date.now();
  }

  // Start memory monitoring - MEMORY LEAK FIX
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, 300000); // FIXED: Check every 5 minutes instead of every minute
    
    console.log('[MemoryCleanupUtility] Memory monitoring started (5-minute intervals)');
  }

  // Stop memory monitoring
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('[MemoryCleanupUtility] Memory monitoring stopped');
  }

  // Check memory usage and perform cleanup if needed
  checkMemoryUsage() {
    if (!performance.memory) return;
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    const now = Date.now();
    
    // Perform cleanup if memory usage is high or enough time has passed
    if (memoryMB > this.memoryThreshold || (now - this.lastCleanup) > this.cleanupInterval) {
      this.performCleanup();
      this.lastCleanup = now;
    }
  }

  // Perform comprehensive cleanup
  performCleanup() {
    console.log('[MemoryCleanupUtility] Performing comprehensive cleanup...');
    
    // Execute all registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[MemoryCleanupUtility] Cleanup callback failed:', error);
      }
    });
    
    // Clear browser caches
    this.clearBrowserCaches();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    console.log('[MemoryCleanupUtility] Cleanup completed');
  }

  // Clear browser caches
  clearBrowserCaches() {
    // Clear image cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('image-cache') || cacheName.includes('api-cache')) {
            caches.delete(cacheName);
          }
        });
      });
    }
    
    // Clear localStorage if it's getting too large
    try {
      const localStorageSize = JSON.stringify(localStorage).length;
      if (localStorageSize > 1024 * 1024) { // 1MB
        console.warn('[MemoryCleanupUtility] localStorage size is large, clearing old data');
        this.clearOldLocalStorageData();
      }
    } catch (error) {
      console.warn('[MemoryCleanupUtility] Error checking localStorage size:', error);
    }
  }

  // Clear old localStorage data
  clearOldLocalStorageData() {
    const keysToKeep = ['user', 'accessToken', 'refreshToken', 'theme'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            // Check if item is old (older than 24 hours)
            const data = JSON.parse(item);
            if (data.timestamp && (Date.now() - data.timestamp) > 24 * 60 * 60 * 1000) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // If item is not JSON, remove it
          localStorage.removeItem(key);
        }
      }
    });
  }

  // Register a cleanup callback
  registerCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  // Cleanup specific resources
  cleanupResources() {
    // Clear all timeouts
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
    
    // Clear all intervals
    const highestIntervalId = setInterval(() => {}, 0);
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    }
    
    // Clear a reasonable number of recent RAFs if present using cancelRaf
    try {
      // Attempt to cancel a small, safe window of recent ids
      const maxToCancel = 20;
      for (let i = 0; i < maxToCancel; i++) {
        try { cancelRaf(i); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // If scheduler isn't available, fallback to no-op
    }
  }

  // Cleanup event listeners
  cleanupEventListeners() {
    // This is a more aggressive cleanup - use with caution
    const events = ['resize', 'scroll', 'mousemove', 'keydown', 'keyup', 'click'];
    events.forEach(event => {
      // Remove all listeners for common events
      window.removeEventListener(event, null, true);
      window.removeEventListener(event, null, false);
    });
  }

  // Get memory statistics
  getMemoryStats() {
    if (!performance.memory) {
      return {
        available: false,
        message: 'Memory API not available'
      };
    }
    
    return {
      available: true,
      used: performance.memory.usedJSHeapSize / 1024 / 1024,
      total: performance.memory.totalJSHeapSize / 1024 / 1024,
      limit: performance.memory.jsHeapSizeLimit / 1024 / 1024,
      percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    };
  }

  // Cleanup on page unload
  cleanupOnUnload() {
    this.stopMonitoring();
    this.performCleanup();
    this.cleanupResources();
  }
}

// Create singleton instance
const memoryCleanupUtility = new MemoryCleanupUtility();

// Start monitoring when the utility is imported - MEMORY LEAK FIX
if (typeof window !== 'undefined') {
  // FIXED: Only start monitoring in development with debug flag
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
    // Start monitoring after a short delay to allow app initialization
    setTimeout(() => {
      memoryCleanupUtility.startMonitoring();
    }, 5000);
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    memoryCleanupUtility.cleanupOnUnload();
  });
  
  // Cleanup on page visibility change - MEMORY LEAK FIX
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
      // Page is hidden, perform light cleanup only in development
      memoryCleanupUtility.checkMemoryUsage();
    }
  });
}

export default memoryCleanupUtility; 