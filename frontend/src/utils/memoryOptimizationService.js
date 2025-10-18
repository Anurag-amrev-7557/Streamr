// Memory Optimization Service
// Centralized memory management to prevent conflicts and reduce overhead

class MemoryOptimizationService {
  constructor() {
    this.isMonitoring = false;
    this.intervalId = null;
    this.memoryHistory = [];
    this.maxHistorySize = 20;
    this.threshold = 500; // MB - Single threshold for all components
    this.criticalThreshold = 800; // MB
    this.cleanupCallbacks = new Set();
    this.lastCleanup = 0;
    this.cleanupCooldown = 60000; // 60 seconds - Less frequent cleanup
    this.monitoringInterval = 45000; // 45 seconds - Less frequent monitoring
    this.registeredComponents = new Set();
  }

  start() {
    if (this.isMonitoring) {
      console.log('[MemoryOptimizationService] Already monitoring memory usage');
      return;
    }
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemory();
    }, this.monitoringInterval);
    
    console.log('[MemoryOptimizationService] Started centralized memory monitoring');
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('[MemoryOptimizationService] Stopped memory monitoring');
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
    if (this.memoryHistory.length >= 3) { // Check over 2+ minutes
      const recent = this.memoryHistory.slice(-3);
      const first = recent[0].memoryMB;
      const last = recent[recent.length - 1].memoryMB;
      const increase = last - first;
      
      if (increase > 300) { // 300MB increase over 2+ minutes
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
          console.warn(`[MemoryOptimizationService] Potential memory leak detected: ${increase.toFixed(2)}MB increase`);
        }
        this.performCleanup();
      }
    }
    
    // Check for high memory usage
    if (memoryMB > this.criticalThreshold) {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
        console.error(`[MemoryOptimizationService] Critical memory usage: ${memoryMB.toFixed(2)}MB`);
      }
      this.performEmergencyCleanup();
    } else if (memoryMB > this.threshold) {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
        console.warn(`[MemoryOptimizationService] High memory usage: ${memoryMB.toFixed(2)}MB`);
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
    console.log('[MemoryOptimizationService] Performing cleanup...');
    
    // Execute all registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[MemoryOptimizationService] Cleanup callback failed:', error);
      }
    });
    
    // Clear memory history to free up space
    this.memoryHistory = [];
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    console.log('[MemoryOptimizationService] Cleanup completed');
  }

  performEmergencyCleanup() {
    console.error('[MemoryOptimizationService] Performing emergency cleanup...');
    
    // Clear all caches immediately
    this.clearAllCaches();
    
    // Execute all cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[MemoryOptimizationService] Emergency cleanup callback failed:', error);
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
    
    console.error('[MemoryOptimizationService] Emergency cleanup completed');
  }

  clearAllCaches() {
    // Clear any global caches
    const globalCaches = ['movieDetailsCache', 'imageCache', 'tempCache', 'movieCache'];
    globalCaches.forEach(cacheName => {
      if (window[cacheName]) {
        delete window[cacheName];
      }
    });
    
    // Clear localStorage caches
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('movie') || key.includes('cache') || key.includes('temp')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[MemoryOptimizationService] Failed to clear localStorage:', error);
    }
    
    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('[MemoryOptimizationService] Failed to clear sessionStorage:', error);
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
  }

  registerCleanupCallback(callback, componentName = 'unknown') {
    this.cleanupCallbacks.add(callback);
    this.registeredComponents.add(componentName);
    
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`[MemoryOptimizationService] Registered cleanup callback for ${componentName}`);
    }
    
    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
      this.registeredComponents.delete(componentName);
      // Only log in development with debug flag
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
        console.log(`[MemoryOptimizationService] Unregistered cleanup callback for ${componentName}`);
      }
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
      registeredComponents: Array.from(this.registeredComponents)
    };
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

  // Method to register a component for monitoring
  registerComponent(componentName) {
    this.registeredComponents.add(componentName);
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`[MemoryOptimizationService] Registered component: ${componentName}`);
    }
  }

  // Method to unregister a component
  unregisterComponent(componentName) {
    this.registeredComponents.delete(componentName);
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`[MemoryOptimizationService] Unregistered component: ${componentName}`);
    }
  }
}

// Create singleton instance
const memoryOptimizationService = new MemoryOptimizationService();

// Auto-start in development
if (import.meta.env.DEV) {
  memoryOptimizationService.start();
}

export default memoryOptimizationService; 