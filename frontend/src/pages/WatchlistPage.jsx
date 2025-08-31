import React, { useState, useEffect, useRef, lazy, Suspense, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
const MovieDetailsOverlay = lazy(() => import('../components/MovieDetailsOverlay'));
import { PageLoader } from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { useWatchlist } from '../contexts/EnhancedWatchlistContext';
import { useAuth } from '../contexts/AuthContext';
import { formatRating } from '../utils/ratingUtils';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const PLACEHOLDER_IMAGE = 'https://placehold.co/500x750/1a1d21/ffffff?text=No+Image';

// Smooth fade-in variants (no vertical translate)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.02, delayChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const WatchlistPage = () => {
  const { watchlist, removeFromWatchlist, clearWatchlist, setWatchlist } = useWatchlist();
  const { user } = useAuth();

  // Reset banner state when user logs in (so they can see it again if they log out)
  useEffect(() => {
    if (user) {
      try {
        localStorage.removeItem('watchlist_banner_dismissed');
      } catch (error) {
        console.error('Error resetting banner state:', error);
      }
    }
  }, [user]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('added');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('watchlist_view_mode') || 'grid';
    } catch (e) {
      return 'grid';
    }
  });
  const [loadedImages, setLoadedImages] = useState({});
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showLoginBanner, setShowLoginBanner] = useState(() => {
    // Check if user has dismissed the banner before
    try {
      const hasSeenBanner = localStorage.getItem('watchlist_banner_dismissed');
      return !hasSeenBanner;
    } catch (error) {
      console.error('Error checking banner state:', error);
      return true;
    }
  });

  // Memoize localStorage operations to prevent unnecessary re-renders
  const localStorageRef = useRef({
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    }
  });
  const navigate = useNavigate();
  const sortDropdownRef = useRef(null);
  const clearDialogRef = useRef(null);

  // Set loading to false after initial render
  useEffect(() => {
    setLoading(false);
  }, []);

  // Persist view mode
  useEffect(() => {
    try {
      localStorage.setItem('watchlist_view_mode', viewMode);
    } catch (e) {
      // ignore persistence errors
    }
  }, [viewMode]);

  // Cleanup function to prevent memory leaks when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending state updates
      setSelectedMovie(null);
      setShowSortDropdown(false);
      setShowClearDialog(false);
      setLoadedImages({});
    };
  }, []);

  // Performance monitoring for memory usage - MEMORY LEAK FIX
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
      const interval = setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        if (window.performance && window.performance.memory) {
          const memory = window.performance.memory;
          const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
          
          if (usedMB > 800) { // FIXED: Increased threshold from 100MB to 800MB
            console.warn(`WatchlistPage memory usage: ${usedMB}MB / ${totalMB}MB`);
          }
        }
      }, 300000); // FIXED: Check every 5 minutes instead of 30 seconds

      return () => clearInterval(interval);
    }
  }, []);

  // Prevent memory leaks from large watchlist arrays
  const maxWatchlistSize = 1000; // Reasonable limit
  useEffect(() => {
    if (watchlist.length > maxWatchlistSize) {
      console.warn(`Watchlist size (${watchlist.length}) exceeds recommended limit of ${maxWatchlistSize}`);
    }
  }, [watchlist.length]);

  // Auto-hide sort dropdown on click outside or Escape
  useEffect(() => {
    if (!showSortDropdown) return;
    
    const handleClick = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowSortDropdown(false);
    };
    
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSortDropdown]);

  // Auto-hide clear dialog on click outside or Escape
  useEffect(() => {
    if (!showClearDialog) return;
    
    const handleClick = (e) => {
      if (clearDialogRef.current && !clearDialogRef.current.contains(e.target)) {
        setShowClearDialog(false);
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowClearDialog(false);
    };
    
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showClearDialog]);

  const handleMovieSelect = useCallback((movie) => {
    setSelectedMovie(movie);
  }, []);

  // Handle genre navigation from MovieDetailsOverlay
  const handleGenreNavigation = useCallback((genre) => {
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

  const handleRemoveFromWatchlist = useCallback((movieId) => {
    removeFromWatchlist(movieId);
  }, [removeFromWatchlist]);

  const handleImageLoad = useCallback((movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: true
    }));
  }, []);

  const handleImageError = useCallback((movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: 'error'
    }));
  }, []);

  // Debounced image loading to prevent excessive state updates
  const debouncedImageLoad = useCallback((movieId) => {
    const timeoutId = setTimeout(() => {
      handleImageLoad(movieId);
    }, 50); // Small delay to batch updates

    return () => clearTimeout(timeoutId);
  }, [handleImageLoad]);

  // Cleanup loadedImages state when watchlist changes to prevent memory leaks
  useEffect(() => {
    const currentMovieIds = new Set(watchlist.map(movie => movie.id));
    setLoadedImages(prev => {
      const cleaned = {};
      Object.keys(prev).forEach(movieId => {
        if (currentMovieIds.has(parseInt(movieId))) {
          cleaned[movieId] = prev[movieId];
        }
      });
      return cleaned;
    });
  }, [watchlist]);

  const getImageUrl = (path) => {
    
    if (!path) {
      console.log('No path provided, using placeholder');
      return PLACEHOLDER_IMAGE;
    }
    
    if (path.startsWith('http')) {
      return path;
    }
    
    const fullUrl = `${TMDB_IMAGE_BASE_URL}/w500${path}`;
    return fullUrl;
  };

  const getFilteredWatchlist = useMemo(() => {
    let filtered = [...watchlist];

    // Filter by type (movie/tv)
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => item.type === activeTab);
    }

    // Sort the filtered list
    switch (sortBy) {
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'year':
        filtered.sort((a, b) => b.year - a.year);
        break;
      case 'added':
      default:
        // Keep original order (most recently added first)
        break;
    }

    return filtered;
  }, [watchlist, activeTab, sortBy]);

  // Modified clear by category
  const handleClearByCategory = () => {
    if (activeTab === 'all') {
      clearWatchlist();
    } else {
      // Remove only items of the selected type
      watchlist.filter(item => item.type === activeTab).forEach(item => removeFromWatchlist(item.id));
    }
    setShowClearDialog(false);
  };

  // Dynamic label and dialog text for clear button
  const getClearLabel = () => {
    if (activeTab === 'movie') return 'Clear Movies';
    if (activeTab === 'tv') return 'Clear TV Shows';
    return 'Clear All';
  };
  const getClearDialogTitle = () => {
    if (activeTab === 'movie') return 'Clear Movies?';
    if (activeTab === 'tv') return 'Clear TV Shows?';
    return 'Clear Watchlist?';
  };
  const getClearDialogText = () => {
    if (activeTab === 'movie') return 'This will remove all movies from your watchlist. This action cannot be undone.';
    if (activeTab === 'tv') return 'This will remove all TV shows from your watchlist. This action cannot be undone.';
    return 'This will remove all movies and TV shows from your watchlist. This action cannot be undone.';
  };

  const handleDismissBanner = () => {
    setShowLoginBanner(false);
    localStorageRef.current.setItem('watchlist_banner_dismissed', 'true');
  };

  // Check if user has dismissed the banner before
  const hasDismissedBanner = () => {
    return localStorageRef.current.getItem('watchlist_banner_dismissed') === 'true';
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1114]">
        <div className="text-white text-xl">{error}</div>
      </div>
    );
  }

  const filteredWatchlist = getFilteredWatchlist;

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'TV Shows' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1114] text-white">
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Login Banner for non-authenticated users */}
        {!user && showLoginBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-gradient-to-r from-white/5 to-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-white font-medium">Using Local Watchlist</h3>
                </div>
                <p className="text-white/70 text-sm mb-3">
                  {hasDismissedBanner() 
                    ? "Still using local storage? Sign in to sync your watchlist across all devices."
                    : "You're viewing your local watchlist. Sign in to sync your watchlist across all your devices and never lose your saved movies."
                  }
                </p>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-white text-black hover:bg-white/90 text-sm font-medium rounded-lg transition-colors"
                  >
                    Sign In
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDismissBanner}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Dismiss
                  </motion.button>
                </div>
              </div>
              <button
                onClick={handleDismissBanner}
                className="text-white/50 hover:text-white/70 transition-colors ml-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
          {/* Title and Count - Mobile optimized with Clear button on right */}
          <div className="flex flex-row justify-between sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 w-full sm:w-auto">
            <h1
              className="flex items-center gap-2 text-xl sm:text-xl font-bold text-left tracking-tight"
              aria-label="Your Watchlist"
            >
              <span className="inline-flex items-center">
                <svg
                  className="w-6 h-6 text-primary-500 mr-2"
                  fill="none"
                  stroke="white"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"
                  />
                </svg>
                <span>My List</span>
              </span>
              <span className="text-sm font-semibold text-gray-400/80">
                ({filteredWatchlist.length})
              </span>
            </h1>
            
            {/* Mobile only: Right-side controls (View toggle + Clear) */}
            <div className="flex items-center gap-2 sm:hidden">
              {/* View Toggle - match Episodes style */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 transform-gpu will-change-transform ${
                    viewMode === 'grid'
                      ? 'text-white border-b-2 border-white/30'
                      : 'text-white/50 hover:text-white/70 border-b-2 border-transparent hover:border-white/15'
                  }`}
                  title="Card View"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'text-white border-b-2 border-white/30'
                      : 'text-white/50 hover:text-white/70 border-b-2 border-transparent hover:border-white/15'
                  }`}
                  title="List View"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Clear All */}
              {filteredWatchlist.length > 0 && (
                <motion.button
                  onClick={() => setShowClearDialog(true)}
                  className="relative px-3 py-2 rounded-full font-medium text-sm transition-colors duration-200 shadow-sm overflow-hidden focus:outline-none bg-[#1a1d21] text-gray-400 hover:text-black hover:bg-white flex-shrink-0"
                  style={{ minWidth: 80 }}
                >
                  <span className="relative z-10">{getClearLabel()}</span>
                  <motion.div
                    layoutId="activeWatchlistTabClear"
                    className="absolute inset-0 rounded-full z-0"
                    initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  />
                </motion.button>
              )}
            </div>
          </div>

          {/* Controls - Mobile optimized layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 w-full sm:w-auto">
            {/* Tabs and Sort Row */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Tabs */}
              <div className="relative inline-flex items-center bg-[#1a1d21] rounded-full p-1 flex-1 sm:flex-none">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3 sm:px-4 py-2 sm:py-2 rounded-full text-sm font-medium transition-colors focus:outline-none whitespace-nowrap flex-1 sm:flex-none ${
                      activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="relative z-10">{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeWatchlistTab"
                        className="absolute inset-0 bg-white rounded-full"
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="relative flex-shrink-0" ref={sortDropdownRef}>
                <motion.button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-full text-sm font-medium transition-colors focus:outline-none whitespace-nowrap bg-[#1a1d21] ${
                    showSortDropdown ? 'text-black' : 'text-gray-400 hover:text-white'
                  }`}
                  style={{ minWidth: '100px', height: '40px' }}
                  aria-haspopup="listbox"
                  aria-expanded={showSortDropdown}
                >
                  <AnimatePresence>
                    {showSortDropdown ? (
                      <motion.div
                        key="sortby-bg-open"
                        layoutId="activeWatchlistTabSort"
                        className="absolute inset-0 bg-white rounded-full z-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    ) : (
                      <motion.div
                        key="sortby-bg-hover"
                        className="absolute inset-0 rounded-full z-0"
                        initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.13)' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative z-10 text-xs sm:text-sm">Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform relative z-10 ${showSortDropdown ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </motion.button>
                {/* Dropdown rendered as sibling, not child, to avoid clipping */}
                <AnimatePresence>
                  {showSortDropdown && (
                    <motion.div
                      key="sort-dropdown"
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute z-50"
                      style={{
                        top: '100%',
                        left: '0',
                        right: '0',
                        marginTop: '4px',
                        background: '#1a1d21',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 32px 0 rgba(0,0,0,0.25)',
                        padding: '0.25rem 0',
                        border: '1px solid rgba(255,255,255,0.1)',
                        minWidth: '160px',
                        maxWidth: '100%'
                      }}
                      tabIndex={-1}
                    >
                      <button
                        onClick={() => {
                          setSortBy('added');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors duration-150 hover:bg-white/10 focus:bg-white/10 outline-none ${
                          sortBy === 'added' ? 'text-white font-semibold' : 'text-white/60'
                        }`}
                      >
                        Recently Added
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('title');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors duration-150 hover:bg-white/10 focus:bg-white/10 outline-none ${
                          sortBy === 'title' ? 'text-white font-semibold' : 'text-white/60'
                        }`}
                      >
                        Title
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('rating');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors duration-150 hover:bg-white/10 focus:bg-white/10 outline-none ${
                          sortBy === 'rating' ? 'text-white font-semibold' : 'text-white/60'
                        }`}
                      >
                        Rating
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('year');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors duration-150 hover:bg-white/10 focus:bg-white/10 outline-none ${
                          sortBy === 'year' ? 'text-white font-semibold' : 'text-white/60'
                        }`}
                      >
                        Year
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* View Toggle - match Episodes style (desktop) */}
              <div className="hidden sm:flex items-center gap-2 ml-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 transform-gpu will-change-transform ${
                    viewMode === 'grid'
                      ? 'text-white border-b-2 border-white/30'
                      : 'text-white/50 hover:text-white/70 border-b-2 border-transparent hover:border-white/15'
                  }`}
                  title="Card View"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'text-white border-b-2 border-white/30'
                      : 'text-white/50 hover:text-white/70 border-b-2 border-transparent hover:border-white/15'
                  }`}
                  title="List View"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Desktop only: Clear All at end of controls */}
            <div className="hidden sm:flex">
              {filteredWatchlist.length > 0 && (
                <motion.button
                  onClick={() => setShowClearDialog(true)}
                  className="relative px-4 py-2.5 rounded-full font-medium text-sm transition-colors duration-200 shadow-sm overflow-hidden focus:outline-none bg-[#1a1d21] text-gray-400 hover:text-black hover:bg-white flex-shrink-0 ml-2"
                  style={{ minWidth: 90 }}
                >
                  <span className="relative z-10">{getClearLabel()}</span>
                  <motion.div
                    layoutId="activeWatchlistTabClear"
                    className="absolute inset-0 rounded-full z-0"
                    initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </motion.button>
              )}
            </div>
          </div>
        </div>
        {/* Confirmation Dialog */}
        <AnimatePresence>
          {showClearDialog && (
            <motion.div
              key="dialog-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
              aria-modal="true"
              role="dialog"
            >
              <motion.div
                key="dialog-content"
                ref={clearDialogRef}
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 32
                }}
                className="bg-[#181b20] rounded-2xl shadow-2xl border border-white/10 p-6 w-full max-w-xs sm:max-w-sm flex flex-col items-center text-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/60 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <h2 className="text-lg font-bold mb-2 text-white">{getClearDialogTitle()}</h2>
                <p className="text-white/70 mb-6 text-sm">{getClearDialogText()}</p>
                <div className="flex gap-3 w-full">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowClearDialog(false)}
                    className="flex-1 px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors duration-200 overflow-hidden focus:outline-none bg-[#1a1d21] text-gray-400 hover:text-black hover:bg-white hover:border-white border border-white/30"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleClearByCategory}
                    className="flex-1 px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors duration-200 overflow-hidden focus:outline-none bg-[#1a1d21] text-gray-400 hover:text-black hover:bg-white hover:border-white border border-white/30"
                  >
                    Clear All
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Watchlist Content */}
        {filteredWatchlist.length > 0 ? (
          viewMode === 'grid' ? (
            <motion.div
              layout
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredWatchlist.map((movie) => (
                  <motion.div
                    layout
                    key={movie.id}
                    variants={itemVariants}
                    transition={{ layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
                    exit={{ opacity: 0, scale: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
                    className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1a1d21] cursor-pointer w-full max-w-xs mx-auto transform-gpu transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/30 hover:ring-1 hover:ring-white/10 origin-top-right"
                    onClick={() => handleMovieSelect(movie)}
                  >
                    {/* Movie Poster */}
                    <div className="relative w-full h-full">
                      {!loadedImages[movie.id] && (
                        <div className="absolute inset-0 bg-[#1a1d21] animate-pulse" />
                      )}
                      <img
                        src={getImageUrl(movie.poster_path)}
                        alt={movie.title}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 md:group-hover:brightness-105 ${
                            loadedImages[movie.id] ? 'opacity-100' : 'opacity-0'
                          }`}
                        onLoad={() => debouncedImageLoad(movie.id)}
                        onError={(e) => {
                          handleImageError(movie.id);
                          e.target.src = PLACEHOLDER_IMAGE;
                        }}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    {/* Overlay: always visible on mobile, hover on desktop */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4">
                        <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                          <h3 className="text-white font-medium text-xs sm:text-base line-clamp-2">{movie.title}</h3>
                          <span className="px-2 py-0.5 bg-white/10 text-white/80 text-xs font-medium rounded-full border border-white/10 flex-shrink-0">
                            {movie.type === 'tv' ? 'TV' : 'Movie'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm text-white/60">{movie.year}</p>
                          <span className="text-white/40">•</span>
                          <div className="flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-400"
                              viewBox=" 0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            <span className="text-xs sm:text-sm text-white/80">
                              {formatRating(movie.rating)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Remove Button: always visible on mobile, hover on desktop */}
                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.7)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromWatchlist(movie.id);
                      }}
                      className="absolute top-2 right-2 z-10 p-2 sm:p-1.5 bg-black/50 rounded-full transition-colors duration-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center"
                      aria-label="Remove from watchlist"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            // List view styled like episode list
            <motion.div
              layout
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {filteredWatchlist.map((movie) => (
                  <motion.div
                    key={movie.id}
                    layout
                    variants={itemVariants}
                    transition={{ layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
                    exit={{ opacity: 0, scale: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
                    className="bg-[#1a1d21] rounded-lg overflow-hidden cursor-pointer group relative transform-gpu transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/20 hover:ring-1 hover:ring-white/10 h-20 sm:h-24 origin-top-right"
                    onClick={() => handleMovieSelect(movie)}
                  >
                    <div className="flex h-full">
                      {/* Thumbnail */}
                      <div className="w-32 h-20 sm:w-36 sm:h-24 flex-shrink-0 relative p-2">
                        {!loadedImages[movie.id] && (
                          <div className="absolute inset-2 bg-[#22262b] animate-pulse rounded" />
                        )}
                        <img
                          src={getImageUrl(movie.backdrop_path || movie.poster_path)}
                          alt={movie.title}
                          className={`w-full h-full object-cover rounded ${loadedImages[movie.id] ? 'opacity-100' : 'opacity-0'}`}
                          onLoad={() => debouncedImageLoad(movie.id)}
                          onError={(e) => {
                            handleImageError(movie.id);
                            e.target.src = PLACEHOLDER_IMAGE;
                          }}
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute top-3 left-3 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
                          {movie.type === 'tv' ? 'TV' : 'Movie'}
                        </div>
                      </div>
                      {/* Details */}
                      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                        <div className="flex-1 min-h-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-sm sm:text-base text-white group-hover:text-white-400 transition-colors line-clamp-1 pr-8">
                              {movie.title}
                            </h4>
                            <div className="absolute top-2 right-2">
                              <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.7)' }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromWatchlist(movie.id);
                                }}
                                className="p-2 bg-black/50 rounded-full transition-colors duration-300 w-8 h-8 flex items-center justify-center"
                                aria-label="Remove from watchlist"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 text-white"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </motion.button>
                            </div>
                          </div>
                          {/* Meta row */}
                          <div className="flex items-center gap-3 text-xs text-white/70">
                            <span>{movie.year}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span>{formatRating(movie.rating)}</span>
                            </span>
                            {movie.genres && Array.isArray(movie.genres) && movie.genres.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[40%] text-white/60">
                                  {(() => {
                                    const firstGenre = movie.genres[0];
                                    if (typeof firstGenre === 'object' && firstGenre.name) {
                                      return firstGenre.name;
                                    } else if (typeof firstGenre === 'string') {
                                      return firstGenre;
                                    } else if (typeof firstGenre === 'number') {
                                      // Fallback for any remaining genre IDs
                                      const genreMap = {
                                        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
                                        80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
                                        14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
                                        9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
                                        10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
                                      };
                                      return genreMap[firstGenre] || `Genre ${firstGenre}`;
                                    }
                                    return '';
                                  })()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Overview - only show if there's space and content */}
                        {movie.overview && (
                          <div className="flex-shrink-0 mt-1">
                            <p className="text-xs text-white/60 line-clamp-1 truncate">
                              {movie.overview}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0, 0.2, 1],
              delay: 0.05
            }}
            className="flex flex-col items-center justify-center min-h-[50vh] text-center px-2 sm:px-0"
          >
            {/* Modern Animated Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ 
                duration: 0.5, 
                ease: [0.4, 0, 0.2, 1],
                delay: 0.1
              }}
              className="relative mb-6 sm:mb-8"
            >
              {/* Main Container */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                {/* Animated Background Circle */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-full"
                />
                
                {/* Floating Elements Container */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {/* Animated Bookmark Icon */}
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 sm:h-16 sm:w-16 text-white/30"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    initial={{ scale: 0.8, rotate: -5 }}
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [-2, 2, -2],
                      y: [0, -3, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.25
                    }}
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </motion.svg>
                  
                  {/* Animated Floating Plus Icons */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="absolute inset-0"
                  >
                    {/* Top Right Plus - Floating Animation */}
                    <motion.div
                      initial={{ x: -10, y: -10, opacity: 0 }}
                      animate={{ 
                        x: [0, 5, 0],
                        y: [0, -5, 0],
                        opacity: 1,
                        rotate: [0, 10, 0]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.35
                      }}
                      className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2"
                    >
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 sm:h-6 sm:w-6 text-white/20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.2, 0.4, 0.2]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </motion.svg>
                    </motion.div>
                    
                    {/* Bottom Left Plus - Floating Animation */}
                    <motion.div
                      initial={{ x: 10, y: 10, opacity: 0 }}
                      animate={{ 
                        x: [0, -5, 0],
                        y: [0, 5, 0],
                        opacity: 1,
                        rotate: [0, -10, 0]
                      }}
                      transition={{ 
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4
                      }}
                      className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2"
                    >
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 sm:h-5 sm:w-5 text-white/15"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.15, 0.3, 0.15]
                        }}
                        transition={{ 
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </motion.svg>
                    </motion.div>
                  </motion.div>
                  
                  {/* Multiple Animated Rings */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.1, 0.3]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                    className="absolute inset-0 border-2 border-white/10 rounded-full"
                  />
                  
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ 
                      scale: [0.8, 1.1, 0.8],
                      opacity: [0.2, 0.05, 0.2]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.7
                    }}
                    className="absolute inset-0 border border-white/5 rounded-full"
                  />
                  
                  {/* Floating Dots */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="absolute inset-0"
                  >
                    {/* Top Left Dot */}
                    <motion.div
                      animate={{ 
                        x: [0, 8, 0],
                        y: [0, -8, 0],
                        opacity: [0.3, 0.8, 0.3]
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.8
                      }}
                      className="absolute top-3 left-3 sm:top-4 sm:left-4 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/20 rounded-full"
                    />
                    
                    {/* Bottom Right Dot */}
                    <motion.div
                      animate={{ 
                        x: [0, -6, 0],
                        y: [0, 6, 0],
                        opacity: [0.2, 0.6, 0.2]
                      }}
                      transition={{ 
                        duration: 2.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                      }}
                      className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white/15 rounded-full"
                    />
                  </motion.div>
                  
                  {/* Animated Sparkles */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    className="absolute inset-0"
                  >
                    {/* Sparkle 1 */}
                    <motion.div
                      animate={{ 
                        rotate: [0, 360],
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0, 0.5, 0]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.2
                      }}
                      className="absolute top-4 right-4 sm:top-6 sm:right-6"
                    >
                      <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white/30" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </motion.div>
                    
                    {/* Sparkle 2 */}
                    <motion.div
                      animate={{ 
                        rotate: [360, 0],
                        scale: [1.2, 0.8, 1.2],
                        opacity: [0, 0.4, 0]
                      }}
                      transition={{ 
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.5
                      }}
                      className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6"
                    >
                      <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white/25" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1],
                delay: 0.2
              }}
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Your watchlist is empty</h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="text-white/60 mb-4 sm:mb-6 text-sm sm:text-base"
              >
                {user ? 
                  "Add movies and TV shows to your watchlist to keep track of what you want to watch" :
                  "Add movies and TV shows to your local watchlist. Sign in to sync across devices."
                }
              </motion.p>
            </motion.div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ 
                scale: 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1],
                delay: 0.4
              }}
              onClick={() => navigate('/')}
              className="px-4 py-2.5 sm:px-6 sm:py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors relative overflow-hidden group text-sm sm:text-base"
            >
              {/* Button Background Animation */}
              <motion.div
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
              <span className="relative z-10">Browse Movies & TV Shows</span>
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Movie Details Overlay */}
      {selectedMovie && (
        <Suspense fallback={null}>
          <MovieDetailsOverlay
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
            onMovieSelect={handleMovieSelect}
            onGenreClick={handleGenreNavigation}
          />
        </Suspense>
      )}
    </div>
  );
};

export default WatchlistPage; 