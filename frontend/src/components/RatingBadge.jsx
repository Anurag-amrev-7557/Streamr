import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

const RatingBadge = ({ 
  rating, 
  size = 'default', 
  showIcon = true, 
  className = '',
  position = 'top-left',
  showShadow = false,
  colorTheme = 'dark',
  tooltipText = '',
  customColor = '', // New prop for custom color
  isLoading = false, // New prop for loading state
  tooltipPosition = 'top' // New prop for tooltip position: 'top' | 'bottom'
}) => {
  // Validate and normalize rating with error handling
  let normalizedRating = 0;
  
  try {
    if (typeof rating === 'number' && !isNaN(rating)) {
      normalizedRating = Math.max(0, Math.min(10, rating));
    } else if (typeof rating === 'string') {
      const parsed = parseFloat(rating);
      if (!isNaN(parsed)) {
        normalizedRating = Math.max(0, Math.min(10, parsed));
      }
    }
  } catch (error) {
    console.warn('RatingBadge: Error parsing rating:', error);
    normalizedRating = 0;
  }

  // Validate size prop - now includes ultra-small and extra-small
  const validSizes = ['ultra-small', 'extra-small', 'small', 'default', 'large', 'xl'];
  const validSize = validSizes.includes(size) ? size : 'default';
  
  // Determine badge size and positioning for rectangular design with responsive sizing
  const sizeClasses = {
    'ultra-small': 'h-4 sm:h-5 px-1.5 sm:px-2 text-xs',
    'extra-small': 'h-4.5 sm:h-5.5 px-1.5 sm:px-2.5 text-xs',
    'small': 'h-5 sm:h-6 px-2 sm:px-2.5 text-xs',
    'default': 'h-6 sm:h-7 px-2.5 sm:px-3.5 text-xs sm:text-sm',
    'large': 'h-7 sm:h-8 px-3 sm:px-4.5 text-sm sm:text-base',
    'xl': 'h-8 sm:h-9 px-3.5 sm:px-5.5 text-sm sm:text-lg'
  };

  // Validate position prop
  const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const validPosition = validPositions.includes(position) ? position : 'top-left';
  
  const positionClasses = {
    'top-left': 'top-1 sm:top-2 -left-1 sm:-left-1',
    'top-right': 'top-2 sm:top-3 right-2 sm:right-3',
    'bottom-left': 'bottom-2 sm:bottom-3 left-0 sm:left-0',
    'bottom-right': 'bottom-2 sm:bottom-3 right-2 sm:right-3'
  };

  const variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    hover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    loading: {
      opacity: [0.5, 1],
      transition: { duration: 1, repeat: Infinity, repeatType: "reverse" }
    }
  };

  // Memoize the style calculations with custom color support
  const { badgeStyle, sizeClass, positionClass, tooltipClass } = useMemo(() => {
    const getColoredBadgeStyle = (rating) => {
      if (rating >= 8.5) return 'bg-green-600 text-white';
      if (rating >= 7.5) return 'bg-green-500 text-white';
      if (rating >= 6.5) return 'bg-yellow-500 text-white';
      if (rating >= 5.5) return 'bg-orange-500 text-white';
      return 'bg-red-500 text-white';
    };

    const getDarkBadgeStyle = (rating) => {
      if (rating >= 8.5) return 'bg-black/90 text-white';
      if (rating >= 7.5) return 'bg-black/80 text-white';
      if (rating >= 6.5) return 'bg-black/70 text-white';
      if (rating >= 5.5) return 'bg-black/60 text-white';
      return 'bg-black/50 text-white';
    };

    const getCustomBadgeStyle = () => {
      return customColor ? `bg-${customColor} text-white` : colorTheme === 'colored' 
        ? getColoredBadgeStyle(normalizedRating)
        : getDarkBadgeStyle(normalizedRating);
    };

    const getTooltipPosition = () => {
      return tooltipPosition === 'top' 
        ? '-top-8 left-1/2 -translate-x-1/2'
        : 'top-full left-1/2 -translate-x-1/2 mt-2';
    };

    return {
      badgeStyle: getCustomBadgeStyle(),
      sizeClass: sizeClasses[validSize],
      positionClass: positionClasses[validPosition],
      tooltipClass: getTooltipPosition()
    };
  }, [normalizedRating, colorTheme, validSize, validPosition, customColor, tooltipPosition]);

  return (
    <AnimatePresence>
      <motion.div
        className={`group absolute ${positionClass} z-30 ${sizeClass} ${className}`}
        variants={variants}
        initial="hidden"
        animate={isLoading ? "loading" : "visible"}
        whileHover="hover"
        role="status"
        aria-label={`Rating: ${normalizedRating.toFixed(1)} out of 10`}
      >
        {tooltipText && (
          <motion.div 
            className={`absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 
              transition-opacity duration-200 ${tooltipClass} bg-black/75 text-white text-xs 
              rounded px-2 py-1 whitespace-nowrap z-50`}
            initial={{ opacity: 0, y: tooltipPosition === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {tooltipText}
          </motion.div>
        )}

        <div className={`relative w-auto h-full rounded-md ${badgeStyle} overflow-hidden 
          ${showShadow ? 'shadow-lg' : ''} flex items-center justify-center px-2 sm:px-1 
          min-w-max transition-all duration-200 ${isLoading ? 'cursor-wait' : ''}`}>
          {showIcon && !isLoading && (
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              className={`${sizeClass.includes('ultra-small') ? 'w-2 h-2' : 'w-3 h-3'} 
                text-white flex-shrink-0`}
              viewBox="0 0 24 24"
              fill="currentColor"
              variants={{
                hidden: { opacity: 0, scale: 0.8 },
                visible: { opacity: 1, scale: 1 }
              }}
              aria-hidden="true"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </motion.svg>
          )}
          
          <motion.span
            className="font-semibold sm:font-bold text-white leading-none tracking-tight flex-shrink-0 ml-1"
            layout
          >
            {isLoading ? '...' : normalizedRating.toFixed(1)}
          </motion.span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

RatingBadge.propTypes = {
  rating: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired,
  size: PropTypes.oneOf(['ultra-small', 'extra-small', 'small', 'default', 'large', 'xl']),
  showIcon: PropTypes.bool,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  showShadow: PropTypes.bool,
  colorTheme: PropTypes.oneOf(['dark', 'colored']),
  tooltipText: PropTypes.string,
  customColor: PropTypes.string,
  isLoading: PropTypes.bool,
  tooltipPosition: PropTypes.oneOf(['top', 'bottom'])
};

export default React.memo(RatingBadge);