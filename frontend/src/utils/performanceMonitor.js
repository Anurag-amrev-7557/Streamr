/**
 * Performance Monitoring Service
 * Tracks and reports performance metrics for optimization
 */

export class PerformanceMonitor {
  static metrics = {
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
    loadTime: 0,
    domReady: 0,
    firstPaint: 0,
    firstContentfulPaint: 0
  };

  static observers = [];
  static isInitialized = false;

  /**
   * Initialize performance monitoring
   */
  static init() {
    if (this.isInitialized) return;
    
    this.setupObservers();
    this.trackNavigationTiming();
    this.trackUserInteractions();
    this.isInitialized = true;
    
    console.log('🚀 Performance monitoring initialized');
  }

  /**
   * Setup performance observers
   */
  static setupObservers() {
    if (!('PerformanceObserver' in window)) return;

    // First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.metrics.fcp = entries[entries.length - 1].startTime;
        this.logMetric('FCP', this.metrics.fcp);
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);
    } catch (error) {
      console.warn('FCP observer not supported:', error);
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.metrics.lcp = entries[entries.length - 1].startTime;
        this.logMetric('LCP', this.metrics.lcp);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.metrics.fid = entries[0].processingStart - entries[0].startTime;
        this.logMetric('FID', this.metrics.fid);
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.metrics.cls = clsValue;
        this.logMetric('CLS', this.metrics.cls);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }
  }

  /**
   * Track navigation timing
   */
  static trackNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          this.metrics.ttfb = perfData.responseStart - perfData.requestStart;
          this.metrics.loadTime = perfData.loadEventEnd - perfData.fetchStart;
          this.metrics.domReady = perfData.domContentLoadedEventEnd - perfData.fetchStart;
          
          this.logMetric('TTFB', this.metrics.ttfb);
          this.logMetric('Load Time', this.metrics.loadTime);
          this.logMetric('DOM Ready', this.metrics.domReady);
        }
      }, 0);
    });
  }

  /**
   * Track user interactions
   */
  static trackUserInteractions() {
    let firstInteraction = true;
    
    const trackInteraction = (event) => {
      if (firstInteraction) {
        const now = performance.now();
        this.logMetric('First Interaction', now);
        firstInteraction = false;
      }
    };

    ['click', 'touchstart', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, trackInteraction, { once: true });
    });
  }

  /**
   * Log performance metric
   */
  static logMetric(name, value) {
    const formattedValue = typeof value === 'number' ? `${value.toFixed(2)}ms` : value;
    console.log(`📊 ${name}: ${formattedValue}`);
    
    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
        timestamp: Date.now()
      });
    }

    // Store in localStorage for historical tracking
    this.storeMetric(name, value);
  }

  /**
   * Store metric for historical tracking
   */
  static storeMetric(name, value) {
    try {
      const stored = JSON.parse(localStorage.getItem('performance_metrics') || '{}');
      if (!stored[name]) {
        stored[name] = [];
      }
      stored[name].push({
        value,
        timestamp: Date.now()
      });
      
      // Keep only last 100 entries
      if (stored[name].length > 100) {
        stored[name] = stored[name].slice(-100);
      }
      
      localStorage.setItem('performance_metrics', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to store performance metric:', error);
    }
  }

  /**
   * Get performance report
   */
  static getReport() {
    const report = {
      current: { ...this.metrics },
      historical: this.getHistoricalData(),
      recommendations: this.getRecommendations()
    };

    return report;
  }

  /**
   * Get historical performance data
   */
  static getHistoricalData() {
    try {
      const stored = JSON.parse(localStorage.getItem('performance_metrics') || '{}');
      const historical = {};
      
      Object.keys(stored).forEach(metric => {
        const values = stored[metric];
        if (values.length > 0) {
          const numericValues = values.map(v => v.value).filter(v => typeof v === 'number');
          if (numericValues.length > 0) {
            historical[metric] = {
              average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
              min: Math.min(...numericValues),
              max: Math.max(...numericValues),
              count: numericValues.length
            };
          }
        }
      });
      
      return historical;
    } catch (error) {
      console.warn('Failed to get historical data:', error);
      return {};
    }
  }

  /**
   * Get performance recommendations
   */
  static getRecommendations() {
    const recommendations = [];
    
    if (this.metrics.fcp > 2000) {
      recommendations.push('First Contentful Paint is slow. Consider optimizing critical rendering path.');
    }
    
    if (this.metrics.lcp > 2500) {
      recommendations.push('Largest Contentful Paint is slow. Optimize images and reduce bundle size.');
    }
    
    if (this.metrics.fid > 100) {
      recommendations.push('First Input Delay is high. Reduce JavaScript execution time.');
    }
    
    if (this.metrics.cls > 0.1) {
      recommendations.push('Cumulative Layout Shift is high. Fix layout shifts and reserve space for images.');
    }
    
    if (this.metrics.ttfb > 600) {
      recommendations.push('Time to First Byte is slow. Optimize server response time.');
    }
    
    return recommendations;
  }

  /**
   * Track custom metric
   */
  static trackCustomMetric(name, value, category = 'custom') {
    this.logMetric(name, value);
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'custom_metric', {
        metric_name: name,
        metric_value: value,
        category,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Track component load time
   */
  static trackComponentLoad(componentName, loadTime) {
    this.trackCustomMetric(`${componentName} Load Time`, loadTime, 'component');
  }

  /**
   * Track API call performance
   */
  static trackApiCall(endpoint, duration, success = true) {
    this.trackCustomMetric(`API ${endpoint}`, duration, 'api');
    
    if (!success) {
      this.trackCustomMetric(`API ${endpoint} Error`, 1, 'api_error');
    }
  }

  /**
   * Track image load performance
   */
  static trackImageLoad(imageUrl, loadTime, size) {
    this.trackCustomMetric('Image Load Time', loadTime, 'image');
    this.trackCustomMetric('Image Size', size, 'image');
  }

  /**
   * Cleanup observers
   */
  static cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect observer:', error);
      }
    });
    this.observers = [];
  }

  /**
   * Get current metrics
   */
  static getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static reset() {
    this.metrics = {
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0,
      loadTime: 0,
      domReady: 0,
      firstPaint: 0,
      firstContentfulPaint: 0
    };
  }
}

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
  PerformanceMonitor.init();
}

// Export convenience functions
export const trackMetric = (name, value) => 
  PerformanceMonitor.trackCustomMetric(name, value);

export const trackComponentLoad = (name, loadTime) => 
  PerformanceMonitor.trackComponentLoad(name, loadTime);

export const trackApiCall = (endpoint, duration, success) => 
  PerformanceMonitor.trackApiCall(endpoint, duration, success);

export const getPerformanceReport = () => 
  PerformanceMonitor.getReport();

export const getMetrics = () => 
  PerformanceMonitor.getMetrics(); 