import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import useAuthStore from './store/useAuthStore';
import useModalStore from './store/useModalStore';
import BottomNavbar from './components/BottomNavbar';
import PageLoader from './components/PageLoader';
import VersionManager from './components/VersionManager';
import AdBlockerToast from './components/AdBlockerToast';
import { prefetchCriticalRoutes } from './utils/routePrefetch';
import { unregisterServiceWorker } from './utils/serviceWorkerManager';
import { performance } from './utils/performance';
import ToastContainer from './components/ToastContainer';

// Lazy load all pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Watch = lazy(() => import('./pages/Watch'));
const MyList = lazy(() => import('./pages/MyList'));
const Movies = lazy(() => import('./pages/Movies'));
const Series = lazy(() => import('./pages/Series'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  performance.mark('app-init');
  const { user, isCheckingAuth } = useAuthStore();
  const playerState = useModalStore((state) => state.playerState);
  const checkAuthRef = useRef(useAuthStore.getState().checkAuth);
  const [showIntro, setShowIntro] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);
  const hasShownIntro = useRef(false);

  // Loading state - only check auth, sync happens in background
  const isLoading = isCheckingAuth;

  // Memoized checkAuth to prevent unnecessary re-renders
  const checkAuth = useCallback(() => {
    checkAuthRef.current();
  }, []);

  // Unregister service worker to prevent caching issues
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      unregisterServiceWorker();
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Trigger intro animation ONLY on first load when auth check completes
  useEffect(() => {
    if (!isLoading && !hasShownIntro.current) {
      hasShownIntro.current = true;
      // Immediate transition
      const timer = setTimeout(() => {
        setIsReady(true);
        // Hide intro after animation completes
        setTimeout(() => {
          setShowIntro(false);
        }, 800); // Reduced from 1000ms
        // Show navbar earlier
        setTimeout(() => {
          setShowNavbar(true);
        }, 200); // Reduced from 400ms
        // Smart prefetch: uses requestIdleCallback and network awareness
        // Start prefetching much sooner
        setTimeout(() => {
          prefetchCriticalRoutes();
          performance.mark('app-ready');
          performance.measure('App Mount Time', 'app-init', 'app-ready');
        }, 1000); // Reduced from 4000ms
      }, 100); // Reduced from 200ms
      return () => clearTimeout(timer);
    } else if (!isLoading && hasShownIntro.current) {
      // If already shown intro, don't show it again
      setShowIntro(false);
      setIsReady(true);
      setShowNavbar(true);
      // Prefetch immediately on subsequent loads
      prefetchCriticalRoutes();
    }
  }, [isLoading]);

  return (
    <Router>
      <div className="relative">
        <VersionManager />
        <AdBlockerToast />
        <ToastContainer />
        {/* Main Content - renders immediately, visible behind loader */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/oauth-success" element={<AuthCallback />} />

            {/* Protected routes - render immediately with optimistic auth */}
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/series" element={<Series />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/my-list" element={<MyList />} />
            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AnimatePresence mode="wait">
            {showNavbar && !playerState.isOpen && <BottomNavbar />}
          </AnimatePresence>
        </Suspense>

        {/* Intro Animation - only during initial auth check */}
        {isLoading && (
          <div className="fixed inset-0 z-50 bg-black">
            <PageLoader />
          </div>
        )}

        {/* Intro Animation - zooms and flies out after auth check */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              className={`fixed inset-0 z-50 bg-black ${isReady ? 'pointer-events-none' : ''}`}
              initial={{ opacity: 1 }}
              animate={{ opacity: isReady ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Logo that zooms - absolutely centered */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 1, opacity: 1, rotate: 0 }}
                  animate={isReady ? {
                    scale: 60,
                    opacity: 0,
                    rotate: 90,
                    y: -200
                  } : {
                    scale: 1,
                    opacity: 1,
                    rotate: 0,
                    y: 0
                  }}
                  transition={{
                    duration: 1.2,
                    ease: [0.76, 0, 0.24, 1]
                  }}
                >
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z"
                      fill="#fff"
                    />
                  </svg>
                </motion.div>
              </div>

              {/* Loading text - absolutely positioned below center */}
              <AnimatePresence>
                {!isReady && (
                  <motion.div
                    initial={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ marginTop: '140px' }}
                  >
                    <div className="flex items-center gap-1.5">
                      {['L', 'O', 'A', 'D', 'I', 'N', 'G', '.', '.', '.'].map((letter, index) => (
                        <span
                          key={index}
                          className="text-white/70 text-sm font-semibold tracking-wider animate-pulse"
                          style={{
                            animationDuration: '2s',
                            animationDelay: `${index * 0.1}s`,
                            textShadow: '0 0 10px rgba(255,255,255,0.3)'
                          }}
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading bar - absolutely positioned below text */}
              <AnimatePresence>
                {!isReady && (
                  <motion.div
                    initial={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ marginTop: '200px' }}
                  >
                    <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-transparent via-white/60 to-transparent w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite]"></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;
