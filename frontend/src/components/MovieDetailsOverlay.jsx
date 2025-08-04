import React, { useState, useRef, useEffect, useCallback, Suspense, lazy, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getMovieDetails, getMovieCredits, getMovieVideos, getSimilarMovies, getTVSeason, getTVSeasons } from '../services/tmdbService';
import { useWatchlist } from '../contexts/WatchlistContext';
import { Loader, PageLoader, SectionLoader, CardLoader } from './Loader';
import { getStreamingUrl, isStreamingAvailable, needsEpisodeSelection } from '../services/streamingService';
import StreamingPlayer from './StreamingPlayer';
import TVEpisodeSelector from './TVEpisodeSelector';
import EnhancedSimilarContent from './EnhancedSimilarContent';
import { getOptimizedImageUrl } from '../services/imageOptimizationService';
import memoryManager from '../utils/memoryManager';
import EnhancedLoadMoreButton from './enhanced/EnhancedLoadMoreButton';

// Custom Modern Minimalist Dropdown Component
const CustomDropdown = React.memo(({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option",
  className = ""
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.value === value) || options[0];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-sm text-white bg-transparent border-b border-white/15 hover:border-white/30 focus:outline-none focus:border-primary/80 transition-all duration-200 min-w-[120px]"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <motion.svg 
          className="w-4 h-4 text-white/60 ml-2 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors duration-150 ${
                    option.value === value 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-white/80'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// 🚀 NEW: Advanced caching and real-time updates
const DETAILS_CACHE = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes
const REAL_TIME_UPDATE_INTERVAL = 30 * 1000; // 30 seconds
const MAX_CACHE_SIZE = 50; // Maximum number of cached items

// 🎯 NEW: Cache management utilities with memory optimization
const getCachedDetails = (id, type) => {
  const key = `${type}_${id}`;
  const cached = DETAILS_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedDetails = (id, type, data) => {
  const key = `${type}_${id}`;
  DETAILS_CACHE.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Enhanced cleanup: Limit cache size and remove old entries
  if (DETAILS_CACHE.size > MAX_CACHE_SIZE) {
    // Remove oldest entries
    const entries = Array.from(DETAILS_CACHE.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(MAX_CACHE_SIZE * 0.25);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      DETAILS_CACHE.delete(entries[i][0]);
    }
  }
  
  // Clean up old cache entries
  const now = Date.now();
  for (const [cacheKey, value] of DETAILS_CACHE.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      DETAILS_CACHE.delete(cacheKey);
    }
  }
};

// 🆕 NEW: Cache cleanup utility
const clearCache = () => {
  DETAILS_CACHE.clear();
  console.log('[MovieDetailsOverlay] Cache cleared');
};

// 📊 NEW: Performance tracking with memory monitoring
const trackPerformance = (operation, duration, success = true) => {
  if (window.gtag) {
    window.gtag('event', 'movie_details_performance', {
      event_category: 'MovieDetails',
      event_label: operation,
      value: Math.round(duration),
      success
    });
  }
  
  // Memory monitoring
  if (performance.memory) {
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    if (memoryMB > 800) {
      console.warn(`[MovieDetailsOverlay] High memory usage during ${operation}: ${memoryMB.toFixed(2)}MB`);
      // Force cleanup if memory is too high
      clearCache();
      if (window.gc) {
        window.gc();
      }
    }
  }
};

// 🔄 NEW: Real-time update manager with enhanced memory management
class RealTimeUpdateManager {
  constructor() {
    this.subscribers = new Map();
    this.updateInterval = null;
    this.isActive = false;
    this.abortController = null;
    this.lastUpdateTime = 0;
    this.maxSubscribers = 20; // Limit number of subscribers
  }

  subscribe(movieId, type, callback) {
    if (!this.subscribers) return; // Prevent error if already cleaned up
    
    const key = `${type}_${movieId}`;
    
    // Limit number of subscribers to prevent memory leaks
    if (this.subscribers.size >= this.maxSubscribers) {
      console.warn('[RealTimeUpdateManager] Too many subscribers, removing oldest');
      const firstKey = this.subscribers.keys().next().value;
      this.subscribers.delete(firstKey);
    }
    
    this.subscribers.set(key, callback);
    
    if (!this.isActive) {
      this.startUpdates();
    }
  }

  unsubscribe(movieId, type) {
    if (!this.subscribers) return; // Prevent error if already cleaned up
    
    const key = `${type}_${movieId}`;
    this.subscribers.delete(key);
    
    if (this.subscribers.size === 0) {
      this.stopUpdates();
    }
  }

  startUpdates() {
    if (this.isActive || !this.subscribers) return;
    
    this.isActive = true;
    this.abortController = new AbortController();
    
    this.updateInterval = setInterval(() => {
      if (this.abortController?.signal.aborted) {
        this.stopUpdates();
        return;
      }
      this.performUpdates();
    }, REAL_TIME_UPDATE_INTERVAL);
  }

  stopUpdates() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async performUpdates() {
    if (this.abortController?.signal.aborted || !this.subscribers) return;
    
    // Rate limiting: don't update too frequently
    const now = Date.now();
    if (now - this.lastUpdateTime < 1000) return; // Minimum 1 second between updates
    this.lastUpdateTime = now;
    
    // Memory check before performing updates
    if (performance.memory) {
      const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      if (memoryMB > 1000) {
        console.warn(`[RealTimeUpdateManager] High memory usage: ${memoryMB.toFixed(2)}MB, skipping updates`);
        return;
      }
    }
    
    const updatePromises = [];
    
    for (const [key, callback] of this.subscribers.entries()) {
      if (this.abortController?.signal.aborted) break;
      
      const [type, movieId] = key.split('_');
      
      try {
        const startTime = performance.now();
        const freshData = await getMovieDetails(movieId, type);
        const duration = performance.now() - startTime;
        
        if (freshData && !this.abortController?.signal.aborted) {
          setCachedDetails(movieId, type, freshData);
          callback(freshData);
          trackPerformance('real_time_update', duration, true);
        }
      } catch (error) {
        if (!this.abortController?.signal.aborted) {
          console.warn(`Real-time update failed for ${key}:`, error);
          trackPerformance('real_time_update', 0, false);
        }
      }
    }
  }

  // Enhanced cleanup method to prevent memory leaks
  cleanup() {
    // Prevent multiple cleanup calls
    if (!this.subscribers) return;
    
    this.stopUpdates();
    this.subscribers.clear();
    
    // Ensure all references are cleared
    this.subscribers = null;
    this.updateInterval = null;
    this.abortController = null;
    this.lastUpdateTime = 0;
  }
}

// Global real-time update manager (singleton)
let realTimeManager = null;

const getRealTimeManager = () => {
  if (!realTimeManager) {
    realTimeManager = new RealTimeUpdateManager();
  }
  return realTimeManager;
};

const NetworkDisplay = ({ networks, network }) => {
  const getNetworkNames = () => {
    if (!networks) {
      return network || 'N/A';
    }
    
    if (!Array.isArray(networks)) {
      return typeof networks === 'string' ? networks : 'N/A';
    }
    
    const names = networks
      .filter(n => n && typeof n === 'object' && n.name)
      .map(n => n.name)
      .filter(Boolean);
      
    return names.length > 0 ? names.join(', ') : 'N/A';
  };

  return (
    <div className="text-white/60 text-sm mb-6">
      <span>Network: {getNetworkNames()}</span>
    </div>
  );
};



// Lazy load YouTube player for trailer modal
const LazyYouTube = lazy(() => import('react-youtube'));

// Memoized Cast Card
const CastCard = React.memo(function CastCard({ person }) {
  return (
    <div className="text-center group">
      <div className="relative w-24 h-24 mx-auto mb-3">
                                <div className="rounded-full overflow-hidden w-full h-full transition-all duration-300 transform group-hover:scale-110 shadow-lg will-change-transform">
                          {person.image ? (
                            <img 
                              src={person.image} 
                              alt={person.name} 
                              className="w-full h-full object-cover will-change-transform" 
                              loading="lazy" 
                              style={{ backfaceVisibility: 'hidden' }}
                              onError={(e) => {
                                console.warn('Failed to load cast image:', e.target.src);
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            </div>
                          )}
                        </div>
        <div className="absolute inset-0 rounded-full ring-2 ring-white/10 ring-inset opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <h4 className="text-white font-medium text-sm truncate transition-colors group-hover:text-white">{person.name}</h4>
      <p className="text-white/60 text-xs truncate">{person.character}</p>
    </div>
  );
});

// Memoized Similar Movie Card
const SimilarMovieCard = React.memo(function SimilarMovieCard({ similar, onClick, isMobile }) {
  const displayTitle = similar.title || similar.name || 'Untitled';
  let displayYear = 'N/A';
  if (similar.year) {
    displayYear = similar.year;
  } else if (similar.first_air_date) {
    displayYear = new Date(similar.first_air_date).getFullYear();
  } else if (similar.release_date) {
    displayYear = new Date(similar.release_date).getFullYear();
  }
  return (
    <div className="group cursor-pointer" onClick={() => onClick(similar)}>
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative shadow-lg">
        {similar.poster_path ? (
          <img 
            src={getOptimizedImageUrl(similar.poster_path, 'w500')} 
            alt={displayTitle} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 will-change-transform transform-gpu" 
            style={{ backfaceVisibility: 'hidden' }} 
            loading="lazy"
            onError={(e) => {
              console.warn('Failed to load similar movie poster:', e.target.src);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
        )}
        {/* Only show hover overlay on desktop */}
        {!isMobile && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
              <h4 className="font-semibold text-white text-base truncate">{displayTitle}</h4>
              <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                <span>{displayYear}</span>
                <span className="w-1 h-1 rounded-full bg-white/50"></span>
                <span className="flex items-center gap-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  {similar.vote_average?.toFixed ? similar.vote_average.toFixed(1) : (typeof similar.vote_average === 'number' ? similar.vote_average : 'N/A')}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center transform transition-all duration-300 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
  );
});

// Enhanced mobile detection hook with breakpoint management and performance optimizations
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 640;
  });

  const [isTablet, setIsTablet] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > 640 && window.innerWidth <= 1024;
  });

  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > 1024;
  });

  React.useEffect(() => {
    let timeoutId;
    
    function handleResize() {
      // Debounce resize events for better performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        setIsMobile(width <= 640);
        setIsTablet(width > 640 && width <= 1024);
        setIsDesktop(width > 1024);
      }, 100);
    }

    // Use passive listener for better scroll performance
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isMobile, isTablet, isDesktop };
};

const MovieDetailsOverlay = ({ movie, onClose, onMovieSelect, onGenreClick }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [movieDetails, setMovieDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [videos, setVideos] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [similarMoviesPage, setSimilarMoviesPage] = useState(1);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const playerRef = useRef(null);
  const [isCastLoading, setIsCastLoading] = useState(true);
  const [isSimilarLoading, setIsSimilarLoading] = useState(true);
  const [isTrailerLoading, setIsTrailerLoading] = useState(false);
  const [isSimilarLoadingMore, setIsSimilarLoadingMore] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const similarLoaderRef = useRef(null);
  const scrollContainerRef = useRef(null);
  // Virtualization: show only first 20 cast/similar, with Show More
  const [castLimit, setCastLimit] = useState(20);
  const [similarLimit, setSimilarLimit] = useState(20);
  const [castSearchTerm, setCastSearchTerm] = useState("");
  const handleShowMoreCast = useCallback(() => setCastLimit(lim => lim + 20), []);
  const handleShowMoreSimilar = useCallback(() => setSimilarLimit(lim => lim + 20), []);
  // Add state to control how many rows of cast are shown
  const [castRowsShown, setCastRowsShown] = useState(1);

  // Enhanced motion variants with ultra-smooth spring physics and optimized performance
  const containerVariants = useMemo(() => ({
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 35,
        mass: 0.8,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier for ultra-smooth feel
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { 
      y: 15, 
      opacity: 0,
      scale: 0.98,
      filter: 'blur(4px)',
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 30,
        mass: 0.9,
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    exit: {
      y: -10,
      opacity: 0,
      scale: 0.98,
      filter: 'blur(4px)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 35,
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }), []);

  // Additional variants for different animation types with ultra-smooth physics
  const fadeInVariants = useMemo(() => ({
    hidden: { 
      opacity: 0,
      filter: 'blur(2px)',
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 35,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }), []);

  const slideUpVariants = useMemo(() => ({
    hidden: { 
      y: 25, 
      opacity: 0,
      filter: 'blur(2px)',
    },
    visible: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 30,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }), []);

  // Enhanced utility animations with spring physics and scroll-based triggers
  const fadeInMotionProps = useMemo(() => ({
    initial: { opacity: 0, y: 20, filter: 'blur(2px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 35,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }), []);

  const slideUpMotionProps = useMemo(() => ({
    initial: { y: 30, opacity: 0, filter: 'blur(2px)' },
    animate: { y: 0, opacity: 1, filter: 'blur(0px)' },
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 30,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }), []);



  // Ultra-smooth stagger animation for list items
  const staggerContainerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.08,
        type: 'spring',
        stiffness: 300,
        damping: 35
      }
    }
  }), []);

  const staggerItemVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.98,
      filter: 'blur(2px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 30,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  }), []);

  // New: Micro-interaction variants for buttons and interactive elements
  const buttonVariants = useMemo(() => ({
    initial: { scale: 1, filter: 'brightness(1)' },
    hover: { 
      scale: 1.05, 
      filter: 'brightness(1.1)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        duration: 0.2,
      }
    },
    tap: { 
      scale: 0.98,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        duration: 0.1,
      }
    }
  }), []);

  // New: Card hover variants for enhanced interactivity
  const cardVariants = useMemo(() => ({
    initial: { 
      scale: 1, 
      y: 0,
      filter: 'brightness(1)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    hover: { 
      scale: 1.02, 
      y: -4,
      filter: 'brightness(1.05)',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration: 0.3,
      }
    },
    tap: { 
      scale: 0.98,
      y: -2,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
        duration: 0.1,
      }
    }
  }), []);

  // New: Image loading variants for smooth image transitions
  const imageVariants = useMemo(() => ({
    initial: { 
      opacity: 0, 
      scale: 1.1,
      filter: 'blur(4px)',
    },
    loaded: { 
      opacity: 1, 
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 35,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }
    }
  }), []);

  // New: Text reveal variants for smooth text animations
  const textRevealVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: 10,
      filter: 'blur(1px)',
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 35,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }
    }
  }), []);

  // Hide scrollbars globally for MovieDetailsOverlay
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    // Check if style already exists to prevent duplicates
    if (document.getElementById('movie-details-overlay-scrollbar-style')) return;
    
    const style = document.createElement('style');
    style.id = 'movie-details-overlay-scrollbar-style';
    style.innerHTML = `
      .hide-scrollbar {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      .hide-scrollbar::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup function to remove style when component unmounts
    return () => {
      const existingStyle = document.getElementById('movie-details-overlay-scrollbar-style');
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
  }, []);

  // 🚀 NEW: Memoize expensive computed values
  const movieStats = React.useMemo(() => {
    if (!movieDetails) return null;
    
    return {
      formattedRating: movieDetails.vote_average 
        ? (typeof movieDetails.vote_average === 'number' 
            ? movieDetails.vote_average.toFixed(1) 
            : parseFloat(movieDetails.vote_average).toFixed(1))
        : 'N/A',
      formattedReleaseDate: movieDetails.release_date 
        ? (() => {
            const date = new Date(movieDetails.release_date);
            return isNaN(date) ? 'N/A' : date.toLocaleDateString();
          })()
        : 'N/A',
      formattedRuntime: movieDetails.runtime 
        ? (() => {
            const hours = Math.floor(movieDetails.runtime / 60);
            const minutes = movieDetails.runtime % 60;
            return `${hours}h ${minutes}m`;
          })()
        : 'N/A',
      formattedBudget: movieDetails.budget 
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1
          }).format(movieDetails.budget)
        : 'N/A',
      formattedRevenue: movieDetails.revenue 
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1
          }).format(movieDetails.revenue)
        : 'N/A'
    };
  }, [movieDetails]);

  // Get mobile/desktop state early to avoid initialization errors
  const { isMobile, isTablet, isDesktop } = useIsMobile();

  // Determine how many cast per row based on screen size
  const castPerRow = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 5; // lg
      if (window.innerWidth >= 640) return 4; // sm/md
      return 2; // xs
    }
    return 5;
  }, [isMobile, isTablet, isDesktop]);

  // 🚀 NEW: Memoize cast and similar movies with virtualization
  const optimizedCast = React.useMemo(() => {
    if (!movieDetails?.cast || !Array.isArray(movieDetails.cast)) return [];
    
    let filteredCast = movieDetails.cast;
    if (castSearchTerm && castSearchTerm.trim() !== "") {
      const term = castSearchTerm.trim().toLowerCase();
      filteredCast = filteredCast.filter(
        (person) =>
          (person?.name && person.name.toLowerCase().includes(term)) ||
          (person?.character && person.character.toLowerCase().includes(term))
      );
    }
    return filteredCast.slice(0, castRowsShown * castPerRow);
  }, [movieDetails?.cast, castSearchTerm, castRowsShown, castPerRow]);

  const optimizedSimilarMovies = React.useMemo(() => {
    if (!similarMovies || !Array.isArray(similarMovies)) return [];
    return similarMovies.slice(0, similarLimit);
  }, [similarMovies, similarLimit]);
  
  // Streaming state
  const [showStreamingPlayer, setShowStreamingPlayer] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState(null);
  const [currentService, setCurrentService] = useState('MOVIES111');
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  
  // TV Seasons and Episodes state
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [displayedEpisodes, setDisplayedEpisodes] = useState(10); // Show 10 episodes initially
  const [lastLoadMoreTime, setLastLoadMoreTime] = useState(0);
  const [isSeasonsLoading, setIsSeasonsLoading] = useState(false);
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);
  const [episodesViewMode, setEpisodesViewMode] = useState(() => {
    // Get saved view mode from localStorage, default to 'list'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('episodesViewMode') || 'list';
    }
    return 'list';
  });

  // Custom setter that saves to localStorage
  const setEpisodesViewModeWithStorage = useCallback((mode) => {
    setEpisodesViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('episodesViewMode', mode);
    }
  }, []);

  // Enhanced load more episodes function with better UX and error handling
  const handleLoadMoreEpisodes = useCallback(async () => {
    // Prevent rapid clicking
    const now = Date.now();
    if (now - (lastLoadMoreTime || 0) < 500) {
      return;
    }
    
    setLastLoadMoreTime(now);
    setDisplayedEpisodes(prev => prev + 10);
  }, [lastLoadMoreTime]);

  // Check if there are more episodes to load
  const hasMoreEpisodes = useMemo(() => {
    return displayedEpisodes < episodes.length;
  }, [displayedEpisodes, episodes.length]);

  // Compute how many cast to show
  const castToShow = React.useMemo(() => {
    if (!movieDetails?.cast) return [];
    let filteredCast = movieDetails.cast;
    if (castSearchTerm && castSearchTerm.trim() !== "") {
      const term = castSearchTerm.trim().toLowerCase();
      filteredCast = filteredCast.filter(
        (person) =>
          (person.name && person.name.toLowerCase().includes(term)) ||
          (person.character && person.character.toLowerCase().includes(term))
      );
    }
    return filteredCast.slice(0, castRowsShown * castPerRow);
  }, [movieDetails, castSearchTerm, castRowsShown, castPerRow]);

  // Memoize similarToShow (already memoized, but add comment)
  // Memoize the visible similar movies list for performance
  const similarToShow = React.useMemo(() => {
    if (!similarMovies) return [];
    return similarMovies.slice(0, similarLimit);
  }, [similarMovies, similarLimit]);
  // Prefetch next page of similar movies in background
  useEffect(() => {
    if (hasMoreSimilar && !isSimilarLoadingMore && similarMovies.length >= similarLimit && movie) {
      const movieType = movie.media_type || movie.type || 'movie';
      getSimilarMovies(movie.id, movieType, similarMoviesPage + 1).then(data => {
        if (data?.results?.length > 0) {
          setSimilarMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMovies = data.results.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMovies];
          });
        }
      });
    }
    // eslint-disable-next-line
  }, [similarLimit, movie, hasMoreSimilar, isSimilarLoadingMore, similarMovies.length, similarMoviesPage]);

  // Memoized callback for toggling showAllCast
  const handleToggleShowAllCast = useCallback(() => setShowAllCast(v => !v), []);

  // Simple scroll handler
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      const scrollHeight = scrollContainerRef.current.scrollHeight;
      const clientHeight = scrollContainerRef.current.clientHeight;
      
      // Calculate scroll percentage for enhanced UX
      const scrollPercentage = Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100));
      
      // Update scroll position
      setScrollY(scrollTop);
      
      // Store scroll percentage for potential use in animations or UI feedback
      if (scrollContainerRef.current.dataset) {
        scrollContainerRef.current.dataset.scrollPercentage = scrollPercentage.toFixed(1);
      }
    }
  }, []);

  // Simple scroll event listener
  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    
    if (!currentRef) return;
    
    // Simple scroll handler
    let ticking = false;
    let animationFrameId = null;
    
    const simpleScrollHandler = () => {
      if (!ticking) {
        animationFrameId = requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
          animationFrameId = null;
        });
        ticking = true;
      }
    };
    
    // Add event listener with passive option for performance
    currentRef.addEventListener('scroll', simpleScrollHandler, { 
      passive: true, 
      capture: false 
    });
    
    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (currentRef && currentRef.removeEventListener) {
        currentRef.removeEventListener('scroll', simpleScrollHandler, { 
          capture: false 
        });
      }
    };
  }, [loading, handleScroll]);

  // 🚀 Ultra-enhanced loadMoreSimilar with advanced error handling, intelligent caching, and performance optimizations
  const loadMoreSimilar = useCallback(async () => {
    // Prevent multiple simultaneous requests with enhanced validation
    if (isSimilarLoadingMore || !hasMoreSimilar || !movie?.id) {
      return;
    }
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';
    
    // Set loading state immediately with performance tracking
    const loadStartTime = performance.now();
    setIsSimilarLoadingMore(true);
    
    const nextPage = similarMoviesPage + 1;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // Base delay for exponential backoff
    
    // Create abort controller for this request
    const abortController = new AbortController();
    
    // Enhanced attempt function with intelligent retry logic and data validation
    const attemptLoad = async () => {
      try {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          throw new Error('Request aborted');
        }
        
        // Add request timeout for better UX
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const dataPromise = getSimilarMovies(movie.id, movieType, nextPage);
        const data = await Promise.race([dataPromise, timeoutPromise]);
        
        // Check if request was aborted after data fetch
        if (abortController.signal.aborted) {
          throw new Error('Request aborted after data fetch');
        }
        
        // Comprehensive response validation with detailed error messages
        if (!data) {
          throw new Error('Empty response received');
        }
        
        if (!Array.isArray(data.results)) {
          throw new Error(`Invalid results format: expected array, got ${typeof data.results}`);
        }
        
        if (data.results.length > 0) {
          // Optimize state updates with intelligent deduplication and data validation
          setSimilarMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMovies = data.results.filter(m => {
              // Enhanced validation for movie objects
              return m && 
                     m.id && 
                     typeof m.id === 'number' && 
                     !existingIds.has(m.id) && 
                     m.title && 
                     typeof m.title === 'string' &&
                     m.title.trim().length > 0;
            });
            
            return [...prev, ...newMovies];
          });
          
          // Update pagination state with validation
          setSimilarMoviesPage(nextPage);
          const hasMore = data.page < data.total_pages;
          setHasMoreSimilar(hasMore);
          
          // Intelligent prefetching with adaptive timing
          if (hasMore && data.page < data.total_pages - 1) {
            const prefetchDelay = Math.min(2000, 1000 + (data.results.length * 100)); // Adaptive delay
            const prefetchTimeout = setTimeout(() => {
              if (!abortController.signal.aborted) {
                getSimilarMovies(movie.id, movieType, nextPage + 1)
                  .then(() => {})
                  .catch(() => {});
              }
            }, prefetchDelay);
            
            // Store timeout for cleanup
            if (window.addCleanupTimer) {
              window.addCleanupTimer(prefetchTimeout);
            }
          }
        } else {
          setHasMoreSimilar(false);
        }
      } catch (error) {
        // Don't retry if request was aborted
        if (abortController.signal.aborted) {
          console.log('Similar movies request aborted');
          return;
        }
        
        // Enhanced exponential backoff with jitter for better retry distribution
        if (retryCount < maxRetries) {
          retryCount++;
          const exponentialDelay = Math.pow(2, retryCount) * baseDelay;
          const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
          const finalDelay = exponentialDelay + jitter;
          
          await new Promise(resolve => setTimeout(resolve, finalDelay));
          return attemptLoad();
        } else {
          // Final failure with user-friendly error handling
          setHasMoreSimilar(false);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsSimilarLoadingMore(false);
        }
      }
    };
    
    await attemptLoad();
    
    // Return abort controller for cleanup
    return abortController;
  }, [isSimilarLoadingMore, hasMoreSimilar, similarMoviesPage, movie?.id, movie?.type]);

  // Memoize observer effect
  useEffect(() => {
    if (loading) return;
    let observer;
    const currentLoader = similarLoaderRef.current;
    if (currentLoader) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreSimilar) {
            loadMoreSimilar();
          }
        },
        {
          root: scrollContainerRef.current,
          threshold: 1.0,
        }
      );
      observer.observe(currentLoader);
    }
    return () => {
      if (observer && currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [loading, hasMoreSimilar, loadMoreSimilar]);

  // Memoize click outside and escape handlers
  const handleClickOutside = useCallback((event) => {
    if (overlayRef.current && !contentRef.current?.contains(event.target)) {
      onClose();
    }
  }, [onClose]);

  const handleEscape = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    const clickOutsideHandler = handleClickOutside;
    const escapeHandler = handleEscape;
    
    document.addEventListener('mousedown', clickOutsideHandler);
    document.addEventListener('keydown', escapeHandler);
    
    return () => {
      document.removeEventListener('mousedown', clickOutsideHandler);
      document.removeEventListener('keydown', escapeHandler);
    };
  }, [handleClickOutside, handleEscape]);

  // Memoize genres (already memoized, but add comment)
  // Memoize genres for performance
  const genres = React.useMemo(() => movieDetails?.genres || [], [movieDetails]);

  const [retryCount, setRetryCount] = useState(0);

  // Enhanced fetchMovieData with comprehensive error handling, retry logic, and performance optimizations
  const fetchMovieData = useCallback(async (attempt = 0) => {
    if (!movie?.id) {
      console.warn('Invalid movie data provided to fetchMovieData');
      return;
    }
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';

    // Prevent multiple simultaneous requests
    if (loading && attempt === 0) {
      console.log('Request already in progress, skipping...');
      return;
    }

    try {
      // Reset all states at the beginning
      setLoading(true);
      setError(null);
      setMovieDetails(null);
      setCredits(null);
      setVideos(null);
      setSimilarMovies([]);
      setSimilarMoviesPage(1);
      setHasMoreSimilar(true);
      setIsCastLoading(true);
      setIsSimilarLoading(true);
      setShowAllCast(false);
      setShowTrailer(false);

      // Create abort controller for request cancellation
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30s timeout

      console.log(`Fetching movie data for ${movieType} ID: ${movie.id} (attempt ${attempt + 1})`);

      // Parallel API calls with error handling for each
      const [movieDetails, movieCredits, movieVideos, similar] = await Promise.allSettled([
        getMovieDetails(movie.id, movieType).catch(err => {
          console.error('Movie details fetch failed:', err);
          return null;
        }),
        getMovieCredits(movie.id, movieType).catch(err => {
          console.error('Movie credits fetch failed:', err);
          return null;
        }),
        getMovieVideos(movie.id, movieType).catch(err => {
          console.error('Movie videos fetch failed:', err);
          return null;
        }),
        getSimilarMovies(movie.id, movieType, 1).catch(err => {
          console.error('Similar movies fetch failed:', err);
          return null;
        })
      ]);

      clearTimeout(timeoutId);

      // Handle individual API failures gracefully
      const details = movieDetails.status === 'fulfilled' ? movieDetails.value : null;
      const credits = movieCredits.status === 'fulfilled' ? movieCredits.value : null;
      const videos = movieVideos.status === 'fulfilled' ? movieVideos.value : null;
      const similarData = similar.status === 'fulfilled' ? similar.value : null;

      // Validate essential data
      if (!details) {
        throw new Error('Movie details not found or unavailable');
      }

      // 🎯 NEW: Cache the fetched details
      setCachedDetails(movie.id, movieType, details);
      
      // Set data with fallbacks for failed requests
      setMovieDetails(details);
      setCredits(credits || { cast: [], crew: [] });
      setVideos(videos || { results: [] });
      setSimilarMovies(similarData?.results || []);
      setHasMoreSimilar(similarData ? (similarData.page < similarData.total_pages) : false);
      
      // Update loading states
      setIsCastLoading(false);
      setIsSimilarLoading(false);
      setRetryCount(0);
      
      // 📊 NEW: Track successful fetch performance
      const totalDuration = performance.now() - fetchStartTime;
      trackPerformance('movie_details_fetch', totalDuration, true);

      console.log('Movie data fetched successfully:', {
        hasDetails: !!details,
        hasCredits: !!credits,
        hasVideos: !!videos,
        hasSimilar: !!similarData,
        similarCount: similarData?.results?.length || 0
      });

    } catch (err) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, err);
      
      // Handle different types of errors
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.message.includes('not found')) {
        setError('Movie not found. It may have been removed or is unavailable.');
      } else if (attempt < 3) {
        // Exponential backoff with jitter for better retry distribution
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/3)`);
        
        setTimeout(() => {
          setRetryCount(attempt + 1);
          fetchMovieData(attempt + 1);
        }, delay);
        return; // Don't set error state for retry attempts
      } else {
        setError(`Failed to load movie details after ${attempt + 1} attempts. Please try again later.`);
      }
      
      // Reset states on final failure
      if (attempt >= 3) {
        setMovieDetails(null);
        setCredits(null);
        setVideos(null);
        setSimilarMovies([]);
      }
    } finally {
      setLoading(false);
    }
  }, [movie, loading]);

  // 🚀 Enhanced data fetching with intelligent caching, performance tracking, and advanced error recovery
  useEffect(() => {
    // Register cache cleanup with memory manager
    const unregisterCleanup = memoryManager.registerCleanupCallback(() => {
      clearCache();
    });

    // Prevent unnecessary fetches with comprehensive validation
    if (!movie?.id || loading) {
      console.debug('Fetch blocked:', { movieId: movie?.id, loading });
      return;
    }
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';

    // 🎯 NEW: Check cache first for instant loading
    const cachedDetails = getCachedDetails(movie.id, movieType);
    if (cachedDetails) {
      console.log(`📦 Using cached data for ${movieType} ID: ${movie.id}`);
      setMovieDetails(cachedDetails);
      setLoading(false);
      
      // Start background refresh for fresh data
      setTimeout(() => {
        fetchMovieData(0);
      }, 100);
      
      // Subscribe to real-time updates
      const manager = getRealTimeManager();
      manager.subscribe(movie.id, movieType, (freshData) => {
        console.log(`🔄 Real-time update received for ${movieType} ID: ${movie.id}`);
        setMovieDetails(freshData);
      });
      
      return;
    }

    // Track fetch performance for optimization insights
    const fetchStartTime = performance.now();
    console.log(`🔄 Starting fetch for ${movieType} ID: ${movie.id}`);

    // Execute fetch with performance monitoring
    fetchMovieData(0).finally(() => {
      const fetchDuration = performance.now() - fetchStartTime;
      console.log(`✅ Fetch completed in ${fetchDuration.toFixed(2)}ms`);
      
      // Log performance metrics for optimization
      if (fetchDuration > 2000) {
        console.warn(`⚠️ Slow fetch detected: ${fetchDuration.toFixed(2)}ms`);
      }
      
      // Subscribe to real-time updates after successful fetch
      const manager = getRealTimeManager();
      manager.subscribe(movie.id, movieType, (freshData) => {
        console.log(`🔄 Real-time update received for ${movieType} ID: ${movie.id}`);
        setMovieDetails(freshData);
      });
    });

    // Cleanup: unsubscribe from real-time updates and memory manager
    return () => {
      if (movie?.id) {
        const manager = getRealTimeManager();
        const movieType = movie.media_type || movie.type || 'movie';
        manager.unsubscribe(movie.id, movieType);
      }
      unregisterCleanup();
    };
  }, [movie?.id, movie?.media_type, movie?.type]);

  // 🎯 Enhanced retry handler with intelligent state management and user feedback
  const handleRetry = useCallback(() => {
    // Validate current state before retry
    if (!movie?.id) {
      console.warn('Retry blocked: Invalid movie data');
      return;
    }
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';

    console.log(`🔄 Manual retry initiated for ${movieType} ID: ${movie.id}`);
    
    // Reset all relevant states for clean retry
    setRetryCount(0);
    setError(null);
    setLoading(true);
    
    // Clear previous data to prevent stale content display
    setMovieDetails(null);
    setCredits(null);
    setVideos(null);
    setSimilarMovies([]);
    
    // Execute retry with performance tracking
    const retryStartTime = performance.now();
    fetchMovieData(0).finally(() => {
      const retryDuration = performance.now() - retryStartTime;
      console.log(`🔄 Retry completed in ${retryDuration.toFixed(2)}ms`);
    });
  }, [movie?.id, movie?.media_type, movie?.type, fetchMovieData]);

  // 🧹 Ultra-Comprehensive cleanup with enhanced memory leak prevention
  useEffect(() => {
    // Track unmount for diagnostics
    let isUnmounted = false;
    let cleanupTimers = [];
    let cleanupAnimationFrames = [];
    let cleanupAbortControllers = [];
    let cleanupEventListeners = [];

    // Helper: Log state reset for debugging
    const logReset = (name) => {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug(`[MovieDetailsOverlay] Resetting: ${name}`);
      }
    };

    // Helper: Safely reset a state setter
    const safeSet = (setter, value, name) => {
      if (isUnmounted) return;
      try {
        setter(value);
        logReset(name);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[MovieDetailsOverlay] Failed to reset ${name}:`, e);
      }
    };

    // Helper: Add cleanup timer
    const addCleanupTimer = (timerId) => {
      cleanupTimers.push(timerId);
    };

    // Helper: Add cleanup animation frame
    const addCleanupAnimationFrame = (frameId) => {
      cleanupAnimationFrames.push(frameId);
    };

    // Helper: Add cleanup abort controller
    const addCleanupAbortController = (controller) => {
      cleanupAbortControllers.push(controller);
    };

    // Helper: Add cleanup event listener
    const addCleanupEventListener = (target, type, handler) => {
      cleanupEventListeners.push({ target, type, handler });
    };

    // Store cleanup function for proper execution
    const cleanup = () => {
      isUnmounted = true;

      // Reset all state variables to prevent memory leaks
      safeSet(setMovieDetails, null, "movieDetails");
      safeSet(setCredits, null, "credits");
      safeSet(setVideos, null, "videos");
      safeSet(setSimilarMovies, [], "similarMovies");
      safeSet(setLoading, true, "loading");
      safeSet(setError, null, "error");
      safeSet(setShowTrailer, false, "showTrailer");
      safeSet(setRetryCount, 0, "retryCount");

      // Reset UI states
      safeSet(setShowAllCast, false, "showAllCast");
      safeSet(setCastLimit, 20, "castLimit");
      safeSet(setSimilarLimit, 20, "similarLimit");
      safeSet(setScrollY, 0, "scrollY");

      // Clear all cleanup timers
      cleanupTimers.forEach(timerId => {
        try {
          clearTimeout(timerId);
          clearInterval(timerId);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[MovieDetailsOverlay] Failed to clear timer:", timerId, e);
        }
      });
      cleanupTimers = [];
      logReset("cleanupTimers");

      // Cancel all cleanup animation frames
      cleanupAnimationFrames.forEach(frameId => {
        try {
          cancelAnimationFrame(frameId);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[MovieDetailsOverlay] Failed to cancel animation frame:", frameId, e);
        }
      });
      cleanupAnimationFrames = [];
      logReset("cleanupAnimationFrames");

      // Abort all cleanup controllers
      cleanupAbortControllers.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[MovieDetailsOverlay] Failed to abort controller:", e);
        }
      });
      cleanupAbortControllers = [];
      logReset("cleanupAbortControllers");

      // Remove all cleanup event listeners
      cleanupEventListeners.forEach(({ target, type, handler }) => {
        try {
          (target || window).removeEventListener(type, handler);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[MovieDetailsOverlay] Failed to remove event listener:", type, e);
        }
      });
      cleanupEventListeners = [];
      logReset("cleanupEventListeners");

      // Reset scroll container if it exists
      if (scrollContainerRef.current) {
        try {
          scrollContainerRef.current.scrollTop = 0;
          logReset("scrollContainerRef.scrollTop");
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[MovieDetailsOverlay] Failed to reset scrollContainerRef:", e);
        }
      }

      // 🎯 NEW: Unsubscribe from real-time updates
      if (movie?.id) {
        try {
          const manager = getRealTimeManager();
          const movieType = movie.media_type || movie.type || 'movie';
          manager.unsubscribe(movie.id, movieType);
          logReset("realTimeManager.unsubscribe");
        } catch (e) {
          console.warn("[MovieDetailsOverlay] Failed to unsubscribe from real-time updates:", e);
        }
      }

      // Cleanup real-time manager to prevent memory leaks
      try {
        const manager = getRealTimeManager();
        manager.cleanup();
        realTimeManager = null; // Reset the singleton
        logReset("realTimeManager.cleanup");
      } catch (e) {
        console.warn("[MovieDetailsOverlay] Failed to cleanup real-time manager:", e);
      }

      // 🆕 NEW: Enhanced memory cleanup
      try {
        // Clear cache if memory usage is high
        if (performance.memory) {
          const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          if (memoryMB > 600) {
            console.warn(`[MovieDetailsOverlay] High memory usage during cleanup: ${memoryMB.toFixed(2)}MB`);
            clearCache();
          }
        }
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
        
        // Clear any remaining references
        if (typeof window !== 'undefined') {
          // Clear any global references that might be holding onto data
          if (window.movieDetailsCache) {
            delete window.movieDetailsCache;
          }
        }
      } catch (e) {
        console.warn("[MovieDetailsOverlay] Failed to perform memory cleanup:", e);
      }

      // Diagnostics: Log cleanup completion
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("[MovieDetailsOverlay] Cleanup complete.");
      }
    };

    // Return cleanup function for React to execute on unmount
    return cleanup;
  }, [movie?.id, movie?.media_type, movie?.type]); // Include movie dependencies to ensure proper cleanup on movie change

  // 🚀 Ultra-enhanced scroll lock with advanced state management, performance optimizations, and accessibility features
  useEffect(() => {
    // Store original body styles for precise restoration
    const originalStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight
    };

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Simple and reliable approach: just hide overflow
    document.body.style.overflow = 'hidden';
    
    // Prevent layout shift by compensating for hidden scrollbar
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Enhanced cleanup with comprehensive state restoration
    return () => {
      // Restore all original styles
      Object.entries(originalStyles).forEach(([property, value]) => {
        if (document.body.style[property] !== undefined) {
          document.body.style[property] = value;
        }
      });
    };
  }, []); // Empty dependency array ensures this runs only on mount/unmount

  // 🚀 Enhanced trailer handlers with accessibility, analytics, and robust state management
  const handleTrailerClick = useCallback(() => {
    setIsTrailerLoading(true);
    setShowTrailer(true);

    // Accessibility: Move focus to trailer player after opening
    setTimeout(() => {
      if (playerRef.current && typeof playerRef.current.focus === "function") {
        playerRef.current.focus();
      }
    }, 350);

    // Analytics: Log trailer open event
    if (window.gtag) {
      window.gtag('event', 'trailer_open', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }
  }, [movie, playerRef]);

  const handleCloseTrailer = useCallback((e) => {
    console.log('handleCloseTrailer called', { showTrailer }); // Debug log
    
    // Prevent event bubbling to avoid closing the main overlay
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setShowTrailer(false);

    // Pause and reset trailer video if possible
    if (playerRef.current) {
      if (typeof playerRef.current.pauseVideo === "function") {
        playerRef.current.pauseVideo();
      }
      // Optionally reset to start
      if (typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(0);
      }
    }

    // Accessibility: Return focus to trailer button
    setTimeout(() => {
      const trailerBtn = document.querySelector('[data-trailer-button]');
      if (trailerBtn) trailerBtn.focus();
    }, 200);

    // Analytics: Log trailer close event
    if (window.gtag) {
      window.gtag('event', 'trailer_close', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }
  }, [movie, playerRef]);

  // Keyboard event handler for trailer modal
  useEffect(() => {
    if (!showTrailer) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseTrailer(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTrailer, handleCloseTrailer]);

  // Streaming handlers
  const handleStreamingClick = useCallback(() => {
    if (!movie) return;
    
    // Check if episode selection is needed for TV shows
    if (needsEpisodeSelection(movie)) {
      setShowEpisodeSelector(true);
      return;
    }
    
    // Directly open streaming player with default service
    const url = getStreamingUrl(movie, currentService);
    if (url) {
      setStreamingUrl(url);
      setShowStreamingPlayer(true);
      
      // Analytics: Log streaming open event
      if (window.gtag) {
        window.gtag('event', 'streaming_open', {
          event_category: 'MovieDetails',
          event_label: movie?.title || movie?.name || movie?.id,
          value: movie?.id,
        });
      }
    }
  }, [movie, currentService]);

  const handleCloseStreaming = useCallback(() => {
    setShowStreamingPlayer(false);
    setStreamingUrl(null);
    
    // Analytics: Log streaming close event
    if (window.gtag && movie) {
      window.gtag('event', 'streaming_close', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }
  }, [movie]);

  const handleStreamingError = useCallback((error) => {
    console.error('Streaming error:', error);
    setShowStreamingPlayer(false);
    setStreamingUrl(null);
    
    // Analytics: Log streaming error event
    if (window.gtag && movie) {
      window.gtag('event', 'streaming_error', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
        error_message: error,
      });
    }
  }, [movie]);

  const handleEpisodeSelect = useCallback((season, episode, episodeData = null) => {
    if (!movie) return;
    
    console.log('handleEpisodeSelect called with:', { season, episode, episodeData });
    
    // Update the movie object with season and episode information
    const tvShow = {
      ...movie,
      season,
      episode
    };
    
    console.log('Setting movieDetails to:', tvShow);
    
    // Store the TV show with episode info
    setMovieDetails(tvShow);
    
    // If episodeData is provided, use it for streaming service selection
    if (episodeData) {
      // Create content object for streaming service toggler
      const content = {
        id: episodeData.showId,
        type: 'tv',
        season: episodeData.season,
        episode: episodeData.episode
      };
      
      // Get streaming URL with current service
      const url = getStreamingUrl(content, currentService);
      if (url) {
        setStreamingUrl(url);
        setShowStreamingPlayer(true);
        
        // Analytics: Log episode selection event
        if (window.gtag) {
          window.gtag('event', 'episode_selected', {
            event_category: 'MovieDetails',
            event_label: movie?.title || movie?.name || movie?.id,
            value: movie?.id,
            season,
            episode,
          });
        }
      }
    } else {
      // Fallback to original logic
      const url = getStreamingUrl(tvShow, currentService);
      if (url) {
        setStreamingUrl(url);
        setShowStreamingPlayer(true);
        
        // Analytics: Log episode selection event
        if (window.gtag) {
          window.gtag('event', 'episode_selected', {
            event_category: 'MovieDetails',
            event_label: movie?.title || movie?.name || movie?.id,
            value: movie?.id,
            season,
            episode,
          });
        }
      }
    }
  }, [movie, currentService]);

  const handleCloseEpisodeSelector = useCallback(() => {
    setShowEpisodeSelector(false);
  }, []);

  const handleServiceChange = useCallback((selectedService) => {
    setCurrentService(selectedService.key);
    setStreamingUrl(selectedService.url);
    
    // Analytics: Log streaming service change event
    if (window.gtag && movie) {
      window.gtag('event', 'streaming_service_changed', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
        streaming_service: selectedService.name,
      });
    }
  }, [movie]);

  // 🚀 Enhanced: Robust, analytics, accessibility, and smooth UX for similar movie click
  const handleSimilarMovieClick = useCallback((similarMovie, options = {}) => {
    // Validate movie data before proceeding
    if (!similarMovie || !similarMovie.id) {
      // Enhanced: User feedback (optional toast/snackbar)
      if (window?.showToast) {
        window.showToast('Invalid similar movie data provided', { type: 'error' });
      }
      // Dev warning
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn('[MovieDetailsOverlay] Invalid similar movie data:', similarMovie);
      }
      return;
    }

    // Enhanced: Track click event for analytics
    if (window.gtag) {
      window.gtag('event', 'similar_movie_click', {
        event_category: 'MovieDetails',
        event_label: similarMovie.title || similarMovie.name || similarMovie.id,
        value: similarMovie.id,
        from_movie_id: movie?.id,
        from_movie_title: movie?.title || movie?.name,
      });
    }

    // Prepare movie data with comprehensive fallbacks and normalization
    const getYear = (m) => {
      if (m.year) return m.year;
      if (m.release_date) return new Date(m.release_date).getFullYear();
      if (m.first_air_date) return new Date(m.first_air_date).getFullYear();
      return 'N/A';
    };

    const normalizeGenres = (m) => {
      if (Array.isArray(m.genres)) return m.genres;
      if (Array.isArray(m.genre_ids)) return m.genre_ids;
      return [];
    };

    const movieData = {
      id: similarMovie.id,
      title: similarMovie.title || similarMovie.name || 'Untitled',
      type: similarMovie.media_type || similarMovie.type || 'movie',
      poster_path: similarMovie.poster_path || similarMovie.poster || null,
      backdrop_path: similarMovie.backdrop_path || similarMovie.backdrop || null,
      overview: similarMovie.overview || '',
      year: getYear(similarMovie),
      rating: typeof similarMovie.vote_average === "number"
        ? similarMovie.vote_average
        : (typeof similarMovie.rating === "number" ? similarMovie.rating : 0),
      genres: normalizeGenres(similarMovie),
      release_date: similarMovie.release_date || similarMovie.first_air_date || null,
      // Enhanced: Add extra fields for richer context if available
      popularity: similarMovie.popularity,
      original_language: similarMovie.original_language,
      vote_count: similarMovie.vote_count,
      // Optionally pass through all original fields for future-proofing
      ...options.extraFields && typeof options.extraFields === "object" ? options.extraFields : {},
    };

    // Enhanced: Prevent default scroll behavior for smooth overlay transition
    // Removed scroll to top to prevent jarring user experience

    // Enhanced: Accessibility - move focus to overlay or main heading
    setTimeout(() => {
      const overlayHeading = document.getElementById('movie-details-overlay-heading');
      if (overlayHeading && typeof overlayHeading.focus === "function") {
        overlayHeading.focus();
      }
    }, 350);

    // Call onMovieSelect with prepared data
    if (onMovieSelect) {
      onMovieSelect(movieData);
    }
  }, [onMovieSelect, movie]);

  const [optimisticWatchlist, setOptimisticWatchlist] = useState(null); // null = not in optimistic mode
  const [watchlistError, setWatchlistError] = useState(null);
  
  // Like functionality state
  const [isLiked, setIsLiked] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [likeFeedback, setLikeFeedback] = useState(null);

  // Compute current optimistic state
  const isOptimisticallyInWatchlist =
    optimisticWatchlist !== null ? optimisticWatchlist : isInWatchlist(movie.id);

  // Optimistic UI for watchlist
  const handleWatchlistClick = (e) => {
    e.stopPropagation();
    // Save previous state for rollback
    const prev = isInWatchlist(movie.id);
    if (isOptimisticallyInWatchlist) {
      setOptimisticWatchlist(false);
      try {
        removeFromWatchlist(movie.id);
      } catch (err) {
        setOptimisticWatchlist(prev);
        setWatchlistError('Failed to update watchlist.');
        setTimeout(() => setWatchlistError(null), 2000);
      }
    } else {
      setOptimisticWatchlist(true);
      try {
        const movieData = {
          id: movie.id,
          title: movie.title || movie.name,
          type: movie.type || movie.media_type || 'movie',
          poster_path: movie.poster_path || movie.poster,
          backdrop_path: movie.backdrop_path || movie.backdrop,
          overview: movie.overview,
          year: movie.year || movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || 'N/A',
          rating: movie.rating || movie.vote_average || 0,
          genres: movie.genres || movie.genre_ids || [],
          runtime: movie.runtime,
          release_date: movie.release_date || movie.first_air_date,
          addedAt: new Date().toISOString()
        };
        addToWatchlist(movieData);
      } catch (err) {
        setOptimisticWatchlist(prev);
        setWatchlistError('Failed to update watchlist.');
        setTimeout(() => setWatchlistError(null), 2000);
      }
    }
  };

  // Enhanced like handler with mobile feedback
  const handleLikeClick = useCallback((e) => {
    e.stopPropagation();
    
    // Toggle like state
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    
    // Trigger animation
    setLikeAnimation(true);
    
    // Set feedback message
    setLikeFeedback(newLikeState ? 'Liked!' : 'Removed from likes');
    
    // Enhanced haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      // Different vibration patterns for like vs unlike
      if (newLikeState) {
        // Like: short double vibration
        navigator.vibrate([30, 50, 30]);
      } else {
        // Unlike: single vibration
        navigator.vibrate([50]);
      }
    }
    
    // Optional: Play subtle sound effect for desktop users
    if (!isMobile && typeof window !== 'undefined') {
      try {
        // Create a subtle audio feedback (optional)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(newLikeState ? 800 : 600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        
        // Cleanup audio context after use
        setTimeout(() => {
          try {
            audioContext.close();
          } catch (error) {
            console.debug('Audio context cleanup failed:', error);
          }
        }, 200);
      } catch (error) {
        // Silently fail if audio context is not available
        console.debug('Audio feedback not available:', error);
      }
    }
    
    // Analytics tracking
    if (window.gtag) {
      window.gtag('event', newLikeState ? 'like_movie' : 'unlike_movie', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }
    
    // Clear animation after delay with proper cleanup
    const animationTimeout = setTimeout(() => {
      setLikeAnimation(false);
    }, 600);
    
    // Clear feedback message after delay with proper cleanup
    const feedbackTimeout = setTimeout(() => {
      setLikeFeedback(null);
    }, 2000);
    
    // Here you would typically make an API call to save the like state
    // For now, we'll just log it
    console.log(`${newLikeState ? 'Liked' : 'Unliked'} movie:`, movie?.title || movie?.name);
  }, [isLiked, movie, isMobile]);

  // Reset optimistic state if movie changes
  useEffect(() => {
    setOptimisticWatchlist(null);
    setWatchlistError(null);
    setIsLiked(false);
    setLikeAnimation(false);
    setLikeFeedback(null);
  }, [movie.id]);

  const formatRuntime = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatRating = (rating) => {
    if (typeof rating === 'number') {
      return rating.toFixed(1);
    }
    if (typeof rating === 'string') {
      const numRating = parseFloat(rating);
      return !isNaN(numRating) ? numRating.toFixed(1) : 'N/A';
    }
    return 'N/A';
  };

  const [basicLoading, setBasicLoading] = useState(true);

  // 🚀 Enhanced: Robust fetch with diagnostics, analytics, and advanced error handling
  const fetchBasicInfo = useCallback(async () => {
    if (!movie || !movie.id) {
      setError('Invalid movie data.');
      setMovieDetails(null);
      setBasicLoading(false);
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn('[MovieDetailsOverlay] fetchBasicInfo: Invalid movie object:', movie);
      }
      return;
    }
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';
    let fetchStart;
    try {
      setBasicLoading(true);
      setError(null);

      // Performance tracking
      fetchStart = performance.now();

      // Analytics: Track fetch start
      if (window.gtag) {
        window.gtag('event', 'fetch_basic_info_start', {
          event_category: 'MovieDetails',
          event_label: movie.title || movie.name || movie.id,
          value: movie.id,
        });
      }

      const details = await getMovieDetails(movie.id, movieType);

      // Performance tracking
      const fetchDuration = performance.now() - fetchStart;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug(`[MovieDetailsOverlay] fetchBasicInfo: Fetched in ${fetchDuration.toFixed(2)}ms`);
      }
      if (fetchDuration > 2000) {
        // eslint-disable-next-line no-console
        console.warn(`[MovieDetailsOverlay] fetchBasicInfo: Slow fetch (${fetchDuration.toFixed(2)}ms) for movie ID ${movie.id}`);
      }

      // Analytics: Track fetch duration
      if (window.gtag) {
        window.gtag('event', 'fetch_basic_info_complete', {
          event_category: 'MovieDetails',
          event_label: movie.title || movie.name || movie.id,
          value: movie.id,
          fetch_duration_ms: Math.round(fetchDuration),
        });
      }

      if (!details) {
        setError('Movie not found.');
        setMovieDetails(null);
        // Analytics: Track not found
        if (window.gtag) {
          window.gtag('event', 'fetch_basic_info_not_found', {
            event_category: 'MovieDetails',
            event_label: movie.title || movie.name || movie.id,
            value: movie.id,
          });
        }
        return;
      }
      setMovieDetails(details);
    } catch (err) {
      setError('Failed to fetch movie details. Please try again.');
      setMovieDetails(null);

      // Analytics: Track error
      if (window.gtag) {
        window.gtag('event', 'fetch_basic_info_error', {
          event_category: 'MovieDetails',
          event_label: movie?.title || movie?.name || movie?.id,
          value: movie?.id,
          error_message: err?.message || String(err),
        });
      }

      // Diagnostics
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error('[MovieDetailsOverlay] fetchBasicInfo error:', err);
      }
    } finally {
      setBasicLoading(false);
    }
  }, [movie]);

  const fetchExtraInfo = useCallback(async () => {
    if (!movie) return;
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';
    
    setIsCastLoading(true);
    setIsSimilarLoading(true);
    setShowAllCast(false);
    setSimilarMovies([]);
    setSimilarMoviesPage(1);
    setHasMoreSimilar(true);
    
    // Reset seasons and episodes state
    setSeasons([]);
    setCurrentSeason(null);
    setEpisodes([]);
    
    try {
      const promises = [
        getMovieCredits(movie.id, movieType),
        getMovieVideos(movie.id, movieType),
        getSimilarMovies(movie.id, movieType, 1)
      ];
      
      // Add seasons fetching for TV shows
      if (movieType === 'tv') {
        promises.push(getTVSeasons(movie.id));
      }
      
      const results = await Promise.all(promises);
      const [movieCredits, movieVideos, similar, ...rest] = results;
      
      setCredits(movieCredits);
      setVideos(movieVideos);
      setSimilarMovies(similar?.results || []);
      setHasMoreSimilar(similar?.page < similar?.total_pages);
      
      // Handle seasons for TV shows
      if (movieType === 'tv' && rest[0]) {
        const seasonsData = rest[0];
        setSeasons(seasonsData);
        
        // Set the latest season as current
        if (seasonsData.length > 0) {
          const latestSeason = seasonsData[seasonsData.length - 1];
          setCurrentSeason(latestSeason);
          // Fetch episodes for the latest season
          fetchSeasonEpisodes(latestSeason.season_number);
        }
      }
    } catch (err) {
      // Show partial data, but log error
      console.error('Failed to fetch extra info:', err);
    } finally {
      setIsCastLoading(false);
      setIsSimilarLoading(false);
    }
  }, [movie]);

  const fetchSeasonEpisodes = useCallback(async (seasonNumber) => {
    if (!movie || !seasonNumber) return;
    
    const movieType = movie.media_type || movie.type || 'movie';
    if (movieType !== 'tv') return;
    
    setIsEpisodesLoading(true);
    try {
      const seasonData = await getTVSeason(movie.id, seasonNumber);
      setEpisodes(seasonData.episodes || []);
    } catch (err) {
      console.error('Failed to fetch season episodes:', err);
      setEpisodes([]);
    } finally {
      setIsEpisodesLoading(false);
    }
  }, [movie]);

  const handleSeasonChange = useCallback((season) => {
    setCurrentSeason(season);
    fetchSeasonEpisodes(season.season_number);
  }, [fetchSeasonEpisodes]);

  const handleEpisodeClick = useCallback((episode) => {
    if (!movie) return;
    
    console.log('handleEpisodeClick called with episode:', episode);
    
    // Update the movie object with season and episode information
    const tvShow = {
      ...movie,
      season: episode.season_number,
      episode: episode.episode_number
    };
    
    console.log('Setting movieDetails to:', tvShow);
    
    // Store the TV show with episode info
    setMovieDetails(tvShow);
    
    const streamingUrl = getStreamingUrl({
      id: movie.id,
      type: 'tv',
      season: episode.season_number,
      episode: episode.episode_number
    });
    
    if (streamingUrl) {
      setStreamingUrl(streamingUrl);
      setShowStreamingPlayer(true);
    } else {
      // Fallback to episode selector if streaming URL is not available
      setShowEpisodeSelector(true);
    }
  }, [movie]);

    // Add handleRetryCast for cast-only retry
    const handleRetryCast = useCallback(() => {
      fetchExtraInfo();
    }, [fetchExtraInfo]);

  // Debug: Monitor movieDetails changes
  useEffect(() => {
    console.log('MovieDetailsOverlay: movieDetails changed:', movieDetails);
  }, [movieDetails]);

  // 🚀 Enhanced: Robust mount/movie-change effect with race condition prevention, abort support, and analytics
  useEffect(() => {
    let isActive = true; // Prevent state updates if unmounted or movie changes rapidly
    let abortController = new AbortController();

    // Helper: Reset all relevant states for a clean slate
    const resetStates = () => {
      setMovieDetails(null);
      setCredits(null);
      setVideos(null);
      setSimilarMovies([]);
      setBasicLoading(true);
      setIsCastLoading(true);
      setIsSimilarLoading(true);
      setError(null);
      // Reset seasons and episodes state
      setSeasons([]);
      setCurrentSeason(null);
      setEpisodes([]);
      setIsSeasonsLoading(false);
      setIsEpisodesLoading(false);
    };

    resetStates();

    // Analytics: Track overlay open/fetch event
    if (window.gtag && movie?.id) {
      window.gtag('event', 'movie_details_overlay_open', {
        event_category: 'MovieDetails',
        event_label: movie?.title || movie?.name || movie?.id,
        value: movie?.id,
      });
    }

    // Enhanced: Fetch with abort and race condition protection
    const doFetch = async () => {
      try {
        await fetchBasicInfo({ signal: abortController.signal });
        if (!isActive) return;
        await fetchExtraInfo({ signal: abortController.signal });
      } catch (err) {
        if (abortController.signal.aborted) {
          // Optionally log abort
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.debug("[MovieDetailsOverlay] Fetch aborted due to unmount/movie change.");
          }
        } else {
          // Error already handled in fetchBasicInfo/fetchExtraInfo
        }
      }
    };

    doFetch();

    // Cleanup: abort fetches and prevent state updates
    return () => {
      isActive = false;
      abortController.abort();
    };
    // eslint-disable-next-line
  }, [movie?.id, movie?.media_type, movie?.type]);
  
  // 🔄 NEW: Background refresh for stale data
  useEffect(() => {
    if (!movie?.id || !movieDetails) return;
    
    const movieType = movie.media_type || movie.type || 'movie';
    const backgroundRefreshTimer = setTimeout(() => {
      console.log(`🔄 Background refresh for ${movieType} ID: ${movie.id}`);
      fetchMovieData(0);
    }, BACKGROUND_REFRESH_INTERVAL);
    
    return () => {
      if (backgroundRefreshTimer) {
        clearTimeout(backgroundRefreshTimer);
      }
    };
  }, [movie?.id, movie?.media_type, movie?.type, movieDetails, fetchMovieData]);
  
  // Mobile drag functionality removed
  
  // Mobile drag functionality removed

  // Mobile drag handlers removed


  




  // Memoize formatted rating
  const formattedRating = React.useMemo(() => {
    if (!movieDetails?.vote_average) return 'N/A';
    return typeof movieDetails.vote_average === 'number'
      ? movieDetails.vote_average.toFixed(1)
      : parseFloat(movieDetails.vote_average).toFixed(1);
  }, [movieDetails]);

  // Memoize formatted release date
  const formattedReleaseDate = React.useMemo(() => {
    if (!movieDetails?.release_date) return 'N/A';
    const date = new Date(movieDetails.release_date);
    return isNaN(date) ? 'N/A' : date.toLocaleDateString();
  }, [movieDetails]);

  // Memoize formatted runtime
  const formattedRuntime = React.useMemo(() => {
    if (!movieDetails?.runtime) return 'N/A';
    const hours = Math.floor(movieDetails.runtime / 60);
    const minutes = movieDetails.runtime % 60;
    return `${hours}h ${minutes}m`;
  }, [movieDetails]);

  // Memoize formatted budget
  const formattedBudget = React.useMemo(() => {
    if (!movieDetails?.budget) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(movieDetails.budget);
  }, [movieDetails]);

  // Memoize formatted revenue
  const formattedRevenue = React.useMemo(() => {
    if (!movieDetails?.revenue) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(movieDetails.revenue);
  }, [movieDetails]);

  // 🚀 Enhanced Portal Management for MovieDetailsOverlay
  // - Robust: Handles SSR, multiple overlays, and accessibility
  // - Diagnostics: Logs portal creation/removal in development
  // - Prevents duplicate containers and memory leaks

  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      // SSR safety: don't attempt DOM operations
      setPortalContainer(null);
      return;
    }

    // Unique ID for this overlay instance (supports stacking if needed)
    const PORTAL_ID = 'movie-details-portal';
    let container = document.getElementById(PORTAL_ID);
    let isNewContainer = false;

    if (!container) {
      container = document.createElement('div');
      container.id = PORTAL_ID;
      // Accessibility: Mark as modal root
      container.setAttribute('role', 'dialog');
      container.setAttribute('aria-modal', 'true');
      container.setAttribute('tabindex', '-1');
      // Style: Ensure overlay is always on top and covers viewport
      container.style.position = 'fixed';
      container.style.inset = '0';
      container.style.zIndex = '2147483647'; // Max z-index for overlays
      container.style.pointerEvents = 'none'; // Let overlay content handle events
      document.body.appendChild(container);
      isNewContainer = true;

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug('[MovieDetailsOverlay] Portal container created');
      }
    } else {
      // If already exists, ensure correct attributes/styles
      container.setAttribute('role', 'dialog');
      container.setAttribute('aria-modal', 'true');
      container.setAttribute('tabindex', '-1');
      container.style.position = 'fixed';
      container.style.inset = '0';
      container.style.zIndex = '2147483647';
      container.style.pointerEvents = 'none';
    }

    setPortalContainer(container);

    // Cleanup: Remove portal only if it was created by this instance
    return () => {
      // Only remove if this instance created the container
      if (isNewContainer && container && container.parentNode) {
        try {
          container.parentNode.removeChild(container);
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.debug('[MovieDetailsOverlay] Portal container removed');
          }
        } catch (error) {
          console.warn('[MovieDetailsOverlay] Failed to remove portal container:', error);
        }
      }
      // Clear portal container reference to prevent memory leaks
      setPortalContainer(null);
    };
  }, []);

  // Don't render anything if portal container is not ready or in SSR
  if (typeof window === "undefined" || !portalContainer) {
    return null;
  }

  const overlayContent = (
    <AnimatePresence>
      {/* Overlay background - parallax removed */}
      <motion.div
        className="fixed inset-0 bg-black/85 flex items-center justify-center z-[999999999] p-2 sm:p-4 contain-paint transition-none sm:mt-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: 0.3, 
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        onClick={handleClickOutside}
        tabIndex={-1}
        style={{ zIndex: 999999999 }}
      >
        {/* Main content - parallax removed */}
        <motion.div
          ref={contentRef}
          className="relative w-full max-w-6xl h-auto max-h-[calc(100vh-1rem)] z-[1000000000] sm:max-h-[95vh] bg-gradient-to-br from-[#1a1d24] to-[#121417] rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto overflow-y-auto mt-2 sm:mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ 
            duration: 0.3, 
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          style={{ 
            zIndex: 1000000000
          }}
        >
                      {/* Mobile drag functionality removed */}
          {basicLoading ? (
            <PageLoader />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-red-400 text-lg font-semibold">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : movieDetails ? (
            <div ref={scrollContainerRef} className="h-full overflow-y-auto hide-scrollbar">
              <div className="relative h-[75vh] sm:h-[80vh]">
                {movieDetails.backdrop && (
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div 
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ 
                        duration: 0.4, 
                        ease: [0.25, 0.46, 0.45, 0.94] 
                      }}
                    >
                      {/* Loading placeholder with smooth transition */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      />
                      
                      {/* Backdrop image - parallax removed */}
                      <motion.img
                        src={movieDetails.backdrop}
                        alt={movieDetails.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        onError={(e) => {
                          console.warn('Failed to load backdrop image:', e.target.src);
                        }}
                      />
                    </motion.div>
                    
                    {/* Gradient overlay - parallax removed */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-8 relative"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                                          {movieDetails.image && (
                        <motion.div 
                          className="w-32 h-48 sm:w-56 sm:h-84 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl group mx-auto sm:mx-0"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          {/* Loading placeholder with smooth transition */}
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          />
                          
                          {/* Movie poster - parallax removed */}
                          <motion.img
                            src={movieDetails.image}
                            alt={movieDetails.title}
                            className="w-full h-full object-cover"
                            loading="eager"
                            decoding="async"
                            fetchPriority="high"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            onError={(e) => {
                              console.warn('Failed to load movie poster:', e.target.src);
                            }}
                          />
                          
                          {/* Hover overlay - simplified */}
                          <div 
                            className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          />
                        </motion.div>
                      )}
                    <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
                                              <motion.div 
                          className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-7"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.3 }}
                        >
                                                  {movieDetails.logo ? (
                            <motion.div 
                              className="relative"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: 0.4 }}
                            >
                              {/* Movie logo - parallax removed */}
                              <motion.img
                                src={movieDetails.logo}
                                alt={movieDetails.title}
                                className="w-[200px] sm:w-[250px] max-w-full h-auto object-contain"
                                loading="eager"
                                decoding="async"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                onError={(e) => {
                                  if (e.target) {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) {
                                      e.target.nextSibling.style.display = 'block';
                                    }
                                  }
                                }}
                              />
                              
                              {/* Fallback title (hidden when logo loads successfully) */}
                              <h2 
                                className="text-2xl sm:text-4xl font-bold text-white hidden"
                              >
                                {movieDetails.title}
                              </h2>
                            </motion.div>
                          ) : (
                            <motion.h2 
                              className="text-2xl sm:text-4xl font-bold text-white"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: 0.4 }}
                            >
                              {movieDetails.title}
                            </motion.h2>
                          )}
                      </motion.div>
                      

                      <div className="flex flex-row items-center justify-center sm:justify-start gap-6 sm:gap-3 text-white/60 text-sm mb-4 sm:mb-6">
                        {movieDetails.type === 'movie' && movieDetails.release_date && (
                          <>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{new Date(movieDetails.release_date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</span>
                            </div>
                          </>
                        )}
                        <span className="hidden sm:inline">•</span>
                        {movieDetails.type === 'movie' && (
                          <>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {movieDetails.type === 'movie' 
                                  ? (movieDetails.runtime ? formatRuntime(movieDetails.runtime) : 'N/A')
                                  : (movieDetails.number_of_seasons 
                                      ? `${movieDetails.number_of_seasons} Season${movieDetails.number_of_seasons !== 1 ? 's' : ''}`
                                      : 'N/A')
                                }
                              </span>
                            </div>
                          </>
                        )}
                        {movieDetails.type === 'tv' && (
                          <>
                            {movieDetails.first_air_date && (
                              <>
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{new Date(movieDetails.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <span className="hidden sm:inline">•</span>
                              </>
                            )}
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>{movieDetails.number_of_seasons ? `${movieDetails.number_of_seasons} Season${movieDetails.number_of_seasons !== 1 ? 's' : ''}` : 'N/A'}</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="capitalize">{movieDetails.status}</span>
                            </div>
                          </>
                        )}
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                          </svg>
                          {formatRating(movieDetails.rating)}
                        </span>
                      </div>

                      {movieDetails.genres && (
                        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2 mb-3 sm:mb-6">
                          {movieDetails.genres.map((genre, idx) => {
                            let key = '';
                            if (genre.id && typeof genre.id !== 'undefined' && genre.id !== null && genre.id !== '') {
                              key = `genre-${String(genre.id)}-${idx}`;
                            } else if (genre.name && typeof genre.name === 'string' && genre.name.trim() !== '') {
                              key = `genre-name-${genre.name.replace(/\s+/g, '_')}-${idx}`;
                            } else {
                              key = `genre-fallback-${idx}`;
                            }
                            return (
                              <span 
                                key={key}
                                onClick={() => onGenreClick && onGenreClick(genre)}
                                className="px-2.5 sm:px-3 py-0.5 sm:py-1 text-white/50 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 rounded-full text-white/60 text-xs sm:text-sm transform transition-all duration-300 hover:bg-white/10 hover:cursor-pointer will-change-transform"
                              >
                                {genre.name}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Action Buttons and Info Section */}
                      <motion.div 
                        className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 my-4 sm:my-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.5 }}
                      >
                      {/* Action Buttons */}
                        <motion.div 
                          className="flex flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4 w-full"
                          variants={staggerItemVariants}
                        >
                        {/* Watch Now Button - Only show if streaming is available and it's a movie */}
                        {isStreamingAvailable(movie) && (movie.media_type || movie.type || 'movie') === 'movie' && (
                          <motion.button
                            onClick={handleStreamingClick}
                            className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 font-medium text-black bg-white flex-1 sm:flex-none w-full sm:w-auto justify-center min-w-0 transform-gpu will-change-transform"
                            variants={buttonVariants}
                            initial="initial"
                            whileHover="hover"
                            whileTap="tap"
                          >
                            {/* Animated background effect */}
                            <motion.div 
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"
                              initial={{ x: '-100%' }}
                              whileHover={{ x: '100%' }}
                              transition={{ duration: 0.6, ease: "easeInOut" }}
                            />
                            
                            {/* Button content */}
                            <div className="relative flex items-center gap-2 min-w-0">
                              <motion.svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-5 w-5 flex-shrink-0 text-black" 
                                viewBox="0 0 24 24" 
                                fill="currentColor"
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              >
                                <path d="M8 5v14l11-7z"/>
                              </motion.svg>
                              <span className="truncate whitespace-nowrap">Watch Now</span>
                            </div>
                          </motion.button>
                        )}

                        <motion.button 
                          data-trailer-button
                          onClick={handleTrailerClick}
                          className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 font-medium text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10 flex-1 sm:flex-none w-full sm:w-auto justify-center min-w-0 transform-gpu will-change-transform"
                          variants={buttonVariants}
                          initial="initial"
                          whileHover="hover"
                          whileTap="tap"
                        >
                          {/* Animated background effect */}
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                          />
                          
                          {/* Button content */}
                          <div className="relative flex items-center gap-2 min-w-0">
                            <motion.svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5 flex-shrink-0" 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                              <path d="M8 5v14l11-7z"/>
                            </motion.svg>
                            <span className="truncate whitespace-nowrap">Watch Trailer</span>
                          </div>
                        </motion.button>

                        <motion.button 
                          onClick={handleWatchlistClick}
                          className={`group relative px-4 sm:px-6 py-3 rounded-full flex items-center gap-2 font-medium overflow-hidden w-full sm:w-auto justify-center min-w-0 hidden sm:flex transform-gpu will-change-transform ${
                            isOptimisticallyInWatchlist
                              ? 'text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10' 
                              : 'text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10'
                          }`}
                          variants={buttonVariants}
                          initial="initial"
                          whileHover="hover"
                          whileTap="tap"
                        >
                          {/* Animated background effect */}
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                          />
                          
                          {/* Button content */}
                          <div className="relative flex items-center gap-2 min-w-0">
                            <motion.svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5 flex-shrink-0" 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                              whileHover={{ 
                                scale: 1.1,
                                rotate: isOptimisticallyInWatchlist ? 12 : 90,
                                transition: { type: 'spring', stiffness: 400, damping: 25 }
                              }}
                            >
                              {isOptimisticallyInWatchlist ? (
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                              ) : (
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                              )}
                            </motion.svg>
                            <span className="truncate whitespace-nowrap">{isOptimisticallyInWatchlist ? 'Remove from List' : 'Add to List'}</span>
                          </div>
                        </motion.button>
                        </motion.div>

                        {/* Desktop Info Section - Rightmost */}
                        <motion.div 
                          className="hidden lg:block text-white/60 text-sm text-right"
                          variants={staggerItemVariants}
                        >
                          {/* Top Cast */}
                          {movieDetails.cast && movieDetails.cast.length > 0 && (
                            <div className="mb-2">
                              <span>
                                <span className="font-medium">Cast: </span>
                                {movieDetails.cast.slice(0, 3).map((person, idx) => (
                                  <span key={person.id || idx}>
                                    {person.name}
                                    {idx < Math.min(2, movieDetails.cast.length - 1) ? ', ' : ''}
                                  </span>
                                ))}
                                {movieDetails.cast.length > 3 && '...'}
                              </span>
                            </div>
                          )}
                          
                          {/* Genres */}
                          {movieDetails.genres && movieDetails.genres.length > 0 && (
                            <div>
                              <span>
                                <span className="font-medium">Genres: </span>
                                {movieDetails.genres.slice(0, 3).map((genre, idx) => (
                                  <span 
                                    key={genre.id || idx}
                                    onClick={() => onGenreClick && onGenreClick(genre)}
                                    className="hover:text-white hover:cursor-pointer transition-colors duration-200"
                                  >
                                    {genre.name}
                                    {idx < Math.min(2, movieDetails.genres.length - 1) ? ', ' : ''}
                                  </span>
                                ))}
                                {movieDetails.genres.length > 3 && '...'}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                      
                      {/* Desktop Overview Section */}
                      {movieDetails.overview && movieDetails.overview.trim() !== "" && (
                        <div className="hidden lg:block mt-6">
                          <div className="text-white/80 text-sm leading-relaxed">
                            <p className="text-white/90 leading-relaxed">
                              {movieDetails.overview}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Mobile Minimalist Info Section */}
                      <motion.div 
                        className="lg:hidden mt-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <motion.div 
                          className="text-white/60 text-sm space-y-3"
                          variants={staggerContainerVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true, amount: 0.5 }}
                        >
                          {/* Overview */}
                          {movieDetails.overview && movieDetails.overview.trim() !== "" && (
                            <motion.div 
                              className="mb-3"
                              variants={staggerItemVariants}
                            >
                              <p
                                className="text-white/90 text-sm leading-relaxed pl-0 text-justify text-left"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textAlign: 'justify'
                                }}
                              >
                                {movieDetails.overview}
                              </p>
                            </motion.div>
                          )}
                          
                          {/* Top Cast */}
                          {movieDetails.cast && movieDetails.cast.length > 0 && (
                            <div className="mb-2">
                              <span className="truncate block">
                                <span className="font-medium">Cast: </span>
                                {movieDetails.cast.slice(0, 3).map((person, idx) => (
                                  <span key={person.id || idx}>
                                    {person.name}
                                    {idx < Math.min(2, movieDetails.cast.length - 1) ? ', ' : ''}
                                  </span>
                                ))}
                                {movieDetails.cast.length > 3 && '...'}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>

                                                                                         {/* Mobile Action Buttons - Above Overview */}
                                             <motion.div 
                                               className="flex sm:hidden items-center justify-center gap-8 mt-4"
                                               variants={staggerContainerVariants}
                                               initial="hidden"
                                               whileInView="visible"
                                               viewport={{ once: true, amount: 0.5 }}
                                             >
                                                   {/* Add to List Button */}
                          <button 
                            onClick={handleWatchlistClick}
                            className={`group relative w-12 h-12 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden flex items-center justify-center transform-gpu will-change-transform ${
                              isOptimisticallyInWatchlist 
                                ? 'bg-red-500/20 border-t-[1px] border-b-[1px] border-red-400/30 text-red-400' 
                                : 'bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 text-white/80 hover:bg-white/10'
                            }`}
                            title={isOptimisticallyInWatchlist ? 'Remove from List' : 'Add to List'}
                          >
                            {/* Animated background effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            
                            {/* Button content */}
                            <div className="relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                                {isOptimisticallyInWatchlist ? (
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                ) : (
                                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                )}
                              </svg>
                            </div>
                          </button>

                                                                               {/* Enhanced Like Button with Mobile Feedback */}
                                                                               <button 
                             onClick={handleLikeClick}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' || e.key === ' ') {
                                 e.preventDefault();
                                 handleLikeClick(e);
                               }
                             }}
                             className={`group relative w-12 h-12 rounded-full overflow-hidden backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:ring-offset-2 focus:ring-offset-black/50 transform-gpu will-change-transform ${
                               isLiked 
                                 ? 'bg-red-500/20 border-red-400/30 text-red-400' 
                                 : 'bg-[rgb(255,255,255,0.03)] border-white/30 text-white/80 hover:bg-white/10'
                             } ${likeAnimation ? 'animate-pulse' : ''}`}
                             title={isLiked ? 'Unlike' : 'Like'}
                             aria-label={isLiked ? 'Unlike this movie' : 'Like this movie'}
                             role="button"
                             tabIndex={0}
                           >
                             {/* Animated background effect */}
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                             
                             {/* Like animation overlay */}
                             {likeAnimation && (
                               <motion.div
                                 initial={{ scale: 0, opacity: 0 }}
                                 animate={{ scale: 1.5, opacity: 1 }}
                                 exit={{ scale: 2, opacity: 0 }}
                                 transition={{ duration: 0.6, ease: "easeOut" }}
                                 className="absolute inset-0 bg-red-500/20 rounded-full"
                               />
                             )}
                             
                             {/* Ripple effect for mobile feedback */}
                             {likeAnimation && (
                               <motion.div
                                 initial={{ scale: 0, opacity: 0.8 }}
                                 animate={{ scale: 2, opacity: 0 }}
                                 transition={{ duration: 0.8, ease: "easeOut" }}
                                 className="absolute inset-0 bg-red-400/30 rounded-full"
                               />
                             )}
                             
                             {/* Button content */}
                             <div className="relative">
                               <motion.svg 
                                 xmlns="http://www.w3.org/2000/svg" 
                                 className="h-5 w-5 transition-all duration-300 group-hover:scale-110" 
                                 fill={isLiked ? "currentColor" : "none"} 
                                 viewBox="0 0 24 24" 
                                 stroke="currentColor" 
                                 strokeWidth={1.5}
                                 animate={likeAnimation ? { 
                                   scale: [1, 1.3, 1],
                                   rotate: [0, -10, 10, 0]
                                 } : {}}
                                 transition={{ duration: 0.6, ease: "easeOut" }}
                               >
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M2 21h4V9H2v12zM22.42 10.21c-.36-.36-.86-.58-1.41-.58h-6.72l.95-4.57.02-.32c0-.41-.17-.8-.44-1.09L13.17 2 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.78 0 1.48-.45 1.82-1.13l2.01-4.03c.09-.18.17-.37.17-.57v-4.06c0-.55-.22-1.05-.58-1.41z"/>
                               </motion.svg>
                             </div>
                           </button>

                          {/* Mobile Like Feedback Toast */}
                          {likeFeedback && (
                            <motion.div
                              initial={{ opacity: 0, y: 20, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.9 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-md text-white text-sm px-4 py-2 rounded-full border border-white/20 shadow-lg z-50 whitespace-nowrap"
                            >
                              <div className="flex items-center gap-2">
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className="h-4 w-4 text-red-400" 
                                  fill="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                <span>{likeFeedback}</span>
                              </div>
                            </motion.div>
                          )}

                          {/* Share Button */}
                          <button 
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: movieDetails.title,
                                  text: `Check out ${movieDetails.title}!`,
                                  url: window.location.href
                                });
                              } else {
                                // Fallback: copy to clipboard
                                navigator.clipboard.writeText(window.location.href);
                                // You could add a toast notification here
                              }
                            }}
                            className="group relative w-12 h-12 rounded-full overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center transform-gpu will-change-transform"
                            title="Share"
                          >
                            {/* Animated background effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            
                            {/* Button content */}
                            <div className="relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                              </svg>
                            </div>
                          </button>

                           {/* Report Button */}
                           <button 
                             onClick={() => {
                               // Handle report functionality
                               console.log('Report clicked');
                               // You could add a modal or navigation to report page
                             }}
                             className="group relative w-12 h-12 rounded-full overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center transform-gpu will-change-transform"
                             title="Report"
                           >
                             {/* Animated background effect */}
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                             
                             {/* Button content */}
                             <div className="relative">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                               </svg>
                             </div>
                           </button>
                       </motion.div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="relative p-4 sm:p-8 bg-gradient-to-br from-black/60 via-black/30 to-primary/10 shadow-lg overflow-hidden transition-all duration-300">
                {/* Minimalist accent: top border line */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 -translate-x-1/2 top-0 w-1/3 h-0.5 bg-gradient-to-r from-primary/60 via-white/20 to-transparent rounded-full opacity-60"
                />
                {/* Modern subtle glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-8 -left-8 w-32 h-32 rounded-full bg-primary/20 blur-2xl opacity-30"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl opacity-20"
                />
                <div className="space-y-8 sm:space-y-12">
                  {/* Full Width Content */}
                  <div className="w-full space-y-8 sm:space-y-12">



                    {/* TV Episodes Section - Only for TV shows */}
                    {movieDetails.type === 'tv' && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="relative"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-primary/10 shadow-md mr-1">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md-7 text-primary/80" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                              </svg>
                            </span>
                            <span className="tracking-tight drop-shadow-sm">Episodes</span>
                          </h3>
                          
                          {/* Controls - Only show when seasons are loaded */}
                          {seasons.length > 0 && (
                            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                              {/* Season Selector - Left on mobile, right on desktop */}
                              <div className="flex items-center gap-2 order-2 sm:order-2">
                                <span className="text-white/60 text-sm">Season:</span>
                                <CustomDropdown
                                  options={seasons.map((season) => ({
                                    value: season.season_number,
                                    label: season.name || `Season ${season.season_number}`
                                  }))}
                                  value={currentSeason?.season_number || ''}
                                  onChange={(seasonNumber) => {
                                    const selectedSeason = seasons.find(s => s.season_number === seasonNumber);
                                    if (selectedSeason) {
                                      handleSeasonChange(selectedSeason);
                                    }
                                  }}
                                  placeholder="Select season"
                                />
                              </div>
                              
                              {/* View Toggle - Right on mobile, left on desktop */}
                              <div className="flex items-center gap-2 order-1 sm:order-1">
                                <button
                                  onClick={() => setEpisodesViewModeWithStorage('card')}
                                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 transform-gpu will-change-transform ${
                                    episodesViewMode === 'card'
                                      ? 'text-white border-b-2 border-white/30'
                                      : 'text-white/50 hover:text-white/70 border-b-2 border-transparent hover:border-white/15'
                                  }`}
                                  title="Card View"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setEpisodesViewModeWithStorage('list')}
                                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                    episodesViewMode === 'list'
                                      ? 'text-white border-b-2 border-white/30'
                                      : 'text-white/50 hover:text-white/70 border-b-2 border-transparent hover:border-white/15'
                                  }`}
                                  title="List View"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Episodes Content */}
                        {isSeasonsLoading || isEpisodesLoading ? (
                          episodesViewMode === 'card' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                              {[...Array(8)].map((_, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                  className="group relative bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] rounded-2xl overflow-hidden border border-white/[0.08] shadow-lg backdrop-blur-sm"
                                >
                                  <div className="aspect-square sm:aspect-video lg:aspect-video bg-gradient-to-br from-gray-800 to-gray-700 animate-pulse rounded-t-2xl"></div>
                                  <div className="p-4 lg:p-5 space-y-3">
                                    <div className="h-4 bg-white/10 rounded animate-pulse"></div>
                                    <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse"></div>
                                    <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse"></div>
                                    <div className="pt-3 border-t border-white/[0.08]">
                                      <div className="flex items-center justify-between">
                                        <div className="h-3 bg-white/10 rounded w-16 animate-pulse"></div>
                                        <div className="h-3 bg-white/10 rounded w-12 animate-pulse"></div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-0">
                              {[...Array(6)].map((_, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                  className={`group relative ${
                                    index < 5 ? 'border-b border-white/[0.08]' : ''
                                  }`}
                                >
                                                                     <div className="flex items-center gap-3 sm:gap-6 p-3 sm:p-6">
                                     {/* Episode Number Skeleton - Left of Thumbnail (Desktop Only) */}
                                     <div className="hidden md:flex flex-shrink-0 items-center justify-center w-10 h-10">
                                       <div className="w-6 h-6 bg-white/10 rounded animate-pulse"></div>
                                     </div>
                                     
                                     {/* Episode Thumbnail Skeleton */}
                                     <div className="relative w-32 h-20 sm:w-32 sm:h-20 md:w-40 md:h-24 overflow-hidden rounded-lg flex-shrink-0 bg-white/10 animate-pulse"></div>
                                     
                                     {/* Episode Info Skeleton */}
                                     <div className="flex-1 min-w-0 flex flex-col justify-between">
                                       <div className="space-y-3 sm:space-y-3">
                                         <div className="space-y-1 sm:space-y-2">
                                           {/* Episode Title Skeleton */}
                                           <div className="h-4 sm:h-5 bg-white/10 rounded animate-pulse" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
                                           
                                           {/* Episode Overview Skeleton - Hidden on mobile */}
                                           <div className="hidden sm:block space-y-1.5">
                                             <div className="h-3 bg-white/8 rounded animate-pulse" style={{ width: '100%' }}></div>
                                             <div className="h-3 bg-white/8 rounded animate-pulse" style={{ width: `${Math.random() * 20 + 80}%` }}></div>
                                           </div>
                                         </div>
                                         
                                         {/* Episode Details Skeleton */}
                                         <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-white/45">
                                           {/* Desktop: Separate date and runtime skeletons */}
                                           <div className="hidden sm:flex items-center gap-4">
                                             {/* Date skeleton */}
                                             <div className="flex items-center gap-1">
                                               <div className="w-4 h-4 bg-white/10 rounded animate-pulse"></div>
                                               <div className="w-16 h-3 bg-white/10 rounded animate-pulse"></div>
                                             </div>
                                             <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                                             {/* Runtime skeleton */}
                                             <div className="flex items-center gap-1">
                                               <div className="w-4 h-4 bg-white/10 rounded animate-pulse"></div>
                                               <div className="w-12 h-3 bg-white/10 rounded animate-pulse"></div>
                                             </div>
                                           </div>
                                           
                                           {/* Mobile: Combined skeleton */}
                                           <div className="sm:hidden flex items-center gap-1 text-xs">
                                             <div className="w-8 h-3 bg-white/10 rounded animate-pulse"></div>
                                             <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                                             <div className="w-12 h-3 bg-white/10 rounded animate-pulse"></div>
                                             <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                                             <div className="w-10 h-3 bg-white/10 rounded animate-pulse"></div>
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                   </div>
                                </motion.div>
                              ))}
                            </div>
                          )
                        ) : seasons.length > 0 && isEpisodesLoading ? (
                          // Show loading indicator when seasons are loaded but episodes are still loading
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-center text-white/40 py-8"
                          >
                            <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl p-6 border border-white/10">
                              <div className="flex items-center justify-center mb-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </div>
                              <h3 className="text-lg font-semibold text-white/60 mb-2">Loading Episodes</h3>
                              <p className="text-white/40 text-sm">Fetching episodes for this season...</p>
                            </div>
                          </motion.div>
                        ) : seasons.length > 0 && episodes.length > 0 ? (
                          episodesViewMode === 'card' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                              {episodes.slice(0, displayedEpisodes).map((episode, index) => (
                                <motion.div
                                  key={episode.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ 
                                    duration: 0.4, 
                                    delay: index * 0.05,
                                    ease: [0.25, 0.46, 0.45, 0.94]
                                  }}
                                  whileHover={{ 
                                    transition: { duration: 0.3, ease: "easeOut" }
                                  }}
                                  className="group relative bg-gradient-to-br from-white/[0.04] to-white/[0.02] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:bg-gradient-to-br hover:from-white/[0.06] hover:to-white/[0.03] shadow-sm hover:shadow-lg"
                                  onClick={() => handleEpisodeClick(episode)}
                                >
                                  {/* Episode Thumbnail */}
                                  <div className="relative aspect-video overflow-hidden">
                                    {episode.still_path ? (
                                                                              <img
                                          src={getOptimizedImageUrl(episode.still_path, 'w500')}
                                          alt={episode.name}
                                          className="w-full h-full object-cover transition-opacity duration-300"
                                          loading="lazy"
                                          onError={(e) => {
                                            console.warn('Failed to load episode still:', e.target.src);
                                          }}
                                        />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-gray-800/60 to-gray-700/60 flex items-center justify-center">
                                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                    
                                    {/* Subtle Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    {/* Play Button */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                      <div className="bg-black/60 backdrop-blur-sm rounded-full p-3 sm:p-4 border border-white/20">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z"/>
                                        </svg>
                                      </div>
                                    </div>
                                    
                                    {/* Episode Number Badge */}
                                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-black/85 backdrop-blur-md text-white text-xs font-semibold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-white/20">
                                      {episode.episode_number}
                                    </div>
                                    
                                    {/* Runtime Badge */}
                                    {episode.runtime && (
                                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-black/85 backdrop-blur-md text-white/85 text-xs font-medium px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-white/20">
                                        {formatRuntime(episode.runtime)}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Episode Info */}
                                  <div className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-3">
                                    <div className="space-y-1">
                                      <h4 className="text-white font-medium text-sm leading-tight line-clamp-2 group-hover:text-white/90 transition-colors duration-200 tracking-wide">
                                        {episode.name}
                                      </h4>
                                      
                                      {episode.overview && !isMobile && (
                                        <p className="text-white/65 text-xs leading-relaxed line-clamp-2 sm:line-clamp-2 group-hover:text-white/75 transition-colors duration-200 max-w-full overflow-hidden">
                                          {episode.overview}
                                        </p>
                                      )}
                                    </div>
                                    
                                    {/* Air Date */}
                                    {episode.air_date && (
                                      <div className="pt-2 sm:pt-3 border-t border-white/8">
                                        <span className="text-white/45 text-xs font-medium">
                                          {new Date(episode.air_date).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                              
                              {/* Enhanced Load More Button for Card View */}
                              {hasMoreEpisodes && (
                                <div className="col-span-full flex justify-center mt-6">
                                  <EnhancedLoadMoreButton
                                    onClick={handleLoadMoreEpisodes}
                                    hasMore={hasMoreEpisodes}
                                    isLoading={false}
                                    totalItems={episodes.length}
                                    displayedItems={displayedEpisodes}
                                    loadingText="Loading more episodes..."
                                    buttonText="Load More Episodes"
                                    itemName="episodes"
                                    variant="primary"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0">
                              {episodes.slice(0, displayedEpisodes).map((episode, index) => (
                                <motion.div
                                  key={episode.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ 
                                    duration: 0.4, 
                                    delay: index * 0.05,
                                    ease: [0.25, 0.46, 0.45, 0.94]
                                  }}
                                  className={`group relative cursor-pointer transition-all duration-300 hover:bg-white/[0.02] ${
                                    index < episodes.length - 1 ? 'border-b border-white/[0.08]' : ''
                                  }`}
                                  onClick={() => handleEpisodeClick(episode)}
                                >
                                  <div className="flex items-center gap-3 sm:gap-6 p-3 sm:p-6">
                                    {/* Episode Number - Left of Thumbnail (Desktop Only) */}
                                    <div className="hidden md:flex flex-shrink-0 items-center justify-center w-10 h-10">
                                      <span className="text-white/60 text-base">
                                        {episode.episode_number}
                                      </span>
                                    </div>
                                    
                                    {/* Episode Thumbnail - Bigger */}
                                    <div className="relative w-32 h-20 sm:w-32 sm:h-20 md:w-40 md:h-24 overflow-hidden rounded-lg flex-shrink-0">
                                      {episode.still_path ? (
                                        <img
                                          src={getOptimizedImageUrl(episode.still_path, 'w500')}
                                          alt={episode.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 transform-gpu will-change-transform"
                                          loading="lazy"
                                          onError={(e) => {
                                            console.warn('Failed to load episode still (list view):', e.target.src);
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-800/60 to-gray-700/60 flex items-center justify-center">
                                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                                          </svg>
                                        </div>
                                      )}
                                      
                                      {/* Subtle Gradient Overlay */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                      
                                      {/* Play Button */}
                                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-3 border border-white/20">
                                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z"/>
                                          </svg>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Episode Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                      <div className="space-y-3 sm:space-y-3">
                                        <div className="space-y-1 sm:space-y-2">
                                          <h4 className="text-white font-medium text-sm sm:text-base leading-tight group-hover:text-white/90 transition-colors duration-200 tracking-wide">
                                            {episode.name}
                                          </h4>
                                          
                                          {/* Episode Overview - Hidden on mobile */}
                                          {episode.overview && !isMobile && (
                                            <p className="text-white/65 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-2 group-hover:text-white/75 transition-colors duration-200 max-w-full">
                                              {episode.overview}
                                            </p>
                                          )}
                                        </div>
                                        
                                        {/* Episode Details */}
                                        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-white/45">
                                          {/* Desktop: Separate date and runtime */}
                                          <div className="hidden sm:flex items-center gap-4">
                                            {/* Air Date */}
                                            {episode.air_date ? (
                                              <>
                                                <span className="flex items-center gap-1">
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                  </svg>
                                                  <span>
                                                    {(() => {
                                                      const date = new Date(episode.air_date);
                                                      if (isNaN(date)) return "Unknown date";
                                                      return date.toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                      });
                                                    })()}
                                                  </span>
                                                </span>
                                                {/* Dot separator after date */}
                                                <span className="inline-block w-3 text-center text-white/30 select-none">•</span>
                                              </>
                                            ) : (
                                              <>
                                                <span className="flex items-center gap-1">
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                  </svg>
                                                  <span>No air date</span>
                                                </span>
                                                {/* Dot separator after date */}
                                                <span className="inline-block w-3 text-center text-white/30 select-none">•</span>
                                              </>
                                            )}

                                            {/* Runtime */}
                                            {typeof episode.runtime === "number" && episode.runtime > 0 ? (
                                              <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {formatRuntime(episode.runtime)}
                                              </span>
                                            ) : (
                                              <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Unknown runtime</span>
                                              </span>
                                            )}
                                          </div>

                                          {/* Mobile: Combined date and runtime on one line */}
                                          <div className="sm:hidden flex items-center gap-1 text-xs">
                                            <span>E{episode.episode_number}</span>
                                            <span className="inline-block w-2 text-center text-white/30 select-none">•</span>
                                            {episode.air_date ? (
                                              <span>
                                                {(() => {
                                                  const date = new Date(episode.air_date);
                                                  if (isNaN(date)) return "Unknown";
                                                  return date.toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric'
                                                  });
                                                })()}
                                              </span>
                                            ) : (
                                              <span>No date</span>
                                            )}
                                            {typeof episode.runtime === "number" && episode.runtime > 0 && (
                                              <>
                                                <span className="inline-block w-2 text-center text-white/30 select-none">•</span>
                                                <span>{formatRuntime(episode.runtime)}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                              
                              {/* Debug log for Load More button visibility */}
                              {(() => { console.log('DEBUG: episodes.length =', episodes.length, 'displayedEpisodes =', displayedEpisodes, 'hasMoreEpisodes =', hasMoreEpisodes); return null; })()}

                              {/* Enhanced Load More Button for List View */}
                              {hasMoreEpisodes && (
                                <div className="flex justify-center mt-6 pt-4 border-t border-white/10">
                                  <EnhancedLoadMoreButton
                                    onClick={handleLoadMoreEpisodes}
                                    hasMore={hasMoreEpisodes}
                                    isLoading={false}
                                    totalItems={episodes.length}
                                    displayedItems={displayedEpisodes}
                                    loadingText="Loading more episodes..."
                                    buttonText="Load More Episodes"
                                    itemName="episodes"
                                    variant="minimal"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-center text-white/40 py-12"
                          >
                            <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl p-8 border border-white/10">
                              <svg className="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                              </svg>
                              <h3 className="text-lg font-semibold text-white/60 mb-2">No Episodes Available</h3>
                              <p className="text-white/40 text-sm">This season doesn't have any episodes yet.</p>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                  <div className="h-1"></div>
                </div>

                {/* Similar Section */}
                <motion.div 
                  className="pt-6 sm:pt-8 relative"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {/* Enhanced border with matching radius */}
                  <div className="absolute -top-px left-0 w-full h-[1.5px] z-10 pointer-events-none">
                    <div className="w-full h-full border-t border-white/10 rounded-t-2xl" />
                  </div>
                  <div className="absolute -top-4 left-0 w-full flex justify-center pointer-events-none z-10">
                    <span className="inline-block h-1 w-32 bg-gradient-to-r from-primary/30 via-white/40 to-primary/30 rounded-full blur-sm opacity-60" />
                  </div>
                  
                  {/* Enhanced Similar Content Section */}
                  <EnhancedSimilarContent
                    key={`${movie?.id}-${movie?.type}`}
                    contentId={movie?.id}
                    contentType={movie?.type || 'movie'}
                    onItemClick={handleSimilarMovieClick}
                    isMobile={isMobile}
                    maxItems={24}
                    showFilters={true}
                    showTitle={true}
                    showLoadMore={true}
                    className=""
                  />
                </motion.div>
              </div>
            </div>
          ) : null}



          <motion.button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full text-white group overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-l-[1px] border-r-[1px] border-white/30 hover:bg-white/10 transform-gpu will-change-transform"
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <motion.svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              whileHover={{ 
                rotate: 90,
                scale: 1.1,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
            >
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </motion.svg>
            <motion.span 
              className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1a1a1a] rounded text-sm whitespace-nowrap"
              initial={{ opacity: 0, x: 10 }}
              whileHover={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              Close
            </motion.span>
          </motion.button>
        </motion.div>

        {/* Trailer Modal */}
        <AnimatePresence>
          {showTrailer && (
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader size="large" color="white" variant="circular" /></div>}>
              <motion.div 
                key="trailer-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.3, 
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="fixed inset-0 z-[1000000001] flex items-center justify-center bg-black/95"
                onClick={handleCloseTrailer}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ 
                    duration: 0.3, 
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className="relative w-[90vw] max-w-4xl aspect-video"
                  onClick={(e) => e.stopPropagation()}
                  style={{ pointerEvents: 'auto' }}
                >
                  {/* Close Button */}
                  <motion.button
                    id="trailer-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('Trailer close button clicked'); // Debug log
                      handleCloseTrailer();
                    }}
                    className="absolute top-4 right-4 p-3 rounded-full bg-black/80 text-white group z-[1000000002] cursor-pointer border border-white/20 hover:bg-black/90 transition-colors"
                    aria-label="Close trailer"
                    type="button"
                    style={{ pointerEvents: 'auto' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                                          <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-6 w-6" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    <span 
                      className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      Close Trailer
                    </span>
                  </motion.button>
                  
                  {/* Video Container */}
                  <div 
                    className="relative w-full h-full rounded-lg overflow-hidden bg-black"
                    style={{ pointerEvents: 'auto' }}
                  >
                    {isTrailerLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                        <Loader size="large" color="white" variant="circular" />
                      </div>
                    )}
                    {movieDetails.trailer ? (
                      <div className="w-full h-full" style={{ pointerEvents: 'auto' }}>
                        <LazyYouTube
                          videoId={movieDetails.trailer}
                          opts={{
                            width: '100%',
                            height: '100%',
                            playerVars: {
                              autoplay: 1,
                              controls: 1,
                              modestbranding: 1,
                              rel: 0,
                              showinfo: 0,
                              iv_load_policy: 3,
                              origin: window.location.origin,
                              enablejsapi: 1,
                              widget_referrer: window.location.origin,
                            },
                          }}
                          onReady={(event) => {
                            playerRef.current = event.target;
                            setIsTrailerLoading(false);
                            console.log('YouTube player ready');
                          }}
                          onError={(error) => {
                            console.warn('YouTube player error:', error);
                            setIsTrailerLoading(false);
                          }}
                          onStateChange={(event) => {
                            // Handle player state changes
                            console.log('YouTube player state changed:', event.data);
                          }}
                          className="w-full h-full"
                          style={{ 
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 1
                          }}
                        />
                        {/* Fallback link in case iframe is blocked */}
                        <div className="absolute bottom-4 left-4 opacity-0 hover:opacity-100 transition-opacity">
                          <a 
                            href={`https://www.youtube.com/watch?v=${movieDetails.trailer}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/70 text-sm hover:text-white underline"
                          >
                            Open in YouTube
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/70 text-lg">No trailer available.</div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </Suspense>
          )}
        </AnimatePresence>

        {/* Streaming Player */}
        <StreamingPlayer
          streamingUrl={streamingUrl}
          title={movieDetails?.title || movieDetails?.name}
          isOpen={showStreamingPlayer}
          onClose={handleCloseStreaming}
          onError={handleStreamingError}
          content={(() => {
            if (movieDetails?.type === 'tv') {
              const content = {
                id: movieDetails.id,
                type: 'tv',
                season: movieDetails.season,
                episode: movieDetails.episode
              };
              console.log('StreamingPlayer: Content for TV show:', content);
              return content;
            }
            return movieDetails;
          })()}
          currentService={currentService}
          onServiceChange={handleServiceChange}
        />

        {/* TV Episode Selector */}
        <TVEpisodeSelector
          show={movieDetails}
          isOpen={showEpisodeSelector}
          onClose={handleCloseEpisodeSelector}
          onEpisodeSelect={handleEpisodeSelect}
          seasons={seasons}
          currentSeason={currentSeason}
          onSeasonChange={handleSeasonChange}
          currentService={currentService}
          onServiceChange={handleServiceChange}
        />
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlayContent, portalContainer);
};

export default MovieDetailsOverlay;