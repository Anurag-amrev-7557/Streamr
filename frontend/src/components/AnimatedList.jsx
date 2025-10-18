/**
 * Animated List Component
 * Provides stagger animations for lists and grids
 */
import React from 'react';
import { motion } from 'framer-motion';
import { listAnimations, staggerAnimations } from '../config/animations';

export const AnimatedList = ({ 
  children, 
  className = '',
  type = 'list' // 'list' or 'grid'
}) => {
  const animations = type === 'grid' ? staggerAnimations.grid : staggerAnimations.list;

  return (
    <motion.div
      variants={animations.container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const AnimatedListItem = ({ 
  children, 
  className = '',
  type = 'list',
  ...props
}) => {
  const animations = type === 'grid' ? staggerAnimations.grid : staggerAnimations.list;

  return (
    <motion.div
      variants={animations.item}
      className={className}
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform, opacity',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedList;
