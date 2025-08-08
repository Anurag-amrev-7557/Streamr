import React, { Suspense, lazy, useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
// Lazy load all route-level pages/components with error handling
const HomePage = lazy(() => import('./components/HomePage').catch(err => {
  console.error('Failed to load HomePage:', err);
  return { default: () => <div>Failed to load HomePage</div> };
}));
const Navbar = lazy(() => import('./components/Navbar').catch(err => {
  console.error('Failed to load Navbar:', err);
  return { default: () => <div>Failed to load Navbar</div> };
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
import './App.css'
import { LoadingProvider } from './contexts/LoadingContext'
import { WatchlistProvider } from './contexts/WatchlistContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
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
const TestAuthPage = lazy(() => import('./pages/TestAuthPage').catch(err => {
  console.error('Failed to load TestAuthPage:', err);
  return { default: () => <div>Failed to load TestAuthPage</div> };
}));
import { SocketProvider } from './contexts/SocketContext'
// Lazy load components that are not immediately needed
const MovieDetailsOverlay = lazy(() => import('./components/MovieDetailsOverlay').catch(err => {
  console.error('Failed to load MovieDetailsOverlay:', err);
  return { default: () => <div>Failed to load MovieDetailsOverlay</div> };
}));
// const NetworkStatus = lazy(() => import('./components/NetworkStatus'));
const PerformanceDashboard = lazy(() => import('./components/PerformanceDashboard').catch(err => {
  console.error('Failed to load PerformanceDashboard:', err);
  return { default: () => <div>Failed to load PerformanceDashboard</div> };
}));
import { useSmoothScroll } from './hooks/useSmoothScroll'
// Import performance service to initialize it
import './services/performanceOptimizationService'
// Import error boundary
import { ErrorBoundary } from './utils/errorBoundary.jsx'
// Import test utility (remove in production)
import { testErrorBoundary } from './utils/testErrorHandling'
// FIXED: Import memory cleanup utility
import memoryCleanupUtility from './utils/memoryCleanupUtility'

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
  
  return (
    <div className="min-h-screen bg-[#121417] smooth-scroll performance-scroll">
      {/* NetworkStatus component removed */}
      {/* <Suspense fallback={null}>
        <NetworkStatus />
      </Suspense> */}
      <Suspense>
        <Navbar onMovieSelect={handleMovieSelect} />
      </Suspense>
      <main className="momentum-scroll">
        <AppRoutes />
      </main>
      {selectedMovie && (
        <Suspense fallback={null}>
          <MovieDetailsOverlay
            movie={selectedMovie}
            onClose={handleCloseOverlay}
            onMovieSelect={handleMovieSelect}
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
      
      {/* Performance Dashboard Toggle Button (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={togglePerformanceDashboard}
          className="fixed bottom-4 left-4 z-50 p-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200"
          title="Toggle Performance Dashboard (Ctrl+Shift+P)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}
    </div>
  )
}

const AppRoutes = () => {
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
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />

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

// Component to handle auth-aware routing
const AuthAwareRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/" />;
  }
  
  return children;
};

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
