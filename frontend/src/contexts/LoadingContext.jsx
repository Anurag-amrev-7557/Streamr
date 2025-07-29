import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

// Types for loading states
const LOADING_STATES = {
  initial: false,
  featured: false,
  trending: false,
  popular: false,
  topRated: false,
  upcoming: false
};

const LoadingContext = createContext();

export const LoadingProvider = ({ children, defaultTimeout = 30000 }) => {
  const [loadingStates, setLoadingStates] = useState(LOADING_STATES);
  const [loadingTimestamps, setLoadingTimestamps] = useState({});
  const [loadingHistory, setLoadingHistory] = useState([]);

  // Reset all loading states with enhanced functionality
  const resetLoadingStates = useCallback((options = {}) => {
    const {
      clearHistory = false,
      preserveSpecificStates = [],
      resetToInitial = true
    } = options;

    if (resetToInitial) {
      setLoadingStates(prev => {
        const newStates = { ...LOADING_STATES };
        
        // Preserve specific states if requested
        preserveSpecificStates.forEach(key => {
          if (prev[key] !== undefined) {
            newStates[key] = prev[key];
          }
        });
        
        return newStates;
      });
    }

    setLoadingTimestamps(prev => {
      const newTimestamps = {};
      
      // Preserve timestamps for specific states if requested
      preserveSpecificStates.forEach(key => {
        if (prev[key] !== undefined) {
          newTimestamps[key] = prev[key];
        }
      });
      
      return newTimestamps;
    });

    // Optionally clear loading history
    if (clearHistory) {
      setLoadingHistory([]);
    }

    // Log reset operation for debugging
    console.debug('Loading states reset:', {
      clearHistory,
      preserveSpecificStates,
      resetToInitial,
      timestamp: new Date().toISOString()
    });
  }, []);

  // Enhanced set loading state with timestamp and performance tracking
  const setLoadingState = useCallback((key, value, options = {}) => {
    const {
      priority = 'normal',
      timeout = defaultTimeout,
      metadata = {},
      suppressLogging = false
    } = options;

    const timestamp = Date.now();
    const operationId = `${key}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate key format
    if (typeof key !== 'string' || key.trim() === '') {
      console.warn('Invalid loading state key provided:', key);
      return;
    }

    // Update loading states with enhanced tracking
    setLoadingStates(prev => {
      const newStates = {
        ...prev,
        [key]: value
      };

      // Log state change for debugging (unless suppressed)
      if (!suppressLogging) {
        console.debug(`Loading state updated: ${key} = ${value}`, {
          operationId,
          priority,
          timestamp: new Date(timestamp).toISOString(),
          metadata
        });
      }

      return newStates;
    });
    
    // Update timestamps with enhanced metadata
    setLoadingTimestamps(prev => ({
      ...prev,
      [key]: value ? {
        startTime: timestamp,
        operationId,
        priority,
        timeout,
        metadata
      } : null
    }));

    // Enhanced loading history tracking
    if (value) {
      setLoadingHistory(prev => [
        ...prev, 
        { 
          key, 
          startTime: timestamp, 
          operationId,
          priority,
          metadata,
          status: 'started'
        }
      ]);
    } else {
      setLoadingHistory(prev => 
        prev.map(item => 
          item.key === key && !item.endTime
            ? { 
                ...item, 
                endTime: timestamp, 
                duration: timestamp - item.startTime,
                status: 'completed',
                performance: {
                  duration: timestamp - item.startTime,
                  isTimeout: timestamp - item.startTime > timeout,
                  efficiency: timestamp - item.startTime < timeout * 0.5 ? 'excellent' : 
                             timestamp - item.startTime < timeout * 0.8 ? 'good' : 'slow'
                }
              }
            : item
        )
      );
    }

    // Performance monitoring for long-running operations
    if (value && timeout > 30000) { // 30 seconds
      setTimeout(() => {
        setLoadingStates(current => {
          if (current[key]) {
            console.warn(`Long-running operation detected: ${key} has been running for ${timeout}ms`, {
              operationId,
              priority,
              metadata
            });
          }
          return current;
        });
      }, timeout);
    }
  }, [defaultTimeout]);

  // Enhanced batch update for multiple loading states with performance monitoring
  const setBatchLoadingStates = useCallback((updates, options = {}) => {
    const timestamp = Date.now();
    const operationId = options.operationId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const priority = options.priority || 'normal';
    const metadata = options.metadata || {};
    const timeout = options.timeout || defaultTimeout;

    // Validate updates object
    if (!updates || typeof updates !== 'object') {
      console.warn('setBatchLoadingStates: Invalid updates object provided');
      return;
    }

    // Process updates with validation
    const validUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (typeof key === 'string' && typeof value === 'boolean') {
        acc[key] = value;
      } else {
        console.warn(`setBatchLoadingStates: Invalid key-value pair: ${key} = ${value}`);
      }
      return acc;
    }, {});

    if (Object.keys(validUpdates).length === 0) {
      console.warn('setBatchLoadingStates: No valid updates to process');
      return;
    }

    // Update loading states
    setLoadingStates(prev => ({
      ...prev,
      ...validUpdates
    }));

    // Update timestamps with enhanced tracking
    setLoadingTimestamps(prev => ({
      ...prev,
      ...Object.entries(validUpdates).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value ? {
          startTime: timestamp,
          operationId,
          priority,
          timeout,
          metadata: {
            ...metadata,
            batchSize: Object.keys(validUpdates).length,
            batchOperation: true,
            individualKey: key
          }
        } : null
      }), {})
    }));

    // Enhanced loading history tracking for batch operations
    const batchHistoryEntries = Object.entries(validUpdates).map(([key, value]) => ({
      key,
      startTime: value ? timestamp : null,
      endTime: value ? null : timestamp,
      operationId,
      priority,
      metadata: {
        ...metadata,
        batchSize: Object.keys(validUpdates).length,
        batchOperation: true,
        individualKey: key
      },
      status: value ? 'started' : 'completed',
      duration: value ? null : 0
    }));

    setLoadingHistory(prev => [...prev, ...batchHistoryEntries]);

    // Performance monitoring for batch operations
    if (Object.keys(validUpdates).length > 5) {
      console.info(`Batch loading operation: ${Object.keys(validUpdates).length} states updated`, {
        operationId,
        priority,
        metadata,
        timestamp
      });
    }

    // Timeout monitoring for batch operations
    if (timeout > 30000) {
      setTimeout(() => {
        setLoadingStates(current => {
          const stillLoading = Object.keys(validUpdates).filter(key => current[key]);
          if (stillLoading.length > 0) {
            console.warn(`Batch operation timeout: ${stillLoading.length} states still loading after ${timeout}ms`, {
              operationId,
              stillLoading,
              priority,
              metadata
            });
          }
          return current;
        });
      }, timeout);
    }
  }, [defaultTimeout]);

  // Enhanced timeout monitoring with performance tracking and graceful degradation
  useEffect(() => {
    const checkTimeouts = () => {
      const now = Date.now();
      const timedOutKeys = [];
      
      Object.entries(loadingTimestamps).forEach(([key, timestampData]) => {
        if (timestampData && timestampData.startTime && now - timestampData.startTime > defaultTimeout) {
          timedOutKeys.push(key);
        }
      });

      // Batch process timeouts for better performance
      if (timedOutKeys.length > 0) {
        console.warn(`Loading timeout detected for ${timedOutKeys.length} operations:`, {
          keys: timedOutKeys,
          timeoutDuration: defaultTimeout,
          timestamp: new Date().toISOString(),
          performance: {
            memoryUsage: performance.memory ? {
              used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
              total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
            } : 'Not available'
          }
        });

        // Gracefully handle timeouts with error recovery
        timedOutKeys.forEach(key => {
          try {
            setLoadingState(key, false);
            
            // Update loading history with timeout information
            setLoadingHistory(prev => [...prev, {
              key,
              startTime: loadingTimestamps[key],
              endTime: now,
              operationId: `timeout_${Date.now()}`,
              priority: 'timeout',
              metadata: {
                timeoutDuration: defaultTimeout,
                actualDuration: now - loadingTimestamps[key],
                recoveryAttempted: true
              },
              status: 'timeout',
              duration: now - loadingTimestamps[key]
            }]);
          } catch (error) {
            console.error(`Error handling timeout for ${key}:`, error);
          }
        });
      }
    };

    // Adaptive interval based on system load
    const getOptimalInterval = () => {
      const activeLoads = Object.keys(loadingTimestamps).length;
      if (activeLoads === 0) return 5000; // Slower when no loads
      if (activeLoads > 10) return 500;   // Faster when many loads
      return 1000;                        // Default interval
    };

    const interval = getOptimalInterval();
    const timeoutId = setInterval(checkTimeouts, interval);
    
    return () => {
      clearInterval(timeoutId);
    };
  }, [loadingTimestamps, defaultTimeout, setLoadingState, setLoadingHistory]);

  const isAnyLoading = useMemo(() => {
    return Object.values(loadingStates).some(state => state);
  }, [loadingStates]);

  // Get loading duration for a specific key with enhanced analytics
  const getLoadingDuration = useCallback((key, options = {}) => {
    const { 
      includeActive = true, 
      averageLastN = null, 
      minDuration = 0,
      maxDuration = Infinity 
    } = options;

    const history = loadingHistory.filter(item => item.key === key);
    if (history.length === 0) return 0;
    
    // Calculate current active duration if requested
    const activeDuration = includeActive && loadingStates[key] ? 
      Date.now() - (loadingTimestamps[key] || Date.now()) : 0;
    
    // Get completed durations
    const completedDurations = history
      .filter(item => item.endTime && item.duration >= minDuration && item.duration <= maxDuration)
      .map(item => item.duration);
    
    // If requesting average of last N entries
    if (averageLastN && averageLastN > 0) {
      const recentDurations = completedDurations.slice(-averageLastN);
      if (recentDurations.length === 0) return activeDuration;
      
      const average = recentDurations.reduce((sum, duration) => sum + duration, 0) / recentDurations.length;
      return includeActive ? Math.max(average, activeDuration) : average;
    }
    
    // Return most recent completed duration or active duration
    const lastEntry = history[history.length - 1];
    if (!lastEntry.endTime) return activeDuration;
    
    return Math.max(lastEntry.duration, activeDuration);
  }, [loadingHistory, loadingStates, loadingTimestamps]);

  const value = {
    loadingStates,
    setLoadingState,
    setBatchLoadingStates,
    resetLoadingStates,
    isAnyLoading,
    getLoadingDuration,
    loadingHistory,
    // Add missing methods for backward compatibility
    setLoading: setLoadingState, // Alias for setLoadingState
    clearLoading: useCallback((key, options = {}) => {
      setLoadingState(key, false, options);
    }, [setLoadingState]),
    // Enhanced loading analytics and utilities
    getLoadingStats: useCallback((key) => {
      const history = loadingHistory.filter(item => item.key === key);
      const totalLoads = history.length;
      const successfulLoads = history.filter(item => !item.error).length;
      const averageDuration = totalLoads > 0 
        ? history.reduce((sum, item) => sum + (item.duration || 0), 0) / totalLoads 
        : 0;
      const successRate = totalLoads > 0 ? (successfulLoads / totalLoads) * 100 : 0;
      
      return {
        totalLoads,
        successfulLoads,
        failedLoads: totalLoads - successfulLoads,
        averageDuration: Math.round(averageDuration),
        successRate: Math.round(successRate * 100) / 100,
        lastLoadTime: history.length > 0 ? history[history.length - 1].startTime : null,
        isCurrentlyLoading: loadingStates[key] || false
      };
    }, [loadingHistory, loadingStates]),
    
    // Batch loading utilities
    setLoadingForKeys: useCallback((keys, state = true) => {
      const updates = {};
      keys.forEach(key => {
        updates[key] = state;
      });
      setBatchLoadingStates(updates);
    }, [setBatchLoadingStates]),
    
    // Loading state queries
    getLoadingKeys: useCallback(() => {
      return Object.keys(loadingStates).filter(key => loadingStates[key]);
    }, [loadingStates]),
    
    getLoadingCount: useCallback(() => {
      return Object.values(loadingStates).filter(Boolean).length;
    }, [loadingStates]),
    
    // Performance monitoring
    getPerformanceMetrics: useCallback(() => {
      const allDurations = loadingHistory
        .filter(item => item.duration)
        .map(item => item.duration);
      
      if (allDurations.length === 0) return null;
      
      const sorted = allDurations.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      return {
        totalRequests: allDurations.length,
        averageDuration: Math.round(allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length),
        medianDuration: Math.round(median),
        p95Duration: Math.round(p95),
        p99Duration: Math.round(p99),
        minDuration: Math.round(Math.min(...allDurations)),
        maxDuration: Math.round(Math.max(...allDurations))
      };
    }, [loadingHistory])
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider. Make sure to wrap your component tree with <LoadingProvider>.');
  }
  
  // Add development-time validation for better debugging
  if (process.env.NODE_ENV === 'development') {
    const requiredMethods = [
      'setLoadingState', 'setLoading', 'clearLoading', 'setBatchLoadingStates',
      'setLoadingForKeys', 'getLoadingKeys', 'getLoadingCount', 'getPerformanceMetrics'
    ];
    
    const missingMethods = requiredMethods.filter(method => !(method in context));
    if (missingMethods.length > 0) {
      console.warn(`LoadingContext is missing required methods: ${missingMethods.join(', ')}`);
    }
  }
  
  return context;
};