// Enhanced Performance Service - Comprehensive Homepage Load Performance Monitoring
import performanceOptimizationService from './performanceOptimizationService.js';
import performanceMonitor from './performanceMonitor.js';

class EnhancedPerformanceService {
  constructor() {
    this.coreWebVitals = {
      fcp: null, // First Contentful Paint
      lcp: null, // Largest Contentful Paint
      fid: null, // First Input Delay
      cls: null, // Cumulative Layout Shift
      ttfb: null, // Time to First Byte
      domContentLoaded: null,
      loadComplete: null
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
      userInteractionTime: null
    };
    
    this.observers = new Set();
    this.performanceObservers = new Map();
    this.isMonitoring = false;
    
    // Initialize Core Web Vitals monitoring
    this.initCoreWebVitalsMonitoring();
  }
  
  // Initialize Core Web Vitals monitoring
  initCoreWebVitalsMonitoring() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }
    
    try {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.coreWebVitals.fcp = lastEntry.startTime;
        this.notifyObservers('fcp', this.coreWebVitals.fcp);
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.performanceObservers.set('fcp', fcpObserver);
      
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.coreWebVitals.lcp = lastEntry.startTime;
        this.notifyObservers('lcp', this.coreWebVitals.lcp);
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
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
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
          this.coreWebVitals.ttfb = navigation.responseStart - navigation.requestStart;
          this.coreWebVitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
          this.coreWebVitals.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
        }
      }
      
      console.log('✅ Core Web Vitals monitoring initialized');
      
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
    
    console.log('🚀 Enhanced performance monitoring started');
  }
  
  // Handle optimization service events
  handleOptimizationEvent(event, data) {
    switch (event) {
      case 'initialLoadComplete':
        this.homepageMetrics.initialLoadTime = performance.now();
        this.notifyObservers('initialLoadComplete', this.homepageMetrics);
        break;
      case 'sectionLoaded':
        if (data && data.section) {
          this.homepageMetrics.totalSectionsLoaded++;
          this.homepageMetrics.sectionsLoadOrder.push(data.section);
          this.notifyObservers('sectionLoaded', data);
        }
        break;
      default:
        // Forward other events
        this.notifyObservers(event, data);
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
    
    return {
      // Core Web Vitals
      coreWebVitals: {
        fcp: this.coreWebVitals.fcp,
        lcp: this.coreWebVitals.lcp,
        fid: this.coreWebVitals.fid,
        cls: this.coreWebVitals.cls,
        ttfb: this.coreWebVitals.ttfb,
        domContentLoaded: this.coreWebVitals.domContentLoaded,
        loadComplete: this.coreWebVitals.loadComplete
      },
      
      // Homepage-specific metrics
      homepage: {
        initialLoadTime: this.homepageMetrics.initialLoadTime,
        criticalContentLoadTime: this.homepageMetrics.criticalContentLoadTime,
        highPriorityContentLoadTime: this.homepageMetrics.highPriorityContentLoadTime,
        mediumPriorityContentLoadTime: this.homepageMetrics.mediumPriorityContentLoadTime,
        averageImageLoadTime,
        averageApiCallTime,
        cacheHitRate: this.homepageMetrics.cacheHitRate,
        totalSectionsLoaded: this.homepageMetrics.totalSectionsLoaded,
        sectionsLoadOrder: this.homepageMetrics.sectionsLoadOrder,
        userInteractionTime: this.homepageMetrics.userInteractionTime
      },
      
      // Optimization service metrics
      optimization: optimizationMetrics,
      
      // Base performance metrics
      base: baseMetrics,
      
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
    if (this.homepageMetrics.averageImageLoadTime > 1000) score -= 5;
    if (this.homepageMetrics.averageApiCallTime > 500) score -= 5;
    
    return Math.max(0, score);
  }
  
  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = [];
    
    if (this.coreWebVitals.lcp && this.coreWebVitals.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint by reducing image sizes and improving server response times');
    }
    
    if (this.coreWebVitals.fid && this.coreWebVitals.fid > 100) {
      recommendations.push('Improve First Input Delay by reducing JavaScript execution time and optimizing event handlers');
    }
    
    if (this.coreWebVitals.cls && this.coreWebVitals.cls > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift by setting explicit dimensions for images and avoiding dynamic content insertion');
    }
    
    if (this.homepageMetrics.initialLoadTime > 5000) {
      recommendations.push('Optimize initial page load by implementing code splitting and reducing bundle size');
    }
    
    if (this.homepageMetrics.averageImageLoadTime > 1000) {
      recommendations.push('Optimize image loading by implementing lazy loading and using modern image formats');
    }
    
    if (this.homepageMetrics.averageApiCallTime > 500) {
      recommendations.push('Optimize API calls by implementing caching strategies and reducing server response times');
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
    
    // Clear regular observers
    this.observers.clear();
    
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