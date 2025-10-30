import React, { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import PropTypes from 'prop-types';

const RatingBadge = ({ 
  rating = 0, 
  size = 'default', 
  showIcon = true, 
  className = '',
  position = 'top-left',
  showShadow = false,
  colorTheme = 'dark',
  tooltipText = '',
  customColor = '', // New prop for custom color (any valid CSS color)
  isLoading = false, // New prop for loading state
  hideWhenZero = false, // New prop: hide badge when rating is exactly 0
  tooltipPosition = 'top', // New prop for tooltip position: 'top' | 'bottom'
  onClick = null, // New prop for click handler
  format = 'decimal', // New prop for rating format: 'decimal' | 'percentage' | 'stars'
  maxRating = 10, // New prop for maximum rating value
  interactive = false, // New prop to enable interactive mode
  showLabel = false, // New prop to show "Rating:" label
  ariaLabel = null // New prop for custom ARIA label
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  // Respect the user's reduced motion preference for accessibility
  const prefersReducedMotion = useReducedMotion();
  
  // Validate and normalize rating with error handling
  const normalizedRating = useMemo(() => {
    let result = 0;
    
    try {
      if (typeof rating === 'number' && !isNaN(rating)) {
        result = Math.max(0, Math.min(maxRating, rating));
      } else if (typeof rating === 'string') {
        const parsed = parseFloat(rating);
        if (!isNaN(parsed)) {
          result = Math.max(0, Math.min(maxRating, parsed));
        }
      }
    } catch (error) {
      console.warn('RatingBadge: Error parsing rating:', error);
      result = 0;
    }
    
    return result;
  }, [rating, maxRating]);

  // Format the rating based on format prop
  const formattedRating = useMemo(() => {
    if (isLoading) return '...';
    
    switch (format) {
      case 'percentage':
        return `${Math.round((normalizedRating / maxRating) * 100)}%`;
      case 'stars':
        return `${(normalizedRating / 2).toFixed(1)}/5`;
      case 'decimal':
      default:
        return normalizedRating.toFixed(1);
    }
  }, [normalizedRating, format, maxRating, isLoading]);

  // Optionally hide when rating is exactly 0 (preserve visibility when loading)
  if (!isLoading && hideWhenZero && normalizedRating === 0) {
    return null;
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
      transition: prefersReducedMotion 
        ? { duration: 0 } 
        : { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    hover: { 
      scale: prefersReducedMotion ? 1 : 1.02,
      transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }
    },
    loading: {
      opacity: [0.5, 1],
      transition: prefersReducedMotion 
        ? { duration: 0 } 
        : { duration: 1, repeat: Infinity, repeatType: "reverse" }
    }
  };

  // Click handler with error boundary
  const handleClick = useCallback((e) => {
    if (!interactive && !onClick) return;
    
    try {
      e.stopPropagation();
      onClick?.(normalizedRating);
    } catch (error) {
      console.error('RatingBadge: Error in click handler:', error);
    }
  }, [onClick, interactive, normalizedRating]);

  // Keyboard handler for accessibility
  const handleKeyDown = useCallback((e) => {
    if (!interactive && !onClick) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  }, [handleClick, interactive, onClick]);

  // Generate appropriate ARIA label
  const generatedAriaLabel = useMemo(() => {
    if (ariaLabel) return ariaLabel;
    
    let label = 'Rating: ';
    switch (format) {
      case 'percentage':
        label += `${Math.round((normalizedRating / maxRating) * 100)} percent`;
        break;
      case 'stars':
        label += `${(normalizedRating / 2).toFixed(1)} out of 5 stars`;
        break;
      default:
        label += `${normalizedRating.toFixed(1)} out of ${maxRating}`;
    }
    
    if (isLoading) label = 'Loading rating...';
    
    return label;
  }, [ariaLabel, normalizedRating, format, maxRating, isLoading]);

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

    // For custom colors we return an empty Tailwind class and provide inline style
    const getCustomBadgeStyle = () => {
      if (customColor) return '';
      return colorTheme === 'colored' ? getColoredBadgeStyle(normalizedRating) : getDarkBadgeStyle(normalizedRating);
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

  // Calculate inline style and accessible text color when customColor is provided
  const customStyle = useMemo(() => {
    if (!customColor) return null;

    // Try to compute a readable foreground color (black/white) based on luminance for hex colors.
    // Support formats: #RRGGBB, #RGB, rgb(...), rgba(...), or any valid CSS color as fallback.
    const getLuminanceFromHex = (hex) => {
      // normalize #RGB to #RRGGBB
      if (!hex) return null;
      try {
        let c = hex.trim();
        if (c[0] === '#') c = c.slice(1);
        if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
        if (c.length !== 6) return null;
        const r = parseInt(c.slice(0,2), 16);
        const g = parseInt(c.slice(2,4), 16);
        const b = parseInt(c.slice(4,6), 16);
        // relative luminance formula
        const srgb = [r,g,b].map(v => v/255).map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
        return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
      } catch (e) {
        return null;
      }
    };

    let style = { backgroundColor: customColor };
    const luminance = getLuminanceFromHex(customColor);
    if (luminance !== null) {
      style.color = luminance > 0.5 ? 'black' : 'white';
    } else {
      // fallback: prefer white text for dark-ish colors (best-effort)
      style.color = 'white';
    }

    return style;
  }, [customColor]);

  // Determine icon size separately (don't reuse sizeClass which contains height/padding)
  const iconSize = useMemo(() => {
    // Reduced icon sizes for a more compact appearance
    switch (validSize) {
      case 'ultra-small': return 'w-2 h-2';
      case 'extra-small': return 'w-2.5 h-2.5';
      case 'small': return 'w-3 h-3';
      case 'large': return 'w-4 h-4';
      case 'xl': return 'w-4.5 h-4.5';
      default: return 'w-3.5 h-3.5';
    }
  }, [validSize]);

  return (
    <AnimatePresence>
      <motion.div
        className={`group absolute ${positionClass} z-30 ${sizeClass} ${className} ${
          (interactive || onClick) ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent' : ''
        }`}
        variants={variants}
        initial="hidden"
        animate={isLoading ? "loading" : "visible"}
        whileHover={(interactive || onClick) ? "hover" : undefined}
        role={(interactive || onClick) ? "button" : "status"}
        aria-label={generatedAriaLabel}
        aria-live={(interactive || onClick) ? undefined : 'polite'}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        tabIndex={(interactive || onClick) ? 0 : -1}
      >
        {tooltipText && (
          <motion.div 
            className={`absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 
              ${isFocused ? '!visible !opacity-100' : ''}
              transition-opacity duration-200 ${tooltipClass} bg-black/90 text-white text-xs 
              rounded px-2 py-1 whitespace-nowrap z-50 pointer-events-none`}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: tooltipPosition === 'top' ? 10 : -10 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            role="tooltip"
          >
            {tooltipText}
          </motion.div>
        )}

        <div style={customStyle || undefined} className={`relative w-auto h-full rounded-md ${badgeStyle ? badgeStyle : ''} overflow-hidden 
          ${showShadow ? 'shadow-lg' : ''} flex items-center justify-center px-2 sm:px-1 
          min-w-max transition-all duration-200 ${isLoading ? 'cursor-wait' : ''} 
          ${isFocused ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''}`}>
          
          {showLabel && !isLoading && (
            <span className="text-current opacity-80 text-xs mr-1 flex-shrink-0">
              Rating:
            </span>
          )}
          
          {showIcon && !isLoading && (
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              className={`${iconSize} text-current flex-shrink-0`}
              viewBox="0 0 24 24"
              fill="currentColor"
              variants={prefersReducedMotion ? {} : {
                hidden: { opacity: 0, scale: 0.8 },
                visible: { opacity: 1, scale: 1 }
              }}
              aria-hidden="true"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </motion.svg>
          )}
          
          <motion.span
            className="font-semibold sm:font-bold text-current leading-none tracking-tight flex-shrink-0 ml-0.5"
            layout={!prefersReducedMotion}
          >
            {formattedRating}
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
  ]),
  size: PropTypes.oneOf(['ultra-small', 'extra-small', 'small', 'default', 'large', 'xl']),
  showIcon: PropTypes.bool,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  showShadow: PropTypes.bool,
  colorTheme: PropTypes.oneOf(['dark', 'colored']),
  tooltipText: PropTypes.string,
  customColor: PropTypes.string,
  isLoading: PropTypes.bool,
  tooltipPosition: PropTypes.oneOf(['top', 'bottom']),
  onClick: PropTypes.func,
  format: PropTypes.oneOf(['decimal', 'percentage', 'stars']),
  maxRating: PropTypes.number,
  interactive: PropTypes.bool,
  showLabel: PropTypes.bool,
  ariaLabel: PropTypes.string
};

export default React.memo(RatingBadge);