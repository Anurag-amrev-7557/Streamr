/**
 * Ultra-Smooth Scroll Performance Monitoring Service
 * Monitors, analyzes, and optimizes scrolling performance across the application
 */

import { scheduleRaf, cancelRaf } from '../utils/throttledRaf';

class ScrollPerformanceService {
  constructor() {
    this.isEnabled = typeof window !== 'undefined' && 'performance' in window;
    this.metrics = {
      frameRate: 60,
      scrollEvents: 0,
      jankFrames: 0,
      smoothFrames: 0,
      averageFrameTime: 16.67, // 60fps baseline
      lastFrameTime: 0,
      performanceScore: 100
    };
    
    this.observers = new Set();
    this.isMonitoring = false;
    this.frameTimeBuffer = [];
    this.maxBufferSize = 60; // Store last 60 frame times (1 second at 60fps)
    
    this.thresholds = {
      smoothFrame: 16.67, // 60fps
      highPerformance: 8.33, // 120fps
      jankFrame: 33.33, // 30fps
      criticalJank: 50 // 20fps
    };
    
    this.visibilityHandler = this.visibilityHandler?.bind?.(this) || this.visibilityHandler;
    this.lowPowerMode = false;
    // Throttling targets to avoid unnecessary CPU/GPU usage
    this.targetFps = 30; // target lower-fidelity monitoring
    this.minFrameMs = 1000 / this.targetFps;
    this._lastRenderTime = 0;
    this.init();
  }

  init() {
    if (!this.isEnabled) return;
    
    this.bindMethods();
    this.setupPerformanceObserver();
    this.startMonitoring();
  }

  bindMethods() {
    this.measureScrollPerformance = this.measureScrollPerformance.bind(this);
    this.handleFrame = this.handleFrame.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  /**
   * Setup Performance Observer for long task detection
   */
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        // Observe long tasks (>50ms)
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) {
              this.recordJankFrame(entry.duration);
            }
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        
        // Observe frame timing
        const frameObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.processFrameTiming(entry);
          });
        });
        
        frameObserver.observe({ entryTypes: ['measure'] });
        
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }
  }

  /**
   * Start monitoring scroll performance
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
  this.lastFrameTime = performance.now();
  this._lastRenderTime = this.lastFrameTime;
    
    // Monitor frames
    // Only start requestAnimationFrame loop when page is visible to avoid unnecessary CPU/GPU work
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.frameId = scheduleRaf(this.handleFrame);
    }
    // Listen for visibility changes to pause/resume monitoring
    if (typeof document !== 'undefined') {
      // Ensure visibility handler respects throttling
      this.visibilityHandler = this.visibilityHandler || (() => {
        if (document.visibilityState === 'hidden') {
          // Pause frame loop
          if (this.frameId) cancelRaf(this.frameId);
          this.frameId = null;
          this.lowPowerMode = true;
        } else {
          // Resume frame loop
          this.lowPowerMode = false;
          this.lastFrameTime = performance.now();
          this._lastRenderTime = this.lastFrameTime;
          if (!this.frameId) this.frameId = scheduleRaf(this.handleFrame);
        }
      });
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    
    // Monitor scroll events
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    
    // Performance measurement interval
    this.perfInterval = setInterval(() => {
      this.calculatePerformanceMetrics();
    }, 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.frameId) {
      try { cancelRaf(this.frameId); } catch (e) {}
    }
    
    window.removeEventListener('scroll', this.handleScroll);
    
    if (this.perfInterval) {
      clearInterval(this.perfInterval);
    }
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  /**
   * Handle frame measurement
   */
  handleFrame(timestamp) {
    if (!this.isMonitoring) return;
    // If page is not visible, don't continue rAF loop (low power)
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      this.frameId = null;
      this.lowPowerMode = true;
      return;
    }

    // Throttle frames to approximately targetFps to reduce CPU/GPU churn
    const sinceLastRender = timestamp - this._lastRenderTime;
    if (sinceLastRender < this.minFrameMs) {
      // Skip heavy processing this frame but schedule next check using centralized scheduler
      this.frameId = scheduleRaf(this.handleFrame);
      return;
    }

    const frameTime = timestamp - this.lastFrameTime;
    this.recordFrameTime(frameTime);
    this.lastFrameTime = timestamp;
    this._lastRenderTime = timestamp;

    // Schedule next frame via centralized scheduler
    this.frameId = scheduleRaf(this.handleFrame);
  }

  /**
   * Handle scroll events
   */
  handleScroll() {
    this.metrics.scrollEvents++;
  }

  /**
   * Record frame timing
   */
  recordFrameTime(frameTime) {
    this.frameTimeBuffer.push(frameTime);
    
    if (this.frameTimeBuffer.length > this.maxBufferSize) {
      this.frameTimeBuffer.shift();
    }
    
    // Classify frame performance
    if (frameTime <= this.thresholds.highPerformance) {
      this.metrics.smoothFrames++;
    } else if (frameTime <= this.thresholds.smoothFrame) {
      this.metrics.smoothFrames++;
    } else {
      this.metrics.jankFrames++;
    }
  }

  /**
   * Record jank frame from long task observer
   */
  recordJankFrame(duration) {
    this.metrics.jankFrames++;
    console.warn(`[ScrollPerformance] Long task detected: ${duration.toFixed(2)}ms`);
  }

  /**
   * Process frame timing entry
   */
  processFrameTiming(entry) {
    if (entry.name.includes('scroll')) {
      this.recordFrameTime(entry.duration);
    }
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics() {
    if (this.frameTimeBuffer.length === 0) return;
    
    // Calculate average frame time
    const totalFrameTime = this.frameTimeBuffer.reduce((sum, time) => sum + time, 0);
    this.metrics.averageFrameTime = totalFrameTime / this.frameTimeBuffer.length;
    
    // Calculate frame rate
    this.metrics.frameRate = 1000 / this.metrics.averageFrameTime;
    
    // Calculate performance score (0-100)
  const smoothRatio = (this.metrics.smoothFrames + this.metrics.jankFrames) === 0 ? 1 : this.metrics.smoothFrames / (this.metrics.smoothFrames + this.metrics.jankFrames);
  const frameRateRatio = Math.min(this.metrics.frameRate / 60, 1);
  // Weighted score: 70% smoothness, 30% frame rate
  this.metrics.performanceScore = Math.round((smoothRatio * 0.7 + frameRateRatio * 0.3) * 100);
    
    // Notify observers
    this.notifyObservers(this.metrics);
    
    // Auto-optimize if performance is poor
    if (this.metrics.performanceScore < 60) {
      this.autoOptimize();
    }
  }

  /**
   * Auto-optimize scroll performance
   */
  autoOptimize() {
    console.warn('[ScrollPerformance] Poor performance detected, applying optimizations...');
    
    // Reduce scroll event frequency
    this.optimizeScrollEvents();
    
    // Optimize animations
    this.optimizeAnimations();
    
    // Suggest performance improvements
    this.suggestOptimizations();
  }

  /**
   * Optimize scroll events
   */
  optimizeScrollEvents() {
    // Add throttling to scroll events
    const scrollContainers = document.querySelectorAll('.ultra-smooth-scroll, .momentum-scroll');
    
    scrollContainers.forEach(container => {
      if (!container.dataset.optimized) {
        container.style.scrollBehavior = 'auto'; // Temporarily disable smooth scroll
        container.dataset.optimized = 'true';
        
        // Re-enable after performance improves
        setTimeout(() => {
          container.style.scrollBehavior = 'smooth';
        }, 2000);
      }
    });
  }

  /**
   * Optimize animations
   */
  optimizeAnimations() {
    // Remove animation constraints - allow full animations on all devices
    // const motionElements = document.querySelectorAll('[class*="motion"], [class*="animate"]');
    
    // motionElements.forEach(element => {
    //   if (!element.dataset.reducedMotion) {
    //     element.style.animationDuration = '0.1s';
    //     element.style.transitionDuration = '0.1s';
    //     element.dataset.reducedMotion = 'true';
    //   }
    // });
  }

  /**
   * Suggest performance optimizations
   */
  suggestOptimizations() {
    const suggestions = [];
    
    if (this.metrics.frameRate < 30) {
      suggestions.push('Consider reducing animation complexity');
      suggestions.push('Enable hardware acceleration on scroll containers');
    }
    
    if (this.metrics.jankFrames / this.metrics.smoothFrames > 0.2) {
      suggestions.push('Reduce DOM manipulation during scroll');
      suggestions.push('Use CSS transforms instead of layout properties');
    }
    
    if (suggestions.length > 0) {
      console.group('[ScrollPerformance] Optimization Suggestions:');
      suggestions.forEach(suggestion => console.log(`• ${suggestion}`));
      console.groupEnd();
    }
  }

  /**
   * Measure scroll performance for a specific element
   */
  measureScrollPerformance(element, options = {}) {
    const {
      duration = 5000,
      callback
    } = options;
    
    const measurements = {
      startTime: performance.now(),
      scrollEvents: 0,
      frameDrops: 0,
      averageFrameTime: 0
    };
    
    let lastScrollTime = 0;
    const frameBuffer = [];
    
    const scrollHandler = () => {
      measurements.scrollEvents++;
      const now = performance.now();
      
      if (lastScrollTime > 0) {
        const frameDelta = now - lastScrollTime;
        frameBuffer.push(frameDelta);
        
        if (frameDelta > this.thresholds.jankFrame) {
          measurements.frameDrops++;
        }
      }
      
      lastScrollTime = now;
    };
    
    element.addEventListener('scroll', scrollHandler, { passive: true });
    
    setTimeout(() => {
      element.removeEventListener('scroll', scrollHandler);
      
      measurements.endTime = performance.now();
      measurements.duration = measurements.endTime - measurements.startTime;
      measurements.averageFrameTime = frameBuffer.reduce((sum, time) => sum + time, 0) / frameBuffer.length;
      measurements.smoothnessScore = ((frameBuffer.length - measurements.frameDrops) / frameBuffer.length) * 100;
      
      callback?.(measurements);
    }, duration);
    
    return measurements;
  }

  /**
   * Add performance observer
   */
  addObserver(callback) {
    this.observers.add(callback);
    
    return () => {
      this.observers.delete(callback);
    };
  }

  /**
   * Notify all observers
   */
  notifyObservers(metrics) {
    this.observers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in scroll performance observer:', error);
      }
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const {
      frameRate,
      averageFrameTime,
      performanceScore,
      scrollEvents,
      jankFrames,
      smoothFrames
    } = this.metrics;
    
    return {
      frameRate: Math.round(frameRate),
      averageFrameTime: Math.round(averageFrameTime * 100) / 100,
      performanceScore: Math.round(performanceScore),
      scrollEvents,
      jankFrames,
      smoothFrames,
      quality: this.getQualityRating(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get quality rating
   */
  getQualityRating() {
    if (this.metrics.performanceScore >= 90) return 'Excellent';
    if (this.metrics.performanceScore >= 75) return 'Good';
    if (this.metrics.performanceScore >= 60) return 'Fair';
    return 'Poor';
  }

  /**
   * Get performance recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.metrics.frameRate < 50) {
      recommendations.push('Enable hardware acceleration');
      recommendations.push('Reduce animation complexity');
    }
    
    if (this.metrics.jankFrames > this.metrics.smoothFrames * 0.1) {
      recommendations.push('Optimize scroll event handlers');
      recommendations.push('Use passive event listeners');
    }
    
    if (this.metrics.averageFrameTime > 20) {
      recommendations.push('Reduce DOM manipulation');
      recommendations.push('Use CSS transforms for animations');
    }
    
    return recommendations;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const summary = this.getPerformanceSummary();
    
    console.group('📊 Scroll Performance Report');
    console.log(`Frame Rate: ${summary.frameRate} fps`);
    console.log(`Average Frame Time: ${summary.averageFrameTime}ms`);
    console.log(`Performance Score: ${summary.performanceScore}/100 (${summary.quality})`);
    console.log(`Scroll Events: ${summary.scrollEvents}`);
    console.log(`Smooth Frames: ${summary.smoothFrames}`);
    console.log(`Jank Frames: ${summary.jankFrames}`);
    
    if (summary.recommendations.length > 0) {
      console.group('💡 Recommendations:');
      summary.recommendations.forEach(rec => console.log(`• ${rec}`));
      console.groupEnd();
    }
    
    console.groupEnd();
    
    return summary;
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      frameRate: 60,
      scrollEvents: 0,
      jankFrames: 0,
      smoothFrames: 0,
      averageFrameTime: 16.67,
      lastFrameTime: 0,
      performanceScore: 100
    };
    
    this.frameTimeBuffer = [];
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.stopMonitoring();
    this.observers.clear();
  }
}

// Create singleton instance
const scrollPerformanceService = new ScrollPerformanceService();

// Export utility functions
export const measureScrollPerformance = (element, options) => 
  scrollPerformanceService.measureScrollPerformance(element, options);

export const addPerformanceObserver = (callback) => 
  scrollPerformanceService.addObserver(callback);

export const getScrollMetrics = () => 
  scrollPerformanceService.getMetrics();

export const getScrollPerformanceSummary = () => 
  scrollPerformanceService.getPerformanceSummary();

export const generateScrollReport = () => 
  scrollPerformanceService.generateReport();

export const resetScrollMetrics = () => 
  scrollPerformanceService.reset();

// Export main service
export default scrollPerformanceService;