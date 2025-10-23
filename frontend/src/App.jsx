import React, { Suspense, lazy, useState, useEffect, useRef } from 'react'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// 🚀 ADVANCED: React Query for server state management
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Initialize enhanced caching system
import enhancedCache from './services/enhancedCacheService.js'
import enhancedApiServiceV2 from './services/enhancedApiServiceV2.js'

// Initialize lightweight service worker for minimal network requirements
// Lazy load all route-level pages/components with error handling
const HomePage = lazy(() => import('./pages/HomePage.jsx').catch(err => {
  console.error('Failed to load HomePage:', err);
  return { default: () => <div>Failed to load HomePage</div> };
}));
const Navbar = lazy(() => import('./components/navigation/Navbar.jsx').catch(err => {
  console.error('Failed to load Navbar:', err);
  return { default: () => <div>Failed to load Navbar</div> };
}));
const CastDetailsOverlay = lazy(() => import('./components/CastDetailsOverlay').catch(err => {
  console.error('Failed to load CastDetailsOverlay:', err);
  return { default: () => <div>Failed to load CastDetailsOverlay</div> };
}));
const MoviesPage = lazy(() => import('./pages/MoviesPage.jsx').catch(err => {
  console.error('Failed to load MoviesPage:', err);
  return { default: () => <div>Failed to load MoviesPage</div> };
}));
const SeriesPage = lazy(() => import('./pages/SeriesPage.jsx').catch(err => {
  console.error('Failed to load SeriesPage:', err);
  return { default: () => <div>Failed to load SeriesPage</div> };
}));
const ProfilePage = lazy(() => import('./pages/ProfilePage').catch(err => {
  console.error('Failed to load ProfilePage:', err);
  return { default: () => <div>Failed to load ProfilePage</div> };
}));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').catch(err => {
  console.error('Failed to load WatchlistPage:', err);
  return { default: () => <div>Failed to load WatchlistPage</div> };
}));
const CommunityPage = lazy(() => import('./pages/CommunityPage.jsx').catch(err => {
  console.error('Failed to load CommunityPage:', err);
  return { default: () => <div>Failed to load CommunityPage</div> };
}));
const SingleDiscussion = lazy(() => import('./components/community/SingleDiscussion').catch(err => {
  console.error('Failed to load SingleDiscussion:', err);
  return { default: () => <div>Failed to load SingleDiscussion</div> };
}));
const OverflowTest = lazy(() => import('./components/OverflowTest').catch(err => {
  console.error('Failed to load OverflowTest:', err);
  return { default: () => <div>Failed to load OverflowTest</div> };
}));
import './App.css'
import { LoadingProvider, useLoading } from './contexts/LoadingContext'

// Global scroll performance enhancement
if (typeof document !== 'undefined') {
  const { reducedMotion, saveData, lowEndDevice } = getGlobalPerformanceHints();
  const scrollBehavior = reducedMotion ? 'auto' : 'smooth';
  const momentumScroll = !lowEndDevice && !saveData ? 'touch' : 'auto';
  const scrollSnapType = lowEndDevice || saveData ? 'none' : 'y proximity';
  const scrollSnapStrictType = lowEndDevice || saveData ? 'none' : 'y mandatory';
  const willChangeValue = lowEndDevice || saveData ? 'auto' : 'scroll-position, transform';
  const transformValue = lowEndDevice || saveData ? 'none' : 'translateZ(0)';
  const perspectiveValue = lowEndDevice || saveData ? 'none' : '1000px';
  const containValue = lowEndDevice || saveData ? 'layout paint' : 'layout style paint';
  const isolationValue = lowEndDevice || saveData ? 'auto' : 'isolate';
  const contentVisibilityValue = lowEndDevice || saveData ? 'visible' : 'auto';
  const intrinsicSizeValue = contentVisibilityValue === 'auto' ? 'auto 500px' : 'none';

  document.documentElement.style.scrollBehavior = scrollBehavior;
  
  // Optimize scroll performance while respecting device capabilities
  const existingStyle = document.head.querySelector('style[data-streamr-scroll-style="global"]');
  if (existingStyle) {
    existingStyle.remove();
  }

  const style = document.createElement('style');
  style.setAttribute('data-streamr-scroll-style', 'global');
  style.textContent = `
    html {
      scroll-behavior: ${scrollBehavior};
      -webkit-overflow-scrolling: ${momentumScroll};
      overscroll-behavior: auto;
    }
    
    body {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    
    /* Ultra-smooth scrolling for all scrollable elements */
    * {
      scroll-behavior: ${scrollBehavior};
    }
    
    /* Optimize scroll containers with enhanced performance */
    .scroll-container, [class*="scroll"], [class*="overflow"] {
      -webkit-overflow-scrolling: ${momentumScroll};
      overscroll-behavior: auto;
      scroll-behavior: ${scrollBehavior};
      scroll-snap-type: ${scrollSnapType};
      scrollbar-gutter: stable;
    }
    
    /* Hardware acceleration tuned per capability */
    .ultra-smooth-scroll, .scroll-container-fix {
      transform: ${transformValue};
      backface-visibility: hidden;
      perspective: ${perspectiveValue};
      will-change: ${willChangeValue};
      contain: ${containValue};
      isolation: ${isolationValue};
    }
    
    /* Enhanced scrolling for high refresh rate displays */
    @media (min-resolution: 120dpi), (-webkit-min-device-pixel-ratio: 1.25) {
      .ultra-smooth-scroll {
        transform: ${transformValue === 'none' ? 'none' : 'translate3d(0, 0, 0)'};
        -webkit-transform: ${transformValue === 'none' ? 'none' : 'translate3d(0, 0, 0)'};
        -moz-transform: ${transformValue === 'none' ? 'none' : 'translate3d(0, 0, 0)'};
        -ms-transform: ${transformValue === 'none' ? 'none' : 'translate3d(0, 0, 0)'};
        -o-transform: ${transformValue === 'none' ? 'none' : 'translate3d(0, 0, 0)'};
      }
    }
    
    /* Momentum scrolling optimization */
    .momentum-scroll {
      -webkit-overflow-scrolling: ${momentumScroll};
      overscroll-behavior: auto;
      scroll-snap-type: ${scrollSnapStrictType};
      scroll-padding: 0;
    }
    
    /* Performance-optimized scroll containers */
    .performance-scroll {
      contain: strict;
      content-visibility: ${contentVisibilityValue};
      contain-intrinsic-size: ${intrinsicSizeValue};
    }
  `;
  document.head.appendChild(style);
}
// Dev-only: load test utilities dynamically to avoid production overhead
import { WatchlistProvider } from './contexts/WatchlistContext'
import { WishlistProvider } from './contexts/WishlistContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ViewingProgressProvider } from './contexts/ViewingProgressContext'
import { WatchHistoryProvider } from './contexts/WatchHistoryContext'
import { UndoProvider } from './contexts/UndoContext'
import UndoManager from './components/UndoManager'
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute').catch(err => {
  console.error('Failed to load ProtectedRoute:', err);
  return { default: () => <div>Failed to load ProtectedRoute</div> };
}));
const LoginPage = lazy(() => import('./pages/LoginPage').catch(err => {
  console.error('Failed to load LoginPage:', err);
  return { default: () => <div>Failed to load LoginPage</div> };
}));
const SignupPage = lazy(() => import('./pages/SignupPage').catch(err => {
  console.error('Failed to load SignupPage:', err);
  return { default: () => <div>Failed to load SignupPage</div> };
}));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').catch(err => {
  console.error('Failed to load ForgotPasswordPage:', err);
  return { default: () => <div>Failed to load ForgotPasswordPage</div> };
}));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').catch(err => {
  console.error('Failed to load ResetPasswordPage:', err);
  return { default: () => <div>Failed to load ResetPasswordPage</div> };
}));
const OAuthSuccessPage = lazy(() => import('./pages/OAuthSuccessPage').catch(err => {
  console.error('Failed to load OAuthSuccessPage:', err);
  return { default: () => <div>Failed to load OAuthSuccessPage</div> };
}));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').catch(err => {
  console.error('Failed to load VerifyEmailPage:', err);
  return { default: () => <div>Failed to load VerifyEmailPage</div> };
}));
const NetworkTestPage = lazy(() => import('./pages/NetworkTestPage.jsx').catch(err => {
  console.error('Failed to load NetworkTestPage:', err);
  return { default: () => <div>Failed to load NetworkTestPage</div> };
}));
const BottomNavTest = lazy(() => import('./components/navigation/BottomNavTest.jsx').catch(err => {
  console.error('Failed to load BottomNavTest:', err);
  return { default: () => <div>Failed to load BottomNavTest</div> };
}));
const TestAuthPage = lazy(() => import('./pages/TestAuthPage').catch(err => {
  console.error('Failed to load TestAuthPage:', err);
  return { default: () => <div>Failed to load TestAuthPage</div> };
}));
const TestProgressPage = lazy(() => import('./pages/TestProgressPage').catch(err => {
  console.error('Failed to load TestProgressPage:', err);
  return { default: () => <div>Failed to load TestProgressPage</div> };
}));
const ProgressTestComponent = lazy(() => import('./components/ProgressTestComponent').catch(err => {
  console.error('Failed to load ProgressTestComponent:', err);
  return { default: () => <div>Failed to load ProgressTestComponent</div> };
}));
const UndoTest = lazy(() => import('./components/UndoTest').catch(err => {
  console.error('Failed to load UndoTest:', err);
  return { default: () => <div>Failed to load UndoTest</div> };
}));
const WishlistTest = lazy(() => import('./components/WishlistTest').catch(err => {
  console.error('Failed to load WishlistTest:', err);
  return { default: () => <div>Failed to load WishlistTest</div> };
}));
const DonatePage = lazy(() => import('./pages/DonatePage.jsx').catch(err => {
  console.error('Failed to load DonatePage:', err);
  return { default: () => <div>Failed to load Donate Page</div> };
}));
const MangaListPage = lazy(() => import('./pages/MangaListPage.jsx').catch(err => {
  console.error('Failed to load MangaListPage:', err);
  return { default: () => <div>Failed to load Manga</div> };
}));
const MangaDetailsPage = lazy(() => import('./pages/MangaDetailsPage.jsx').catch(err => {
  console.error('Failed to load MangaDetailsPage:', err);
  return { default: () => <div>Failed to load Manga Details</div> };
}));
const MangaReaderPage = lazy(() => import('./pages/MangaReaderPage.jsx').catch(err => {
  console.error('Failed to load MangaReaderPage:', err);
  return { default: () => <div>Failed to load Reader</div> };
}));
import { SocketProvider } from './contexts/SocketContext'
// Lazy load components that are not immediately needed
const MovieDetailsOverlay = lazy(() => import('./components/MovieDetailsOverlay.jsx').catch(err => {
  console.error('Failed to load MovieDetailsOverlay:', err);
  return { default: () => <div>Failed to load MovieDetailsOverlay</div> };
}));
// const NetworkStatus = lazy(() => import('./components/NetworkStatus'));

// Network Status Indicator for minimal network requirements
const NetworkStatusIndicator = lazy(() => import('./components/NetworkStatusIndicator').catch(err => {
  console.error('Failed to load NetworkStatusIndicator:', err);
  return { default: () => <div>Network Status: Loading...</div> };
}));
const PerformanceDashboard = lazy(() => import('./components/PerformanceDashboard').catch(err => {
  console.error('Failed to load PerformanceDashboard:', err);
  return { default: () => <div>Failed to load PerformanceDashboard</div> };
}));
const CacheManagementDashboard = lazy(() => import('./components/CacheManagementDashboard').catch(err => {
  console.error('Failed to load CacheManagementDashboard:', err);
  return { default: () => <div>Failed to load CacheManagementDashboard</div> };
}));
const PageLoader = lazy(() => import('./components/Loader').then(module => ({ default: module.PageLoader })).catch(err => {
  console.error('Failed to load PageLoader:', err);
  return { default: () => <div>Failed to load PageLoader</div> };
}));
const BottomNav = lazy(() => import('./components/navigation/BottomNav.jsx').catch(err => {
  console.error('Failed to load BottomNav:', err);
  return { default: () => null };
}));
import { useSmoothScroll } from './hooks/useSmoothScroll'
// Import performance service to initialize it
import './services/performanceOptimizationService'
// Dev-only: dynamically load debug utilities
if (import.meta.env.DEV) {
  import('./utils/testCastDetails').catch(() => {});
}
// Import error boundary
import { ErrorBoundary } from './utils/errorBoundary.jsx'
// Import test utility (remove in production)
import { testErrorBoundary } from './utils/testErrorHandling'
// FIXED: Import memory cleanup utility
import memoryCleanupUtility from './utils/memoryCleanupUtility'
// Import robust service worker manager
import serviceWorkerManager from './utils/serviceWorkerRegistration'

function getGlobalPerformanceHints() {
  if (typeof window === 'undefined') {
    return { reducedMotion: false, saveData: false, lowEndDevice: false };
  }

  // Force reducedMotion to false to enable animations on all devices including mobile
  let reducedMotion = false;
  let saveData = false;
  let lowEndDevice = false;

  // Remove reduced motion detection to always enable animations
  // try {
  //   if (window.matchMedia) {
  //     reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  //   }
  // } catch (_) {}

  try {
    const nav = window.navigator || {};
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;

    if (connection) {
      saveData = Boolean(connection.saveData);
      if (!saveData && typeof connection.effectiveType === 'string') {
        saveData = /(^2g$|^slow-2g$|^3g$)/i.test(connection.effectiveType);
      }
    }

    const deviceMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined;
    const hardwareConcurrency = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined;
    const maxTouchPoints = typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : 0;

    if (typeof deviceMemory === 'number' && deviceMemory <= 2) {
      lowEndDevice = true;
    }

    if (typeof hardwareConcurrency === 'number' && hardwareConcurrency > 0 && hardwareConcurrency <= 4) {
      lowEndDevice = true;
    }

    if (!lowEndDevice && maxTouchPoints > 2 && typeof hardwareConcurrency === 'number' && hardwareConcurrency <= 6) {
      lowEndDevice = true;
    }
  } catch (_) {}

  return { reducedMotion, saveData, lowEndDevice };
}

// Only register a service worker in production to avoid dev caching interfering with Vite optimize-deps
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Check if service worker has been emergency disabled
  if (window.__SERVICE_WORKER_DISABLED__ || 
      (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('streamr_sw_disabled') === 'true')) {
    console.log('⚠️ Service worker registration skipped - emergency disabled');
    console.log('💡 To re-enable, clear localStorage and refresh the page');
  } else {
    // Use the service worker manager for robust registration
    serviceWorkerManager.register().then(success => {
      if (success) {
        console.log('🚀 Service Worker registered successfully with manager');
      } else {
        console.log('Service Worker registration completed (may have been skipped due to errors)');
      }
    });
  }
}

// Prefetch common route chunks after idle to improve subsequent navigations
if (typeof window !== 'undefined') {
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
  idle(() => {
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const saveData = conn && (conn.saveData || false);
      const effectiveType = conn && conn.effectiveType;
      const isSlow = effectiveType && /(^2g$|^slow-2g$|^3g$)/i.test(effectiveType);
      const cores = navigator.hardwareConcurrency || 8;
      if (saveData || isSlow || cores <= 4) {
        return; // Respect user/device/network constraints
      }
    } catch (_) {}

    Promise.allSettled([
      import('./pages/MoviesPage.jsx'),
      import('./pages/SeriesPage.jsx'),
      import('./pages/CommunityPage.jsx'),
      import('./pages/ProfilePage'),
      import('./pages/WatchlistPage')
    ]).catch(() => {});
  });
}

const Layout = () => {
  const [selectedMovie, setSelectedMovie] = React.useState(null);
  const [selectedCast, setSelectedCast] = React.useState(null);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [performanceHints, setPerformanceHints] = useState(() => getGlobalPerformanceHints());
  const isMountedRef = useRef(true); // FIXED: Add mounted ref for cleanup
  
  // Get full page loader state from context
  const { fullPageLoader } = useLoading();
  
  // Debug: Log when selectedMovie changes
  useEffect(() => {
    console.log('🎬 [App] selectedMovie state changed:', selectedMovie?.title || selectedMovie?.name || 'null');
    if (selectedMovie) {
      console.log('🎬 [App] Should show MovieDetailsOverlay now');
    }
  }, [selectedMovie]);
  
  // Debug: Log when selectedCast changes
  useEffect(() => {
    console.log('👤 [App] selectedCast state changed:', selectedCast?.name || 'null');
    if (selectedCast) {
      console.log('👤 [App] Should show CastDetailsOverlay now');
    }
  }, [selectedCast]);
  
  // FIXED: Enhanced cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const nav = typeof navigator !== 'undefined' ? navigator : {};
    // Removed reduced motion media query to enable animations on all devices
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;

    const updateHints = () => {
      setPerformanceHints(prev => {
        const next = getGlobalPerformanceHints();
        if (
          prev.reducedMotion === next.reducedMotion &&
          prev.saveData === next.saveData &&
          prev.lowEndDevice === next.lowEndDevice
        ) {
          return prev;
        }
        return next;
      });
    };

    updateHints();

    // Removed mediaQuery listeners since we're not checking reduced motion anymore

    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', updateHints);
    }

    return () => {
      // Removed mediaQuery cleanup

      if (connection && typeof connection.removeEventListener === 'function') {
        connection.removeEventListener('change', updateHints);
      }
    };
  }, []);

  const { reducedMotion: prefersReducedMotion, saveData, lowEndDevice } = performanceHints;
  
  // Initialize ultra-smooth scrolling
  // NOTE: Ignoring reduced motion to enable full animations on mobile
  const smoothScrollConfig = React.useMemo(() => {
    if (lowEndDevice || saveData) {
      return {
        throttle: 48,
        enableMomentum: false,
        enableIntersectionObserver: false,
        scrollOffset: 72
      };
    }

    // Removed prefersReducedMotion check to enable full animations
    return {
      throttle: 16,
      enableMomentum: true,
      enableIntersectionObserver: true,
      scrollOffset: 80
    };
  }, [lowEndDevice, saveData]);

  const { scrollState } = useSmoothScroll(smoothScrollConfig);

  // Tune animation defaults using detected capability hints to avoid overworking low-end devices
  const defaultMotionTransition = React.useMemo(() => ({
    type: 'tween',
    duration: (lowEndDevice || saveData) ? 0.2 : 0.35,
    ease: (lowEndDevice || saveData) ? 'linear' : 'easeOut'
  }), [lowEndDevice, saveData]);

  // Force animations to 'never' reduce motion - enable on all devices including mobile
  const reducedMotionSetting = 'never';
  const scrollActive = scrollState.isScrolling ? 'true' : 'false';
  const scrollDirection = scrollState.scrollDirection >= 0 ? 'down' : 'up';
  
  const handleMovieSelect = React.useCallback((movie) => {
    console.log('🎬 [App] handleMovieSelect called with:', movie?.title || movie?.name);
    console.log('🎬 [App] Full movie data:', movie);
    
    if (isMountedRef.current) {
      // Add source flag to avoid loading overlay for search results which already have data
      setSelectedMovie({
        ...movie,
        _source: movie._source || 'direct',  // 'direct' = from navbar search, default otherwise
        _skipInitialLoad: movie._source === 'direct' || movie._skipInitialLoad  // Skip loader for search results
      });
      
      console.log('🎬 [App] selectedMovie state updated');
    } else {
      console.warn('🎬 [App] Component not mounted, skipping setSelectedMovie');
    }
  }, []);

  const handleCastSelect = React.useCallback((cast) => {
    console.log('👤 [App] handleCastSelect called with:', cast?.name);
    console.log('👤 [App] Full cast data:', cast);
    
    if (isMountedRef.current) {
      setSelectedCast(cast);
      console.log('👤 [App] selectedCast state updated');
    } else {
      console.warn('👤 [App] Component not mounted, skipping setSelectedCast');
    }
  }, []);
  
  const handleCloseOverlay = React.useCallback(() => {
    if (isMountedRef.current) {
      setSelectedMovie(null);
    }
  }, []);

  const handleCloseCastOverlay = React.useCallback(() => {
    if (isMountedRef.current) {
      setSelectedCast(null);
    }
  }, []);

  // Handle genre navigation from MovieDetailsOverlay
  const handleGenreNavigation = React.useCallback((genre) => {
    if (genre && genre.id) {
      console.log('Genre navigation clicked:', genre.name, 'ID:', genre.id);
      
      // Navigate to MoviesPage with the selected genre
      const searchParams = new URLSearchParams();
      searchParams.set('genre', genre.name.toLowerCase());
      searchParams.set('category', 'popular'); // Default to popular category
      
      // Use window.location for navigation to ensure proper page reload
      window.location.href = `/movies?${searchParams.toString()}`;
    }
  }, []);
  
  // Performance dashboard toggle
  const togglePerformanceDashboard = React.useCallback(() => {
    if (isMountedRef.current) {
      setShowPerformanceDashboard(prev => !prev);
    }
  }, []);
  
  // FIXED: Enhanced keyboard shortcut with proper cleanup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isMountedRef.current && e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        togglePerformanceDashboard();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePerformanceDashboard]);

  // FIXED: Register memory cleanup callback
  useEffect(() => {
    const unregisterCleanup = memoryCleanupUtility.registerCleanupCallback(() => {
      if (isMountedRef.current) {
        // Clear any pending state updates
        setSelectedMovie(null);
        setShowPerformanceDashboard(false);
      }
    }, 'App');
    
    return () => {
      unregisterCleanup();
    };
  }, []);

  // Test error boundary in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      testErrorBoundary();
    }
  }, []);
  
  // If full page loader is active, don't render layout elements
  if (fullPageLoader) {
    return null;
  }
  
  return (
    <MotionConfig reducedMotion={reducedMotionSetting} transition={defaultMotionTransition}>
      <div
        className="min-h-screen bg-[#121417] smooth-scroll performance-scroll"
        data-performance-tier={lowEndDevice ? 'constrained' : 'standard'}
        data-save-data={saveData ? 'true' : 'false'}
        data-reduced-motion="false"
        data-scroll-active={scrollActive}
        data-scroll-direction={scrollDirection}
      >
      {/* Network Status Indicator for minimal network requirements */}
      <Suspense fallback={null}>
        <div className="fixed top-4 right-4 z-50">
          <NetworkStatusIndicator showDetails={false} />
        </div>
      </Suspense>
      
      {/* Conditionally render Navbar and other elements */}
      <Suspense>
        <Navbar onMovieSelect={handleMovieSelect} onCastSelect={handleCastSelect} />
      </Suspense>
      
      <main className="momentum-scroll">
        <AppRoutes />
      </main>
      
      {/* Spacer to prevent content from being hidden behind bottom nav on mobile */}
      
      
      {selectedMovie && (
        <Suspense fallback={null}>
          <MovieDetailsOverlay
            movie={selectedMovie}
            onClose={handleCloseOverlay}
            onMovieSelect={handleMovieSelect}
            onGenreClick={handleGenreNavigation}
          />
        </Suspense>
      )}

      {selectedCast && (
        <Suspense fallback={null}>
          <CastDetailsOverlay
            person={selectedCast}
            onClose={handleCloseCastOverlay}
            onMovieSelect={handleMovieSelect}
            onSeriesSelect={handleMovieSelect}
          />
        </Suspense>
      )}
      
      {/* Performance Dashboard (development only to reduce prod overhead) */}
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <PerformanceDashboard
            isVisible={showPerformanceDashboard}
            onClose={() => setShowPerformanceDashboard(false)}
          />
        </Suspense>
      )}
      
      {/* Performance Dashboard Toggle Button (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={togglePerformanceDashboard}
          className="fixed bottom-4 left-4 z-50 p-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200"
          title="Toggle Performance Dashboard (Ctrl+Shift+P)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}

      {/* Cache Management Dashboard Toggle Button (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => window.open('/cache-dashboard', '_blank')}
          className="fixed bottom-4 left-16 z-50 p-2 bg-green-600/80 hover:bg-green-600 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200"
          title="Open Cache Management Dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </button>
      )}

      {/* Network Optimizations Test Button (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => window.open('/test-optimizations.html', '_blank')}
          className="fixed bottom-4 left-28 z-50 p-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200"
          title="Test Network Optimizations"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      )}
      </div>
    </MotionConfig>
  )
}

// 🚀 ADVANCED: Configure React Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
      cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on reconnect
      retry: 3, // Retry failed requests 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // Retry mutations once
    },
  },
});

const AppRoutes = () => {
  // Component to handle auth-aware routing - defined inside AuthProvider context
  const AuthAwareRoute = ({ children }) => {
    const { user } = useAuth();
    
    if (user) {
      return <Navigate to="/" />;
    }
    
    return children;
  };

  return (
    <Suspense>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage key="homepage" />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/manga" element={<MangaListPage />} />
        <Route path="/manga/:slug" element={<MangaDetailsPage />} />
        <Route path="/manga/chapter/:hid" element={<MangaReaderPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/donate" element={<DonatePage />} />
        <Route path="/community/discussion/:id" element={<SingleDiscussion />} />
        <Route path="/network-test" element={<NetworkTestPage />} />
        <Route path="/bottom-nav-test" element={<BottomNavTest />} />
        <Route path="/test-auth" element={<TestAuthPage />} />
        <Route path="/test-progress" element={<TestProgressPage />} />
        <Route path="/test-undo" element={<UndoTest />} />
        <Route path="/test-wishlist" element={<WishlistTest />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />
        <Route path="/cache-dashboard" element={<CacheManagementDashboard />} />
        <Route path="/overflow-test" element={<OverflowTest />} />
        <Route path="/test-optimizations" element={
          <div className="min-h-screen bg-[#121417] flex items-center justify-center">
            <iframe 
              src="/test-optimizations.html" 
              className="w-full h-full border-0"
              title="Network Optimizations Test"
            />
          </div>
        } />

        {/* Auth-aware Routes */}
        <Route path="/login" element={<AuthAwareRoute><LoginPage /></AuthAwareRoute>} />
        <Route path="/signup" element={<AuthAwareRoute><SignupPage /></AuthAwareRoute>} />
        <Route path="/forgot-password" element={<AuthAwareRoute><ForgotPasswordPage /></AuthAwareRoute>} />
        <Route path="/reset-password/:token" element={<AuthAwareRoute><ResetPasswordPage /></AuthAwareRoute>} />

        {/* Protected Routes */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/watchlist" element={<WatchlistPage />} />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  )
}



// FullPageLoader component that renders when full page loader is active
const FullPageLoader = () => {
  const { fullPageLoader, fullPageLoaderText, fullPageLoaderProgress, fullPageLoaderVariant } = useLoading();
  
  // Prevent body scrolling when full page loader is active
  useEffect(() => {
    if (fullPageLoader) {
      // Store original body styles
      const originalStyle = window.getComputedStyle(document.body);
      const originalOverflow = originalStyle.overflow;
      const originalHeight = originalStyle.height;
      
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      // Cleanup function
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.height = originalHeight;
        document.body.style.position = '';
        document.body.style.width = '';
      };
    }
  }, [fullPageLoader]);
  
  if (!fullPageLoader) {
    return null;
  }
  
  return (
    <PageLoader 
      text={fullPageLoaderText || "Loading your cinematic experience..."}
      showProgress={true}
      progress={fullPageLoaderProgress}
      variant={fullPageLoaderVariant}
      showTips={false}
    />
  );
};

// Conditional BottomNav component that only renders when not showing full page loader
const ConditionalBottomNav = () => {
  const { fullPageLoader } = useLoading();
  
  if (fullPageLoader) {
    return null;
  }
  
  return (
    <Suspense fallback={null}>
      <BottomNav />
    </Suspense>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      {/* 🚀 ADVANCED: React Query Provider for server state management */}
      <QueryClientProvider client={queryClient}>
        <Router>
          <SocketProvider>
            <LoadingProvider>
              <UndoProvider>
                <WatchlistProvider>
                  <WishlistProvider>
                    <ViewingProgressProvider>
                      <WatchHistoryProvider>
                        <AuthProvider>
                          {/* Full Page Loader - renders at app level when active */}
                          <FullPageLoader />
                          <Layout />
                          {/* Bottom Navigation (mobile) - conditionally rendered */}
                          <ConditionalBottomNav />
                          {/* Undo Manager - handles undo toasts */}
                          <UndoManager />

                        </AuthProvider>
                      </WatchHistoryProvider>
                    </ViewingProgressProvider>
                  </WishlistProvider>
                </WatchlistProvider>
              </UndoProvider>
            </LoadingProvider>
          </SocketProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
