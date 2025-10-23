/**
 * Ultra-Smooth Scrolling Utility
 * Provides advanced scrolling functionality with momentum, custom easing, and performance optimizations
 */

// Custom easing functions for ultra-smooth scrolling
const easingFunctions = {
  // Smooth ease-out for natural feeling
  smooth: (t) => 1 - Math.pow(1 - t, 3),
  
  // Bounce effect for playful interactions
  bounce: (t) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
  
  // Elastic effect for dynamic scrolling
  elastic: (t) => {
    return Math.sin(-13.0 * (t + 1.0) * Math.PI) * Math.pow(2.0, -10.0 * t) + 1.0;
  },
  
  // Custom cubic bezier for premium feel
  premium: (t) => {
    const p0 = 0.25, p1 = 0.46, p2 = 0.45, p3 = 0.94;
    return Math.pow(1 - t, 3) * p0 + 3 * Math.pow(1 - t, 2) * t * p1 + 3 * (1 - t) * Math.pow(t, 2) * p2 + Math.pow(t, 3) * p3;
  },
  
  // Ultra-smooth easing for high refresh rate displays
  ultraSmooth: (t) => {
    return 0.5 * (1 + Math.sin((t - 0.5) * Math.PI));
  },
  
  // Responsive easing that adapts to scroll velocity
  adaptive: (t, velocity = 1) => {
    const adaptiveFactor = Math.min(Math.max(velocity, 0.5), 2);
    return Math.pow(t, 2 / adaptiveFactor);
  },
  
  // High-performance easing optimized for 120fps+
  performance: (t) => {
    return t * t * (3 - 2 * t); // Hermite interpolation
  }
};

import { scheduleRaf, cancelRaf } from './throttledRaf';

// Performance-optimized scroll utility
class SmoothScroll {
  constructor() {
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.animationFrame = null;
    this.lastScrollTime = 0;
    this.scrollThrottle = 4; // ~240fps for ultra-smooth scrolling
    this.activeAnimations = new Set(); // Track active animations for cleanup
    this.momentumEnabled = true;
    this.inertiaDecay = 0.98; // Enhanced momentum decay factor for smoother feel
    this.highRefreshRate = window.screen?.refreshRate > 60 || window.matchMedia('(min-resolution: 120dpi)').matches;
    
    // Bind methods for performance
    this.handleScroll = this.handleScroll.bind(this);
    this.throttledScroll = this.throttledScroll.bind(this);
  }

  /**
   * Ultra-smooth scroll to element with advanced options
   */
  scrollToElement(element, options = {}) {
    const {
      offset = 0,
      duration = 800,
      easing = 'smooth',
      behavior = 'smooth',
      block = 'start',
      inline = 'nearest'
    } = options;

    if (!element) {
      console.warn('SmoothScroll: Element not found');
      return Promise.reject(new Error('Element not found'));
    }

    // Use native smooth scroll if available and preferred
    if (behavior === 'smooth' && 'scrollIntoView' in element) {
      return new Promise((resolve) => {
        element.scrollIntoView({
          behavior: 'smooth',
          block,
          inline
        });
        
        // Wait for scroll to complete
        setTimeout(resolve, duration);
      });
    }

    // Custom smooth scroll with advanced easing
    return this.customScrollTo(element, {
      offset,
      duration,
      easing,
      block,
      inline
    });
  }

  /**
   * Custom scroll implementation with advanced easing and momentum
   */
  customScrollTo(element, options = {}) {
    const {
      offset = 0,
      duration = this.highRefreshRate ? 400 : 600, // Adaptive duration for high refresh rate
      easing = this.highRefreshRate ? 'ultraSmooth' : 'premium', // Adaptive easing
      block = 'start',
      inline = 'nearest',
      momentum = this.momentumEnabled
    } = options;

    return new Promise((resolve) => {
      const startTime = performance.now();
      const startScrollY = window.pageYOffset;
      const startScrollX = window.pageXOffset;
      
      const elementRect = element.getBoundingClientRect();
      const containerRect = document.documentElement.getBoundingClientRect();
      
      // Calculate target scroll position
      let targetScrollY = startScrollY + elementRect.top - containerRect.top;
      let targetScrollX = startScrollX;
      
      // Apply offset
      targetScrollY += offset;
      
      // Handle different block alignments
      if (block === 'center') {
        targetScrollY -= window.innerHeight / 2 - elementRect.height / 2;
      } else if (block === 'end') {
        targetScrollY -= window.innerHeight - elementRect.height;
      }
      
      // Handle different inline alignments
      if (inline === 'center') {
        targetScrollX += elementRect.left - containerRect.left - (window.innerWidth / 2 - elementRect.width / 2);
      } else if (inline === 'end') {
        targetScrollX += elementRect.left - containerRect.left - (window.innerWidth - elementRect.width);
      }
      
      const scrollDistanceY = targetScrollY - startScrollY;
      const scrollDistanceX = targetScrollX - startScrollX;
      
      const easingFunction = easingFunctions[easing] || easingFunctions.smooth;
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Adaptive easing based on scroll velocity
        const velocity = Math.abs(scrollDistanceY) / duration;
        const easedProgress = easing === 'adaptive' ? 
          easingFunction(progress, velocity) : 
          easingFunction(progress);
        
        const currentScrollY = startScrollY + (scrollDistanceY * easedProgress);
        const currentScrollX = startScrollX + (scrollDistanceX * easedProgress);
        
        // Ultra-smooth scrolling with sub-pixel precision
        const preciseY = Math.round(currentScrollY * 100) / 100;
        const preciseX = Math.round(currentScrollX * 100) / 100;
        
        // Use scrollTo with behavior: 'instant' for better performance
        window.scrollTo({
          left: preciseX,
          top: preciseY,
          behavior: 'instant'
        });
        
        if (progress < 1) {
            // Respect visibility and throttle to avoid high CPU/GPU usage
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
              // Pause animation when tab is hidden
              this.activeAnimations.delete(this.animationFrame);
              this.animationFrame = null;
              return;
            }

            // use the shared scheduler
            this.animationFrame = scheduleRaf(animate);
            if (this.animationFrame) this.activeAnimations.add(this.animationFrame);
          } else {
          this.activeAnimations.delete(this.animationFrame);
          
          // Apply momentum if enabled
          if (momentum && this.momentumEnabled) {
            this.applyMomentum(element, targetScrollY, targetScrollX);
          }
          
          resolve();
        }
      };
      
      // Kick off animation if visible
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.animationFrame = scheduleRaf(animate);
        if (this.animationFrame) this.activeAnimations.add(this.animationFrame);
      }
    });
  }

  /**
   * Apply momentum scrolling for ultra-smooth feel
   */
  applyMomentum(element, targetY, targetX) {
    if (!this.momentumEnabled) return;
    
    const currentY = window.pageYOffset;
    const currentX = window.pageXOffset;
    const velocityY = (targetY - currentY) * 0.1;
    const velocityX = (targetX - currentX) * 0.1;
    
    let momentumY = velocityY;
    let momentumX = velocityX;
    
    const momentumAnimate = () => {
        if (Math.abs(momentumY) > 0.5 || Math.abs(momentumX) > 0.5) {
          if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
            return; // pause momentum when hidden
          }
        const newY = currentY + momentumY;
        const newX = currentX + momentumX;
        
        window.scrollTo({
          left: newX,
          top: newY,
          behavior: 'instant'
        });
        
        momentumY *= this.inertiaDecay;
        momentumX *= this.inertiaDecay;
        
        scheduleRaf(momentumAnimate);
      }
    };
    scheduleRaf(momentumAnimate);
  }

  /**
   * Scroll to top with smooth animation
   */
  scrollToTop(options = {}) {
    const {
      duration = 600,
      easing = 'smooth',
      offset = 0
    } = options;

    return new Promise((resolve) => {
      const startTime = performance.now();
      const startScrollY = window.pageYOffset;
      const targetScrollY = offset;
      const scrollDistance = targetScrollY - startScrollY;
      
      const easingFunction = easingFunctions[easing] || easingFunctions.smooth;
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easedProgress = easingFunction(progress);
        const currentScrollY = startScrollY + (scrollDistance * easedProgress);
        
        window.scrollTo(0, currentScrollY);
        
        if (progress < 1) {
          if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
            this.activeAnimations.delete(this.animationFrame);
            this.animationFrame = null;
            return;
          }

          this.animationFrame = scheduleRaf(animate);
          if (this.animationFrame) this.activeAnimations.add(this.animationFrame);
        } else {
          this.activeAnimations.delete(this.animationFrame);
          resolve();
        }
      };
      // Start only if visible
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.animationFrame = scheduleRaf(animate);
        if (this.animationFrame) this.activeAnimations.add(this.animationFrame);
      }
    });
  }

  /**
   * Scroll to bottom with smooth animation
   */
  scrollToBottom(options = {}) {
    const {
      duration = 600,
      easing = 'smooth',
      offset = 0
    } = options;

    return new Promise((resolve) => {
      const startTime = performance.now();
      const startScrollY = window.pageYOffset;
      const targetScrollY = document.documentElement.scrollHeight - window.innerHeight + offset;
      const scrollDistance = targetScrollY - startScrollY;
      
      const easingFunction = easingFunctions[easing] || easingFunctions.smooth;
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easedProgress = easingFunction(progress);
        const currentScrollY = startScrollY + (scrollDistance * easedProgress);
        
        window.scrollTo(0, currentScrollY);
        
        if (progress < 1) {
          if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
            this.activeAnimations.delete(this.animationFrame);
            this.animationFrame = null;
            return;
          }

          const now = performance.now();
          if (now - this._lastAnimateRender >= this._minFrameMs) {
            this._lastAnimateRender = now;
            this.animationFrame = scheduleRaf(animate);
            if (this.animationFrame) this.activeAnimations.add(this.animationFrame);
          } else {
            this.animationFrame = scheduleRaf(animate);
            if (this.animationFrame) this.activeAnimations.add(this.animationFrame);
          }
        } else {
          this.activeAnimations.delete(this.animationFrame);
          resolve();
        }
      };
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this._lastAnimateRender = performance.now();
        this.animationFrame = scheduleRaf(animate);
        if (this.animationFrame) this.activeAnimations.add(this.animationFrame);
      }
    });
  }

  /**
   * Throttled scroll handler for performance
   */
  throttledScroll(callback) {
    const now = Date.now();
    
    if (now - this.lastScrollTime >= this.scrollThrottle) {
      this.lastScrollTime = now;
      scheduleRaf(callback);
    }
  }

  /**
   * Enhanced scroll handler with momentum detection
   */
  handleScroll(callback, options = {}) {
    const {
      throttle = 16,
      momentum = true,
      onStart,
      onEnd
    } = options;

    let isScrolling = false;
    let scrollTimeout = null;
    let lastScrollTop = window.pageYOffset;
    let scrollDirection = 0;
    let scrollVelocity = 0;
    let lastScrollTime = 0;

    const handleScrollEvent = () => {
      const currentTime = Date.now();
      const currentScrollTop = window.pageYOffset;
      const timeDelta = currentTime - lastScrollTime;
      
      if (timeDelta > 0) {
        scrollVelocity = (currentScrollTop - lastScrollTop) / timeDelta;
        scrollDirection = currentScrollTop > lastScrollTop ? 1 : -1;
      }
      
      lastScrollTop = currentScrollTop;
      lastScrollTime = currentTime;
      
      if (!isScrolling) {
        isScrolling = true;
        onStart?.();
      }
      
      callback({
        scrollTop: currentScrollTop,
        scrollDirection,
        scrollVelocity,
        isScrolling
      });
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        onEnd?.();
      }, 150);
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScrollEvent);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }

  /**
   * Cancel ongoing scroll animations
   */
  cancelScroll() {
    if (this.animationFrame) {
      cancelRaf(this.animationFrame);
      this.activeAnimations.delete(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Cancel all active animations
   */
  cancelAllAnimations() {
    this.activeAnimations.forEach(animationId => {
      cancelRaf(animationId);
    });
    this.activeAnimations.clear();
    this.animationFrame = null;
  }

  /**
   * Get current scroll position with performance optimization
   */
  getScrollPosition() {
    return {
      x: window.pageXOffset,
      y: window.pageYOffset,
      maxY: document.documentElement.scrollHeight - window.innerHeight
    };
  }

  /**
   * Check if element is in viewport
   */
  isInViewport(element, options = {}) {
    const {
      threshold = 0,
      rootMargin = '0px'
    } = options;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    
    const visibleArea = visibleHeight * visibleWidth;
    const totalArea = rect.height * rect.width;
    
    return (visibleArea / totalArea) >= threshold;
  }

  /**
   * Create intersection observer for scroll-based animations
   */
  createScrollObserver(callback, options = {}) {
    const {
      threshold = 0.1,
      rootMargin = '0px',
      root = null
    } = options;

    return new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        callback(entry);
      });
    }, {
      threshold,
      rootMargin,
      root
    });
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  cleanup() {
    // Cancel all active animations
    this.cancelAllAnimations();
    
    // Clear scroll timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
    
    // Reset state
    this.isScrolling = false;
    this.lastScrollTime = 0;
  }
}

// Create singleton instance
const smoothScroll = new SmoothScroll();

// Export utility functions
export const scrollToElement = (element, options) => smoothScroll.scrollToElement(element, options);
export const scrollToTop = (options) => smoothScroll.scrollToTop(options);
export const scrollToBottom = (options) => smoothScroll.scrollToBottom(options);
export const handleScroll = (callback, options) => smoothScroll.handleScroll(callback, options);
export const cancelScroll = () => smoothScroll.cancelScroll();
export const cancelAllAnimations = () => smoothScroll.cancelAllAnimations();
export const getScrollPosition = () => smoothScroll.getScrollPosition();
export const isInViewport = (element, options) => smoothScroll.isInViewport(element, options);
export const createScrollObserver = (callback, options) => smoothScroll.createScrollObserver(callback, options);
export const cleanupSmoothScroll = () => smoothScroll.cleanup();

// Export easing functions for custom use
export { easingFunctions };

// Export the main instance
export default smoothScroll; 