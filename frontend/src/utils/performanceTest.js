// 🚀 Performance Test Utility
// Validates optimizations and measures improvements

export class PerformanceTest {
  constructor() {
    this.metrics = {
      loadTime: 0,
      bundleSize: 0,
      imageLoadTime: 0,
      apiCallTime: 0,
      memoryUsage: 0,
      renderTime: 0
    };
    this.startTime = 0;
  }

  // Start performance test
  start() {
    this.startTime = performance.now();
    console.log('🚀 Starting performance test...');
  }

  // Measure page load time
  measureLoadTime() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        this.metrics.loadTime = performance.now() - this.startTime;
        resolve(this.metrics.loadTime);
      } else {
        window.addEventListener('load', () => {
          this.metrics.loadTime = performance.now() - this.startTime;
          resolve(this.metrics.loadTime);
        });
      }
    });
  }

  // Measure bundle size (approximate)
  measureBundleSize() {
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    
    scripts.forEach(script => {
      const src = script.src;
      if (src.includes('assets') && src.includes('.js')) {
        // Estimate size based on URL patterns
        totalSize += 100; // Rough estimate per script
      }
    });
    
    this.metrics.bundleSize = totalSize;
    return totalSize;
  }

  // Measure image load performance
  async measureImageLoadTime() {
    const images = document.querySelectorAll('img');
    const loadTimes = [];
    
    const imagePromises = Array.from(images).map(img => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve(0);
        } else {
          const startTime = performance.now();
          img.addEventListener('load', () => {
            const loadTime = performance.now() - startTime;
            loadTimes.push(loadTime);
            resolve(loadTime);
          });
          img.addEventListener('error', () => resolve(0));
        }
      });
    });
    
    await Promise.all(imagePromises);
    this.metrics.imageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length || 0;
    return this.metrics.imageLoadTime;
  }

  // Measure API call performance
  async measureApiCallTime() {
    const apiCalls = performance.getEntriesByType('resource')
      .filter(entry => entry.name.includes('api.themoviedb.org'));
    
    if (apiCalls.length > 0) {
      this.metrics.apiCallTime = apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length;
    }
    
    return this.metrics.apiCallTime;
  }

  // Measure memory usage
  measureMemoryUsage() {
    if ('memory' in performance) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return this.metrics.memoryUsage;
  }

  // Measure render time
  measureRenderTime() {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    
    if (fcp) {
      this.metrics.renderTime = fcp.startTime;
    }
    
    return this.metrics.renderTime;
  }

  // Run comprehensive test
  async runTest() {
    console.log('🧪 Running comprehensive performance test...');
    
    // Start timing
    this.start();
    
    // Measure all metrics
    const loadTime = await this.measureLoadTime();
    const bundleSize = this.measureBundleSize();
    const imageLoadTime = await this.measureImageLoadTime();
    const apiCallTime = await this.measureApiCallTime();
    const memoryUsage = this.measureMemoryUsage();
    const renderTime = this.measureRenderTime();
    
    // Calculate performance score
    const score = this.calculatePerformanceScore();
    
    // Generate report
    const report = {
      loadTime: `${loadTime.toFixed(2)}ms`,
      bundleSize: `${bundleSize}kB (estimated)`,
      imageLoadTime: `${imageLoadTime.toFixed(2)}ms`,
      apiCallTime: `${apiCallTime.toFixed(2)}ms`,
      memoryUsage: `${memoryUsage.toFixed(2)}MB`,
      renderTime: `${renderTime.toFixed(2)}ms`,
      performanceScore: `${score}/100`,
      recommendations: this.getRecommendations()
    };
    
    console.log('📊 Performance Test Results:', report);
    return report;
  }

  // Calculate performance score
  calculatePerformanceScore() {
    let score = 100;
    
    // Deduct points for poor performance
    if (this.metrics.loadTime > 3000) score -= 20;
    if (this.metrics.loadTime > 5000) score -= 20;
    if (this.metrics.imageLoadTime > 1000) score -= 15;
    if (this.metrics.apiCallTime > 500) score -= 15;
    if (this.metrics.memoryUsage > 100) score -= 10;
    if (this.metrics.renderTime > 2000) score -= 10;
    
    return Math.max(0, score);
  }

  // Get optimization recommendations
  getRecommendations() {
    const recommendations = [];
    
    if (this.metrics.loadTime > 3000) {
      recommendations.push('Optimize initial load time by reducing bundle size and critical resources');
    }
    
    if (this.metrics.imageLoadTime > 1000) {
      recommendations.push('Optimize image loading with better compression and lazy loading');
    }
    
    if (this.metrics.apiCallTime > 500) {
      recommendations.push('Optimize API calls with batching and caching');
    }
    
    if (this.metrics.memoryUsage > 100) {
      recommendations.push('Reduce memory usage by optimizing component rendering');
    }
    
    if (this.metrics.renderTime > 2000) {
      recommendations.push('Optimize render time by reducing layout shifts and improving paint performance');
    }
    
    return recommendations;
  }

  // Compare with baseline
  compareWithBaseline(baseline) {
    const current = this.metrics;
    const improvements = {};
    
    Object.keys(baseline).forEach(key => {
      if (current[key] && baseline[key]) {
        const improvement = ((baseline[key] - current[key]) / baseline[key]) * 100;
        improvements[key] = `${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`;
      }
    });
    
    return improvements;
  }
}

// Export singleton instance
export const performanceTest = new PerformanceTest();

// Export convenience function
export const runPerformanceTest = () => performanceTest.runTest(); 