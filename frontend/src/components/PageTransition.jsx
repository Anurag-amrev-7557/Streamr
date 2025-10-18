/**
 * Page Transition Wrapper Component
 * Provides smooth animations between route changes
 * Optimized for perceived performance - fast entry, instant exit
 */
import React from 'react';
import { motion } from 'framer-motion';
import { pageTransitions } from '../config/animations';

const PageTransition = ({ 
  children, 
  variant = 'fadeIn', 
  className = '' 
}) => {
  const animation = pageTransitions[variant] || pageTransitions.fadeIn;

  return (
    <motion.div
      initial={animation.initial}
      animate={animation.animate}
      exit={animation.exit}
      transition={animation.transition}
      className={className}
      style={{
        width: '100%',
        // Removed minHeight to prevent layout issues
        transform: 'translateZ(0)', // GPU acceleration
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
