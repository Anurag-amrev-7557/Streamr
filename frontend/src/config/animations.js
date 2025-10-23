/**
 * Centralized Animation Configuration
 * Provides consistent, smooth, and performant animations across the entire application
 * 
 * Benefits:
 * - GPU-accelerated animations (transform, opacity)
 * - Smooth 60fps animations
 * - Consistent timing and easing
 * - Accessible (respects prefers-reduced-motion)
 * - Performance optimized for low-end devices
 */

// Easing curves for smooth, natural motion
export const easings = {
  // Standard easing for most animations - Ultra smooth
  easeOut: [0.16, 1, 0.3, 1], // Silky smooth deceleration
  easeIn: [0.4, 0, 0.6, 1], // Gentle acceleration
  easeInOut: [0.4, 0, 0.2, 1], // Balanced smooth motion
  
  // Specialized easings
  spring: [0.34, 1.2, 0.64, 1], // Gentle spring (reduced bounce)
  smooth: [0.25, 0.46, 0.45, 0.94], // Ultra smooth
  snappy: [0.4, 0, 0.2, 1], // Quick and responsive (kept for specific cases)
  elastic: [0.5, 0.75, 0.4, 1], // Subtle elastic (much less bounce)
  
  // CSS easing strings - Updated for smoothness
  cssEaseOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  cssEaseIn: 'cubic-bezier(0.4, 0, 0.6, 1)',
  cssEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  cssSmooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  cssSnappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// Animation durations (in seconds) - Increased for smoother feel
export const durations = {
  instant: 0,
  fast: 0.2,      // Increased from 0.15
  normal: 0.3,    // Reduced from 0.4 for snappier page loads
  moderate: 0.35, // Reduced from 0.5 for snappier page loads
  slow: 0.5,      // Reduced from 0.7 for snappier page loads
  verySlow: 0.8,  // Reduced from 1 for snappier page loads
};

// Spring configurations for framer-motion - Smoother, less bouncy
export const springs = {
  gentle: {
    type: 'spring',
    stiffness: 80,   // Reduced from 120
    damping: 18,     // Increased from 14
    mass: 0.8,       // Increased from 0.5
  },
  bouncy: {
    type: 'spring',
    stiffness: 150,  // Reduced from 300
    damping: 25,     // Increased from 20
    mass: 1,         // Increased from 0.8
  },
  snappy: {
    type: 'spring',
    stiffness: 250,  // Reduced from 400
    damping: 35,     // Increased from 30
    mass: 0.7,       // Increased from 0.5
  },
  smooth: {
    type: 'spring',
    stiffness: 70,   // Reduced from 100
    damping: 22,     // Increased from 20
    mass: 1.2,       // Increased from 1
  },
};

// Page transition variants - Optimized for perceived performance
export const pageTransitions = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: durations.fast, ease: easings.easeOut }, // Faster for quicker page loads
  },
  slideUp: {
    initial: { opacity: 0, y: 15 }, // Reduced movement
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 }, // Remove y animation on exit for faster transitions
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
  slideDown: {
    initial: { opacity: 0, y: -15 }, // Reduced movement
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 }, // Remove y animation on exit for faster transitions
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 }, // Reduced movement
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0 }, // Remove x animation on exit for faster transitions
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 }, // Reduced movement
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0 }, // Remove x animation on exit for faster transitions
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
  scale: {
    initial: { opacity: 0, scale: 0.97 }, // Less dramatic scale
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0 }, // Remove scale animation on exit for faster transitions
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
  scaleRotate: {
    initial: { opacity: 0, scale: 0.97, rotate: -2 }, // Less dramatic
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0 }, // Remove complex animation on exit for faster transitions
    transition: { duration: durations.normal, ease: easings.easeOut },
  },
};

// Modal/Overlay animations
export const overlayAnimations = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: durations.normal },
  },
  modal: {
    initial: { opacity: 0, scale: 0.9, y: 40 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { duration: durations.moderate, ease: easings.easeOut },
  },
  drawer: {
    initial: { opacity: 0, x: '100%' },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: '100%' },
    transition: { duration: durations.moderate, ease: easings.easeOut },
  },
  slideFromTop: {
    initial: { opacity: 0, y: '-100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '-100%' },
    transition: { duration: durations.moderate, ease: easings.easeOut },
  },
};

// Card animations - Smoother and more subtle
export const cardAnimations = {
  hover: {
    scale: 1.03,  // Reduced from 1.05
    y: -6,        // Reduced from -8
    transition: { duration: durations.moderate, ease: easings.easeOut },
  },
  tap: {
    scale: 0.98,
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
  slideIn: {
    initial: { opacity: 0, y: 20, scale: 0.96 },  // Less scale difference
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: durations.slow, ease: easings.easeOut },  // Slower for smoothness
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: durations.moderate },  // Longer fade
  },
};

// Button/Interactive element animations - Smoother interactions
export const buttonAnimations = {
  hover: {
    scale: 1.03,  // Reduced from 1.05 for subtlety
    transition: { duration: durations.normal, ease: easings.easeOut },
  },
  tap: {
    scale: 0.97,  // Reduced from 0.95 for subtlety
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
  pulse: {
    scale: [1, 1.02, 1],  // Reduced from 1.05 for subtlety
    transition: {
      duration: 2,  // Increased from 1.5 for smoother pulse
      ease: easings.easeInOut,
      repeat: Infinity,
    },
  },
};

// List animations (stagger children)
export const listAnimations = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.03,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: durations.moderate, ease: easings.easeOut },
    },
  },
};

// Stagger animations for grids
export const staggerAnimations = {
  grid: {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.03,
          delayChildren: 0.02,
        },
      },
    },
    item: {
      hidden: { opacity: 0, scale: 0.9 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: durations.normal, ease: easings.easeOut },
      },
    },
  },
  list: {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.08,
          delayChildren: 0.05,
        },
      },
    },
    item: {
      hidden: { opacity: 0, x: -20 },
      visible: {
        opacity: 1,
        x: 0,
        transition: { duration: durations.moderate, ease: easings.easeOut },
      },
    },
  },
};

// Skeleton loading animations
export const skeletonAnimations = {
  pulse: {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: 1.5,
      ease: easings.easeInOut,
      repeat: Infinity,
    },
  },
  shimmer: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

// Notification/Toast animations
export const toastAnimations = {
  slideInRight: {
    initial: { opacity: 0, x: 100, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 100, scale: 0.95 },
    transition: { duration: durations.normal, ease: easings.easeOut },
  },
  slideInTop: {
    initial: { opacity: 0, y: -100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -100 },
    transition: { duration: durations.normal, ease: easings.easeOut },
  },
};

// Image load animations
export const imageAnimations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: durations.moderate },
  },
  blur: {
    initial: { opacity: 0, filter: 'blur(10px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    transition: { duration: durations.moderate },
  },
};

// Navigation animations
export const navAnimations = {
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: durations.normal, ease: easings.easeOut },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: durations.fast },
  },
};

// Scroll-triggered animations
export const scrollAnimations = {
  fadeInUp: {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: durations.moderate, ease: easings.easeOut },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: durations.moderate, ease: easings.easeOut },
  },
};

// Utility function to check for reduced motion preference
// NOTE: Always returns false to enable animations on all devices including mobile
export const shouldReduceMotion = () => {
  return false; // Force animations to work on all devices
};

// Get optimized animation config based on device capabilities
// NOTE: Always returns full animations regardless of device to ensure mobile animations work
export const getAnimationConfig = () => {
  // Always return full animations - no device or preference constraints
  return {
    duration: durations.normal,
    ease: easings.easeOut,
  };
};

// CSS animation classes (for non-framer-motion components)
export const cssAnimationClasses = `
  /* Fade animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  /* Slide animations */
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  /* Scale animations */
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  /* Utility classes */
  .animate-fade-in {
    animation: fadeIn ${durations.normal}s ${easings.cssEaseOut} forwards;
  }
  
  .animate-slide-in-up {
    animation: slideInUp ${durations.moderate}s ${easings.cssEaseOut} forwards;
  }
  
  .animate-slide-in-down {
    animation: slideInDown ${durations.moderate}s ${easings.cssEaseOut} forwards;
  }
  
  .animate-scale-in {
    animation: scaleIn ${durations.normal}s ${easings.cssEaseOut} forwards;
  }
  
  .animate-pulse {
    animation: pulse 2s ${easings.cssEaseInOut} infinite;
  }
  
  /* Smooth transitions */
  .transition-smooth {
    transition: all ${durations.normal}s ${easings.cssSmooth};
  }
  
  .transition-colors {
    transition: background-color ${durations.normal}s ${easings.cssEaseOut},
                color ${durations.normal}s ${easings.cssEaseOut},
                border-color ${durations.normal}s ${easings.cssEaseOut};
  }
  
  .transition-transform {
    transition: transform ${durations.normal}s ${easings.cssEaseOut};
  }
  
  .transition-opacity {
    transition: opacity ${durations.normal}s ${easings.cssEaseOut};
  }
  
  /* GPU acceleration */
  .gpu-accelerated {
    transform: translateZ(0);
    will-change: transform, opacity;
  }
  
  /* Hover effects */
  .hover-lift {
    transition: transform ${durations.normal}s ${easings.cssEaseOut};
  }
  
  .hover-lift:hover {
    transform: translateY(-4px) translateZ(0);
  }
  
  .hover-scale {
    transition: transform ${durations.normal}s ${easings.cssEaseOut};
  }
  
  .hover-scale:hover {
    transform: scale(1.05) translateZ(0);
  }
  
  /* Reduced motion support - DISABLED to enable animations on all devices including mobile */
  /* Animations will work on all devices without reduced motion constraints */
`;

export default {
  easings,
  durations,
  springs,
  pageTransitions,
  overlayAnimations,
  cardAnimations,
  buttonAnimations,
  listAnimations,
  staggerAnimations,
  skeletonAnimations,
  toastAnimations,
  imageAnimations,
  navAnimations,
  scrollAnimations,
  shouldReduceMotion,
  getAnimationConfig,
  cssAnimationClasses,
};
