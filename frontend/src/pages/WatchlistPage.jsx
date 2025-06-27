import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieDetailsOverlay from '../components/MovieDetailsOverlay';
import { PageLoader } from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { useWatchlist } from '../contexts/WatchlistContext';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const PLACEHOLDER_IMAGE = 'https://placehold.co/500x750/1a1d21/ffffff?text=No+Image';

const WatchlistPage = () => {
  const { watchlist, removeFromWatchlist, clearWatchlist, setWatchlist } = useWatchlist();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('added');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [showClearDialog, setShowClearDialog] = useState(false);
  const navigate = useNavigate();
  const sortDropdownRef = useRef(null);
  const clearDialogRef = useRef(null);

  // Set loading to false after initial render
  useEffect(() => {
    setLoading(false);
  }, []);

  // Auto-hide sort dropdown on click outside or Escape
  useEffect(() => {
    if (!showSortDropdown) return;
    function handleClick(e) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setShowSortDropdown(false);
    }
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
    function handleClick(e) {
      if (clearDialogRef.current && !clearDialogRef.current.contains(e.target)) {
        setShowClearDialog(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setShowClearDialog(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showClearDialog]);

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
  };

  const handleRemoveFromWatchlist = (movieId) => {
    removeFromWatchlist(movieId);
  };

  const handleImageLoad = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: true
    }));
  };

  const handleImageError = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: 'error'
    }));
  };

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

  const getFilteredWatchlist = () => {
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
  };

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

  const filteredWatchlist = getFilteredWatchlist();

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'TV Shows' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1114] text-white">
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
          {/* Heading row for mobile: My List + Clear All */}
          <div className="flex flex-row items-center justify-between sm:block w-full">
            <h1 className="text-xl sm:text-3xl font-bold text-left sm:mb-0 mb-2 sm:mr-6 flex-shrink-0">My List</h1>
            {/* Mobile only: Clear All on right of heading */}
            <div className="flex sm:hidden">
              {filteredWatchlist.length > 0 && (
                <motion.button
                  onClick={() => setShowClearDialog(true)}
                  className="relative px-4 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm overflow-hidden focus:outline-none bg-[#1a1d21] text-gray-400 hover:text-black hover:bg-white flex-shrink-0 ml-2"
                  style={{ minWidth: 90 }}
                >
                  <span className="relative z-10">{getClearLabel()}</span>
                  {/* Animated background on hover/active */}
                  <motion.div
                    layoutId="activeWatchlistTabClear"
                    className="absolute inset-0 rounded-lg z-0"
                    initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </motion.button>
              )}
            </div>
          </div>
          {/* Controls row: Tabs left, Sort by right (mobile), all in one row (desktop) */}
          <div className="flex flex-row items-center gap-2 sm:justify-end sm:text-right w-full py-1 overflow-x-auto no-scrollbar">
            {/* Tabs (left on mobile, right on desktop) */}
            <div className="relative inline-flex items-center bg-[#1a1d21] rounded-lg p-1 flex-grow-0 min-w-fit mr-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 sm:px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition-colors focus:outline-none whitespace-nowrap ${
                    activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-white'
                  }`}
                  style={{ minWidth: 80 }}
                >
                  <span className="relative z-10">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeWatchlistTab"
                      className="absolute inset-0 bg-white rounded-lg"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
            {/* Sort Dropdown (right) */}
            <div className="relative flex-shrink-0 min-w-fit sm:ml-0 ml-auto" ref={sortDropdownRef}>
              <motion.button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className={`relative flex items-center gap-2 px-4 sm:px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition-colors focus:outline-none whitespace-nowrap bg-[#1a1d21] leading-[1.6rem] sm:leading-[1.5rem] ${
                  showSortDropdown ? 'text-black' : 'text-gray-400 hover:text-white'
                }`}
                style={{ minWidth: 120, height: '44px', minHeight: '44px' }}
                aria-haspopup="listbox"
                aria-expanded={showSortDropdown}
              >
                {/* Animated background: white when open, subtle on hover otherwise */}
                <AnimatePresence>
                  {showSortDropdown ? (
                    <motion.div
                      key="sortby-bg-open"
                      layoutId="activeWatchlistTabSort"
                      className="absolute inset-0 bg-white rounded-lg z-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  ) : (
                    <motion.div
                      key="sortby-bg-hover"
                      className="absolute inset-0 rounded-lg z-0"
                      initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.13)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
                <span className="relative z-10">Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform relative z-10 ${showSortDropdown ? 'rotate-180' : ''}`}
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
                    className="fixed left-0 z-50"
                    style={{
                      top: sortDropdownRef.current ? (sortDropdownRef.current.getBoundingClientRect().bottom + window.scrollY) : 0,
                      left: sortDropdownRef.current ? (sortDropdownRef.current.getBoundingClientRect().left + window.scrollX) : 0,
                      width: '160px',
                      maxWidth: '192px',
                      background: '#1a1d21',
                      borderRadius: '0.75rem',
                      boxShadow: '0 10px 32px 0 rgba(0,0,0,0.25)',
                      padding: '0.25rem 0',
                      border: '1px solid rgba(255,255,255,0.1)'
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
            {/* Desktop only: Clear All at end of controls */}
            <div className="hidden sm:flex">
              {filteredWatchlist.length > 0 && (
                <motion.button
                  onClick={() => setShowClearDialog(true)}
                  className="relative px-4 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm overflow-hidden focus:outline-none bg-[#1a1d21] text-gray-400 hover:text-black hover:bg-white flex-shrink-0 ml-2"
                  style={{ minWidth: 90 }}
                >
                  <span className="relative z-10">{getClearLabel()}</span>
                  {/* Animated background on hover/active */}
                  <motion.div
                    layoutId="activeWatchlistTabClear"
                    className="absolute inset-0 rounded-lg z-0"
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
        {/* Watchlist Grid */}
        {filteredWatchlist.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4"
          >
            <AnimatePresence>
              {filteredWatchlist.map((movie) => (
                <motion.div
                  layout
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                  className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1a1d21] cursor-pointer w-full max-w-xs mx-auto"
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
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
                        loadedImages[movie.id] ? 'opacity-100' : 'opacity-0'
                      }`}
                      onLoad={() => handleImageLoad(movie.id)}
                      onError={(e) => {
                        handleImageError(movie.id);
                        e.target.src = PLACEHOLDER_IMAGE;
                      }}
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
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          <span className="text-xs sm:text-sm text-white/80">{movie.rating?.toFixed(1)}</span>
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
              className="relative mb-8"
            >
              {/* Main Container */}
              <div className="relative w-32 h-32">
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
                    className="h-16 w-16 text-white/30"
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
                      className="absolute top-2 right-2"
                    >
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-white/20"
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
                      className="absolute bottom-2 left-2"
                    >
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white/15"
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
                      className="absolute top-4 left-4 w-2 h-2 bg-white/20 rounded-full"
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
                      className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-white/15 rounded-full"
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
                      className="absolute top-6 right-6"
                    >
                      <svg className="w-3 h-3 text-white/30" viewBox="0 0 24 24" fill="currentColor">
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
                      className="absolute bottom-6 left-6"
                    >
                      <svg className="w-2.5 h-2.5 text-white/25" viewBox="0 0 24 24" fill="currentColor">
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
              <h2 className="text-2xl font-bold mb-2">Your watchlist is empty</h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="text-white/60 mb-6"
              >
                Add movies and TV shows to your watchlist to keep track of what you want to watch
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
              className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors relative overflow-hidden group"
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
        <MovieDetailsOverlay
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
};

export default WatchlistPage; 