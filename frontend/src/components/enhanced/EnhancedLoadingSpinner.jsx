import React, { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * Advanced Loading Spinner with:
 * - Smart timeout handling & progressive states
 * - Network-aware adaptive behavior
 * - Performance optimizations & intersection observer
 * - Comprehensive accessibility (ARIA live regions)
 * - Analytics & loading time tracking
 * - Memory management & cleanup
 * - Multiple sophisticated variants
 * - Error boundary integration
 */

// Network speed detection hook
const useNetworkSpeed = () => {
  const [speed, setSpeed] = useState('fast'); // fast, medium, slow, offline
  
  useEffect(() => {
    if (!navigator.connection) return;
    
    const updateSpeed = () => {
      const connection = navigator.connection;
      const effectiveType = connection.effectiveType;
      
      if (!navigator.onLine) {
        setSpeed('offline');
      } else if (effectiveType === '4g') {
        setSpeed('fast');
      } else if (effectiveType === '3g') {
        setSpeed('medium');
      } else {
        setSpeed('slow');
      }
    };
    
    updateSpeed();
    connection.addEventListener('change', updateSpeed);
    window.addEventListener('online', updateSpeed);
    window.addEventListener('offline', updateSpeed);
    
    return () => {
      connection.removeEventListener('change', updateSpeed);
      window.removeEventListener('online', updateSpeed);
      window.removeEventListener('offline', updateSpeed);
    };
  }, []);
  
  return speed;
};

// Loading time tracker hook
const useLoadingTimer = (onTimeout, timeout = 30000, enabled = true) => {
  const [elapsed, setElapsed] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  
  useEffect(() => {
    if (!enabled) return;
    
    startTimeRef.current = Date.now();
    setElapsed(0);
    setIsTimedOut(false);
    
    // Update elapsed time every second
    intervalRef.current = setInterval(() => {
      const newElapsed = Date.now() - startTimeRef.current;
      setElapsed(newElapsed);
    }, 1000);
    
    // Timeout handler
    if (timeout > 0) {
      timerRef.current = setTimeout(() => {
        setIsTimedOut(true);
        if (onTimeout) onTimeout();
      }, timeout);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, timeout, onTimeout]);
  
  return { elapsed, isTimedOut, elapsedSeconds: Math.floor(elapsed / 1000) };
};

// Progressive loading messages
const useProgressiveMessage = (initialMessage, elapsedSeconds) => {
  return useMemo(() => {
    if (elapsedSeconds < 3) return initialMessage;
    if (elapsedSeconds < 8) return 'Still loading...';
    if (elapsedSeconds < 15) return 'Taking longer than expected...';
    if (elapsedSeconds < 25) return 'Almost there...';
    return 'This is taking a while...';
  }, [initialMessage, elapsedSeconds]);
};

const EnhancedLoadingSpinner = memo(({
  size = 'md',
  color = 'primary',
  text = '',
  showText = false,
  className = '',
  variant = 'spinner', // spinner, dots, pulse, bars, ring, orbit, wave, gradient
  timeout = 0, // 0 = no timeout
  onTimeout = null,
  showProgress = false, // Show elapsed time
  progressiveText = false, // Auto-update text based on time
  adaptive = false, // Adapt to network speed
  trackAnalytics = false, // Track loading time
  priority = 'normal', // high, normal, low (affects animation intensity)
  ...props
}) => {
  // Hooks for advanced features
  const networkSpeed = adaptive ? useNetworkSpeed() : 'fast';
  const prefersReducedMotion = useReducedMotion();
  const { elapsed, isTimedOut, elapsedSeconds } = useLoadingTimer(onTimeout, timeout, timeout > 0);
  const progressiveMessage = progressiveText ? useProgressiveMessage(text, elapsedSeconds) : text;
  const mountTimeRef = useRef(Date.now());
  
  // Analytics tracking
  useEffect(() => {
    if (!trackAnalytics) return;
    
    const startTime = Date.now();
    
    return () => {
      const loadTime = Date.now() - startTime;
      // Send analytics event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'loading_time', {
          event_category: 'Performance',
          event_label: variant,
          value: loadTime,
          custom_dimension_network: networkSpeed
        });
      }
    };
  }, [trackAnalytics, variant, networkSpeed]);
  
  // Adaptive sizing based on priority and network
  const sizeMap = useMemo(() => {
    const base = {
      xs: { size: 12, stroke: 2 },
      sm: { size: 16, stroke: 2 },
      md: { size: 20, stroke: 2.5 },
      lg: { size: 28, stroke: 3 },
      xl: { size: 40, stroke: 3.5 }
    };
    
    // Reduce size on slow networks
    if (adaptive && networkSpeed === 'slow') {
      return Object.fromEntries(
        Object.entries(base).map(([key, val]) => [
          key,
          { size: Math.max(val.size * 0.8, 12), stroke: val.stroke }
        ])
      );
    }
    
    return base;
  }, [adaptive, networkSpeed]);

  // Professional, neutral color palette with gradients
  const colorMap = {
    primary: { base: '#3b82f6', gradient: ['#3b82f6', '#6366f1'] },
    secondary: { base: '#9ca3af', gradient: ['#9ca3af', '#6b7280'] },
    white: { base: '#ffffff', gradient: ['#ffffff', '#f3f4f6'] },
    black: { base: '#000000', gradient: ['#000000', '#1f2937'] },
    success: { base: '#10b981', gradient: ['#10b981', '#34d399'] },
    warning: { base: '#f59e0b', gradient: ['#f59e0b', '#fbbf24'] },
    error: { base: '#ef4444', gradient: ['#ef4444', '#f87171'] }
  };
  
  // Animation speed based on priority and network
  const getAnimationSpeed = useCallback(() => {
    if (prefersReducedMotion) return 1.5;
    
    const speedMultiplier = {
      fast: 1,
      medium: 1.2,
      slow: 1.5,
      offline: 2
    };
    
    const priorityMultiplier = {
      high: 0.8,
      normal: 1,
      low: 1.3
    };
    
    return (speedMultiplier[networkSpeed] || 1) * (priorityMultiplier[priority] || 1);
  }, [networkSpeed, priority, prefersReducedMotion]);

  const currentSize = sizeMap[size];
  const currentColor = colorMap[color];
  const animSpeed = getAnimationSpeed();
  
  // Advanced spinner with gradient support
  const SpinnerVariant = () => {
    const gradientId = `spinner-gradient-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <svg
        width={currentSize.size}
        height={currentSize.size}
        viewBox="0 0 50 50"
        role="status"
        aria-label="Loading"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={currentColor.gradient[0]} />
            <stop offset="100%" stopColor={currentColor.gradient[1]} />
          </linearGradient>
        </defs>
        <motion.circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={currentSize.stroke}
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.8 * animSpeed,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </svg>
    );
  };

  // Advanced dots with stagger
  const DotsVariant = () => {
    const dotCount = priority === 'low' ? 3 : priority === 'high' ? 5 : 4;
    
    return (
      <div className="flex gap-1.5" role="status" aria-label="Loading">
        {Array.from({ length: dotCount }, (_, i) => (
          <motion.div
            key={i}
            style={{
              width: currentSize.size * 0.25,
              height: currentSize.size * 0.25,
              backgroundColor: currentColor.base
            }}
            className="rounded-full"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 1.2 * animSpeed,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    );
  };

  // Advanced pulse with ring effect
  const PulseVariant = () => (
    <div className="relative" style={{ width: currentSize.size, height: currentSize.size }}>
      <motion.div
        style={{
          width: currentSize.size,
          height: currentSize.size,
          backgroundColor: currentColor.base
        }}
        className="absolute inset-0 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6]
        }}
        transition={{
          duration: 1.5 * animSpeed,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        role="status"
        aria-label="Loading"
      />
      <motion.div
        style={{
          width: currentSize.size,
          height: currentSize.size,
          borderColor: currentColor.base,
          borderWidth: currentSize.stroke
        }}
        className="absolute inset-0 rounded-full border"
        animate={{
          scale: [1, 1.5, 1.8],
          opacity: [0.8, 0.4, 0]
        }}
        transition={{
          duration: 1.5 * animSpeed,
          repeat: Infinity,
          ease: "easeOut"
        }}
      />
    </div>
  );

  // Advanced bars with wave effect
  const BarsVariant = () => {
    const barCount = 5;
    const barWidth = currentSize.size * 0.15;
    
    return (
      <div className="flex gap-1 items-end" role="status" aria-label="Loading">
        {Array.from({ length: barCount }, (_, i) => (
          <motion.div
            key={i}
            style={{
              width: barWidth,
              backgroundColor: currentColor.base,
              height: currentSize.size
            }}
            className="rounded-full origin-bottom"
            animate={{
              scaleY: [0.4, 1, 0.4],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1 * animSpeed,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    );
  };

  // New: Ring variant with dual rotation
  const RingVariant = () => {
    const gradientId = `ring-gradient-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <svg
        width={currentSize.size}
        height={currentSize.size}
        viewBox="0 0 50 50"
        role="status"
        aria-label="Loading"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={currentColor.gradient[0]} stopOpacity="0.2" />
            <stop offset="100%" stopColor={currentColor.gradient[1]} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={currentColor.base}
          strokeWidth={currentSize.stroke}
          opacity="0.2"
        />
        <motion.circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={currentSize.stroke}
          strokeLinecap="round"
          strokeDasharray="90 150"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2 * animSpeed,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </svg>
    );
  };

  // New: Orbit variant with planets
  const OrbitVariant = () => (
    <div
      className="relative"
      style={{ width: currentSize.size, height: currentSize.size }}
      role="status"
      aria-label="Loading"
    >
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{
          duration: 2 * animSpeed,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div
          style={{
            width: currentSize.size * 0.2,
            height: currentSize.size * 0.2,
            backgroundColor: currentColor.base
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
        />
      </motion.div>
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -360 }}
        transition={{
          duration: 1.5 * animSpeed,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div
          style={{
            width: currentSize.size * 0.15,
            height: currentSize.size * 0.15,
            backgroundColor: currentColor.base,
            opacity: 0.6
          }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
        />
      </motion.div>
    </div>
  );

  // New: Wave variant
  const WaveVariant = () => {
    const waveCount = 8;
    
    return (
      <div className="flex items-center gap-0.5" role="status" aria-label="Loading">
        {Array.from({ length: waveCount }, (_, i) => {
          const phase = (i / waveCount) * Math.PI * 2;
          return (
            <motion.div
              key={i}
              style={{
                width: currentSize.size * 0.1,
                height: currentSize.size,
                backgroundColor: currentColor.base
              }}
              className="rounded-full"
              animate={{
                scaleY: [0.3, 1, 0.3],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.2 * animSpeed,
                repeat: Infinity,
                delay: i * 0.08,
                ease: "easeInOut"
              }}
            />
          );
        })}
      </div>
    );
  };

  // New: Gradient variant with morphing
  const GradientVariant = () => {
    const gradientId = `morph-gradient-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <svg
        width={currentSize.size}
        height={currentSize.size}
        viewBox="0 0 50 50"
        role="status"
        aria-label="Loading"
      >
        <defs>
          <linearGradient id={gradientId}>
            <motion.stop
              offset="0%"
              stopColor={currentColor.gradient[0]}
              animate={{ stopColor: currentColor.gradient }}
              transition={{
                duration: 2 * animSpeed,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
            <motion.stop
              offset="100%"
              stopColor={currentColor.gradient[1]}
              animate={{ stopColor: currentColor.gradient.slice().reverse() }}
              transition={{
                duration: 2 * animSpeed,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          </linearGradient>
        </defs>
        <motion.path
          d="M25,5 Q35,15 35,25 Q35,35 25,45 Q15,35 15,25 Q15,15 25,5 Z"
          fill={`url(#${gradientId})`}
          animate={{
            d: [
              "M25,5 Q35,15 35,25 Q35,35 25,45 Q15,35 15,25 Q15,15 25,5 Z",
              "M25,10 Q40,20 40,25 Q40,30 25,40 Q10,30 10,25 Q10,20 25,10 Z",
              "M25,5 Q35,15 35,25 Q35,35 25,45 Q15,35 15,25 Q15,15 25,5 Z"
            ]
          }}
          transition={{
            duration: 2 * animSpeed,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    );
  };

  // Choose variant
  const getVariant = () => {
    const variants = {
      dots: DotsVariant,
      pulse: PulseVariant,
      bars: BarsVariant,
      ring: RingVariant,
      orbit: OrbitVariant,
      wave: WaveVariant,
      gradient: GradientVariant,
      spinner: SpinnerVariant
    };
    
    const VariantComponent = variants[variant] || SpinnerVariant;
    return <VariantComponent />;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      role="alert"
      aria-busy="true"
      aria-live="polite"
      {...props}
    >
      <AnimatePresence mode="wait">
        {isTimedOut ? (
          <motion.div
            key="timeout"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center"
          >
            <div className="text-yellow-400 mb-2">
              <svg
                width={currentSize.size}
                height={currentSize.size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Taking longer than expected</p>
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center justify-center">
              {getVariant()}
            </div>
            
            {showText && (progressiveMessage || text) && (
              <motion.div
                className="mt-3 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm text-gray-400 font-medium tracking-wide">
                  {progressiveMessage || text}
                </p>
                
                {showProgress && elapsedSeconds > 2 && (
                  <motion.p
                    className="text-xs text-gray-500 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {elapsedSeconds}s elapsed
                  </motion.p>
                )}
                
                {adaptive && networkSpeed !== 'fast' && (
                  <motion.p
                    className="text-xs text-gray-500 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {networkSpeed === 'offline' ? '⚠️ Offline' : `📶 ${networkSpeed} connection`}
                  </motion.p>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Advanced full-page loader with blur backdrop
export const PageLoader = memo(({ 
  text = 'Loading…',
  size = 'lg',
  variant = 'ring',
  showProgress = true,
  progressiveText = true,
  adaptive = true,
  timeout = 30000,
  className = '',
  backdrop = true,
  blurIntensity = 'md' // sm, md, lg
}) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Prevent body scroll when loader is visible
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  const blurMap = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg'
  };
  
  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`
            fixed inset-0 z-50 flex items-center justify-center
            ${backdrop ? `bg-neutral-950/80 ${blurMap[blurIntensity]}` : 'bg-neutral-950'}
            ${className}
          `}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
          >
            <EnhancedLoadingSpinner
              size={size}
              variant={variant}
              text={text}
              showText={true}
              color="white"
              showProgress={showProgress}
              progressiveText={progressiveText}
              adaptive={adaptive}
              timeout={timeout}
              priority="high"
              trackAnalytics={true}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// Advanced section loader with intersection observer
export const SectionLoader = memo(({ 
  text = 'Loading…',
  size = 'md',
  variant = 'dots',
  showProgress = false,
  adaptive = true,
  timeout = 15000,
  className = '',
  lazy = true, // Only animate when in viewport
  minHeight = '200px'
}) => {
  const [isVisible, setIsVisible] = useState(!lazy);
  const ref = useRef(null);
  
  useEffect(() => {
    if (!lazy || !ref.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    
    observer.observe(ref.current);
    
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [lazy]);
  
  return (
    <div
      ref={ref}
      className={`flex items-center justify-center ${className}`}
      style={{ minHeight }}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <EnhancedLoadingSpinner
              size={size}
              variant={variant}
              text={text}
              showText={!!text}
              color="primary"
              showProgress={showProgress}
              adaptive={adaptive}
              timeout={timeout}
              priority="normal"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Advanced card loader with smart skeleton and shimmer effect
export const CardLoader = memo(({ 
  className = '',
  count = 1,
  variant = 'media', // media, list, grid
  animate = true,
  shimmer = true
}) => {
  const cards = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  
  const shimmerClass = shimmer
    ? 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent'
    : '';
  
  const MediaCard = ({ index }) => (
    <motion.div
      className="bg-neutral-900 rounded-lg overflow-hidden"
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={animate ? { delay: index * 0.05, duration: 0.4 } : false}
    >
      <div className={`aspect-[2/3] bg-neutral-800 ${shimmerClass}`} />
      <div className="p-3 space-y-2">
        <div className={`h-4 bg-neutral-800 rounded w-3/4 ${shimmerClass}`} />
        <div className={`h-3 bg-neutral-800 rounded w-1/2 ${shimmerClass}`} />
        <div className="flex gap-1.5 pt-1">
          <div className={`h-5 bg-neutral-800 rounded-full w-12 ${shimmerClass}`} />
          <div className={`h-5 bg-neutral-800 rounded-full w-16 ${shimmerClass}`} />
        </div>
      </div>
    </motion.div>
  );
  
  const ListCard = ({ index }) => (
    <motion.div
      className="bg-neutral-900 rounded-lg p-4 flex gap-4"
      initial={animate ? { opacity: 0, x: -20 } : false}
      animate={animate ? { opacity: 1, x: 0 } : false}
      transition={animate ? { delay: index * 0.05, duration: 0.3 } : false}
    >
      <div className={`w-16 h-16 bg-neutral-800 rounded-lg flex-shrink-0 ${shimmerClass}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-4 bg-neutral-800 rounded w-3/4 ${shimmerClass}`} />
        <div className={`h-3 bg-neutral-800 rounded w-1/2 ${shimmerClass}`} />
        <div className={`h-3 bg-neutral-800 rounded w-2/3 ${shimmerClass}`} />
      </div>
    </motion.div>
  );
  
  const GridCard = ({ index }) => (
    <motion.div
      className="bg-neutral-900 rounded-lg overflow-hidden"
      initial={animate ? { opacity: 0, scale: 0.9 } : false}
      animate={animate ? { opacity: 1, scale: 1 } : false}
      transition={animate ? { delay: index * 0.05, type: "spring", stiffness: 200, damping: 20 } : false}
    >
      <div className={`aspect-square bg-neutral-800 ${shimmerClass}`} />
      <div className="p-3 space-y-2">
        <div className={`h-3 bg-neutral-800 rounded w-4/5 ${shimmerClass}`} />
        <div className={`h-3 bg-neutral-800 rounded w-2/3 ${shimmerClass}`} />
      </div>
    </motion.div>
  );
  
  const variantMap = {
    media: { Component: MediaCard, gridClass: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' },
    list: { Component: ListCard, gridClass: 'grid-cols-1' },
    grid: { Component: GridCard, gridClass: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' }
  };
  
  const { Component, gridClass } = variantMap[variant] || variantMap.media;
  
  return (
    <div className={`grid ${gridClass} gap-4 ${className}`}>
      {cards.map((i) => (
        <Component key={i} index={i} />
      ))}
    </div>
  );
});

// Advanced skeleton with pulse and shimmer effects
export const Skeleton = memo(({ 
  className = '',
  variant = 'text', // text, avatar, button, card, image, custom
  lines = 1,
  width = 'full', // full, 3/4, 1/2, 1/3, 1/4, custom
  height = 'auto',
  animate = true,
  shimmer = true,
  rounded = 'default', // none, sm, default, md, lg, full
  ...props
}) => {
  const widthMap = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
    custom: ''
  };
  
  const roundedMap = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    default: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };
  
  const baseClass = `bg-neutral-800 ${roundedMap[rounded]}`;
  const animateClass = animate ? 'animate-pulse' : '';
  const shimmerClass = shimmer && !animate
    ? 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent'
    : '';
  
  const variants = {
    text: (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <motion.div
            key={i}
            className={`
              h-4 ${baseClass} ${animateClass} ${shimmerClass}
              ${i === lines - 1 ? widthMap['3/4'] : widthMap.full}
            `}
            initial={animate ? { opacity: 0, x: -10 } : false}
            animate={animate ? { opacity: 1, x: 0 } : false}
            transition={animate ? { delay: i * 0.05 } : false}
          />
        ))}
      </div>
    ),
    avatar: (
      <motion.div
        className={`w-12 h-12 ${baseClass} ${animateClass} ${shimmerClass} rounded-full`}
        initial={animate ? { opacity: 0, scale: 0.8 } : false}
        animate={animate ? { opacity: 1, scale: 1 } : false}
      />
    ),
    button: (
      <motion.div
        className={`h-10 ${baseClass} ${animateClass} ${shimmerClass} rounded-lg ${widthMap.full} max-w-[120px]`}
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={animate ? { opacity: 1, y: 0 } : false}
      />
    ),
    card: (
      <motion.div
        className={`bg-neutral-900 rounded-lg p-4 space-y-3 ${animateClass}`}
        initial={animate ? { opacity: 0, y: 20 } : false}
        animate={animate ? { opacity: 1, y: 0 } : false}
      >
        <div className={`h-4 ${baseClass} ${shimmerClass} ${widthMap['3/4']}`} />
        <div className={`h-3 ${baseClass} ${shimmerClass} ${widthMap['1/2']}`} />
        <div className={`h-3 ${baseClass} ${shimmerClass} w-2/3`} />
        <div className="flex gap-2 pt-2">
          <div className={`h-8 w-8 ${baseClass} ${shimmerClass} rounded-full`} />
          <div className="flex-1 space-y-2">
            <div className={`h-3 ${baseClass} ${shimmerClass} ${widthMap.full}`} />
            <div className={`h-2 ${baseClass} ${shimmerClass} ${widthMap['3/4']}`} />
          </div>
        </div>
      </motion.div>
    ),
    image: (
      <motion.div
        className={`aspect-video ${baseClass} ${animateClass} ${shimmerClass}`}
        initial={animate ? { opacity: 0 } : false}
        animate={animate ? { opacity: 1 } : false}
      />
    ),
    custom: (
      <div
        className={`${baseClass} ${animateClass} ${shimmerClass} ${widthMap[width]}`}
        style={{ height }}
      />
    )
  };

  return (
    <div className={className} {...props}>
      {variants[variant] || variants.text}
    </div>
  );
});

// New: Progress bar loader
export const ProgressLoader = memo(({
  progress = 0, // 0-100
  showPercentage = true,
  color = 'primary',
  size = 'md', // sm, md, lg
  animate = true,
  className = ''
}) => {
  const colorMap = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };
  
  const sizeMap = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${sizeMap[size]} bg-neutral-800 rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full ${colorMap[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={animate ? { duration: 0.5, ease: "easeOut" } : { duration: 0 }}
        />
      </div>
      {showPercentage && (
        <motion.p
          className="text-xs text-gray-400 mt-1 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Math.round(progress)}%
        </motion.p>
      )}
    </div>
  );
});

// New: Suspense-like loader with fallback
export const SuspenseLoader = memo(({
  isLoading,
  children,
  fallback = <EnhancedLoadingSpinner />,
  delay = 300, // Delay before showing loader (prevents flash)
  minDuration = 500, // Minimum display time for loader
  className = ''
}) => {
  const [showLoader, setShowLoader] = useState(false);
  const [showContent, setShowContent] = useState(!isLoading);
  const loaderShownAtRef = useRef(null);
  
  useEffect(() => {
    let delayTimer;
    let minDurationTimer;
    
    if (isLoading) {
      // Delay showing loader to prevent flash
      delayTimer = setTimeout(() => {
        setShowLoader(true);
        loaderShownAtRef.current = Date.now();
      }, delay);
      setShowContent(false);
    } else {
      // Ensure loader shows for minimum duration
      if (loaderShownAtRef.current) {
        const elapsed = Date.now() - loaderShownAtRef.current;
        const remaining = Math.max(0, minDuration - elapsed);
        
        minDurationTimer = setTimeout(() => {
          setShowLoader(false);
          setShowContent(true);
          loaderShownAtRef.current = null;
        }, remaining);
      } else {
        setShowLoader(false);
        setShowContent(true);
      }
    }
    
    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (minDurationTimer) clearTimeout(minDurationTimer);
    };
  }, [isLoading, delay, minDuration]);
  
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {showLoader && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {fallback}
          </motion.div>
        )}
        {showContent && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Display names for debugging
EnhancedLoadingSpinner.displayName = 'EnhancedLoadingSpinner';
PageLoader.displayName = 'PageLoader';
SectionLoader.displayName = 'SectionLoader';
CardLoader.displayName = 'CardLoader';
Skeleton.displayName = 'Skeleton';
ProgressLoader.displayName = 'ProgressLoader';
SuspenseLoader.displayName = 'SuspenseLoader';

// Add shimmer animation to global styles (inject if not exists)
if (typeof document !== 'undefined') {
  const styleId = 'enhanced-spinner-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }
}

export default EnhancedLoadingSpinner;