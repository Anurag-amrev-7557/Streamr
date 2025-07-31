import React, { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
// Lazy load all route-level pages/components
const HomePage = lazy(() => import('./components/HomePage'));
const Navbar = lazy(() => import('./components/Navbar'));
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
import { SocketProvider } from './contexts/SocketContext'
// Lazy load components that are not immediately needed
const MovieDetailsOverlay = lazy(() => import('./components/MovieDetailsOverlay'));
const NetworkStatus = lazy(() => import('./components/NetworkStatus'));
const PerformanceDashboard = lazy(() => import('./components/PerformanceDashboard'));
import { useSmoothScroll } from './hooks/useSmoothScroll'
// Import performance service to initialize it
import './services/performanceOptimizationService'

const Layout = () => {
  const [selectedMovie, setSelectedMovie] = React.useState(null);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  
  // Initialize ultra-smooth scrolling
  const { scrollState } = useSmoothScroll({
    throttle: 16,
    enableMomentum: true,
    enableIntersectionObserver: true,
    scrollOffset: 80 // Account for navbar height
  });
  
  const handleMovieSelect = React.useCallback((movie) => {
    setSelectedMovie(movie);
  }, []);
  
  const handleCloseOverlay = React.useCallback(() => {
    setSelectedMovie(null);
  }, []);
  
  // Performance dashboard toggle
  const togglePerformanceDashboard = React.useCallback(() => {
    setShowPerformanceDashboard(prev => !prev);
  }, []);
  
  // Keyboard shortcut for performance dashboard (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        togglePerformanceDashboard();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePerformanceDashboard]);
  
  return (
    <div className="min-h-screen bg-[#121417] smooth-scroll performance-scroll">
      <Suspense fallback={null}>
        <NetworkStatus />
      </Suspense>
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
  const { user } = useAuth()

  return (
    <Suspense>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/discussion/:id" element={<SingleDiscussion />} />
        <Route path="/network-test" element={<NetworkTestPage />} />
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
  )
}

export default App
