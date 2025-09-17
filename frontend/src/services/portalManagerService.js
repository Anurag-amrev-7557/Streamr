/**
 * Enhanced Portal Management Service
 * 
 * This service provides comprehensive portal management capabilities including:
 * - Portal lifecycle management
 * - Z-index stacking coordination
 * - Memory leak prevention
 * - Accessibility management
 * - Performance monitoring
 * - Event coordination between portals
 * - Animation coordination
 * - State persistence
 * - Analytics tracking
 * - Advanced theming support
 * - Cross-device synchronization
 */

class PortalManagerService {
  constructor() {
    this.portals = new Map();
    this.stack = [];
    this.eventListeners = new Map();
    this.performanceMetrics = new Map();
    this.baseZIndex = 2147483647;
    this.debugMode = process.env.NODE_ENV === 'development';
    this.isInitialized = false;
    
    // Enhanced services integration
    this.animationService = null;
    this.stateService = null;
    this.analyticsService = null;
    this.accessibilityService = null;
    
    // Advanced features
    this.themeConfig = {
      current: 'default',
      customStyles: new Map(),
      darkMode: false,
      highContrast: false
    };
    
    this.syncConfig = {
      enabled: false,
      sessionId: null,
      lastSync: null
    };
    
    // Performance monitoring
    this.metrics = {
      portalsCreated: 0,
      portalsDestroyed: 0,
      memoryLeaksDetected: 0,
      averageLifetime: 0,
      maxConcurrentPortals: 0,
      animationPerformance: [],
      stateOperations: 0,
      analyticsEvents: 0
    };

    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    this.isInitialized = true;
    
    // Initialize enhanced services
    this.initializeEnhancedServices();
    
    // Global event listeners for portal coordination
    this.setupGlobalEventListeners();
    
    // Performance monitoring
    this.startPerformanceMonitoring();
    
    // Theme detection
    this.detectThemePreferences();
    
    // Sync configuration
    this.setupSyncConfiguration();
    
    if (this.debugMode) {
      console.debug('[PortalManagerService] Enhanced initialization complete');
    }
  }

  async initializeEnhancedServices() {
    try {
      // Dynamically import enhanced services
      const [
        { default: animationService },
        { default: stateService },
        { default: analyticsService },
        { default: accessibilityService }
      ] = await Promise.all([
        import('./portalAnimationService'),
        import('./portalStateService'),
        import('./portalAnalyticsService'),
        import('./portalAccessibilityService')
      ]);

      this.animationService = animationService;
      this.stateService = stateService;
      this.analyticsService = analyticsService;
      this.accessibilityService = accessibilityService;

      if (this.debugMode) {
        console.debug('[PortalManagerService] Enhanced services loaded');
      }
    } catch (error) {
      console.warn('[PortalManagerService] Failed to load enhanced services:', error);
    }
  }

  detectThemePreferences() {
    if (typeof window === 'undefined') return;

    // Detect dark mode
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.themeConfig.darkMode = darkModeQuery.matches;
      
      this.darkModeHandler = (e) => {
        this.themeConfig.darkMode = e.matches;
        this.updateThemeStyles();
      };
      darkModeQuery.addEventListener('change', this.darkModeHandler);

      // Detect high contrast
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      this.themeConfig.highContrast = highContrastQuery.matches;
      
      this.highContrastHandler = (e) => {
        this.themeConfig.highContrast = e.matches;
        this.updateThemeStyles();
      };
      highContrastQuery.addEventListener('change', this.highContrastHandler);
      
      // Store references for cleanup
      this.mediaQueryListeners = {
        darkMode: { query: darkModeQuery, handler: this.darkModeHandler },
        highContrast: { query: highContrastQuery, handler: this.highContrastHandler }
      };
    }
  }

  setupSyncConfiguration() {
    this.syncConfig.sessionId = `portal_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.syncConfig.lastSync = Date.now();
  }

  setupGlobalEventListeners() {
    // Listen for portal-related events
    this.beforeUnloadHandler = () => {
      this.cleanupAll();
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    // Monitor memory usage
    if ('memory' in performance) {
      this.memoryMonitorInterval = setInterval(() => {
        this.monitorMemoryUsage();
      }, 30000); // Check every 30 seconds
    }
  }

  startPerformanceMonitoring() {
    // Track portal creation/destruction metrics
    const originalCreatePortal = this.createPortal.bind(this);
    const originalRemovePortal = this.removePortal.bind(this);

    this.createPortal = (...args) => {
      const startTime = performance.now();
      const result = originalCreatePortal(...args);
      const endTime = performance.now();
      
      this.metrics.portalsCreated++;
      this.metrics.maxConcurrentPortals = Math.max(
        this.metrics.maxConcurrentPortals,
        this.portals.size
      );
      
      this.performanceMetrics.set(result.id, {
        createdAt: Date.now(),
        creationTime: endTime - startTime,
        isActive: true
      });
      
      return result;
    };

    this.removePortal = (...args) => {
      const startTime = performance.now();
      const result = originalRemovePortal(...args);
      const endTime = performance.now();
      
      this.metrics.portalsDestroyed++;
      
      const portalId = args[0];
      const metrics = this.performanceMetrics.get(portalId);
      if (metrics) {
        metrics.destroyedAt = Date.now();
        metrics.destroyTime = endTime - startTime;
        metrics.lifetime = metrics.destroyedAt - metrics.createdAt;
        metrics.isActive = false;
        
        // Update average lifetime
        const activePortals = Array.from(this.performanceMetrics.values())
          .filter(m => m.lifetime);
        this.metrics.averageLifetime = activePortals.reduce(
          (sum, m) => sum + m.lifetime, 0
        ) / activePortals.length;
      }
      
      return result;
    };
  }

  monitorMemoryUsage() {
    if ('memory' in performance) {
      const memoryInfo = performance.memory;
      const usedMemory = memoryInfo.usedJSHeapSize / 1024 / 1024; // MB
      
      // Alert if memory usage is high
      if (usedMemory > 100) { // 100MB threshold
        console.warn('[PortalManagerService] High memory usage detected:', {
          usedMemory: `${usedMemory.toFixed(2)}MB`,
          activePortals: this.portals.size,
          stackDepth: this.stack.length
        });
        
        this.metrics.memoryLeaksDetected++;
      }
    }
  }

  /**
   * Create a new portal with advanced management
   */
  createPortal(id, options = {}) {
    if (!this.isInitialized || typeof window === 'undefined') {
      return { container: null, portal: null, cleanup: () => {} };
    }

    const {
      zIndex = this.getNextZIndex(),
      accessibility = true,
      stacking = true,
      cleanup = true,
      debug = this.debugMode,
      priority = 'normal', // 'low', 'normal', 'high', 'critical'
      group = 'default', // Group portals for coordinated management
      onFocus = null,
      onBlur = null,
      onEscape = null
    } = options;

    // Check if portal already exists
    if (this.portals.has(id)) {
      console.warn(`[PortalManagerService] Portal ${id} already exists`);
      return this.portals.get(id);
    }

    let container = document.getElementById(id);
    let isNewContainer = false;

    if (!container) {
      container = document.createElement('div');
      container.id = id;
      container.className = `portal-container ${id} ${group}`;
      
      // Enhanced styling with performance optimizations
      Object.assign(container.style, {
        position: 'fixed',
        inset: '0',
        zIndex: zIndex.toString(),
        pointerEvents: 'none',
        contain: 'layout style paint',
        isolation: 'isolate',
        willChange: 'transform, opacity' // Optimize for animations
      });

      // Accessibility attributes
      if (accessibility) {
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('tabindex', '-1');
        container.setAttribute('aria-hidden', 'false');
        container.setAttribute('aria-label', `Portal ${id}`);
      }

      // Add data attributes for debugging
      container.setAttribute('data-portal-id', id);
      container.setAttribute('data-portal-group', group);
      container.setAttribute('data-portal-priority', priority);
      container.setAttribute('data-portal-created', Date.now().toString());

      document.body.appendChild(container);
      isNewContainer = true;

      if (debug) {
        console.debug(`[PortalManagerService] Created portal: ${id}`, {
          zIndex,
          priority,
          group,
          stacking,
          accessibility
        });
      }
    }

    // Create portal utilities
    const portalUtils = {
      container,
      id,
      zIndex,
      priority,
      group,
      options,
      createdAt: Date.now(),
      isActive: true,
      
      // Enhanced portal creation
      portal: (content) => {
        if (!container || !content) return null;
        return ReactDOM.createPortal(content, container);
      },
      
      // Focus management
      focus: () => {
        if (container) {
          container.focus();
          if (onFocus) onFocus(id);
        }
      },
      
      // Blur management
      blur: () => {
        if (container) {
          container.blur();
          if (onBlur) onBlur(id);
        }
      },
      
      // Update z-index
      updateZIndex: (newZIndex) => {
        this.updatePortalZIndex(id, newZIndex);
      },
      
      // Move to top of stack
      bringToFront: () => {
        this.bringPortalToFront(id);
      },
      
      // Move to back of stack
      sendToBack: () => {
        this.sendPortalToBack(id);
      },
      
      // Cleanup function
      cleanup: () => {
        this.removePortal(id, cleanup);
      }
    };

    // Register portal
    this.portals.set(id, portalUtils);

    // Add to stack if stacking is enabled
    if (stacking) {
      this.addToStack(id, zIndex, priority);
    }

    // Setup event listeners
    this.setupPortalEventListeners(id, { onFocus, onBlur, onEscape });

    return portalUtils;
  }

  /**
   * Remove a portal with enhanced cleanup
   */
  removePortal(id, shouldCleanup = true) {
    const portalInfo = this.portals.get(id);
    if (!portalInfo) return;

    const { container } = portalInfo;
    
    // Remove event listeners
    this.removePortalEventListeners(id);
    
    if (shouldCleanup && container && container.parentNode) {
      try {
        // Enhanced cleanup with animation support
        if (container.childElementCount === 0) {
          this.performCleanup(container, id);
        } else {
          // Wait for children to be removed with enhanced monitoring
          this.performDelayedCleanup(container, id);
        }
      } catch (error) {
        console.warn(`[PortalManagerService] Cleanup error for portal ${id}:`, error);
      }
    }

    // Remove from registry and stack
    this.portals.delete(id);
    this.removeFromStack(id);
    
    portalInfo.isActive = false;
    
    if (this.debugMode) {
      console.debug(`[PortalManagerService] Removed portal: ${id}`);
    }
  }

  performCleanup(container, id) {
    // Add cleanup animation if supported
    if (container.style.transition) {
      container.style.opacity = '0';
      setTimeout(() => {
        try {
          container.parentNode.removeChild(container);
        } catch (error) {
          console.warn(`[PortalManagerService] Final cleanup failed for ${id}:`, error);
        }
      }, 150);
    } else {
      container.parentNode.removeChild(container);
    }
  }

  performDelayedCleanup(container, id) {
    const observer = new MutationObserver(() => {
      if (container.childElementCount === 0) {
        observer.disconnect();
        this.performCleanup(container, id);
      }
    });
    
    observer.observe(container, { childList: true });
    
    // Store observer for potential cleanup
    if (!this.activeObservers) {
      this.activeObservers = new Map();
    }
    this.activeObservers.set(id, observer);
    
    // Force cleanup after timeout
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      this.activeObservers?.delete(id);
      if (container.parentNode && container.childElementCount === 0) {
        this.performCleanup(container, id);
      }
    }, 1000);
    
    // Store timeout for cleanup
    if (!this.activeTimeouts) {
      this.activeTimeouts = new Map();
    }
    this.activeTimeouts.set(id, timeoutId);
  }

  setupPortalEventListeners(id, callbacks) {
    const { onFocus, onBlur, onEscape } = callbacks;
    const listeners = [];

    if (onFocus) {
      const focusHandler = () => onFocus(id);
      document.addEventListener('focusin', focusHandler);
      listeners.push({ type: 'focusin', handler: focusHandler });
    }

    if (onBlur) {
      const blurHandler = () => onBlur(id);
      document.addEventListener('focusout', blurHandler);
      listeners.push({ type: 'focusout', handler: blurHandler });
    }

    if (onEscape) {
      const escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isTopPortal(id)) {
          onEscape(id);
        }
      };
      document.addEventListener('keydown', escapeHandler);
      listeners.push({ type: 'keydown', handler: escapeHandler });
    }

    this.eventListeners.set(id, listeners);
  }

  removePortalEventListeners(id) {
    const listeners = this.eventListeners.get(id);
    if (listeners) {
      listeners.forEach(({ type, handler }) => {
        document.removeEventListener(type, handler);
      });
      this.eventListeners.delete(id);
    }
  }

  addToStack(id, zIndex, priority) {
    const stackItem = { id, zIndex, priority, addedAt: Date.now() };
    
    // Insert based on priority and z-index
    const insertIndex = this.stack.findIndex(item => 
      this.getPriorityWeight(item.priority) < this.getPriorityWeight(priority) ||
      (this.getPriorityWeight(item.priority) === this.getPriorityWeight(priority) && item.zIndex < zIndex)
    );
    
    if (insertIndex === -1) {
      this.stack.push(stackItem);
    } else {
      this.stack.splice(insertIndex, 0, stackItem);
    }
  }

  removeFromStack(id) {
    this.stack = this.stack.filter(item => item.id !== id);
  }

  getPriorityWeight(priority) {
    const weights = { low: 1, normal: 2, high: 3, critical: 4 };
    return weights[priority] || 2;
  }

  getNextZIndex() {
    return ++this.baseZIndex;
  }

  updatePortalZIndex(id, newZIndex) {
    const portalInfo = this.portals.get(id);
    if (portalInfo && portalInfo.container) {
      portalInfo.container.style.zIndex = newZIndex.toString();
      portalInfo.zIndex = newZIndex;
      
      // Update stack
      this.removeFromStack(id);
      this.addToStack(id, newZIndex, portalInfo.priority);
    }
  }

  bringPortalToFront(id) {
    const newZIndex = this.getNextZIndex();
    this.updatePortalZIndex(id, newZIndex);
  }

  sendPortalToBack(id) {
    const portalInfo = this.portals.get(id);
    if (portalInfo) {
      const minZIndex = Math.min(...this.stack.map(item => item.zIndex)) - 1;
      this.updatePortalZIndex(id, minZIndex);
    }
  }

  isTopPortal(id) {
    return this.stack.length > 0 && this.stack[0].id === id;
  }

  getStackInfo() {
    return {
      activePortals: Array.from(this.portals.entries()).map(([id, info]) => ({
        id,
        zIndex: info.zIndex,
        priority: info.priority,
        group: info.group,
        isActive: info.isActive,
        createdAt: info.createdAt
      })),
      stack: [...this.stack],
      metrics: { ...this.metrics }
    };
  }

  getPortalInfo(id) {
    return this.portals.get(id);
  }

  getPortalsByGroup(group) {
    return Array.from(this.portals.values()).filter(portal => portal.group === group);
  }

  cleanupGroup(group) {
    const groupPortals = this.getPortalsByGroup(group);
    groupPortals.forEach(portal => this.removePortal(portal.id, true));
  }

  cleanupAll() {
    const portalIds = Array.from(this.portals.keys());
    portalIds.forEach(id => this.removePortal(id, true));
    
    // Clear all event listeners
    this.eventListeners.clear();
    
    if (this.debugMode) {
      console.debug('[PortalManagerService] Cleaned up all portals');
    }
  }

  // Debug utilities
  debugPortals() {
    if (!this.debugMode) return;
    
    console.group('[PortalManagerService] Debug Info');
    console.table(this.getStackInfo().activePortals);
    console.log('Stack:', this.stack);
    console.log('Metrics:', this.metrics);
    console.groupEnd();
  }

  // Enhanced theme management
  updateThemeStyles() {
    const containers = document.querySelectorAll('.portal-container');
    containers.forEach(container => {
      if (this.themeConfig.darkMode) {
        container.classList.add('portal-dark-mode');
      } else {
        container.classList.remove('portal-dark-mode');
      }
      
      if (this.themeConfig.highContrast) {
        container.classList.add('portal-high-contrast');
      } else {
        container.classList.remove('portal-high-contrast');
      }
    });
  }

  setTheme(themeName, customStyles = {}) {
    this.themeConfig.current = themeName;
    this.themeConfig.customStyles.set(themeName, customStyles);
    this.updateThemeStyles();
  }

  // Enhanced animation coordination
  coordinateAnimations(portalIds, animationType = 'modal') {
    if (!this.animationService || typeof this.animationService.createCoordinatedAnimation !== 'function') {
      console.warn('[PortalManagerService] Animation service not available or invalid');
      return;
    }
    
    try {
      const portals = portalIds.map(id => this.portals.get(id)).filter(Boolean);
      const animations = this.animationService.createCoordinatedAnimation(portals, animationType);
      
      if (Array.isArray(animations)) {
        animations.forEach(animation => {
          if (animation && animation.portalId) {
            this.animationService.queueAnimation(animation.portalId, {
              type: 'enter',
              ...animation
            });
          }
        });
      }
    } catch (error) {
      console.warn('[PortalManagerService] Animation coordination failed:', error);
    }
  }

  // Enhanced state management
  savePortalState(portalId, state) {
    if (this.stateService) {
      this.stateService.savePortalState(portalId, state);
      this.metrics.stateOperations++;
    }
  }

  loadPortalState(portalId) {
    if (this.stateService) {
      return this.stateService.loadPortalState(portalId);
    }
    return null;
  }

  // Enhanced analytics integration
  trackPortalEvent(portalId, eventType, data = {}) {
    if (this.analyticsService) {
      this.analyticsService.trackPortalEvent(portalId, eventType, data);
      this.metrics.analyticsEvents++;
    }
  }

  // Enhanced accessibility integration
  setupPortalAccessibility(portalId, options = {}) {
    if (this.accessibilityService && typeof this.accessibilityService.setupPortalAttributes === 'function') {
      const portalInfo = this.portals.get(portalId);
      if (portalInfo && portalInfo.container) {
        try {
          this.accessibilityService.setupPortalAttributes(portalInfo.container, {
            portalId,
            ...options
          });
          
          const cleanup = this.accessibilityService.setupFocusTrap(portalInfo.container);
          return cleanup || (() => {});
        } catch (error) {
          console.warn(`[PortalManagerService] Accessibility setup failed for ${portalId}:`, error);
          return () => {};
        }
      }
    }
    return () => {};
  }

  // Cross-device synchronization
  enableSync(enabled = true) {
    this.syncConfig.enabled = enabled;
    if (enabled) {
      this.setupSyncListeners();
    }
  }

  setupSyncListeners() {
    // Listen for portal state changes to sync
    const originalCreatePortal = this.createPortal.bind(this);
    const originalRemovePortal = this.removePortal.bind(this);

    this.createPortal = (...args) => {
      const result = originalCreatePortal(...args);
      if (this.syncConfig.enabled) {
        this.syncPortalState(args[0], 'created');
      }
      return result;
    };

    this.removePortal = (...args) => {
      const result = originalRemovePortal(...args);
      if (this.syncConfig.enabled) {
        this.syncPortalState(args[0], 'removed');
      }
      return result;
    };
  }

  syncPortalState(portalId, action) {
    // Implementation would depend on your sync mechanism
    // This is a placeholder for cross-device synchronization
    if (this.debugMode) {
      console.debug(`[PortalManagerService] Syncing portal ${portalId} ${action}`);
    }
  }

  // Advanced portal utilities
  createPortalGroup(groupId, options = {}) {
    const groupPortals = this.getPortalsByGroup(groupId);
    return {
      id: groupId,
      portals: groupPortals,
      createPortal: (id, portalOptions = {}) => {
        return this.createPortal(id, { ...options, ...portalOptions, group: groupId });
      },
      removeAll: () => this.cleanupGroup(groupId),
      coordinateAnimations: (animationType) => {
        const portalIds = groupPortals.map(p => p.id);
        this.coordinateAnimations(portalIds, animationType);
      }
    };
  }

  // Performance utilities
  getPerformanceMetrics() {
    const baseMetrics = {
      ...this.metrics,
      activePortals: this.portals.size,
      stackDepth: this.stack.length,
      memoryUsage: 'memory' in performance ? 
        `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    };

    // Add enhanced service metrics
    if (this.animationService) {
      baseMetrics.animationMetrics = this.animationService.getPerformanceMetrics();
    }
    
    if (this.stateService) {
      baseMetrics.stateMetrics = this.stateService.getStateMetrics();
    }
    
    if (this.analyticsService) {
      baseMetrics.analyticsMetrics = this.analyticsService.getSessionMetrics();
    }

    return baseMetrics;
  }

  // Enhanced debugging
  debugPortals() {
    if (!this.debugMode) return;
    
    console.group('[PortalManagerService] Enhanced Debug Info');
    console.table(this.getStackInfo().activePortals);
    console.log('Stack:', this.stack);
    console.log('Metrics:', this.metrics);
    console.log('Theme Config:', this.themeConfig);
    console.log('Sync Config:', this.syncConfig);
    
    if (this.animationService) {
      console.log('Animation Metrics:', this.animationService.getPerformanceMetrics());
    }
    
    if (this.stateService) {
      console.log('State Metrics:', this.stateService.getStateMetrics());
    }
    
    if (this.analyticsService) {
      console.log('Analytics Metrics:', this.analyticsService.getSessionMetrics());
    }
    
    console.groupEnd();
  }

  // Cleanup with enhanced services
  cleanupAll() {
    const portalIds = Array.from(this.portals.keys());
    portalIds.forEach(id => this.removePortal(id, true));
    
    // Clear all event listeners
    this.eventListeners.clear();
    
    // Cleanup global event listeners
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    
    // Cleanup memory monitoring interval
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    // Cleanup media query listeners
    if (this.mediaQueryListeners) {
      Object.values(this.mediaQueryListeners).forEach(({ query, handler }) => {
        query.removeEventListener('change', handler);
      });
      this.mediaQueryListeners = null;
    }
    
    // Cleanup active observers
    if (this.activeObservers) {
      this.activeObservers.forEach(observer => observer.disconnect());
      this.activeObservers.clear();
    }
    
    // Cleanup active timeouts
    if (this.activeTimeouts) {
      this.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      this.activeTimeouts.clear();
    }
    
    // Cleanup enhanced services
    if (this.animationService) {
      this.animationService.cleanup();
    }
    
    if (this.stateService) {
      this.stateService.cleanup();
    }
    
    if (this.analyticsService) {
      this.analyticsService.cleanup();
    }
    
    if (this.accessibilityService) {
      this.accessibilityService.cleanup();
    }
    
    // Clear all maps and arrays
    this.portals.clear();
    this.stack = [];
    this.performanceMetrics.clear();
    this.themeConfig.customStyles.clear();
    
    if (this.debugMode) {
      console.debug('[PortalManagerService] Enhanced cleanup complete');
    }
  }
}

// Create singleton instance
const portalManagerService = new PortalManagerService();

// Export for React components
export default portalManagerService;

// Export class for testing
export { PortalManagerService };
