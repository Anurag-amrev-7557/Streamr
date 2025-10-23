import React from 'react';

// Memory optimization utilities for ContinueWatching component
class ContinueWatchingMemoryOptimizer {
  constructor() {
    this.cleanupCallbacks = new Set();
    this.intervals = new Set();
    this.timeouts = new Set();
    this.eventListeners = new Map();
    this.isDestroyed = false;
  }

  // Add cleanup callback
  addCleanupCallback(callback) {
    if (!this.isDestroyed) {
      this.cleanupCallbacks.add(callback);
    }
  }

  // Add interval with automatic cleanup
  addInterval(callback, delay) {
    if (this.isDestroyed) return null;
    
    const intervalId = setInterval(callback, delay);
    this.intervals.add(intervalId);
    return intervalId;
  }

  // Add timeout with automatic cleanup
  addTimeout(callback, delay) {
    if (this.isDestroyed) return null;
    
    const timeoutId = setTimeout(callback, delay);
    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  // Add event listener with automatic cleanup
  addEventListener(element, event, handler, options = {}) {
    if (this.isDestroyed) return;
    
    element.addEventListener(event, handler, options);
    
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    this.eventListeners.get(element).push({ event, handler, options });
  }

  // Debounced function creator
  createDebouncedFunction(func, delay) {
    let timeoutId = null;
    
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = this.addTimeout(() => {
        func(...args);
      }, delay);
    };
  }

  // Throttled function creator
  createThrottledFunction(func, delay) {
    let lastCall = 0;
    
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  // Process items in batches to prevent blocking
  processItemsInBatches(items, processFunction, batchSize = 10) {
    return new Promise((resolve) => {
      let index = 0;
      
      const processBatch = () => {
        const batch = items.slice(index, index + batchSize);
        batch.forEach(processFunction);
        index += batchSize;
        
        if (index < items.length) {
          this.addTimeout(processBatch, 0);
        } else {
          resolve();
        }
      };
      
      processBatch();
    });
  }

  // Optimize image loading
  optimizeImageLoading(imageUrls, onLoad, onError) {
    const imagePromises = imageUrls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(url);
        img.src = url;
      });
    });

    return Promise.allSettled(imagePromises);
  }

  // Clean up all resources
  cleanup() {
    this.isDestroyed = true;
    
    // Clear all intervals
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
    
    // Clear all timeouts
    this.timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.timeouts.clear();
    
    // Remove all event listeners
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
    });
    this.eventListeners.clear();
    
    // Execute cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    });
    this.cleanupCallbacks.clear();
  }

  // Check if component is still mounted
  isMounted() {
    return !this.isDestroyed;
  }
}

// Hook for using the memory optimizer
export const useContinueWatchingMemoryOptimizer = () => {
  const optimizerRef = React.useRef(null);
  
  React.useEffect(() => {
    optimizerRef.current = new ContinueWatchingMemoryOptimizer();
    
    return () => {
      if (optimizerRef.current) {
        optimizerRef.current.cleanup();
      }
    };
  }, []);
  
  return optimizerRef.current;
};

export default ContinueWatchingMemoryOptimizer; 