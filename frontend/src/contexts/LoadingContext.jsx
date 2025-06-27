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

  // Reset all loading states
  const resetLoadingStates = useCallback(() => {
    setLoadingStates(LOADING_STATES);
    setLoadingTimestamps({});
  }, []);

  // Set loading state with timestamp
  const setLoadingState = useCallback((key, value) => {
    const timestamp = Date.now();
    setLoadingStates(prev => ({
      ...prev,
      [key]: value
    }));
    
    setLoadingTimestamps(prev => ({
      ...prev,
      [key]: value ? timestamp : null
    }));

    // Track loading history
    if (value) {
      setLoadingHistory(prev => [...prev, { key, startTime: timestamp }]);
    } else {
      setLoadingHistory(prev => 
        prev.map(item => 
          item.key === key 
            ? { ...item, endTime: timestamp, duration: timestamp - item.startTime }
            : item
        )
      );
    }
  }, []);

  // Batch update multiple loading states
  const setBatchLoadingStates = useCallback((updates) => {
    const timestamp = Date.now();
    setLoadingStates(prev => ({
      ...prev,
      ...updates
    }));

    setLoadingTimestamps(prev => ({
      ...prev,
      ...Object.entries(updates).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value ? timestamp : null
      }), {})
    }));
  }, []);

  // Check for loading timeouts
  useEffect(() => {
    const checkTimeouts = () => {
      const now = Date.now();
      Object.entries(loadingTimestamps).forEach(([key, timestamp]) => {
        if (timestamp && now - timestamp > defaultTimeout) {
          console.warn(`Loading timeout for ${key}`);
          setLoadingState(key, false);
        }
      });
    };

    const timeoutId = setInterval(checkTimeouts, 1000);
    return () => clearInterval(timeoutId);
  }, [loadingTimestamps, defaultTimeout, setLoadingState]);

  const isAnyLoading = useMemo(() => {
    return Object.values(loadingStates).some(state => state);
  }, [loadingStates]);

  // Get loading duration for a specific key
  const getLoadingDuration = useCallback((key) => {
    const history = loadingHistory.filter(item => item.key === key);
    if (history.length === 0) return 0;
    
    const lastEntry = history[history.length - 1];
    if (!lastEntry.endTime) return Date.now() - lastEntry.startTime;
    return lastEntry.duration;
  }, [loadingHistory]);

  const value = {
    loadingStates,
    setLoadingState,
    setBatchLoadingStates,
    resetLoadingStates,
    isAnyLoading,
    getLoadingDuration,
    loadingHistory
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
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}; 