/**
 * Search Performance Optimizations
 * Includes debouncing, caching, and rendering optimizations
 */

/**
 * Enhanced debounce function with cancellation support
 * Uses requestAnimationFrame for smoother animations
 */
export const createSmartDebounce = (fn, delayMs) => {
  let timeoutId = null;
  let rafId = null;
  let lastArgs = null;
  let isScheduled = false;

  const debounced = (...args) => {
    lastArgs = args;
    
    // Cancel previous timeout
    if (timeoutId) clearTimeout(timeoutId);
    if (rafId) cancelAnimationFrame(rafId);
    
    isScheduled = true;
    
    timeoutId = setTimeout(() => {
      // Use RAF for final execution to align with browser rendering
      rafId = requestAnimationFrame(() => {
        if (isScheduled && lastArgs) {
          fn(...lastArgs);
        }
        timeoutId = null;
        rafId = null;
        isScheduled = false;
      });
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (rafId) cancelAnimationFrame(rafId);
    timeoutId = null;
    rafId = null;
    lastArgs = null;
    isScheduled = false;
  };

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      if (lastArgs) {
        fn(...lastArgs);
      }
      timeoutId = null;
      rafId = null;
      isScheduled = false;
    }
  };

  return debounced;
};

/**
 * Optimized LRU (Least Recently Used) Cache
 * Automatically evicts oldest entries when max size is reached
 */
export class OptimizedCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.accessOrder = [];
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return null;
    }

    // Update access order (move to end)
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    entry.lastAccess = Date.now();

    return entry.value;
  }

  set(key, value) {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccess: Date.now()
    });
    this.accessOrder.push(key);
  }

  has(key) {
    if (!this.cache.has(key)) return false;
    
    const entry = this.cache.get(key);
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return false;
    }
    return true;
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }
}

/**
 * Batch DOM updates to reduce repaints/reflows
 * Useful for multiple state updates
 */
export const batchDOMUpdates = (updates) => {
  // Read phase
  const reads = updates
    .filter(u => u.type === 'read')
    .map(u => ({ key: u.key, value: u.fn() }));

  // Write phase
  requestAnimationFrame(() => {
    updates
      .filter(u => u.type === 'write')
      .forEach(u => u.fn());
  });

  return reads;
};

/**
 * Throttle function for high-frequency events
 * Ensures function runs at most once per interval
 */
export const throttle = (fn, intervalMs) => {
  let lastRun = 0;
  let timeoutId = null;

  return (...args) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun;

    if (timeSinceLastRun >= intervalMs) {
      fn(...args);
      lastRun = now;
      if (timeoutId) clearTimeout(timeoutId);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn(...args);
        lastRun = Date.now();
      }, intervalMs - timeSinceLastRun);
    }
  };
};

/**
 * Debounce with immediate execution option
 */
export const debounce = (fn, delayMs, options = {}) => {
  const { leading = false, trailing = true, maxWait = null } = options;
  let timeoutId = null;
  let maxWaitTimeoutId = null;
  let lastArgs = null;
  let hasInvoked = false;

  const debounced = (...args) => {
    lastArgs = args;

    // Leading edge execution
    if (leading && !hasInvoked) {
      fn(...args);
      hasInvoked = true;
    }

    // Clear previous timeout
    if (timeoutId) clearTimeout(timeoutId);

    // Set new timeout
    timeoutId = setTimeout(() => {
      if (trailing && lastArgs) {
        fn(...lastArgs);
      }
      timeoutId = null;
      hasInvoked = false;
    }, delayMs);

    // MaxWait timeout for forced execution
    if (maxWait && !maxWaitTimeoutId) {
      maxWaitTimeoutId = setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        maxWaitTimeoutId = null;
        hasInvoked = false;
      }, maxWait);
    }
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (maxWaitTimeoutId) clearTimeout(maxWaitTimeoutId);
    timeoutId = null;
    maxWaitTimeoutId = null;
    lastArgs = null;
    hasInvoked = false;
  };

  debounced.flush = () => {
    if (timeoutId || maxWaitTimeoutId) {
      if (lastArgs) {
        fn(...lastArgs);
      }
      debounced.cancel();
    }
  };

  return debounced;
};

/**
 * Create a virtual list renderer for large datasets
 * Only renders visible items in a scrollable container
 */
export class VirtualListRenderer {
  constructor(items = [], itemHeight = 100, containerHeight = 600) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.scrollTop = 0;
  }

  getVisibleRange() {
    const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - 1);
    const endIndex = Math.min(
      this.items.length,
      Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) + 1
    );
    return { startIndex, endIndex };
  }

  getVisibleItems() {
    const { startIndex, endIndex } = this.getVisibleRange();
    return this.items.slice(startIndex, endIndex);
  }

  updateScroll(scrollTop) {
    this.scrollTop = scrollTop;
  }

  updateItems(items) {
    this.items = items;
  }

  getTotalHeight() {
    return this.items.length * this.itemHeight;
  }

  getOffsetY(index) {
    return index * this.itemHeight;
  }
}

/**
 * Memory-efficient debounce for search with adaptive timing
 * Adjusts debounce delay based on input length for better UX
 */
export const createAdaptiveDebounce = (fn) => {
  let timeoutId = null;
  let lastArgs = null;

  return (...args) => {
    lastArgs = args;
    
    if (timeoutId) clearTimeout(timeoutId);

    // Shorter delay for longer queries (more specific = better results)
    // Longer delay for short queries (broader = more results)
    const query = args[0];
    const delay = query && query.length >= 4 
      ? 100  // Fast feedback for specific queries
      : query && query.length >= 2
      ? 200  // Medium delay for 2-3 char queries
      : 300; // Longer delay for 1 char (rarely useful)

    timeoutId = setTimeout(() => {
      fn(...lastArgs);
      timeoutId = null;
    }, delay);
  };
};

/**
 * Detect if device is mobile/low-power
 * Used to disable animations on slow devices
 */
export const isLowPowerDevice = () => {
  // Check if user has requested reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Estimate based on device memory (if available)
  const isLowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2;
  
  // Check for low-end device indicators
  const isSlowConnection = navigator.connection && 
    (navigator.connection.effectiveType === '2g' || 
     navigator.connection.effectiveType === '3g');

  return prefersReducedMotion || isLowMemory || isSlowConnection;
};

/**
 * Format animation properties based on device capabilities
 */
export const getAnimationConfig = () => {
  const isLowPower = isLowPowerDevice();
  
  return {
    duration: isLowPower ? 0.1 : 0.2,
    transition: isLowPower ? { duration: 0.1 } : { duration: 0.2, ease: 'easeOut' },
    shouldAnimate: !isLowPower,
    // Reduce particle count on low-power devices
    particleCount: isLowPower ? 0 : 3,
  };
};

/**
 * Create a deferred state update utility
 * Useful for non-critical UI updates that can wait for idle time
 */
export class DeferredStateUpdater {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  defer(callback) {
    this.queue.push(callback);
    this.process();
  }

  process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.executeQueue();
        this.isProcessing = false;
      });
    } else {
      setTimeout(() => {
        this.executeQueue();
        this.isProcessing = false;
      }, 0);
    }
  }

  executeQueue() {
    while (this.queue.length > 0) {
      const callback = this.queue.shift();
      try {
        callback();
      } catch (error) {
        console.error('Error in deferred callback:', error);
      }
    }
  }

  clear() {
    this.queue = [];
  }
}

/**
 * Smart result filtering with early termination
 * Stops processing results once we have enough quality matches
 */
export const filterSearchResults = (results, query, maxResults = 20) => {
  const queryLower = query.toLowerCase();
  const exactMatches = [];
  const fuzzyMatches = [];
  const otherMatches = [];

  for (const result of results) {
    // Early termination: if we have enough exact matches, skip fuzzy matching
    if (exactMatches.length >= maxResults) break;

    const title = (result.title || result.name || '').toLowerCase();
    
    if (title === queryLower) {
      exactMatches.push(result);
    } else if (exactMatches.length < maxResults) {
      fuzzyMatches.push(result);
    }
  }

  // Only process other matches if we don't have enough quality matches
  if (exactMatches.length + fuzzyMatches.length < maxResults) {
    for (const result of results) {
      if (!exactMatches.includes(result) && !fuzzyMatches.includes(result)) {
        if (otherMatches.length >= maxResults - exactMatches.length - fuzzyMatches.length) break;
        otherMatches.push(result);
      }
    }
  }

  return [...exactMatches, ...fuzzyMatches, ...otherMatches].slice(0, maxResults);
};

export default {
  createSmartDebounce,
  OptimizedCache,
  batchDOMUpdates,
  throttle,
  debounce,
  VirtualListRenderer,
  createAdaptiveDebounce,
  isLowPowerDevice,
  getAnimationConfig,
  DeferredStateUpdater,
  filterSearchResults,
};
