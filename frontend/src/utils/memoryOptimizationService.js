// Memory Optimization Service
// Centralized memory management to prevent conflicts and reduce overhead

class MemoryOptimizationService {
  constructor() {
    this.isMonitoring = false;
    this.intervalId = null;
    this.memoryHistory = [];
    this.maxHistorySize = 20;
    this.threshold = 400; // MB - Reduced threshold for earlier intervention
    this.criticalThreshold = 600; // MB - Reduced critical threshold
    this.cleanupCallbacks = new Set();
    this.lastCleanup = 0;
    this.cleanupCooldown = 30000; // 30 seconds - More frequent cleanup
    this.monitoringInterval = 30000; // 30 seconds - More frequent monitoring
    this.registeredComponents = new Set();
    this.memoryLeakThreshold = 200; // MB - Detect leaks with smaller increases
    this.emergencyMode = false;
    this.cleanupStats = {
      totalCleanups: 0,
      lastCleanupTime: 0,
      memoryFreed: 0
    };
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
    
    // Initial memory check
    this.checkMemory();
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
    if (!performance.memory) {
      console.warn('[MemoryOptimizationService] Performance.memory not available');
      return;
    }
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    const memoryLimitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
    const timestamp = Date.now();
    
    // Log memory usage with proper formatting
    console.log(`[MemoryOptimizationService] Memory usage: ${memoryMB.toFixed(2)}MB / ${memoryLimitMB.toFixed(2)}MB`);
    
    this.memoryHistory.push({ memoryMB, timestamp });
    
    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
    
    // Check for memory leaks (continuous increase)
    if (this.memoryHistory.length >= 3) {
      const recent = this.memoryHistory.slice(-3);
      const first = recent[0].memoryMB;
      const last = recent[recent.length - 1].memoryMB;
      const increase = last - first;
      
      if (increase > this.memoryLeakThreshold) {
        console.warn(`[MemoryOptimizationService] Potential memory leak detected: ${increase.toFixed(2)}MB increase over ${this.monitoringInterval / 1000}s`);
        this.performCleanup();
      }
    }
    
    // Check for high memory usage
    if (memoryMB > this.criticalThreshold) {
      console.error(`[MemoryOptimizationService] Critical memory usage: ${memoryMB.toFixed(2)}MB`);
      this.emergencyMode = true;
      this.performEmergencyCleanup();
    } else if (memoryMB > this.threshold) {
      console.warn(`[MemoryOptimizationService] High memory usage: ${memoryMB.toFixed(2)}MB`);
      this.performCleanup();
    } else if (this.emergencyMode && memoryMB < this.threshold * 0.8) {
      console.log(`[MemoryOptimizationService] Memory usage normalized: ${memoryMB.toFixed(2)}MB`);
      this.emergencyMode = false;
    }
    
    // Force garbage collection if available
    if (window.gc && memoryMB > this.threshold) {
      try {
        window.gc();
        console.log('[MemoryOptimizationService] Forced garbage collection');
      } catch (error) {
        console.warn('[MemoryOptimizationService] Failed to force garbage collection:', error);
      }
    }
  }

  performCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupCooldown) {
      return; // Skip if cleanup was recent
    }
    
    this.lastCleanup = now;
    this.cleanupStats.totalCleanups++;
    this.cleanupStats.lastCleanupTime = now;
    
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
    
    // Clear browser caches
    this.clearBrowserCaches();
    
    // Clear all application caches
    this.clearAllCaches();
    
    console.log('[MemoryOptimizationService] Cleanup completed');
  }

  performEmergencyCleanup() {
    console.error('[MemoryOptimizationService] Performing EMERGENCY cleanup...');
    
    // Immediate aggressive cleanup
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[MemoryOptimizationService] Emergency cleanup callback failed:', error);
      }
    });
    
    // Clear all caches immediately
    this.clearAllCaches();
    this.clearBrowserCaches();
    
    // Clear memory history
    this.memoryHistory = [];
    
    // Force garbage collection multiple times
    if (window.gc) {
      for (let i = 0; i < 3; i++) {
        try {
          window.gc();
        } catch (error) {
          console.warn('[MemoryOptimizationService] Emergency GC failed:', error);
        }
      }
    }
    
    // Clear all timeouts and intervals
    this.clearAllTimers();
    
    console.error('[MemoryOptimizationService] Emergency cleanup completed');
  }

  clearAllCaches() {
    try {
      // Clear localStorage if it's getting large
      if (localStorage.length > 100) {
        const keysToKeep = ['user', 'auth', 'settings'];
        const keysToRemove = Object.keys(localStorage).filter(key => !keysToKeep.includes(key));
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('[MemoryOptimizationService] Cleared localStorage items:', keysToRemove.length);
      }
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any application-level caches
      if (window.__APP_CACHE__) {
        window.__APP_CACHE__.clear();
      }
      
      // Clear image caches
      this.clearImageCaches();
      
    } catch (error) {
      console.warn('[MemoryOptimizationService] Failed to clear caches:', error);
    }
  }

  clearImageCaches() {
    try {
      // Clear image cache by removing cached images from DOM
      const images = document.querySelectorAll('img[data-cached]');
      images.forEach(img => {
        img.src = '';
        img.removeAttribute('src');
        img.removeAttribute('data-cached');
      });
      
      // Clear any image preload links
      const preloadLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      preloadLinks.forEach(link => link.remove());
      
    } catch (error) {
      console.warn('[MemoryOptimizationService] Failed to clear image caches:', error);
    }
  }

  clearBrowserCaches() {
    try {
      // Clear browser caches if available
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }
      
      // Clear IndexedDB if it's getting large
      if ('indexedDB' in window) {
        // This would need to be implemented based on your IndexedDB usage
        console.log('[MemoryOptimizationService] IndexedDB cleanup available');
      }
      
    } catch (error) {
      console.warn('[MemoryOptimizationService] Failed to clear browser caches:', error);
    }
  }

  clearAllTimers() {
    try {
      // Clear all timeouts and intervals
      const highestTimeoutId = setTimeout(() => {}, 0);
      const highestIntervalId = setInterval(() => {}, 0);
      
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }
      
      for (let i = 0; i < highestIntervalId; i++) {
        clearInterval(i);
      }
      
    } catch (error) {
      console.warn('[MemoryOptimizationService] Failed to clear timers:', error);
    }
  }

  registerCleanupCallback(callback, componentName = 'unknown') {
    this.cleanupCallbacks.add(callback);
    console.log(`[MemoryOptimizationService] Registered cleanup callback for: ${componentName}`);
    
    return () => {
      this.cleanupCallbacks.delete(callback);
      console.log(`[MemoryOptimizationService] Unregistered cleanup callback for: ${componentName}`);
    };
  }

  getStats() {
    const currentMemory = this.getCurrentMemoryUsage();
    return {
      isMonitoring: this.isMonitoring,
      currentMemory: currentMemory,
      threshold: this.threshold,
      criticalThreshold: this.criticalThreshold,
      memoryHistory: this.memoryHistory.length,
      registeredComponents: this.registeredComponents.size,
      cleanupCallbacks: this.cleanupCallbacks.size,
      emergencyMode: this.emergencyMode,
      cleanupStats: this.cleanupStats
    };
  }

  isMemoryUsageAcceptable() {
    const currentMemory = this.getCurrentMemoryUsage();
    return currentMemory < this.threshold;
  }

  getCurrentMemoryUsage() {
    if (!performance.memory) return 0;
    return performance.memory.usedJSHeapSize / 1024 / 1024;
  }

  registerComponent(componentName) {
    this.registeredComponents.add(componentName);
    console.log(`[MemoryOptimizationService] Registered component: ${componentName}`);
  }

  unregisterComponent(componentName) {
    this.registeredComponents.delete(componentName);
    console.log(`[MemoryOptimizationService] Unregistered component: ${componentName}`);
  }

  // New method to optimize React component memory usage
  optimizeReactComponent(componentRef, cleanupCallback) {
    if (!componentRef || !componentRef.current) return;
    
    const component = componentRef.current;
    
    // Clear any stored state or refs
    if (component.state) {
      component.setState({}, () => {
        // Clear state after setState callback
        if (component.state && typeof component.state === 'object') {
          Object.keys(component.state).forEach(key => {
            if (component.state[key] && typeof component.state[key] === 'object') {
              component.state[key] = null;
            }
          });
        }
      });
    }
    
    // Clear any refs
    if (component.refs) {
      Object.keys(component.refs).forEach(key => {
        component.refs[key] = null;
      });
    }
    
    // Execute custom cleanup callback
    if (cleanupCallback) {
      cleanupCallback();
    }
  }

  // New method to monitor specific memory-intensive operations
  monitorOperation(operationName, operation) {
    const startMemory = this.getCurrentMemoryUsage();
    const startTime = performance.now();
    
    try {
      const result = operation();
      const endTime = performance.now();
      const endMemory = this.getCurrentMemoryUsage();
      const memoryDelta = endMemory - startMemory;
      const duration = endTime - startTime;
      
      console.log(`[MemoryOptimizationService] Operation "${operationName}": ${duration.toFixed(2)}ms, memory delta: ${memoryDelta.toFixed(2)}MB`);
      
      if (memoryDelta > 50) {
        console.warn(`[MemoryOptimizationService] High memory usage in operation "${operationName}": ${memoryDelta.toFixed(2)}MB`);
      }
      
      return result;
    } catch (error) {
      console.error(`[MemoryOptimizationService] Operation "${operationName}" failed:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const memoryOptimizationService = new MemoryOptimizationService();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  memoryOptimizationService.start();
}

export default memoryOptimizationService; 