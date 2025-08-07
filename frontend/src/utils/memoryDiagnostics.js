// Memory Diagnostics Utility
// Comprehensive diagnostics and fixes for memory issues

import memoryLeakMonitor from './memoryLeakMonitor';
import memoryOptimizationService from './memoryOptimizationService';

class MemoryDiagnostics {
  constructor() {
    this.diagnostics = {
      memoryUsage: null,
      componentCount: 0,
      domNodeCount: 0,
      eventListenerCount: 0,
      timeoutCount: 0,
      intervalCount: 0,
      cacheSize: 0,
      imageCount: 0,
      suspiciousPatterns: []
    };
    
    this.fixes = [];
    this.recommendations = [];
  }

  // Run comprehensive diagnostics
  async runDiagnostics() {
    console.log('🔍 Starting memory diagnostics...');
    
    try {
      // Basic memory check
      await this.checkMemoryUsage();
      
      // Component analysis
      await this.analyzeComponents();
      
      // DOM analysis
      await this.analyzeDOM();
      
      // Cache analysis
      await this.analyzeCaches();
      
      // Image analysis
      await this.analyzeImages();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Log results
      this.logResults();
      
      return this.diagnostics;
      
    } catch (error) {
      console.error('❌ Memory diagnostics failed:', error);
      throw error;
    }
  }

  async checkMemoryUsage() {
    if (!performance.memory) {
      console.warn('⚠️ Performance.memory not available');
      return;
    }

    const used = performance.memory.usedJSHeapSize / 1024 / 1024;
    const total = performance.memory.totalJSHeapSize / 1024 / 1024;
    const limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;

    this.diagnostics.memoryUsage = {
      used: used.toFixed(2),
      total: total.toFixed(2),
      limit: limit.toFixed(2),
      percentage: ((used / limit) * 100).toFixed(2)
    };

    console.log(`📊 Memory Usage: ${used.toFixed(2)}MB / ${limit.toFixed(2)}MB (${((used / limit) * 100).toFixed(2)}%)`);
  }

  async analyzeComponents() {
    try {
      // Count React components (rough estimate)
      const reactRoots = document.querySelectorAll('[data-reactroot]');
      const reactComponents = document.querySelectorAll('[data-reactid]');
      
      this.diagnostics.componentCount = reactRoots.length + reactComponents.length;
      
      // Look for suspicious component patterns
      const suspiciousComponents = [
        'MovieCard',
        'MovieSection', 
        'HomePage',
        'MoviesPage',
        'ProgressiveImage',
        'Swiper',
        'SwiperSlide'
      ];

      suspiciousComponents.forEach(component => {
        const elements = document.querySelectorAll(`[class*="${component}"]`);
        if (elements.length > 10) {
          this.diagnostics.suspiciousPatterns.push({
            component,
            count: elements.length,
            severity: elements.length > 50 ? 'high' : elements.length > 20 ? 'medium' : 'low'
          });
        }
      });

      console.log(`🧩 Components found: ${this.diagnostics.componentCount}`);
      
    } catch (error) {
      console.warn('⚠️ Component analysis failed:', error);
    }
  }

  async analyzeDOM() {
    try {
      // Count DOM nodes
      const allElements = document.querySelectorAll('*');
      this.diagnostics.domNodeCount = allElements.length;

      // Count event listeners (estimate)
      this.diagnostics.eventListenerCount = allElements.length * 2; // Rough estimate

      // Count timeouts and intervals (cannot be accurately determined)
      this.diagnostics.timeoutCount = 0;
      this.diagnostics.intervalCount = 0;

      console.log(`🌳 DOM nodes: ${this.diagnostics.domNodeCount}`);
      
    } catch (error) {
      console.warn('⚠️ DOM analysis failed:', error);
    }
  }

  async analyzeCaches() {
    try {
      let cacheSize = 0;

      // Check localStorage
      if (localStorage.length > 0) {
        const localStorageSize = this.calculateStorageSize(localStorage);
        cacheSize += localStorageSize;
        console.log(`💾 localStorage size: ${(localStorageSize / 1024).toFixed(2)}KB`);
      }

      // Check sessionStorage
      if (sessionStorage.length > 0) {
        const sessionStorageSize = this.calculateStorageSize(sessionStorage);
        cacheSize += sessionStorageSize;
        console.log(`💾 sessionStorage size: ${(sessionStorageSize / 1024).toFixed(2)}KB`);
      }

      // Check global caches
      const globalCaches = ['movieDetailsCache', 'imageCache', 'tempCache', 'movieCache'];
      globalCaches.forEach(cacheName => {
        if (window[cacheName]) {
          console.log(`💾 Global cache found: ${cacheName}`);
          cacheSize += 1024; // Estimate 1KB per cache
        }
      });

      this.diagnostics.cacheSize = cacheSize;
      
    } catch (error) {
      console.warn('⚠️ Cache analysis failed:', error);
    }
  }

  async analyzeImages() {
    try {
      const images = document.querySelectorAll('img');
      this.diagnostics.imageCount = images.length;

      // Count large images
      const largeImages = Array.from(images).filter(img => {
        return img.naturalWidth > 500 || img.naturalHeight > 500;
      });

      console.log(`🖼️ Images found: ${images.length} (${largeImages.length} large)`);
      
    } catch (error) {
      console.warn('⚠️ Image analysis failed:', error);
    }
  }

  calculateStorageSize(storage) {
    let size = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      const value = storage.getItem(key);
      size += (key + value).length;
    }
    return size;
  }

  generateRecommendations() {
    this.recommendations = [];

    // Memory usage recommendations
    if (this.diagnostics.memoryUsage) {
      const percentage = parseFloat(this.diagnostics.memoryUsage.percentage);
      
      if (percentage > 80) {
        this.recommendations.push({
          type: 'critical',
          message: 'Memory usage is critically high (>80%)',
          action: 'Perform immediate cleanup and optimize components'
        });
      } else if (percentage > 60) {
        this.recommendations.push({
          type: 'warning',
          message: 'Memory usage is high (>60%)',
          action: 'Consider implementing memory optimizations'
        });
      }
    }

    // Component recommendations
    if (this.diagnostics.componentCount > 1000) {
      this.recommendations.push({
        type: 'warning',
        message: 'High component count detected',
        action: 'Implement virtual scrolling or pagination'
      });
    }

    // Suspicious patterns
    this.diagnostics.suspiciousPatterns.forEach(pattern => {
      if (pattern.severity === 'high') {
        this.recommendations.push({
          type: 'critical',
          message: `High number of ${pattern.component} components (${pattern.count})`,
          action: 'Implement component pooling or lazy loading'
        });
      }
    });

    // DOM recommendations
    if (this.diagnostics.domNodeCount > 5000) {
      this.recommendations.push({
        type: 'warning',
        message: 'Large DOM tree detected',
        action: 'Consider using virtual DOM or reducing component complexity'
      });
    }

    // Image recommendations
    if (this.diagnostics.imageCount > 100) {
      this.recommendations.push({
        type: 'info',
        message: 'Many images detected',
        action: 'Implement lazy loading and image optimization'
      });
    }
  }

  logResults() {
    console.log('\n📋 Memory Diagnostics Results:');
    console.log('================================');
    
    if (this.diagnostics.memoryUsage) {
      console.log(`Memory: ${this.diagnostics.memoryUsage.used}MB / ${this.diagnostics.memoryUsage.limit}MB (${this.diagnostics.memoryUsage.percentage}%)`);
    }
    
    console.log(`Components: ${this.diagnostics.componentCount}`);
    console.log(`DOM nodes: ${this.diagnostics.domNodeCount}`);
    console.log(`Images: ${this.diagnostics.imageCount}`);
    console.log(`Cache size: ${(this.diagnostics.cacheSize / 1024).toFixed(2)}KB`);
    
    if (this.diagnostics.suspiciousPatterns.length > 0) {
      console.log('\n⚠️ Suspicious patterns:');
      this.diagnostics.suspiciousPatterns.forEach(pattern => {
        console.log(`  - ${pattern.component}: ${pattern.count} instances (${pattern.severity} severity)`);
      });
    }
    
    if (this.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
        console.log(`   Action: ${rec.action}`);
      });
    }
  }

  // Apply automatic fixes
  async applyFixes() {
    console.log('\n🔧 Applying automatic fixes...');
    
    try {
      // Clear unnecessary caches
      await this.clearUnnecessaryCaches();
      
      // Optimize images
      await this.optimizeImages();
      
      // Clear timeouts and intervals
      await this.clearTimers();
      
      // Force garbage collection
      await this.forceGarbageCollection();
      
      console.log('✅ Automatic fixes applied');
      
    } catch (error) {
      console.error('❌ Failed to apply fixes:', error);
    }
  }

  async clearUnnecessaryCaches() {
    try {
      // Clear localStorage items that are not essential
      const essentialKeys = ['user', 'auth', 'settings', 'theme'];
      const keysToRemove = Object.keys(localStorage).filter(key => !essentialKeys.includes(key));
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`🗑️ Cleared ${keysToRemove.length} localStorage items`);
      }
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('🗑️ Cleared sessionStorage');
      
    } catch (error) {
      console.warn('⚠️ Failed to clear caches:', error);
    }
  }

  async optimizeImages() {
    try {
      const images = document.querySelectorAll('img');
      let optimized = 0;
      
      images.forEach(img => {
        // Remove src from images that are not visible
        if (img.offsetParent === null) {
          img.src = '';
          optimized++;
        }
      });
      
      if (optimized > 0) {
        console.log(`🖼️ Optimized ${optimized} images`);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to optimize images:', error);
    }
  }

  async clearTimers() {
    try {
      // This is a very aggressive approach - use with caution
      const highestTimeoutId = setTimeout(() => {}, 0);
      const highestIntervalId = setInterval(() => {}, 0);
      
      let cleared = 0;
      
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
        cleared++;
      }
      
      for (let i = 0; i < highestIntervalId; i++) {
        clearInterval(i);
        cleared++;
      }
      
      if (cleared > 0) {
        console.log(`⏰ Cleared ${cleared} timers`);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to clear timers:', error);
    }
  }

  async forceGarbageCollection() {
    try {
      if (window.gc) {
        window.gc();
        console.log('🗑️ Forced garbage collection');
      } else {
        console.log('ℹ️ Garbage collection not available');
      }
    } catch (error) {
      console.warn('⚠️ Failed to force garbage collection:', error);
    }
  }

  // Get performance report
  getPerformanceReport() {
    const report = memoryLeakMonitor.getReport();
    const optimizationStats = memoryOptimizationService.getStats();
    
    return {
      diagnostics: this.diagnostics,
      recommendations: this.recommendations,
      leakMonitor: report,
      optimizationStats: optimizationStats,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const memoryDiagnostics = new MemoryDiagnostics();

// Export utility functions
export const runMemoryDiagnostics = () => memoryDiagnostics.runDiagnostics();
export const applyMemoryFixes = () => memoryDiagnostics.applyFixes();
export const getMemoryReport = () => memoryDiagnostics.getPerformanceReport();

export default memoryDiagnostics; 