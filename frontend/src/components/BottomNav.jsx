import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HomeIcon, FilmIcon, TvIcon, UserGroupIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { useLoading } from '../contexts/LoadingContext';

const navItems = [
  { to: '/', label: 'Home', icon: <HomeIcon className="w-6 h-6" /> },
  { to: '/movies', label: 'Movies', icon: <FilmIcon className="w-6 h-6" /> },
  { to: '/series', label: 'Series', icon: <TvIcon className="w-6 h-6" /> },
  { to: '/community', label: 'Community', icon: <UserGroupIcon className="w-6 h-6" /> },
  { to: '/watchlist', label: 'Wishlist', icon: <BookmarkIcon className="w-6 h-6" /> },
];

const BottomNav = () => {
  const location = useLocation();
  const { loadingStates } = useLoading();
  const containerRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({
    x: 0,
    y: 4,
    width: 60,
    height: 48
  });

  const isFirstMount = useRef(true);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const rafIdRef = useRef(null);
  
  // Hide bottom nav when full page loader is shown
  const shouldHide = loadingStates.initial;

  const activeKey = useMemo(() => {
    const match = navItems.find(item => (
      location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
    ));
    return match?.to ?? '/';
  }, [location.pathname]);

  const updateIndicator = useCallback(() => {
    if (!activeKey || !itemRefs.current[activeKey] || !containerRef.current) return;
    
    const activeElement = itemRefs.current[activeKey];
    if (!activeElement) return;
    
    try {
      const rect = activeElement.getBoundingClientRect();
      const navRect = containerRef.current.getBoundingClientRect();
      
      if (!navRect || rect.width === 0 || rect.height === 0) return;
      
      const x = Math.max(0, rect.left - navRect.left);
      const width = Math.max(60, rect.width);
      const height = Math.max(48, rect.height);
      
      setIndicator({
        x,
        y: 4,
        width,
        height
      });
    } catch (error) {
      console.warn('Indicator positioning failed:', error);
      // Fallback to default position
      setIndicator({
        x: 0,
        y: 4,
        width: 60,
        height: 48
      });
    }
  }, [activeKey]);

  // Debounced indicator update for better performance
  useEffect(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      updateIndicator();
    });
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [updateIndicator]);

  // Handle resize and orientation changes
  useEffect(() => {
    const handleResize = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(updateIndicator);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    
    // Use ResizeObserver for more reliable sizing
    let resizeObserver;
    if ('ResizeObserver' in window && containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateIndicator]);

  // Initial positioning with delay for mobile devices
  useEffect(() => {
    if (isFirstMount.current) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          updateIndicator();
        });
      }, 800); // Reduced delay for better responsiveness
      
      return () => clearTimeout(timer);
    }
  }, [updateIndicator]);

  // Handle route changes
  useEffect(() => {
    if (!isFirstMount.current) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          updateIndicator();
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeKey, updateIndicator]);

  // Early return if should hide
  if (shouldHide) {
    return null;
  }

  // Simplified animation variants for better performance
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
        stiffness: 200, // Reduced for better performance
        damping: 25,
        mass: 1,
        delay: 0.05,
      }
    }
  };

  // Simplified indicator animation
  const indicatorVariants = {
    initial: {
      opacity: 0,
      scale: 0.8,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

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
        onAnimationComplete={() => {
          setHasAnimatedIn(true);
          isFirstMount.current = false;
          setTimeout(() => {
            requestAnimationFrame(updateIndicator);
          }, 100);
        }}
      >
        <div className="mx-auto max-w-7xl p-1">
          <div
            ref={containerRef}
            className="relative bg-[#1a1d21]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl bottom-nav-optimized animate-optimized"
            style={{ 
              contain: 'layout paint',
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)'
            }}
          >
            <ul className="flex items-center justify-between p-1">
              {navItems.map((item, index) => {
                const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <motion.li
                    key={item.to}
                    ref={(el) => { if (el) itemRefs.current[item.to] = el; }}
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
                      onClick={() => {
                        // Immediate indicator update on click
                        requestAnimationFrame(updateIndicator);
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
            </ul>
            
                         {/* Optimized background indicator */}
             <motion.div
               className="absolute rounded-xl bg-white pointer-events-none shadow-lg"
               style={{ 
                 top: 0, 
                 left: 0, 
                 willChange: 'transform',
                 WebkitTransform: 'translate3d(0,0,0)',
                 transform: 'translate3d(0,0,0)',
                 backfaceVisibility: 'hidden',
                 minWidth: '60px',
                 minHeight: '48px'
               }}
               variants={indicatorVariants}
               initial="initial"
               animate={{ 
                 x: indicator.x || 0, 
                 y: indicator.y || 0, 
                 width: indicator.width || 60, 
                 height: indicator.height || 48,
                 opacity: 1,
                 scale: 1
               }}
               transition={{
                 type: 'spring',
                 stiffness: 300,
                 damping: 30,
                 mass: 0.8,
                 duration: 0.4
               }}
               aria-hidden="true"
             />
          </div>
        </div>
      </motion.nav>
    </AnimatePresence>
  );
};

export default BottomNav;


