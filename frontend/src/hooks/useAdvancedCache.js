/**
 * Advanced Caching System with SWR (Stale-While-Revalidate) Pattern
 * Implements intelligent cache invalidation, background sync, and predictive prefetching
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 60 * 60 * 1000, // 1 hour
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 50, // Maximum number of cache entries
  PREFETCH_DELAY: 2000, // Delay before prefetching
  REVALIDATE_ON_FOCUS: true,
  REVALIDATE_ON_RECONNECT: true,
  DEDUPE_INTERVAL: 2000 // Deduplicate requests within 2 seconds
};

// Cache storage with LRU eviction
class AdvancedCache {
  constructor(maxSize = CACHE_CONFIG.MAX_CACHE_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    // Update access order for LRU
    this.updateAccessOrder(key);
    
    const entry = this.cache.get(key);
    const now = Date.now();
    
    // Check if entry is expired
    if (entry.expiresAt && now > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    return {
      ...entry,
      isStale: entry.staleAt && now > entry.staleAt
    };
  }

  set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL, staleTime = CACHE_CONFIG.STALE_TIME) {
    const now = Date.now();
    const entry = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      staleAt: now + staleTime,
      hits: 0
    };
    
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    
    // Evict LRU entry if cache is full
    if (this.cache.size > this.maxSize) {
      const lruKey = this.accessOrder.shift();
      this.cache.delete(lruKey);
    }
  }

  delete(key) {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  has(key) {
    return this.cache.has(key);
  }

  updateAccessOrder(key) {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  getStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: entries.length,
      staleEntries: entries.filter(([, entry]) => entry.staleAt && now > entry.staleAt).length,
      expiredEntries: entries.filter(([, entry]) => entry.expiresAt && now > entry.expiresAt).length,
      hitRate: this.calculateHitRate(entries)
    };
  }

  calculateHitRate(entries) {
    if (entries.length === 0) return 0;
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
    return totalHits / entries.length;
  }
}

// Global cache instance
const globalCache = new AdvancedCache();

// Request deduplication
const pendingRequests = new Map();

// Hook for advanced caching with SWR
export const useAdvancedCache = (
  key,
  fetcher,
  options = {}
) => {
  const {
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    staleTime = CACHE_CONFIG.STALE_TIME,
    revalidateOnFocus = CACHE_CONFIG.REVALIDATE_ON_FOCUS,
    revalidateOnReconnect = CACHE_CONFIG.REVALIDATE_ON_RECONNECT,
    onSuccess,
    onError,
    enabled = true
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const isMountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  const lastFetchTimeRef = useRef(0);

  // Update fetcher ref
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Fetch data with deduplication
  const fetchData = useCallback(async (isRevalidation = false) => {
    if (!enabled || !key) return;

    // Check cache first
    const cached = globalCache.get(key);
    if (cached && !cached.isStale && !isRevalidation) {
      setData(cached.data);
      setError(null);
      return cached.data;
    }

    // Set stale data immediately for better UX
    if (cached && isRevalidation) {
      setData(cached.data);
    }

    // Check for pending request (deduplication)
    const now = Date.now();
    if (pendingRequests.has(key)) {
      const pending = pendingRequests.get(key);
      if (now - pending.timestamp < CACHE_CONFIG.DEDUPE_INTERVAL) {
        return pending.promise;
      }
    }

    // Set loading states
    if (!cached) {
      setIsLoading(true);
    }
    setIsValidating(true);

    // Create fetch promise
    const fetchPromise = (async () => {
      try {
        const result = await fetcherRef.current();
        
        if (!isMountedRef.current) return result;

        // Update cache
        globalCache.set(key, result, ttl, staleTime);
        
        // Update state
        setData(result);
        setError(null);
        
        if (onSuccess) onSuccess(result);
        
        return result;
      } catch (err) {
        if (!isMountedRef.current) return null;
        
        console.error(`Cache fetch error for key "${key}":`, err);
        setError(err);
        
        if (onError) onError(err);
        
        // Return stale data on error if available
        if (cached) {
          return cached.data;
        }
        
        throw err;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsValidating(false);
        }
        pendingRequests.delete(key);
        lastFetchTimeRef.current = Date.now();
      }
    })();

    // Store pending request
    pendingRequests.set(key, {
      promise: fetchPromise,
      timestamp: now
    });

    return fetchPromise;
  }, [key, enabled, ttl, staleTime, onSuccess, onError]);

  // Revalidate function
  const revalidate = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Mutate function for optimistic updates
  const mutate = useCallback((newData, shouldRevalidate = true) => {
    if (typeof newData === 'function') {
      const currentData = data || globalCache.get(key)?.data;
      newData = newData(currentData);
    }
    
    // Update cache and state immediately
    globalCache.set(key, newData, ttl, staleTime);
    setData(newData);
    
    // Revalidate in background
    if (shouldRevalidate) {
      revalidate();
    }
  }, [key, data, ttl, staleTime, revalidate]);

  // Initial fetch
  useEffect(() => {
    if (!enabled || !key) return;
    
    fetchData();
  }, [key, enabled, fetchData]);

  // Revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus || !enabled) return;

    const handleFocus = () => {
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > CACHE_CONFIG.STALE_TIME) {
        revalidate();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, enabled, revalidate]);

  // Revalidate on reconnect
  useEffect(() => {
    if (!revalidateOnReconnect || !enabled) return;

    const handleOnline = () => {
      revalidate();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [revalidateOnReconnect, enabled, revalidate]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isValidating,
    revalidate,
    mutate
  };
};

// Prefetch function
export const prefetch = (key, fetcher, options = {}) => {
  const { ttl, staleTime } = options;
  
  // Check if already cached and fresh
  const cached = globalCache.get(key);
  if (cached && !cached.isStale) {
    return Promise.resolve(cached.data);
  }

  // Fetch and cache
  return fetcher().then(data => {
    globalCache.set(key, data, ttl, staleTime);
    return data;
  });
};

// Predictive prefetching based on user behavior
export const usePredictivePrefetch = (prefetchMap, enabled = true) => {
  const interactionHistoryRef = useRef([]);
  const prefetchTimeoutsRef = useRef(new Map());

  const recordInteraction = useCallback((key) => {
    if (!enabled) return;
    
    interactionHistoryRef.current.push({
      key,
      timestamp: Date.now()
    });

    // Keep only last 20 interactions
    if (interactionHistoryRef.current.length > 20) {
      interactionHistoryRef.current.shift();
    }

    // Predict next likely interaction
    const predictions = predictNextInteractions(interactionHistoryRef.current);
    
    // Prefetch predicted content
    predictions.forEach(predictedKey => {
      if (prefetchMap[predictedKey]) {
        // Clear existing timeout
        if (prefetchTimeoutsRef.current.has(predictedKey)) {
          clearTimeout(prefetchTimeoutsRef.current.get(predictedKey));
        }

        // Schedule prefetch
        const timeoutId = setTimeout(() => {
          const { fetcher, options } = prefetchMap[predictedKey];
          prefetch(predictedKey, fetcher, options);
          prefetchTimeoutsRef.current.delete(predictedKey);
        }, CACHE_CONFIG.PREFETCH_DELAY);

        prefetchTimeoutsRef.current.set(predictedKey, timeoutId);
      }
    });
  }, [enabled, prefetchMap]);

  // Cleanup
  useEffect(() => {
    return () => {
      prefetchTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      prefetchTimeoutsRef.current.clear();
    };
  }, []);

  return { recordInteraction };
};

// Simple prediction algorithm based on frequency and recency
const predictNextInteractions = (history) => {
  if (history.length < 2) return [];

  const frequency = {};
  const recency = {};
  const now = Date.now();

  // Calculate frequency and recency scores
  history.forEach((item, index) => {
    const { key, timestamp } = item;
    
    frequency[key] = (frequency[key] || 0) + 1;
    recency[key] = now - timestamp;
  });

  // Calculate prediction scores
  const scores = Object.keys(frequency).map(key => {
    const freqScore = frequency[key] / history.length;
    const recencyScore = 1 - (recency[key] / (24 * 60 * 60 * 1000)); // Normalize to 24 hours
    const score = freqScore * 0.6 + recencyScore * 0.4;
    
    return { key, score };
  });

  // Sort by score and return top 3
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.key);
};

// Cache statistics hook
export const useCacheStats = () => {
  const [stats, setStats] = useState(globalCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(globalCache.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
};

// Clear cache utility
export const clearCache = (pattern) => {
  if (!pattern) {
    globalCache.clear();
    return;
  }

  // Clear matching keys
  const keys = Array.from(globalCache.cache.keys());
  keys.forEach(key => {
    if (key.includes(pattern)) {
      globalCache.delete(key);
    }
  });
};

export default useAdvancedCache;
