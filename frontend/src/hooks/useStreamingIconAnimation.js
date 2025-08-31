import { useState, useEffect } from 'react';

// Streaming service colors
const STREAMING_COLORS = {
  netflix: '#E50914', // Netflix red
  prime: '#00A8E1',   // Prime Video sky blue
  hulu: '#1CE783',    // Hulu green
  hbo: '#000',     // HBO white
  disney: '#113CCF',  // Disney+ dark blue
  apple: '#000000'    // Apple TV+ black
};

export const useStreamingIconAnimation = (activeCategory) => {
  const [iconColors, setIconColors] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Trigger color change when category changes
  useEffect(() => {
    // Set transition state for rubber band effect
    setIsTransitioning(true);
    
    // Clear all previous colors first
    setIconColors({});
    
    if (activeCategory && STREAMING_COLORS[activeCategory]) {
      // Set custom color for active category
      setIconColors(prev => ({
        ...prev,
        [activeCategory]: STREAMING_COLORS[activeCategory]
      }));
    }

    // Clear transition state after animation completes
    const timeoutId = setTimeout(() => {
      setIsTransitioning(false);
    }, 500); // Match the no-bounce animation duration

    return () => clearTimeout(timeoutId);
  }, [activeCategory]);

  // Get current color for an icon
  const getIconColor = (categoryId) => {
    // If this is the active category, return the custom color
    if (categoryId === activeCategory && STREAMING_COLORS[categoryId]) {
      return STREAMING_COLORS[categoryId];
    }
    // Otherwise return the stored color or default
    return iconColors[categoryId] || 'currentColor';
  };

  // Enhanced transition configurations for rubber band effect
  const getRubberBandTransition = () => ({
    type: 'spring',
    stiffness: 400,
    damping: 25,
    mass: 0.8,
    duration: 0.5,
    ease: [0.25, 0.46, 0.45, 0.94]
  });

  // Enhanced background transition for the moving div
  const getBackgroundTransition = () => ({
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 1,
    duration: 0.4,
    ease: [0.25, 0.46, 0.45, 0.94]
  });

  // No bounce rubber band animation variants - smooth single-direction stretch with minimal width change
  const getRubberBandVariants = () => ({
    initial: { 
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.8
    },
    animate: { 
      scale: [1, 1.2, 1],
      scaleX: [1, 1.05, 1],
      scaleY: [1, 0.7, 1],
      opacity: 1,
      transition: {
        scale: {
          duration: 0.5,
          times: [0, 0.5, 1],
          ease: [0.25, 0.46, 0.45, 0.94]
        },
        scaleX: {
          duration: 0.5,
          times: [0, 0.5, 1],
          ease: [0.25, 0.46, 0.45, 0.94]
        },
        scaleY: {
          duration: 0.5,
          times: [0, 0.5, 1],
          ease: [0.25, 0.46, 0.45, 0.94]
        },
        opacity: {
          duration: 0.3
        }
      }
    },
    exit: { 
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.8
    }
  });

  return {
    getIconColor,
    isTransitioning,
    getRubberBandTransition,
    getBackgroundTransition,
    getRubberBandVariants
  };
};
