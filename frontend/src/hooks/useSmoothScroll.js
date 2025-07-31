import { useEffect, useRef, useCallback, useState } from 'react';
import smoothScroll, { 
  scrollToElement, 
  scrollToTop, 
  scrollToBottom, 
  handleScroll, 
  cancelScroll, 
  getScrollPosition, 
  isInViewport, 
  createScrollObserver 
} from '../utils/smoothScroll';

/**
 * Ultra-Smooth Scrolling React Hook
 * Provides advanced scrolling functionality with React integration
 */
export const useSmoothScroll = (options = {}) => {
  const {
    throttle = 16,
    enableMomentum = true,
    enableIntersectionObserver = true,
    scrollOffset = 0
  } = options;

  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    scrollDirection: 0,
    scrollVelocity: 0,
    isScrolling: false,
    scrollProgress: 0
  });

  const [viewportState, setViewportState] = useState({
    isInViewport: false,
    intersectionRatio: 0
  });

  const scrollRef = useRef(null);
  const observerRef = useRef(null);
  const cleanupRef = useRef(null);

  // Enhanced scroll handler with React state management
  const handleScrollEvent = useCallback((scrollData) => {
    const { scrollTop, scrollDirection, scrollVelocity, isScrolling } = scrollData;
    
    // Calculate scroll progress
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    
    setScrollState({
      scrollTop,
      scrollDirection,
      scrollVelocity,
      isScrolling,
      scrollProgress: Math.min(Math.max(scrollProgress, 0), 100)
    });
  }, []);

  // Intersection observer callback
  const handleIntersection = useCallback((entry) => {
    setViewportState({
      isInViewport: entry.isIntersecting,
      intersectionRatio: entry.intersectionRatio
    });
  }, []);

  // Initialize scroll handling
  useEffect(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    cleanupRef.current = handleScroll(handleScrollEvent, {
      throttle,
      momentum: enableMomentum,
      onStart: () => setScrollState(prev => ({ ...prev, isScrolling: true })),
      onEnd: () => setScrollState(prev => ({ ...prev, isScrolling: false }))
    });

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [handleScrollEvent, throttle, enableMomentum]);

  // Initialize intersection observer
  useEffect(() => {
    if (!enableIntersectionObserver || !scrollRef.current) return;

    observerRef.current = createScrollObserver(handleIntersection, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: '0px'
    });

    observerRef.current.observe(scrollRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, enableIntersectionObserver]);

  // Enhanced scroll methods
  const scrollTo = useCallback((target, scrollOptions = {}) => {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    return scrollToElement(element, {
      offset: scrollOffset,
      ...scrollOptions
    });
  }, [scrollOffset]);

  const scrollToTopSmooth = useCallback((scrollOptions = {}) => {
    return scrollToTop({
      offset: scrollOffset,
      ...scrollOptions
    });
  }, [scrollOffset]);

  const scrollToBottomSmooth = useCallback((scrollOptions = {}) => {
    return scrollToBottom({
      offset: scrollOffset,
      ...scrollOptions
    });
  }, [scrollOffset]);

  const cancelCurrentScroll = useCallback(() => {
    cancelScroll();
  }, []);

  const getCurrentScrollPosition = useCallback(() => {
    return getScrollPosition();
  }, []);

  const checkInViewport = useCallback((element, viewportOptions = {}) => {
    return isInViewport(element, viewportOptions);
  }, []);

  return {
    // State
    scrollState,
    viewportState,
    
    // Refs
    scrollRef,
    
    // Methods
    scrollTo,
    scrollToTop: scrollToTopSmooth,
    scrollToBottom: scrollToBottomSmooth,
    cancelScroll: cancelCurrentScroll,
    getScrollPosition: getCurrentScrollPosition,
    isInViewport: checkInViewport,
    
    // Utility
    smoothScroll
  };
};

/**
 * Hook for scroll-triggered animations
 */
export const useScrollAnimation = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = false
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current) return;

    observerRef.current = createScrollObserver((entry) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        if (triggerOnce && !hasTriggered) {
          setHasTriggered(true);
        }
      } else if (!triggerOnce) {
        setIsVisible(false);
      }
    }, {
      threshold,
      rootMargin
    });

    observerRef.current.observe(elementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return {
    elementRef,
    isVisible,
    hasTriggered
  };
};

/**
 * Hook for scroll-based parallax effects
 */
export const useScrollParallax = (options = {}) => {
  const {
    speed = 0.5,
    direction = 'vertical',
    offset = 0
  } = options;

  const [parallaxStyle, setParallaxStyle] = useState({});
  const elementRef = useRef(null);

  useEffect(() => {
    const handleParallaxScroll = () => {
      if (!elementRef.current) return;

      const scrollTop = window.pageYOffset;
      const elementTop = elementRef.current.offsetTop;
      const elementHeight = elementRef.current.offsetHeight;
      const windowHeight = window.innerHeight;

      // Calculate parallax effect
      const scrolled = scrollTop - elementTop + windowHeight;
      const rate = scrolled * speed + offset;

      if (direction === 'vertical') {
        setParallaxStyle({
          transform: `translateY(${rate}px)`
        });
      } else if (direction === 'horizontal') {
        setParallaxStyle({
          transform: `translateX(${rate}px)`
        });
      }
    };

    window.addEventListener('scroll', handleParallaxScroll, { passive: true });
    handleParallaxScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleParallaxScroll);
    };
  }, [speed, direction, offset]);

  return {
    elementRef,
    parallaxStyle
  };
};

/**
 * Hook for scroll-based progress indicators
 */
export const useScrollProgress = (options = {}) => {
  const {
    target = document.documentElement,
    offset = 0
  } = options;

  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const handleProgressScroll = () => {
      if (!target) return;

      const scrollTop = window.pageYOffset;
      const scrollHeight = target.scrollHeight - window.innerHeight;
      const currentProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      const adjustedProgress = Math.min(Math.max(currentProgress + offset, 0), 100);
      
      setProgress(adjustedProgress);
      setIsComplete(adjustedProgress >= 100);
    };

    window.addEventListener('scroll', handleProgressScroll, { passive: true });
    handleProgressScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleProgressScroll);
    };
  }, [target, offset]);

  return {
    progress,
    isComplete
  };
};

/**
 * Hook for scroll-based navigation highlighting
 */
export const useScrollNavigation = (sections = []) => {
  const [activeSection, setActiveSection] = useState('');
  const observersRef = useRef([]);

  useEffect(() => {
    // Clear existing observers
    observersRef.current.forEach(observer => observer.disconnect());
    observersRef.current = [];

    // Create observers for each section
    sections.forEach(({ id, element }) => {
      const observer = createScrollObserver((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(id);
        }
      }, {
        threshold: 0.5,
        rootMargin: '-20% 0px -20% 0px'
      });

      if (element) {
        observer.observe(element);
        observersRef.current.push(observer);
      }
    });

    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
    };
  }, [sections]);

  return {
    activeSection
  };
};

export default useSmoothScroll; 