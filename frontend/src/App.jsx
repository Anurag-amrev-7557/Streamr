import React, { Suspense, lazy } from 'react'
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
import { SocketProvider } from './contexts/SocketContext'
import MovieDetailsOverlay from './components/MovieDetailsOverlay'

const Layout = () => {
  const [selectedMovie, setSelectedMovie] = React.useState(null);
  const handleMovieSelect = React.useCallback((movie) => {
    setSelectedMovie(movie);
  }, []);
  const handleCloseOverlay = React.useCallback(() => {
    setSelectedMovie(null);
  }, []);
  return (
    <div className="min-h-screen bg-[#121417]">
      <Suspense>
        <Navbar onMovieSelect={handleMovieSelect} />
      </Suspense>
      <main>
        <AppRoutes />
      </main>
      {selectedMovie && (
        <MovieDetailsOverlay
          movie={selectedMovie}
          onClose={handleCloseOverlay}
          onMovieSelect={handleMovieSelect}
        />
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
        <Route path="/watchlist" element={
          <ProtectedRoute>
            <WatchlistPage />
          </ProtectedRoute>
        } />

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
