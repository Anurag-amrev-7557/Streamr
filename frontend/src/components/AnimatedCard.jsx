/**
 * Animated Card Component
 * Provides consistent card animations across the application
 */
import React from 'react';
import { motion } from 'framer-motion';
import { cardAnimations } from '../config/animations';

const AnimatedCard = ({
  children,
  className = '',
  onClick,
  whileHover = true,
  whileTap = true,
  variant = 'slideIn',
  delay = 0,
  ...props
}) => {
  const animation = cardAnimations[variant] || cardAnimations.slideIn;

  return (
    <motion.div
      initial={animation.initial}
      animate={animation.animate}
      whileHover={whileHover ? cardAnimations.hover : undefined}
      whileTap={whileTap ? cardAnimations.tap : undefined}
      transition={{
        ...animation.transition,
        delay,
      }}
      className={className}
      onClick={onClick}
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

export default AnimatedCard;
