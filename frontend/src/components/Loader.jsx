import React from 'react';
import PropTypes from 'prop-types';

/**
 * @typedef {Object} LoaderProps
 * @property {('tiny'|'small'|'default'|'large'|'xlarge'|'2xl')} [size='default'] - Size of the loader
 * @property {('white'|'blue'|'purple'|'green'|'red'|'yellow'|'pink'|'indigo')} [color='white'] - Color of the loader
 * @property {boolean} [showProgress=false] - Whether to show progress percentage
 * @property {number} [progress=0] - Progress percentage (0-100)
 * @property {string} [text] - Loading text to display
 * @property {string} [className=''] - Additional CSS classes
 * @property {('default'|'circular'|'dots')} [variant='default'] - Loader variant
 * @property {number} [speed=1] - Animation speed multiplier
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
  speed = 1
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
    indigo: 'border-indigo-500'
  };

  const getColorOpacity = (opacity) => `${colorClasses[color]}/${opacity}`;
  const animationSpeed = `${2 / speed}s`;

  const renderDefaultLoader = () => (
    <>
      {/* Outer Ring */}
      <div 
        className={`absolute inset-0 rounded-full border-2 ${getColorOpacity(10)}`}
        style={{ animation: `spin ${animationSpeed} linear infinite` }}
      ></div>
      
      {/* Animated Ring */}
      <div 
        className={`absolute inset-0 rounded-full border-2 border-t-${colorClasses[color]} border-r-transparent border-b-transparent border-l-transparent`}
        style={{ animation: `spin ${1.5 / speed}s ease-in-out infinite` }}
      ></div>
      
      {/* Inner Ring */}
      <div 
        className={`absolute inset-2 rounded-full border-2 ${getColorOpacity(5)}`}
        style={{ animation: `spin ${3 / speed}s linear infinite reverse` }}
      ></div>
      
      {/* Center Dot */}
      <div 
        className={`absolute inset-[30%] rounded-full bg-${colorClasses[color]}/20`}
        style={{ animation: `pulse ${2 / speed}s ease-in-out infinite` }}
      ></div>
      
      {/* Glowing Effect */}
      <div 
        className={`absolute inset-0 rounded-full bg-${colorClasses[color]}/5 blur-md`}
        style={{ animation: `pulse ${2 / speed}s ease-in-out infinite` }}
      ></div>
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

  const renderDotsLoader = () => (
    <div className="flex items-center justify-center gap-2">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full bg-${colorClasses[color]}`}
          style={{
            animation: `bounce ${1 / speed}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
    </div>
  );

  return (
    <div 
      className={`relative ${sizeClasses[size]} ${className}`}
      role="progressbar"
      aria-label="Loading indicator"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={showProgress ? progress : undefined}
    >
      {variant === 'default' && renderDefaultLoader()}
      {variant === 'circular' && renderCircularLoader()}
      {variant === 'dots' && renderDotsLoader()}

      {/* Progress Indicator */}
      {showProgress && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white/60">{progress}%</span>
        </div>
      )}

      {/* Loading Text */}
      {text && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span 
            className="text-xs font-medium text-white/60"
            style={{ animation: `pulse ${2 / speed}s ease-in-out infinite` }}
          >
            {text}
          </span>
        </div>
      )}
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
const PageLoader = ({ text = "Loading your cinematic experience..." }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-[#0f0f0f] via-[#121417] to-[#0f0f0f] backdrop-blur-xl z-50">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121417]/50 to-transparent"></div>
      <div className="flex flex-col items-center gap-6 relative">
        {/* Main Loader */}
        <div className="relative">
          <Loader size="large" />
          {/* Orbiting Elements */}
          <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-white/20 rounded-full backdrop-blur-sm"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 120}deg) translateX(40px) translateY(-50%)`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="text-white/60 text-sm font-medium tracking-wide animate-[pulse_2s_ease-in-out_infinite]">
          {text}
        </div>
      </div>
    </div>
  );
};

/**
 * Section Loader Component
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
 */
const SectionLoader = ({ text = "Loading content..." }) => {
  return (
    <div className="flex items-center justify-center py-12 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#121417]/30 to-transparent"></div>
      <div className="flex flex-col items-center gap-4 relative">
        <Loader size="default" text={text} />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
  color: PropTypes.oneOf(['white', 'blue', 'purple', 'green', 'red', 'yellow', 'pink', 'indigo']),
  showProgress: PropTypes.bool,
  progress: PropTypes.number,
  text: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'circular', 'dots']),
  speed: PropTypes.number
};

// Add keyframes for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
document.head.appendChild(style);

export { Loader, PageLoader, SectionLoader, CardLoader }; 