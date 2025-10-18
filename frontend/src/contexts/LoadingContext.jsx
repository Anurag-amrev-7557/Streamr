import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';

// Types for loading states
const LOADING_STATES = {
  initial: false,
  featured: false,
  trending: false,
  popular: false,
  topRated: false,
  upcoming: false,
  // Category-specific loading states
  action: false,
  comedy: false,
  drama: false,
  horror: false,
  sciFi: false,
  documentary: false,
  family: false,
  animation: false,
  awardWinning: false,
  latest: false,
  // TV show loading states
  popularTV: false,
  topRatedTV: false,
  airingToday: false,
  nowPlaying: false
};

const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 0.5,
  GOOD: 0.8,
  SLOW: 1.0
};

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const TIMEOUT_CHECK_INTERVAL = 1000; // 1 second
const SLOW_OPERATION_WARNING_THRESHOLD = 30000; // 30 seconds

const LoadingContext = createContext(null);

export const LoadingProvider = ({ children, defaultTimeout = DEFAULT_TIMEOUT }) => {
  const [loadingStates, setLoadingStates] = useState(LOADING_STATES);
  const [loadingTimestamps, setLoadingTimestamps] = useState({});
  const [loadingHistory, setLoadingHistory] = useState([]);

  // Full page loader state
  const [fullPageLoader, setFullPageLoader] = useState(false);
  const [fullPageLoaderText, setFullPageLoaderText] = useState('');
  const [fullPageLoaderProgress, setFullPageLoaderProgress] = useState(0);
  const [fullPageLoaderVariant, setFullPageLoaderVariant] = useState('minimalist');

  // Use refs for performance optimization
  const timeoutCheckIntervalRef = useRef(null);
  const loadingHistoryRef = useRef([]);

  // Sync loadingHistory with ref
  useEffect(() => {
    loadingHistoryRef.current = loadingHistory;
  }, [loadingHistory]);

  // Helper to generate unique operation ID
  const generateOperationId = useCallback((key) => {
    return `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Helper to calculate performance rating
  const calculatePerformanceRating = useCallback((duration, timeout) => {
    const ratio = duration / timeout;
    if (ratio < PERFORMANCE_THRESHOLDS.EXCELLENT) return 'excellent';
    if (ratio < PERFORMANCE_THRESHOLDS.GOOD) return 'good';
    return 'slow';
  }, []);

  // Helper to validate loading key
  const validateLoadingKey = useCallback((key) => {
    if (typeof key !== 'string' || key.trim() === '') {
      console.warn('LoadingContext: Invalid loading state key provided:', key);
      return false;
    }
    return true;
  }, []);

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
    }

    // Optionally clear loading history
    if (clearHistory) {
      setLoadingHistory([]);
      loadingHistoryRef.current = [];
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('LoadingContext: States reset', {
        clearHistory,
        preserveSpecificStates,
        resetToInitial,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  // Enhanced set loading state with timestamp and performance tracking
  const setLoadingState = useCallback((key, value, options = {}) => {
    if (!validateLoadingKey(key)) return;

    const {
      priority = PRIORITY_LEVELS.NORMAL,
      timeout = defaultTimeout,
      metadata = {}
    } = options;

    const timestamp = Date.now();
    const operationId = generateOperationId(key);

    // Update loading states
    setLoadingStates(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Update timestamps
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

    // Track in loading history
    if (value) {
      const historyEntry = { 
        key, 
        startTime: timestamp, 
        operationId,
        priority,
        metadata,
        status: 'started'
      };
      setLoadingHistory(prev => [...prev, historyEntry]);
      loadingHistoryRef.current = [...loadingHistoryRef.current, historyEntry];
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
                  efficiency: calculatePerformanceRating(timestamp - item.startTime, timeout)
                }
              }
            : item
        )
      );
    }

    // Warning for long-running operations
    if (value && timeout > SLOW_OPERATION_WARNING_THRESHOLD) {
      const timeoutId = setTimeout(() => {
        setLoadingStates(current => {
          if (current[key] && process.env.NODE_ENV === 'development') {
            console.warn(`LoadingContext: Long-running operation detected - ${key}`, {
              operationId,
              duration: `${timeout}ms`,
              priority,
              metadata
            });
          }
          return current;
        });
      }, timeout);

      return () => clearTimeout(timeoutId);
    }
  }, [defaultTimeout, validateLoadingKey, generateOperationId, calculatePerformanceRating]);

  // Enhanced batch update for multiple loading states
  const setBatchLoadingStates = useCallback((updates, options = {}) => {
    if (!updates || typeof updates !== 'object') {
      console.warn('LoadingContext: Invalid updates object provided to setBatchLoadingStates');
      return;
    }

    const timestamp = Date.now();
    const {
      operationId = `batch_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      priority = PRIORITY_LEVELS.NORMAL,
      metadata = {},
      timeout = defaultTimeout
    } = options;

    // Validate and filter updates
    const validUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (validateLoadingKey(key) && typeof value === 'boolean') {
        acc[key] = value;
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`LoadingContext: Invalid batch update - ${key}: ${value}`);
      }
      return acc;
    }, {});

    if (Object.keys(validUpdates).length === 0) {
      console.warn('LoadingContext: No valid updates in batch operation');
      return;
    }

    // Update loading states
    setLoadingStates(prev => ({
      ...prev,
      ...validUpdates
    }));

    // Update timestamps
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

    // Track batch history
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

    // Performance logging for large batch operations
    if (process.env.NODE_ENV === 'development' && Object.keys(validUpdates).length > 5) {
      console.info(`LoadingContext: Batch operation - ${Object.keys(validUpdates).length} states updated`, {
        operationId,
        priority,
        keys: Object.keys(validUpdates)
      });
    }
  }, [defaultTimeout, validateLoadingKey]);

  // Full page loader functions
  const showFullPageLoader = useCallback((text = '', progress = 0, variant = 'minimalist') => {
    setFullPageLoader(true);
    setFullPageLoaderText(text);
    setFullPageLoaderProgress(Math.min(100, Math.max(0, progress)));
    setFullPageLoaderVariant(variant);
  }, []);

  const hideFullPageLoader = useCallback(() => {
    setFullPageLoader(false);
    setFullPageLoaderText('');
    setFullPageLoaderProgress(0);
    setFullPageLoaderVariant('minimalist');
  }, []);

  const updateFullPageLoaderProgress = useCallback((progress) => {
    setFullPageLoaderProgress(Math.min(100, Math.max(0, progress)));
  }, []);

  const updateFullPageLoaderText = useCallback((text) => {
    setFullPageLoaderText(text);
  }, []);

  // Enhanced timeout monitoring with performance tracking
  useEffect(() => {
    const checkTimeouts = () => {
      const now = Date.now();
      const timedOutKeys = [];
      
      Object.entries(loadingTimestamps).forEach(([key, timestampData]) => {
        if (timestampData?.startTime && now - timestampData.startTime > defaultTimeout) {
          timedOutKeys.push({
            key,
            duration: now - timestampData.startTime,
            operationId: timestampData.operationId,
            priority: timestampData.priority
          });
        }
      });

      // Handle timeouts
      if (timedOutKeys.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`LoadingContext: ${timedOutKeys.length} operation(s) timed out`, {
            operations: timedOutKeys.map(t => ({ key: t.key, duration: `${t.duration}ms` })),
            timeoutThreshold: `${defaultTimeout}ms`
          });
        }

        timedOutKeys.forEach(({ key, duration, operationId, priority }) => {
          try {
            setLoadingState(key, false);
            
            // Log timeout in history
            setLoadingHistory(prev => [...prev, {
              key,
              startTime: loadingTimestamps[key]?.startTime || now,
              endTime: now,
              operationId: operationId || 'timeout',
              priority: priority || PRIORITY_LEVELS.NORMAL,
              metadata: {
                timeoutDuration: defaultTimeout,
                actualDuration: duration,
                recoveryAttempted: true
              },
              status: 'timeout',
              duration
            }]);
          } catch (error) {
            console.error(`LoadingContext: Error handling timeout for ${key}:`, error);
          }
        });
      }
    };

    // Adaptive interval based on active loading count
    const getCheckInterval = () => {
      const activeCount = Object.keys(loadingTimestamps).length;
      if (activeCount === 0) return 5000;
      if (activeCount > 10) return 500;
      return TIMEOUT_CHECK_INTERVAL;
    };

    const interval = getCheckInterval();
    timeoutCheckIntervalRef.current = setInterval(checkTimeouts, interval);
    
    return () => {
      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
    };
  }, [loadingTimestamps, defaultTimeout, setLoadingState]);

  // Memoized check if any loading is active
  const isAnyLoading = useMemo(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  // Get loading duration for a specific key
  const getLoadingDuration = useCallback((key, options = {}) => {
    const { 
      includeActive = true, 
      averageLastN = null, 
      minDuration = 0,
      maxDuration = Infinity 
    } = options;

    const history = loadingHistoryRef.current.filter(item => item.key === key);
    if (history.length === 0) return 0;
    
    // Current active duration
    const activeDuration = includeActive && loadingStates[key] && loadingTimestamps[key]?.startTime
      ? Date.now() - loadingTimestamps[key].startTime 
      : 0;
    
    // Completed durations within range
    const completedDurations = history
      .filter(item => item.endTime && item.duration >= minDuration && item.duration <= maxDuration)
      .map(item => item.duration);
    
    // Average of last N entries
    if (averageLastN && averageLastN > 0) {
      const recentDurations = completedDurations.slice(-averageLastN);
      if (recentDurations.length === 0) return activeDuration;
      
      const average = recentDurations.reduce((sum, d) => sum + d, 0) / recentDurations.length;
      return includeActive ? Math.max(average, activeDuration) : average;
    }
    
    // Most recent duration
    const lastEntry = history[history.length - 1];
    return lastEntry?.duration || activeDuration;
  }, [loadingStates, loadingTimestamps]);

  const value = {
    loadingStates,
    setLoadingState,
    setBatchLoadingStates,
    resetLoadingStates,
    isAnyLoading,
    getLoadingDuration,
    loadingHistory,
    // Backward compatibility aliases
    setLoading: setLoadingState,
    clearLoading: useCallback((key, options = {}) => {
      setLoadingState(key, false, options);
    }, [setLoadingState]),
    // Loading statistics
    getLoadingStats: useCallback((key) => {
      const history = loadingHistoryRef.current.filter(item => item.key === key);
      const totalLoads = history.length;
      const successfulLoads = history.filter(item => item.status === 'completed').length;
      const timeoutLoads = history.filter(item => item.status === 'timeout').length;
      const averageDuration = totalLoads > 0 
        ? history.reduce((sum, item) => sum + (item.duration || 0), 0) / totalLoads 
        : 0;
      const successRate = totalLoads > 0 ? (successfulLoads / totalLoads) * 100 : 0;
      
      return {
        totalLoads,
        successfulLoads,
        failedLoads: timeoutLoads,
        timeoutLoads,
        averageDuration: Math.round(averageDuration),
        successRate: Math.round(successRate * 100) / 100,
        lastLoadTime: history.length > 0 ? history[history.length - 1].startTime : null,
        isCurrentlyLoading: loadingStates[key] || false
      };
    }, [loadingStates]),
    // Batch utilities
    setLoadingForKeys: useCallback((keys, state = true, options = {}) => {
      const updates = {};
      keys.forEach(key => {
        if (validateLoadingKey(key)) {
          updates[key] = state;
        }
      });
      setBatchLoadingStates(updates, options);
    }, [setBatchLoadingStates, validateLoadingKey]),
    // Query utilities
    getLoadingKeys: useCallback(() => {
      return Object.keys(loadingStates).filter(key => loadingStates[key]);
    }, [loadingStates]),
    getLoadingCount: useCallback(() => {
      return Object.values(loadingStates).filter(Boolean).length;
    }, [loadingStates]),
    // Performance metrics
    getPerformanceMetrics: useCallback(() => {
      const allDurations = loadingHistoryRef.current
        .filter(item => item.duration && item.duration > 0)
        .map(item => item.duration);
      
      if (allDurations.length === 0) return null;
      
      const sorted = [...allDurations].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
      const sum = allDurations.reduce((acc, d) => acc + d, 0);
      
      return {
        totalRequests: allDurations.length,
        averageDuration: Math.round(sum / allDurations.length),
        medianDuration: Math.round(median),
        p95Duration: Math.round(p95),
        p99Duration: Math.round(p99),
        minDuration: Math.round(Math.min(...allDurations)),
        maxDuration: Math.round(Math.max(...allDurations))
      };
    }, []),

    // Full page loader functions
    fullPageLoader,
    fullPageLoaderText,
    fullPageLoaderProgress,
    fullPageLoaderVariant,
    showFullPageLoader,
    hideFullPageLoader,
    updateFullPageLoaderProgress,
    updateFullPageLoaderText
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
    throw new Error('useLoading must be used within a LoadingProvider. Wrap your component tree with <LoadingProvider>.');
  }
  
  return context;
};