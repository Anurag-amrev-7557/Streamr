import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

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
  variant = "default" // "default", "primary", "secondary", "minimal"
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (totalItems === 0) return 0;
    return Math.min(100, (displayedItems / totalItems) * 100);
  }, [displayedItems, totalItems]);

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
          button: "bg-gradient-to-r from-primary/80 to-primary/60 hover:from-primary/90 hover:to-primary/70 text-white border-primary/30 hover:border-primary/50",
          progress: "bg-gradient-to-r from-primary/60 to-primary/40",
          badge: "bg-white/20 text-white border-white/30"
        };
      case "secondary":
        return {
          button: "bg-gradient-to-r from-gray-600/80 to-gray-500/60 hover:from-gray-600/90 hover:to-gray-500/70 text-white border-gray-500/30 hover:border-gray-500/50",
          progress: "bg-gradient-to-r from-gray-500/60 to-gray-400/40",
          badge: "bg-white/20 text-white border-white/30"
        };
      case "minimal":
        return {
          button: "bg-transparent hover:bg-white/5 text-white/80 border-white/10 hover:border-white/20",
          progress: "bg-white/20",
          badge: "bg-white/10 text-white/70 border-white/20"
        };
      default:
        return {
          button: "bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white/90 border-white/20 hover:border-white/30",
          progress: "bg-gradient-to-r from-primary/60 to-primary",
          badge: "bg-primary/20 text-primary border-primary/30"
        };
    }
  }, [variant]);

  // Enhanced animation variants
  const buttonVariants = useMemo(() => ({
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
    }
  }), []);

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

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoading && !disabled && hasMore && onClick) {
      onClick();
    }
  }, [isLoading, disabled, hasMore, onClick]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  if (!hasMore) {
    return null;
  }

  return (
    <motion.div 
      className={`flex flex-col items-center gap-3 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Progress Bar */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
            <span>Progress</span>
            <span>{displayedItems} / {totalItems} {itemName}</span>
          </div>
          <div className={`w-full ${sizeClasses.progress} bg-white/10 rounded-full overflow-hidden`}>
            <motion.div
              className={`h-full rounded-full ${variantClasses.progress}`}
              variants={progressVariants}
              initial="initial"
              animate="animate"
            />
          </div>
        </div>
      )}

      {/* Enhanced Load More Button */}
      <motion.button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        disabled={isLoading || disabled}
        className={`
          relative flex items-center gap-3 ${sizeClasses.button}
          ${variantClasses.button}
          disabled:opacity-50 disabled:cursor-not-allowed
          rounded-xl font-medium transition-all duration-200
          shadow-lg backdrop-blur-sm
          ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
        `}
        variants={buttonVariants}
        initial="initial"
        animate={isPressed ? "pressed" : isHovered ? "hover" : "initial"}
        whileHover="hover"
        whileTap="pressed"
      >
        {/* Loading Spinner or Arrow Icon - Now on the left */}
        <motion.div
          variants={iconVariants}
          initial="initial"
          animate={isLoading ? "loading" : isHovered ? "hover" : "initial"}
          className="flex-shrink-0 mb-2"
        >
          {isLoading ? (
            <svg className={`${sizeClasses.icon} text-primary`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className={`${sizeClasses.icon} text-white/80`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7" />
            </svg>
          )}
        </motion.div>

        {/* Button Text */}
        <span className="font-medium flex-1 text-center">
          {isLoading ? loadingText : buttonText}
        </span>

        {/* Item Count Badge - Now on the right */}
        {showCount && !isLoading && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className={`${sizeClasses.badge} ${variantClasses.badge} font-semibold rounded-full border flex-shrink-0`}
          >
            +{Math.min(10, totalItems - displayedItems)}
          </motion.div>
        )}

        {/* Ripple Effect */}
        <motion.div
          className="absolute inset-0 rounded-xl bg-white/10"
          initial={{ scale: 0, opacity: 0 }}
          animate={isPressed ? { scale: 1, opacity: 0 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>

      {/* Loading Status */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs text-white/50"
        >
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Fetching {itemName}...</span>
        </motion.div>
      )}
    </motion.div>
  );
});

EnhancedLoadMoreButton.displayName = 'EnhancedLoadMoreButton';

export default EnhancedLoadMoreButton; 