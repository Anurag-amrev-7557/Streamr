// Custom hook for HomePage memory optimization
import { useEffect, useRef, useCallback, useMemo } from 'react';
import memoryManager from '../utils/memoryManager';
import memoryOptimizationService from '../utils/memoryOptimizationService';

export const useHomePageOptimization = () => {
  const componentRef = useRef(null);
  const cleanupCallbacks = useRef(new Set());
  const timeouts = useRef(new Set());
  const intervals = useRef(new Set());
  const eventListeners = useRef(new Set());
  const imageElements = useRef(new Set());
  const dataCache = useRef(new Map());
  const isMounted = useRef(true);

  // Register component for memory management
  useEffect(() => {
    if (componentRef.current) {
      memoryManager.registerComponent(componentRef, 'HomePage');
    }

    return () => {
      isMounted.current = false;
      performCleanup();
    };
  }, []);

  // Perform comprehensive cleanup
  const performCleanup = useCallback(() => {
    console.log('[useHomePageOptimization] Performing cleanup...');

    // Clear all timeouts
    timeouts.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
      clearInterval(timeoutId);
    });
    timeouts.current.clear();

    // Clear all intervals
    intervals.current.forEach(intervalId => {
      clearInterval(intervalId);
    });
    intervals.current.clear();

    // Remove all event listeners
    eventListeners.current.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    eventListeners.current.clear();

    // Clear image elements
    imageElements.current.forEach(img => {
      if (img && img.src) {
        img.src = '';
        img.removeAttribute('src');
      }
    });
    imageElements.current.clear();

    // Clear data cache
    dataCache.current.clear();

    // Execute cleanup callbacks
    cleanupCallbacks.current.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[useHomePageOptimization] Cleanup callback failed:', error);
      }
    });
    cleanupCallbacks.current.clear();

    console.log('[useHomePageOptimization] Cleanup completed');
  }, []);

  // Safe timeout with automatic cleanup
  const setSafeTimeout = useCallback((callback, delay) => {
    if (!isMounted.current) return null;

    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        callback();
      }
      timeouts.current.delete(timeoutId);
    }, delay);

    timeouts.current.add(timeoutId);
    return timeoutId;
  }, []);

  // Safe interval with automatic cleanup
  const setSafeInterval = useCallback((callback, delay) => {
    if (!isMounted.current) return null;

    const intervalId = setInterval(() => {
      if (isMounted.current) {
        callback();
      } else {
        clearInterval(intervalId);
        intervals.current.delete(intervalId);
      }
    }, delay);

    intervals.current.add(intervalId);
    return intervalId;
  }, []);

  // Safe event listener with automatic cleanup
  const addSafeEventListener = useCallback((element, event, handler) => {
    if (!element || !isMounted.current) return;

    element.addEventListener(event, handler);
    eventListeners.current.add({ element, event, handler });
  }, []);

  // Optimize image loading
  const optimizeImage = useCallback((imageElement) => {
    if (!imageElement || !isMounted.current) return;

    imageElements.current.add(imageElement);

    // Add memory management attributes
    imageElement.setAttribute('data-memory-managed', 'true');

    // Optimize loading
    const originalOnLoad = imageElement.onload;
    const originalOnError = imageElement.onerror;

    imageElement.onload = (event) => {
      if (isMounted.current) {
        // Clear src after successful load to free memory
        setSafeTimeout(() => {
          if (imageElement && imageElement.dataset.memoryManaged) {
            imageElement.removeAttribute('data-memory-managed');
            imageElements.current.delete(imageElement);
          }
        }, 2000);

        if (originalOnLoad) {
          originalOnLoad.call(imageElement, event);
        }
      }
    };

    imageElement.onerror = (event) => {
      if (isMounted.current) {
        // Clear failed image to prevent memory leaks
        imageElement.src = '';
        imageElement.removeAttribute('data-memory-managed');
        imageElements.current.delete(imageElement);

        if (originalOnError) {
          originalOnError.call(imageElement, event);
        }
      }
    };
  }, [setSafeTimeout]);

  // Cache data with memory limits
  const cacheData = useCallback((key, data, ttl = 300000) => { // 5 minutes default
    if (!isMounted.current) return;

    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    dataCache.current.set(key, cacheEntry);

    // Limit cache size
    if (dataCache.current.size > 50) {
      const firstKey = dataCache.current.keys().next().value;
      dataCache.current.delete(firstKey);
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback((key) => {
    if (!isMounted.current) return null;

    const cacheEntry = dataCache.current.get(key);
    if (!cacheEntry) return null;

    const now = Date.now();
    if (now - cacheEntry.timestamp > cacheEntry.ttl) {
      dataCache.current.delete(key);
      return null;
    }

    return cacheEntry.data;
  }, []);

  // Monitor memory-intensive operations
  const monitorOperation = useCallback((operationName, operation) => {
    return memoryOptimizationService.monitorOperation(operationName, operation);
  }, []);

  // Add cleanup callback
  const addCleanupCallback = useCallback((callback) => {
    if (isMounted.current) {
      cleanupCallbacks.current.add(callback);
    }
  }, []);

  // Get memory statistics
  const getMemoryStats = useCallback(() => {
    return memoryOptimizationService.getStats();
  }, []);

  // Check memory usage
  const isMemoryUsageAcceptable = useCallback(() => {
    return memoryOptimizationService.isMemoryUsageAcceptable();
  }, []);

  // Optimize movie data processing
  const optimizeMovieData = useCallback((movies) => {
    if (!movies || !Array.isArray(movies)) return movies;

    return movies.map(movie => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      overview: movie.overview?.substring(0, 200), // Limit overview length
      release_date: movie.release_date,
      vote_average: movie.vote_average,
      genre_ids: movie.genre_ids?.slice(0, 3), // Limit genres
      media_type: movie.media_type || 'movie'
    }));
  }, []);

  // Optimize image URLs
  const optimizeImageUrl = useCallback((path, size = 'w500') => {
    if (!path) return null;
    
    // Use smaller images for better performance
    const optimizedSize = size === 'original' ? 'w780' : size;
    return `https://image.tmdb.org/t/p/${optimizedSize}${path}`;
  }, []);

  // Debounced function with memory cleanup
  const debounce = useCallback((func, wait) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeouts.current.delete(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        if (isMounted.current) {
          func(...args);
        }
        timeouts.current.delete(timeoutId);
      }, wait);
      
      timeouts.current.add(timeoutId);
    };
  }, []);

  // Throttled function with memory cleanup
  const throttle = useCallback((func, limit) => {
    let inThrottle = false;
    return (...args) => {
      if (!inThrottle && isMounted.current) {
        func(...args);
        inThrottle = true;
        
        const timeoutId = setTimeout(() => {
          inThrottle = false;
          timeouts.current.delete(timeoutId);
        }, limit);
        
        timeouts.current.add(timeoutId);
      }
    };
  }, []);

  // Optimize component rendering
  const optimizeRendering = useCallback((component, props) => {
    if (!isMounted.current) return null;

    // Use React.memo for optimization
    const MemoizedComponent = React.memo(component);
    return <MemoizedComponent {...props} />;
  }, []);

  // Memory usage monitoring
  useEffect(() => {
    const memoryCheckInterval = setSafeInterval(() => {
      const stats = getMemoryStats();
      if (stats && stats.currentMemory > 400) {
        console.warn('[useHomePageOptimization] High memory usage detected:', stats.currentMemory, 'MB');
        performCleanup();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
        intervals.current.delete(memoryCheckInterval);
      }
    };
  }, [setSafeInterval, getMemoryStats, performCleanup]);

  return {
    componentRef,
    setSafeTimeout,
    setSafeInterval,
    addSafeEventListener,
    optimizeImage,
    cacheData,
    getCachedData,
    monitorOperation,
    addCleanupCallback,
    getMemoryStats,
    isMemoryUsageAcceptable,
    optimizeMovieData,
    optimizeImageUrl,
    debounce,
    throttle,
    optimizeRendering,
    performCleanup
  };
}; 