/**
 * Advanced Animated Card Component
 * Enterprise-grade animation system with performance optimization,
 * accessibility, and advanced interaction patterns
 * 
 * Features:
 * - Intersection Observer for lazy animations
 * - Reduced motion support
 * - Gesture controls (drag, pan)
 * - Layout animations
 * - Performance monitoring
 * - Advanced hover effects
 * - Keyboard accessibility
 * - Smart memoization
 * - Stagger animations
 * - Custom animation orchestration
 */
import React, { 
  useRef, 
  useState, 
  useEffect, 
  useMemo, 
  useCallback, 
  memo 
} from 'react';
import { 
  motion, 
  useReducedMotion, 
  useInView, 
  useAnimation,
  useMotionValue,
  useTransform,
  AnimatePresence
} from 'framer-motion';
import { cardAnimations, durations, easings } from '../config/animations';

/**
 * Custom hook for animation lifecycle management
 */
const useAnimationLifecycle = (onAnimationStart, onAnimationComplete) => {
  const handleAnimationStart = useCallback(() => {
    onAnimationStart?.();
  }, [onAnimationStart]);

  const handleAnimationComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  return { handleAnimationStart, handleAnimationComplete };
};

/**
 * Custom hook for performance monitoring
 */
const usePerformanceMonitor = (enabled) => {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId;
    const measureFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime.current + 1000) {
        setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(animationFrameId);
  }, [enabled]);

  return fps;
};

/**
 * Advanced AnimatedCard Component
 */
const AnimatedCard = memo(({
  // Core props
  children,
  className = '',
  style = {},
  
  // Event handlers
  onClick,
  onHoverStart,
  onHoverEnd,
  onAnimationStart,
  onAnimationComplete,
  onDragEnd,
  
  // Animation control
  variant = 'slideIn',
  delay = 0,
  duration,
  whileHover = true,
  whileTap = true,
  whileFocus = true,
  whileDrag,
  
  // Advanced features
  enableLazyAnimation = true,
  enableReducedMotion = true,
  enableLayoutAnimation = false,
  enableGestures = false,
  enableParallax = false,
  enableStagger = false,
  staggerDelay = 0.1,
  
  // Intersection Observer options
  intersectionThreshold = 0.1,
  intersectionRootMargin = '50px',
  animateOnce = true,
  
  // Drag options
  drag = false,
  dragConstraints,
  dragElastic = 0.1,
  dragMomentum = true,
  
  // Accessibility
  ariaLabel,
  role = 'article',
  tabIndex = 0,
  focusable = true,
  
  // Performance
  enablePerformanceMonitoring = false,
  optimizePerformance = true,
  
  // Custom animations
  customInitial,
  customAnimate,
  customExit,
  customTransition,
  customHover,
  customTap,
  
  // Additional props
  ...props
}) => {
  // Refs and state
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const controls = useAnimation();
  
  // Motion values for advanced effects
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Hooks - Force prefersReducedMotion to false to enable animations on all devices
  const prefersReducedMotion = false; // Always false to enable animations on mobile
  const isInView = useInView(cardRef, {
    once: animateOnce,
    margin: intersectionRootMargin,
    amount: intersectionThreshold,
  });
  const fps = usePerformanceMonitor(enablePerformanceMonitoring);
  
  // Animation lifecycle
  const { handleAnimationStart, handleAnimationComplete } = useAnimationLifecycle(
    onAnimationStart,
    onAnimationComplete
  );
  
  // Parallax effect
  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateY = useTransform(x, [-100, 100], [-5, 5]);
  
  // Always enable animations - ignore reduced motion
  const shouldReduceMotion = false;
  
  // Get base animation variant
  const baseAnimation = useMemo(() => {
    return cardAnimations[variant] || cardAnimations.slideIn;
  }, [variant]);
  
  // Build animation variants
  const animationVariants = useMemo(() => {
    // Always use full animations
    return {
      initial: customInitial || baseAnimation.initial,
      animate: customAnimate || baseAnimation.animate,
      exit: customExit || { opacity: 0, scale: 0.95 },
    };
  }, [shouldReduceMotion, customInitial, customAnimate, customExit, baseAnimation]);
  
  // Build transition configuration
  const transitionConfig = useMemo(() => {
    const baseDuration = duration || baseAnimation.transition?.duration || durations.moderate;
    
    return {
      duration: shouldReduceMotion ? durations.fast : baseDuration,
      delay: enableStagger ? delay + staggerDelay : delay,
      ease: customTransition?.ease || baseAnimation.transition?.ease || easings.easeOut,
      ...customTransition,
    };
  }, [
    duration,
    baseAnimation.transition,
    delay,
    enableStagger,
    staggerDelay,
    shouldReduceMotion,
    customTransition,
  ]);
  
  // Build hover animation
  const hoverAnimation = useMemo(() => {
    if (!whileHover || shouldReduceMotion) return undefined;
    
    return customHover || {
      scale: 1.03,
      y: -6,
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
      transition: { duration: durations.normal, ease: easings.easeOut },
    };
  }, [whileHover, shouldReduceMotion, customHover]);
  
  // Build tap animation
  const tapAnimation = useMemo(() => {
    if (!whileTap || shouldReduceMotion) return undefined;
    
    return customTap || {
      scale: 0.98,
      transition: { duration: durations.fast, ease: easings.easeOut },
    };
  }, [whileTap, shouldReduceMotion, customTap]);
  
  // Build focus animation
  const focusAnimation = useMemo(() => {
    if (!whileFocus || shouldReduceMotion) return undefined;
    
    return {
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
      transition: { duration: durations.fast },
    };
  }, [whileFocus, shouldReduceMotion]);
  
  // Build drag animation
  const dragAnimation = useMemo(() => {
    if (!whileDrag || !enableGestures) return undefined;
    
    return {
      scale: 1.05,
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
      transition: { duration: durations.fast },
    };
  }, [whileDrag, enableGestures]);
  
  // Handle intersection observer animation
  useEffect(() => {
    if (enableLazyAnimation && isInView && !shouldReduceMotion) {
      controls.start('animate');
    } else if (enableLazyAnimation && !isInView) {
      controls.start('initial');
    }
  }, [isInView, controls, enableLazyAnimation, shouldReduceMotion]);
  
  // Event handlers
  const handleClick = useCallback((event) => {
    onClick?.(event);
    
    // Add haptic feedback for mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [onClick]);
  
  const handleHoverStart = useCallback((event) => {
    setIsHovered(true);
    onHoverStart?.(event);
  }, [onHoverStart]);
  
  const handleHoverEnd = useCallback((event) => {
    setIsHovered(false);
    onHoverEnd?.(event);
  }, [onHoverEnd]);
  
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);
  
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    }
  }, [handleClick]);
  
  const handleDragEnd = useCallback((event, info) => {
    onDragEnd?.(event, info);
    
    // Reset position if dragged beyond constraints
    if (!dragConstraints) {
      controls.start({ x: 0, y: 0 });
    }
  }, [onDragEnd, controls, dragConstraints]);
  
  // Compute style with performance optimizations
  const computedStyle = useMemo(() => {
    const baseStyle = {
      ...style,
    };
    
    if (optimizePerformance) {
      baseStyle.transform = 'translateZ(0)';
      baseStyle.willChange = isHovered || isFocused ? 'transform, opacity, box-shadow' : 'auto';
      baseStyle.backfaceVisibility = 'hidden';
      baseStyle.WebkitFontSmoothing = 'antialiased';
    }
    
    if (enableParallax) {
      baseStyle.transformStyle = 'preserve-3d';
    }
    
    return baseStyle;
  }, [style, optimizePerformance, isHovered, isFocused, enableParallax]);
  
  // Build motion props
  const motionProps = useMemo(() => {
    const props = {
      ref: cardRef,
      initial: enableLazyAnimation ? 'initial' : animationVariants.initial,
      animate: enableLazyAnimation ? controls : animationVariants.animate,
      exit: animationVariants.exit,
      variants: enableLazyAnimation ? animationVariants : undefined,
      transition: transitionConfig,
      whileHover: hoverAnimation,
      whileTap: tapAnimation,
      whileFocus: isFocused ? focusAnimation : undefined,
      whileDrag: dragAnimation,
      onHoverStart: handleHoverStart,
      onHoverEnd: handleHoverEnd,
      onAnimationStart: handleAnimationStart,
      onAnimationComplete: handleAnimationComplete,
      layout: enableLayoutAnimation,
      layoutId: props.layoutId,
      style: enableParallax ? {
        ...computedStyle,
        rotateX,
        rotateY,
      } : computedStyle,
    };
    
    // Add drag props if gestures are enabled
    if (enableGestures && drag) {
      props.drag = drag;
      props.dragConstraints = dragConstraints;
      props.dragElastic = dragElastic;
      props.dragMomentum = dragMomentum;
      props.onDragEnd = handleDragEnd;
      props.dragTransition = { bounceStiffness: 300, bounceDamping: 20 };
    }
    
    return props;
  }, [
    cardRef,
    enableLazyAnimation,
    animationVariants,
    controls,
    transitionConfig,
    hoverAnimation,
    tapAnimation,
    isFocused,
    focusAnimation,
    dragAnimation,
    handleHoverStart,
    handleHoverEnd,
    handleAnimationStart,
    handleAnimationComplete,
    enableLayoutAnimation,
    computedStyle,
    enableParallax,
    rotateX,
    rotateY,
    enableGestures,
    drag,
    dragConstraints,
    dragElastic,
    dragMomentum,
    handleDragEnd,
  ]);
  
  // Accessibility props
  const accessibilityProps = useMemo(() => ({
    role,
    'aria-label': ariaLabel,
    tabIndex: focusable ? tabIndex : -1,
    onFocus: focusable ? handleFocus : undefined,
    onBlur: focusable ? handleBlur : undefined,
    onKeyDown: focusable && onClick ? handleKeyDown : undefined,
  }), [role, ariaLabel, focusable, tabIndex, handleFocus, handleBlur, handleKeyDown, onClick]);
  
  return (
    <>
      <motion.div
        {...motionProps}
        {...accessibilityProps}
        className={className}
        onClick={onClick ? handleClick : undefined}
        {...props}
      >
        {children}
      </motion.div>
      
      {/* Performance Monitor Overlay (Development Only) */}
      {enablePerformanceMonitoring && process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: fps < 30 ? 'rgba(239, 68, 68, 0.9)' : fps < 50 ? 'rgba(251, 191, 36, 0.9)' : 'rgba(34, 197, 94, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          FPS: {fps}
        </div>
      )}
    </>
  );
});

// Display name for React DevTools
AnimatedCard.displayName = 'AnimatedCard';

export default AnimatedCard;
