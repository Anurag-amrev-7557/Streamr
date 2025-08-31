import React, { Suspense, lazy, useState, useEffect, useRef } from 'react'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'



// Initialize enhanced caching system
import enhancedCache from './services/enhancedCacheService.js'
import enhancedApiServiceV2 from './services/enhancedApiServiceV2.js'

// Initialize lightweight service worker for minimal network requirements
// Lazy load all route-level pages/components with error handling
const HomePage = lazy(() => import('./components/HomePage').catch(err => {
  console.error('Failed to load HomePage:', err);
  return { default: () => <div>Failed to load HomePage</div> };
}));
const Navbar = lazy(() => import('./components/Navbar').catch(err => {
  console.error('Failed to load Navbar:', err);
  return { default: () => <div>Failed to load Navbar</div> };
}));
const CastDetailsOverlay = lazy(() => import('./components/CastDetailsOverlay').catch(err => {
  console.error('Failed to load CastDetailsOverlay:', err);
  return { default: () => <div>Failed to load CastDetailsOverlay</div> };
}));
const MoviesPage = lazy(() => import('./components/MoviesPage').catch(err => {
  console.error('Failed to load MoviesPage:', err);
  return { default: () => <div>Failed to load MoviesPage</div> };
}));
const SeriesPage = lazy(() => import('./components/SeriesPage').catch(err => {
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
const CommunityPage = lazy(() => import('./components/CommunityPage').catch(err => {
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
  // Enable smooth scrolling globally
  document.documentElement.style.scrollBehavior = 'smooth';
  
  // Optimize scroll performance
  const style = document.createElement('style');
  style.textContent = `
    html {
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: auto;
    }
    
    body {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    
    /* Ultra-smooth scrolling for all scrollable elements */
    * {
      scroll-behavior: smooth;
    }
    
    /* Optimize scroll containers with enhanced performance */
    .scroll-container, [class*="scroll"], [class*="overflow"] {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: auto;
      scroll-behavior: smooth;
      scroll-snap-type: y proximity;
      scrollbar-gutter: stable;
    }
    
    /* Hardware acceleration for ultra-smooth scrolling */
    .ultra-smooth-scroll, .scroll-container-fix {
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1000px;
      will-change: scroll-position, transform;
      contain: layout style paint;
      isolation: isolate;
    }
    
    /* Enhanced scrolling for high refresh rate displays */
    @media (min-resolution: 120dpi), (-webkit-min-device-pixel-ratio: 1.25) {
      .ultra-smooth-scroll {
        transform: translate3d(0, 0, 0);
        -webkit-transform: translate3d(0, 0, 0);
        -moz-transform: translate3d(0, 0, 0);
        -ms-transform: translate3d(0, 0, 0);
        -o-transform: translate3d(0, 0, 0);
      }
    }
    
    /* Momentum scrolling optimization */
    .momentum-scroll {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: auto;
      scroll-snap-type: y mandatory;
      scroll-padding: 0;
    }
    
    /* Performance-optimized scroll containers */
    .performance-scroll {
      contain: strict;
      content-visibility: auto;
      contain-intrinsic-size: auto 500px;
    }
  `;
  document.head.appendChild(style);
}
// Dev-only: load test utilities dynamically to avoid production overhead
import { WatchlistProvider } from './contexts/WatchlistContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ViewingProgressProvider } from './contexts/ViewingProgressContext'
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
const NetworkTestPage = lazy(() => import('./components/NetworkTestPage').catch(err => {
  console.error('Failed to load NetworkTestPage:', err);
  return { default: () => <div>Failed to load NetworkTestPage</div> };
}));
const BottomNavTest = lazy(() => import('./components/BottomNavTest').catch(err => {
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
import { SocketProvider } from './contexts/SocketContext'
// Lazy load components that are not immediately needed
const MovieDetailsOverlay = lazy(() => import('./components/MovieDetailsOverlay').catch(err => {
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
const BottomNav = lazy(() => import('./components/BottomNav').catch(err => {
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
      import('./components/MoviesPage'),
      import('./components/SeriesPage'),
      import('./components/CommunityPage'),
      import('./pages/ProfilePage'),
      import('./pages/WatchlistPage')
    ]).catch(() => {});
  });
}

const Layout = () => {
  const [selectedMovie, setSelectedMovie] = React.useState(null);
  const [selectedCast, setSelectedCast] = React.useState(null);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const isMountedRef = useRef(true); // FIXED: Add mounted ref for cleanup
  
  // Get full page loader state from context
  const { fullPageLoader } = useLoading();
  
  // FIXED: Enhanced cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Initialize ultra-smooth scrolling
  const { scrollState } = useSmoothScroll({
    throttle: 16,
    enableMomentum: true,
    enableIntersectionObserver: true,
    scrollOffset: 80 // Account for navbar height
  });
  
  const handleMovieSelect = React.useCallback((movie) => {
    if (isMountedRef.current) {
      setSelectedMovie(movie);
    }
  }, []);

  const handleCastSelect = React.useCallback((cast) => {
    if (isMountedRef.current) {
      setSelectedCast(cast);
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
      if (isMountedRef.current) {
        document.removeEventListener('keydown', handleKeyDown);
      }
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
  
  // Remove device performance constraints - allow full animations on all devices
  const reducedMotionGlobal = false; // Always allow full animations

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-[#121417] smooth-scroll performance-scroll">
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
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/discussion/:id" element={<SingleDiscussion />} />
        <Route path="/network-test" element={<NetworkTestPage />} />
        <Route path="/bottom-nav-test" element={<BottomNavTest />} />
        <Route path="/test-auth" element={<TestAuthPage />} />
        <Route path="/test-progress" element={<TestProgressPage />} />
        <Route path="/test-undo" element={<UndoTest />} />
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
      <Router>
        <SocketProvider>
          <LoadingProvider>
            <UndoProvider>
              <WatchlistProvider>
                <ViewingProgressProvider>
                  <AuthProvider>
                    {/* Full Page Loader - renders at app level when active */}
                    <FullPageLoader />
                    <Layout />
                    {/* Bottom Navigation (mobile) - conditionally rendered */}
                    <ConditionalBottomNav />
                    {/* Undo Manager - handles undo toasts */}
                    <UndoManager />

                  </AuthProvider>
                </ViewingProgressProvider>
              </WatchlistProvider>
            </UndoProvider>
          </LoadingProvider>
        </SocketProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
