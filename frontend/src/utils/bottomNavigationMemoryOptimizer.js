// Bottom Navigation Memory Optimizer
class BottomNavigationMemoryOptimizer {
  constructor() {
    this.isActive = false;
    this.cleanupInterval = null;
    this.lastCleanup = 0;
    this.cleanupCooldown = 60000; // 1 minute
    this.memoryThreshold = 500; // MB
    this.renderCount = 0;
    this.lastMemoryCheck = 0;
    this.memoryCheckInterval = 30000; // 30 seconds
  }

  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastCleanup = Date.now();
    this.lastMemoryCheck = Date.now();
    
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.cleanupCooldown);
    
    console.log('[BottomNavigationMemoryOptimizer] Started memory optimization');
  }

  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    console.log('[BottomNavigationMemoryOptimizer] Stopped memory optimization');
  }

  performCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupCooldown) {
      return;
    }
    
    this.lastCleanup = now;
    
    try {
      // Clear any cached DOM references
      this.clearDOMCache();
      
      // Clear any stored performance metrics
      this.clearPerformanceMetrics();
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Log cleanup in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[BottomNavigationMemoryOptimizer] Memory cleanup performed');
      }
    } catch (error) {
      console.warn('[BottomNavigationMemoryOptimizer] Cleanup failed:', error);
    }
  }

  clearDOMCache() {
    // Clear any cached DOM elements that might be holding references
    const cachedElements = document.querySelectorAll('[data-bottom-nav-cache]');
    cachedElements.forEach(element => {
      element.removeAttribute('data-bottom-nav-cache');
    });
  }

  clearPerformanceMetrics() {
    // Clear any stored performance data that might be accumulating
    if (window.performance && window.performance.memory) {
      // Reset any custom performance tracking
      if (window.bottomNavPerformanceData) {
        window.bottomNavPerformanceData = null;
      }
    }
  }

  checkMemoryUsage() {
    if (!window.performance || !window.performance.memory) return;
    
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }
    
    this.lastMemoryCheck = now;
    const memoryMB = window.performance.memory.usedJSHeapSize / 1024 / 1024;
    
    if (memoryMB > this.memoryThreshold) {
      console.warn(`[BottomNavigationMemoryOptimizer] High memory usage detected: ${memoryMB.toFixed(2)}MB`);
      this.performCleanup();
    }
  }

  trackRender() {
    this.renderCount++;
    
    // Check memory usage every 100 renders
    if (this.renderCount % 100 === 0) {
      this.checkMemoryUsage();
    }
    
    // Perform cleanup every 500 renders
    if (this.renderCount % 500 === 0) {
      this.performCleanup();
    }
  }

  getStats() {
    return {
      isActive: this.isActive,
      renderCount: this.renderCount,
      lastCleanup: this.lastCleanup,
      lastMemoryCheck: this.lastMemoryCheck
    };
  }
}

// Create singleton instance
const bottomNavigationMemoryOptimizer = new BottomNavigationMemoryOptimizer();

// Export for use in components
export default bottomNavigationMemoryOptimizer;

// Export utility functions
export const startBottomNavigationMemoryOptimization = () => bottomNavigationMemoryOptimizer.start();
export const stopBottomNavigationMemoryOptimization = () => bottomNavigationMemoryOptimizer.stop();
export const trackBottomNavigationRender = () => bottomNavigationMemoryOptimizer.trackRender();
export const getBottomNavigationMemoryStats = () => bottomNavigationMemoryOptimizer.getStats(); 