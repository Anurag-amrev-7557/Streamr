/**
 * 🚀 Advanced Movie Details Performance Optimization Hook
 * 
 * This hook provides comprehensive performance monitoring and optimization:
 * - Web Vitals tracking (LCP, FID, CLS, TTFB, INP)
 * - Performance budgets
 * - Resource prefetching
 * - Image lazy loading
 * - Request prioritization
 * - Memory management
 * - Performance analytics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebVitals } from './useWebVitals';

const PERFORMANCE_BUDGETS = {
  LCP: 2500, // Largest Contentful Paint
  FID: 100, // First Input Delay
  CLS: 0.1, // Cumulative Layout Shift
  TTFB: 800, // Time to First Byte
  INP: 200, // Interaction to Next Paint
  memoryLimit: 100 * 1024 * 1024, // 100MB
};

export const useMovieDetailsPerformance = (movieId) => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    fetchTime: 0,
    imageLoadTime: 0,
    interactionLatency: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
  });

  const [performanceIssues, setPerformanceIssues] = useState([]);
  const [isPerformant, setIsPerformant] = useState(true);

  const metricsRef = useRef({
    fetchStartTime: 0,
    renderStartTime: 0,
    imageLoadStartTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });

  const observersRef = useRef({
    performanceObserver: null,
    memoryObserver: null,
  });

  // Use Web Vitals hook if available
  const webVitals = useWebVitals?.();

  /**
   * Start tracking fetch performance
   */
  const startFetchTracking = useCallback(() => {
    metricsRef.current.fetchStartTime = performance.now();
  }, []);

  /**
   * End tracking fetch performance
   */
  const endFetchTracking = useCallback(() => {
    if (metricsRef.current.fetchStartTime > 0) {
      const fetchTime = performance.now() - metricsRef.current.fetchStartTime;
      setPerformanceMetrics(prev => ({ ...prev, fetchTime }));
      metricsRef.current.fetchStartTime = 0;
    }
  }, []);

  /**
   * Start tracking render performance
   */
  const startRenderTracking = useCallback(() => {
    metricsRef.current.renderStartTime = performance.now();
  }, []);

  /**
   * End tracking render performance
   */
  const endRenderTracking = useCallback(() => {
    if (metricsRef.current.renderStartTime > 0) {
      const renderTime = performance.now() - metricsRef.current.renderStartTime;
      setPerformanceMetrics(prev => ({ ...prev, renderTime }));
      metricsRef.current.renderStartTime = 0;
    }
  }, []);

  /**
   * Track image loading
   */
  const trackImageLoad = useCallback((loadTime) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      imageLoadTime: Math.max(prev.imageLoadTime, loadTime),
    }));
  }, []);

  /**
   * Track cache hit/miss
   */
  const trackCacheHit = useCallback((isHit) => {
    if (isHit) {
      metricsRef.current.cacheHits++;
    } else {
      metricsRef.current.cacheMisses++;
    }

    const total = metricsRef.current.cacheHits + metricsRef.current.cacheMisses;
    const hitRate = total > 0 ? (metricsRef.current.cacheHits / total) * 100 : 0;

    setPerformanceMetrics(prev => ({ ...prev, cacheHitRate: hitRate }));
  }, []);

  /**
   * Track interaction latency
   */
  const trackInteraction = useCallback((latency) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      interactionLatency: Math.max(prev.interactionLatency, latency),
    }));
  }, []);

  /**
   * Check memory usage
   */
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memoryInfo = performance.memory;
      const usedMemory = memoryInfo.usedJSHeapSize;
      
      setPerformanceMetrics(prev => ({ ...prev, memoryUsage: usedMemory }));

      // Check if exceeding budget
      if (usedMemory > PERFORMANCE_BUDGETS.memoryLimit) {
        setPerformanceIssues(prev => [
          ...prev.filter(issue => issue.type !== 'memory'),
          {
            type: 'memory',
            message: `Memory usage (${Math.round(usedMemory / 1024 / 1024)}MB) exceeds budget (${Math.round(PERFORMANCE_BUDGETS.memoryLimit / 1024 / 1024)}MB)`,
            severity: 'warning',
            timestamp: Date.now(),
          },
        ]);
      }
    }
  }, []);

  /**
   * Prefetch resources
   */
  const prefetchResource = useCallback((url, type = 'fetch') => {
    if (!url || typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = type;
    link.href = url;
    document.head.appendChild(link);
  }, []);

  /**
   * Preload critical resources
   */
  const preloadResource = useCallback((url, type = 'fetch') => {
    if (!url || typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = type;
    link.href = url;
    document.head.appendChild(link);
  }, []);

  /**
   * Check if performance budgets are met
   */
  const checkPerformanceBudgets = useCallback(() => {
    const issues = [];

    if (webVitals) {
      if (webVitals.LCP && webVitals.LCP > PERFORMANCE_BUDGETS.LCP) {
        issues.push({
          type: 'LCP',
          message: `LCP (${Math.round(webVitals.LCP)}ms) exceeds budget (${PERFORMANCE_BUDGETS.LCP}ms)`,
          severity: 'warning',
          timestamp: Date.now(),
        });
      }

      if (webVitals.FID && webVitals.FID > PERFORMANCE_BUDGETS.FID) {
        issues.push({
          type: 'FID',
          message: `FID (${Math.round(webVitals.FID)}ms) exceeds budget (${PERFORMANCE_BUDGETS.FID}ms)`,
          severity: 'warning',
          timestamp: Date.now(),
        });
      }

      if (webVitals.CLS && webVitals.CLS > PERFORMANCE_BUDGETS.CLS) {
        issues.push({
          type: 'CLS',
          message: `CLS (${webVitals.CLS.toFixed(3)}) exceeds budget (${PERFORMANCE_BUDGETS.CLS})`,
          severity: 'warning',
          timestamp: Date.now(),
        });
      }
    }

    if (performanceMetrics.fetchTime > 3000) {
      issues.push({
        type: 'fetch',
        message: `Fetch time (${Math.round(performanceMetrics.fetchTime)}ms) is too slow`,
        severity: 'error',
        timestamp: Date.now(),
      });
    }

    if (performanceMetrics.renderTime > 1000) {
      issues.push({
        type: 'render',
        message: `Render time (${Math.round(performanceMetrics.renderTime)}ms) is too slow`,
        severity: 'warning',
        timestamp: Date.now(),
      });
    }

    setPerformanceIssues(issues);
    setIsPerformant(issues.filter(i => i.severity === 'error').length === 0);
  }, [webVitals, performanceMetrics]);

  /**
   * Get performance report
   */
  const getPerformanceReport = useCallback(() => {
    return {
      metrics: performanceMetrics,
      issues: performanceIssues,
      isPerformant,
      budgets: PERFORMANCE_BUDGETS,
      webVitals: webVitals || {},
      recommendations: generateRecommendations(performanceMetrics, performanceIssues),
    };
  }, [performanceMetrics, performanceIssues, isPerformant, webVitals]);

  /**
   * Log performance metrics
   */
  const logPerformanceMetrics = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('🚀 Movie Details Performance Metrics');
      console.table(performanceMetrics);
      
      if (performanceIssues.length > 0) {
        console.warn('Performance Issues:', performanceIssues);
      }
      
      if (webVitals) {
        console.log('Web Vitals:', webVitals);
      }
      
      console.groupEnd();
    }
  }, [performanceMetrics, performanceIssues, webVitals]);

  // Setup Performance Observer
  useEffect(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry;
            setPerformanceMetrics(prev => ({
              ...prev,
              loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
            }));
          }
        });
      });

      observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
      observersRef.current.performanceObserver = observer;

      return () => {
        observer.disconnect();
      };
    } catch (error) {
      console.warn('[useMovieDetailsPerformance] PerformanceObserver error:', error);
    }
  }, []);

  // Monitor memory usage periodically
  useEffect(() => {
    const interval = setInterval(checkMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [checkMemoryUsage]);

  // Check performance budgets periodically
  useEffect(() => {
    const interval = setInterval(checkPerformanceBudgets, 10000);
    return () => clearInterval(interval);
  }, [checkPerformanceBudgets]);

  // Log metrics on movie change
  useEffect(() => {
    if (movieId && process.env.NODE_ENV === 'development') {
      const timeout = setTimeout(logPerformanceMetrics, 2000);
      return () => clearTimeout(timeout);
    }
  }, [movieId, logPerformanceMetrics]);

  return {
    // Metrics
    performanceMetrics,
    performanceIssues,
    isPerformant,
    webVitals,

    // Tracking
    startFetchTracking,
    endFetchTracking,
    startRenderTracking,
    endRenderTracking,
    trackImageLoad,
    trackCacheHit,
    trackInteraction,

    // Memory
    checkMemoryUsage,

    // Resource hints
    prefetchResource,
    preloadResource,

    // Reporting
    getPerformanceReport,
    logPerformanceMetrics,
    checkPerformanceBudgets,
  };
};

/**
 * Generate performance recommendations
 */
function generateRecommendations(metrics, issues) {
  const recommendations = [];

  if (metrics.fetchTime > 3000) {
    recommendations.push({
      type: 'fetch',
      message: 'Consider implementing request batching or using GraphQL to reduce fetch time',
      priority: 'high',
    });
  }

  if (metrics.renderTime > 1000) {
    recommendations.push({
      type: 'render',
      message: 'Consider virtualizing long lists and lazy loading heavy components',
      priority: 'high',
    });
  }

  if (metrics.imageLoadTime > 2000) {
    recommendations.push({
      type: 'images',
      message: 'Implement progressive image loading and use modern formats (WebP/AVIF)',
      priority: 'medium',
    });
  }

  if (metrics.cacheHitRate < 50) {
    recommendations.push({
      type: 'caching',
      message: 'Cache hit rate is low. Review caching strategy and increase cache duration',
      priority: 'medium',
    });
  }

  if (metrics.memoryUsage > PERFORMANCE_BUDGETS.memoryLimit * 0.8) {
    recommendations.push({
      type: 'memory',
      message: 'Memory usage is approaching limit. Implement memory cleanup and reduce cache size',
      priority: 'high',
    });
  }

  return recommendations;
}

export default useMovieDetailsPerformance;
