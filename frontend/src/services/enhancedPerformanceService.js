// Enhanced Performance Service - Comprehensive Homepage Load Performance Monitoring (ENHANCED)
import performanceOptimizationService from './performanceOptimizationService.js';
import performanceMonitor from './performanceMonitor.js';

// Utility: Deep clone for safe reporting
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Utility: Get network information if available
function getNetworkInfo() {
  if (typeof navigator !== 'undefined' && navigator.connection) {
    const { effectiveType, downlink, rtt, saveData } = navigator.connection;
    return { effectiveType, downlink, rtt, saveData };
  }
  return null;
}

class EnhancedPerformanceService {
  constructor() {
    this.coreWebVitals = {
      fcp: null, // First Contentful Paint
      lcp: null, // Largest Contentful Paint
      fid: null, // First Input Delay
      cls: null, // Cumulative Layout Shift
      ttfb: null, // Time to First Byte
      domContentLoaded: null,
      loadComplete: null,
      navigationStart: null,
      firstPaint: null
    };

    this.homepageMetrics = {
      initialLoadTime: 0,
      criticalContentLoadTime: 0,
      highPriorityContentLoadTime: 0,
      mediumPriorityContentLoadTime: 0,
      imageLoadTimes: [],
      apiCallTimes: [],
      cacheHitRate: 0,
      totalSectionsLoaded: 0,
      sectionsLoadOrder: [],
      userInteractionTime: null,
      slowResources: [],
      resourceSummary: {},
      jsHeapUsed: [],
      memoryInfo: null
    };

    this.observers = new Set();
    this.performanceObservers = new Map();
    this.isMonitoring = false;

    // For resource timing
    this.resourceObserver = null;

    // For memory monitoring (if available)
    this.memoryInterval = null;

    // Initialize Core Web Vitals monitoring
    this.initCoreWebVitalsMonitoring();
  }

  // Initialize Core Web Vitals monitoring and resource/memory monitoring
  initCoreWebVitalsMonitoring() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // First Contentful Paint & First Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            this.coreWebVitals.fcp = entry.startTime;
            this.notifyObservers('fcp', this.coreWebVitals.fcp);
          }
          if (entry.name === 'first-paint') {
            this.coreWebVitals.firstPaint = entry.startTime;
            this.notifyObservers('firstPaint', this.coreWebVitals.firstPaint);
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.performanceObservers.set('fcp', fcpObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.coreWebVitals.lcp = lastEntry.startTime;
          this.notifyObservers('lcp', this.coreWebVitals.lcp);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.performanceObservers.set('lcp', lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.coreWebVitals.fid = entry.processingStart - entry.startTime;
          this.notifyObservers('fid', this.coreWebVitals.fid);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.performanceObservers.set('fid', fidObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.coreWebVitals.cls = clsValue;
        this.notifyObservers('cls', this.coreWebVitals.cls);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.performanceObservers.set('cls', clsObserver);

      // Navigation timing
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          this.coreWebVitals.navigationStart = navigation.startTime;
          this.coreWebVitals.ttfb = navigation.responseStart - navigation.requestStart;
          this.coreWebVitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.startTime;
          this.coreWebVitals.loadComplete = navigation.loadEventEnd - navigation.startTime;
        }
      }

      // Resource timing observer for slow resources
      if ('PerformanceObserver' in window && 'PerformanceResourceTiming' in window) {
        this.resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            // Track slow resources (> 1s)
            if (entry.duration > 1000) {
              this.homepageMetrics.slowResources.push({
                name: entry.name,
                initiatorType: entry.initiatorType,
                duration: entry.duration
              });
              this.notifyObservers('slowResource', entry);
            }
            // Aggregate resource summary
            if (!this.homepageMetrics.resourceSummary[entry.initiatorType]) {
              this.homepageMetrics.resourceSummary[entry.initiatorType] = { count: 0, totalDuration: 0 };
            }
            this.homepageMetrics.resourceSummary[entry.initiatorType].count += 1;
            this.homepageMetrics.resourceSummary[entry.initiatorType].totalDuration += entry.duration;
          });
        });
        this.resourceObserver.observe({ entryTypes: ['resource'] });
        this.performanceObservers.set('resource', this.resourceObserver);
      }

      // Memory monitoring (Chrome only)
      if (window.performance && window.performance.memory) {
        this.memoryInterval = setInterval(() => {
          const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = window.performance.memory;
          this.homepageMetrics.jsHeapUsed.push(usedJSHeapSize);
          this.homepageMetrics.memoryInfo = { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit };
          // Keep only last 30 samples
          if (this.homepageMetrics.jsHeapUsed.length > 30) {
            this.homepageMetrics.jsHeapUsed = this.homepageMetrics.jsHeapUsed.slice(-30);
          }
        }, 2000);
      }

      // Network info
      this.networkInfo = getNetworkInfo();

      console.log('✅ Core Web Vitals & resource/memory monitoring initialized');
    } catch (error) {
      console.warn('Failed to initialize Core Web Vitals monitoring:', error);
    }
  }

  // Start comprehensive performance monitoring
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Start the base performance monitor
    if (performanceMonitor && typeof performanceMonitor.startMonitoring === 'function') {
      performanceMonitor.startMonitoring();
    }

    // Start the performance optimization service monitoring
    performanceOptimizationService.addObserver((event, data) => {
      this.handleOptimizationEvent(event, data);
    });

    // Listen for visibility changes (for user engagement metrics)
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      this._visibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
          this.recordHomepageMetric('userInteraction', performance.now());
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    // Listen for JS errors (for error rate metric)
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this._errorHandler = (e) => {
        this.recordHomepageMetric('jsError', {
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          time: performance.now()
        });
      };
      window.addEventListener('error', this._errorHandler);
    }

    console.log('🚀 Enhanced performance monitoring started');
  }

  // Handle optimization service events
  handleOptimizationEvent(event, data) {
    switch (event) {
      case 'initialLoadComplete':
        this.homepageMetrics.initialLoadTime = performance.now();
        this.notifyObservers('initialLoadComplete', deepClone(this.homepageMetrics));
        break;
      case 'sectionLoaded':
        if (data && data.section) {
          this.homepageMetrics.totalSectionsLoaded++;
          this.homepageMetrics.sectionsLoadOrder.push(data.section);
          this.notifyObservers('sectionLoaded', deepClone(data));
        }
        break;
      default:
        // Forward other events
        this.notifyObservers(event, deepClone(data));
    }
  }

  // Record homepage-specific metrics
  recordHomepageMetric(type, value, additionalData = {}) {
    switch (type) {
      case 'criticalContentLoad':
        this.homepageMetrics.criticalContentLoadTime = value;
        break;
      case 'highPriorityContentLoad':
        this.homepageMetrics.highPriorityContentLoadTime = value;
        break;
      case 'mediumPriorityContentLoad':
        this.homepageMetrics.mediumPriorityContentLoadTime = value;
        break;
      case 'imageLoad':
        this.homepageMetrics.imageLoadTimes.push(value);
        // Keep only last 50 measurements
        if (this.homepageMetrics.imageLoadTimes.length > 50) {
          this.homepageMetrics.imageLoadTimes = this.homepageMetrics.imageLoadTimes.slice(-50);
        }
        break;
      case 'apiCall':
        this.homepageMetrics.apiCallTimes.push(value);
        // Keep only last 50 measurements
        if (this.homepageMetrics.apiCallTimes.length > 50) {
          this.homepageMetrics.apiCallTimes = this.homepageMetrics.apiCallTimes.slice(-50);
        }
        break;
      case 'cacheHit':
        this.homepageMetrics.cacheHitRate = value;
        break;
      case 'userInteraction':
        this.homepageMetrics.userInteractionTime = value;
        break;
      case 'jsError':
        if (!this.homepageMetrics.jsErrors) this.homepageMetrics.jsErrors = [];
        this.homepageMetrics.jsErrors.push({ ...value, ...additionalData });
        // Keep only last 20 errors
        if (this.homepageMetrics.jsErrors.length > 20) {
          this.homepageMetrics.jsErrors = this.homepageMetrics.jsErrors.slice(-20);
        }
        break;
    }

    this.notifyObservers('metricRecorded', { type, value, additionalData });
  }

  // Get comprehensive performance report
  getComprehensiveReport() {
    const optimizationMetrics = performanceOptimizationService.getPerformanceState();
    const baseMetrics = performanceMonitor ? performanceMonitor.getReport() : {};

    // Calculate averages
    const averageImageLoadTime = this.homepageMetrics.imageLoadTimes.length > 0
      ? this.homepageMetrics.imageLoadTimes.reduce((a, b) => a + b, 0) / this.homepageMetrics.imageLoadTimes.length
      : 0;

    const averageApiCallTime = this.homepageMetrics.apiCallTimes.length > 0
      ? this.homepageMetrics.apiCallTimes.reduce((a, b) => a + b, 0) / this.homepageMetrics.apiCallTimes.length
      : 0;

    // Memory usage
    const averageJsHeapUsed = this.homepageMetrics.jsHeapUsed.length > 0
      ? this.homepageMetrics.jsHeapUsed.reduce((a, b) => a + b, 0) / this.homepageMetrics.jsHeapUsed.length
      : null;

    // Error rate
    const jsErrorCount = this.homepageMetrics.jsErrors ? this.homepageMetrics.jsErrors.length : 0;

    // Resource summary
    const resourceSummary = deepClone(this.homepageMetrics.resourceSummary);

    // Network info
    const networkInfo = this.networkInfo || getNetworkInfo();

    return {
      // Core Web Vitals
      coreWebVitals: deepClone(this.coreWebVitals),

      // Homepage-specific metrics
      homepage: {
        ...deepClone(this.homepageMetrics),
        averageImageLoadTime,
        averageApiCallTime,
        averageJsHeapUsed,
        jsErrorCount,
        resourceSummary,
        networkInfo
      },

      // Optimization service metrics
      optimization: deepClone(optimizationMetrics),

      // Base performance metrics
      base: deepClone(baseMetrics),

      // Performance score
      performanceScore: this.calculatePerformanceScore(),

      // Recommendations
      recommendations: this.generateRecommendations(),

      timestamp: Date.now()
    };
  }

  // Calculate overall performance score (0-100)
  calculatePerformanceScore() {
    let score = 100;

    // Core Web Vitals scoring
    if (this.coreWebVitals.fcp && this.coreWebVitals.fcp > 1500) score -= 15;
    if (this.coreWebVitals.lcp && this.coreWebVitals.lcp > 2500) score -= 20;
    if (this.coreWebVitals.fid && this.coreWebVitals.fid > 100) score -= 15;
    if (this.coreWebVitals.cls && this.coreWebVitals.cls > 0.1) score -= 15;

    // Homepage metrics scoring
    if (this.homepageMetrics.initialLoadTime > 5000) score -= 10;
    if (this.homepageMetrics.criticalContentLoadTime > 3000) score -= 10;

    // Use calculated averages for scoring
    const averageImageLoadTime = this.homepageMetrics.imageLoadTimes.length > 0
      ? this.homepageMetrics.imageLoadTimes.reduce((a, b) => a + b, 0) / this.homepageMetrics.imageLoadTimes.length
      : 0;
    const averageApiCallTime = this.homepageMetrics.apiCallTimes.length > 0
      ? this.homepageMetrics.apiCallTimes.reduce((a, b) => a + b, 0) / this.homepageMetrics.apiCallTimes.length
      : 0;

    if (averageImageLoadTime > 1000) score -= 5;
    if (averageApiCallTime > 500) score -= 5;

    // Penalize for JS errors
    if (this.homepageMetrics.jsErrors && this.homepageMetrics.jsErrors.length > 0) {
      score -= Math.min(10, this.homepageMetrics.jsErrors.length * 2);
    }

    // Penalize for slow resources
    if (this.homepageMetrics.slowResources && this.homepageMetrics.slowResources.length > 5) {
      score -= 5;
    }

    // Penalize for high memory usage (if available)
    if (this.homepageMetrics.jsHeapUsed && this.homepageMetrics.jsHeapUsed.length > 0) {
      const avgHeap = this.homepageMetrics.jsHeapUsed.reduce((a, b) => a + b, 0) / this.homepageMetrics.jsHeapUsed.length;
      if (avgHeap > 100 * 1024 * 1024) { // >100MB
        score -= 5;
      }
    }

    return Math.max(0, score);
  }

  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = [];

    if (this.coreWebVitals.lcp && this.coreWebVitals.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint by reducing image sizes, using modern formats, and improving server response times.');
    }

    if (this.coreWebVitals.fid && this.coreWebVitals.fid > 100) {
      recommendations.push('Improve First Input Delay by reducing JavaScript execution time and optimizing event handlers.');
    }

    if (this.coreWebVitals.cls && this.coreWebVitals.cls > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift by setting explicit dimensions for images and avoiding dynamic content insertion.');
    }

    if (this.homepageMetrics.initialLoadTime > 5000) {
      recommendations.push('Optimize initial page load by implementing code splitting, reducing bundle size, and leveraging server-side rendering.');
    }

    const averageImageLoadTime = this.homepageMetrics.imageLoadTimes.length > 0
      ? this.homepageMetrics.imageLoadTimes.reduce((a, b) => a + b, 0) / this.homepageMetrics.imageLoadTimes.length
      : 0;
    if (averageImageLoadTime > 1000) {
      recommendations.push('Optimize image loading by implementing lazy loading, using modern image formats, and compressing images.');
    }

    const averageApiCallTime = this.homepageMetrics.apiCallTimes.length > 0
      ? this.homepageMetrics.apiCallTimes.reduce((a, b) => a + b, 0) / this.homepageMetrics.apiCallTimes.length
      : 0;
    if (averageApiCallTime > 500) {
      recommendations.push('Optimize API calls by implementing caching strategies, batching requests, and reducing server response times.');
    }

    if (this.homepageMetrics.jsErrors && this.homepageMetrics.jsErrors.length > 0) {
      recommendations.push('Reduce JavaScript errors by improving error handling and testing.');
    }

    if (this.homepageMetrics.slowResources && this.homepageMetrics.slowResources.length > 0) {
      recommendations.push('Investigate slow-loading resources (e.g., scripts, images, fonts) and optimize or defer them.');
    }

    if (this.homepageMetrics.jsHeapUsed && this.homepageMetrics.jsHeapUsed.length > 0) {
      const avgHeap = this.homepageMetrics.jsHeapUsed.reduce((a, b) => a + b, 0) / this.homepageMetrics.jsHeapUsed.length;
      if (avgHeap > 100 * 1024 * 1024) {
        recommendations.push('Reduce JavaScript memory usage by optimizing data structures and cleaning up unused objects.');
      }
    }

    return recommendations;
  }

  // Observer pattern
  addObserver(observer) {
    this.observers.add(observer);
  }

  removeObserver(observer) {
    this.observers.delete(observer);
  }

  notifyObservers(event, data = null) {
    this.observers.forEach(observer => {
      if (typeof observer === 'function') {
        observer(event, data);
      } else if (observer && typeof observer.handlePerformanceEvent === 'function') {
        observer.handlePerformanceEvent(event, data);
      }
    });
  }

  // Cleanup
  cleanup() {
    this.isMonitoring = false;

    // Disconnect all performance observers
    this.performanceObservers.forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
    this.performanceObservers.clear();

    // Disconnect resource observer
    if (this.resourceObserver && typeof this.resourceObserver.disconnect === 'function') {
      this.resourceObserver.disconnect();
      this.resourceObserver = null;
    }

    // Clear regular observers
    this.observers.clear();

    // Remove visibility and error listeners
    if (typeof document !== 'undefined' && this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    if (typeof window !== 'undefined' && this._errorHandler) {
      window.removeEventListener('error', this._errorHandler);
      this._errorHandler = null;
    }

    // Stop memory monitoring
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    // Cleanup base services
    if (performanceMonitor && typeof performanceMonitor.cleanup === 'function') {
      performanceMonitor.cleanup();
    }

    if (performanceOptimizationService && typeof performanceOptimizationService.cleanup === 'function') {
      performanceOptimizationService.cleanup();
    }

    console.log('🧹 Enhanced performance service cleaned up');
  }
}

// Create singleton instance
const enhancedPerformanceService = new EnhancedPerformanceService();

export default enhancedPerformanceService;