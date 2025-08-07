import { useRef, useCallback, useEffect } from 'react';

// Performance monitoring hook for bottom navigation
export const useBottomNavigationPerformance = () => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const memoryUsageRef = useRef(null);
  const intervalRef = useRef(null);
  const performanceMetricsRef = useRef({
    totalRenders: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    lastCleanup: Date.now(),
    memoryHistory: []
  });

  // Start monitoring performance
  const startMonitoring = useCallback(() => {
    const startTime = Date.now();
    
    // Track memory usage if available
    if (window.performance && window.performance.memory) {
      memoryUsageRef.current = window.performance.memory;
    }

    // Return cleanup function
    return () => {
      const endTime = Date.now();
      const renderTime = endTime - startTime;
      
      performanceMetricsRef.current.totalRenders += 1;
      performanceMetricsRef.current.averageRenderTime = 
        (performanceMetricsRef.current.averageRenderTime + renderTime) / 2;
      
      if (memoryUsageRef.current) {
        performanceMetricsRef.current.memoryUsage = 
          memoryUsageRef.current.usedJSHeapSize / 1024 / 1024; // MB
      }
    };
  }, []);

  // Record render for performance tracking
  const recordRender = useCallback(() => {
    renderCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;

    // Log performance metrics in development (much less frequently to reduce memory pressure)
    if (process.env.NODE_ENV === 'development' && renderCountRef.current % 200 === 0) {
      console.log(`BottomNavigation Performance:
        - Render #${renderCountRef.current}
        - Time since last: ${timeSinceLastRender}ms
        - Memory usage: ${performanceMetricsRef.current.memoryUsage.toFixed(2)}MB
        - Average render time: ${performanceMetricsRef.current.averageRenderTime.toFixed(2)}ms
      `);
    }
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return {
      ...performanceMetricsRef.current,
      currentRenderCount: renderCountRef.current,
      timeSinceLastRender: Date.now() - lastRenderTimeRef.current
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    renderCountRef.current = 0;
    lastRenderTimeRef.current = Date.now();
    performanceMetricsRef.current.lastCleanup = Date.now();
    performanceMetricsRef.current.memoryHistory = []; // Clear memory history
    
    // Clear interval if it exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }, []);

  // Memory leak detection with proper cleanup
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only start monitoring if memory API is available and in development
    if (window.performance && window.performance.memory && process.env.NODE_ENV === 'development') {
      intervalRef.current = setInterval(() => {
        if (memoryUsageRef.current && window.performance && window.performance.memory) {
          const currentMemory = window.performance.memory.usedJSHeapSize / 1024 / 1024;
          const memoryIncrease = currentMemory - performanceMetricsRef.current.memoryUsage;
          
          // Keep only last 5 memory readings to prevent array growth
          performanceMetricsRef.current.memoryHistory.push({
            timestamp: Date.now(),
            memory: currentMemory,
            increase: memoryIncrease
          });
          
          if (performanceMetricsRef.current.memoryHistory.length > 5) {
            performanceMetricsRef.current.memoryHistory.shift();
          }
          
          // Warn if memory usage is increasing significantly (increased threshold)
          if (memoryIncrease > 100) { // 100MB increase threshold
            console.warn(`BottomNavigation: Potential memory leak detected. Memory increased by ${memoryIncrease.toFixed(2)}MB`);
          }
          
          performanceMetricsRef.current.memoryUsage = currentMemory;
        }
      }, 120000); // Check every 2 minutes to reduce overhead
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    startMonitoring,
    recordRender,
    getPerformanceMetrics,
    cleanup
  };
};

// Optimized navigation hook with debouncing
export const useOptimizedNavigation = () => {
  const navigationTimeoutRef = useRef(null);
  const lastNavigationRef = useRef(null);

  const debouncedNavigate = useCallback((path, navigate, delay = 200) => {
    // Clear existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Prevent duplicate navigation
    if (lastNavigationRef.current === path) {
      return;
    }

    // Set new timeout
    navigationTimeoutRef.current = setTimeout(() => {
      navigate(path);
      lastNavigationRef.current = path;
    }, delay);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  return { debouncedNavigate };
};

// Debounced navigation hook
export const useDebouncedNavigation = (delay = 200) => {
  const { debouncedNavigate } = useOptimizedNavigation();
  
  return useCallback((path, navigate) => {
    debouncedNavigate(path, navigate, delay);
  }, [debouncedNavigate, delay]);
}; 