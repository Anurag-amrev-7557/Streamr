/**
 * Portal Animation Service
 * 
 * Provides coordinated animations and transitions for portal management.
 * Features:
 * - Coordinated portal animations
 * - Stack-aware transitions
 * - Performance-optimized animations
 * - Custom animation presets
 * - Animation queuing and sequencing
 */

class PortalAnimationService {
  constructor() {
    this.animationQueue = new Map();
    this.activeAnimations = new Set();
    this.animationPresets = this.createAnimationPresets();
    this.performanceMode = this.detectPerformanceMode();
    this.isInitialized = false;
    
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    this.isInitialized = true;
    this.setupPerformanceMonitoring();
    this.setupAnimationOptimizations();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PortalAnimationService] Initialized with performance mode:', this.performanceMode);
    }
  }

  detectPerformanceMode() {
    if (typeof window === 'undefined') return 'high';
    
    // Detect device capabilities
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    
    // Determine performance mode based on device capabilities
    if (memory >= 8 && cores >= 8 && (!connection || connection.effectiveType === '4g')) {
      return 'high';
    } else if (memory >= 4 && cores >= 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  createAnimationPresets() {
    return {
      // Standard modal animations
      modal: {
        enter: {
          initial: { opacity: 0, scale: 0.95, y: 20 },
          animate: { opacity: 1, scale: 1, y: 0 },
          transition: { duration: 0.3, ease: 'easeOut' }
        },
        exit: {
          animate: { opacity: 0, scale: 0.95, y: 20 },
          transition: { duration: 0.2, ease: 'easeIn' }
        }
      },

      // Slide animations
      slide: {
        enter: {
          initial: { opacity: 0, x: '100%' },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.4, ease: 'easeOut' }
        },
        exit: {
          animate: { opacity: 0, x: '100%' },
          transition: { duration: 0.3, ease: 'easeIn' }
        }
      },

      // Fade animations
      fade: {
        enter: {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.2, ease: 'easeOut' }
        },
        exit: {
          animate: { opacity: 0 },
          transition: { duration: 0.15, ease: 'easeIn' }
        }
      },

      // Scale animations
      scale: {
        enter: {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.25, ease: 'backOut' }
        },
        exit: {
          animate: { opacity: 0, scale: 0.8 },
          transition: { duration: 0.2, ease: 'backIn' }
        }
      },

      // Toast animations
      toast: {
        enter: {
          initial: { opacity: 0, y: -50, scale: 0.9 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.3, ease: 'easeOut' }
        },
        exit: {
          animate: { opacity: 0, y: -50, scale: 0.9 },
          transition: { duration: 0.2, ease: 'easeIn' }
        }
      },

      // Critical priority animations (faster)
      critical: {
        enter: {
          initial: { opacity: 0, scale: 0.98 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.15, ease: 'easeOut' }
        },
        exit: {
          animate: { opacity: 0, scale: 0.98 },
          transition: { duration: 0.1, ease: 'easeIn' }
        }
      }
    };
  }

  setupPerformanceMonitoring() {
    if (this.performanceMode === 'low') {
      // Reduce animation complexity for low-performance devices
      this.animationPresets = this.optimizeForLowPerformance(this.animationPresets);
    }
  }

  optimizeForLowPerformance(presets) {
    const optimized = { ...presets };
    
    Object.keys(optimized).forEach(key => {
      const preset = optimized[key];
      // Reduce animation duration
      if (preset.enter?.transition?.duration) {
        preset.enter.transition.duration *= 0.7;
      }
      if (preset.exit?.transition?.duration) {
        preset.exit.transition.duration *= 0.7;
      }
      // Simplify easing functions
      if (preset.enter?.transition?.ease) {
        preset.enter.transition.ease = 'easeOut';
      }
      if (preset.exit?.transition?.ease) {
        preset.exit.transition.ease = 'easeIn';
      }
    });
    
    return optimized;
  }

  setupAnimationOptimizations() {
    // Use CSS transforms for better performance
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        .portal-animated {
          will-change: transform, opacity;
          transform: translateZ(0);
        }
        .portal-animated * {
          will-change: auto;
        }
      `;
      document.head.appendChild(style);
    }
  }

  getAnimationPreset(type, priority = 'normal') {
    // Get base preset
    let preset = this.animationPresets[type] || this.animationPresets.modal;
    
    // Adjust based on priority
    if (priority === 'critical') {
      preset = this.animationPresets.critical;
    } else if (priority === 'low' && type !== 'toast') {
      preset = this.animationPresets.fade;
    }
    
    return preset;
  }

  createCoordinatedAnimation(portals, animationType = 'modal') {
    const animations = [];
    const delay = 50; // Stagger delay between portals
    
    portals.forEach((portal, index) => {
      const preset = this.getAnimationPreset(animationType, portal.priority);
      const animation = {
        ...preset,
        delay: index * delay,
        portalId: portal.id
      };
      animations.push(animation);
    });
    
    return animations;
  }

  queueAnimation(portalId, animation) {
    if (!this.animationQueue.has(portalId)) {
      this.animationQueue.set(portalId, []);
    }
    
    this.animationQueue.get(portalId).push(animation);
    this.processAnimationQueue(portalId);
  }

  async processAnimationQueue(portalId) {
    const queue = this.animationQueue.get(portalId);
    if (!queue || queue.length === 0) return;
    
    const animation = queue.shift();
    this.activeAnimations.add(portalId);
    
    try {
      await this.executeAnimation(portalId, animation);
    } catch (error) {
      console.warn(`[PortalAnimationService] Animation failed for ${portalId}:`, error);
    } finally {
      this.activeAnimations.delete(portalId);
      // Process next animation in queue
      if (queue.length > 0) {
        setTimeout(() => this.processAnimationQueue(portalId), 10);
      }
    }
  }

  async executeAnimation(portalId, animation) {
    return new Promise((resolve) => {
      const portal = document.getElementById(portalId);
      if (!portal) {
        resolve();
        return;
      }
      
      // Add animation class for performance optimization
      portal.classList.add('portal-animated');
      
      // Execute animation based on type
      if (animation.type === 'enter') {
        this.animateEnter(portal, animation, resolve);
      } else if (animation.type === 'exit') {
        this.animateExit(portal, animation, resolve);
      } else {
        resolve();
      }
    });
  }

  animateEnter(portal, animation, callback) {
    const { initial, animate, transition } = animation;
    
    // Validate animation object
    if (!animation || typeof animation !== 'object') {
      console.warn('[PortalAnimationService] Invalid animation object provided to animateEnter:', animation);
      if (callback) callback();
      return;
    }
    
    // Set initial state with error handling
    try {
      const initialStyle = this.styleFromMotion(initial);
      Object.assign(portal.style, initialStyle);
    } catch (error) {
      console.warn('[PortalAnimationService] Failed to set initial animation state:', error);
    }
    
    // Animate to final state
    requestAnimationFrame(() => {
      try {
        const animateStyle = this.styleFromMotion(animate);
        Object.assign(portal.style, animateStyle);
      } catch (error) {
        console.warn('[PortalAnimationService] Failed to set final animation state:', error);
      }
      
      // Clean up after animation
      setTimeout(() => {
        portal.classList.remove('portal-animated');
        if (callback) callback();
      }, (transition?.duration || 0.3) * 1000);
    });
  }

  animateExit(portal, animation, callback) {
    const { animate, transition } = animation;
    
    // Validate animation object
    if (!animation || typeof animation !== 'object') {
      console.warn('[PortalAnimationService] Invalid animation object provided to animateExit:', animation);
      if (callback) callback();
      return;
    }
    
    // Animate to exit state with error handling
    try {
      const animateStyle = this.styleFromMotion(animate);
      Object.assign(portal.style, animateStyle);
    } catch (error) {
      console.warn('[PortalAnimationService] Failed to set exit animation state:', error);
    }
    
    // Clean up after animation
    setTimeout(() => {
      portal.classList.remove('portal-animated');
      if (callback) callback();
    }, (transition?.duration || 0.2) * 1000);
  }

  styleFromMotion(motionProps) {
    const style = {};
    
    // Add null check for motionProps and provide default empty object
    if (!motionProps || typeof motionProps !== 'object') {
      // Instead of just warning, provide a default empty object
      console.warn('[PortalAnimationService] Invalid motionProps provided to styleFromMotion:', motionProps);
      motionProps = {}; // Set default empty object to prevent undefined errors
    }
    
    if (motionProps.opacity !== undefined) {
      style.opacity = motionProps.opacity;
    }
    if (motionProps.scale !== undefined) {
      style.transform = `scale(${motionProps.scale})`;
    }
    if (motionProps.x !== undefined) {
      style.transform = `translateX(${motionProps.x})`;
    }
    if (motionProps.y !== undefined) {
      style.transform = `translateY(${motionProps.y})`;
    }
    
    return style;
  }

  // Advanced animation methods
  createStackAnimation(stack) {
    const animations = [];
    
    stack.forEach((portal, index) => {
      const depth = stack.length - index - 1;
      const scale = 1 - (depth * 0.05); // Slight scale reduction for depth
      const opacity = 1 - (depth * 0.1); // Slight opacity reduction for depth
      
      animations.push({
        portalId: portal.id,
        type: 'stack',
        scale,
        opacity,
        zIndex: portal.zIndex
      });
    });
    
    return animations;
  }

  animateStackTransition(stack) {
    const animations = this.createStackAnimation(stack);
    
    animations.forEach(animation => {
      const portal = document.getElementById(animation.portalId);
      if (portal) {
        portal.style.transform = `scale(${animation.scale})`;
        portal.style.opacity = animation.opacity;
        portal.style.zIndex = animation.zIndex;
      }
    });
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      activeAnimations: this.activeAnimations.size,
      queuedAnimations: Array.from(this.animationQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      performanceMode: this.performanceMode,
      isInitialized: this.isInitialized
    };
  }

  // Cleanup
  cleanup() {
    this.animationQueue.clear();
    this.activeAnimations.clear();
  }
}

// Create singleton instance
const portalAnimationService = new PortalAnimationService();

export default portalAnimationService;
