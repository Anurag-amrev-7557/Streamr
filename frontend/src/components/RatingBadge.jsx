import * as React from 'react';
import { motion } from 'framer-motion';

const RatingBadge = ({ rating, size = 'default', className = '', position = 'top-2 left-2' }) => {
  // Format rating to one decimal place
  const formattedRating = rating ? parseFloat(rating).toFixed(1) : 'N/A';
  
  // Determine if rating is good (7+), average (5-7), or poor (<5)
  const getRatingColor = (rating) => {
    if (!rating || rating === 'N/A') return 'text-gray-400';
    const numRating = parseFloat(rating);
    if (numRating >= 7) return 'text-white';
    if (numRating >= 5) return 'text-gray-300';
    return 'text-gray-400';
  };

  const getRatingBg = (rating) => {
    if (!rating || rating === 'N/A') return 'bg-black/50';
    const numRating = parseFloat(rating);
    if (numRating >= 7) return 'bg-black/70';
    if (numRating >= 5) return 'bg-black/60';
    return 'bg-black/50';
  };

  // Enhanced minimalist sizing
  const sizeClasses = {
    small: 'px-1.5 py-0.5 text-xs h-5',
    default: 'px-2 py-0.5 text-xs h-6',
    large: 'px-2.5 py-1 text-sm h-7'
  };

  const starSizeClasses = {
    small: 'h-2.5 w-2.5',
    default: 'h-3 w-3',
    large: 'h-3.5 w-3.5'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`
        absolute ${position} z-20 
        ${getRatingBg(rating)} 
        ${getRatingColor(rating)}
        ${sizeClasses[size]}
        rounded-full 
        backdrop-blur-md
        border border-white/5
        shadow-sm
        font-medium
        flex items-center justify-center gap-1
        min-w-[2.5rem]
        ${className}
      `}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`${starSizeClasses[size]} text-white flex-shrink-0`} 
        viewBox="0 0 24 24" 
        fill="currentColor"
      >
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
      <span className="font-semibold tracking-tight text-xs">{formattedRating}</span>
    </motion.div>
  );
};

export default RatingBadge; 