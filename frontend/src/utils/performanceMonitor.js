// Performance monitoring utility for loading optimization
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: {},
      apiCalls: {},
      renderTimes: {},
      memoryUsage: []
    };
    this.startTime = performance.now();
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Track page load performance
  trackPageLoad(pageName) {
    if (!this.isEnabled) return;
    
    const loadTime = performance.now() - this.startTime;
    this.metrics.pageLoad[pageName] = {
      loadTime: Math.round(loadTime),
      timestamp: new Date().toISOString()
    };
    
    console.log(`📊 Page Load: ${pageName} took ${Math.round(loadTime)}ms`);
    
    // Warn if load time is too high
    if (loadTime > 10000) {
      console.warn(`⚠️ Slow page load detected: ${pageName} took ${Math.round(loadTime)}ms`);
    }
  }

  // Track API call performance
  trackApiCall(endpoint, duration, success = true) {
    if (!this.isEnabled) return;
    
    if (!this.metrics.apiCalls[endpoint]) {
      this.metrics.apiCalls[endpoint] = {
        calls: 0,
        totalTime: 0,
        averageTime: 0,
        failures: 0,
        lastCall: null
      };
    }
    
    const metric = this.metrics.apiCalls[endpoint];
    metric.calls++;
    metric.totalTime += duration;
    metric.averageTime = metric.totalTime / metric.calls;
    metric.lastCall = new Date().toISOString();
    
    if (!success) {
      metric.failures++;
    }
    
    // Log slow API calls
    if (duration > 5000) {
      console.warn(`🐌 Slow API call: ${endpoint} took ${Math.round(duration)}ms`);
    }
  }

  // Track render performance
  trackRender(componentName, renderTime) {
    if (!this.isEnabled) return;
    
    if (!this.metrics.renderTimes[componentName]) {
      this.metrics.renderTimes[componentName] = {
        renders: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0
      };
    }
    
    const metric = this.metrics.renderTimes[componentName];
    metric.renders++;
    metric.totalTime += renderTime;
    metric.averageTime = metric.totalTime / metric.renders;
    metric.maxTime = Math.max(metric.maxTime, renderTime);
    
    // Warn if render time is too high
    if (renderTime > 100) {
      console.warn(`⚠️ Slow render: ${componentName} took ${Math.round(renderTime)}ms`);
    }
  }

  // Track memory usage
  trackMemory() {
    if (!this.isEnabled || !performance.memory) return;
    
    const memory = {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      timestamp: new Date().toISOString()
    };
    
    this.metrics.memoryUsage.push(memory);
    
    // Keep only last 100 entries
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
    
    // Warn if memory usage is high
    if (memory.used > 500) {
      console.warn(`⚠️ High memory usage: ${memory.used}MB / ${memory.limit}MB`);
    }
  }

  // Get performance summary
  getSummary() {
    const summary = {
      totalPageLoads: Object.keys(this.metrics.pageLoad).length,
      totalApiCalls: Object.values(this.metrics.apiCalls).reduce((sum, metric) => sum + metric.calls, 0),
      averageApiCallTime: 0,
      slowestApiCall: null,
      memoryUsage: this.metrics.memoryUsage.length > 0 ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] : null
    };
    
    // Calculate average API call time
    const apiCalls = Object.values(this.metrics.apiCalls);
    if (apiCalls.length > 0) {
      const totalTime = apiCalls.reduce((sum, metric) => sum + metric.totalTime, 0);
      const totalCalls = apiCalls.reduce((sum, metric) => sum + metric.calls, 0);
      summary.averageApiCallTime = totalCalls > 0 ? Math.round(totalTime / totalCalls) : 0;
    }
    
    // Find slowest API call
    let slowestTime = 0;
    let slowestEndpoint = null;
    Object.entries(this.metrics.apiCalls).forEach(([endpoint, metric]) => {
      if (metric.averageTime > slowestTime) {
        slowestTime = metric.averageTime;
        slowestEndpoint = endpoint;
      }
    });
    
    if (slowestEndpoint) {
      summary.slowestApiCall = {
        endpoint: slowestEndpoint,
        averageTime: Math.round(slowestTime)
      };
    }
    
    return summary;
  }

  // Log performance summary
  logSummary() {
    if (!this.isEnabled) return;
    
    const summary = this.getSummary();
    console.log('📊 Performance Summary:', summary);
    
    // Log detailed API call metrics
    console.log('🔗 API Call Metrics:');
    Object.entries(this.metrics.apiCalls).forEach(([endpoint, metric]) => {
      console.log(`  ${endpoint}: ${metric.calls} calls, avg ${Math.round(metric.averageTime)}ms, ${metric.failures} failures`);
    });
  }

  // Clear metrics
  clear() {
    this.metrics = {
      pageLoad: {},
      apiCalls: {},
      renderTimes: {},
      memoryUsage: []
    };
    this.startTime = performance.now();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;

// Export utility functions
export const trackPageLoad = (pageName) => performanceMonitor.trackPageLoad(pageName);
export const trackApiCall = (endpoint, duration, success) => performanceMonitor.trackApiCall(endpoint, duration, success);
export const trackRender = (componentName, renderTime) => performanceMonitor.trackRender(componentName, renderTime);
export const trackMemory = () => performanceMonitor.trackMemory();
export const getPerformanceSummary = () => performanceMonitor.getSummary();
export const logPerformanceSummary = () => performanceMonitor.logSummary(); 