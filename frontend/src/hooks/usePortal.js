import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import portalManagerService from '../services/portalManagerService';

/**
 * Enhanced Portal Management Hook
 * 
 * Features:
 * - Centralized portal container management
 * - Memory leak prevention with aggressive cleanup
 * - Portal stacking support with proper z-index management
 * - Accessibility features (focus management, ARIA attributes)
 * - Development debugging and monitoring
 * - SSR safety
 * - Performance optimizations
 */

const PORTAL_REGISTRY = new Map();
const PORTAL_STACK = [];
let NEXT_Z_INDEX = 2147483647; // Start with max z-index

class PortalManager {
  static getInstance() {
    if (!PortalManager.instance) {
      PortalManager.instance = new PortalManager();
    }
    return PortalManager.instance;
  }

  constructor() {
    this.portals = new Map();
    this.stack = [];
    this.baseZIndex = 2147483647;
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  createPortal(id, options = {}) {
    const {
      zIndex = this.getNextZIndex(),
      accessibility = true,
      stacking = true,
      cleanup = true,
      debug = this.debugMode
    } = options;

    if (typeof window === 'undefined') {
      return { container: null, portal: null, cleanup: () => {} };
    }

    let container = document.getElementById(id);
    let isNewContainer = false;

    if (!container) {
      container = document.createElement('div');
      container.id = id;
      container.className = `portal-container ${id}`;
      
      // Enhanced styling for better performance and accessibility
      Object.assign(container.style, {
        position: 'fixed',
        inset: '0',
        zIndex: zIndex.toString(),
        pointerEvents: 'none',
        contain: 'layout style paint',
        isolation: 'isolate' // Creates new stacking context
      });

      // Accessibility attributes
      if (accessibility) {
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('tabindex', '-1');
        container.setAttribute('aria-hidden', 'false');
      }

      document.body.appendChild(container);
      isNewContainer = true;

      if (debug) {
        console.debug(`[PortalManager] Created portal container: ${id}`, {
          zIndex,
          stacking,
          accessibility
        });
      }
    } else {
      // Update existing container with new options
      container.style.zIndex = zIndex.toString();
      if (accessibility) {
        container.setAttribute('aria-hidden', 'false');
      }
    }

    // Register portal
    this.portals.set(id, {
      container,
      zIndex,
      options,
      createdAt: Date.now(),
      isActive: true
    });

    // Add to stack if stacking is enabled
    if (stacking) {
      this.addToStack(id, zIndex);
    }

    const cleanupFunction = () => {
      this.removePortal(id, cleanup);
    };

    return {
      container,
      portal: (content) => createPortal(content, container),
      cleanup: cleanupFunction,
      zIndex,
      id
    };
  }

  removePortal(id, shouldCleanup = true) {
    const portalInfo = this.portals.get(id);
    if (!portalInfo) return;

    const { container } = portalInfo;
    
    if (shouldCleanup && container && container.parentNode) {
      try {
        // Only remove if container is empty
        if (container.childElementCount === 0) {
          container.parentNode.removeChild(container);
          
          if (this.debugMode) {
            console.debug(`[PortalManager] Removed portal container: ${id}`);
          }
        } else {
          // Wait for children to be removed
          const observer = new MutationObserver(() => {
            if (container.childElementCount === 0) {
              observer.disconnect();
              try {
                container.parentNode.removeChild(container);
                if (this.debugMode) {
                  console.debug(`[PortalManager] Delayed removal of portal: ${id}`);
                }
              } catch (error) {
                console.warn(`[PortalManager] Failed to remove portal ${id}:`, error);
              }
            }
          });
          
          observer.observe(container, { childList: true });
          
          // Force cleanup after timeout
          setTimeout(() => {
            observer.disconnect();
            if (container.parentNode && container.childElementCount === 0) {
              try {
                container.parentNode.removeChild(container);
              } catch (error) {
                console.warn(`[PortalManager] Timeout cleanup failed for ${id}:`, error);
              }
            }
          }, 1000);
        }
      } catch (error) {
        console.warn(`[PortalManager] Cleanup error for portal ${id}:`, error);
      }
    }

    // Remove from registry and stack
    this.portals.delete(id);
    this.removeFromStack(id);
    
    portalInfo.isActive = false;
  }

  addToStack(id, zIndex) {
    this.stack.push({ id, zIndex });
    this.stack.sort((a, b) => b.zIndex - a.zIndex); // Sort by z-index descending
  }

  removeFromStack(id) {
    this.stack = this.stack.filter(item => item.id !== id);
  }

  getNextZIndex() {
    return ++NEXT_Z_INDEX;
  }

  getStackInfo() {
    return {
      activePortals: Array.from(this.portals.entries()).map(([id, info]) => ({
        id,
        zIndex: info.zIndex,
        isActive: info.isActive,
        createdAt: info.createdAt
      })),
      stack: [...this.stack]
    };
  }

  // Focus management for accessibility
  focusPortal(id) {
    const portalInfo = this.portals.get(id);
    if (portalInfo?.container) {
      portalInfo.container.focus();
    }
  }

  // Cleanup all portals (useful for testing or app shutdown)
  cleanupAll() {
    const portalIds = Array.from(this.portals.keys());
    portalIds.forEach(id => this.removePortal(id, true));
  }
}

// Export singleton instance
export const portalManager = PortalManager.getInstance();

/**
 * Enhanced usePortal Hook with Advanced Services Integration
 * 
 * @param {string} id - Unique identifier for the portal
 * @param {object} options - Configuration options
 * @returns {object} Portal utilities with enhanced features
 */
export const usePortal = (id, options = {}) => {
  const [portalContainer, setPortalContainer] = useState(null);
  const [portalUtils, setPortalUtils] = useState(null);
  const [portalReady, setPortalReady] = useState(false);
  const cleanupRef = useRef(null);
  const isMountedRef = useRef(true);
  const analyticsRef = useRef(null);
  const stateRef = useRef(null);

  const {
    zIndex,
    accessibility = true,
    stacking = true,
    cleanup = true,
    debug = process.env.NODE_ENV === 'development',
    priority = 'normal',
    group = 'default',
    animationType = 'modal',
    analytics = true,
    statePersistence = false,
    theme = null,
    onFocus = null,
    onBlur = null,
    onEscape = null
  } = options;

  // Create portal on mount with enhanced services
  useEffect(() => {
    isMountedRef.current = true;

    if (typeof window === 'undefined') {
      setPortalContainer(null);
      setPortalUtils(null);
      setPortalReady(false);
      return;
    }

    // Use enhanced portal manager service
    const utils = portalManagerService.createPortal(id, {
      zIndex,
      accessibility,
      stacking,
      cleanup,
      debug,
      priority,
      group,
      onFocus,
      onBlur,
      onEscape
    });

    setPortalContainer(utils.container);
    setPortalUtils(utils);
    setPortalReady(true);
    cleanupRef.current = utils.cleanup;

    // Initialize analytics tracking
    if (analytics && portalManagerService.analyticsService) {
      analyticsRef.current = portalManagerService.analyticsService;
      analyticsRef.current.trackPortalCreated(id, {
        type: animationType,
        priority,
        group,
        theme
      });
    }

    // Load saved state if persistence is enabled
    if (statePersistence && portalManagerService.stateService) {
      stateRef.current = portalManagerService.stateService;
      const savedState = stateRef.current.loadPortalState(id);
      if (savedState && debug) {
        console.debug(`[usePortal] Loaded state for ${id}:`, savedState);
      }
    }

    // Setup accessibility features
    if (accessibility && portalManagerService.accessibilityService) {
      const accessibilityCleanup = portalManagerService.setupPortalAccessibility(id, {
        role: 'dialog',
        ariaLabel: `Portal ${id}`,
        modal: true
      });
      
      // Store accessibility cleanup - ensure it's a function
      if (cleanupRef.current && typeof accessibilityCleanup === 'function') {
        const originalCleanup = cleanupRef.current;
        cleanupRef.current = () => {
          try {
            accessibilityCleanup();
          } catch (error) {
            console.warn(`[usePortal] Accessibility cleanup failed for ${id}:`, error);
          }
          originalCleanup();
        };
      }
    }

    return () => {
      isMountedRef.current = false;
      
      // Track portal destruction
      if (analyticsRef.current) {
        analyticsRef.current.trackPortalDestroyed(id, 'component_unmount');
      }

      // Save state before cleanup
      if (statePersistence && stateRef.current) {
        stateRef.current.savePortalState(id, {
          isOpen: false,
          destroyedAt: Date.now()
        });
      }

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      
      // Clear refs to prevent memory leaks
      analyticsRef.current = null;
      stateRef.current = null;
    };
  }, [id]); // Simplified dependencies to prevent unnecessary re-renders

  // Enhanced portal creation function with analytics
  const createPortalContent = useCallback((content) => {
    if (!portalContainer || !isMountedRef.current) {
      return null;
    }

    // Track portal content creation
    if (analyticsRef.current) {
      analyticsRef.current.trackPortalEvent(id, 'content_created', {
        hasContent: !!content,
        contentType: typeof content
      });
    }

    return createPortal(content, portalContainer);
  }, [portalContainer, id]);

  // Enhanced focus management with analytics
  const focusPortal = useCallback(() => {
    if (portalContainer) {
      portalContainer.focus();
      
      if (analyticsRef.current) {
        analyticsRef.current.trackUserInteraction('focusEvents', id, {
          element: 'portal-container'
        });
      }
    }
  }, [portalContainer, id]);

  // Save portal state
  const savePortalState = useCallback((state) => {
    if (stateRef.current) {
      stateRef.current.savePortalState(id, state);
    }
  }, [id]);

  // Load portal state
  const loadPortalState = useCallback(() => {
    if (stateRef.current) {
      return stateRef.current.loadPortalState(id);
    }
    return null;
  }, [id]);

  // Track user interactions
  const trackInteraction = useCallback((type, data = {}) => {
    if (analyticsRef.current) {
      analyticsRef.current.trackUserInteraction(type, id, data);
    }
  }, [id]);

  // Coordinate animations
  const coordinateAnimation = useCallback((animationType) => {
    if (portalManagerService.animationService) {
      portalManagerService.coordinateAnimations([id], animationType);
    }
  }, [id]);

  // Portal info for debugging
  const getPortalInfo = useCallback(() => {
    return portalManagerService.getStackInfo();
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return portalManagerService.getPerformanceMetrics();
  }, []);

  return {
    container: portalContainer,
    createPortal: createPortalContent,
    focusPortal,
    savePortalState,
    loadPortalState,
    trackInteraction,
    coordinateAnimation,
    getPortalInfo,
    getPerformanceMetrics,
    isReady: portalReady,
    zIndex: portalUtils?.zIndex,
    id: portalUtils?.id,
    // Enhanced service access
    analytics: analyticsRef.current,
    state: stateRef.current
  };
};

/**
 * Enhanced Hook for managing multiple portals with stacking and advanced features
 */
export const usePortalStack = (options = {}) => {
  const [stack, setStack] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const {
    group = 'stack',
    analytics: enableAnalytics = true,
    coordinateAnimations = true,
    animationType = 'modal'
  } = options;

  // Initialize analytics
  useEffect(() => {
    if (enableAnalytics && portalManagerService.analyticsService) {
      setAnalytics(portalManagerService.analyticsService);
    }
  }, [enableAnalytics]);

  const addPortal = useCallback((id, portalOptions = {}) => {
    const utils = portalManagerService.createPortal(id, {
      ...portalOptions,
      stacking: true,
      group,
      analytics: enableAnalytics
    });
    
    setStack(prev => [...prev, { id, utils, addedAt: Date.now() }]);
    
    // Track stack addition
    if (analytics) {
      analytics.trackPortalEvent(id, 'added_to_stack', {
        stackSize: stack.length + 1,
        group
      });
    }
    
    return utils;
  }, [group, enableAnalytics, analytics, stack.length]);

  const removePortal = useCallback((id) => {
    portalManagerService.removePortal(id, true);
    setStack(prev => prev.filter(item => item.id !== id));
    
    // Track stack removal
    if (analytics) {
      analytics.trackPortalEvent(id, 'removed_from_stack', {
        stackSize: stack.length - 1,
        group
      });
    }
  }, [analytics, stack.length]);

  const getTopPortal = useCallback(() => {
    const stackInfo = portalManagerService.getStackInfo();
    return stackInfo.stack[0] || null;
  }, []);

  const coordinateStackAnimations = useCallback((animationType) => {
    if (coordinateAnimations && portalManagerService.animationService) {
      const portalIds = stack.map(item => item.id);
      portalManagerService.coordinateAnimations(portalIds, animationType);
    }
  }, [stack, coordinateAnimations]);

  const cleanupAll = useCallback(() => {
    portalManagerService.cleanupAll();
    setStack([]);
    
    // Track stack cleanup
    if (analytics) {
      analytics.trackEvent('stack_cleanup', {
        stackSize: stack.length,
        group
      });
    }
  }, [analytics, stack.length, group]);

  const getStackMetrics = useCallback(() => {
    return {
      stackSize: stack.length,
      stackInfo: portalManagerService.getStackInfo(),
      performanceMetrics: portalManagerService.getPerformanceMetrics()
    };
  }, [stack.length]);

  return {
    stack,
    addPortal,
    removePortal,
    getTopPortal,
    coordinateStackAnimations,
    cleanupAll,
    getStackInfo: portalManagerService.getStackInfo,
    getStackMetrics,
    analytics
  };
};

export default usePortal;
