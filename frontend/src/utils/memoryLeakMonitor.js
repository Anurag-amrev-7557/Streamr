/**
 * Memory Leak Monitor Utility
 * Provides comprehensive memory leak detection and monitoring
 */

class MemoryLeakMonitor {
  constructor() {
    this.observers = new Map();
    this.timeouts = new Map();
    this.intervals = new Map();
    this.eventListeners = new Map();
    this.performanceObservers = new Map();
    this.intersectionObservers = new Map();
    this.isMonitoring = false;
    this.memorySnapshots = [];
    this.leakThreshold = 10 * 1024 * 1024; // 10MB
    this.snapshotInterval = 30000; // 30 seconds
  }

  /**
   * Start memory leak monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🧠 Memory leak monitoring started');
    
    // Start periodic memory snapshots
    this.startMemorySnapshots();
    
    // Monitor for memory leaks
    this.monitorMemoryUsage();
    
    // Override global functions to track usage
    this.overrideGlobals();
  }

  /**
   * Stop memory leak monitoring
   */
  stop() {
    this.isMonitoring = false;
    
    // Clear all tracked resources
    this.clearAllResources();
    
    console.log('🧠 Memory leak monitoring stopped');
  }

  /**
   * Track a timeout
   */
  trackTimeout(id, callback, delay) {
    if (!this.isMonitoring) return id;
    
    this.timeouts.set(id, {
      callback,
      delay,
      timestamp: Date.now(),
      stack: new Error().stack
    });
    
    return id;
  }

  /**
   * Track an interval
   */
  trackInterval(id, callback, delay) {
    if (!this.isMonitoring) return id;
    
    this.intervals.set(id, {
      callback,
      delay,
      timestamp: Date.now(),
      stack: new Error().stack
    });
    
    return id;
  }

  /**
   * Track an event listener
   */
  trackEventListener(element, event, handler, options) {
    if (!this.isMonitoring) return;
    
    const key = `${element.constructor.name}_${event}_${Date.now()}`;
    this.eventListeners.set(key, {
      element,
      event,
      handler,
      options,
      timestamp: Date.now(),
      stack: new Error().stack
    });
    
    return key;
  }

  /**
   * Track a performance observer
   */
  trackPerformanceObserver(id, observer) {
    if (!this.isMonitoring) return;
    
    this.performanceObservers.set(id, {
      observer,
      timestamp: Date.now(),
      stack: new Error().stack
    });
  }

  /**
   * Track an intersection observer
   */
  trackIntersectionObserver(id, observer) {
    if (!this.isMonitoring) return;
    
    this.intersectionObservers.set(id, {
      observer,
      timestamp: Date.now(),
      stack: new Error().stack
    });
  }

  /**
   * Clear a specific timeout
   */
  clearTimeout(id) {
    if (this.timeouts.has(id)) {
      this.timeouts.delete(id);
    }
    return window.clearTimeout(id);
  }

  /**
   * Clear a specific interval
   */
  clearInterval(id) {
    if (this.intervals.has(id)) {
      this.intervals.delete(id);
    }
    return window.clearInterval(id);
  }

  /**
   * Remove a specific event listener
   */
  removeEventListener(key) {
    if (this.eventListeners.has(key)) {
      const { element, event, handler, options } = this.eventListeners.get(key);
      element.removeEventListener(event, handler, options);
      this.eventListeners.delete(key);
    }
  }

  /**
   * Disconnect a performance observer
   */
  disconnectPerformanceObserver(id) {
    if (this.performanceObservers.has(id)) {
      const { observer } = this.performanceObservers.get(id);
      observer.disconnect();
      this.performanceObservers.delete(id);
    }
  }

  /**
   * Disconnect an intersection observer
   */
  disconnectIntersectionObserver(id) {
    if (this.intersectionObservers.has(id)) {
      const { observer } = this.intersectionObservers.get(id);
      observer.disconnect();
      this.intersectionObservers.delete(id);
    }
  }

  /**
   * Clear all tracked resources
   */
  clearAllResources() {
    // Clear all timeouts
    this.timeouts.forEach((_, id) => {
      this.clearTimeout(id);
    });
    this.timeouts.clear();

    // Clear all intervals
    this.intervals.forEach((_, id) => {
      this.clearInterval(id);
    });
    this.intervals.clear();

    // Remove all event listeners
    this.eventListeners.forEach((_, key) => {
      this.removeEventListener(key);
    });
    this.eventListeners.clear();

    // Disconnect all performance observers
    this.performanceObservers.forEach((_, id) => {
      this.disconnectPerformanceObserver(id);
    });
    this.performanceObservers.clear();

    // Disconnect all intersection observers
    this.intersectionObservers.forEach((_, id) => {
      this.disconnectIntersectionObserver(id);
    });
    this.intersectionObservers.clear();
  }

  /**
   * Start periodic memory snapshots
   */
  startMemorySnapshots() {
    const snapshotInterval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(snapshotInterval);
        return;
      }

      this.takeMemorySnapshot();
    }, this.snapshotInterval);

    this.intervals.set(snapshotInterval, {
      callback: () => this.takeMemorySnapshot(),
      delay: this.snapshotInterval,
      timestamp: Date.now(),
      stack: 'Memory leak monitor'
    });
  }

  /**
   * Take a memory snapshot
   */
  takeMemorySnapshot() {
    if (!performance.memory) return;

    const snapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      timeouts: this.timeouts.size,
      intervals: this.intervals.size,
      eventListeners: this.eventListeners.size,
      performanceObservers: this.performanceObservers.size,
      intersectionObservers: this.intersectionObservers.size
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }

    // Check for memory leaks
    this.detectMemoryLeaks(snapshot);
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks(snapshot) {
    const warnings = [];

    // Check for growing memory usage
    if (this.memorySnapshots.length > 5) {
      const recentSnapshots = this.memorySnapshots.slice(-5);
      const memoryGrowth = recentSnapshots[recentSnapshots.length - 1].usedJSHeapSize - 
                           recentSnapshots[0].usedJSHeapSize;
      
      if (memoryGrowth > this.leakThreshold) {
        warnings.push(`Memory usage increased by ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      }
    }

    // Check for too many timeouts/intervals
    if (snapshot.timeouts > 50) {
      warnings.push(`Too many timeouts: ${snapshot.timeouts}`);
    }

    if (snapshot.intervals > 20) {
      warnings.push(`Too many intervals: ${snapshot.intervals}`);
    }

    // Check for too many event listeners
    if (snapshot.eventListeners > 100) {
      warnings.push(`Too many event listeners: ${snapshot.eventListeners}`);
    }

    // Check for too many observers
    if (snapshot.performanceObservers > 10) {
      warnings.push(`Too many performance observers: ${snapshot.performanceObservers}`);
    }

    if (snapshot.intersectionObservers > 20) {
      warnings.push(`Too many intersection observers: ${snapshot.intersectionObservers}`);
    }

    if (warnings.length > 0) {
      console.warn('🚨 Potential memory leaks detected:', warnings);
      this.logResourceDetails();
    }
  }

  /**
   * Log detailed resource information
   */
  logResourceDetails() {
    console.group('🔍 Memory Leak Monitor - Resource Details');
    
    console.log('Timeouts:', this.timeouts.size);
    this.timeouts.forEach((details, id) => {
      console.log(`  Timeout ${id}:`, details);
    });

    console.log('Intervals:', this.intervals.size);
    this.intervals.forEach((details, id) => {
      console.log(`  Interval ${id}:`, details);
    });

    console.log('Event Listeners:', this.eventListeners.size);
    this.eventListeners.forEach((details, key) => {
      console.log(`  Event Listener ${key}:`, details);
    });

    console.log('Performance Observers:', this.performanceObservers.size);
    console.log('Intersection Observers:', this.intersectionObservers.size);

    console.groupEnd();
  }

  /**
   * Override global functions to track usage
   */
  overrideGlobals() {
    // Override setTimeout
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) => {
      const id = originalSetTimeout(callback, delay, ...args);
      this.trackTimeout(id, callback, delay);
      return id;
    };

    // Override setInterval
    const originalSetInterval = window.setInterval;
    window.setInterval = (callback, delay, ...args) => {
      const id = originalSetInterval(callback, delay, ...args);
      this.trackInterval(id, callback, delay);
      return id;
    };

    // Override clearTimeout
    const originalClearTimeout = window.clearTimeout;
    window.clearTimeout = (id) => {
      this.clearTimeout(id);
      return originalClearTimeout(id);
    };

    // Override clearInterval
    const originalClearInterval = window.clearInterval;
    window.clearInterval = (id) => {
      this.clearInterval(id);
      return originalClearInterval(id);
    };

    // Override addEventListener
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(event, handler, options) {
      const key = this.memoryLeakMonitor?.trackEventListener(this, event, handler, options);
      return originalAddEventListener.call(this, event, handler, options);
    };

    // Override removeEventListener
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function(event, handler, options) {
      // Find and remove the tracked listener
      this.memoryLeakMonitor?.eventListeners.forEach((details, key) => {
        if (details.element === this && details.event === event && details.handler === handler) {
          this.memoryLeakMonitor.removeEventListener(key);
        }
      });
      return originalRemoveEventListener.call(this, event, handler, options);
    };
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    if (!performance.memory) return null;

    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usagePercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
      trackedResources: {
        timeouts: this.timeouts.size,
        intervals: this.intervals.size,
        eventListeners: this.eventListeners.size,
        performanceObservers: this.performanceObservers.size,
        intersectionObservers: this.intersectionObservers.size
      }
    };
  }

  /**
   * Generate memory leak report
   */
  generateReport() {
    const stats = this.getMemoryStats();
    const report = {
      timestamp: Date.now(),
      memoryStats: stats,
      snapshots: this.memorySnapshots,
      resourceCounts: {
        timeouts: this.timeouts.size,
        intervals: this.intervals.size,
        eventListeners: this.eventListeners.size,
        performanceObservers: this.performanceObservers.size,
        intersectionObservers: this.intersectionObservers.size
      },
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate recommendations based on current state
   */
  generateRecommendations() {
    const recommendations = [];
    const stats = this.getMemoryStats();

    if (!stats) return recommendations;

    if (stats.usagePercentage > 80) {
      recommendations.push('Memory usage is high. Consider clearing caches and unused resources.');
    }

    if (stats.trackedResources.timeouts > 50) {
      recommendations.push('Too many timeouts. Check for proper cleanup in useEffect hooks.');
    }

    if (stats.trackedResources.intervals > 20) {
      recommendations.push('Too many intervals. Ensure intervals are cleared on component unmount.');
    }

    if (stats.trackedResources.eventListeners > 100) {
      recommendations.push('Too many event listeners. Check for proper event listener cleanup.');
    }

    return recommendations;
  }
}

// Create singleton instance
const memoryLeakMonitor = new MemoryLeakMonitor();

// Export utility functions
export const startMemoryLeakMonitoring = () => memoryLeakMonitor.start();
export const stopMemoryLeakMonitoring = () => memoryLeakMonitor.stop();
export const trackTimeout = (callback, delay) => memoryLeakMonitor.trackTimeout(null, callback, delay);
export const trackInterval = (callback, delay) => memoryLeakMonitor.trackInterval(null, callback, delay);
export const trackEventListener = (element, event, handler, options) => 
  memoryLeakMonitor.trackEventListener(element, event, handler, options);
export const trackPerformanceObserver = (id, observer) => 
  memoryLeakMonitor.trackPerformanceObserver(id, observer);
export const trackIntersectionObserver = (id, observer) => 
  memoryLeakMonitor.trackIntersectionObserver(id, observer);
export const clearAllResources = () => memoryLeakMonitor.clearAllResources();
export const getMemoryStats = () => memoryLeakMonitor.getMemoryStats();
export const generateMemoryReport = () => memoryLeakMonitor.generateReport();

// Export the monitor instance
export default memoryLeakMonitor; 