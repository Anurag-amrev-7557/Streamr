import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useLoading } from '../contexts/LoadingContext';
import { 
  useBottomNavigationPerformance, 
  useOptimizedNavigation, 
  useDebouncedNavigation 
} from '../hooks/useBottomNavigationPerformance';
import { 
  startBottomNavigationMemoryOptimization, 
  stopBottomNavigationMemoryOptimization, 
  trackBottomNavigationRender 
} from '../utils/bottomNavigationMemoryOptimizer';

// Enhanced icon components with better accessibility and performance
const createIcon = (paths, isActive = false) => memo(() => (
  <svg 
    className="w-6 h-6" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    {paths.map((path, index) => (
      <path 
        key={index}
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={isActive ? 2 : 1.5} 
        d={path} 
      />
    ))}
  </svg>
));

// Icon definitions for better maintainability
const ICON_PATHS = {
  home: ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z", "M9 22V12h6v10"],
  movies: ["M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"],
  series: ["M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"],
  community: ["M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"],
  watchlist: ["M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"]
};

// Create icon components
const HomeIcon = createIcon(ICON_PATHS.home);
const HomeIconActive = createIcon(ICON_PATHS.home, true);
const MoviesIcon = createIcon(ICON_PATHS.movies);
const MoviesIconActive = createIcon(ICON_PATHS.movies, true);
const SeriesIcon = createIcon(ICON_PATHS.series);
const SeriesIconActive = createIcon(ICON_PATHS.series, true);
const CommunityIcon = createIcon(ICON_PATHS.community);
const CommunityIconActive = createIcon(ICON_PATHS.community, true);
const WatchlistIcon = createIcon(ICON_PATHS.watchlist);
const WatchlistIconActive = createIcon(ICON_PATHS.watchlist, true);

// Enhanced badge component with better animations and accessibility
const Badge = memo(({ count, className = "" }) => {
  const displayCount = useMemo(() => {
    if (!count || count <= 0) return null;
    return count > 99 ? '99+' : count.toString();
  }, [count]);

  if (!displayCount) return null;
  
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.2 
      }}
      className={`absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg ${className}`}
      aria-label={`${count} items in watchlist`}
    >
      {displayCount}
    </motion.span>
  );
});

// Enhanced haptic feedback utility
const useHapticFeedback = () => {
  return useCallback(() => {
    // Check if haptic feedback is available
    if ('vibrate' in navigator) {
      // Light haptic feedback for navigation
      navigator.vibrate(10);
    }
  }, []);
};

// Enhanced preloading utility
const usePreloadPages = () => {
  const preloadedPages = useRef(new Set());
  
  const preloadPage = useCallback((path) => {
    if (preloadedPages.current.has(path)) return;
    
    // Preload the page component
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);
    
    preloadedPages.current.add(path);
  }, []);
  
  return { preloadPage };
};

// Enhanced navigation item component with better performance and accessibility
const NavigationItem = memo(({ 
  item, 
  isActive, 
  onNavigate, 
  watchlistCount,
  isDisabled = false,
  isNavigating = false
}) => {
  const hapticFeedback = useHapticFeedback();
  const navigate = useNavigate();
  
  const handleClick = useCallback((e) => {
    e.preventDefault();
    if (process.env.NODE_ENV === 'development') {
      console.log('BottomNavigation: Clicked on', item.path, { isDisabled, isNavigating });
    }
    if (!isDisabled && !isNavigating) {
      hapticFeedback();
      
      // Try direct navigation first
      try {
        navigate(item.path);
        if (process.env.NODE_ENV === 'development') {
          console.log('BottomNavigation: Direct navigation attempted to', item.path);
        }
      } catch (error) {
        console.error('Direct navigation failed:', error);
        // Fallback to prop-based navigation
        onNavigate(item.path);
      }
      
      // FIXED: Removed problematic fallback that was causing page refreshes on mobile
    }
  }, [navigate, onNavigate, item.path, isDisabled, isNavigating, hapticFeedback]);

  const isWatchlist = item.path === '/watchlist';
  const hasBadge = isWatchlist && watchlistCount > 0;

  return (
    <motion.button
      onClick={handleClick}
      disabled={isDisabled || isNavigating}
      whileHover={!isDisabled && !isNavigating ? { scale: 1.05 } : {}}
      whileTap={!isDisabled && !isNavigating ? { scale: 0.95 } : {}}
              className={`flex flex-col items-center justify-center w-16 h-10 rounded-lg transition-all duration-200 relative ${
        isActive 
          ? 'text-white' 
          : isDisabled || isNavigating
          ? 'text-gray-500 cursor-not-allowed'
          : 'text-gray-400 hover:text-white'
      }`}
      aria-label={`Navigate to ${item.label}`}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={isDisabled || isNavigating}
    >

      
      <motion.div
        initial={false}
        animate={{ 
          rotate: isActive ? 0 : 0,
          scale: 1
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25,
          duration: 0.2 
        }}
        className="relative"
      >
        {isActive ? item.activeIcon : item.icon}
        {hasBadge && <Badge count={watchlistCount} />}
      </motion.div>
      
      <motion.span
        initial={false}
        animate={{ 
          opacity: isActive ? 1 : 0.7,
          y: 0
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25,
          duration: 0.2 
        }}
        className="text-xs font-medium mt-1"
      >
        {item.label}
      </motion.span>
      

    </motion.button>
  );
});

// Enhanced visibility logic hook
const useNavigationVisibility = () => {
  const location = useLocation();
  const { loadingStates } = useLoading();
  
  return useMemo(() => {
    // Auth pages where navigation should be hidden
    const authPaths = [
      '/login', 
      '/signup', 
      '/forgot-password', 
      '/reset-password', 
      '/verify-email', 
      '/oauth-success'
    ];
    
    // Pages where navigation should be hidden
    const hiddenPaths = [
      ...authPaths,
      '/network-test',
      '/test-auth',
      '/auth-debug'
    ];
    
    const isOnHiddenPage = hiddenPaths.some(path => location.pathname.startsWith(path));
    const isFullPageLoaderActive = loadingStates.initial;
    const isOnAuthPage = authPaths.some(path => location.pathname.startsWith(path));
    
    return {
      shouldHide: isOnHiddenPage || isFullPageLoaderActive,
      isOnAuthPage,
      isOnHiddenPage,
      isFullPageLoaderActive
    };
  }, [location.pathname, loadingStates.initial]);
};

// Enhanced navigation state management
const useNavigationState = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { watchlistCount } = useWatchlist();
  const [navigatingTo, setNavigatingTo] = useState(null);
  
  // Memoized navigation items with conditional rendering
  const navigationItems = useMemo(() => {
    const baseItems = [
      {
        path: '/',
        label: 'Home',
        icon: <HomeIcon />,
        activeIcon: <HomeIconActive />,
        requiresAuth: false
      },
      {
        path: '/movies',
        label: 'Movies',
        icon: <MoviesIcon />,
        activeIcon: <MoviesIconActive />,
        requiresAuth: false
      },
      {
        path: '/series',
        label: 'Series',
        icon: <SeriesIcon />,
        activeIcon: <SeriesIconActive />,
        requiresAuth: false
      },
      {
        path: '/community',
        label: 'Comm',
        icon: <CommunityIcon />,
        activeIcon: <CommunityIconActive />,
        requiresAuth: false
      },
      {
        path: '/watchlist',
        label: 'Watchlist',
        icon: <WatchlistIcon />,
        activeIcon: <WatchlistIconActive />,
        requiresAuth: false
      }
    ];

    return baseItems.map(item => ({
      ...item,
      isDisabled: item.requiresAuth && !user
    }));
  }, [user]);

  // Enhanced active path detection
  const isActivePath = useCallback((path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    // For other paths, check if the current path starts with the navigation path
    // but also handle edge cases like /community/discussion/123
    if (path === '/community') {
      return location.pathname.startsWith('/community') && !location.pathname.startsWith('/community/discussion/');
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Safe watchlist count with validation
  const safeWatchlistCount = useMemo(() => {
    const count = Number(watchlistCount) || 0;
    const safeCount = Math.max(0, Math.min(count, 999)); // Clamp between 0 and 999
    
    if (process.env.NODE_ENV === 'development' && count !== safeCount) {
      console.log(`BottomNavigation: watchlistCount sanitized from ${count} to ${safeCount}`);
    }
    
    return safeCount;
  }, [watchlistCount]);

  // Simplified navigation handler for better reliability
  const handleNavigation = useCallback((path) => {
    if (location.pathname === path) {
      if (process.env.NODE_ENV === 'development') {
        console.log('BottomNavigation: Already on path', path);
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('BottomNavigation: Navigating from', location.pathname, 'to', path);
    }
    
    setNavigatingTo(path);
    
    try {
      // Simple direct navigation
      navigate(path);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      
    } catch (error) {
      console.error('Navigation failed:', error);
    } finally {
      // Clear navigating state after a short delay
      setTimeout(() => {
        setNavigatingTo(null);
      }, 100);
    }
  }, [location.pathname, navigate]);

  return {
    navigationItems,
    isActivePath,
    safeWatchlistCount,
    currentPath: location.pathname,
    navigatingTo,
    handleNavigation
  };
};

// Main BottomNavigation component with enhanced logic
const BottomNavigation = memo(() => {
  const { startMonitoring, recordRender, getPerformanceMetrics, cleanup } = useBottomNavigationPerformance();
  
  // Enhanced state management
  const { 
    navigationItems, 
    isActivePath, 
    safeWatchlistCount, 
    currentPath,
    navigatingTo,
    handleNavigation 
  } = useNavigationState();
  const { shouldHide, isOnAuthPage, isOnHiddenPage, isFullPageLoaderActive } = useNavigationVisibility();
  const { loadingStates } = useLoading();
  const location = useLocation();
  
  // Performance monitoring with better error handling
  useEffect(() => {
    try {
      const monitoringCleanup = startMonitoring();
      
      // Start memory optimization
      startBottomNavigationMemoryOptimization();
      
      return () => {
        monitoringCleanup();
        cleanup();
        stopBottomNavigationMemoryOptimization();
      };
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }, [startMonitoring, cleanup]);

  // Optimized render tracking
  useEffect(() => {
    // Only track renders very occasionally to reduce overhead
    if (Math.random() < 0.01) { // 1% chance
      try {
        recordRender();
        trackBottomNavigationRender();
      } catch (error) {
        console.warn('Render tracking failed:', error);
      }
    }
  });

  // Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        getPerformanceMetrics();
        cleanup();
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    };
  }, [getPerformanceMetrics, cleanup]);

  // Early return with better logging
  if (shouldHide) {
    if (process.env.NODE_ENV === 'development') {
      console.log('BottomNavigation: Hidden due to', { 
        isOnAuthPage, 
        isOnHiddenPage: shouldHide, 
        currentPath: location.pathname,
        loadingStates: loadingStates 
      });
    }
    return null;
  }

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.3 
      }}
      className="bottom-navigation-fixed bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-2xl sm:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 2147483647,
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0
      }}
      role="navigation"
      aria-label="Bottom navigation"
    >
              <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {navigationItems.map((item) => (
          <NavigationItem
            key={item.path}
            item={item}
            isActive={isActivePath(item.path)}
            onNavigate={handleNavigation}
            watchlistCount={safeWatchlistCount}
            isDisabled={item.isDisabled}
            isNavigating={navigatingTo === item.path}
          />
        ))}
      </div>
    </motion.nav>
  );
});

// Add display names for better debugging
BottomNavigation.displayName = 'BottomNavigation';
NavigationItem.displayName = 'NavigationItem';
Badge.displayName = 'Badge';

export default BottomNavigation; 