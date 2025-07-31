// 🚀 Performance Optimization Service
// Handles image optimization, caching, request batching, and performance monitoring

class PerformanceOptimizationService {
  constructor() {
    this.imageCache = new Map();
    this.apiCache = new Map();
    this.requestQueue = [];
    this.metrics = {
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0,
      imageLoadTimes: [],
      apiCallTimes: []
    };
    this.init();
  }

  init() {
    this.setupPerformanceObservers();
    this.setupImageOptimization();
    this.setupRequestBatching();
    this.setupCaching();
  }

  // 🖼️ Image Optimization
  setupImageOptimization() {
    // Intersection Observer for lazy loading
    this.imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            this.loadOptimizedImage(img);
            this.imageObserver.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );
  }

  getOptimizedImageUrl(path, size = 'w500', format = 'webp') {
    if (!path) return null;
    
    const baseUrl = 'https://image.tmdb.org/t/p';
    const sizes = {
      tiny: 'w92',
      small: 'w154', 
      medium: 'w342',
      large: 'w500',
      xlarge: 'w780',
      original: 'original'
    };
    
    return `${baseUrl}/${sizes[size] || size}${path}`;
  }

  loadOptimizedImage(img) {
    const startTime = performance.now();
    
    // Get device-appropriate size
    const isMobile = window.innerWidth <= 768;
    const size = isMobile ? 'w342' : 'w500';
    
    // Get optimized URL
    const originalSrc = img.dataset.src || img.src;
    const optimizedSrc = this.getOptimizedImageUrl(originalSrc, size);
    
    if (!optimizedSrc) return;
    
    // Check cache first
    if (this.imageCache.has(optimizedSrc)) {
      img.src = this.imageCache.get(optimizedSrc);
      this.recordImageLoadTime(performance.now() - startTime);
      return;
    }
    
    // Load image with error handling
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = optimizedSrc;
      this.imageCache.set(optimizedSrc, optimizedSrc);
      this.recordImageLoadTime(performance.now() - startTime);
      
      // Cleanup old cache entries
      if (this.imageCache.size > 100) {
        const firstKey = this.imageCache.keys().next().value;
        this.imageCache.delete(firstKey);
      }
    };
    
    tempImg.onerror = () => {
      // Fallback to original image
      img.src = originalSrc;
      this.recordImageLoadTime(performance.now() - startTime);
    };
    
    tempImg.src = optimizedSrc;
  }

  // 📊 Performance Monitoring
  setupPerformanceObservers() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      this.metrics.fcp = entries[entries.length - 1].startTime;
      this.logMetric('FCP', this.metrics.fcp);
    }).observe({ entryTypes: ['paint'] });
    
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      this.metrics.lcp = entries[entries.length - 1].startTime;
      this.logMetric('LCP', this.metrics.lcp);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      this.metrics.fid = entries[0].processingStart - entries[0].startTime;
      this.logMetric('FID', this.metrics.fid);
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let cls = 0;
      list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      });
      this.metrics.cls = cls;
      this.logMetric('CLS', cls);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  logMetric(name, value) {
    console.log(`📊 ${name}: ${value.toFixed(2)}ms`);
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value
      });
    }
  }

  recordImageLoadTime(duration) {
    this.metrics.imageLoadTimes.push(duration);
    if (this.metrics.imageLoadTimes.length > 50) {
      this.metrics.imageLoadTimes.shift();
    }
  }

  recordApiCallTime(duration) {
    this.metrics.apiCallTimes.push(duration);
    if (this.metrics.apiCallTimes.length > 50) {
      this.metrics.apiCallTimes.shift();
    }
  }

  // 🔄 Request Batching
  setupRequestBatching() {
    this.batchTimeout = null;
    this.batchSize = 5;
    this.batchDelay = 50;
  }

  async batchRequest(request, priority = false) {
    return new Promise((resolve, reject) => {
      const requestItem = { request, resolve, reject, priority };
      
      if (priority) {
        // High priority requests go to front
        this.requestQueue.unshift(requestItem);
      } else {
        this.requestQueue.push(requestItem);
      }
      
      if (this.requestQueue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.processBatch(), this.batchDelay);
      }
    });
  }

  async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    const batch = this.requestQueue.splice(0, this.batchSize);
    
    try {
      const startTime = performance.now();
      const results = await Promise.allSettled(
        batch.map(({ request }) => request())
      );
      const duration = performance.now() - startTime;
      
      this.recordApiCallTime(duration);
      
      batch.forEach(({ resolve, reject }, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }

  // 💾 Caching
  setupCaching() {
    this.cacheStats = { hits: 0, misses: 0, size: 0 };
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  async getCachedData(key, fetcher, options = {}) {
    const { ttl = this.cacheTTL, staleWhileRevalidate = true } = options;
    
    // Check cache
    const cached = this.apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      this.cacheStats.hits++;
      return cached.data;
    }
    
    this.cacheStats.misses++;
    
    // Fetch fresh data
    const data = await fetcher();
    
    // Cache the result
    this.apiCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Cleanup old entries
    this.cleanupCache();
    
    return data;
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.apiCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.apiCache.delete(key);
      }
    }
  }

  // 🎯 Public API
  observeImage(img) {
    this.imageObserver.observe(img);
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheStats: this.cacheStats,
      averageImageLoadTime: this.metrics.imageLoadTimes.length > 0 
        ? this.metrics.imageLoadTimes.reduce((a, b) => a + b, 0) / this.metrics.imageLoadTimes.length 
        : 0,
      averageApiCallTime: this.metrics.apiCallTimes.length > 0
        ? this.metrics.apiCallTimes.reduce((a, b) => a + b, 0) / this.metrics.apiCallTimes.length
        : 0
    };
  }

  getReport() {
    const metrics = this.getMetrics();
    return {
      performance: {
        fcp: metrics.fcp,
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls,
        ttfb: metrics.ttfb
      },
      optimization: {
        imageLoadTime: metrics.averageImageLoadTime,
        apiCallTime: metrics.averageApiCallTime,
        cacheHitRate: metrics.cacheStats.hits / (metrics.cacheStats.hits + metrics.cacheStats.misses)
      },
      recommendations: this.getRecommendations(metrics)
    };
  }

  getRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.fcp > 1500) {
      recommendations.push('Optimize First Contentful Paint by reducing bundle size and critical resources');
    }
    
    if (metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint by improving image loading and reducing layout shifts');
    }
    
    if (metrics.fid > 100) {
      recommendations.push('Reduce First Input Delay by optimizing JavaScript execution');
    }
    
    if (metrics.cls > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift by reserving space for dynamic content');
    }
    
    if (metrics.averageImageLoadTime > 1000) {
      recommendations.push('Optimize image loading with better compression and lazy loading');
    }
    
    if (metrics.averageApiCallTime > 500) {
      recommendations.push('Optimize API calls with batching and caching');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const performanceService = new PerformanceOptimizationService();

// Export utility functions
export const getOptimizedImageUrl = (path, size) => performanceService.getOptimizedImageUrl(path, size);
export const observeImage = (img) => performanceService.observeImage(img);
export const batchRequest = (request, priority) => performanceService.batchRequest(request, priority);
export const getCachedData = (key, fetcher, options) => performanceService.getCachedData(key, fetcher, options);
export const getMetrics = () => performanceService.getMetrics();
export const getReport = () => performanceService.getReport(); 