import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
// Lazy load all route-level pages/components
const HomePage = lazy(() => import('./components/HomePage'));
const Navbar = lazy(() => import('./components/Navbar'));
const BottomNavigation = lazy(() => import('./components/BottomNavigation'));
const MoviesPage = lazy(() => import('./components/MoviesPage'));
const SeriesPage = lazy(() => import('./components/SeriesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const CommunityPage = lazy(() => import('./components/CommunityPage'));
const SingleDiscussion = lazy(() => import('./components/community/SingleDiscussion'));

import './App.css'
import { LoadingProvider } from './contexts/LoadingContext'
import { WatchlistProvider } from './contexts/WatchlistContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const OAuthSuccessPage = lazy(() => import('./pages/OAuthSuccessPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const NetworkTestPage = lazy(() => import('./components/NetworkTestPage'));
const TestAuthPage = lazy(() => import('./pages/TestAuthPage'));
const AuthDebugger = lazy(() => import('./components/AuthDebugger'));
import { SocketProvider } from './contexts/SocketContext'
// Lazy load components that are not immediately needed
const MovieDetailsOverlay = lazy(() => import('./components/MovieDetailsOverlay'));
// const NetworkStatus = lazy(() => import('./components/NetworkStatus'));
const PerformanceDashboard = lazy(() => import('./components/PerformanceDashboard'));
// Import memory cleanup utility
import memoryCleanupUtility from './utils/memoryCleanupUtility';
// Import global performance cleanup
import './utils/globalPerformanceCleanup';
const RateLimitStatus = lazy(() => import('./components/RateLimitStatus'));
import { useSmoothScroll } from './hooks/useSmoothScroll'
// Import performance service to initialize it
import './services/performanceOptimizationService'
// Import error boundary
import { ErrorBoundary } from './utils/errorBoundary'
// Import test utility (remove in production)
import { testErrorBoundary } from './utils/testErrorHandling'

// Register service worker for better caching and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Service Worker registered successfully:', registration);
        }
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

const Layout = () => {
  const [selectedMovie, setSelectedMovie] = React.useState(null);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const isMountedRef = useRef(true); // FIXED: Add mounted ref for cleanup
  const navigate = useNavigate();
  
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
  
  const handleCloseOverlay = React.useCallback(() => {
    if (isMountedRef.current) {
      setSelectedMovie(null);
    }
  }, []);

  // Global genre click handler that works on all pages
  const handleGenreClick = React.useCallback((genre) => {
    if (!genre || !genre.id) {
      console.warn('Invalid genre provided to handleGenreClick:', genre);
      return;
    }

    console.log('Global genre click handler called with:', genre);
    
    // Close the movie details overlay first
    if (isMountedRef.current) {
      setSelectedMovie(null);
    }
    
    // Determine the best page to navigate to based on current context
    const currentPath = window.location.pathname;
    let targetPath = '/movies'; // Default to movies page
    
    // If we're currently on the series page and the genre is more TV-related, 
    // keep the user on series page, otherwise go to movies
    if (currentPath.includes('/series')) {
      // For now, always go to movies page for genre filtering since SeriesPage
      // doesn't have URL-based genre filtering implemented
      targetPath = '/movies';
    }
    
    // Use URL search params to maintain state across navigation
    const searchParams = new URLSearchParams();
    searchParams.set('genre', genre.name.toLowerCase());
    
    // Navigate to the target page with the genre filter
    navigate(`${targetPath}?${searchParams.toString()}`);
    
    // Track analytics for genre navigation
    if (window.gtag) {
      window.gtag('event', 'genre_navigation', {
        event_category: 'Navigation',
        event_label: genre.name,
        value: genre.id,
        source_page: currentPath,
        target_page: targetPath,
      });
    }
  }, [navigate]);
  
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
    });
    
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
  
  return (
    <>
      <div className="min-h-screen bg-[#121417] smooth-scroll performance-scroll">
        {/* NetworkStatus component removed */}
        {/* <Suspense fallback={null}>
          <NetworkStatus />
        </Suspense> */}
        <Suspense>
          <Navbar onMovieSelect={handleMovieSelect} />
        </Suspense>
        <main className="momentum-scroll pb-20 sm:pb-0">
          <Suspense>
            <AppRoutes />
          </Suspense>
        </main>
        
        {selectedMovie && (
          <Suspense fallback={null}>
            <MovieDetailsOverlay
              movie={selectedMovie}
              onClose={handleCloseOverlay}
              onMovieSelect={handleMovieSelect}
              onGenreClick={handleGenreClick}
            />
          </Suspense>
        )}
        
        {/* Performance Dashboard */}
        <Suspense fallback={null}>
          <PerformanceDashboard
            isVisible={showPerformanceDashboard}
            onClose={() => setShowPerformanceDashboard(false)}
          />
        </Suspense>
        
        {/* Rate Limit Status */}
        <Suspense fallback={null}>
          <RateLimitStatus />
        </Suspense>
        
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
      </div>
      
      {/* Bottom Navigation - Outside main container to ensure proper fixed positioning */}
      <Suspense fallback={null}>
        <BottomNavigation />
      </Suspense>
    </>
  )
}

const AppRoutes = () => {
  const { user } = useAuth()

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
        <Route path="/test-auth" element={<TestAuthPage />} />
        <Route path="/auth-debug" element={<AuthDebugger />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={!user ? <ForgotPasswordPage /> : <Navigate to="/" />} />
        <Route path="/reset-password/:token" element={!user ? <ResetPasswordPage /> : <Navigate to="/" />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />

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

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <SocketProvider>
          <LoadingProvider>
            <WatchlistProvider>
              <AuthProvider>
                <Layout />
              </AuthProvider>
            </WatchlistProvider>
          </LoadingProvider>
        </SocketProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
