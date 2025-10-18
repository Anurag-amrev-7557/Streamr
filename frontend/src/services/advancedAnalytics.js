/**
 * Advanced Analytics & Telemetry Service
 * Tracks user interactions, performance metrics, and provides insights
 */
import { useEffect, useCallback, useRef } from 'react';

/**
 * Analytics Event Types
 */
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  USER_INTERACTION: 'user_interaction',
  CONTENT_VIEW: 'content_view',
  SEARCH: 'search',
  FILTER: 'filter',
  ERROR: 'error',
  PERFORMANCE: 'performance',
  ENGAGEMENT: 'engagement'
};

/**
 * Analytics Queue with Batching
 */
class AnalyticsQueue {
  constructor() {
    this.queue = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    this.timer = null;
    this.isOnline = navigator.onLine;
    
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    // Flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });
  }

  add(event) {
    this.queue.push({
      ...event,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    });

    // Auto flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  scheduleFlush() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.flushInterval);
  }

  async flush(useBeacon = false) {
    if (this.queue.length === 0) return;
    if (!this.isOnline && !useBeacon) {
      this.persistToStorage();
      return;
    }

    const events = [...this.queue];
    this.queue = [];

    try {
      if (useBeacon && navigator.sendBeacon) {
        // Use sendBeacon for reliable delivery during page unload
        const blob = new Blob([JSON.stringify(events)], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics', blob);
      } else {
        // Regular fetch for normal cases
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(events),
          keepalive: true
        });
      }

      // Clear persisted events on successful send
      this.clearPersistedEvents();
    } catch (error) {
      console.error('Failed to send analytics:', error);
      // Re-add events to queue for retry
      this.queue.unshift(...events);
      this.persistToStorage();
    }
  }

  persistToStorage() {
    try {
      localStorage.setItem('analytics_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist analytics:', error);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('analytics_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        localStorage.removeItem('analytics_queue');
        this.flush();
      }
    } catch (error) {
      console.error('Failed to load analytics from storage:', error);
    }
  }

  clearPersistedEvents() {
    try {
      localStorage.removeItem('analytics_queue');
    } catch (error) {
      console.error('Failed to clear persisted analytics:', error);
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  getUserId() {
    try {
      const userId = localStorage.getItem('user_id');
      return userId || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }
}

const analyticsQueue = new AnalyticsQueue();

// Load persisted events on initialization
analyticsQueue.loadFromStorage();

/**
 * Track Analytics Event
 */
export const trackEvent = (type, data = {}) => {
  analyticsQueue.add({
    type,
    data,
    url: window.location.pathname,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`
  });
};

/**
 * User Interaction Tracker Hook
 */
export const useInteractionTracker = (componentName) => {
  const interactionStartRef = useRef(null);
  const totalInteractionTimeRef = useRef(0);

  const trackInteraction = useCallback((action, metadata = {}) => {
    trackEvent(ANALYTICS_EVENTS.USER_INTERACTION, {
      component: componentName,
      action,
      ...metadata
    });
  }, [componentName]);

  const startEngagement = useCallback(() => {
    interactionStartRef.current = Date.now();
  }, []);

  const endEngagement = useCallback(() => {
    if (interactionStartRef.current) {
      const duration = Date.now() - interactionStartRef.current;
      totalInteractionTimeRef.current += duration;
      
      trackEvent(ANALYTICS_EVENTS.ENGAGEMENT, {
        component: componentName,
        duration,
        totalTime: totalInteractionTimeRef.current
      });
      
      interactionStartRef.current = null;
    }
  }, [componentName]);

  useEffect(() => {
    return () => {
      if (interactionStartRef.current) {
        endEngagement();
      }
    };
  }, [endEngagement]);

  return {
    trackInteraction,
    startEngagement,
    endEngagement
  };
};

/**
 * Content Viewing Tracker
 */
export const useContentTracker = () => {
  const viewStartTimeRef = useRef(new Map());

  const trackContentView = useCallback((contentId, contentType, metadata = {}) => {
    trackEvent(ANALYTICS_EVENTS.CONTENT_VIEW, {
      contentId,
      contentType,
      ...metadata
    });

    viewStartTimeRef.current.set(contentId, Date.now());
  }, []);

  const trackContentEngagement = useCallback((contentId, action, metadata = {}) => {
    const viewStartTime = viewStartTimeRef.current.get(contentId);
    const viewDuration = viewStartTime ? Date.now() - viewStartTime : 0;

    trackEvent(ANALYTICS_EVENTS.ENGAGEMENT, {
      contentId,
      action,
      viewDuration,
      ...metadata
    });
  }, []);

  const endContentView = useCallback((contentId) => {
    const viewStartTime = viewStartTimeRef.current.get(contentId);
    if (viewStartTime) {
      const viewDuration = Date.now() - viewStartTime;
      
      trackEvent(ANALYTICS_EVENTS.ENGAGEMENT, {
        contentId,
        action: 'view_end',
        viewDuration
      });

      viewStartTimeRef.current.delete(contentId);
    }
  }, []);

  return {
    trackContentView,
    trackContentEngagement,
    endContentView
  };
};

/**
 * Performance Metrics Tracker
 */
export const usePerformanceTracker = (pageName) => {
  useEffect(() => {
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        trackEvent(ANALYTICS_EVENTS.PERFORMANCE, {
          metric: 'lcp',
          value: lastEntry.renderTime || lastEntry.loadTime,
          page: pageName,
          rating: lastEntry.renderTime < 2500 ? 'good' : lastEntry.renderTime < 4000 ? 'needs-improvement' : 'poor'
        });
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observation failed:', e);
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = entry.processingStart - entry.startTime;
          
          trackEvent(ANALYTICS_EVENTS.PERFORMANCE, {
            metric: 'fid',
            value: fid,
            page: pageName,
            rating: fid < 100 ? 'good' : fid < 300 ? 'needs-improvement' : 'poor'
          });
        });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observation failed:', e);
      }

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observation failed:', e);
      }

      // Report CLS on page unload
      const reportCLS = () => {
        trackEvent(ANALYTICS_EVENTS.PERFORMANCE, {
          metric: 'cls',
          value: clsValue,
          page: pageName,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
        });
      };

      window.addEventListener('beforeunload', reportCLS);

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
        window.removeEventListener('beforeunload', reportCLS);
      };
    }
  }, [pageName]);
};

/**
 * Error Tracking
 */
export const trackError = (error, errorInfo = {}) => {
  trackEvent(ANALYTICS_EVENTS.ERROR, {
    message: error.message || String(error),
    stack: error.stack,
    ...errorInfo
  });
};

/**
 * User Behavior Analysis Hook
 */
export const useBehaviorAnalysis = () => {
  const interactionPatternRef = useRef([]);
  const scrollDepthRef = useRef(0);
  const clickHeatmapRef = useRef([]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
      
      if (scrollPercent > scrollDepthRef.current) {
        scrollDepthRef.current = scrollPercent;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      
      // Report scroll depth on unmount
      trackEvent(ANALYTICS_EVENTS.ENGAGEMENT, {
        action: 'scroll',
        maxDepth: scrollDepthRef.current
      });
    };
  }, []);

  // Track click heatmap
  const trackClick = useCallback((x, y, target) => {
    clickHeatmapRef.current.push({
      x,
      y,
      target,
      timestamp: Date.now()
    });

    // Send heatmap data periodically
    if (clickHeatmapRef.current.length >= 20) {
      trackEvent(ANALYTICS_EVENTS.ENGAGEMENT, {
        action: 'click_heatmap',
        clicks: [...clickHeatmapRef.current]
      });
      clickHeatmapRef.current = [];
    }
  }, []);

  // Record interaction patterns
  const recordPattern = useCallback((action) => {
    interactionPatternRef.current.push({
      action,
      timestamp: Date.now()
    });

    // Keep only recent patterns
    if (interactionPatternRef.current.length > 50) {
      interactionPatternRef.current.shift();
    }
  }, []);

  const getInteractionInsights = useCallback(() => {
    const patterns = interactionPatternRef.current;
    if (patterns.length < 2) return null;

    // Calculate interaction frequency
    const timeSpan = patterns[patterns.length - 1].timestamp - patterns[0].timestamp;
    const frequency = patterns.length / (timeSpan / 1000 / 60); // actions per minute

    // Find most common actions
    const actionCounts = {};
    patterns.forEach(p => {
      actionCounts[p.action] = (actionCounts[p.action] || 0) + 1;
    });

    const mostCommonAction = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      frequency,
      mostCommonAction: mostCommonAction ? mostCommonAction[0] : null,
      totalActions: patterns.length,
      scrollDepth: scrollDepthRef.current
    };
  }, []);

  return {
    trackClick,
    recordPattern,
    getInteractionInsights
  };
};

/**
 * A/B Test Tracker
 */
export const useABTest = (testName, variants = ['A', 'B']) => {
  const [variant, setVariant] = useState(() => {
    // Check if user already has a variant assigned
    try {
      const stored = localStorage.getItem(`ab_test_${testName}`);
      if (stored && variants.includes(stored)) {
        return stored;
      }
    } catch (e) {
      console.error('Failed to retrieve A/B test variant:', e);
    }

    // Assign random variant
    const randomVariant = variants[Math.floor(Math.random() * variants.length)];
    
    try {
      localStorage.setItem(`ab_test_${testName}`, randomVariant);
    } catch (e) {
      console.error('Failed to store A/B test variant:', e);
    }

    // Track assignment
    trackEvent(ANALYTICS_EVENTS.USER_INTERACTION, {
      action: 'ab_test_assignment',
      testName,
      variant: randomVariant
    });

    return randomVariant;
  });

  const trackConversion = useCallback((conversionType = 'primary') => {
    trackEvent(ANALYTICS_EVENTS.USER_INTERACTION, {
      action: 'ab_test_conversion',
      testName,
      variant,
      conversionType
    });
  }, [testName, variant]);

  return {
    variant,
    trackConversion,
    isVariant: (variantName) => variant === variantName
  };
};

export default {
  trackEvent,
  trackError,
  useInteractionTracker,
  useContentTracker,
  usePerformanceTracker,
  useBehaviorAnalysis,
  useABTest,
  ANALYTICS_EVENTS
};
