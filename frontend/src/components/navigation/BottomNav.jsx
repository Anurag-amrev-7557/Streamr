import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import useReducedMotion from '../../hooks/useReducedMotion';
import { springEntrance, defaultTransition, reducedMotionTransition } from '../../utils/animationVariants';
import { HomeIcon, FilmIcon, TvIcon, UserGroupIcon, BookmarkIcon, EllipsisHorizontalIcon, BookOpenIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { useLoading } from '../../contexts/LoadingContext';
import { scheduleRaf, cancelRaf } from '../../utils/throttledRaf';
import { useStreamingIconAnimation } from '../../hooks/useStreamingIconAnimation';

const navItems = [
  { to: '/', label: 'Home', icon: <HomeIcon className="w-6 h-6" /> },
  { to: '/movies', label: 'Movies', icon: <FilmIcon className="w-6 h-6" /> },
  { to: '/series', label: 'Series', icon: <TvIcon className="w-6 h-6" /> },
  { to: '/watchlist', label: 'Wishlist', icon: <BookmarkIcon className="w-6 h-6" /> },
];

const BottomNav = () => {
  const location = useLocation();
  // Read only the minimal piece of context that we actually need to avoid broad context-driven re-renders
  const { fullPageLoader } = useLoading();
  
  // console.log('BottomNav: Component initialized:', { pathname: location.pathname, fullPageLoader });
  
  // Refs for DOM elements
  const containerRef = useRef(null);
  const itemRefs = useRef(new Map());
  const indicatorRef = useRef(null);
  const menuSheetRef = useRef(null);
  
  // Performance optimization refs
  // We animate the indicator using translate3d + scaleX to avoid layout thrashing.
  // Keep a fixed base width/height and scale the X axis for smooth GPU-only transforms.
  const INDICATOR_BASE_WIDTH = 60;
  const INDICATOR_HEIGHT = 48;
  const lastIndicatorMetricsRef = useRef({ x: 0, scale: 1 });
  const rafIdRef = useRef(null);
  const resizeObserverRef = useRef(null);
  // Cache of measured item metrics to avoid calling getBoundingClientRect too often
  const itemMetricsRef = useRef(new Map());
  const isDocHiddenRef = useRef(false);
  const isFirstMount = useRef(true);
  // idle callback id for deferring non-urgent work
  const idleIdRef = useRef(null);

  // Framer-motion controls and streaming animation hook are declared after activeKey
  // (moved below) to avoid using activeKey before it's initialized.

  // requestIdleCallback wrapper with fallback
  const scheduleIdle = useCallback((fn, options) => {
    try {
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(fn, options);
        idleIdRef.current = id;
        return id;
      }
    } catch (_) {}
    // fallback to setTimeout when requestIdleCallback not available
    const id = setTimeout(fn, 200);
    idleIdRef.current = id;
    return id;
  }, []);

  const cancelIdle = useCallback(() => {
    try {
      if ('cancelIdleCallback' in window && idleIdRef.current) {
        window.cancelIdleCallback(idleIdRef.current);
      } else if (idleIdRef.current) {
        clearTimeout(idleIdRef.current);
      }
    } catch (_) {}
    idleIdRef.current = null;
  }, []);
  
  // Timer management to prevent memory leaks
  const timersRef = useRef(new Set());
  
  // Helper function to manage timers
  const addTimer = useCallback((timer) => {
    timersRef.current.add(timer);
    return timer;
  }, []);
  
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  // Manage focus for accessibility: remember the element that opened the menu
  const openerRef = useRef(null);

  // Centralized RAF scheduler to reduce repetition and ensure previous RAF is canceled
  const scheduleUpdate = useCallback((fn) => {
    try {
      if (rafIdRef.current) {
        cancelRaf(rafIdRef.current);
      }
    } catch (_) {
      // ignore cancellation errors
    }

    rafIdRef.current = scheduleRaf(() => {
      try {
        fn();
      } catch (_) {}
    });

    return rafIdRef.current;
  }, []);
  
  // State
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Track changes to item refs (refs mutations don't trigger rerenders)
  const [refVersion, setRefVersion] = useState(0);

  // Compact window width hook to reduce listeners and re-renders
  const useWindowWidth = () => {
    const isClient = typeof window !== 'undefined';
    const [width, setWidth] = useState(isClient ? window.innerWidth : 1200);
    useEffect(() => {
      if (!isClient) return;
      let raf = null;
      const onResize = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          setWidth(window.innerWidth);
          raf = null;
        });
      };
      window.addEventListener('resize', onResize, { passive: true });
      return () => {
        window.removeEventListener('resize', onResize);
        if (raf) cancelAnimationFrame(raf);
      };
    }, [isClient]);
    return width;
  };

  const windowWidth = useWindowWidth();
  
  // Respect the user's reduced-motion preference where possible
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }, []);
  
  // Hide bottom nav when full page loader is shown or on manga reader pages
  const isMangaReaderPage = useMemo(() => {
    return location.pathname.startsWith('/manga/chapter/');
  }, [location.pathname]);
  
  const shouldHide = fullPageLoader || isMangaReaderPage;

  // Memoized computations to prevent unnecessary re-renders
  const MENU_KEY = '__menu__';
  const isMenuActive = useMemo(() => {
    return location.pathname.startsWith('/manga') || location.pathname.startsWith('/community');
  }, [location.pathname]);
  const isAuthOrProfilePage = useMemo(() => {
    const authPaths = ['/login', '/signup', '/forgot-password', '/profile'];
    const resetPasswordMatch = location.pathname.match(/^\/reset-password\/.+/);
    return authPaths.includes(location.pathname) || resetPasswordMatch;
  }, [location.pathname]);

  const activeKey = useMemo(() => {
    if (isMenuActive) return MENU_KEY;
    const match = navItems.find(item => (
      location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
    ));
    const result = match?.to ?? '/';
    return result;
  }, [location.pathname, isMenuActive]);

  // Framer-motion controls so we can trigger spring animations (rubber band) like MoviesPage
  const indicatorControls = useAnimation();
  const { getBackgroundTransition, getRubberBandVariants } = useStreamingIconAnimation(activeKey);

  // Optimized indicator update function with throttling
  const updateIndicator = useCallback(() => {
    // Early returns for invalid states
    if (isDocHiddenRef.current) return;
    if (!activeKey || !containerRef.current || !indicatorRef.current) {
      // console.log('BottomNav: Early return - missing refs:', { activeKey, hasContainer: !!containerRef.current, hasIndicator: !!indicatorRef.current });
      return;
    }
    if (isAuthOrProfilePage) return; // Don't update indicator on auth/profile pages
    
    const activeElement = itemRefs.current.get(activeKey);
    if (!activeElement) {
      // console.log('BottomNav: No active element found for:', activeKey, 'Available keys:', Array.from(itemRefs.current.keys()));
      return;
    }
    
    try {
      // Prefer cached metrics when available
      let metrics = itemMetricsRef.current.get(activeKey);
      // If no cached metrics or forced measure, compute them
      if (!metrics) {
        const rect = activeElement.getBoundingClientRect();
        const navRect = containerRef.current.getBoundingClientRect();
      
      if (!navRect || rect.width === 0 || rect.height === 0) {
        // console.log('BottomNav: Invalid rects:', { rect, navRect });
        return;
      }
      
        const x = Math.max(0, rect.left - navRect.left);
        const width = Math.max(INDICATOR_BASE_WIDTH, rect.width);
        metrics = { x, width };
        itemMetricsRef.current.set(activeKey, metrics);
      }

      const x = metrics.x;
      const width = Math.max(INDICATOR_BASE_WIDTH, metrics.width);
      const scale = width / INDICATOR_BASE_WIDTH;
      const height = INDICATOR_HEIGHT;

      // Always update the indicator metrics
      lastIndicatorMetricsRef.current = { x, scale };

      // Animate using framer-motion spring to match MoviesPage rubber-band
      try {
        indicatorControls.start({
          x,
          scaleX: scale,
          transition: getBackgroundTransition()
        });
      } catch (_) {
        // fallback to direct style update if controls not ready
        if (indicatorRef.current) {
          const el = indicatorRef.current;
          el.style.transform = `translate3d(${x}px, 0, 0) scaleX(${scale})`;
          el.style.height = `${height}px`;
        }
      }
    } catch (error) {
      // console.warn('BottomNav: Error updating indicator:', error);
      // Fallback to default safe transform-only values
      lastIndicatorMetricsRef.current = { x: 0, scale: 1 };
      if (indicatorRef.current) {
        const el = indicatorRef.current;
        el.style.transform = 'translate3d(0px, 0, 0) scaleX(1)';
        el.style.height = `${INDICATOR_HEIGHT}px`;
      }
    }
  }, [activeKey, isAuthOrProfilePage]);

  // Measure all item rects and cache them. Call when refs change or on resize.
  const measureItemRects = useCallback(() => {
    // Schedule measurement on the next RAF to avoid reading layout mid-frame.
    scheduleUpdate(() => {
      try {
        const navRect = containerRef.current?.getBoundingClientRect();
        if (!navRect) return;
        itemRefs.current.forEach((el, key) => {
          try {
            if (!el) return;
            const r = el.getBoundingClientRect();
            itemMetricsRef.current.set(key, { x: Math.max(0, r.left - navRect.left), width: r.width });
          } catch (_) {}
        });
      } catch (_) {}
    });
  }, []);

  // Optimized ref callback to prevent memory leaks
  const setItemRef = useCallback((element, key) => {
    if (element) {
      itemRefs.current.set(key, element);
      // Debug: log when refs are set
      // console.log(`BottomNav: Set ref for ${key}`, element);
      
      // Update indicator immediately when ref is set
      if (key === activeKey) {
        addTimer(setTimeout(() => updateIndicator(), 0));
      }
      // bump refVersion so effects depending on refs can re-run reliably
      setRefVersion(v => v + 1);
    } else {
      // Only remove ref if element is actually null/undefined
      // Don't remove ref during re-renders
      if (!element && itemRefs.current.has(key)) {
        itemRefs.current.delete(key);
        // console.log(`BottomNav: Removed ref for ${key}`);
        setRefVersion(v => v + 1);
      }
    }
  }, [activeKey, updateIndicator]);

  // Force indicator update when menu active state toggles
  useEffect(() => {
    // schedule multiple updates to catch ref timing
    updateIndicator();
    const t1 = addTimer(setTimeout(() => updateIndicator(), 0));
    const t2 = addTimer(setTimeout(() => updateIndicator(), 60));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      // timers are also tracked in timersRef and will be cleared on unmount
    };
  }, [isMenuActive, updateIndicator]);

  // Debounced indicator update for better performance
  useEffect(() => {
    // console.log('BottomNav: updateIndicator useEffect triggered:', { activeKey, isAuthOrProfilePage });
    
    // Cancel any scheduled RAF and run an immediate update
    try { if (rafIdRef.current) cancelRaf(rafIdRef.current); } catch (_) {}
    updateIndicator();

    // Throttled RAF update using helper
    scheduleUpdate(() => updateIndicator());

    // Also schedule an update after a small delay to ensure refs are set
    const delayedUpdate = addTimer(setTimeout(() => {
      updateIndicator();
    }, 50));

    return () => {
      try { if (rafIdRef.current) cancelRaf(rafIdRef.current); } catch (_) {}
      rafIdRef.current = null;
      clearTimeout(delayedUpdate);
    };
  }, [updateIndicator]);

  // Handle resize and orientation changes with proper cleanup
  useEffect(() => {
    let isMounted = true;
    
    const handleResize = () => {
      if (!isMounted) return;
      
      // console.log('BottomNav: Resize event detected, updating indicator');
      
      // Update immediately for better responsiveness
      updateIndicator();

      // Use centralized scheduler for smoother updates
      scheduleUpdate(() => { if (isMounted) updateIndicator(); });
    };

    const handleVisibilityChange = () => {
      if (!isMounted) return;
      isDocHiddenRef.current = document.hidden;
      
      // console.log('BottomNav: Visibility changed:', { hidden: document.hidden });
      
      // Update indicator when page becomes visible again
      if (!document.hidden) {
        addTimer(setTimeout(() => {
          if (isMounted) {
            updateIndicator();
          }
        }, 100));
      }
    };

  // Add visibility change listener; resize is handled by useWindowWidth above and ResizeObserver
  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    
    // Use ResizeObserver for more reliable sizing
    if ('ResizeObserver' in window && containerRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        handleResize();
        // Re-measure cached item rects
        measureItemRects();
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      isMounted = false;
      
  // Clean up event listeners
  document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up ResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      // Clean up RAF
      try { if (rafIdRef.current) cancelRaf(rafIdRef.current); } catch (_) {}
      rafIdRef.current = null;
    };
  }, [updateIndicator]);

  // Re-measure item rects when refs change or window width changes
  useEffect(() => {
    measureItemRects();
    // schedule a delayed re-measure to catch layout shifts
    const t = addTimer(setTimeout(() => measureItemRects(), 50));
    return () => clearTimeout(t);
  }, [refVersion, windowWidth, measureItemRects]);

  // Initial positioning with delay for mobile devices
  useEffect(() => {
    if (!isFirstMount.current) return;
    
    // console.log('BottomNav: Initial positioning effect triggered');
    
    let isMounted = true;
    
    // Update immediately for better responsiveness
    updateIndicator();
    
    const timer = addTimer(setTimeout(() => {
      if (isMounted) {
        updateIndicator();
        scheduleUpdate(() => { if (isMounted) updateIndicator(); });
      }
    }, 100)); // Reduced delay for better responsiveness

    // Also check if refs are available and update
    const refCheckTimer = addTimer(setTimeout(() => {
      if (isMounted && itemRefs.current.size > 0) {
        updateIndicator();
      }
    }, 200));
      
    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearTimeout(refCheckTimer);
      // timers are tracked in timersRef and will be cleared in the final cleanup
    };
  }, [updateIndicator]);

  // Initialize indicator controls on mount to cached metrics (prevents jump)
  useEffect(() => {
    try {
      const { x = 0, scale = 1 } = lastIndicatorMetricsRef.current || {};
      indicatorControls.set({ x, scaleX: scale });
    } catch (_) {}
  }, []);

  // Handle route changes
  useEffect(() => {
    if (isFirstMount.current) return;
    
    let isMounted = true;
    
    // Update immediately for better responsiveness
    updateIndicator();

    // Defer measurement-heavy follow-ups to idle time to avoid blocking route transition
    const idle = scheduleIdle(() => {
      if (!isMounted) return;
      try {
        measureItemRects();
        updateIndicator();
        scheduleUpdate(() => { if (isMounted) updateIndicator(); });
      } catch (_) {}
    });
    
    const timer = addTimer(setTimeout(() => {
      if (isMounted) {
        updateIndicator();
      }
    }, 50)); // Reduced delay for better responsiveness

    // Also check if refs are available and update
    const refCheckTimer = addTimer(setTimeout(() => {
      if (isMounted && itemRefs.current.size > 0) {
        updateIndicator();
      }
    }, 100));
      
    return () => {
      isMounted = false;
      clearTimeout(timer);
      cancelIdle();
      clearTimeout(refCheckTimer);
    };
  }, [activeKey, updateIndicator]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear all tracked timers
      try { clearAllTimers(); } catch (_) {}

      // Clear RAF
      try { if (rafIdRef.current) cancelRaf(rafIdRef.current); } catch (_) {}
      rafIdRef.current = null;

  // Cancel any scheduled idle callbacks
  try { cancelIdle(); } catch (_) {}

  // Stop any running framer-motion animations
  try { indicatorControls.stop(); } catch (_) {}

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Don't clear item refs on unmount - they should persist
      // itemRefs.current.clear();

      // Reset state
      isDocHiddenRef.current = false;
      isFirstMount.current = true;
    };
  }, []);

  // Monitor refs availability and update indicator
  useEffect(() => {
    if (activeKey && !isAuthOrProfilePage) {
      // Update indicator when active key changes or when refs are expected to be ready
      addTimer(setTimeout(() => updateIndicator(), 0));
    }
  }, [refVersion, activeKey, isAuthOrProfilePage, updateIndicator]);

  // Update indicator on window width changes (handled by useWindowWidth)
  useEffect(() => {
    // Immediate and scheduled updates to ensure layout has settled
    updateIndicator();
    scheduleUpdate(() => updateIndicator());
    const t = addTimer(setTimeout(() => updateIndicator(), 60));
    return () => clearTimeout(t);
  }, [windowWidth, updateIndicator]);

  // Don't render if should hide - moved to JSX level to avoid hook issues

  // Respect user's reduced-motion preference
  const reducedMotion = useReducedMotion();

  // Full animation variants for entrance (use shared springEntrance)
  const entranceVariants = reducedMotion ? {
    hidden: { y: 0, opacity: 1 },
    visible: { y: 0, opacity: 1, transition: reducedMotionTransition }
  } : springEntrance({ delay: 0.05 });

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    setHasAnimatedIn(true);
    isFirstMount.current = false;
    
    // Update indicator immediately when animation completes
    updateIndicator();
    
    // Then schedule additional updates to ensure smooth positioning
    addTimer(setTimeout(() => {
      updateIndicator();
      // Use centralized scheduler to avoid duplicate RAFs
      scheduleUpdate(() => updateIndicator());
    }, 50));

    // Also check if refs are available and update
    addTimer(setTimeout(() => {
      if (itemRefs.current.size > 0) {
        updateIndicator();
      }
    }, 100));
  }, [updateIndicator]);

  // Handle nav item interactions
  const handleNavInteraction = useCallback(() => {
    
    // Update immediately for better responsiveness
    updateIndicator();
    
  // Throttled RAF update
  if (rafIdRef.current) { try { cancelRaf(rafIdRef.current); } catch (_) {} }
  rafIdRef.current = scheduleRaf(() => updateIndicator());
    
    // Also check if refs are available and update
    addTimer(setTimeout(() => {
      if (itemRefs.current.size > 0) {
        updateIndicator();
      }
    }, 50));
  }, [updateIndicator]);

  // Keyboard navigation between nav items (Left/Right/Home/End)
  const focusNavItemByIndex = useCallback((index) => {
    const keys = Array.from(itemRefs.current.keys());
    const key = keys[index];
    const el = itemRefs.current.get(key);
    if (el && typeof el.focus === 'function') el.focus();
  }, []);

  const handleKeyDownOnNav = useCallback((e) => {
    // Only handle keyboard navigation for arrow keys and home/end
    const keys = Array.from(itemRefs.current.keys());
    if (!keys || keys.length === 0) return;

    // Find currently focused item's index
    const activeEl = document.activeElement;
    const currentIndex = keys.findIndex(k => itemRefs.current.get(k) === activeEl);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (currentIndex + 1) % keys.length;
      focusNavItemByIndex(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (currentIndex - 1 + keys.length) % keys.length;
      focusNavItemByIndex(prev);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusNavItemByIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusNavItemByIndex(keys.length - 1);
    }
  }, [focusNavItemByIndex]);

  // Close menu helper (used in keyboard handlers and click-outside)
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    // restore focus to opener if available
    try {
      // Focus the opener if it exists and is still in the document
      const opener = openerRef.current;
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus();
      }
    } catch (_) {}
  }, []);

  // When menu opens, move focus to first focusable element and prevent background scroll
  useEffect(() => {
    if (!isMenuOpen) {
      document.body.style.overflow = '';
      return;
    }

    // prevent background scrolling on mobile
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // move focus into sheet
    const timer = setTimeout(() => {
      try {
        const focusable = menuSheetRef.current?.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])') || [];
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      } catch (_) {}
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  // Don't render if should hide
  if (shouldHide) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.nav
        key="bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        onKeyDown={handleKeyDownOnNav}
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'manipulation'
        }}
        aria-label="Bottom navigation"
        variants={entranceVariants}
        initial={isFirstMount.current ? "hidden" : "visible"}
        animate="visible"
        onAnimationComplete={handleAnimationComplete}
      >
        <div className="mx-auto max-w-7xl p-1">
          <div
            ref={(el) => {
              containerRef.current = el;
              if (el) {
                // console.log('BottomNav: Container ref set:', el);
              } else {
                // console.log('BottomNav: Container ref cleared');
              }
            }}
            className="relative bg-[#1a1d21]/95 border border-white/10 rounded-2xl shadow-2xl bottom-nav-optimized animate-optimized"
            style={{ 
              contain: 'layout paint',
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)'
            }}
          >
            <ul className="flex items-center justify-between p-1">
              {navItems.map((item, index) => {
                const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                // console.log(`BottomNav: Rendering nav item ${item.to}:`, { isActive, index });
                
                return (
                  <motion.li
                    key={item.to}
                    ref={(el) => setItemRef(el, item.to)}
                    className="flex-1 flex items-center justify-center"
                    style={{ minHeight: '48px' }}
                    initial={isFirstMount.current ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: isFirstMount.current ? 0.1 + (index * 0.05) : 0,
                      ease: "easeOut"
                    }}
                  >
                    <NavLink
                      to={item.to}
                        className={`relative overflow-hidden flex flex-col items-center justify-center gap-0.5 h-12 px-2 rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/30 ${
                          isActive ? 'text-black' : 'text-white/70 hover:text-white active:text-white/90'
                        }`}
                      aria-current={isActive ? 'page' : undefined}
                      onPointerDown={() => {
                        // console.log(`BottomNav: NavLink ${item.to} pointer down`);
                        handleNavInteraction();
                      }}
                      onClick={() => {
                        // console.log(`BottomNav: NavLink ${item.to} clicked`);
                        handleNavInteraction();
                      }}
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                    >
                      <span className="relative z-10">{item.icon}</span>
                      <span className="text-[11px] leading-none relative z-10 font-medium">{item.label}</span>
                      {/* Screen reader-only status for active item */}
                      {isActive && (
                        <span className="sr-only" aria-hidden={false}>Current page</span>
                      )}
                    </NavLink>
                  </motion.li>
                );
              })}
              {/* Right-end Menu Button */}
              <motion.li
                key="more-menu"
                ref={(el) => setItemRef(el, MENU_KEY)}
                className="flex-1 flex items-center justify-center"
                style={{ minHeight: '48px' }}
                initial={isFirstMount.current ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: isFirstMount.current ? 0.1 + (navItems.length * 0.05) : 0, ease: 'easeOut' }}
              >
                <button
                  type="button"
                  aria-label="Open menu"
                  aria-haspopup="dialog"
                  aria-expanded={isMenuOpen}
                  aria-controls="bottom-sheet-menu"
                  onClick={(e) => {
                    // remember opener for focus restore
                    openerRef.current = e.currentTarget;
                    setIsMenuOpen(prev => !prev);
                  }}
                  onKeyDown={(e) => {
                    // Toggle on Enter or Space for keyboard users
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openerRef.current = e.currentTarget;
                      setIsMenuOpen(prev => !prev);
                    }
                  }}
                  className={`relative overflow-hidden flex flex-col items-center justify-center gap-0.5 h-12 px-2 rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/30 ${
                    isMenuActive ? 'text-black' : 'text-white/70 hover:text-white active:text-white/90'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <span className="relative z-10"><AdjustmentsHorizontalIcon className="w-6 h-6" /></span>
                  <span className="text-[11px] leading-none relative z-10 font-medium">Menu</span>
                </button>
              </motion.li>
            </ul>
            
            {/* Optimized background indicator (CSS transitions + GPU transforms) - Hidden on auth/profile pages */}
            {!isAuthOrProfilePage && (
              <motion.div
                ref={(el) => {
                  indicatorRef.current = el;
                }}
                className="absolute rounded-lg bg-white pointer-events-none shadow-lg"
                style={{
                  top: 4,
                  left: 0,
                  width: `${INDICATOR_BASE_WIDTH}px`,
                  height: `${INDICATOR_HEIGHT}px`,
                  backfaceVisibility: 'hidden',
                  minWidth: `${INDICATOR_BASE_WIDTH}px`,
                  minHeight: `${INDICATOR_HEIGHT}px`,
                  willChange: 'transform',
                  transformOrigin: 'left center'
                }}
                animate={indicatorControls}
                initial={false}
                aria-hidden="true"
                data-debug={`x:${lastIndicatorMetricsRef.current.x},scale:${lastIndicatorMetricsRef.current.scale}`}
              />
            )}
          </div>
        </div>
        {/* Bottom Sheet Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                key="menu-overlay"
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={closeMenu}
              />
              {/* Sheet */}
              <motion.div
                key="menu-sheet"
                id="bottom-sheet-menu"
                role="dialog"
                aria-modal="true"
                aria-label="More navigation options"
                className="absolute left-0 right-0 z-[70] bottom-[calc(100%+8px)]"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                ref={menuSheetRef}
              >
                <div
                  className="mx-auto max-w-7xl p-1"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                  <FocusTrap
                    active={isMenuOpen}
                    focusTrapOptions={{
                      initialFocus: () => menuSheetRef.current?.querySelector('a, button, [tabindex]:not([tabindex="-1"])') || menuSheetRef.current,
                      // Let FocusTrap handle Escape and focus restoration back to openerRef
                      escapeDeactivates: true,
                      clickOutsideDeactivates: true,
                      // prop-types for focus-trap-react expect a boolean here
                      returnFocusOnDeactivate: true,
                      // Use onDeactivate to perform safe focus restoration to openerRef
                      onDeactivate: () => {
                        try {
                          const opener = openerRef.current;
                          if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
                            opener.focus();
                          }
                        } catch (_) {}
                      }
                    }}
                  >
                    <div className="bg-[#1a1d21]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <NavLink
                            to="/manga"
                            onClick={() => setIsMenuOpen(false)}
                            className="group flex items-center gap-2 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-colors"
                          >
                            <BookOpenIcon className="w-5 h-5 text-white/80 group-hover:text-white" />
                            <span className="text-sm font-medium">Manga</span>
                          </NavLink>
                          <NavLink
                            to="/community"
                            onClick={() => setIsMenuOpen(false)}
                            className="group flex items-center gap-2 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-colors"
                          >
                            <UserGroupIcon className="w-5 h-5 text-white/80 group-hover:text-white" />
                            <span className="text-sm font-medium">Community</span>
                          </NavLink>
                        </div>
                      </div>
                    </div>
                  </FocusTrap>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.nav>
    </AnimatePresence>
  );
};

export default React.memo(BottomNav);


