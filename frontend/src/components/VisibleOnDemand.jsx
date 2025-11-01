import React, { useState, useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import useReducedMotion from '../hooks/useReducedMotion';
import { defaultTransition } from '../utils/animationVariants';

// Local helper: detect reduced motion or low-power/network conditions.
// Keep this here to avoid cross-file imports and possible HMR/export issues.
const getReducedMotionOrLowPower = () => {
  if (typeof window === 'undefined') return false;

  try {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const connection = navigator && (navigator.connection || null);
    const saveData = connection && typeof connection.saveData === 'boolean' ? connection.saveData : false;
    const effectiveType = connection && connection.effectiveType ? connection.effectiveType : null;
    const slowEffectiveType = effectiveType && ['slow-2g', '2g'].includes(effectiveType);

    return Boolean(prefersReducedMotion || saveData || slowEffectiveType);
  } catch (e) {
    return false;
  }
};

// Defensive VisibleOnDemand component extracted to its own module to avoid
// large single-file HMR / hook-order issues and ensure hook order stability.
const VisibleOnDemand = ({ children, rootMargin = '400px', placeholderHeight = 300 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const ref = useRef(null);

  // keep hook call stable
  const reducedMotionHook = useReducedMotion();
  const shouldReduceMotion = getReducedMotionOrLowPower() || reducedMotionHook;

  useEffect(() => {
    if (!ref.current || isVisible) return;

    let observer;
    try {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry && (entry.isIntersecting || entry.intersectionRatio > 0)) {
          setIsVisible(true);
          if (observer && typeof observer.disconnect === 'function') observer.disconnect();

          // wait for paint then enable animation
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setShouldAnimate(true);
            });
          });
        }
      }, {
        root: null,
        rootMargin,
        threshold: 0.01
      });

      observer.observe(ref.current);
    } catch (e) {
      // Fallback: render immediately
      setIsVisible(true);
      setShouldAnimate(true);
    }

    return () => {
      if (observer) {
        try { observer.disconnect(); } catch (_) {}
      }
    };
  }, [rootMargin, isVisible]);

  return (
    <div ref={ref} style={{ minHeight: placeholderHeight }}>
      {isVisible ? (
        shouldReduceMotion ? (
          <div style={{ contain: 'layout style paint' }}>{children}</div>
        ) : (
          <motion.div
            style={{ contain: 'layout style paint', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', perspective: 1000 }}
            initial={{ opacity: 0, y: 20 }}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={shouldReduceMotion ? { duration: 0 } : { ...defaultTransition, duration: 0.5 }}
          >
            {children}
          </motion.div>
        )
      ) : (
        <div style={{ height: placeholderHeight }} aria-hidden="true" />
      )}
    </div>
  );
};

export default memo(VisibleOnDemand);
