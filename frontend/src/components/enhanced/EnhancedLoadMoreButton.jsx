import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * Advanced Load More Button with:
 * - Smart infinite scroll detection & auto-load
 * - Intersection Observer for lazy triggering
 * - Network-aware loading strategies
 * - Analytics tracking & performance metrics
 * - Advanced error handling & retry logic
 * - Keyboard navigation & accessibility
 * - Haptic feedback (mobile)
 * - Skeleton preview
 * - Multiple loading strategies (click, auto, hybrid)
 */

// Custom hook for intersection observer (auto-load on scroll)
const useIntersectionObserver = (callback, enabled = false, options = {}) => {
  const targetRef = useRef(null);
  
  useEffect(() => {
    if (!enabled || !targetRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options
      }
    );
    
    observer.observe(targetRef.current);
    
    return () => {
      if (targetRef.current) {
        observer.unobserve(targetRef.current);
      }
    };
  }, [enabled, callback, options]);
  
  return targetRef;
};

// Network speed detection
const useNetworkSpeed = () => {
  const [speed, setSpeed] = useState('fast');
  
  useEffect(() => {
    // Check if navigator.connection is available
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return;
    }
    
    const connection = navigator.connection;
    
    const updateSpeed = () => {
      if (!navigator.onLine) {
        setSpeed('offline');
      } else {
        const effectiveType = connection.effectiveType;
        if (effectiveType === '4g') {
          setSpeed('fast');
        } else if (effectiveType === '3g') {
          setSpeed('medium');
        } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
          setSpeed('slow');
        } else {
          setSpeed('fast'); // default to fast for unknown types
        }
      }
    };
    
    updateSpeed();
    
    // Add event listeners
    connection.addEventListener('change', updateSpeed);
    window.addEventListener('online', updateSpeed);
    window.addEventListener('offline', updateSpeed);
    
    // Cleanup function
    return () => {
      connection.removeEventListener('change', updateSpeed);
      window.removeEventListener('online', updateSpeed);
      window.removeEventListener('offline', updateSpeed);
    };
  }, []);
  
  return speed;
};

// Retry logic hook
const useRetry = (maxRetries = 3) => {
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState(null);
  
  const retry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setError(null);
      return true;
    }
    return false;
  }, [retryCount, maxRetries]);
  
  const reset = useCallback(() => {
    setRetryCount(0);
    setError(null);
  }, []);
  
  return { retryCount, error, setError, retry, reset, canRetry: retryCount < maxRetries };
};

// Enhanced Load More Button Component with Smart Loading
const EnhancedLoadMoreButton = React.memo(({ 
  onClick, 
  hasMore, 
  isLoading, 
  totalItems, 
  displayedItems,
  loadingText = "Loading more...",
  buttonText = "Load More",
  itemName = "items",
  className = "",
  showProgress = true,
  showCount = true,
  disabled = false,
  size = "medium", // "small", "medium", "large"
  variant = "default", // "default", "primary", "secondary", "minimal", "gradient"
  loadingStrategy = "click", // "click", "auto", "hybrid"
  autoLoadThreshold = 0.5, // When to auto-load (0-1)
  enableRetry = true,
  maxRetries = 3,
  trackAnalytics = false,
  showSkeleton = false,
  estimatedItemHeight = 200, // For skeleton preview
  itemsPerLoad = 10,
  enableHaptic = true, // Mobile haptic feedback
  showNetworkStatus = false,
  adaptiveLoading = true, // Adapt to network speed
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [loadStartTime, setLoadStartTime] = useState(null);
  const prefersReducedMotion = false; // Force animations on all devices including mobile
  const networkSpeed = adaptiveLoading ? useNetworkSpeed() : 'fast';
  const { retryCount, error, setError, retry, reset, canRetry } = useRetry(maxRetries);
  
  // Auto-load with intersection observer
  const shouldAutoLoad = useMemo(() => {
    return (loadingStrategy === 'auto' || loadingStrategy === 'hybrid') && 
           hasMore && 
           !isLoading && 
           !error;
  }, [loadingStrategy, hasMore, isLoading, error]);
  
  const handleAutoLoad = useCallback(() => {
    if (shouldAutoLoad && onClick) {
      // Add slight delay to prevent rapid firing
      setTimeout(() => {
        if (!isLoading) {
          onClick();
        }
      }, 300);
    }
  }, [shouldAutoLoad, onClick, isLoading]);
  
  const targetRef = useIntersectionObserver(
    handleAutoLoad,
    shouldAutoLoad,
    { threshold: autoLoadThreshold }
  );
  
  // Track loading time for analytics
  useEffect(() => {
    if (isLoading) {
      setLoadStartTime(Date.now());
    } else if (loadStartTime && trackAnalytics) {
      const loadTime = Date.now() - loadStartTime;
      // Send analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'load_more_time', {
          event_category: 'Performance',
          event_label: itemName,
          value: loadTime,
          network_speed: networkSpeed,
          retry_count: retryCount
        });
      }
      setLoadStartTime(null);
    }
  }, [isLoading, loadStartTime, trackAnalytics, itemName, networkSpeed, retryCount]);
  
  // Reset retry on success
  useEffect(() => {
    if (!isLoading && !error) {
      reset();
    }
  }, [isLoading, error, reset]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (totalItems === 0) return 0;
    return Math.min(100, (displayedItems / totalItems) * 100);
  }, [displayedItems, totalItems]);
  
  // Calculate remaining items
  const remainingItems = useMemo(() => {
    return Math.max(0, totalItems - displayedItems);
  }, [totalItems, displayedItems]);
  
  // Adaptive batch size based on network
  const adaptiveBatchSize = useMemo(() => {
    if (!adaptiveLoading) return itemsPerLoad;
    
    const speedMultiplier = {
      fast: 1,
      medium: 0.7,
      slow: 0.5,
      offline: 0
    };
    
    return Math.max(1, Math.floor(itemsPerLoad * (speedMultiplier[networkSpeed] || 1)));
  }, [adaptiveLoading, itemsPerLoad, networkSpeed]);

  // Size variants
  const sizeClasses = useMemo(() => {
    switch (size) {
      case "small":
        return {
          button: "px-4 py-2 text-sm",
          icon: "w-4 h-4",
          badge: "px-1.5 py-0.5 text-xs",
          progress: "h-1.5"
        };
      case "large":
        return {
          button: "px-8 py-4 text-base",
          icon: "w-6 h-6",
          badge: "px-3 py-1.5 text-sm",
          progress: "h-3"
        };
      default: // medium
        return {
          button: "px-6 py-3 text-sm",
          icon: "w-5 h-5",
          badge: "px-2 py-1 text-xs",
          progress: "h-2"
        };
    }
  }, [size]);

  // Variant styles
  const variantClasses = useMemo(() => {
    switch (variant) {
      case "primary":
        return {
          button: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-blue-400/30 hover:border-blue-400/50 shadow-blue-500/20",
          progress: "bg-gradient-to-r from-blue-500 to-blue-600",
          badge: "bg-blue-400/30 text-white border-blue-400/50",
          skeleton: "bg-blue-500/10"
        };
      case "secondary":
        return {
          button: "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white border-gray-500/30 hover:border-gray-500/50 shadow-gray-500/20",
          progress: "bg-gradient-to-r from-gray-500 to-gray-600",
          badge: "bg-gray-400/30 text-white border-gray-400/50",
          skeleton: "bg-gray-500/10"
        };
      case "minimal":
        return {
          button: "bg-transparent hover:bg-white/5 text-white/80 border-white/10 hover:border-white/20 shadow-none",
          progress: "bg-white/30",
          badge: "bg-white/10 text-white/70 border-white/20",
          skeleton: "bg-white/5"
        };
      case "gradient":
        return {
          button: "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:via-pink-500 hover:to-red-500 text-white border-transparent shadow-purple-500/30",
          progress: "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500",
          badge: "bg-white/20 text-white border-white/30",
          skeleton: "bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10"
        };
      default:
        return {
          button: "bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white/90 border-white/20 hover:border-white/30 shadow-white/5",
          progress: "bg-gradient-to-r from-blue-500 to-blue-600",
          badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          skeleton: "bg-white/5"
        };
    }
  }, [variant]);

  // Enhanced animation variants with reduced motion support
  const buttonVariants = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        initial: { scale: 1, y: 0 },
        hover: { scale: 1, y: 0 },
        pressed: { scale: 1, y: 0 }
      };
    }
    
    return {
      initial: { scale: 1, y: 0 },
      hover: { 
        scale: 1.02, 
        y: -2,
        transition: { 
          type: "spring", 
          stiffness: 400, 
          damping: 25 
        }
      },
      pressed: { 
        scale: 0.98, 
        y: 0,
        transition: { 
          type: "spring", 
          stiffness: 400, 
          damping: 25 
        }
      },
      error: {
        x: [-10, 10, -10, 10, 0],
        transition: { duration: 0.4 }
      }
    };
  }, [prefersReducedMotion]);

  const iconVariants = useMemo(() => ({
    initial: { y: 0, rotate: 0 },
    hover: { 
      y: [0, 2, 0], 
      rotate: 0,
      transition: { 
        duration: 1.5, 
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    loading: { 
      rotate: 360,
      transition: { 
        duration: 1, 
        repeat: Infinity,
        ease: "linear"
      }
    }
  }), []);

  const progressVariants = useMemo(() => ({
    initial: { width: 0 },
    animate: { 
      width: `${progressPercentage}%`,
      transition: { 
        duration: 0.5, 
        ease: "easeOut" 
      }
    }
  }), [progressPercentage]);

  const handleClick = useCallback(async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!isLoading && !disabled && hasMore && onClick) {
      // Haptic feedback for mobile
      if (enableHaptic && window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
      
      try {
        await onClick();
        reset(); // Reset retry count on success
      } catch (err) {
        setError(err);
        console.error('Load more failed:', err);
      }
    }
  }, [isLoading, disabled, hasMore, onClick, enableHaptic, reset, setError]);
  
  const handleRetry = useCallback(() => {
    if (canRetry) {
      retry();
      handleClick();
    }
  }, [canRetry, retry, handleClick]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled && !isLoading) {
      setIsHovered(true);
    }
  }, [disabled, isLoading]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!disabled && !isLoading) {
      setIsPressed(true);
    }
  }, [disabled, isLoading]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);
  
  // Keyboard navigation support
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  }, [handleClick]);

  if (!hasMore) {
    return null;
  }
  
  // Error state
  if (error && enableRetry) {
    return (
      <motion.div 
        className={`flex flex-col items-center gap-3 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, ...buttonVariants.error }}
      >
        <div className="text-center">
          <div className="text-red-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-white/80 mb-1">Failed to load more {itemName}</p>
          <p className="text-xs text-white/50 mb-3">
            {canRetry ? `Retry ${retryCount}/${maxRetries}` : 'Max retries reached'}
          </p>
          {canRetry && (
            <motion.button
              onClick={handleRetry}
              className={`${sizeClasses.button} ${variantClasses.button} rounded-xl font-medium`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Again
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div ref={targetRef}>
      <motion.div 
        className={`flex flex-col items-center gap-3 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Skeleton Preview */}
        <AnimatePresence>
          {showSkeleton && isLoading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-4"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: Math.min(adaptiveBatchSize, 5) }, (_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-lg overflow-hidden ${variantClasses.skeleton}`}
                    style={{ height: estimatedItemHeight }}
                  >
                    <div className="w-full h-full animate-pulse bg-gradient-to-br from-white/5 to-white/10" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        {showProgress && totalItems > 0 && (
          <motion.div
            className="w-full max-w-xs"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between text-xs text-white/60 mb-2">
              <span className="font-medium">Progress</span>
              <span className="font-mono">{displayedItems} / {totalItems} {itemName}</span>
            </div>
            <div className={`w-full ${sizeClasses.progress} bg-white/10 rounded-full overflow-hidden relative`}>
              <motion.div
                className={`h-full rounded-full ${variantClasses.progress}`}
                variants={progressVariants}
                initial="initial"
                animate="animate"
              />
              {/* Animated shimmer effect */}
              {isLoading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-white/40 mt-1">
              <span>{Math.round(progressPercentage)}%</span>
              <span>{remainingItems} remaining</span>
            </div>
          </motion.div>
        )}

        {/* Enhanced Load More Button */}
        {loadingStrategy !== 'auto' && (
          <motion.button
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onKeyDown={handleKeyDown}
            disabled={isLoading || disabled || networkSpeed === 'offline'}
            className={`
              relative flex items-center gap-3 ${sizeClasses.button}
              ${variantClasses.button}
              disabled:opacity-50 disabled:cursor-not-allowed
              rounded-full font-medium transition-all duration-200
              shadow-lg backdrop-blur-sm border
              ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-neutral-900
            `}
            variants={buttonVariants}
            initial="initial"
            animate={isPressed ? "pressed" : isHovered ? "hover" : "initial"}
            whileHover={!disabled && !isLoading ? "hover" : undefined}
            whileTap={!disabled && !isLoading ? "pressed" : undefined}
            aria-label={isLoading ? loadingText : `${buttonText} - ${remainingItems} more ${itemName}`}
            role="button"
            tabIndex={0}
            {...props}
          >
            {/* Loading Spinner or Arrow Icon */}
            <motion.div
              variants={iconVariants}
              initial="initial"
              animate={isLoading ? "loading" : isHovered ? "hover" : "initial"}
              className="flex-shrink-0 -ml-2"
            >
              {isLoading ? (
                <svg className={`${sizeClasses.icon} scale-90`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className={`${sizeClasses.icon} transition-transform duration-200 scale-90`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
            </motion.div>

            {/* Button Text */}
            <span className="font-medium flex-1 text-center">
              {isLoading ? loadingText : buttonText}
            </span>

            {/* Item Count Badge */}
            <AnimatePresence>
              {showCount && !isLoading && remainingItems > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                  className={`${sizeClasses.badge} ${variantClasses.badge} h-9 w-9 -my-1 flex items-center justify-center font-bold -mr-4 rounded-full border flex-shrink-0`}
                >
                  +{Math.min(adaptiveBatchSize, remainingItems)}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ripple Effect */}
            <AnimatePresence>
              {isPressed && (
                <motion.div
                  className="absolute inset-0 rounded-xl bg-white/10"
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </AnimatePresence>
          </motion.button>
        )}

        {/* Network Status */}
        <AnimatePresence>
          {showNetworkStatus && networkSpeed !== 'fast' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
            >
              {networkSpeed === 'offline' ? (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400">Offline</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-yellow-400">{networkSpeed} connection</span>
                  <span className="text-white/50">• Loading {adaptiveBatchSize} at a time</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Status */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-xs text-white/50"
            >
              <motion.div
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span>Fetching {adaptiveBatchSize} more {itemName}...</span>
              {retryCount > 0 && (
                <span className="text-yellow-400">• Retry {retryCount}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-load indicator */}
        {loadingStrategy === 'auto' && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="text-xs text-white/40 text-center"
          >
            Auto-loading enabled • Scroll for more
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});

EnhancedLoadMoreButton.displayName = 'EnhancedLoadMoreButton';

export default EnhancedLoadMoreButton; 