/**
 * useMovieCache - Optimized caching hook for movie data
 * Implements LRU cache with TTL and memory management
 */
import { useRef, useCallback, useState, useEffect } from 'react';

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100; // Maximum number of cache entries
const MAX_MEMORY_MB = 10; // Maximum cache memory in MB

export const useMovieCache = (options = {}) => {
  const {
    ttl = DEFAULT_TTL,
    maxSize = MAX_CACHE_SIZE,
    maxMemoryMB = MAX_MEMORY_MB,
  } = options;

  const cacheRef = useRef(new Map());
  const accessOrderRef = useRef([]);
  const [stats, setStats] = useState({
    hits: 0,
    misses: 0,
    evictions: 0,
    totalEntries: 0,
  });

  // Estimate memory usage of a value
  const estimateSize = useCallback((value) => {
    try {
      const str = JSON.stringify(value);
      return str.length * 2; // Approximate bytes (UTF-16)
    } catch {
      return 0;
    }
  }, []);

  // Get current cache memory usage in MB
  const getCacheMemory = useCallback(() => {
    let totalBytes = 0;
    cacheRef.current.forEach(({ value }) => {
      totalBytes += estimateSize(value);
    });
    return totalBytes / (1024 * 1024); // Convert to MB
  }, [estimateSize]);

  // Evict least recently used entries
  const evictLRU = useCallback(() => {
    if (accessOrderRef.current.length === 0) return;

    const keyToEvict = accessOrderRef.current.shift();
    cacheRef.current.delete(keyToEvict);
    
    setStats(prev => ({
      ...prev,
      evictions: prev.evictions + 1,
      totalEntries: prev.totalEntries - 1,
    }));
  }, []);

  // Clean expired entries
  const cleanExpired = useCallback(() => {
    const now = Date.now();
    const keysToDelete = [];

    cacheRef.current.forEach((entry, key) => {
      if (now - entry.timestamp > ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      cacheRef.current.delete(key);
      const index = accessOrderRef.current.indexOf(key);
      if (index > -1) {
        accessOrderRef.current.splice(index, 1);
      }
    });

    if (keysToDelete.length > 0) {
      setStats(prev => ({
        ...prev,
        totalEntries: prev.totalEntries - keysToDelete.length,
      }));
    }
  }, [ttl]);

  // Update access order for LRU
  const updateAccessOrder = useCallback((key) => {
    const index = accessOrderRef.current.indexOf(key);
    if (index > -1) {
      accessOrderRef.current.splice(index, 1);
    }
    accessOrderRef.current.push(key);
  }, []);

  // Get value from cache
  const get = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    
    if (!entry) {
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > ttl) {
      cacheRef.current.delete(key);
      setStats(prev => ({
        ...prev,
        misses: prev.misses + 1,
        totalEntries: prev.totalEntries - 1,
      }));
      return null;
    }

    updateAccessOrder(key);
    setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return entry.value;
  }, [ttl, updateAccessOrder]);

  // Set value in cache
  const set = useCallback((key, value) => {
    // Evict if cache is full
    while (cacheRef.current.size >= maxSize) {
      evictLRU();
    }

    // Evict if memory limit exceeded
    while (getCacheMemory() >= maxMemoryMB && accessOrderRef.current.length > 0) {
      evictLRU();
    }

    cacheRef.current.set(key, {
      value,
      timestamp: Date.now(),
    });

    updateAccessOrder(key);
    
    if (!accessOrderRef.current.includes(key)) {
      setStats(prev => ({
        ...prev,
        totalEntries: prev.totalEntries + 1,
      }));
    }
  }, [maxSize, maxMemoryMB, evictLRU, getCacheMemory, updateAccessOrder]);

  // Clear entire cache
  const clear = useCallback(() => {
    cacheRef.current.clear();
    accessOrderRef.current.length = 0;
    setStats({
      hits: 0,
      misses: 0,
      evictions: 0,
      totalEntries: 0,
    });
  }, []);

  // Get cache statistics
  const getStats = useCallback(() => {
    const hitRate = stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
      : '0.00';

    return {
      ...stats,
      hitRate: `${hitRate}%`,
      memoryUsageMB: getCacheMemory().toFixed(2),
    };
  }, [stats, getCacheMemory]);

  // Periodic cleanup of expired entries
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanExpired();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [cleanExpired]);

  return {
    get,
    set,
    clear,
    getStats,
    cleanExpired,
  };
};

export default useMovieCache;
