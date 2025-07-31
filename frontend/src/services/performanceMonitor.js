// Optimized Performance Monitor Service
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: 0,
      apiCalls: 0,
      imageLoads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      averageLoadTime: 0,
      totalLoadTime: 0,
      slowRequests: 0,
      networkErrors: 0
    };
    
    this.thresholds = {
      slowRequest: 3000, // 3 seconds
      verySlowRequest: 10000, // 10 seconds
      maxCacheSize: 100,
      maxMemoryUsage: 50 * 1024 * 1024 // 50MB
    };
    
    this.observers = new Map();
    this.isMonitoring = false;
    
    this.init();
  }
  
  init() {
    if (typeof window !== 'undefined') {
      this.setupPerformanceObserver();
      this.setupNetworkMonitoring();
      this.setupErrorMonitoring();
      this.startMonitoring();
    }
  }
  
  // Setup performance observer for Core Web Vitals
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        // Observe Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('lcp', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Observe First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordMetric('fid', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        
        // Observe Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.recordMetric('cls', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        this.observers.set('lcp', lcpObserver);
        this.observers.set('fid', fidObserver);
        this.observers.set('cls', clsObserver);
        
      } catch (error) {
        console.warn('Performance observer setup failed:', error);
      }
    }
  }
  
  // Setup network monitoring
  setupNetworkMonitoring() {
    if ('PerformanceObserver' in window) {
      try {
        const networkObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'resource') {
              this.recordResourceTiming(entry);
            }
          });
        });
        networkObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('network', networkObserver);
      } catch (error) {
        console.warn('Network monitoring setup failed:', error);
      }
    }
  }
  
  // Setup error monitoring
  setupErrorMonitoring() {
    window.addEventListener('error', (event) => {
      this.recordError('javascript', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('promise', event.reason);
    });
  }
  
  // Record performance metric
  recordMetric(name, value) {
    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }
    
    this.metrics[name].push({
      value,
      timestamp: Date.now()
    });
    
    // Keep only last 100 measurements
    if (this.metrics[name].length > 100) {
      this.metrics[name] = this.metrics[name].slice(-100);
    }
    
    // Log slow metrics
    if (value > this.thresholds.slowRequest) {
      console.warn(`Slow ${name}: ${value}ms`);
      this.metrics.slowRequests++;
    }
  }
  
  // Record resource timing
  recordResourceTiming(entry) {
    const duration = entry.duration;
    const name = entry.name;
    
    this.metrics.apiCalls++;
    this.metrics.totalLoadTime += duration;
    this.metrics.averageLoadTime = this.metrics.totalLoadTime / this.metrics.apiCalls;
    
    // Record slow API calls
    if (duration > this.thresholds.slowRequest) {
      console.warn(`Slow API call: ${name} took ${duration}ms`);
      this.metrics.slowRequests++;
    }
    
    // Record network errors
    if (entry.transferSize === 0 && entry.decodedBodySize === 0) {
      this.metrics.networkErrors++;
    }
  }
  
  // Record error
  recordError(type, error) {
    this.metrics.errors++;
    
    const errorInfo = {
      type,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: Date.now(),
      url: window.location.href
    };
    
    console.error('Performance monitor caught error:', errorInfo);
    
    // Store error for analysis
    if (!this.metrics.errorLog) {
      this.metrics.errorLog = [];
    }
    this.metrics.errorLog.push(errorInfo);
    
    // Keep only last 50 errors
    if (this.metrics.errorLog.length > 50) {
      this.metrics.errorLog = this.metrics.errorLog.slice(-50);
    }
  }
  
  // Record cache hit/miss
  recordCacheEvent(type) {
    if (type === 'hit') {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }
  
  // Record image load
  recordImageLoad(duration) {
    this.metrics.imageLoads++;
    this.recordMetric('imageLoadTime', duration);
  }
  
  // Record page load
  recordPageLoad() {
    this.metrics.pageLoads++;
    
    // Record navigation timing
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.recordMetric('domContentLoaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
        this.recordMetric('loadComplete', navigation.loadEventEnd - navigation.loadEventStart);
      }
    }
  }
  
  // Get performance report
  getReport() {
    const report = {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0 
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2) + '%'
        : '0%',
      averageLoadTime: this.metrics.averageLoadTime.toFixed(2) + 'ms',
      errorRate: this.metrics.apiCalls > 0 
        ? (this.metrics.errors / this.metrics.apiCalls * 100).toFixed(2) + '%'
        : '0%'
    };
    
    // Add Core Web Vitals if available
    if (this.metrics.lcp && this.metrics.lcp.length > 0) {
      const latestLcp = this.metrics.lcp[this.metrics.lcp.length - 1];
      report.lcp = latestLcp.value.toFixed(2) + 'ms';
    }
    
    if (this.metrics.fid && this.metrics.fid.length > 0) {
      const latestFid = this.metrics.fid[this.metrics.fid.length - 1];
      report.fid = latestFid.value.toFixed(2) + 'ms';
    }
    
    if (this.metrics.cls && this.metrics.cls.length > 0) {
      const latestCls = this.metrics.cls[this.metrics.cls.length - 1];
      report.cls = latestCls.value.toFixed(4);
    }
    
    return report;
  }
  
  // Get performance score (0-100)
  getPerformanceScore() {
    const report = this.getReport();
    let score = 100;
    
    // Deduct points for slow metrics
    if (report.lcp) {
      const lcp = parseFloat(report.lcp);
      if (lcp > 4000) score -= 30;
      else if (lcp > 2500) score -= 15;
    }
    
    if (report.fid) {
      const fid = parseFloat(report.fid);
      if (fid > 300) score -= 20;
      else if (fid > 100) score -= 10;
    }
    
    if (report.cls) {
      const cls = parseFloat(report.cls);
      if (cls > 0.25) score -= 25;
      else if (cls > 0.1) score -= 10;
    }
    
    // Deduct points for errors
    score -= Math.min(20, this.metrics.errors * 2);
    
    // Deduct points for slow requests
    score -= Math.min(15, this.metrics.slowRequests);
    
    return Math.max(0, score);
  }
  
  // Start monitoring
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.recordPageLoad();
    
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.recordMetric('memoryUsage', memory.usedJSHeapSize);
        this.recordMetric('memoryLimit', memory.jsHeapSizeLimit);
      }, 30000); // Every 30 seconds
    }
    
    console.log('Performance monitoring started');
  }
  
  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    
    // Disconnect all observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    
    console.log('Performance monitoring stopped');
  }
  
  // Get memory usage
  getMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
        total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
        limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
        percentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
      };
    }
    return null;
  }
  
  // Get network information
  getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink + 'Mbps',
        rtt: connection.rtt + 'ms',
        saveData: connection.saveData
      };
    }
    return null;
  }
  
  // Export metrics for analysis
  exportMetrics() {
    return {
      metrics: this.metrics,
      report: this.getReport(),
      score: this.getPerformanceScore(),
      memory: this.getMemoryUsage(),
      network: this.getNetworkInfo(),
      timestamp: Date.now()
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export the monitor and utility functions
export default performanceMonitor;

// Export utility functions
export const performanceUtils = {
  // Record API call
  recordApiCall: (duration) => {
    performanceMonitor.recordMetric('apiCall', duration);
  },
  
  // Record cache event
  recordCacheEvent: (type) => {
    performanceMonitor.recordCacheEvent(type);
  },
  
  // Record image load
  recordImageLoad: (duration) => {
    performanceMonitor.recordImageLoad(duration);
  },
  
  // Get performance report
  getReport: () => {
    return performanceMonitor.getReport();
  },
  
  // Get performance score
  getScore: () => {
    return performanceMonitor.getPerformanceScore();
  },
  
  // Export metrics
  exportMetrics: () => {
    return performanceMonitor.exportMetrics();
  },
  
  // Start monitoring
  start: () => {
    performanceMonitor.startMonitoring();
  },
  
  // Stop monitoring
  stop: () => {
    performanceMonitor.stopMonitoring();
  }
}; 