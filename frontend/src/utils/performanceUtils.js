/**
 * Performance Optimization Utilities
 * Collection of utility functions for optimizing React applications
 */

/**
 * Debounce function - Delays execution until after wait milliseconds
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function - Limits execution to once per wait milliseconds
 */
export const throttle = (func, wait = 300) => {
  let inThrottle;
  let lastFunc;
  let lastTime;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastTime >= wait) {
          func(...args);
          lastTime = Date.now();
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
};

/**
 * Request Animation Frame based throttle for scroll handlers
 */
export const rafThrottle = (callback) => {
  let requestId = null;
  let lastArgs;

  const later = () => {
    requestId = null;
    callback(...lastArgs);
  };

  return function throttled(...args) {
    lastArgs = args;
    if (requestId === null) {
      requestId = requestAnimationFrame(later);
    }
  };
};

/**
 * Memoize function results
 */
export const memoize = (fn) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

/**
 * Deep equal comparison for objects
 */
export const deepEqual = (a, b) => {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => {
    if (!keysB.includes(key)) return false;
    return deepEqual(a[key], b[key]);
  });
};

/**
 * Shallow equal comparison for objects
 */
export const shallowEqual = (a, b) => {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => a[key] === b[key]);
};

/**
 * Batch DOM reads and writes
 */
export const batchDOMOperations = (() => {
  let readQueue = [];
  let writeQueue = [];
  let scheduled = false;

  const flush = () => {
    // Execute all reads first
    readQueue.forEach(fn => fn());
    readQueue = [];
    
    // Then execute all writes
    writeQueue.forEach(fn => fn());
    writeQueue = [];
    
    scheduled = false;
  };

  return {
    read: (fn) => {
      readQueue.push(fn);
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    },
    write: (fn) => {
      writeQueue.push(fn);
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    },
  };
})();

/**
 * Check if device is low-end
 */
export const isLowEndDevice = () => {
  try {
    const nav = navigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    const deviceMemory = nav.deviceMemory || 4;
    const hardwareConcurrency = nav.hardwareConcurrency || 4;
    const effectiveType = connection?.effectiveType || '4g';
    const saveData = connection?.saveData || false;
    
    return (
      deviceMemory <= 2 ||
      hardwareConcurrency <= 2 ||
      /(^2g$|^slow-2g$|^3g$)/i.test(effectiveType) ||
      saveData
    );
  } catch {
    return false;
  }
};

/**
 * Get network speed
 */
export const getNetworkSpeed = () => {
  try {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = connection?.effectiveType || '4g';
    
    const speedMap = {
      'slow-2g': 'slow',
      '2g': 'slow',
      '3g': 'medium',
      '4g': 'fast',
    };
    
    return speedMap[effectiveType] || 'fast';
  } catch {
    return 'fast';
  }
};

/**
 * Preload image
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Preload multiple images
 */
export const preloadImages = (srcs, options = {}) => {
  const { maxConcurrent = 3, priority = false } = options;
  
  const chunks = [];
  for (let i = 0; i < srcs.length; i += maxConcurrent) {
    chunks.push(srcs.slice(i, i + maxConcurrent));
  }
  
  return chunks.reduce((promise, chunk) => {
    return promise.then(() => Promise.all(chunk.map(preloadImage)));
  }, Promise.resolve());
};

/**
 * Measure component render time
 */
export const measureRenderTime = (componentName) => {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    console.log(`${componentName} render time: ${duration.toFixed(2)}ms`);
  };
};

/**
 * Lazy load component with retry
 */
export const lazyWithRetry = (componentImport, retries = 3) => {
  return new Promise((resolve, reject) => {
    const attemptImport = (retriesLeft) => {
      componentImport()
        .then(resolve)
        .catch((error) => {
          if (retriesLeft === 0) {
            reject(error);
            return;
          }
          
          setTimeout(() => {
            attemptImport(retriesLeft - 1);
          }, 1000 * (retries - retriesLeft + 1));
        });
    };
    
    attemptImport(retries);
  });
};

/**
 * Create intersection observer with fallback
 */
export const createObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  if ('IntersectionObserver' in window) {
    return new IntersectionObserver(callback, mergedOptions);
  }
  
  // Fallback for browsers without IntersectionObserver
  return {
    observe: (element) => {
      // Immediately trigger callback for fallback
      callback([{ isIntersecting: true, target: element }]);
    },
    unobserve: () => {},
    disconnect: () => {},
  };
};

/**
 * Format bytes to human readable
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get optimal image quality based on network and device
 */
export const getOptimalImageQuality = () => {
  const networkSpeed = getNetworkSpeed();
  const isLowEnd = isLowEndDevice();
  
  if (isLowEnd || networkSpeed === 'slow') {
    return 'low'; // w300
  } else if (networkSpeed === 'medium') {
    return 'medium'; // w500
  } else {
    return 'high'; // w780 or w1280
  }
};

/**
 * Cancel all ongoing requests in an AbortController
 */
export const createAbortController = () => {
  const controller = new AbortController();
  
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
  };
};

export default {
  debounce,
  throttle,
  rafThrottle,
  memoize,
  deepEqual,
  shallowEqual,
  batchDOMOperations,
  isLowEndDevice,
  getNetworkSpeed,
  preloadImage,
  preloadImages,
  measureRenderTime,
  lazyWithRetry,
  createObserver,
  formatBytes,
  getOptimalImageQuality,
  createAbortController,
};
