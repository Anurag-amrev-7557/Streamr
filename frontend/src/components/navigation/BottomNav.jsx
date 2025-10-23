import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HomeIcon, FilmIcon, TvIcon, UserGroupIcon, BookmarkIcon, EllipsisHorizontalIcon, BookOpenIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { useLoading } from '../../contexts/LoadingContext';
import { scheduleRaf, cancelRaf } from '../../utils/throttledRaf';

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
  
  // Performance optimization refs
  const lastIndicatorMetricsRef = useRef({ x: 0, y: 4, width: 60, height: 48 });
  const rafIdRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const isDocHiddenRef = useRef(false);
  const isFirstMount = useRef(true);
  
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
  
  // State
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Always allow full animations on all devices
  const prefersReducedMotion = false;
  
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
      const rect = activeElement.getBoundingClientRect();
      const navRect = containerRef.current.getBoundingClientRect();
      
      if (!navRect || rect.width === 0 || rect.height === 0) {
        // console.log('BottomNav: Invalid rects:', { rect, navRect });
        return;
      }
      
      const x = Math.max(0, rect.left - navRect.left);
      const width = Math.max(60, rect.width);
      const height = Math.max(48, rect.height);
      
      // console.log('BottomNav: Updating indicator:', { x, width, height, activeKey });
      
      // Always update the indicator for smooth movement
      lastIndicatorMetricsRef.current = { x, y: 4, width, height };
      
      if (indicatorRef.current) {
        const el = indicatorRef.current;
        // Use transform3d for GPU acceleration
        el.style.transform = `translate3d(${x}px, 0, 0)`;
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        
        // console.log('BottomNav: Indicator updated successfully');
      }
    } catch (error) {
      // console.warn('BottomNav: Error updating indicator:', error);
      // Fallback to default safe values without causing React re-render
      lastIndicatorMetricsRef.current = { x: 0, y: 4, width: 60, height: 48 };
      if (indicatorRef.current) {
        const el = indicatorRef.current;
        el.style.transform = 'translate3d(0px, 0, 0)';
        el.style.width = '60px';
        el.style.height = '48px';
      }
    }
  }, [activeKey, isAuthOrProfilePage]);

  // Optimized ref callback to prevent memory leaks
  const setItemRef = useCallback((element, key) => {
    if (element) {
      itemRefs.current.set(key, element);
      // Debug: log when refs are set
      // console.log(`BottomNav: Set ref for ${key}`, element);
      
      // Update indicator immediately when ref is set
      if (key === activeKey) {
        setTimeout(() => updateIndicator(), 0);
      }
    } else {
      // Only remove ref if element is actually null/undefined
      // Don't remove ref during re-renders
      if (!element && itemRefs.current.has(key)) {
        itemRefs.current.delete(key);
        // console.log(`BottomNav: Removed ref for ${key}`);
      }
    }
  }, [activeKey, updateIndicator]);

  // Force indicator update when menu active state toggles
  useEffect(() => {
    // schedule multiple updates to catch ref timing
    updateIndicator();
    const t1 = setTimeout(() => updateIndicator(), 0);
    const t2 = setTimeout(() => updateIndicator(), 60);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isMenuActive, updateIndicator]);

  // Debounced indicator update for better performance
  useEffect(() => {
    // console.log('BottomNav: updateIndicator useEffect triggered:', { activeKey, isAuthOrProfilePage });
    
    if (rafIdRef.current) {
      cancelRaf(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Update immediately for better responsiveness
    updateIndicator();
    
  // Then schedule a RAF update for smooth animation (throttled)
  if (rafIdRef.current) { try { cancelRaf(rafIdRef.current); } catch (_) {} }
  rafIdRef.current = scheduleRaf(() => updateIndicator());
    
    // Also schedule an update after a small delay to ensure refs are set
    const delayedUpdate = setTimeout(() => {
      updateIndicator();
    }, 50);
    
    return () => {
      if (rafIdRef.current) {
        cancelRaf(rafIdRef.current);
        rafIdRef.current = null;
      }
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
      
      if (rafIdRef.current) {
        cancelRaf(rafIdRef.current);
      }
      
  if (rafIdRef.current) { try { cancelRaf(rafIdRef.current); } catch (_) {} }
  rafIdRef.current = scheduleRaf(() => { if (isMounted) updateIndicator(); });
    };

    const handleVisibilityChange = () => {
      if (!isMounted) return;
      isDocHiddenRef.current = document.hidden;
      
      // console.log('BottomNav: Visibility changed:', { hidden: document.hidden });
      
      // Update indicator when page becomes visible again
      if (!document.hidden) {
        setTimeout(() => {
          if (isMounted) {
            updateIndicator();
          }
        }, 100);
      }
    };

    // Add event listeners with passive option for better performance
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    
    // Use ResizeObserver for more reliable sizing
    if ('ResizeObserver' in window && containerRef.current) {
      resizeObserverRef.current = new ResizeObserver(handleResize);
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      isMounted = false;
      
      // Clean up event listeners
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up ResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      // Clean up RAF
      if (rafIdRef.current) {
        cancelRaf(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [updateIndicator]);

  // Initial positioning with delay for mobile devices
  useEffect(() => {
    if (!isFirstMount.current) return;
    
    // console.log('BottomNav: Initial positioning effect triggered');
    
    let isMounted = true;
    
    // Update immediately for better responsiveness
    updateIndicator();
    
    const timer = setTimeout(() => {
      if (isMounted) {
  updateIndicator();
  if (rafIdRef.current) { try { cancelRaf(rafIdRef.current); } catch (_) {} }
  rafIdRef.current = scheduleRaf(() => { if (isMounted) updateIndicator(); });
      }
    }, 100); // Reduced delay for better responsiveness
    
    // Also check if refs are available and update
    const refCheckTimer = setTimeout(() => {
      if (isMounted && itemRefs.current.size > 0) {
        updateIndicator();
      }
    }, 200);
      
    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearTimeout(refCheckTimer);
    };
  }, [updateIndicator]);

  // Handle route changes
  useEffect(() => {
    if (isFirstMount.current) return;
    
    let isMounted = true;
    
    // Update immediately for better responsiveness
    updateIndicator();
    
    const timer = setTimeout(() => {
      if (isMounted) {
  updateIndicator();
  rafIdRef.current = scheduleRaf(() => { if (isMounted) updateIndicator(); });
      }
    }, 50); // Reduced delay for better responsiveness
    
    // Also check if refs are available and update
    const refCheckTimer = setTimeout(() => {
      if (isMounted && itemRefs.current.size > 0) {
        updateIndicator();
      }
    }, 100);
      
    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearTimeout(refCheckTimer);
    };
  }, [activeKey, updateIndicator]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      
      // Clear all refs
      if (rafIdRef.current) {
        cancelRaf(rafIdRef.current);
        rafIdRef.current = null;
      }
      
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
    if (itemRefs.current.size > 0 && activeKey && !isAuthOrProfilePage) {
      
      // Update indicator when refs become available
      setTimeout(() => updateIndicator(), 0);
    }
  }, [itemRefs.current.size, activeKey, isAuthOrProfilePage, updateIndicator]);

  // Don't render if should hide - moved to JSX level to avoid hook issues

  // Full animation variants for all devices
  const entranceVariants = {
    hidden: {
      y: 50,
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 25,
        mass: 1,
        delay: 0.05,
      }
    }
  };

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    setHasAnimatedIn(true);
    isFirstMount.current = false;
    
    // Update indicator immediately when animation completes
    updateIndicator();
    
    // Then schedule additional updates to ensure smooth positioning
    setTimeout(() => {
      updateIndicator();
      if (rafIdRef.current) { try { cancelRaf(rafIdRef.current); } catch (_) {} }
      rafIdRef.current = scheduleRaf(() => updateIndicator());
    }, 50);
    
    // Also check if refs are available and update
    setTimeout(() => {
      if (itemRefs.current.size > 0) {
        updateIndicator();
      }
    }, 100);
  }, [updateIndicator]);

  // Handle nav item interactions
  const handleNavInteraction = useCallback(() => {
    
    // Update immediately for better responsiveness
    updateIndicator();
    
  // Throttled RAF update
  if (rafIdRef.current) { try { cancelRaf(rafIdRef.current); } catch (_) {} }
  rafIdRef.current = scheduleRaf(() => updateIndicator());
    
    // Also check if refs are available and update
    setTimeout(() => {
      if (itemRefs.current.size > 0) {
        updateIndicator();
      }
    }, 50);
  }, [updateIndicator]);

  // Don't render if should hide
  if (shouldHide) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.nav
        key="bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
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
                      className={`relative overflow-hidden flex flex-col items-center justify-center gap-0.5 h-12 px-2 rounded-xl transition-all duration-150 ${
                        isActive ? 'text-black' : 'text-white/70 hover:text-white active:text-white/90'
                      }`}
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
                  aria-haspopup="dialog"
                  aria-expanded={isMenuOpen}
                  aria-controls="bottom-sheet-menu"
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  className={`relative overflow-hidden flex flex-col items-center justify-center gap-0.5 h-12 px-2 rounded-xl transition-all duration-150 ${
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
              <div
                ref={(el) => {
                  indicatorRef.current = el;
                  if (el) {
                    // console.log('BottomNav: Indicator ref set:', el);
                  } else {
                    // console.log('BottomNav: Indicator ref cleared');
                  }
                }}
                className="absolute rounded-xl bg-white pointer-events-none shadow-lg"
                style={{
                  top: 4,
                  left: 0,
                  transform: `translate3d(${lastIndicatorMetricsRef.current.x}px, 0, 0)`,
                  width: `${lastIndicatorMetricsRef.current.width}px`,
                  height: `${lastIndicatorMetricsRef.current.height}px`,
                  backfaceVisibility: 'hidden',
                  minWidth: '60px',
                  minHeight: '48px',
                  willChange: 'transform,width,height',
                  transitionProperty: 'transform,width,height',
                  transitionDuration: '180ms',
                  transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                aria-hidden="true"
                // onLoad={() => console.log('BottomNav: Indicator element loaded')}
                data-debug={`x:${lastIndicatorMetricsRef.current.x},w:${lastIndicatorMetricsRef.current.width},h:${lastIndicatorMetricsRef.current.height}`}
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
                onClick={() => setIsMenuOpen(false)}
              />
              {/* Sheet */}
              <motion.div
                key="menu-sheet"
                id="bottom-sheet-menu"
                role="dialog"
                aria-modal="true"
                className="absolute left-0 right-0 z-[70] bottom-[calc(100%+8px)]"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              >
                <div
                  className="mx-auto max-w-7xl p-1"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
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


