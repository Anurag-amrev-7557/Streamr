/**
 * Portal Analytics Service
 * 
 * Provides comprehensive analytics and monitoring for portal management.
 * Features:
 * - Real-time portal metrics
 * - Performance monitoring
 * - User interaction tracking
 * - Error tracking and reporting
 * - Custom event tracking
 * - Analytics dashboard data
 */

class PortalAnalyticsService {
  constructor() {
    this.metrics = {
      portals: new Map(),
      events: [],
      errors: [],
      performance: {
        creationTimes: [],
        destructionTimes: [],
        renderTimes: [],
        memoryUsage: []
      },
      userInteractions: {
        clicks: 0,
        keyPresses: 0,
        focusEvents: 0,
        escapePresses: 0
      }
    };
    
    this.isInitialized = false;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.reportingInterval = null;
    this.maxEvents = 1000;
    this.maxErrors = 100;
    
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    this.isInitialized = true;
    this.setupPerformanceMonitoring();
    this.setupEventListeners();
    this.startReporting();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PortalAnalyticsService] Initialized with session ID:', this.sessionId);
    }
  }

  generateSessionId() {
    return `portal_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Portal lifecycle tracking
  trackPortalCreated(portalId, config) {
    if (!this.isInitialized) return;
    
    const portalData = {
      id: portalId,
      config,
      createdAt: Date.now(),
      events: [],
      interactions: 0,
      errors: 0,
      isActive: true
    };
    
    this.metrics.portals.set(portalId, portalData);
    this.trackEvent('portal_created', { portalId, config });
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[PortalAnalytics] Portal created: ${portalId}`);
    }
  }

  trackPortalDestroyed(portalId, reason = 'unknown') {
    if (!this.isInitialized) return;
    
    const portalData = this.metrics.portals.get(portalId);
    if (portalData) {
      portalData.destroyedAt = Date.now();
      portalData.lifetime = portalData.destroyedAt - portalData.createdAt;
      portalData.isActive = false;
      portalData.destroyReason = reason;
      
      this.trackEvent('portal_destroyed', { 
        portalId, 
        lifetime: portalData.lifetime,
        reason 
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[PortalAnalytics] Portal destroyed: ${portalId} (${portalData.lifetime}ms)`);
      }
    }
  }

  trackPortalEvent(portalId, eventType, data = {}) {
    if (!this.isInitialized) return;
    
    const portalData = this.metrics.portals.get(portalId);
    if (portalData) {
      portalData.events.push({
        type: eventType,
        data,
        timestamp: Date.now()
      });
      
      // Limit events per portal
      if (portalData.events.length > 100) {
        portalData.events = portalData.events.slice(-100);
      }
    }
    
    this.trackEvent(`portal_${eventType}`, { portalId, ...data });
  }

  // Performance tracking
  trackPerformanceMetric(type, value, portalId = null) {
    if (!this.isInitialized) return;
    
    const metric = {
      type,
      value,
      portalId,
      timestamp: Date.now()
    };
    
    if (this.metrics.performance[type]) {
      this.metrics.performance[type].push(metric);
      
      // Limit performance metrics
      if (this.metrics.performance[type].length > 500) {
        this.metrics.performance[type] = this.metrics.performance[type].slice(-500);
      }
    }
  }

  trackPortalCreationTime(portalId, startTime, endTime) {
    const duration = endTime - startTime;
    this.trackPerformanceMetric('creationTimes', duration, portalId);
    
    if (duration > 100) { // Log slow creations
      this.trackEvent('slow_portal_creation', { portalId, duration });
    }
  }

  trackPortalDestructionTime(portalId, startTime, endTime) {
    const duration = endTime - startTime;
    this.trackPerformanceMetric('destructionTimes', duration, portalId);
  }

  trackPortalRenderTime(portalId, startTime, endTime) {
    const duration = endTime - startTime;
    this.trackPerformanceMetric('renderTimes', duration, portalId);
  }

  // User interaction tracking
  trackUserInteraction(type, portalId = null, data = {}) {
    if (!this.isInitialized) return;
    
    this.metrics.userInteractions[type] = (this.metrics.userInteractions[type] || 0) + 1;
    
    this.trackEvent('user_interaction', {
      type,
      portalId,
      ...data
    });
    
    // Track per-portal interactions
    if (portalId) {
      const portalData = this.metrics.portals.get(portalId);
      if (portalData) {
        portalData.interactions++;
      }
    }
  }

  trackClick(portalId, element, coordinates) {
    this.trackUserInteraction('clicks', portalId, {
      element: element?.tagName || 'unknown',
      coordinates
    });
  }

  trackKeyPress(portalId, key, element) {
    this.trackUserInteraction('keyPresses', portalId, {
      key,
      element: element?.tagName || 'unknown'
    });
    
    if (key === 'Escape') {
      this.trackUserInteraction('escapePresses', portalId);
    }
  }

  trackFocusEvent(portalId, element) {
    this.trackUserInteraction('focusEvents', portalId, {
      element: element?.tagName || 'unknown'
    });
  }

  // Error tracking
  trackError(error, portalId = null, context = {}) {
    if (!this.isInitialized) return;
    
    const errorData = {
      message: error.message || error,
      stack: error.stack,
      portalId,
      context,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };
    
    this.metrics.errors.push(errorData);
    
    // Limit errors
    if (this.metrics.errors.length > this.maxErrors) {
      this.metrics.errors = this.metrics.errors.slice(-this.maxErrors);
    }
    
    // Track per-portal errors
    if (portalId) {
      const portalData = this.metrics.portals.get(portalId);
      if (portalData) {
        portalData.errors++;
      }
    }
    
    this.trackEvent('portal_error', { portalId, error: errorData });
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[PortalAnalytics] Error tracked:`, errorData);
    }
  }

  // Custom event tracking
  trackEvent(eventType, data = {}) {
    if (!this.isInitialized) return;
    
    const event = {
      type: eventType,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };
    
    this.metrics.events.push(event);
    
    // Limit events
    if (this.metrics.events.length > this.maxEvents) {
      this.metrics.events = this.metrics.events.slice(-this.maxEvents);
    }
  }

  // Performance monitoring setup
  setupPerformanceMonitoring() {
    if (typeof window === 'undefined') return;
    
    // Monitor memory usage
    if ('memory' in performance) {
      this.memoryMonitorInterval = setInterval(() => {
        const memoryInfo = performance.memory;
        this.trackPerformanceMetric('memoryUsage', {
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize,
          limit: memoryInfo.jsHeapSizeLimit
        });
      }, 30000); // Every 30 seconds
    }
    
    // Monitor frame rate
    let lastTime = performance.now();
    let frameCount = 0;
    
    this.measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.trackPerformanceMetric('fps', fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      this.fpsAnimationId = requestAnimationFrame(this.measureFPS);
    };
    
    this.fpsAnimationId = requestAnimationFrame(this.measureFPS);
  }

  setupEventListeners() {
    if (typeof window === 'undefined') return;
    
    // Global click tracking
    this.clickHandler = (event) => {
      const portalElement = event.target.closest('[data-portal-id]');
      if (portalElement) {
        const portalId = portalElement.getAttribute('data-portal-id');
        this.trackClick(portalId, event.target, {
          x: event.clientX,
          y: event.clientY
        });
      }
    };
    document.addEventListener('click', this.clickHandler);
    
    // Global key press tracking
    this.keydownHandler = (event) => {
      const activeElement = document.activeElement;
      const portalElement = activeElement?.closest('[data-portal-id]');
      if (portalElement) {
        const portalId = portalElement.getAttribute('data-portal-id');
        this.trackKeyPress(portalId, event.key, activeElement);
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
    
    // Global focus tracking
    this.focusinHandler = (event) => {
      const portalElement = event.target.closest('[data-portal-id]');
      if (portalElement) {
        const portalId = portalElement.getAttribute('data-portal-id');
        this.trackFocusEvent(portalId, event.target);
      }
    };
    document.addEventListener('focusin', this.focusinHandler);
  }

  startReporting() {
    // Report metrics every 5 minutes
    this.reportingInterval = setInterval(() => {
      this.reportMetrics();
    }, 5 * 60 * 1000);
  }

  reportMetrics() {
    if (process.env.NODE_ENV === 'development') {
      console.group('[PortalAnalytics] Metrics Report');
      console.table(this.getPortalSummary());
      console.log('Performance:', this.getPerformanceSummary());
      console.log('User Interactions:', this.metrics.userInteractions);
      console.log('Errors:', this.metrics.errors.length);
      console.groupEnd();
    }
  }

  // Analytics data methods
  getPortalSummary() {
    const summary = [];
    
    for (const [portalId, data] of this.metrics.portals.entries()) {
      summary.push({
        id: portalId,
        lifetime: data.lifetime || (Date.now() - data.createdAt),
        events: data.events.length,
        interactions: data.interactions,
        errors: data.errors,
        isActive: data.isActive
      });
    }
    
    return summary;
  }

  getPerformanceSummary() {
    const summary = {};
    
    Object.keys(this.metrics.performance).forEach(key => {
      const metrics = this.metrics.performance[key];
      if (metrics.length > 0) {
        const values = metrics.map(m => m.value);
        summary[key] = {
          count: values.length,
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      }
    });
    
    return summary;
  }

  getSessionMetrics() {
    const sessionDuration = Date.now() - this.startTime;
    const activePortals = Array.from(this.metrics.portals.values()).filter(p => p.isActive).length;
    
    return {
      sessionId: this.sessionId,
      duration: sessionDuration,
      activePortals,
      totalPortals: this.metrics.portals.size,
      totalEvents: this.metrics.events.length,
      totalErrors: this.metrics.errors.length,
      userInteractions: this.metrics.userInteractions
    };
  }

  // Export and import
  exportAnalytics() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      metrics: this.metrics,
      exportedAt: Date.now()
    };
  }

  // Cleanup
  cleanup() {
    // Clear intervals
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    // Cancel animation frame
    if (this.fpsAnimationId) {
      cancelAnimationFrame(this.fpsAnimationId);
      this.fpsAnimationId = null;
    }
    
    // Remove event listeners
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
    
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    
    if (this.focusinHandler) {
      document.removeEventListener('focusin', this.focusinHandler);
      this.focusinHandler = null;
    }
    
    // Clear all data structures
    this.metrics.portals.clear();
    this.metrics.events = [];
    this.metrics.errors = [];
    this.metrics.performance = {
      creationTimes: [],
      destructionTimes: [],
      renderTimes: [],
      memoryUsage: []
    };
    this.metrics.userInteractions = {
      clicks: 0,
      keyPresses: 0,
      focusEvents: 0,
      escapePresses: 0
    };
    
    // Clear function references
    this.measureFPS = null;
  }
}

// Create singleton instance
const portalAnalyticsService = new PortalAnalyticsService();

export default portalAnalyticsService;
