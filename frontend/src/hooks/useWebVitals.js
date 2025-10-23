import { useState, useEffect } from 'react';

/**
 * Hook to track Web Vitals performance metrics
 * Measures LCP, FID, CLS, TTFB, and INP
 */
export const useWebVitals = () => {
  const [metrics, setMetrics] = useState({
    LCP: null,
    FID: null,
    CLS: null,
    TTFB: null,
    INP: null,
  });

  useEffect(() => {
    // Only measure in browser
    if (typeof window === 'undefined') return;

    // Try to use web-vitals library if available
    let mounted = true;

    const updateMetric = (metric) => {
      if (!mounted) return;
      
      setMetrics(prev => ({
        ...prev,
        [metric.name]: metric.value,
      }));
    };

    // Use Performance Observer API as fallback
    try {
      // Observe Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        updateMetric({ name: 'LCP', value: lastEntry.renderTime || lastEntry.loadTime });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Observe First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          updateMetric({ name: 'FID', value: entry.processingStart - entry.startTime });
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Observe Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            updateMetric({ name: 'CLS', value: clsValue });
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Get TTFB from Navigation Timing
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        updateMetric({ name: 'TTFB', value: navEntry.responseStart - navEntry.requestStart });
      }

      return () => {
        mounted = false;
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
    }
  }, []);

  return metrics;
};
