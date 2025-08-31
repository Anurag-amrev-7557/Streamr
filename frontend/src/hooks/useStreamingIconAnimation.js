import { useState, useEffect, useRef, useCallback } from 'react';

// Enhanced streaming service colors and gradients for richer UI
const STREAMING_COLORS = {
  netflix: '#E50914', // Netflix red
  prime: '#00A8E1',   // Prime Video sky blue
  hulu: '#1CE783',    // Hulu green
  hbo: '#221f1f',     // HBO dark
  disney: '#113CCF',  // Disney+ dark blue
  apple: '#000000',   // Apple TV+ black
  popular: '#fbbf24', // Gold for "popular"
  top_rated: '#60a5fa', // Blue for "top rated"
  trending: '#f472b6', // Pink for "trending"
  upcoming: '#f87171', // Red for "upcoming" (was lime)
};

const STREAMING_GRADIENTS = {
  netflix: 'linear-gradient(90deg, #E50914 0%, #B0060F 100%)',
  prime: 'linear-gradient(90deg, #00A8E1 0%, #005377 100%)',
  hulu: 'linear-gradient(90deg, #1CE783 0%, #0B5C2E 100%)',
  hbo: 'linear-gradient(90deg, #221f1f 0%, #6e6e6e 100%)',
  disney: 'linear-gradient(90deg, #113CCF 0%, #0a1a3c 100%)',
  apple: 'linear-gradient(90deg, #000000 0%, #434343 100%)',
  popular: 'linear-gradient(90deg, #fbbf24 0%, #f59e42 100%)',
  top_rated: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)',
  trending: 'linear-gradient(90deg, #f472b6 0%, #be185d 100%)',
  upcoming: 'linear-gradient(90deg, #f87171 0%, #b91c1c 100%)', // Red gradient for "upcoming"
};

export const useStreamingIconAnimation = (activeCategory) => {
  const [iconColors, setIconColors] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastCategory, setLastCategory] = useState(null);
  const transitionTimeoutRef = useRef(null);

  // Enhanced: Track last active category for smoother transitions
  useEffect(() => {
    setLastCategory(activeCategory);
  }, [activeCategory]);

  // Enhanced: Animate color transitions and prevent memory leaks
  useEffect(() => {
    setIsTransitioning(true);
    setIconColors({});

    if (activeCategory && STREAMING_COLORS[activeCategory]) {
      setIconColors(prev => ({
        ...prev,
        [activeCategory]: STREAMING_COLORS[activeCategory]
      }));
    }

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 500);

    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [activeCategory]);

  // Enhanced: Get color or gradient for an icon
  const getIconColor = useCallback((categoryId, { gradient = false } = {}) => {
    if (categoryId === activeCategory && STREAMING_COLORS[categoryId]) {
      if (gradient && STREAMING_GRADIENTS[categoryId]) {
        return STREAMING_GRADIENTS[categoryId];
      }
      return STREAMING_COLORS[categoryId];
    }
    if (gradient && STREAMING_GRADIENTS[categoryId]) {
      return STREAMING_GRADIENTS[categoryId];
    }
    return iconColors[categoryId] || 'currentColor';
  }, [activeCategory, iconColors]);

  // Enhanced: Provide a subtle shadow for the active icon
  const getIconShadow = useCallback((categoryId) => {
    if (categoryId === activeCategory && STREAMING_COLORS[categoryId]) {
      return `0 2px 8px 0 ${STREAMING_COLORS[categoryId]}55`;
    }
    return 'none';
  }, [activeCategory]);

  // Enhanced: More natural spring for rubber band effect
  const getRubberBandTransition = useCallback(() => ({
    type: 'spring',
    stiffness: 500,
    damping: 22,
    mass: 0.9,
    duration: 0.55,
    restDelta: 0.001,
    restSpeed: 0.001,
    ease: [0.25, 0.46, 0.45, 0.94]
  }), []);

  // Enhanced: Background transition for moving highlight
  const getBackgroundTransition = useCallback(() => ({
    type: 'spring',
    stiffness: 320,
    damping: 28,
    mass: 1.1,
    duration: 0.42,
    restDelta: 0.001,
    restSpeed: 0.001,
    ease: [0.25, 0.46, 0.45, 0.94]
  }), []);

  // Enhanced: Rubber band animation with bounce and color fade
  const getRubberBandVariants = useCallback(() => ({
    initial: { 
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.8,
      filter: 'brightness(0.95)'
    },
    animate: { 
      scale: [1, 1.22, 0.98, 1],
      scaleX: [1, 1.08, 0.98, 1],
      scaleY: [1, 0.7, 1.05, 1],
      opacity: [0.8, 1, 1, 1],
      filter: [
        'brightness(0.95)',
        'brightness(1.15) drop-shadow(0 2px 8px #fff2)',
        'brightness(1.05)',
        'brightness(1)'
      ],
      transition: {
        scale: {
          duration: 0.55,
          times: [0, 0.4, 0.7, 1],
          ease: [0.25, 0.46, 0.45, 0.94]
        },
        scaleX: {
          duration: 0.55,
          times: [0, 0.4, 0.7, 1],
          ease: [0.25, 0.46, 0.45, 0.94]
        },
        scaleY: {
          duration: 0.55,
          times: [0, 0.4, 0.7, 1],
          ease: [0.25, 0.46, 0.45, 0.94]
        },
        opacity: {
          duration: 0.3,
          times: [0, 0.4, 1]
        },
        filter: {
          duration: 0.55,
          times: [0, 0.4, 0.7, 1]
        }
      }
    },
    exit: { 
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.8,
      filter: 'brightness(0.95)'
    }
  }), []);

  // Enhanced: Expose gradients and shadow for advanced UI
  return {
    getIconColor,
    getIconShadow,
    isTransitioning,
    getRubberBandTransition,
    getBackgroundTransition,
    getRubberBandVariants,
    gradients: STREAMING_GRADIENTS,
    colors: STREAMING_COLORS,
    lastCategory
  };
};
