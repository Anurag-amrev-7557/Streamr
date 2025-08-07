// Memory Leak Monitor
// Comprehensive monitoring and detection of memory leaks in React applications

class MemoryLeakMonitor {
  constructor() {
    this.isMonitoring = false;
    this.intervalId = null;
    this.memoryHistory = [];
    this.maxHistorySize = 50;
    this.leakThreshold = 100; // MB - Detect leaks with 100MB increase
    this.monitoringInterval = 15000; // 15 seconds
    this.suspiciousComponents = new Set();
    this.memorySnapshots = new Map();
    this.lastCleanup = 0;
    this.cleanupCooldown = 60000; // 1 minute
    this.emergencyMode = false;
    
    // Performance monitoring
    this.performanceMetrics = {
      totalSnapshots: 0,
      detectedLeaks: 0,
      cleanupsPerformed: 0,
      averageMemoryUsage: 0,
      peakMemoryUsage: 0
    };
  }

  start() {
    if (this.isMonitoring) {
      console.log('[MemoryLeakMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemoryLeaks();
    }, this.monitoringInterval);

    console.log('[MemoryLeakMonitor] Started memory leak monitoring');
    
    // Initial snapshot
    this.takeSnapshot();
  }

  stop() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[MemoryLeakMonitor] Stopped memory leak monitoring');
  }

  checkMemoryLeaks() {
    if (!performance.memory) {
      console.warn('[MemoryLeakMonitor] Performance.memory not available');
      return;
    }

    const currentMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
    const timestamp = Date.now();

    // Update performance metrics
    this.performanceMetrics.totalSnapshots++;
    this.performanceMetrics.averageMemoryUsage = 
      (this.performanceMetrics.averageMemoryUsage * (this.performanceMetrics.totalSnapshots - 1) + currentMemory) / 
      this.performanceMetrics.totalSnapshots;
    
    if (currentMemory > this.performanceMetrics.peakMemoryUsage) {
      this.performanceMetrics.peakMemoryUsage = currentMemory;
    }

    this.memoryHistory.push({ memory: currentMemory, timestamp });

    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Take snapshot for comparison
    this.takeSnapshot();

    // Detect memory leaks
    this.detectMemoryLeaks(currentMemory, timestamp);

    // Check for emergency conditions
    if (currentMemory > 800) { // 800MB emergency threshold
      this.emergencyMode = true;
      this.performEmergencyCleanup();
    } else if (this.emergencyMode && currentMemory < 400) {
      this.emergencyMode = false;
      console.log('[MemoryLeakMonitor] Emergency mode cleared - memory usage normalized');
    }
  }

  detectMemoryLeaks(currentMemory, timestamp) {
    if (this.memoryHistory.length < 4) return; // Need at least 4 snapshots

    // Check for continuous increase over time
    const recentHistory = this.memoryHistory.slice(-4);
    const firstMemory = recentHistory[0].memory;
    const lastMemory = recentHistory[recentHistory.length - 1].memory;
    const increase = lastMemory - firstMemory;
    const timeSpan = recentHistory[recentHistory.length - 1].timestamp - recentHistory[0].timestamp;

    // Calculate rate of increase (MB per minute)
    const increaseRate = (increase / timeSpan) * 60000;

    if (increase > this.leakThreshold && increaseRate > 50) { // 50MB per minute threshold
      this.performanceMetrics.detectedLeaks++;
      console.error(`[MemoryLeakMonitor] MEMORY LEAK DETECTED!`, {
        increase: `${increase.toFixed(2)}MB`,
        rate: `${increaseRate.toFixed(2)}MB/min`,
        timeSpan: `${(timeSpan / 1000).toFixed(1)}s`,
        currentMemory: `${currentMemory.toFixed(2)}MB`
      });

      this.identifySuspiciousComponents();
      this.performCleanup();
    }

    // Check for gradual but persistent increase
    if (this.memoryHistory.length >= 10) {
      const longTermHistory = this.memoryHistory.slice(-10);
      const longTermIncrease = longTermHistory[longTermHistory.length - 1].memory - longTermHistory[0].memory;
      
      if (longTermIncrease > 200) { // 200MB increase over 10 snapshots
        console.warn(`[MemoryLeakMonitor] Gradual memory increase detected: ${longTermIncrease.toFixed(2)}MB over ${(longTermHistory[longTermHistory.length - 1].timestamp - longTermHistory[0].timestamp) / 1000}s`);
      }
    }
  }

  takeSnapshot() {
    if (!performance.memory) return;

    const snapshot = {
      memory: performance.memory.usedJSHeapSize / 1024 / 1024,
      timestamp: Date.now(),
      components: this.getComponentCount(),
      domNodes: this.getDOMNodeCount(),
      eventListeners: this.getEventListenerCount(),
      timeouts: this.getTimeoutCount(),
      intervals: this.getIntervalCount()
    };

    this.memorySnapshots.set(snapshot.timestamp, snapshot);

    // Keep only recent snapshots
    if (this.memorySnapshots.size > 20) {
      const oldestKey = this.memorySnapshots.keys().next().value;
      this.memorySnapshots.delete(oldestKey);
    }
  }

  getComponentCount() {
    // Estimate React component count by looking for React internal properties
    let count = 0;
    try {
      // This is a rough estimate - React doesn't expose component count directly
      const reactRoots = document.querySelectorAll('[data-reactroot]');
      count = reactRoots.length;
    } catch (error) {
      console.warn('[MemoryLeakMonitor] Could not count components:', error);
    }
    return count;
  }

  getDOMNodeCount() {
    return document.querySelectorAll('*').length;
  }

  getEventListenerCount() {
    // This is an estimate - browsers don't expose exact count
    return document.querySelectorAll('*').length * 2; // Rough estimate
  }

  getTimeoutCount() {
    // This is an estimate - browsers don't expose exact count
    return 0; // Cannot be determined accurately
  }

  getIntervalCount() {
    // This is an estimate - browsers don't expose exact count
    return 0; // Cannot be determined accurately
  }

  identifySuspiciousComponents() {
    // Look for components that might be causing leaks
    const suspiciousPatterns = [
      'MovieCard',
      'MovieSection',
      'HomePage',
      'MoviesPage',
      'ProgressiveImage',
      'Swiper'
    ];

    suspiciousPatterns.forEach(pattern => {
      this.suspiciousComponents.add(pattern);
    });

    console.warn('[MemoryLeakMonitor] Suspicious components identified:', Array.from(this.suspiciousComponents));
  }

  performCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupCooldown) {
      return; // Skip if cleanup was recent
    }

    this.lastCleanup = now;
    this.performanceMetrics.cleanupsPerformed++;

    console.log('[MemoryLeakMonitor] Performing memory leak cleanup...');

    // Clear memory history
    this.memoryHistory = [];

    // Clear snapshots
    this.memorySnapshots.clear();

    // Force garbage collection if available
    if (window.gc) {
      try {
        window.gc();
        console.log('[MemoryLeakMonitor] Forced garbage collection');
      } catch (error) {
        console.warn('[MemoryLeakMonitor] Failed to force garbage collection:', error);
      }
    }

    // Clear browser caches
    this.clearBrowserCaches();

    // Clear application caches
    this.clearApplicationCaches();

    console.log('[MemoryLeakMonitor] Memory leak cleanup completed');
  }

  performEmergencyCleanup() {
    console.error('[MemoryLeakMonitor] PERFORMING EMERGENCY CLEANUP!');

    // Immediate aggressive cleanup
    this.memoryHistory = [];
    this.memorySnapshots.clear();

    // Force multiple garbage collections
    if (window.gc) {
      for (let i = 0; i < 5; i++) {
        try {
          window.gc();
        } catch (error) {
          console.warn('[MemoryLeakMonitor] Emergency GC failed:', error);
        }
      }
    }

    // Clear all caches
    this.clearBrowserCaches();
    this.clearApplicationCaches();

    // Clear all timeouts and intervals (aggressive)
    this.clearAllTimers();

    console.error('[MemoryLeakMonitor] Emergency cleanup completed');
  }

  clearBrowserCaches() {
    try {
      // Clear browser caches
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }

      // Clear localStorage if it's large
      if (localStorage.length > 50) {
        const keysToKeep = ['user', 'auth', 'settings'];
        const keysToRemove = Object.keys(localStorage).filter(key => !keysToKeep.includes(key));
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

      // Clear sessionStorage
      sessionStorage.clear();

    } catch (error) {
      console.warn('[MemoryLeakMonitor] Failed to clear browser caches:', error);
    }
  }

  clearApplicationCaches() {
    try {
      // Clear any global caches
      const globalCaches = [
        'movieDetailsCache',
        'imageCache',
        'tempCache',
        'movieCache',
        '__APP_CACHE__'
      ];

      globalCaches.forEach(cacheName => {
        if (window[cacheName]) {
          if (typeof window[cacheName].clear === 'function') {
            window[cacheName].clear();
          } else {
            delete window[cacheName];
          }
        }
      });

      // Clear image caches
      const images = document.querySelectorAll('img[data-cached]');
      images.forEach(img => {
        img.src = '';
        img.removeAttribute('src');
        img.removeAttribute('data-cached');
      });

    } catch (error) {
      console.warn('[MemoryLeakMonitor] Failed to clear application caches:', error);
    }
  }

  clearAllTimers() {
    try {
      // This is a very aggressive approach - use with caution
      const highestTimeoutId = setTimeout(() => {}, 0);
      const highestIntervalId = setInterval(() => {}, 0);

      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }

      for (let i = 0; i < highestIntervalId; i++) {
        clearInterval(i);
      }

    } catch (error) {
      console.warn('[MemoryLeakMonitor] Failed to clear timers:', error);
    }
  }

  getReport() {
    const currentMemory = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
    const memoryLimit = performance.memory ? performance.memory.jsHeapSizeLimit / 1024 / 1024 : 0;

    return {
      isMonitoring: this.isMonitoring,
      currentMemory: currentMemory,
      memoryLimit: memoryLimit,
      memoryUsage: `${currentMemory.toFixed(2)}MB / ${memoryLimit.toFixed(2)}MB`,
      emergencyMode: this.emergencyMode,
      suspiciousComponents: Array.from(this.suspiciousComponents),
      performanceMetrics: this.performanceMetrics,
      recentHistory: this.memoryHistory.slice(-5),
      snapshotsCount: this.memorySnapshots.size
    };
  }

  logReport() {
    const report = this.getReport();
    console.log('📊 Memory Leak Monitor Report:', report);
  }
}

// Create singleton instance
const memoryLeakMonitor = new MemoryLeakMonitor();

// Auto-start in development
if (process.env.NODE_ENV === 'development') {
  memoryLeakMonitor.start();
}

export default memoryLeakMonitor; 