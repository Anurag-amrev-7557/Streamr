import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * @typedef {Object} LoaderProps
 * @property {('tiny'|'small'|'default'|'large'|'xlarge'|'2xl')} [size='default'] - Size of the loader
 * @property {('white'|'blue'|'purple'|'green'|'red'|'yellow'|'pink'|'indigo'|'rainbow')} [color='white'] - Color of the loader
 * @property {boolean} [showProgress=false] - Whether to show progress percentage
 * @property {number} [progress=0] - Progress percentage (0-100)
 * @property {string} [text] - Loading text to display
 * @property {string} [className=''] - Additional CSS classes
 * @property {('default'|'circular'|'dots'|'pulse'|'bars')} [variant='default'] - Loader variant
 * @property {number} [speed=1] - Animation speed multiplier
 * @property {boolean} [glass=false] - Show frosted glass effect background
 * @property {string} [ariaLabel='Loading...'] - Visually hidden label for accessibility
 * @property {boolean} [animate=true] - Enable/disable animations
 * @property {Function} [onComplete] - Callback when progress reaches 100%
 */

/**
 * Performance monitoring hook for loader
 */
const useLoaderPerformance = (enabled = false) => {
  const startTimeRef = useRef(null);
  const frameCountRef = useRef(0);
  const fpsRef = useRef(60);

  useEffect(() => {
    if (!enabled) return;

    startTimeRef.current = performance.now();
    let animationFrameId;

    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - startTimeRef.current;

      if (elapsed >= 1000) {
        fpsRef.current = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        startTimeRef.current = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled]);

  return fpsRef.current;
};

/**
 * Base Loader Component (Memoized for Performance)
 * 
 * Usage Examples:
 * 1. Button Loading State:
 *    <button disabled>
 *      <Loader size="small" color="blue" />
 *      Loading...
 *    </button>
 * 
 * 2. Inline Content Loading:
 *    <div className="flex items-center gap-2">
 *      <Loader size="tiny" variant="dots" />
 *      <span>Loading data...</span>
 *    </div>
 * 
 * 3. Progress Indicator:
 *    <Loader 
 *      size="large" 
 *      showProgress 
 *      progress={75} 
 *      variant="circular" 
 *      onComplete={() => console.log('Loading complete!')}
 *    />
 */
const Loader = memo(({ 
  size = 'default', 
  color = 'white',
  showProgress = false,
  progress = 0,
  text,
  className = '',
  variant = 'default',
  speed = 1,
  glass = false,
  ariaLabel = 'Loading...',
  animate = true,
  onComplete
}) => {
  // Advanced: Track previous progress for smooth transitions
  const prevProgressRef = useRef(progress);
  const [smoothProgress, setSmoothProgress] = useState(progress);
  const animationFrameRef = useRef(null);

  // Advanced: Smooth progress animation with easing
  useEffect(() => {
    if (!showProgress) return;

    const startProgress = prevProgressRef.current;
    const endProgress = Math.max(0, Math.min(100, progress));
    const startTime = performance.now();
    const duration = 300; // ms

    const animateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic function for smooth deceleration
      const easeOutCubic = 1 - Math.pow(1 - progressRatio, 3);
      const currentProgress = startProgress + (endProgress - startProgress) * easeOutCubic;
      
      setSmoothProgress(currentProgress);

      if (progressRatio < 1) {
        animationFrameRef.current = requestAnimationFrame(animateProgress);
      } else {
        prevProgressRef.current = endProgress;
        
        // Trigger onComplete callback when reaching 100%
        if (endProgress >= 100 && onComplete) {
          onComplete();
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [progress, showProgress, onComplete]);

  // Memoized size classes
  const sizeClasses = useMemo(() => ({
    tiny: 'w-4 h-4',
    small: 'w-6 h-6',
    default: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24',
    '2xl': 'w-32 h-32'
  }), []);

  // Memoized color classes
  const colorClasses = useMemo(() => ({
    white: 'border-white',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    pink: 'border-pink-500',
    indigo: 'border-indigo-500',
    rainbow: '' // handled separately
  }), []);

  // Memoized helper functions
  const getColorOpacity = useCallback((opacity) => 
    color === 'rainbow' ? '' : `${colorClasses[color]}/${opacity}`,
    [color, colorClasses]
  );

  const animationSpeed = useMemo(() => `${2 / speed}s`, [speed]);

  // Rainbow animated gradient (memoized)
  const rainbowGradient = useMemo(() =>
    'conic-gradient(from 0deg, #60a5fa, #a78bfa, #f472b6, #facc15, #4ade80, #60a5fa)',
    []
  );

  // Enhanced: More depth, color, and motion for a premium loader experience
  const renderDefaultLoader = () => (
    <>
      {/* Glass/frosted background */}
      {glass && (
        <div className="absolute inset-0 rounded-full bg-white/6 border border-white/10 shadow-lg z-0" />
      )}
      {/* Outer Glow Halo */}
      <div
        className={`absolute inset-0 rounded-full pointer-events-none`}
          style={{
          boxShadow: `0 0 32px 8px var(--tw-shadow-color, rgba(0,0,0,0.12)), 0 0 64px 16px var(--tw-shadow-color, rgba(0,0,0,0.10))`,
          background: `radial-gradient(circle, rgba(255,255,255,0.10) 60%, transparent 100%)`,
          zIndex: 1
        }}
      />
      {/* Enhanced Outer Ring with animated gradient */}
      <div
        className={`absolute inset-0 rounded-full border-2 ${color !== 'rainbow' ? getColorOpacity(10) : ''}`}
        style={{
          background: color === 'rainbow' ? rainbowGradient : `conic-gradient(from 0deg, rgba(255,255,255,0.08) 0%, var(--tw-shadow-color, rgba(0,0,0,0.04)) 100%)`,
          animation: `spin ${animationSpeed} linear infinite`,
          zIndex: 2,
        }}
      ></div>
      {/* Animated Main Ring with multi-color gradient and shadow */}
      <div
        className={`absolute inset-0 rounded-full border-4 ${color !== 'rainbow' ? `border-t-${colorClasses[color]}` : ''} border-r-transparent border-b-transparent border-l-transparent shadow-[0_0_16px_4px_rgba(0,0,0,0.10)]`}
        style={{
          background: color === 'rainbow' ? rainbowGradient : `linear-gradient(120deg, rgba(255,255,255,0.10) 0%, transparent 100%)`,
          animation: `spin ${1.2 / speed}s cubic-bezier(0.4,0,0.2,1) infinite`,
          zIndex: 3,
        }}
      ></div>
      {/* Inner Ring with dashed border, color fade, and slower reverse spin */}
      <div
        className={`absolute inset-2 rounded-full border-2 border-dashed ${color !== 'rainbow' ? getColorOpacity(7) : ''}`}
        style={{
          background: `radial-gradient(circle, rgba(255,255,255,0.06) 60%, transparent 100%)`,
          animation: `spin ${3.2 / speed}s linear infinite reverse`,
          zIndex: 4,
        }}
      ></div>
      {/* Center Dot with pulse, color, and shadow */}
      <div
        className={`absolute inset-[32%] rounded-full shadow-[0_0_12px_3px_rgba(0,0,0,0.13)]`}
        style={{
          background: color === 'rainbow'
            ? 'linear-gradient(135deg, #fff8, #fff2), ' + rainbowGradient
            : `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, var(--tw-shadow-color, rgba(0,0,0,0.10)) 100%), var(--${color}-500, #fff)`,
          animation: `pulse ${1.6 / speed}s ease-in-out infinite`,
          zIndex: 5,
        }}
      ></div>
      {/* Glowing Effect with animated opacity and color */}
      <div
        className={`absolute inset-0 rounded-full blur-lg pointer-events-none`}
        style={{
          background: color === 'rainbow'
            ? 'radial-gradient(circle, #fff8 60%, transparent 100%)'
            : `radial-gradient(circle, var(--tw-shadow-color, rgba(255,255,255,0.12)) 60%, transparent 100%)`,
          animation: `glowPulse ${2.2 / speed}s ease-in-out infinite`,
          opacity: 0.7,
          zIndex: 6,
        }}
      ></div>
      {/* Rotating Dot with trail and color */}
      <div
        className={`absolute left-1/2 top-0 w-2 h-2 -translate-x-1/2 rounded-full shadow-md`}
        style={{
          background: color === 'rainbow'
            ? 'linear-gradient(120deg, #f472b6 60%, #60a5fa 100%)'
            : `linear-gradient(120deg, var(--${color}-500, #fff) 60%, #fff 100%)`,
          boxShadow: color === 'rainbow'
            ? '0 0 8px 2px #f472b6, 0 0 2px 1px #60a5fa'
            : `0 0 8px 2px var(--${color}-500, #fff), 0 0 2px 1px #fff`,
          transformOrigin: '50% 100%',
          animation: `orbit ${1.2 / speed}s linear infinite`,
          zIndex: 7,
        }}
      ></div>
      {/* Subtle Sparkle/Particle effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 8,
          animation: `sparkle 2.8s linear infinite`,
          background: `radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12) 0.5px, transparent 1.5px), 
                       radial-gradient(circle at 20% 80%, rgba(255,255,255,0.10) 0.7px, transparent 1.7px)`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Orbiting particles for extra depth */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              top: '50%',
              left: '50%',
              background: color === 'rainbow' ? rainbowGradient : `var(--${color}-500, #fff)`,
              opacity: 0.7,
              filter: 'blur(1.5px)',
              transform: `rotate(${i * 120}deg) translateX(22px) translateY(-50%)`,
              animation: `orbit ${1.8 + i * 0.5 / speed}s linear infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      {/* Keyframes for enhanced effects */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg) translateY(-44%) scale(1); }
          80% { transform: rotate(288deg) translateY(-44%) scale(1.15);}
          100% { transform: rotate(360deg) translateY(-44%) scale(1);}
        }
        @keyframes sparkle {
          0% { opacity: 0.7; filter: blur(0.5px);}
          50% { opacity: 1; filter: blur(1.2px);}
          100% { opacity: 0.7; filter: blur(0.5px);}
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.12); opacity: 1; }
        }
        @keyframes spin {
          100% { transform: rotate(360deg);}
        }
        @keyframes shimmerText {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  );

  const renderCircularLoader = () => (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          className="stroke-current"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          cx="50"
          cy="50"
          r="40"
          style={{
            stroke: `rgb(var(--${color}-500))`,
            opacity: 0.2
          }}
        />
        <circle
          className="stroke-current"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          cx="50"
          cy="50"
          r="40"
          style={{
            stroke: `rgb(var(--${color}-500))`,
            strokeDasharray: `${(progress || 0) * 2.51} 251.2`,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dasharray 0.3s ease'
          }}
        />
      </svg>
    </div>
  );

  // Ultra-Enhanced Dots Loader: animated, color-customizable, accessible, visually appealing, and with subtle glow and scale effects

  const renderDotsLoader = useCallback(() => {
    const dotCount = 3;
    const glowColors = {
      white: "rgba(255,255,255,0.45)",
      blue: "#818cf8aa",
      purple: "#a78bfa99",
      green: "#6ee7b7aa",
      red: "#f87171aa",
      yellow: "#fde68aaa",
      pink: "#f9a8d4aa",
      indigo: "#818cf8aa",
    };

    // Optionally: animate container for a subtle "breathing" effect
    return (
      <div
        className="flex items-center justify-center gap-2 relative"
        aria-label="Loading"
        role="status"
        style={{
          animation: animate ? `dotsBreath ${2 / speed}s ease-in-out infinite` : 'none',
        }}
      >
        {[...Array(dotCount)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${colorClasses[color]} shadow-md relative`}
            style={{
              animation: animate ? `dotBounce 0.7s cubic-bezier(0.68,-0.55,0.27,1.55) ${i * 0.18}s infinite both, dotGlow 1.2s ${i * 0.18}s infinite alternate` : 'none',
              filter: 'brightness(1.1) drop-shadow(0 0 2px rgba(255,255,255,0.18))',
              boxShadow: `0 0 8px 2px ${glowColors[color] || glowColors.white}`,
            }}
          >
            {/* Optional: Add a subtle inner dot for depth */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle,rgba(255,255,255,0.18) 40%,transparent 80%)",
                filter: "blur(0.5px)",
              }}
            />
          </div>
        ))}
        <style>{`
          @keyframes dotBounce {
            0%, 80%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
            40% { transform: translateY(-8px) scale(1.18); opacity: 1; }
          }
          @keyframes dotGlow {
            0%, 100% { box-shadow: 0 0 8px 2px ${glowColors[color] || glowColors.white}; }
            50% { box-shadow: 0 0 16px 4px ${glowColors[color] || glowColors.white}; }
          }
          @keyframes dotsBreath {
            0%, 100% { transform: scale(1);}
            50% { transform: scale(1.04);}
          }
        `}</style>
      </div>
    );
  }, [color, colorClasses, animate, speed]);

  return (
    <div 
      className={`relative ${sizeClasses[size]} ${className} ${glass ? 'backdrop-blur-md' : ''}`}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={showProgress ? Math.round(smoothProgress) : undefined}
      aria-live="polite"
      aria-busy="true"
    >
      {/* Visually hidden label for screen readers */}
      <span className="sr-only">{ariaLabel}</span>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={variant}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          {variant === 'default' && renderDefaultLoader()}
          {variant === 'circular' && renderCircularLoader()}
          {variant === 'dots' && renderDotsLoader()}
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicator with smooth animation */}
      {showProgress && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-xs font-medium text-white/60">
            {Math.round(smoothProgress)}%
          </span>
        </motion.div>
      )}

      {/* Loading Text with shimmer animation */}
      {text && (
        <motion.div 
          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span 
            className="text-xs font-medium text-white/60 bg-gradient-to-r from-white via-blue-200 to-white bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer-text"
            style={{ animation: animate ? `shimmerText ${2 / speed}s linear infinite` : 'none' }}
          >
            {text}
          </span>
        </motion.div>
      )}
      <style>{`
        .animate-shimmer-text {
          background-size: 200% 100%;
          background-repeat: no-repeat;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}, (prevProps, nextProps) => {
  // Advanced: Custom comparison for optimal re-rendering
  return (
    prevProps.size === nextProps.size &&
    prevProps.color === nextProps.color &&
    prevProps.variant === nextProps.variant &&
    prevProps.showProgress === nextProps.showProgress &&
    prevProps.text === nextProps.text &&
    prevProps.className === nextProps.className &&
    prevProps.speed === nextProps.speed &&
    prevProps.glass === nextProps.glass &&
    prevProps.animate === nextProps.animate &&
    // Only re-render if progress changed by more than 1%
    Math.abs((prevProps.progress || 0) - (nextProps.progress || 0)) < 1
  );
});

/**
 * Full Page Loader Component - Redesigned for Minimalist, Modern, Professional Look
 * (Memoized with Advanced Features)
 * 
 * Features:
 * - Minimalist variant: Clean, modern design with subtle animations
 * - Classic variant: Enhanced original design with aurora effects
 * - Progress indicator support with smooth transitions
 * - Rotating tips and fun facts with fade animations
 * - Accessibility features (ARIA, focus management, keyboard navigation)
 * - Automatic body scroll lock
 * - Performance optimized with memoization
 * 
 * Usage Examples:
 * 1. Minimalist Loading:
 *    {isAppLoading && <PageLoader variant="minimalist" text="Loading your cinematic experience..." />}
 * 
 * 2. Classic Loading:
 *    {isPageTransitioning && <PageLoader variant="classic" text="Preparing your next adventure..." />}
 * 
 * 3. With Progress:
 *    {isFetchingData && <PageLoader showProgress progress={75} text="Loading your content..." onComplete={() => setLoading(false)} />}
 * 
 * Props:
 * - variant: 'minimalist' | 'classic' (default: 'minimalist')
 * - text: string (loading message)
 * - showProgress: boolean (show progress bar)
 * - progress: number (0-100, progress percentage)
 * - tips: array of strings (rotating tips)
 * - showTips: boolean (show tips)
 * - tipInterval: number (tip rotation interval in ms)
 * - onComplete: function (callback when progress reaches 100%)
 * - enableEscapeKey: boolean (allow ESC key to close, default: false)
 * - onEscape: function (callback when ESC is pressed)
 */

const PageLoader = memo(({
  text = "Loading your cinematic experience...",
  showProgress = true,
  progress = 0,
  tips = [
    "Tip: Add movies to your watchlist for quick access later.",
    "Did you know? You can filter by genre and year.",
    "Pro: Hover a card for instant details.",
    "Explore: Try the 'View All' mode for endless scrolling.",
    "Fun Fact: Our posters are fetched in real-time from TMDB.",
    "Hint: Use keyboard arrows to navigate carousels.",
  ],
  showTips = true,
  tipInterval = 3000,
  variant = 'minimalist',
  onComplete,
  enableEscapeKey = false,
  onEscape
}) => {
  // Advanced: Smooth progress tracking
  const [smoothProgress, setSmoothProgress] = useState(0);
  const prevProgressRef = useRef(0);
  const progressAnimationRef = useRef(null);

  // Advanced: Tip management with fade transitions
  const [currentTip, setCurrentTip] = useState(
    tips && Array.isArray(tips) && tips.length > 0 ? Math.floor(Math.random() * tips.length) : 0
  );
  const [tipFading, setTipFading] = useState(false);
  
  // FIXED: Use useRef for timeout management to prevent memory leaks
  const tipTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const containerRef = useRef(null);

  // Advanced: Smooth progress animation with easing
  useEffect(() => {
    if (!showProgress) return;

    const startProgress = prevProgressRef.current;
    const endProgress = Math.max(0, Math.min(100, progress));
    const startTime = performance.now();
    const duration = 500; // ms

    const animateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // Ease-out quad function for smooth deceleration
      const easeOutQuad = 1 - Math.pow(1 - progressRatio, 2);
      const currentProgress = startProgress + (endProgress - startProgress) * easeOutQuad;
      
      setSmoothProgress(currentProgress);

      if (progressRatio < 1) {
        progressAnimationRef.current = requestAnimationFrame(animateProgress);
      } else {
        prevProgressRef.current = endProgress;
        
        // Trigger onComplete callback when reaching 100%
        if (endProgress >= 100 && onComplete) {
          setTimeout(() => onComplete(), 300); // Small delay for visual feedback
        }
      }
    };

    progressAnimationRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
      }
    };
  }, [progress, showProgress, onComplete]);

  // FIXED: Memoize the tip update function with fade effect
  const updateCurrentTip = useCallback(() => {
    if (isMountedRef.current && tips && Array.isArray(tips) && tips.length > 0) {
      setTipFading(true);
      
      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
        setTipFading(false);
      }, 300); // Fade duration
    }
  }, [tips]);

  // FIXED: Proper cleanup of interval to prevent memory leaks
  useEffect(() => {
    if (!showTips || !tips || !Array.isArray(tips) || tips.length < 2) return;
    
    // Clear any existing timeout first
    if (tipTimeoutRef.current) {
      clearInterval(tipTimeoutRef.current);
      tipTimeoutRef.current = null;
    }
    
    tipTimeoutRef.current = setInterval(updateCurrentTip, tipInterval);
    
    return () => {
      if (tipTimeoutRef.current) {
        clearInterval(tipTimeoutRef.current);
        tipTimeoutRef.current = null;
      }
    };
  }, [showTips, tips, tipInterval, updateCurrentTip]);

  // Advanced: Keyboard navigation (ESC key support)
  useEffect(() => {
    if (!enableEscapeKey) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableEscapeKey, onEscape]);

  // FIXED: Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (tipTimeoutRef.current) {
        clearInterval(tipTimeoutRef.current);
        tipTimeoutRef.current = null;
      }
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }
    };
  }, []);

  // Subtle accessibility improvement: focus trap
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Prevent body scrolling when page loader is active
  useEffect(() => {
    // Add classes to prevent scrolling on both html and body
    document.documentElement.classList.add('page-loader-active');
    document.body.classList.add('page-loader-active');
    
    // Remove classes when component unmounts
    return () => {
      document.documentElement.classList.remove('page-loader-active');
      document.body.classList.remove('page-loader-active');
    };
  }, []);

  // FIXED: Memoize tips array to prevent unnecessary re-renders
  const memoizedTips = useMemo(() => tips, [tips]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      aria-live="polite"
      className="fixed inset-0 flex items-center justify-center bg-[#121417] z-[9999] overflow-hidden page-loader-container"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: '#121417',
        pointerEvents: 'auto',
        overflow: 'hidden',
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        maxHeight: '100vh',
        margin: 0,
        padding: 0,
        touchAction: 'none',
        userSelect: 'none',
        WebkitOverflowScrolling: 'auto'
      }}
    >
      {variant === 'minimalist' ? (
        // Minimalist variant
        <>
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#121417] via-[#1a1d24] to-[#121417] opacity-80"></div>
          
          {/* Minimal animated background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
          </div>

          {/* Main content container */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-6 m-0">
            {/* Minimalist loader with progress */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {/* Main spinner ring */}
                <div className="w-16 h-16 border-2 border-white/10 rounded-full relative">
                  <div className="absolute inset-0 border-2 border-transparent border-t-white/60 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 border-2 border-transparent border-t-white/30 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                </div>
                
                {/* Center spinner (reduced scale) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="spinner"></div>
                  <style>{`
                    .spinner { --size: 10px; --first-block-clr: rgba(255,255,255, 0.8); --second-block-clr: rgba(255,255,255, 0.8); --clr: #111; width: 28px; height: 28px; position: relative; }
                    .spinner::after,.spinner::before { box-sizing: border-box; position: absolute; content: ""; width: 10px; height: 12px; top: 50%; animation: up 2.4s cubic-bezier(0,0,0.24,1.21) infinite; left: 50%; background: var(--first-block-clr); }
                    .spinner::after { background: var(--second-block-clr); top: calc(50% - var(--size)); left: calc(50% - var(--size)); animation: down 2.4s cubic-bezier(0,0,0.24,1.21) infinite; }
                    @keyframes down { 0%,100% { transform: none; } 25% { transform: translateX(80%);} 50% { transform: translateX(80%) translateY(80%);} 75% { transform: translateY(80%);} }
                    @keyframes up { 0%,100% { transform: none; } 25% { transform: translateX(-90%);} 50% { transform: translateX(-90%) translateY(-90%);} 75% { transform: translateY(-90%);} }
                  `}</style>
                </div>
              </div>
              
              {/* Progress indicator - centered below spinner */}
              {showProgress && (
                <motion.div 
                  className="w-32 h-1 bg-white/10 rounded-full overflow-hidden"
                  initial={{ opacity: 0, scaleX: 0.8 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div
                    className="h-full bg-white/60 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.max(0, Math.min(100, smoothProgress))}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  ></motion.div>
                </motion.div>
              )}
            </div>

            {/* Loading text */}
            <motion.div 
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-white/90 text-lg font-medium tracking-wide">
                {text}
              </h2>
              
              {/* Subtle loading dots */}
              <div className="flex items-center justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-white/40 rounded-full"
                    animate={{ 
                      opacity: [0.4, 1, 0.4],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      duration: 1.4,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  ></motion.div>
                ))}
              </div>
            </motion.div>

            {/* Tips section with fade transition */}
            {showTips && memoizedTips && Array.isArray(memoizedTips) && memoizedTips.length > 0 && (
              <motion.div 
                className="text-center max-w-md m-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div 
                  className="text-white/40 text-sm font-medium transition-opacity duration-500"
                  animate={{ opacity: tipFading ? 0 : 1 }}
                >
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-white/30"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4m0 4h.01"
                      />
                    </svg>
                    {memoizedTips[currentTip]}
                  </span>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Subtle corner accent */}
          <div className="absolute top-8 right-8 w-16 h-16 border border-white/5 rounded-full opacity-30"></div>
          <div className="absolute bottom-8 left-8 w-12 h-12 border border-white/5 rounded-full opacity-20"></div>
        </>
      ) : (
        // Classic variant (enhanced original design)
        <>
          {/* Noise overlay */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
          {/* Subtle vertical gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121417]/50 to-transparent pointer-events-none"></div>
          {/* Animated aurora effect */}
          <div className="absolute inset-0 pointer-events-none">
            <svg
              width="100%"
              height="100%"
              className="w-full h-full"
              style={{ filter: "blur(32px)" }}
            >
              <defs>
                <radialGradient id="aurora1" cx="60%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0f0f0f" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="aurora2" cx="30%" cy="70%" r="60%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#0f0f0f" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="60%" cy="30%" r="320" fill="url(#aurora1)" />
              <circle cx="30%" cy="70%" r="260" fill="url(#aurora2)" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-6 relative z-10 m-0">
            {/* Main Loader */}
            <div className="relative">
              <Loader size="large" />
              {/* Orbiting Elements - now with more orbs and color */}
              <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-3 h-3 rounded-full backdrop-blur-sm`}
                    style={{
                      top: "50%",
                      left: "50%",
                      background:
                        i % 2 === 0
                          ? "rgba(129,140,248,0.25)"
                          : "rgba(110,231,183,0.22)",
                      boxShadow:
                        i % 2 === 0
                          ? "0 0 8px 2px #818cf8aa"
                          : "0 0 8px 2px #6ee7b7aa",
                      transform: `rotate(${i * 72}deg) translateX(44px) translateY(-50%)`,
                    }}
                  />
                ))}
              </div>
              {/* Center spinner */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="spinner"></div>
                <style>{`
                  .spinner { --size: 18px; --first-block-clr: rgba(255,255,255, 0.8); --second-block-clr: rgba(255,255,255, 0.8); --clr: #111; width: 48px; height: 48px; position: relative; }
                  .spinner::after,.spinner::before { box-sizing: border-box; position: absolute; content: ""; width: 18px; height: 20px; top: 50%; animation: up 2.4s cubic-bezier(0,0,0.24,1.21) infinite; left: 50%; background: var(--first-block-clr); backdrop-filter: blur(10px); }
                  .spinner::after { background: var(--second-block-clr); top: calc(50% - var(--size)); left: calc(50% - var(--size)); animation: down 2.4s cubic-bezier(0,0,0.24,1.21) infinite; backdrop-filter: blur(10px); }
                  @keyframes down { 0%,100% { transform: none; } 25% { transform: translateX(80%);} 50% { transform: translateX(80%) translateY(80%);} 75% { transform: translateY(80%);} }
                  @keyframes up { 0%,100% { transform: none; } 25% { transform: translateX(-90%);} 50% { transform: translateX(-90%) translateY(-90%);} 75% { transform: translateY(-90%);} }
                `}</style>
              </div>
              {/* Progress bar (optional) */}
              {showProgress && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[-18px] w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#818cf8] to-[#6ee7b7] transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
                  ></div>
                </div>
              )}
            </div>
            {/* Main loading text */}
            <div className="text-white/70 text-base font-semibold tracking-wide animate-[pulse_2s_ease-in-out_infinite] text-center px-4">
              {text}
            </div>
            {/* Rotating tip or fun fact */}
            {showTips && memoizedTips && Array.isArray(memoizedTips) && memoizedTips.length > 0 && (
              <div className="text-xs text-white/40 font-medium text-center max-w-xs mt-2 transition-opacity duration-500 animate-fade-in m-0">
                <span className="inline-flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-white/30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01"
                    />
                  </svg>
                  {memoizedTips[currentTip]}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Advanced: Custom comparison for optimal re-rendering
  return (
    prevProps.text === nextProps.text &&
    prevProps.variant === nextProps.variant &&
    prevProps.showProgress === nextProps.showProgress &&
    prevProps.showTips === nextProps.showTips &&
    prevProps.tipInterval === nextProps.tipInterval &&
    prevProps.enableEscapeKey === nextProps.enableEscapeKey &&
    // Only re-render if progress changed by more than 2%
    Math.abs((prevProps.progress || 0) - (nextProps.progress || 0)) < 2 &&
    // Deep equality for tips array
    JSON.stringify(prevProps.tips) === JSON.stringify(nextProps.tips)
  );
});

/**
 * Section Loader Component (Enhanced with Advanced Features)
 * 
 * Usage Examples:
 * 1. Content Section Loading:
 *    {isLoadingContent && <SectionLoader text="Loading content..." />}
 * 
 * 2. List Loading with Progress:
 *    {isLoadingList && <SectionLoader text="Loading items..." showProgress progress={65} />}
 * 
 * 3. Grid Section with Tips:
 *    {isLoadingGrid && <SectionLoader text="Loading grid..." showTips tips={['Tip 1', 'Tip 2']} />}
 * 
 * Props:
 * - text: string (main loading message)
 * - showProgress: boolean (optional, show animated progress bar)
 * - progress: number (optional, 0-100, for progress bar)
 * - tips: array of string (optional, rotating tips/fun facts)
 * - showTips: boolean (optional, show tips/fun facts)
 * - className: string (optional, extra classes for outer container)
 * - onComplete: function (optional, callback when progress reaches 100%)
 */

const SectionLoader = memo(({
  text = "Loading content...",
  showProgress = false,
  progress = 0,
  tips = null,
  showTips = false,
  className = "",
  onComplete
}) => {
  // For rotating tips/fun facts with fade effect
  const [currentTip, setCurrentTip] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const tipTimeoutRef = useRef(null);

  // Advanced: Smooth progress tracking
  const [smoothProgress, setSmoothProgress] = useState(0);
  const prevProgressRef = useRef(0);
  const progressAnimationRef = useRef(null);

  // Advanced: Smooth progress animation
  useEffect(() => {
    if (!showProgress) return;

    const startProgress = prevProgressRef.current;
    const endProgress = Math.max(0, Math.min(100, progress));
    const startTime = performance.now();
    const duration = 400;

    const animateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      const easeOutQuad = 1 - Math.pow(1 - progressRatio, 2);
      const currentProgress = startProgress + (endProgress - startProgress) * easeOutQuad;
      
      setSmoothProgress(currentProgress);

      if (progressRatio < 1) {
        progressAnimationRef.current = requestAnimationFrame(animateProgress);
      } else {
        prevProgressRef.current = endProgress;
        if (endProgress >= 100 && onComplete) {
          setTimeout(() => onComplete(), 200);
        }
      }
    };

    progressAnimationRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
      }
    };
  }, [progress, showProgress, onComplete]);

  // FIXED: Use useCallback to memoize the setCurrentTip function with fade
  const updateCurrentTip = useCallback(() => {
    if (tips && Array.isArray(tips) && tips.length > 0) {
      setTipFading(true);
      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
        setTipFading(false);
      }, 300);
    }
  }, [tips]);

  useEffect(() => {
    if (showTips && tips && Array.isArray(tips) && tips.length > 1) {
      if (tipTimeoutRef.current) {
        clearInterval(tipTimeoutRef.current);
      }
      tipTimeoutRef.current = setInterval(updateCurrentTip, 3500);
      return () => {
        if (tipTimeoutRef.current) {
          clearInterval(tipTimeoutRef.current);
          tipTimeoutRef.current = null;
        }
      };
    }
  }, [showTips, tips, updateCurrentTip]);

  return (
    <motion.div 
      className={`flex items-center justify-center py-16 sm:py-20 relative min-h-[220px] ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated background shimmer */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-[#121417]/40 to-transparent animate-section-shimmer" />
        <style>{`
          @keyframes section-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .animate-section-shimmer {
            background-size: 200% 100%;
            animation: section-shimmer 2.8s linear infinite;
          }
        `}</style>
      </div>
      
      {/* Loader and content */}
      <motion.div 
        className="flex flex-col items-center gap-5 relative z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Loader
          size="large"
          text={null}
          showProgress={false}
          variant="default"
        />
        
        <motion.div 
          className="text-white/80 text-lg font-semibold tracking-wide text-center px-4 drop-shadow-lg"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.div>
        
        {/* Optional progress bar below text with smooth animation */}
        {showProgress && (
          <motion.div 
            className="w-40 h-2 bg-white/10 rounded-full overflow-hidden mt-2 shadow-inner"
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-[#818cf8] to-[#6ee7b7] rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${Math.max(0, Math.min(100, smoothProgress))}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            ></motion.div>
          </motion.div>
        )}
        
        {/* Optional rotating tip/fun fact with fade transition */}
        {showTips && tips && Array.isArray(tips) && tips.length > 0 && (
          <motion.div 
            className="text-xs text-white/50 font-medium text-center max-w-xs mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: tipFading ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="inline-flex items-center gap-1">
              <svg
                className="w-4 h-4 text-white/30"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01"
                />
              </svg>
              {tips[currentTip]}
            </span>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Advanced: Custom comparison for optimal re-rendering
  return (
    prevProps.text === nextProps.text &&
    prevProps.showProgress === nextProps.showProgress &&
    prevProps.showTips === nextProps.showTips &&
    prevProps.className === nextProps.className &&
    Math.abs((prevProps.progress || 0) - (nextProps.progress || 0)) < 2 &&
    JSON.stringify(prevProps.tips) === JSON.stringify(nextProps.tips)
  );
});

/**
 * Card Loader Component (Enhanced with Skeleton Animation)
 * 
 * Usage Examples:
 * 1. Movie/Show Cards:
 *    {isLoadingMovies && <CardLoader count={6} />}
 * 
 * 2. Product Cards with Custom Animation:
 *    {isLoadingProducts && <CardLoader count={4} animate={true} />}
 * 
 * 3. Content Cards with Stagger Effect:
 *    {isLoadingContent && <CardLoader count={3} stagger={0.1} />}
 * 
 * Props:
 * - count: number (number of skeleton cards to show)
 * - animate: boolean (enable shimmer animation, default: true)
 * - stagger: number (stagger delay for animations, default: 0.05)
 */
const CardLoader = memo(({ 
  count = 1, 
  animate = true,
  stagger = 0.05 
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * stagger, duration: 0.4 }}
        >
          <div className="relative overflow-hidden">
            {/* Card Image Skeleton */}
            <motion.div 
              className="aspect-[2/3] bg-white/5 rounded-lg relative overflow-hidden"
              animate={animate ? { 
                backgroundPosition: ['200% 0', '-200% 0']
              } : {}}
              transition={animate ? {
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              } : {}}
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
                backgroundSize: '200% 100%'
              }}
            >
              {/* Shimmer overlay */}
              {animate && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              )}
            </motion.div>
            
            {/* Title Skeleton */}
            <motion.div 
              className="h-4 bg-white/5 rounded mt-2 w-3/4 relative overflow-hidden"
              animate={animate ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={animate ? { duration: 1.5, repeat: Infinity } : {}}
            >
              {animate && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              )}
            </motion.div>
            
            {/* Subtitle Skeleton */}
            <motion.div 
              className="h-3 bg-white/5 rounded mt-1 w-1/2 relative overflow-hidden"
              animate={animate ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={animate ? { duration: 1.5, repeat: Infinity, delay: 0.2 } : {}}
            >
              {animate && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              )}
            </motion.div>
          </div>
        </motion.div>
      ))}
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.count === nextProps.count &&
    prevProps.animate === nextProps.animate &&
    prevProps.stagger === nextProps.stagger
  );
});

// Add PropTypes for better development experience and type safety
Loader.propTypes = {
  size: PropTypes.oneOf(['tiny', 'small', 'default', 'large', 'xlarge', '2xl']),
  color: PropTypes.oneOf(['white', 'blue', 'purple', 'green', 'red', 'yellow', 'pink', 'indigo', 'rainbow']),
  showProgress: PropTypes.bool,
  progress: PropTypes.number,
  text: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'circular', 'dots', 'pulse', 'bars']),
  speed: PropTypes.number,
  glass: PropTypes.bool,
  ariaLabel: PropTypes.string,
  animate: PropTypes.bool,
  onComplete: PropTypes.func
};

PageLoader.propTypes = {
  text: PropTypes.string,
  showProgress: PropTypes.bool,
  progress: PropTypes.number,
  tips: PropTypes.arrayOf(PropTypes.string),
  showTips: PropTypes.bool,
  tipInterval: PropTypes.number,
  variant: PropTypes.oneOf(['minimalist', 'classic']),
  onComplete: PropTypes.func,
  enableEscapeKey: PropTypes.bool,
  onEscape: PropTypes.func
};

SectionLoader.propTypes = {
  text: PropTypes.string,
  showProgress: PropTypes.bool,
  progress: PropTypes.number,
  tips: PropTypes.arrayOf(PropTypes.string),
  showTips: PropTypes.bool,
  className: PropTypes.string,
  onComplete: PropTypes.func
};

CardLoader.propTypes = {
  count: PropTypes.number,
  animate: PropTypes.bool,
  stagger: PropTypes.number
};



// Enhanced: Add keyframes for advanced loader and skeleton animations, only once per page
(function injectLoaderKeyframes() {
  try {
    if (typeof window === "undefined" || document.getElementById("loader-keyframes")) return;
    const style = document.createElement('style');
    style.id = "loader-keyframes";
    style.textContent = `
    /* Reset styles for page loader to prevent extra space */
    .page-loader-container {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
    }
    
    .page-loader-container * {
      box-sizing: border-box !important;
    }
    
    /* Prevent body scrolling when page loader is active */
    body.page-loader-active {
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      touch-action: none !important;
      -webkit-overflow-scrolling: auto !important;
    }
    
    /* Prevent scrolling on html element as well */
    html.page-loader-active {
      overflow: hidden !important;
      height: 100% !important;
      touch-action: none !important;
    }
    /* Shimmer effect for skeleton loaders */
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
        opacity: 0.7;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateX(100%);
        opacity: 0.7;
      }
    }

    /* Bounce for dots or elements */
    @keyframes bounce {
      0%, 100% {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
      50% {
        transform: translateY(-8px) scale(1.12);
        opacity: 0.85;
      }
    }

    /* Pulse for loader center or text */
    @keyframes pulse {
      0%, 100% {
        opacity: 0.8;
        transform: scale(1);
      }
      50% {
        opacity: 1;
        transform: scale(1.12);
      }
    }

    /* Orbit for rotating dots */
    @keyframes orbit {
      0% { transform: rotate(0deg) translateY(-44%) scale(1); }
      80% { transform: rotate(288deg) translateY(-44%) scale(1.15);}
      100% { transform: rotate(360deg) translateY(-44%) scale(1);}
    }

    /* Glow pulse for halo effects */
    @keyframes glowPulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    /* Sparkle for subtle background particles */
    @keyframes sparkle {
      0% { opacity: 0.7; filter: blur(0.5px);}
      50% { opacity: 1; filter: blur(1.2px);}
      100% { opacity: 0.7; filter: blur(0.5px);}
    }

    /* Loader slide-in for page loader */
    @keyframes loaderSlideIn {
      0% {
        opacity: 0;
        transform: translateY(32px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Loader fade-out for page loader */
    @keyframes loaderFadeOut {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0.98);
      }
    }

    /* Dots loader animation (for 3-dot loaders) */
    @keyframes dotFlashing {
      0% { opacity: 0.2; }
      50%, 100% { opacity: 1; }
    }
      `;
    document.head.appendChild(style);
  } catch (error) {
    console.warn('Failed to inject loader keyframes:', error);
  }
})();

export { Loader, PageLoader, SectionLoader, CardLoader }; 