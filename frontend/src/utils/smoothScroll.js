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
  }
};

// Performance-optimized scroll utility
class SmoothScroll {
  constructor() {
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.animationFrame = null;
    this.lastScrollTime = 0;
    this.scrollThrottle = 16; // ~60fps
    
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
   * Custom scroll implementation with advanced easing
   */
  customScrollTo(element, options = {}) {
    const {
      offset = 0,
      duration = 800,
      easing = 'smooth',
      block = 'start',
      inline = 'nearest'
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
        
        const easedProgress = easingFunction(progress);
        
        const currentScrollY = startScrollY + (scrollDistanceY * easedProgress);
        const currentScrollX = startScrollX + (scrollDistanceX * easedProgress);
        
        window.scrollTo(currentScrollX, currentScrollY);
        
        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      this.animationFrame = requestAnimationFrame(animate);
    });
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
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      this.animationFrame = requestAnimationFrame(animate);
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
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  /**
   * Throttled scroll handler for performance
   */
  throttledScroll(callback) {
    const now = Date.now();
    
    if (now - this.lastScrollTime >= this.scrollThrottle) {
      this.lastScrollTime = now;
      requestAnimationFrame(callback);
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
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
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
}

// Create singleton instance
const smoothScroll = new SmoothScroll();

// Export utility functions
export const scrollToElement = (element, options) => smoothScroll.scrollToElement(element, options);
export const scrollToTop = (options) => smoothScroll.scrollToTop(options);
export const scrollToBottom = (options) => smoothScroll.scrollToBottom(options);
export const handleScroll = (callback, options) => smoothScroll.handleScroll(callback, options);
export const cancelScroll = () => smoothScroll.cancelScroll();
export const getScrollPosition = () => smoothScroll.getScrollPosition();
export const isInViewport = (element, options) => smoothScroll.isInViewport(element, options);
export const createScrollObserver = (callback, options) => smoothScroll.createScrollObserver(callback, options);

// Export easing functions for custom use
export { easingFunctions };

// Export the main instance
export default smoothScroll; 