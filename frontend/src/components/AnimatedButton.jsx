/**
 * Animated Button Component
 * Provides consistent button animations and micro-interactions
 */
import React from 'react';
import { motion } from 'framer-motion';
import { buttonAnimations } from '../config/animations';

const AnimatedButton = ({
  children,
  className = '',
  onClick,
  disabled = false,
  variant = 'default',
  pulse = false,
  ...props
}) => {
  const baseClasses = 'relative overflow-hidden';

  return (
    <motion.button
      whileHover={!disabled ? buttonAnimations.hover : undefined}
      whileTap={!disabled ? buttonAnimations.tap : undefined}
      animate={pulse ? buttonAnimations.pulse : undefined}
      className={`${baseClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default AnimatedButton;
