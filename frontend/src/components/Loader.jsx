import React from 'react';
import PropTypes from 'prop-types';

/**
 * @typedef {Object} LoaderProps
 * @property {('tiny'|'small'|'default'|'large'|'xlarge'|'2xl')} [size='default'] - Size of the loader
 * @property {('white'|'blue'|'purple'|'green'|'red'|'yellow'|'pink'|'indigo'|'rainbow')} [color='white'] - Color of the loader
 * @property {boolean} [showProgress=false] - Whether to show progress percentage
 * @property {number} [progress=0] - Progress percentage (0-100)
 * @property {string} [text] - Loading text to display
 * @property {string} [className=''] - Additional CSS classes
 * @property {('default'|'circular'|'dots')} [variant='default'] - Loader variant
 * @property {number} [speed=1] - Animation speed multiplier
 * @property {boolean} [glass=false] - Show frosted glass effect background
 * @property {string} [ariaLabel='Loading...'] - Visually hidden label for accessibility
 */

/**
 * Base Loader Component
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
 *    />
 */
const Loader = ({ 
  size = 'default', 
  color = 'white',
  showProgress = false,
  progress = 0,
  text,
  className = '',
  variant = 'default',
  speed = 1,
  glass = false,
  ariaLabel = 'Loading...'
}) => {
  const sizeClasses = {
    tiny: 'w-4 h-4',
    small: 'w-6 h-6',
    default: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24',
    '2xl': 'w-32 h-32'
  };

  const colorClasses = {
    white: 'border-white',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    pink: 'border-pink-500',
    indigo: 'border-indigo-500',
    rainbow: '' // handled separately
  };

  const getColorOpacity = (opacity) => color === 'rainbow' ? '' : `${colorClasses[color]}/${opacity}`;
  const animationSpeed = `${2 / speed}s`;

  // Rainbow animated gradient
  const rainbowGradient =
    'conic-gradient(from 0deg, #60a5fa, #a78bfa, #f472b6, #facc15, #4ade80, #60a5fa)';

  // Enhanced: More depth, color, and motion for a premium loader experience
  const renderDefaultLoader = () => (
    <>
      {/* Glass/frosted background */}
      {glass && (
        <div className="absolute inset-0 rounded-full backdrop-blur-md bg-white/10 border border-white/10 shadow-lg z-0" />
      )}
      {/* Outer Glow Halo */}
      <div
        className={`absolute inset-0 rounded-full pointer-events-none`}
        style={{
          boxShadow: `0 0 32px 8px var(--tw-shadow-color, rgba(0,0,0,0.12)), 0 0 64px 16px var(--tw-shadow-color, rgba(0,0,0,0.10))`,
          background: `radial-gradient(circle, rgba(255,255,255,0.10) 60%, transparent 100%)`,
          zIndex: 1,
          filter: 'blur(2px)',
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
            strokeDasharray: `${progress * 2.51} 251.2`,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dasharray 0.3s ease'
          }}
        />
      </svg>
    </div>
  );

  // Ultra-Enhanced Dots Loader: animated, color-customizable, accessible, visually appealing, and with subtle glow and scale effects

  const renderDotsLoader = () => {
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
          animation: `dotsBreath ${2 / speed}s ease-in-out infinite`,
        }}
      >
        {[...Array(dotCount)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${colorClasses[color]} shadow-md relative`}
            style={{
              animation: `dotBounce 0.7s cubic-bezier(0.68,-0.55,0.27,1.55) ${i * 0.18}s infinite both, dotGlow 1.2s ${i * 0.18}s infinite alternate`,
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
  };

  return (
    <div 
      className={`relative ${sizeClasses[size]} ${className} ${glass ? 'backdrop-blur-md' : ''}`}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={showProgress ? progress : undefined}
    >
      {/* Visually hidden label for screen readers */}
      <span className="sr-only">{ariaLabel}</span>
      {variant === 'default' && renderDefaultLoader()}
      {variant === 'circular' && renderCircularLoader()}
      {variant === 'dots' && renderDotsLoader()}

      {/* Progress Indicator */}
      {showProgress && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white/60">{progress}%</span>
        </div>
      )}

      {/* Loading Text with shimmer animation */}
      {text && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span 
            className="text-xs font-medium text-white/60 bg-gradient-to-r from-white via-blue-200 to-white bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer-text"
            style={{ animation: `shimmerText ${2 / speed}s linear infinite` }}
          >
            {text}
          </span>
        </div>
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
};

/**
 * Full Page Loader Component
 * 
 * Usage Examples:
 * 1. Initial App Loading:
 *    {isAppLoading && <PageLoader text="Loading your cinematic experience..." />}
 * 
 * 2. Page Transition:
 *    {isPageTransitioning && <PageLoader text="Preparing your next adventure..." />}
 * 
 * 3. Data Fetching:
 *    {isFetchingData && <PageLoader text="Loading your content..." />}
 */
import { useEffect, useRef } from "react";

const PageLoader = ({
  text = "Loading your cinematic experience...",
  showProgress = false,
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
  tipInterval = 5000,
}) => {
  const [currentTip, setCurrentTip] = React.useState(
    tips && tips.length > 0 ? Math.floor(Math.random() * tips.length) : 0
  );
  const tipTimeout = useRef();

  useEffect(() => {
    if (!showTips || !tips || tips.length < 2) return;
    tipTimeout.current = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, tipInterval);
    return () => clearInterval(tipTimeout.current);
  }, [showTips, tips, tipInterval]);

  // Subtle accessibility improvement: focus trap
  const containerRef = useRef();
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      aria-live="polite"
      className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-[#0f0f0f] via-[#121417] to-[#0f0f0f] backdrop-blur-xl z-50"
      role="dialog"
      aria-modal="true"
    >
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
      <div className="flex flex-col items-center gap-6 relative z-10">
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
          {/* Pulsing center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
          {/* Progress bar (optional) */}
          {showProgress && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-18px] w-24 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#818cf8] to-[#6ee7b7] transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              ></div>
            </div>
          )}
        </div>
        {/* Main loading text */}
        <div className="text-white/70 text-base font-semibold tracking-wide animate-[pulse_2s_ease-in-out_infinite] text-center px-4">
          {text}
        </div>
        {/* Rotating tip or fun fact */}
        {showTips && tips && tips.length > 0 && (
          <div className="text-xs text-white/40 font-medium text-center max-w-xs mt-2 transition-opacity duration-500 animate-fade-in">
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
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Section Loader Component (Enhanced)
 * 
 * Usage Examples:
 * 1. Content Section Loading:
 *    {isLoadingContent && <SectionLoader text="Loading content..." />}
 * 
 * 2. List Loading:
 *    {isLoadingList && <SectionLoader text="Loading items..." />}
 * 
 * 3. Grid Section:
 *    {isLoadingGrid && <SectionLoader text="Loading grid..." />}
 * 
 * Props:
 * - text: string (main loading message)
 * - showProgress: boolean (optional, show animated progress bar)
 * - progress: number (optional, 0-100, for progress bar)
 * - tips: array of strings (optional, rotating tips/fun facts)
 * - showTips: boolean (optional, show tips/fun facts)
 * - className: string (optional, extra classes for outer container)
 */
import { useState} from 'react';

const SectionLoader = ({
  text = "Loading content...",
  showProgress = false,
  progress = 0,
  tips = null,
  showTips = false,
  className = "",
}) => {
  // For rotating tips/fun facts
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    if (showTips && tips && tips.length > 1) {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [showTips, tips]);

  return (
    <div className={`flex items-center justify-center py-16 sm:py-20 relative min-h-[220px] ${className}`}>
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
      <div className="flex flex-col items-center gap-5 relative z-10">
        <Loader
          size="large"
          text={null}
          showProgress={showProgress}
          progress={progress}
          variant="default"
        />
        <div className="text-white/80 text-lg font-semibold tracking-wide animate-[pulse_2s_ease-in-out_infinite] text-center px-4 drop-shadow-lg">
          {text}
        </div>
        {/* Optional progress bar below text */}
        {showProgress && (
          <div className="w-40 h-2 bg-white/10 rounded-full overflow-hidden mt-2 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#818cf8] to-[#6ee7b7] transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            ></div>
          </div>
        )}
        {/* Optional rotating tip/fun fact */}
        {showTips && tips && tips.length > 0 && (
          <div className="text-xs text-white/50 font-medium text-center max-w-xs mt-3 transition-opacity duration-500 animate-fade-in">
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
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Card Loader Component
 * 
 * Usage Examples:
 * 1. Movie/Show Cards:
 *    {isLoadingMovies && <CardLoader count={6} />}
 * 
 * 2. Product Cards:
 *    {isLoadingProducts && <CardLoader count={4} />}
 * 
 * 3. Content Cards:
 *    {isLoadingContent && <CardLoader count={3} />}
 */
const CardLoader = ({ count = 1 }) => {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] bg-white/5 rounded-lg"></div>
          <div className="h-4 bg-white/5 rounded mt-2 w-3/4"></div>
          <div className="h-3 bg-white/5 rounded mt-1 w-1/2"></div>
        </div>
      ))}
    </div>
  );
};

// Add PropTypes for better development experience
Loader.propTypes = {
  size: PropTypes.oneOf(['tiny', 'small', 'default', 'large', 'xlarge', '2xl']),
  color: PropTypes.oneOf(['white', 'blue', 'purple', 'green', 'red', 'yellow', 'pink', 'indigo', 'rainbow']),
  showProgress: PropTypes.bool,
  progress: PropTypes.number,
  text: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'circular', 'dots']),
  speed: PropTypes.number,
  glass: PropTypes.bool,
  ariaLabel: PropTypes.string
};

// Enhanced: Add keyframes for advanced loader and skeleton animations, only once per page
(function injectLoaderKeyframes() {
  if (typeof window === "undefined" || document.getElementById("loader-keyframes")) return;
  const style = document.createElement('style');
  style.id = "loader-keyframes";
  style.textContent = `
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
})();

export { Loader, PageLoader, SectionLoader, CardLoader }; 