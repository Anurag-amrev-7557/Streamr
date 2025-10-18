/**
 * Portal Management Utilities
 * 
 * This module provides standardized utilities for portal management
 * across all overlay components in the application.
 * 
 * Features:
 * - Standardized portal configurations
 * - Common portal patterns
 * - Accessibility helpers
 * - Performance optimizations
 * - Development tools
 */

import portalManagerService from '../services/portalManagerService';

/**
 * Standard portal configurations for different types of overlays
 */
export const PORTAL_CONFIGS = {
  // Movie and TV show overlays
  MOVIE_DETAILS: {
    priority: 'high',
    group: 'movie-overlays',
    accessibility: true,
    stacking: true,
    debug: process.env.NODE_ENV === 'development'
  },
  
  // Streaming player overlays
  STREAMING_PLAYER: {
    priority: 'critical',
    group: 'streaming',
    accessibility: true,
    stacking: true,
    debug: process.env.NODE_ENV === 'development'
  },
  
  // Navigation overlays (dropdowns, menus)
  NAVIGATION: {
    priority: 'normal',
    group: 'navigation',
    accessibility: true,
    stacking: true,
    debug: process.env.NODE_ENV === 'development'
  },
  
  // Modal dialogs
  MODAL: {
    priority: 'high',
    group: 'modals',
    accessibility: true,
    stacking: true,
    debug: process.env.NODE_ENV === 'development'
  },
  
  // Toast notifications
  TOAST: {
    priority: 'low',
    group: 'notifications',
    accessibility: true,
    stacking: false, // Toasts don't need stacking
    debug: process.env.NODE_ENV === 'development'
  },
  
  // Debug overlays
  DEBUG: {
    priority: 'low',
    group: 'debug',
    accessibility: false,
    stacking: true,
    debug: true
  }
};

/**
 * Generate a unique portal ID based on component type and optional identifier
 */
export const generatePortalId = (type, identifier = null) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  
  if (identifier) {
    return `${type}-portal-${identifier}-${random}`;
  }
  
  return `${type}-portal-${timestamp}-${random}`;
};

/**
 * Standard event handlers for portal management
 */
export const createPortalEventHandlers = (portalId, options = {}) => {
  const {
    onFocus = null,
    onBlur = null,
    onEscape = null,
    onClose = null,
    debug = process.env.NODE_ENV === 'development'
  } = options;

  return {
    onFocus: (id) => {
      if (debug) {
        console.debug(`[Portal] ${id} focused`);
      }
      if (onFocus) onFocus(id);
    },
    
    onBlur: (id) => {
      if (debug) {
        console.debug(`[Portal] ${id} blurred`);
      }
      if (onBlur) onBlur(id);
    },
    
    onEscape: (id) => {
      if (debug) {
        console.debug(`[Portal] ${id} escape key pressed`);
      }
      if (onEscape) onEscape(id);
      if (onClose) onClose();
    }
  };
};

/**
 * Enhanced portal creation with standardized patterns
 */
export const createEnhancedPortal = (type, identifier = null, customConfig = {}) => {
  const config = PORTAL_CONFIGS[type] || PORTAL_CONFIGS.MODAL;
  const portalId = generatePortalId(type, identifier);
  
  const mergedConfig = {
    ...config,
    ...customConfig
  };

  return portalManagerService.createPortal(portalId, mergedConfig);
};

/**
 * Portal accessibility helpers
 */
export const PortalAccessibility = {
  /**
   * Set focus trap for portal content
   */
  setupFocusTrap: (container, onEscape = null) => {
    if (!container) return () => {};

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      } else if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    setTimeout(() => firstElement?.focus(), 100);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Announce portal content to screen readers
   */
  announcePortal: (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  /**
   * Hide content from screen readers when portal is not active
   */
  hideFromScreenReaders: (container, isHidden = true) => {
    if (container) {
      container.setAttribute('aria-hidden', isHidden.toString());
    }
  }
};

/**
 * Portal performance utilities
 */
export const PortalPerformance = {
  /**
   * Debounce portal operations to prevent excessive updates
   */
  debouncePortalOperation: (operation, delay = 100) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => operation(...args), delay);
    };
  },

  /**
   * Throttle portal updates for better performance
   */
  throttlePortalUpdate: (updateFunction, limit = 1000) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        updateFunction(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Monitor portal performance metrics
   */
  monitorPortalPerformance: (portalId) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Portal Performance] ${portalId}: ${duration.toFixed(2)}ms`);
        }
        
        return duration;
      }
    };
  }
};

/**
 * Portal cleanup utilities
 */
export const PortalCleanup = {
  /**
   * Cleanup all portals of a specific group
   */
  cleanupGroup: (group) => {
    portalManagerService.cleanupGroup(group);
  },

  /**
   * Cleanup portals older than specified time
   */
  cleanupOldPortals: (maxAge = 300000) => { // 5 minutes default
    const stackInfo = portalManagerService.getStackInfo();
    const now = Date.now();
    
    stackInfo.activePortals.forEach(portal => {
      if (now - portal.createdAt > maxAge) {
        const portalInfo = portalManagerService.getPortalInfo(portal.id);
        if (portalInfo) {
          portalInfo.cleanup();
        }
      }
    });
  },

  /**
   * Emergency cleanup for memory leaks
   */
  emergencyCleanup: () => {
    console.warn('[Portal Cleanup] Performing emergency cleanup');
    portalManagerService.cleanupAll();
  }
};

/**
 * Development utilities
 */
export const PortalDevUtils = {
  /**
   * Log portal information for debugging
   */
  logPortalInfo: (portalId) => {
    if (process.env.NODE_ENV === 'development') {
      const info = portalManagerService.getPortalInfo(portalId);
      const stackInfo = portalManagerService.getStackInfo();
      
      console.group(`[Portal Debug] ${portalId}`);
      console.log('Portal Info:', info);
      console.log('Stack Info:', stackInfo);
      console.groupEnd();
    }
  },

  /**
   * Get portal statistics
   */
  getPortalStats: () => {
    const stackInfo = portalManagerService.getStackInfo();
    const metrics = portalManagerService.getPerformanceMetrics();
    
    return {
      activePortals: stackInfo.activePortals.length,
      stackDepth: stackInfo.stack.length,
      metrics,
      portalsByGroup: stackInfo.activePortals.reduce((acc, portal) => {
        acc[portal.group] = (acc[portal.group] || 0) + 1;
        return acc;
      }, {})
    };
  },

  /**
   * Export portal data for debugging
   */
  exportPortalData: () => {
    const stackInfo = portalManagerService.getStackInfo();
    const metrics = portalManagerService.getPerformanceMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      stackInfo,
      metrics,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }
};

/**
 * Portal validation utilities
 */
export const PortalValidation = {
  /**
   * Validate portal configuration
   */
  validatePortalConfig: (config) => {
    const errors = [];
    
    if (!config.id) {
      errors.push('Portal ID is required');
    }
    
    if (config.priority && !['low', 'normal', 'high', 'critical'].includes(config.priority)) {
      errors.push('Invalid priority value');
    }
    
    if (config.zIndex && (typeof config.zIndex !== 'number' || config.zIndex < 0)) {
      errors.push('Invalid z-index value');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Check for portal conflicts
   */
  checkPortalConflicts: (portalId) => {
    const existingPortal = portalManagerService.getPortalInfo(portalId);
    return {
      hasConflict: !!existingPortal,
      existingPortal
    };
  }
};

export default {
  PORTAL_CONFIGS,
  generatePortalId,
  createPortalEventHandlers,
  createEnhancedPortal,
  PortalAccessibility,
  PortalPerformance,
  PortalCleanup,
  PortalDevUtils,
  PortalValidation
};
