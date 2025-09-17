import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const RatingBadge = ({ 
  rating, 
  size = 'default', 
  showIcon = true, 
  className = '',
  position = 'top-left', // top-left, top-right, bottom-left, bottom-right
  showShadow = false // Optional subtle shadow for better visibility
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

  // Dark theme with subtle opacity variations
  const getBadgeStyle = (rating) => {
    if (rating >= 8.5) return 'bg-black/90 text-white';
    if (rating >= 7.5) return 'bg-black/80 text-white';
    if (rating >= 6.5) return 'bg-black/70 text-white';
    if (rating >= 5.5) return 'bg-black/60 text-white';
    return 'bg-black/50 text-white';
  };

  const badgeStyle = getBadgeStyle(normalizedRating);

  return (
    <motion.div
      className={`absolute ${positionClasses[validPosition]} z-30 ${sizeClasses[validSize]} ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.1
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
    >
      {/* Rectangular dark theme badge */}
      <div className={`relative w-auto h-full ${validSize === 'ultra-small' ? 'rounded-sm' : validSize === 'extra-small' ? 'rounded-sm' : validSize === 'small' ? 'rounded-sm' : validSize === 'default' ? 'rounded-md' : validSize === 'large' ? 'rounded-lg' : 'rounded-xl'} ${badgeStyle} overflow-hidden ${showShadow ? 'shadow-lg' : ''} flex items-center justify-center px-2 sm:px-1 min-w-max`}>
        {/* Star icon */}
        {showIcon && (
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${validSize === 'ultra-small' ? 'w-1.5 h-1.5 sm:w-2 sm:h-2' : validSize === 'extra-small' ? 'w-1.5 h-1.5 sm:w-2 sm:h-2' : validSize === 'small' ? 'w-2 h-2 sm:w-2.5 sm:h-2.5' : validSize === 'default' ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : validSize === 'large' ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} text-white flex-shrink-0`}
            viewBox="0 0 24 24"
            fill="currentColor"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </motion.svg>
        )}
        
        {/* Rating number */}
        <motion.span
          className={`font-semibold sm:font-bold text-white leading-none tracking-tight flex-shrink-0 ${validSize === 'ultra-small' ? 'ml-0.5 sm:ml-0.5' : validSize === 'extra-small' ? 'ml-0.5 sm:ml-0.5' : validSize === 'small' ? 'ml-0.5 sm:ml-1' : validSize === 'default' ? 'ml-1 sm:ml-1.5' : validSize === 'large' ? 'ml-1.5 sm:ml-2' : 'ml-2 sm:ml-2.5'}`}
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {normalizedRating.toFixed(1)}
        </motion.span>
      </div>
    </motion.div>
  );
};

// Add PropTypes for better type safety and error prevention
RatingBadge.propTypes = {
  rating: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired,
  size: PropTypes.oneOf(['ultra-small', 'extra-small', 'small', 'default', 'large', 'xl']),
  showIcon: PropTypes.bool,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  showShadow: PropTypes.bool
};

export default RatingBadge; 