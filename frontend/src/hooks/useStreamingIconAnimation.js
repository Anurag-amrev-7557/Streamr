import { useState, useEffect, useRef, useCallback } from 'react';

// 🚀 Ultra-Enhanced streaming service colors, gradients, and effects for a premium UI
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
  upcoming: '#f87171', // Red for "upcoming"
  paramount: '#0055A4', // Paramount+ blue
  peacock: '#FFC72C', // Peacock yellow
  starz: '#231F20', // Starz black
  discovery: '#00AEEF', // Discovery+ blue
  crunchyroll: '#F47521', // Crunchyroll orange
  criterion: '#B6A179', // Criterion gold
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
  upcoming: 'linear-gradient(90deg, #f87171 0%, #b91c1c 100%)',
  paramount: 'linear-gradient(90deg, #0055A4 0%, #00B4D8 100%)',
  peacock: 'linear-gradient(90deg, #FFC72C 0%, #FFD700 100%)',
  starz: 'linear-gradient(90deg, #231F20 0%, #434343 100%)',
  discovery: 'linear-gradient(90deg, #00AEEF 0%, #005377 100%)',
  crunchyroll: 'linear-gradient(90deg, #F47521 0%, #FFB347 100%)',
  criterion: 'linear-gradient(90deg, #B6A179 0%, #E5D3B3 100%)',
};

// Extra: Animated glow and shadow for active icons
const getGlowShadow = (color) =>
  `0 0 0 0 ${color}00, 0 2px 8px 0 ${color}55, 0 0 16px 2px ${color}33`;

export const useStreamingIconAnimation = (activeCategory, options = {}) => {
  const [iconColors, setIconColors] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastCategory, setLastCategory] = useState(null);
  const [transitionProgress, setTransitionProgress] = useState(0); // 0-1 for animation progress
  const transitionTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Track last active category for smoother transitions
  useEffect(() => {
    setLastCategory(activeCategory);
  }, [activeCategory]);

  // Animate color transitions and prevent memory leaks
  useEffect(() => {
    setIsTransitioning(true);
    setIconColors({});
    setTransitionProgress(0);

    // Animate transition progress for advanced effects
    let start;
    const duration = 500;
    function animate(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      setTransitionProgress(progress);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }
    animationFrameRef.current = requestAnimationFrame(animate);

    if (activeCategory && STREAMING_COLORS[activeCategory]) {
      setIconColors((prev) => ({
        ...prev,
        [activeCategory]: STREAMING_COLORS[activeCategory],
      }));
    }

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setTransitionProgress(1);
    }, duration);

    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [activeCategory]);

  // Get color or gradient for an icon, with optional animated progress
  const getIconColor = useCallback(
    (categoryId, { gradient = false, animated = false } = {}) => {
      if (categoryId === activeCategory && STREAMING_COLORS[categoryId]) {
        if (gradient && STREAMING_GRADIENTS[categoryId]) {
          // Optionally animate gradient (future enhancement)
          return STREAMING_GRADIENTS[categoryId];
        }
        if (animated && transitionProgress < 1) {
          // Animate color fade-in
          const color = STREAMING_COLORS[categoryId];
          return color + Math.floor(transitionProgress * 255).toString(16).padStart(2, '0');
        }
        return STREAMING_COLORS[categoryId];
      }
      if (gradient && STREAMING_GRADIENTS[categoryId]) {
        return STREAMING_GRADIENTS[categoryId];
      }
      return iconColors[categoryId] || 'currentColor';
    },
    [activeCategory, iconColors, transitionProgress]
  );

  // Provide a subtle shadow or animated glow for the active icon
  const getIconShadow = useCallback(
    (categoryId, { animated = false } = {}) => {
      if (categoryId === activeCategory && STREAMING_COLORS[categoryId]) {
        if (animated && transitionProgress < 1) {
          // Animate shadow intensity
          const alpha = Math.floor(transitionProgress * 85)
            .toString(16)
            .padStart(2, '0');
          return `0 2px 8px 0 ${STREAMING_COLORS[categoryId]}${alpha}`;
        }
        return getGlowShadow(STREAMING_COLORS[categoryId]);
      }
      return 'none';
    },
    [activeCategory, transitionProgress]
  );

  // More natural spring for rubber band effect, with optional custom stiffness
  const getRubberBandTransition = useCallback(
    () => ({
      type: 'spring',
      stiffness: options.stiffness || 500,
      damping: options.damping || 22,
      mass: options.mass || 0.9,
      duration: options.duration || 0.55,
      restDelta: 0.001,
      restSpeed: 0.001,
      ease: [0.25, 0.46, 0.45, 0.94],
    }),
    [options.stiffness, options.damping, options.mass, options.duration]
  );

  // Background transition for moving highlight, customizable
  const getBackgroundTransition = useCallback(
    () => ({
      type: 'spring',
      stiffness: options.bgStiffness || 320,
      damping: options.bgDamping || 28,
      mass: options.bgMass || 1.1,
      duration: options.bgDuration || 0.42,
      restDelta: 0.001,
      restSpeed: 0.001,
      ease: [0.25, 0.46, 0.45, 0.94],
    }),
    [options.bgStiffness, options.bgDamping, options.bgMass, options.bgDuration]
  );

  // Rubber band animation with bounce, color fade, and optional scale overshoot
  const getRubberBandVariants = useCallback(
    () => ({
      initial: {
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        opacity: 0.8,
        filter: 'brightness(0.95)',
        boxShadow: 'none',
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
          'brightness(1)',
        ],
        boxShadow: [
          'none',
          '0 2px 8px #fff2',
          '0 4px 16px #fff4',
          'none',
        ],
        transition: {
          scale: {
            duration: 0.55,
            times: [0, 0.4, 0.7, 1],
            ease: [0.25, 0.46, 0.45, 0.94],
          },
          scaleX: {
            duration: 0.55,
            times: [0, 0.4, 0.7, 1],
            ease: [0.25, 0.46, 0.45, 0.94],
          },
          scaleY: {
            duration: 0.55,
            times: [0, 0.4, 0.7, 1],
            ease: [0.25, 0.46, 0.45, 0.94],
          },
          opacity: {
            duration: 0.3,
            times: [0, 0.4, 1],
          },
          filter: {
            duration: 0.55,
            times: [0, 0.4, 0.7, 1],
          },
          boxShadow: {
            duration: 0.55,
            times: [0, 0.4, 0.7, 1],
          },
        },
      },
      exit: {
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        opacity: 0.8,
        filter: 'brightness(0.95)',
        boxShadow: 'none',
      },
    }),
    []
  );

  // Expose gradients, shadow, and transition progress for advanced UI
  return {
    getIconColor,
    getIconShadow,
    isTransitioning,
    getRubberBandTransition,
    getBackgroundTransition,
    getRubberBandVariants,
    gradients: STREAMING_GRADIENTS,
    colors: STREAMING_COLORS,
    lastCategory,
    transitionProgress,
  };
};
