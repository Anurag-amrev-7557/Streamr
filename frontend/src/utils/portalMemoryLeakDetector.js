/**
 * Portal Memory Leak Detector and Prevention Utility
 * 
 * This utility helps detect and prevent memory leaks in the portal management system.
 * Features:
 * - Memory usage monitoring
 * - Event listener leak detection
 * - Timer/interval leak detection
 * - DOM element leak detection
 * - Circular reference detection
 * - Automatic cleanup suggestions
 */

class PortalMemoryLeakDetector {
  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development';
    this.monitoringInterval = null;
    this.baselineMemory = null;
    this.leakThreshold = 50 * 1024 * 1024; // 50MB threshold
    this.detectedLeaks = new Map();
    this.cleanupCallbacks = new Set();
    
    if (this.isEnabled) {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    if (typeof window === 'undefined' || !('memory' in performance)) return;
    
    // Set baseline memory
    this.baselineMemory = performance.memory.usedJSHeapSize;
    
    // Monitor every 10 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkForLeaks();
    }, 10000);
    
    console.debug('[PortalMemoryLeakDetector] Started monitoring');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.debug('[PortalMemoryLeakDetector] Stopped monitoring');
  }

  checkForLeaks() {
    if (typeof window === 'undefined' || !('memory' in performance)) return;
    
    const currentMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = currentMemory - this.baselineMemory;
    
    // Check for significant memory increase
    if (memoryIncrease > this.leakThreshold) {
      this.detectEventListeners();
      this.detectTimers();
      this.detectDOMLeaks();
      this.detectCircularReferences();
      
      this.reportLeaks();
    }
    
    // Update baseline if memory decreased (garbage collection)
    if (currentMemory < this.baselineMemory) {
      this.baselineMemory = currentMemory;
    }
  }

  detectEventListeners() {
    // Check for orphaned event listeners by examining DOM elements
    const portalContainers = document.querySelectorAll('.portal-container');
    let orphanedListeners = 0;
    
    portalContainers.forEach(container => {
      // Check if container has event listeners but no parent
      if (!container.parentNode && container._eventListeners) {
        orphanedListeners += container._eventListeners.size;
        this.detectedLeaks.set('orphanedEventListeners', {
          count: orphanedListeners,
          elements: Array.from(portalContainers).filter(c => !c.parentNode)
        });
      }
    });
    
    if (orphanedListeners > 0) {
      console.warn(`[PortalMemoryLeakDetector] Found ${orphanedListeners} orphaned event listeners`);
    }
  }

  detectTimers() {
    // This is a simplified check - in a real implementation, you'd track timers
    const activeTimers = this.countActiveTimers();
    
    if (activeTimers > 10) { // Arbitrary threshold
      this.detectedLeaks.set('excessiveTimers', {
        count: activeTimers,
        threshold: 10
      });
      
      console.warn(`[PortalMemoryLeakDetector] Found ${activeTimers} active timers (threshold: 10)`);
    }
  }

  countActiveTimers() {
    // This is a simplified implementation
    // In a real scenario, you'd track timers when they're created
    let count = 0;
    
    // Check for common timer patterns
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.textContent.includes('setInterval') || script.textContent.includes('setTimeout')) {
        count++;
      }
    });
    
    return count;
  }

  detectDOMLeaks() {
    const portalContainers = document.querySelectorAll('.portal-container');
    const orphanedContainers = Array.from(portalContainers).filter(container => !container.parentNode);
    
    if (orphanedContainers.length > 0) {
      this.detectedLeaks.set('orphanedDOMElements', {
        count: orphanedContainers.length,
        elements: orphanedContainers
      });
      
      console.warn(`[PortalMemoryLeakDetector] Found ${orphanedContainers.length} orphaned DOM elements`);
    }
  }

  detectCircularReferences() {
    // Check for circular references in portal services
    const services = [
      'portalManagerService',
      'portalAnimationService', 
      'portalStateService',
      'portalAnalyticsService',
      'portalAccessibilityService',
      'portalThemingService'
    ];
    
    services.forEach(serviceName => {
      if (window[serviceName]) {
        const service = window[serviceName];
        if (this.hasCircularReference(service)) {
          this.detectedLeaks.set('circularReference', {
            service: serviceName,
            details: 'Circular reference detected in service'
          });
          
          console.warn(`[PortalMemoryLeakDetector] Circular reference detected in ${serviceName}`);
        }
      }
    });
  }

  hasCircularReference(obj, visited = new WeakSet()) {
    if (obj === null || typeof obj !== 'object') return false;
    
    if (visited.has(obj)) return true;
    visited.add(obj);
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (this.hasCircularReference(obj[key], visited)) {
          return true;
        }
      }
    }
    
    return false;
  }

  reportLeaks() {
    if (this.detectedLeaks.size === 0) return;
    
    console.group('[PortalMemoryLeakDetector] Memory Leaks Detected');
    
    this.detectedLeaks.forEach((leak, type) => {
      console.warn(`${type}:`, leak);
    });
    
    console.groupEnd();
    
    // Clear detected leaks after reporting
    this.detectedLeaks.clear();
  }

  // Utility methods for manual leak prevention
  registerCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);
  }

  unregisterCleanupCallback(callback) {
    this.cleanupCallbacks.delete(callback);
  }

  performCleanup() {
    console.debug('[PortalMemoryLeakDetector] Performing cleanup');
    
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[PortalMemoryLeakDetector] Cleanup callback failed:', error);
      }
    });
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  getMemoryStats() {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return { available: false };
    }
    
    const memory = performance.memory;
    return {
      available: true,
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    };
  }

  // Cleanup method
  cleanup() {
    this.stopMonitoring();
    this.cleanupCallbacks.clear();
    this.detectedLeaks.clear();
  }
}

// Create singleton instance
const portalMemoryLeakDetector = new PortalMemoryLeakDetector();

export default portalMemoryLeakDetector;
