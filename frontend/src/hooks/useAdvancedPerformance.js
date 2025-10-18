/**
 * Advanced Performance Optimization Service
 * Implements virtual scrolling, progressive hydration, and intelligent resource management
 */
import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Virtual Scrolling Hook for Large Lists
 * Renders only visible items to improve performance
 */
export const useVirtualScroll = ({
  items = [],
  itemHeight,
  containerHeight,
  overscan = 3
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  
  const containerRef = useRef(null);

  // Calculate visible range
  useEffect(() => {
    if (!items.length || !itemHeight || !containerHeight) return;

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    setVisibleRange({ start, end });
  }, [scrollTop, items.length, itemHeight, containerHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Visible items
  const visibleItems = items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
    item,
    index: visibleRange.start + index,
    style: {
      position: 'absolute',
      top: (visibleRange.start + index) * itemHeight,
      height: itemHeight,
      width: '100%'
    }
  }));

  return {
    containerRef,
    visibleItems,
    handleScroll,
    totalHeight: items.length * itemHeight,
    visibleRange
  };
};

/**
 * Progressive Hydration Hook
 * Hydrates components progressively based on priority
 */
export const useProgressiveHydration = (priority = 'normal') => {
  const [isHydrated, setIsHydrated] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const priorityDelays = {
      high: 0,
      normal: 100,
      low: 500
    };

    const delay = priorityDelays[priority] || priorityDelays.normal;

    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [priority]);

  return {
    isHydrated,
    elementRef,
    HydrationWrapper: ({ children, fallback = null }) => {
      return isHydrated ? children : fallback;
    }
  };
};

/**
 * Intersection Observer Pool
 * Reuses intersection observers for better performance
 */
class IntersectionObserverPool {
  constructor() {
    this.observers = new Map();
  }

  getObserver(options = {}) {
    const key = JSON.stringify(options);
    
    if (!this.observers.has(key)) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const callbacks = this.observers.get(key).callbacks.get(entry.target);
          if (callbacks) {
            callbacks.forEach(callback => callback(entry));
          }
        });
      }, options);

      this.observers.set(key, {
        observer,
        callbacks: new Map()
      });
    }

    return this.observers.get(key);
  }

  observe(element, callback, options = {}) {
    const { observer, callbacks } = this.getObserver(options);
    
    if (!callbacks.has(element)) {
      callbacks.set(element, new Set());
      observer.observe(element);
    }

    callbacks.get(element).add(callback);
  }

  unobserve(element, callback, options = {}) {
    const key = JSON.stringify(options);
    const observerData = this.observers.get(key);
    
    if (!observerData) return;

    const { observer, callbacks } = observerData;
    const elementCallbacks = callbacks.get(element);

    if (!elementCallbacks) return;

    if (callback) {
      elementCallbacks.delete(callback);
    }

    if (!callback || elementCallbacks.size === 0) {
      callbacks.delete(element);
      observer.unobserve(element);
    }
  }

  disconnect() {
    this.observers.forEach(({ observer }) => observer.disconnect());
    this.observers.clear();
  }
}

const observerPool = new IntersectionObserverPool();

/**
 * Advanced Lazy Loading Hook with Intersection Observer Pool
 */
export const useAdvancedLazyLoad = (options = {}) => {
  const {
    rootMargin = '200px',
    threshold = 0.01,
    onVisible,
    once = true
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const callback = (entry) => {
      if (entry.isIntersecting && (!once || !hasTriggeredRef.current)) {
        setIsVisible(true);
        hasTriggeredRef.current = true;
        
        if (onVisible) {
          onVisible(entry);
        }

        if (once) {
          observerPool.unobserve(element, callback, { rootMargin, threshold });
        }
      }
    };

    observerPool.observe(element, callback, { rootMargin, threshold });

    return () => {
      observerPool.unobserve(element, callback, { rootMargin, threshold });
    };
  }, [rootMargin, threshold, onVisible, once]);

  return {
    elementRef,
    isVisible
  };
};

/**
 * Resource Priority Hints
 * Provides hints for resource loading priorities
 */
export const useResourcePriority = () => {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    saveData: false,
    downlink: 10
  });

  useEffect(() => {
    if (!navigator.connection) return;

    const updateNetworkInfo = () => {
      setNetworkInfo({
        effectiveType: navigator.connection.effectiveType,
        saveData: navigator.connection.saveData,
        downlink: navigator.connection.downlink
      });
    };

    updateNetworkInfo();
    navigator.connection.addEventListener('change', updateNetworkInfo);

    return () => {
      navigator.connection.removeEventListener('change', updateNetworkInfo);
    };
  }, []);

  const getImageQuality = useCallback(() => {
    if (networkInfo.saveData) return 'low';
    
    switch (networkInfo.effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'low';
      case '3g':
        return 'medium';
      case '4g':
      default:
        return 'high';
    }
  }, [networkInfo]);

  const shouldPrefetch = useCallback(() => {
    return !networkInfo.saveData && 
           networkInfo.effectiveType === '4g' && 
           networkInfo.downlink > 5;
  }, [networkInfo]);

  return {
    networkInfo,
    getImageQuality,
    shouldPrefetch
  };
};

/**
 * Adaptive Loading Hook
 * Adjusts content based on device capabilities
 */
export const useAdaptiveLoading = () => {
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    memory: null,
    cores: null,
    isLowEnd: false
  });

  useEffect(() => {
    const memory = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    // Consider device low-end if:
    // - Memory <= 4GB
    // - Cores <= 4
    const isLowEnd = (memory && memory <= 4) || (cores && cores <= 4);

    setDeviceCapabilities({
      memory,
      cores,
      isLowEnd
    });
  }, []);

  const getAdaptiveConfig = useCallback(() => {
    if (deviceCapabilities.isLowEnd) {
      return {
        maxConcurrentRequests: 3,
        imageQuality: 'medium',
        enableAnimations: false,
        prefetchCount: 2
      };
    }

    return {
      maxConcurrentRequests: 6,
      imageQuality: 'high',
      enableAnimations: true,
      prefetchCount: 5
    };
  }, [deviceCapabilities]);

  return {
    deviceCapabilities,
    getAdaptiveConfig
  };
};

/**
 * Request Queue with Priority
 * Manages API requests with priority-based execution
 */
class RequestQueue {
  constructor(maxConcurrent = 6) {
    this.queue = [];
    this.active = new Set();
    this.maxConcurrent = maxConcurrent;
  }

  async add(fn, priority = 'normal') {
    const priorities = { high: 3, normal: 2, low: 1 };
    const priorityValue = priorities[priority] || 2;

    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        priority: priorityValue,
        resolve,
        reject
      });

      this.queue.sort((a, b) => b.priority - a.priority);
      this.process();
    });
  }

  async process() {
    if (this.active.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.active.add(task);

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.active.delete(task);
      this.process();
    }
  }

  clear() {
    this.queue = [];
  }

  get pending() {
    return this.queue.length;
  }

  get activeCount() {
    return this.active.size;
  }
}

const globalRequestQueue = new RequestQueue();

export const useRequestQueue = () => {
  const enqueue = useCallback((fn, priority) => {
    return globalRequestQueue.add(fn, priority);
  }, []);

  const getQueueStats = useCallback(() => {
    return {
      pending: globalRequestQueue.pending,
      active: globalRequestQueue.activeCount
    };
  }, []);

  return {
    enqueue,
    getQueueStats
  };
};

/**
 * Frame Budget Hook
 * Ensures operations stay within frame budget for smooth animations
 */
export const useFrameBudget = (budget = 16) => {
  const frameStartRef = useRef(0);

  const startFrame = useCallback(() => {
    frameStartRef.current = performance.now();
  }, []);

  const hasTimeBudget = useCallback(() => {
    const elapsed = performance.now() - frameStartRef.current;
    return elapsed < budget;
  }, [budget]);

  const getRemainingTime = useCallback(() => {
    const elapsed = performance.now() - frameStartRef.current;
    return Math.max(0, budget - elapsed);
  }, [budget]);

  return {
    startFrame,
    hasTimeBudget,
    getRemainingTime
  };
};

/**
 * Idle Callback Hook
 * Executes tasks during browser idle time
 */
export const useIdleCallback = (callback, options = {}) => {
  const { timeout = 1000 } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!('requestIdleCallback' in window)) {
      const timer = setTimeout(() => callbackRef.current(), timeout);
      return () => clearTimeout(timer);
    }

    const handle = requestIdleCallback(
      () => callbackRef.current(),
      { timeout }
    );

    return () => cancelIdleCallback(handle);
  }, [timeout]);
};

export default {
  useVirtualScroll,
  useProgressiveHydration,
  useAdvancedLazyLoad,
  useResourcePriority,
  useAdaptiveLoading,
  useRequestQueue,
  useFrameBudget,
  useIdleCallback
};
