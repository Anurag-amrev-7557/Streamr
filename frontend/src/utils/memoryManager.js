// Memory Manager for React Components
// Provides utilities to prevent memory leaks and optimize React component performance

import memoryOptimizationService from './memoryOptimizationService';

class MemoryManager {
  constructor() {
    this.componentRefs = new WeakMap();
    this.cleanupCallbacks = new WeakMap();
    this.monitoredComponents = new Set();
    this.memoryThresholds = {
      warning: 300, // MB
      critical: 500, // MB
      emergency: 700 // MB
    };
  }

  // Register a React component for memory monitoring
  registerComponent(componentRef, componentName = 'Unknown') {
    if (!componentRef || !componentRef.current) {
      console.warn('[MemoryManager] Invalid component ref provided');
      return;
    }

    const component = componentRef.current;
    this.componentRefs.set(component, componentName);
    this.monitoredComponents.add(componentName);

    // Register cleanup callback
    const cleanupCallback = () => this.cleanupComponent(component, componentName);
    this.cleanupCallbacks.set(component, cleanupCallback);
    
    memoryOptimizationService.registerCleanupCallback(cleanupCallback, componentName);

    console.log(`[MemoryManager] Registered component: ${componentName}`);
  }

  // Unregister a React component
  unregisterComponent(componentRef) {
    if (!componentRef || !componentRef.current) return;

    const component = componentRef.current;
    const componentName = this.componentRefs.get(component);
    
    if (componentName) {
      this.componentRefs.delete(component);
      this.monitoredComponents.delete(componentName);
      
      const cleanupCallback = this.cleanupCallbacks.get(component);
      if (cleanupCallback) {
        this.cleanupCallbacks.delete(component);
      }
      
      console.log(`[MemoryManager] Unregistered component: ${componentName}`);
    }
  }

  // Cleanup a specific component
  cleanupComponent(component, componentName) {
    try {
      console.log(`[MemoryManager] Cleaning up component: ${componentName}`);

      // Clear React state
      if (component.state && typeof component.setState === 'function') {
        component.setState({}, () => {
          // Clear state after setState callback
          if (component.state && typeof component.state === 'object') {
            Object.keys(component.state).forEach(key => {
              if (component.state[key] && typeof component.state[key] === 'object') {
                component.state[key] = null;
              }
            });
          }
        });
      }

      // Clear refs
      if (component.refs) {
        Object.keys(component.refs).forEach(key => {
          component.refs[key] = null;
        });
      }

      // Clear any stored callbacks or event listeners
      if (component._cleanupCallbacks) {
        component._cleanupCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.warn(`[MemoryManager] Cleanup callback failed for ${componentName}:`, error);
          }
        });
        component._cleanupCallbacks = [];
      }

      // Clear any stored timeouts or intervals
      if (component._timeouts) {
        component._timeouts.forEach(timeoutId => {
          clearTimeout(timeoutId);
          clearInterval(timeoutId);
        });
        component._timeouts = [];
      }

      // Clear any stored event listeners
      if (component._eventListeners) {
        component._eventListeners.forEach(({ element, event, handler }) => {
          if (element && element.removeEventListener) {
            element.removeEventListener(event, handler);
          }
        });
        component._eventListeners = [];
      }

    } catch (error) {
      console.error(`[MemoryManager] Failed to cleanup component ${componentName}:`, error);
    }
  }

  // Add cleanup callback to a component
  addCleanupCallback(componentRef, callback) {
    if (!componentRef || !componentRef.current) return;

    const component = componentRef.current;
    if (!component._cleanupCallbacks) {
      component._cleanupCallbacks = [];
    }
    component._cleanupCallbacks.push(callback);
  }

  // Add timeout/interval tracking to a component
  addTrackedTimeout(componentRef, timeoutId) {
    if (!componentRef || !componentRef.current) return;

    const component = componentRef.current;
    if (!component._timeouts) {
      component._timeouts = [];
    }
    component._timeouts.push(timeoutId);
  }

  // Add event listener tracking to a component
  addTrackedEventListener(componentRef, element, event, handler) {
    if (!componentRef || !componentRef.current) return;

    const component = componentRef.current;
    if (!component._eventListeners) {
      component._eventListeners = [];
    }
    component._eventListeners.push({ element, event, handler });
  }

  // Optimize image loading to prevent memory leaks
  optimizeImageLoading(componentRef, imageElement) {
    if (!imageElement) return;

    // Add data attribute for tracking
    imageElement.setAttribute('data-memory-managed', 'true');

    // Optimize image loading
    const originalOnLoad = imageElement.onload;
    const originalOnError = imageElement.onerror;

    imageElement.onload = (event) => {
      // Clear src after successful load to free memory
      setTimeout(() => {
        if (imageElement && imageElement.dataset.memoryManaged) {
          imageElement.removeAttribute('data-memory-managed');
        }
      }, 1000);

      if (originalOnLoad) {
        originalOnLoad.call(imageElement, event);
      }
    };

    imageElement.onerror = (event) => {
      // Clear failed image to prevent memory leaks
      imageElement.src = '';
      imageElement.removeAttribute('data-memory-managed');

      if (originalOnError) {
        originalOnError.call(imageElement, event);
      }
    };
  }

  // Monitor memory usage for a specific operation
  monitorOperation(operationName, operation) {
    return memoryOptimizationService.monitorOperation(operationName, operation);
  }

  // Get memory usage statistics
  getMemoryStats() {
    return memoryOptimizationService.getStats();
  }

  // Check if memory usage is acceptable
  isMemoryUsageAcceptable() {
    return memoryOptimizationService.isMemoryUsageAcceptable();
  }

  // Force cleanup of all monitored components
  forceCleanup() {
    console.log('[MemoryManager] Forcing cleanup of all monitored components');
    
    this.componentRefs.forEach((componentName, component) => {
      this.cleanupComponent(component, componentName);
    });
  }

  // Get list of monitored components
  getMonitoredComponents() {
    return Array.from(this.monitoredComponents);
  }

  // Clear all tracked resources for a component
  clearComponentResources(componentRef) {
    if (!componentRef || !componentRef.current) return;

    const component = componentRef.current;
    
    // Clear timeouts
    if (component._timeouts) {
      component._timeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
        clearInterval(timeoutId);
      });
      component._timeouts = [];
    }

    // Clear event listeners
    if (component._eventListeners) {
      component._eventListeners.forEach(({ element, event, handler }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, handler);
        }
      });
      component._eventListeners = [];
    }

    // Clear cleanup callbacks
    if (component._cleanupCallbacks) {
      component._cleanupCallbacks = [];
    }
  }
}

// Create singleton instance
const memoryManager = new MemoryManager();

// React Hook for memory management
export const useMemoryManagement = (componentRef, componentName) => {
  React.useEffect(() => {
    if (componentRef && componentRef.current) {
      memoryManager.registerComponent(componentRef, componentName);
      
      return () => {
        memoryManager.unregisterComponent(componentRef);
      };
    }
  }, [componentRef, componentName]);

  return {
    addCleanupCallback: (callback) => memoryManager.addCleanupCallback(componentRef, callback),
    addTrackedTimeout: (timeoutId) => memoryManager.addTrackedTimeout(componentRef, timeoutId),
    addTrackedEventListener: (element, event, handler) => 
      memoryManager.addTrackedEventListener(componentRef, element, event, handler),
    optimizeImageLoading: (imageElement) => memoryManager.optimizeImageLoading(componentRef, imageElement),
    clearResources: () => memoryManager.clearComponentResources(componentRef),
    monitorOperation: (name, operation) => memoryManager.monitorOperation(name, operation),
    getMemoryStats: () => memoryManager.getMemoryStats(),
    isMemoryUsageAcceptable: () => memoryManager.isMemoryUsageAcceptable()
  };
};

// Utility functions for common memory optimization patterns
export const memoryUtils = {
  // Debounced function with memory cleanup
  debounce: (func, wait, componentRef) => {
    let timeoutId;
    const debounced = (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), wait);
      
      if (componentRef) {
        memoryManager.addTrackedTimeout(componentRef, timeoutId);
      }
    };
    
    return debounced;
  },

  // Throttled function with memory cleanup
  throttle: (func, limit, componentRef) => {
    let inThrottle;
    const throttled = (...args) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
    
    return throttled;
  },

  // Safe event listener with automatic cleanup
  addSafeEventListener: (element, event, handler, componentRef) => {
    if (element && element.addEventListener) {
      element.addEventListener(event, handler);
      if (componentRef) {
        memoryManager.addTrackedEventListener(componentRef, element, event, handler);
      }
    }
  },

  // Safe timeout with automatic cleanup
  setSafeTimeout: (callback, delay, componentRef) => {
    const timeoutId = setTimeout(callback, delay);
    if (componentRef) {
      memoryManager.addTrackedTimeout(componentRef, timeoutId);
    }
    return timeoutId;
  },

  // Safe interval with automatic cleanup
  setSafeInterval: (callback, delay, componentRef) => {
    const intervalId = setInterval(callback, delay);
    if (componentRef) {
      memoryManager.addTrackedTimeout(componentRef, intervalId);
    }
    return intervalId;
  },

  // Optimize image loading
  optimizeImage: (imageElement, componentRef) => {
    memoryManager.optimizeImageLoading(componentRef, imageElement);
  }
};

export default memoryManager; 