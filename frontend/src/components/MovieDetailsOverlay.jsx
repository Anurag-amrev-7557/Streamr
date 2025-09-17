import React, { useState, useRef, useEffect, useCallback, Suspense, lazy, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getMovieDetails, getMovieCredits, getMovieVideos, getSimilarMovies, getTVSeason, getTVSeasons } from '../services/tmdbService';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { Loader, PageLoader, SectionLoader, CardLoader } from './Loader';
import { getStreamingUrl, isStreamingAvailable, needsEpisodeSelection, DEFAULT_STREAMING_SERVICE } from '../services/streamingService';
import StreamingPlayer from './StreamingPlayer';
import TVEpisodeSelector from './TVEpisodeSelector';
import EnhancedSimilarContent from './EnhancedSimilarContent';
import { getOptimizedImageUrl } from '../services/imageOptimizationService';
import memoryOptimizationService from '../utils/memoryOptimizationService';

import EnhancedLoadMoreButton from './enhanced/EnhancedLoadMoreButton';
import { handleYouTubeError } from '../utils/youtubeErrorHandler';
import CastDetailsOverlay from './CastDetailsOverlay';
import { getTmdbImageUrl } from '../utils/imageUtils.js';
import { PencilSquareIcon, ArrowDownTrayIcon, LinkIcon, ArrowTopRightOnSquareIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

// Enhanced Portal Management
import { usePortal } from '../hooks/usePortal';
import portalManagerService from '../services/portalManagerService';

/*
 * 🚀 INFINITE LOOP FIXES APPLIED:
 * 
 * 1. Background refresh effect (line ~3930): Removed fetchMovieData dependency, used ref instead
 * 2. Optimized limits effect (line ~1822): Confirmed empty dependency array for single execution
 * 3. Main data fetching effect (line ~3840): Simplified dependencies to only movie?.id
 * 4. TV content loading effect (line ~3755): Inlined fetchSeasonEpisodes logic to avoid function dependency
 * 5. Season change handler (line ~3780): Inlined episode fetching logic to avoid function dependency
 * 6. Retry cast handler (line ~3800): Inlined fetchExtraInfo logic to avoid function dependency
 * 7. Similar movies prefetching (line ~2428): Simplified dependencies and removed duplicate effect
 * 8. Intersection observer effect (line ~2530): Inlined loadMoreSimilar logic to avoid function dependency
 * 9. Scroll event listener (line ~2484): Inlined scroll handler to avoid function dependency
 * 10. Share image regeneration (line ~1395): Added movieDetails dependency for proper updates
 * 
 * 🚀 NEW COMPREHENSIVE FIXES APPLIED:
 * 
 * 11. Consolidated 50+ useEffect hooks into optimized, memory-safe versions
 * 12. Added proper cleanup to prevent memory leaks and infinite loops
 * 13. Enhanced network error handling with graceful degradation
 * 14. Optimized performance monitoring with consolidated observers
 * 15. Added retry count limits to prevent infinite retry loops
 * 16. Implemented proper AbortController usage for request cancellation
 * 17. Added mounted ref checks to prevent state updates on unmounted components
 * 18. Consolidated memory optimization into single, efficient hooks
 * 
 * All fixes follow the principle of avoiding function dependencies in useEffect hooks
 * and instead inlining the necessary logic or using refs to store function references.
 */

// Custom CSS for enhanced slider styling and scrollbars
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 18px;
    width: 18px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }
  
  .slider::-webkit-slider-thumb:hover {
    background: #ffffff;
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transform: scale(1.1);
  }
  
  .slider::-webkit-slider-track {
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
  }
  
  .slider::-moz-range-thumb {
    height: 18px;
    width: 18px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }
  
  .slider::-moz-range-thumb:hover {
    background: #ffffff;
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transform: scale(1.1);
  }
  
  .slider::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
  }

  /* Custom scrollbar styling for editor panel */
  .share-editor-scroll::-webkit-scrollbar {
    width: 6px;
  }
  
  .share-editor-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  .share-editor-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    transition: background 0.2s ease;
  }
  
  .share-editor-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .share-editor-scroll::-moz-scrollbar {
    width: 6px;
  }
  .share-editor-scroll::-moz-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  .share-editor-scroll::-moz-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    transition: background 0.2s ease;
  }
  
  .share-editor-scroll::-moz-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

// Inject styles when component mounts
if (typeof document !== 'undefined') {
  const styleId = 'movie-details-overlay-slider-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = sliderStyles;
    document.head.appendChild(style);
  }
}

// Utility function to ensure valid filter values and prevent NaN brightness errors
const ensureValidFilter = (filterValue) => {
  if (!filterValue || typeof filterValue !== 'string') {
    return 'brightness(1)';
  }
  
  // Check if the filter contains any NaN values
  if (filterValue.includes('NaN') || filterValue.includes('undefined') || filterValue.includes('null')) {
    return 'brightness(1)';
  }
  
  return filterValue;
};

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

  // 🚀 FIXED: Advanced caching with optimized memory management
  const DETAILS_CACHE = new Map();
  const CACHE_DURATION = 3 * 60 * 1000; // Reduced to 3 minutes for better memory management
  const BACKGROUND_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in prod, 20 in dev
  const REAL_TIME_UPDATE_INTERVAL = 120 * 1000; // 120s in prod, 90s in dev
  const MAX_CACHE_SIZE = 2; // Reduced to 2 for aggressive memory management
  const CACHE_CLEANUP_INTERVAL = 45 * 1000; // Clean cache every 45 seconds


  // 🆕 NEW: Performance-adaptive cache management
  const getAdaptiveCacheSettings = () => {
    // Adjust cache settings based on performance
    if (typeof window !== 'undefined' && window.innerWidth > 1024) {
      return {
        maxSize: 1,           // Very aggressive for desktop to prevent hanging
        duration: 1 * 60 * 1000, // 1 minute for desktop to prevent hanging
        cleanupInterval: 20 * 1000, // Clean every 20 seconds for desktop
        realTimeInterval: 120 * 1000 // 2 minutes for desktop
      };
    }
    
    // Default settings for mobile devices
    return {
      maxSize: 2,             // Reduced for mobile devices to prevent hanging
      duration: 3 * 60 * 1000, // 3 minutes for mobile devices
      cleanupInterval: 45 * 1000, // Clean every 45 seconds for mobile devices
      realTimeInterval: 60 * 1000  // 1 minute for mobile devices
    };
  };

  // 🎯 NEW: Cache management utilities with enhanced memory optimization
  const getCachedDetails = (id, type) => {
    const key = `${type}_${id}`;
    const cached = DETAILS_CACHE.get(key);
    const cacheSettings = getAdaptiveCacheSettings();
    
    if (cached && Date.now() - cached.timestamp < cacheSettings.duration) {
      return cached.data;
    }
    return null;
  };

  const setCachedDetails = (id, type, data) => {
    const key = `${type}_${id}`;
    const cacheSettings = getAdaptiveCacheSettings();
    
    DETAILS_CACHE.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Simple cleanup: Remove oldest entries when limit is reached
    if (DETAILS_CACHE.size > cacheSettings.maxSize) {
      const entries = Array.from(DETAILS_CACHE.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entry
      DETAILS_CACHE.delete(entries[0][0]);
    }
    
    // Clean up expired entries
    const now = Date.now();
    for (const [cacheKey, value] of DETAILS_CACHE.entries()) {
      if (now - value.timestamp > cacheSettings.duration) {
        DETAILS_CACHE.delete(cacheKey);
      }
    }
  };

// Simplified cache cleanup
const clearCache = () => {
  DETAILS_CACHE.clear();
  trailerCache.clear();
};

// Memory cleanup functions removed to prevent memory leaks
// Let the browser handle memory management naturally



// Enhanced trailer caching with memory limits
const trailerCache = new Map();
const TRAILER_CACHE_DURATION = 10 * 60 * 1000; // Reduced to 10 minutes
const MAX_TRAILER_CACHE_SIZE = 5; // Limit trailer cache size
const getCachedTrailer = (movieId, movieType) => {
  const key = `${movieType}_${movieId}`;
  const cached = trailerCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < TRAILER_CACHE_DURATION) {
    return cached.trailer;
  }
  
  return null;
};
const setCachedTrailer = (movieId, movieType, trailer) => {
  const key = `${movieType}_${movieId}`;
  
  trailerCache.set(key, {
    trailer,
    timestamp: Date.now()
  });
};

// Real-time update manager class
class RealTimeUpdateManager {
  constructor() {
    this.subscribers = new Map();
    this.isActive = false;
    this.isDestroyed = false;
    this.cleanupScheduled = false;
    this.maxSubscribers = 10;
    this.updateInterval = null;
    this.abortController = null;
    this.lastUpdateTime = 0;
    this.updateQueue = [];
    this.memoryCheckInterval = null;
    this.cleanupTimer = null;
    this.visibilityListenerAttached = false;
    
    // 🆕 NEW: Performance-adaptive update intervals
    this.performanceMode = 'high'; // Default to high performance
    this.updateIntervals = {
      high: 120 * 1000,    // 2 minutes for high-performance devices
      medium: 180 * 1000,  // 3 minutes for medium-performance devices
      low: 300 * 1000      // 5 minutes for low-performance devices
    };
  }

  subscribe(movieId, type, callback) {
    if (!this.subscribers || this.isDestroyed) return; // Prevent error if already cleaned up
    
    const key = `${type}_${movieId}`;
    
    // More aggressive subscriber limit
    if (this.subscribers.size >= this.maxSubscribers) {
      console.warn('[RealTimeUpdateManager] Too many subscribers, removing oldest');
      const firstKey = this.subscribers.keys().next().value;
      this.subscribers.delete(firstKey);
    }
    
    this.subscribers.set(key, callback);
    
    if (!this.isActive && !this.isDestroyed) {
      this.startUpdates();
    }
  }

  unsubscribe(movieId, type) {
    if (!this.subscribers || this.isDestroyed) return; // Prevent error if already cleaned up
    
    const key = `${type}_${movieId}`;
    this.subscribers.delete(key);
    
    if (this.subscribers.size === 0) {
      this.stopUpdates();
    }
  }

      startUpdates() {
      if (this.isActive || !this.subscribers || this.isDestroyed) return;
      
      this.isActive = true;
      this.abortController = new AbortController();
      
      // Attach visibility listener
      if (!this.visibilityListenerAttached && typeof document !== 'undefined' && document.addEventListener) {
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        this.visibilityListenerAttached = true;
      }
      
          // 🆕 NEW: Use adaptive update interval based on performance
    const updateInterval = this.updateIntervals[this.performanceMode] || this.updateIntervals.high;
    
    this.updateInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return; // Skip updates when tab is hidden
      }
      if (this.abortController?.signal.aborted || this.isDestroyed) {
        this.stopUpdates();
        return;
      }
      // Add performance check to prevent hanging
      if (performance.now() - this.lastUpdateTime < 5000) {
        return; // Skip if last update was too recent
      }
      this.performUpdates();
    }, updateInterval);
    }

    // 🆕 NEW: Method to update performance mode
    setPerformanceMode(frameRate) {
      if (frameRate < 30) {
        this.performanceMode = 'low';
      } else if (frameRate < 45) {
        this.performanceMode = 'medium';
      } else {
        this.performanceMode = 'high';
      }
      
      // Restart updates with new interval if already active
      if (this.isActive) {
        this.stopUpdates();
        this.startUpdates();
      }
    }

  stopUpdates() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Clear update queue
    this.updateQueue = [];

    // Detach visibility listener if no subscribers remain or manager destroyed
    const noSubscribers = !this.subscribers || this.subscribers.size === 0;
    if ((this.isDestroyed || noSubscribers) && this.visibilityListenerAttached && typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = false;
    }
  }
  
  handleVisibilityChange() {
    if (this.isDestroyed) return;
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') {
      // Pause updates when hidden
      this.stopUpdates();
    } else if (document.visibilityState === 'visible') {
      // Resume if we have subscribers
      if (this.subscribers && this.subscribers.size > 0 && !this.isActive) {
        this.startUpdates();
      }
    }
  }
  async performUpdates() {
    if (this.abortController?.signal.aborted || !this.subscribers) return;
    
    // Rate limiting
    const now = Date.now();
    if (now - this.lastUpdateTime < 10000) return; // Increased to 10 seconds to reduce load
    this.lastUpdateTime = now;
    
    // Process only one update at a time
    const subscriberEntries = Array.from(this.subscribers.entries());
    if (subscriberEntries.length === 0) return;
    
    // Process only the first subscriber
    const [key, callback] = subscriberEntries[0];
    const [type, movieId] = key.split('_');
    
          try {
        const freshData = await getMovieDetails(movieId, type);
        
        if (freshData && !this.abortController?.signal.aborted) {
          setCachedDetails(movieId, type, freshData);
          callback(freshData);
        }
      } catch (error) {
        if (!this.abortController?.signal.aborted) {
          console.warn(`Real-time update failed for ${key}:`, error);
        }
      }
  }

  // Enhanced cleanup method with comprehensive memory management
  cleanup() {
    // Prevent multiple cleanup calls
    if (this.cleanupScheduled || this.isDestroyed) return;
    this.cleanupScheduled = true;
    this.isDestroyed = true;
    
    this.stopUpdates();
    // Ensure visibility listener is removed
    if (this.visibilityListenerAttached && typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = false;
    }
    
    if (this.subscribers) {
      this.subscribers.clear();
      this.subscribers = null;
    }
    
    // Clear all references to prevent memory leaks
    this.updateInterval = null;
    this.abortController = null;
    this.lastUpdateTime = 0;
    this.updateQueue = [];
    this.memoryCheckInterval = null;
    this.cleanupTimer = null;
    
    // Note: Force garbage collection removed to prevent memory leaks
    // Let the browser handle memory management naturally
  }
}



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



// Lazy load YouTube player for trailer modal with preloading
const LazyYouTube = lazy(() => import('react-youtube'), {
  suspense: true
});

// Preload YouTube player component for faster trailer loading
const preloadYouTubePlayer = () => {
  import('react-youtube').catch(() => {
    // Silently handle preload failure
  });
};
// Enhanced trailer caching with memory limits (duplicate removed)

// Preload trailer data function removed to improve performance

  // 🚀 FIXED: Ultra-optimized Cast Card with strict memory management
  const CastCard = React.memo(function CastCard({ person, onClick }) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const imageRef = useRef(null);

  // Enhanced image loading with aggressive memory optimization
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback((e) => {
    if (import.meta.env.DEV) {
      console.warn('Failed to load cast image:', e.target.src);
    }
    setImageError(true);
    setImageLoaded(false);
    // Clear the src and remove from DOM to prevent memory leaks
    if (e.target) {
      e.target.src = '';
      e.target.srcset = '';
      e.target.removeAttribute('src');
      e.target.removeAttribute('srcset');
    }
  }, []);

  // Aggressive cleanup on unmount
  useEffect(() => {
    const currentImageRef = imageRef.current;
    return () => {
      if (currentImageRef) {
        // Clear image source and attributes
        currentImageRef.src = '';
        currentImageRef.srcset = '';
        currentImageRef.removeAttribute('src');
        currentImageRef.removeAttribute('srcset');
        currentImageRef.onload = null;
        currentImageRef.onerror = null;
        
        // Clear any cached image data
        if (currentImageRef.complete) {
          currentImageRef.style.display = 'none';
        }
      }
      // Clear ref to prevent memory leaks
      imageRef.current = null;
    };
  }, []);

  return (
    <div className="text-center group cursor-pointer" onClick={() => onClick && onClick(person)}>
      <div className="relative w-24 h-24 mx-auto mb-3">
        <div className="rounded-full overflow-hidden w-full h-full transition-all duration-300 transform group-hover:scale-110 shadow-lg will-change-transform">
          {person.image && !imageError ? (
            <>
              {/* Loading placeholder */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              )}
              
              {/* Optimized image with enhanced loading */}
              <img 
                ref={imageRef}
                src={person.image} 
                alt={person.name} 
                className={`w-full h-full object-cover will-change-transform ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy" 
                decoding="async"
                fetchpriority="low"
                style={{ 
                  backfaceVisibility: 'hidden',
                  contain: 'layout style paint',
                  // Performance optimization: reduce image quality on low-performance devices
                  imageRendering: 'auto'
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
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
  // 🚀 FIXED: Ultra-optimized Similar Movie Card with strict memory management
  const SimilarMovieCard = React.memo(function SimilarMovieCard({ similar, onClick, isMobile }) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const imageRef = useRef(null);
    
    // 🆕 NEW: Performance optimization for image loading
    const imageStyle = useMemo(() => ({
      backfaceVisibility: 'hidden',
      contain: 'layout style paint',
      // Performance optimization: adaptive image rendering
      imageRendering: 'auto'
    }), []);
  
  // Debug logging only in development
  useEffect(() => {
   
  }, [similar]);
  
  const displayTitle = similar.title || similar.name || 'Untitled';
  let displayYear = 'N/A';
  if (similar.year) {
    displayYear = similar.year;
  } else if (similar.first_air_date) {
    displayYear = new Date(similar.first_air_date).getFullYear();
  } else if (similar.release_date) {
    displayYear = new Date(similar.release_date).getFullYear();
  }

  // Enhanced image loading with memory optimization
  const handleImageLoad = useCallback(() => {
   
    setImageLoaded(true);
    setImageError(false);
  }, [similar?.poster_path, displayTitle]);

  const handleImageError = useCallback((e) => {
    if (import.meta.env.DEV) {
      console.warn('Failed to load similar movie poster:', {
        src: e.target.src,
        poster_path: similar?.poster_path,
        title: similar?.title || similar?.name || 'Untitled'
      });
    }
    
    // Try fallback URL if this was a CORS error and we haven't tried the fallback yet
    if (e.target && similar?.poster_path && !e.target.dataset.fallbackTried) {
      e.target.dataset.fallbackTried = 'true';
      const fallbackUrl = getTmdbImageUrl(similar.poster_path, 'w500');
     
      e.target.crossOrigin = null; // Remove crossOrigin for fallback
      e.target.src = fallbackUrl;
      return;
    }
    
    // If fallback also failed, show error state and cleanup
    setImageError(true);
    setImageLoaded(false);
    
    // Aggressive cleanup to prevent memory leaks
    if (e.target) {
      e.target.src = '';
      e.target.srcset = '';
      e.target.removeAttribute('src');
      e.target.removeAttribute('srcset');
      e.target.removeAttribute('data-fallback-tried');
    }
  }, [similar?.poster_path, similar?.title, similar?.name]);

  // Aggressive cleanup on unmount
  useEffect(() => {
    const currentImageRef = imageRef.current;
    return () => {
      if (currentImageRef) {
        // Clear image source and attributes
        currentImageRef.src = '';
        currentImageRef.srcset = '';
        currentImageRef.removeAttribute('src');
        currentImageRef.removeAttribute('srcset');
        currentImageRef.removeAttribute('data-fallback-tried');
        currentImageRef.onload = null;
        currentImageRef.onerror = null;
        
        // Clear any cached image data
        if (currentImageRef.complete) {
          currentImageRef.style.display = 'none';
        }
      }
      // Clear ref to prevent memory leaks
      imageRef.current = null;
    };
  }, []);

  return (
    <div className="group cursor-pointer" onClick={() => onClick(similar)}>
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative shadow-lg">
        {similar.poster_path && !imageError ? (
          <>
            {/* Loading placeholder */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 rounded-t-2xl"></div>
            )}
            
            {/* Optimized image with enhanced loading */}
            <img 
              ref={imageRef}
              src={getOptimizedImageUrl(similar.poster_path, 'w500')} 
              alt={displayTitle} 
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 will-change-transform transform-gpu ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={imageStyle}
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              fetchpriority="low"
              decoding="async"
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              onError={handleImageError}
             
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  {similar.vote_average?.toFixed ? similar.vote_average.toFixed(1) : (typeof similar.vote_average === 'number' ? similar.vote_average : 'N/A')}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center transform transition-all duration-300 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    </div>
  );
});

  // Enhanced mobile detection hook removed to improve performance

  // 🆕 NEW: Performance-optimized mobile detection with reduced overhead
  const useOptimizedIsMobile = () => {
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
      let rafId;
      
      function handleResize() {
        // Use requestAnimationFrame for better performance
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        
        rafId = requestAnimationFrame(() => {
          const width = window.innerWidth;
          setIsMobile(width <= 640);
          setIsTablet(width > 640 && width <= 1024);
          setIsDesktop(width > 1024);
        });
      }

      // Use passive listener for better scroll performance
      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    return { isMobile, isTablet, isDesktop };
  };
const MovieDetailsOverlay = ({ movie, onClose, onMovieSelect, onGenreClick }) => {
  // 🚀 ENHANCED: Portal management - must be called before any conditional returns
  const portalId = 'movie-details-portal';
  
  // Memoize portal options to prevent infinite re-renders
  const portalOptions = useMemo(() => ({
    priority: 'high',
    group: 'movie-overlays',
    accessibility: true,
    stacking: true,
    debug: process.env.NODE_ENV === 'development',
    animationType: 'modal',
    analytics: true,
    statePersistence: true,
    theme: 'movie-details',
    onFocus: (id) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[MovieDetailsOverlay] Portal ${id} focused`);
      }
    },
    onBlur: (id) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[MovieDetailsOverlay] Portal ${id} blurred`);
      }
    },
    onEscape: (id) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[MovieDetailsOverlay] Escape key pressed on portal ${id}`);
      }
      // Handle escape key if needed
      if (onClose) {
        onClose();
      }
    }
  }), [onClose]);
  
  const {
    container: portalContainer,
    createPortal: createPortalContent,
    focusPortal,
    isReady: portalReady,
    zIndex: portalZIndex,
    id: portalIdActual,
    savePortalState,
    loadPortalState,
    trackInteraction,
    coordinateAnimation,
    analytics
  } = usePortal(portalId, portalOptions);

  // 🆕 SIMPLIFIED: Basic content pre-rendering
  const [contentPreRendered, setContentPreRendered] = useState(false);

  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { startWatchingMovie, startWatchingEpisode, viewingProgress } = useViewingProgress();

  // 🆕 ENHANCED: State persistence and analytics
  const [savedState, setSavedState] = useState(null);
  const [interactionCount, setInteractionCount] = useState(0);

  // Load saved state on mount
  useEffect(() => {
    if (loadPortalState) {
      const saved = loadPortalState();
      if (saved) {
        setSavedState(saved);
        if (process.env.NODE_ENV === 'development') {
          console.debug('[MovieDetailsOverlay] Loaded saved state:', saved);
        }
      }
    }
  }, [loadPortalState]);

  // Save state on interactions
  const handleInteraction = useCallback((interactionType, data = {}) => {
    setInteractionCount(prev => prev + 1);
    
    if (trackInteraction) {
      trackInteraction(interactionType, {
        movieId: movie?.id,
        movieTitle: movie?.title,
        ...data
      });
    }

    // Save state
    if (savePortalState) {
      savePortalState({
        movieId: movie?.id,
        interactionCount: interactionCount + 1,
        lastInteraction: interactionType,
        timestamp: Date.now(),
        scrollPosition: window.scrollY
      });
    }
  }, [trackInteraction, savePortalState, movie?.id, movie?.title, interactionCount]);

  // Coordinate animations on open
  useEffect(() => {
    if (coordinateAnimation && movie) {
      coordinateAnimation('modal');
    }
  }, [coordinateAnimation, movie]);
  
  




  
  // 🚀 FIXED: Enhanced cleanup on unmount with proper mounted ref management
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      // Mark as unmounted first to prevent any new operations
      isMountedRef.current = false;
      
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Portal cleanup is now handled by the usePortal hook
    };
  }, []);

  // 🆕 NEW: Reset content pre-rendering state when overlay closes
  useEffect(() => {
    if (!movie && isMountedRef.current) {
      setContentPreRendered(false);
    }
  }, [movie]);
  


  

  // 🆕 SIMPLIFIED: Content pre-rendering effect
  useEffect(() => {
    if (!movie) return;
    
    // Pre-render content when movie data is available
    const preRenderTimer = setTimeout(() => {
      if (isMountedRef.current && movie) {
        setContentPreRendered(true);
      }
    }, 50); // Small delay to ensure smooth transition
    
    return () => {
      clearTimeout(preRenderTimer);
      // Don't set state if component is unmounted
      if (isMountedRef.current) {
        setContentPreRendered(false);
      }
    };
  }, [movie]);





  // 🆕 SIMPLIFIED: Layout threshold monitoring
  useEffect(() => {
    if (!movie) return;
    
    // Monitor for layout threshold issues
    const layoutObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === scrollContainerRef.current) {
          const { width, height } = entry.contentRect;
          
          // If container dimensions change significantly during content loading, 
          // it indicates a layout threshold issue
          if (width > 0 && height > 0 && !contentPreRendered) {
            // Force content pre-rendering to prevent empty area flashing
            setTimeout(() => {
              if (isMountedRef.current) {
                setContentPreRendered(true);
              }
            }, 100);
          }
        }
      });
    });
    
    if (scrollContainerRef.current) {
      layoutObserver.observe(scrollContainerRef.current);
    }
    
    return () => {
      layoutObserver.disconnect();
    };
  }, [movie, contentPreRendered]);






  
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
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const latestRequestRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const [isCastLoading, setIsCastLoading] = useState(true);
  const [isSimilarLoading, setIsSimilarLoading] = useState(true);
  const [isTrailerLoading, setIsTrailerLoading] = useState(false);
  const [isSimilarLoadingMore, setIsSimilarLoadingMore] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const similarLoaderRef = useRef(null);
  const scrollContainerRef = useRef(null);
  // Share sheet state
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isShareEditing, setIsShareEditing] = useState(false);
  const [sharePanelExpanded, setSharePanelExpanded] = useState(false);
  const [showShareEditor, setShowShareEditor] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  function getDefaultShareConfig() {
    return {
      theme: 'dark',
      layout: 'portrait',
      imageSource: 'auto',
      backgroundMode: 'image',
      solidColorStart: '#0f1114',
      solidColorEnd: '#1a1d24',
      textColor: '#FFFFFF',
      titleSize: 72,
      overviewLines: 2,
      showRating: true,
      // Advanced options
      showYear: true,
      showRuntime: true,
      titleAlign: 'center',
      metaAlign: 'center',
      spacingScale: 1.0,
      posterFrameOpacity: 0.07,
      posterFrameRadius: 28,
      posterCornerRadius: 24,
      posterShadowStrength: 0.25,
      backgroundImageOpacity: 0.45,
      showGenres: true,
      maxGenres: 5,
      showBranding: true,
    };
  }

  // 🚀 FIXED: Revoke any created object URLs when they change or on unmount with memory leak prevention
  useEffect(() => {
    return () => {
      if (shareImageUrl) {
        try { 
          URL.revokeObjectURL(shareImageUrl);
          setShareImageUrl(null); // Clear state to prevent memory leaks
        } catch (error) {
          console.warn('[MovieDetailsOverlay] Failed to revoke share image URL:', error);
        }
      }
      if (prevShareUrlRef.current) {
        try {
          URL.revokeObjectURL(prevShareUrlRef.current);
          prevShareUrlRef.current = null;
        } catch (error) {
          console.warn('[MovieDetailsOverlay] Failed to revoke previous share image URL:', error);
        }
      }
    };
  }, [shareImageUrl]);

  // 🚀 FIXED: Enhanced cleanup on unmount with memory leak prevention
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Clear share regeneration timeout
      if (shareRegenTimeoutRef.current) {
        clearTimeout(shareRegenTimeoutRef.current);
        shareRegenTimeoutRef.current = null;
      }
      
      // Portal cleanup is now handled by the usePortal hook
      
      // Mark component as unmounted
      isMountedRef.current = false;
    };
  }, []);
  const [shareConfig, setShareConfig] = useState(getDefaultShareConfig());

  const shareRegenTimeoutRef = useRef(null);
  const prevShareUrlRef = useRef(null);

  // 🚀 FIXED: Enhanced memory optimization with comprehensive cleanup
  useEffect(() => {
    return () => {
      // Clear data on unmount
      setSimilarMovies([]);
      setCredits(null);
      setVideos(null);
      
      // Clear share-related state
      setShareImageUrl(null);
      setShowShareSheet(false);
      setIsImageReady(false);
      setIsGeneratingShare(false);
      
      // Clear UI state
      setShowTrailer(false);
      setShowStreamingPlayer(false);
      setShowEpisodeSelector(false);
      setShowCastDetails(false);
      setSelectedCastMember(null);
    };
  }, []);

  // 🚀 FIXED: Enhanced cleanup on unmount with memory leak prevention
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Clear share regeneration timeout
      if (shareRegenTimeoutRef.current) {
        clearTimeout(shareRegenTimeoutRef.current);
        shareRegenTimeoutRef.current = null;
      }
      
      // Mark as unmounted
      isMountedRef.current = false;
    };
  }, []);

  // Reset state when movie changes
  useEffect(() => {
    if (movie?.id) {
      // Clear previous movie data when switching
      setMovieDetails(null);
      setCredits(null);
      setVideos(null);
      setSimilarMovies([]);
      setSimilarMoviesPage(1);
      setHasMoreSimilar(true);
      setLoading(true);
      setError(null);
      
      // Reset attempted seasons when switching to a new show
      setAttemptedSeasons(new Set());
      
      // Reset scroll position
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [movie?.id]);

  // Enhanced motion variants with ultra-smooth spring physics and optimized performance
  const containerVariants = useMemo(() => ({
    hidden: { 
      opacity: 0,
      scale: 0.98,
      y: 15,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 150, // Reduced from 200 for better performance
        damping: 20,    // Reduced from 25 for better performance
        mass: 0.5,      // Reduced from 0.6 for better performance
        duration: 0.2,  // Reduced from 0.25 for better performance
        ease: 'easeOut', // Simplified easing for better performance
      },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      y: 15,
      transition: {
        type: 'spring',
        stiffness: 200, // Reduced from 300 for better performance
        damping: 25,    // Reduced from 30 for better performance
        duration: 0.15, // Reduced from 0.2 for better performance
        ease: 'easeIn', // Simplified easing for better performance
      },
    },
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { 
      y: 6,  // Reduced from 8 for better performance
      opacity: 0,
      scale: 0.98,
      filter: 'blur(0px)', // Removed blur for better performance
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 200, // Reduced from 250 for better performance
        damping: 20,    // Reduced from 25 for better performance
        mass: 0.6,      // Reduced from 0.7 for better performance
        duration: 0.15, // Reduced from 0.2 for better performance
        ease: 'easeOut', // Simplified easing for better performance
      },
    },
    exit: {
      y: -4, // Reduced from -6 for better performance
      opacity: 0,
      scale: 0.98,
      filter: 'blur(0px)', // Removed blur for better performance
      transition: {
        type: 'spring',
        stiffness: 250, // Reduced from 350 for better performance
        damping: 25,    // Reduced from 30 for better performance
        duration: 0.1,  // Reduced from 0.15 for better performance
        ease: 'easeIn', // Simplified easing for better performance
      },
    },
  }), []);



  // 🚀 OPTIMIZED: Ultra-performance image optimization with aggressive memory management
  useEffect(() => {
    const optimizeImages = () => {
      if (!isMountedRef.current) return; // Prevent execution if unmounted
      
      const images = document.querySelectorAll('img');
      const isDesktop = window.innerWidth > 1024;
      
      images.forEach(img => {
        // Set loading="lazy" for better performance
        if (!img.loading) {
          img.loading = 'lazy';
        }
        
        // Ultra-aggressive image optimization for better performance
        if (isDesktop) {
          img.style.imageRendering = 'optimizeSpeed';
          img.style.imageRendering = '-webkit-optimize-contrast';
          img.style.willChange = 'auto'; // Reduce GPU memory usage
          img.style.transform = 'translateZ(0)'; // Force hardware acceleration
          img.style.backfaceVisibility = 'hidden'; // Reduce rendering overhead
          // Additional desktop optimizations to prevent hanging
          img.style.transition = 'none'; // Remove transitions for better performance
          img.style.filter = 'none'; // Remove filters for better performance
        }
      });
    };
    
    let timeoutId = setTimeout(optimizeImages, 200); // Faster execution
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null; // Clear reference to prevent memory leaks
      }
    };
  }, []);

  // 🚀 FIXED: Auto-regenerate preview without infinite loops and proper cleanup
  useEffect(() => {
    // Auto-regenerate preview when editing and config changes
    if (!showShareSheet || !sharePanelExpanded) return;
    if (shareRegenTimeoutRef.current) clearTimeout(shareRegenTimeoutRef.current);
    shareRegenTimeoutRef.current = setTimeout(async () => {
      try {
        if (!isMountedRef.current) return; // Prevent execution if unmounted
        setIsGeneratingShare(true);
        // Call createShareCardBlob directly to avoid dependency issues
        const blob = await createShareCardBlob(movieDetails, shareConfig);
        if (!isMountedRef.current) return; // Check again after async operation
        setIsGeneratingShare(false);
        if (blob) {
          const url = URL.createObjectURL(blob);
          if (prevShareUrlRef.current) URL.revokeObjectURL(prevShareUrlRef.current);
          prevShareUrlRef.current = url;
          setShareImageUrl(url);
        }
      } catch (error) {
        console.warn('[MovieDetailsOverlay] Failed to generate share image:', error);
        if (isMountedRef.current) {
          setIsGeneratingShare(false);
        }
      }
    }, 200);
    return () => {
      if (shareRegenTimeoutRef.current) {
        clearTimeout(shareRegenTimeoutRef.current);
        shareRegenTimeoutRef.current = null;
      }
    };
  }, [shareConfig, showShareSheet, sharePanelExpanded]); // Removed movieDetails dependency to prevent infinite loops

  // 🚀 FIXED: handleToggleShareEdit with memory leak prevention and proper cleanup
  const handleToggleShareEdit = useCallback(() => {
    if (!sharePanelExpanded) {
      // Enter edit: expand width first, then reveal editor
      setSharePanelExpanded(true);
      setIsShareEditing(true);
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setShowShareEditor(true);
        }
      }, 120);
      // Store timer for cleanup
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = timer;
    } else {
      // Exit edit: hide editor first, then collapse width
      setShowShareEditor(false);
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setSharePanelExpanded(false);
          setIsShareEditing(false);
        }
      }, 220);
      // Store timer for cleanup
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = timer;
    }
  }, [sharePanelExpanded]);

  // --- Share card helpers (no external deps) ---
  const loadImage = (src) => new Promise((resolve, reject) => {
    if (!src) return reject(new Error('No src'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    try { img.referrerPolicy = 'no-referrer'; } catch {}
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
  const resolveTmdbUrl = (path, size = 'w780') => {
    if (!path) return null;
    if (typeof path !== 'string') return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      // Force proxy even if absolute TMDB URL to avoid CORS
      const m = path.match(/\/t\/p\/(w\d+|original)(\/.*)$/);
      if (m && m[1] && m[2]) {
        const apiBaseAbs = (typeof window !== 'undefined' && window.__API_BASE__) || '/api';
        // Note the double slash after image to preserve leading slash in backend replacement
        return `${apiBaseAbs}/tmdb/image//t/p/${m[1]}${m[2]}`;
      }
      return path;
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    // Try backend proxy to avoid CORS/tls issues
    const apiBase = (typeof window !== 'undefined' && window.__API_BASE__) || '/api';
    // Use double slash to keep leading slash when backend does replace('/image/', '')
    return `${apiBase}/tmdb/image//t/p/${size}${normalized}`;
  };

  const drawMultilineText = (ctx, text, x, y, maxWidth, lineHeight, maxLines) => {
    if (!text) return y;
    const words = text.split(' ');
    let line = '';
    let lines = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[n] + ' ';
        y += lineHeight;
        lines++;
        if (lines >= maxLines - 1) {
          // ellipsis for the rest
          const remaining = words.slice(n).join(' ');
          let truncated = '';
          for (let i = 0; i < remaining.length; i++) {
            const m = ctx.measureText(truncated + remaining[i] + '...').width;
            if (m > maxWidth) break;
            truncated += remaining[i];
          }
          ctx.fillText((truncated + '...').trim(), x, y);
          return y + lineHeight;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
    return y + lineHeight;
  };

  const withRoundedRect = (ctx, x, y, w, h, r, drawFn) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();
    try { drawFn && drawFn(); } finally { ctx.restore(); }
  };
  const createShareCardBlob = async (details, config = shareConfig) => {
    try {
      const isLandscape = (config?.layout === 'landscape');
      const width = isLandscape ? 1920 : 1080;
      const height = isLandscape ? 1080 : 1920;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Background
      const themes = {
        dark: ['#0f1114', '#1a1d24'],
        noir: ['#0e0e0f', '#191a1d'],
        twilight: ['#0c1020', '#161a2a'],
        midnight: ['#0b0d12', '#141821'],
        light: ['#f5f7fb', '#e9edf5']
      };
      const [c1, c2] = themes[config.theme] || themes.dark;
      const startColor = config.solidColorStart || c1;
      const endColor = config.solidColorEnd || c2;

      if (config.backgroundMode === 'solid') {
        ctx.fillStyle = startColor;
        ctx.fillRect(0, 0, width, height);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, startColor);
        bgGrad.addColorStop(1, endColor);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Dark vignette for better image contrast
      const vignette = ctx.createRadialGradient(width/2, height/2, Math.min(width,height)/3, width/2, height/2, Math.max(width,height)/1.2);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Subtle accent bar
      const accent = ctx.createLinearGradient(0, 0, width, 0);
      accent.addColorStop(0, 'rgba(255,255,255,0.06)');
      accent.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, width, 10);

      // Backdrop background image
      const backdropPath = details?.backdrop_path || details?.backdrop;
      if (config.backgroundMode === 'image' && backdropPath) {
        try {
          const backdropUrl = resolveTmdbUrl(backdropPath, 'w1280');
          const backdrop = await loadImage(backdropUrl);
          const ratio = backdrop.width / backdrop.height;
          const targetH = height;
          const targetW = targetH * ratio;
          const dx = (width - targetW) / 2;
          ctx.globalAlpha = (config.backgroundImageOpacity ?? 0.45);
          ctx.drawImage(backdrop, dx, 0, targetW, targetH);
          ctx.globalAlpha = 1;
        } catch {}
      }

      // Layout constants
      const contentPaddingX = isLandscape ? 120 : 80;
      const contentW = width - contentPaddingX * 2;
      let y = isLandscape ? 100 : 120;

      // Top branding (website name + icon) - Centered, larger, icon and title in one line, vertically aligned
      if ((config.showBranding ?? true)) {
        // Calculate sizes
        const logoSize = isLandscape ? 64 : 56;
        const textFontSize = isLandscape ? 38 : 36;
        const spacing = isLandscape ? 18 : 14; // space between icon and text

        // Prepare text
        const brandText = 'Streamr';
        ctx.font = `800 ${textFontSize}px ui-sans-serif, system-ui`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const textMetrics = ctx.measureText(brandText);
        const textWidth = textMetrics.width;
        const textActualHeight = textFontSize; // Approximate, since canvas doesn't provide actual height

        // Vertically align icon and text: use the larger of logoSize and text height
        const lineHeight = Math.max(logoSize, textActualHeight);

        // Total width of icon + spacing + text
        const totalWidth = logoSize + spacing + textWidth;

        // Center horizontally
        const centerX = width / 2;
        // Center vertically at a visually pleasing Y (top area)
        const brandY = isLandscape ? 56 : 48;

        // The baseline for vertical alignment: align both icon and text to the center of the line
        const lineCenterY = brandY;

        // Icon position (vertically centered in line)
        const logoX = centerX - (totalWidth / 2);
        const logoY = lineCenterY - (logoSize / 2);

        // Text position (vertically centered in line)
        const textX = logoX + logoSize + spacing;
        const textY = lineCenterY;

        // Draw icon with fallback
        try {
          const logoPath = (config.theme === 'light') ? '/icon-dark.svg' : '/icon.svg';
          const logo = await loadImage(logoPath);
          ctx.globalAlpha = 0.97;
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          ctx.globalAlpha = 1;
        } catch (e) {
          // Fallback to a simple geometric shape if icon fails to load
          console.debug('Icon load failed, using fallback shape:', e.message);
          ctx.globalAlpha = 0.97;
          ctx.fillStyle = config.textColor || '#FFFFFF';
          ctx.fillRect(logoX, logoY, logoSize, logoSize);
          ctx.globalAlpha = 1;
        }

        // Draw text
        ctx.fillStyle = config.textColor || '#FFFFFF';
        ctx.font = `800 ${textFontSize}px ui-sans-serif, system-ui`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(brandText, textX, textY);
      }

      // Title and metadata (top, centered) with top margin
      // Add margin at top
      const topMargin = 64 * (config.spacingScale || 1); // You can adjust this value as needed
      y += topMargin;

      ctx.fillStyle = config.textColor || '#FFFFFF';
      const titleFontSize = Math.max(42, Math.min(96, (config.titleSize || 72) * (isLandscape ? 0.85 : 1)));
      const titleLineHeight = Math.max(50, Math.min(110, titleFontSize + 6));
      ctx.font = `800 ${titleFontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      const title = details?.title || details?.name || 'Untitled';
      ctx.textAlign = (config.titleAlign === 'left') ? 'left' : 'center';
      const titleX = (config.titleAlign === 'left' || isLandscape) ? contentPaddingX : (width / 2);
      let titleBottom = drawMultilineText(ctx, title, titleX, y, Math.min(isLandscape ? contentW * 0.8 : 920, contentW), titleLineHeight, 2);
      // Meta uses the chosen text color directly
      ctx.fillStyle = config.textColor || '#FFFFFF';
      ctx.font = '500 26px ui-sans-serif, system-ui';
      const yr = details?.release_date ? new Date(details.release_date).getFullYear() : '';
      const runtime = details?.runtime ? `${details.runtime}m` : '';
      const voteAvg = typeof details?.vote_average === 'number'
        ? details.vote_average
        : (typeof details?.rating === 'number' ? details.rating : null);
      const rating = voteAvg != null && (config.showRating ?? true) ? `${voteAvg.toFixed(1)}/10` : '';
      const metaParts = [
        (config.showYear ?? true) ? yr : '',
        (config.showRuntime ?? true) ? runtime : '',
        rating ? `★ ${rating}` : ''
      ].filter(Boolean);
      const meta = metaParts.join(' • ');
      const metaY = titleBottom + 4 * (config.spacingScale || 1);
      ctx.textAlign = ((config.metaAlign === 'left') || isLandscape) ? 'left' : 'center';
      const metaX = ((config.metaAlign === 'left') || isLandscape) ? contentPaddingX : (width / 2);
      ctx.fillText(meta, metaX, metaY);
      ctx.textAlign = 'left';
      y = metaY + (isLandscape ? 36 : 56) * (config.spacingScale || 1);

      // Poster (content image)
      const posterPath = (config.imageSource === 'backdrop') ? null : (details?.poster_path || details?.poster);
      const selectedPoster = (config.imageSource === 'backdrop') ? backdropPath : posterPath;
      if (selectedPoster || backdropPath) {
        try {
          const posterUrl = resolveTmdbUrl(selectedPoster, 'w780') || resolveTmdbUrl(backdropPath, 'w780');
          const poster = await loadImage(posterUrl);
          if (isLandscape) {
            const areaW = Math.min(contentW * 0.52, 1000);
            const areaH = Math.min(height - y - 120, 560);
            const px = width - contentPaddingX - areaW;
            const py = y;
            withRoundedRect(ctx, px, py, areaW, areaH, 24, () => {
              ctx.drawImage(poster, px, py, areaW, areaH);
            });
            y = py + areaH + 30;
          } else {
            const maxW = width - 2 * contentPaddingX;
            const posterW = Math.min(maxW, 840);
            const posterH = posterW * 1.5;
            const px = (width - posterW) / 2;
            const py = y + 20;
            // subtle glass frame with rounded corners
            withRoundedRect(ctx, px - 18, py - 18, posterW + 36, posterH + 36, (config.posterFrameRadius ?? 28), () => {
              ctx.fillStyle = `rgba(255,255,255,${(config.posterFrameOpacity ?? 0.07)})`;
              ctx.fillRect(px - 18, py - 18, posterW + 36, posterH + 36);
            });
            withRoundedRect(ctx, px, py, posterW, posterH, (config.posterCornerRadius ?? 24), () => {
              ctx.drawImage(poster, px, py, posterW, posterH);
            });
            // soft shadow
            ctx.globalAlpha = (config.posterShadowStrength ?? 0.25);
            ctx.fillStyle = '#000';
            withRoundedRect(ctx, px, py + posterH - 10, posterW, 20, 24, () => {
              ctx.fillRect(px, py + posterH - 10, posterW, 20);
            });
            ctx.globalAlpha = 1;
            y = py + posterH + 40;
          }
        } catch {
          const areaW = isLandscape ? Math.min(contentW * 0.52, 1000) : Math.min(width - 2 * contentPaddingX, 840);
          const areaH = isLandscape ? Math.min(height - y - 120, 560) : areaW * 1.5;
          const px = isLandscape ? (width - contentPaddingX - areaW) : ((width - areaW) / 2);
          const py = y + 20;
          const phGrad = ctx.createLinearGradient(px, py, px, py + areaH);
          phGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
          phGrad.addColorStop(1, 'rgba(255,255,255,0.03)');
          withRoundedRect(ctx, px, py, areaW, areaH, 24, () => {
            ctx.fillStyle = phGrad;
            ctx.fillRect(px, py, areaW, areaH);
          });
          y = py + areaH + 30;
        }
      }

      // Overview (configurable lines) uses chosen text color directly
      ctx.fillStyle = config.textColor || '#FFFFFF';
      ctx.font = '400 30px ui-sans-serif, system-ui';
      const overviewTop = y;
      const lines = Math.max(1, Math.min(4, (config && typeof config.overviewLines === 'number') ? config.overviewLines : 2));
      y = drawMultilineText(ctx, details?.overview || '', contentPaddingX, y, isLandscape ? contentW * 0.62 : contentW, 42, lines);
      // No shadow/fade overlay as requested
      y += 20;

      // Genres chips
      if ((config.showGenres ?? true) && Array.isArray(details?.genres) && details.genres.length) {
        // Chip text uses chosen text color; chip bg/border adapt subtly
        const base = config.textColor || '#FFFFFF';
        // simple luminance heuristic
        const hex = (base || '#ffffff').replace('#','');
        const r = parseInt(hex.substring(0,2),16) || 255;
        const g = parseInt(hex.substring(2,4),16) || 255;
        const b = parseInt(hex.substring(4,6),16) || 255;
        const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
        const isLight = luminance > 0.7;
        ctx.fillStyle = config.textColor || '#FFFFFF';
        ctx.font = '500 24px ui-sans-serif, system-ui';
        let gx = contentPaddingX;
        const gy = y;
        const gap = 14;
        details.genres.slice(0, Math.max(0, Math.min(8, config.maxGenres ?? 5))).forEach((g) => {
          const label = g.name || '';
          const padX = 16, padY = 9;
          const w = ctx.measureText(label).width + padX * 2;
          // chip bg with border
          withRoundedRect(ctx, gx, gy, w, 38, 18, () => {
            ctx.fillStyle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)';
            ctx.fillRect(gx, gy, w, 38);
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 1;
            ctx.strokeRect(gx + 0.5, gy + 0.5, w - 1, 38 - 1);
          });
          // text
          ctx.fillStyle = config.textColor || '#FFFFFF';
          ctx.fillText(label, gx + padX, gy + padY - 2);
          gx += w + gap;
        });
        y += 56;
      }

      return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.92));
    } catch {
      return null;
    }
  };
  // Virtualization: show only first 20 cast/similar, with Show More
  const [castLimit, setCastLimit] = useState(20);
  const [similarLimit, setSimilarLimit] = useState(20);
  const [castSearchTerm, setCastSearchTerm] = useState("");
  const handleShowMoreCast = useCallback(() => setCastLimit(lim => lim + 20), []);
  const handleShowMoreSimilar = useCallback(() => setSimilarLimit(lim => lim + 20), []);
  // Add state to control how many rows of cast are shown
  const [castRowsShown, setCastRowsShown] = useState(1);

  // 🆕 NEW: Performance-optimized virtualization with adaptive limits
  const [optimizedLimits, setOptimizedLimits] = useState({
    cast: 20,
    similar: 20,
    increment: 20
  });

  // Fixed: Set optimized limits once on mount to prevent infinite loops
  useEffect(() => {
    setOptimizedLimits({
      cast: 20,
      similar: 20,
      increment: 20
    });
  }, []); // Empty dependency array - runs only once on mount

  // Performance-optimized show more handlers
  const handleOptimizedShowMoreCast = useCallback(() => {
    setCastLimit(lim => lim + optimizedLimits.increment);
  }, [optimizedLimits.increment]);

  const handleOptimizedShowMoreSimilar = useCallback(() => {
    setSimilarLimit(lim => lim + optimizedLimits.increment);
  }, [optimizedLimits.increment]);

  // 🚀 OPTIMIZED: Ultra-performance stagger animation for list items
  const staggerContainerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.005, // Much faster for better performance
        delayChildren: 0.01,    // Much faster for better performance
        type: 'spring',
        stiffness: 200,         // Reduced for better performance
        damping: 25             // Reduced for better performance
      }
    }
  }), []);

  const staggerItemVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: 4,  // Reduced from 8 for better performance
      scale: 0.98,
      filter: 'blur(0px)', // Removed blur for better performance
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 200,         // Reduced for better performance
        damping: 20,            // Reduced for better performance
        duration: 0.15,         // Reduced for better performance
        ease: 'easeOut'         // Simplified easing for better performance
      }
    }
  }), []);
  
  // Desktop: Ultra-simplified animation variants to prevent hanging
  const desktopStaggerItemVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.1,          // Much faster for better performance
        ease: 'easeOut'
      }
    }
  }), []);
  
  // 🆕 NEW: Intersection observer for performance-optimized animations
  const useIntersectionObserver = (options = {}) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);
    const ref = useRef(null);
    
    useEffect(() => {
      const element = ref.current;
      if (!element) return;
      
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !hasIntersected) {
          setIsIntersecting(true);
          setHasIntersected(true);
        }
      }, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      });
      
      observer.observe(element);
      
      return () => observer.disconnect();
    }, [hasIntersected, options]);
    
    return [ref, isIntersecting];
  };

  // 🆕 NEW: Performance-optimized intersection observer with reduced overhead
  const useOptimizedIntersectionObserver = (options = {}) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);
    const ref = useRef(null);
    const observerRef = useRef(null);
    
    useEffect(() => {
      const element = ref.current;
      if (!element) return;
      
      const isDesktop = window.innerWidth > 1024;
      
      // Desktop: Skip intersection observer to prevent hanging
      if (isDesktop) {
        setIsIntersecting(true);
        setHasIntersected(true);
        return;
      }
      

      
      observerRef.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !hasIntersected) {
          setIsIntersecting(true);
          setHasIntersected(true);
        }
      }, {
        threshold: 0.05, // Reduced threshold for better performance
        rootMargin: '30px', // Reduced margin for better performance
        ...options
      });
      
      observerRef.current.observe(element);
      
      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, [hasIntersected, options]);
    
    return [ref, isIntersecting];
  };
  
  // 🆕 NEW: Allow full animations on all devices
  const prefersReducedMotion = false; // Always allow full animations
  
  // 🆕 NEW: Use full animation variants on all devices
  const getAdaptiveVariants = useCallback((baseVariants) => {
    // Always return full animations - no device constraints
    return baseVariants;
  }, []);
  
  // 🆕 NEW: Debounced animation system for performance optimization
  const useDebouncedAnimation = (delay = 16) => {
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const timeoutRef = useRef(null);
    
    const triggerAnimation = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setShouldAnimate(true);
      }, delay);
    }, [delay]);
    
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);
    
    return [shouldAnimate, triggerAnimation];
  };

  // 🆕 NEW: Performance-optimized debounced animation with adaptive timing
  const useAdaptiveDebouncedAnimation = (baseDelay = 16) => {
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const timeoutRef = useRef(null);
    
    // Simplified delay without performance monitoring
    const adaptiveDelay = baseDelay;
    
    const triggerAnimation = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setShouldAnimate(true);
      }, adaptiveDelay);
    }, [adaptiveDelay]);
    
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);
    
    return [shouldAnimate, triggerAnimation];
  };

  // 🆕 SIMPLIFIED: Basic animation variants without performance monitoring
  const getPerformanceOptimizedVariants = useCallback(() => {
    // Always return full animations - no performance constraints
    return {
      container: containerVariants,
      item: itemVariants
    };
  }, [containerVariants, itemVariants]);

  // 🚀 OPTIMIZED: Ultra-performance button animation variants
  const buttonVariants = useMemo(() => ({
    initial: { scale: 1, filter: ensureValidFilter('brightness(1)') },
    hover: { 
      scale: 1.005, // Much smaller for better performance
      filter: ensureValidFilter('brightness(1.01)'), // Much smaller for better performance
      transition: {
        type: 'spring',
        stiffness: 200,         // Reduced for better performance
        damping: 15,            // Reduced for better performance
        duration: 0.06,         // Much faster for better performance
      }
    },
    tap: { 
      scale: 0.998,             // Much smaller for better performance
      filter: ensureValidFilter('brightness(1)'),
      transition: {
        type: 'spring',
        stiffness: 300,         // Reduced for better performance
        damping: 20,            // Reduced for better performance
        duration: 0.03,         // Much faster for better performance
      }
    }
  }), []);

  // 🚀 OPTIMIZED: Ultra-performance text reveal animation variants
  const textRevealVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      x: 2,  // Reduced from 4 for better performance
      filter: 'blur(0px)'        // Removed blur for better performance
    },
    visible: { 
      opacity: 1, 
      x: 0, 
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 300,           // Reduced for better performance
        damping: 25,              // Reduced for better performance
        duration: 0.1,            // Much faster for better performance
        ease: 'easeOut',          // Simplified easing for better performance
      }
    }
  }), []);

  // 🚀 OPTIMIZED: Ultra-performance image animation variants
  const imageVariants = useMemo(() => ({
    initial: { 
      opacity: 0,
      scale: 1.002,              // Much smaller for better performance
      filter: 'blur(0px)'        // Removed blur for better performance
    },
    loaded: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 200,           // Reduced for better performance
        damping: 20,              // Reduced for better performance
        duration: 0.2,            // Much faster for better performance
        ease: 'easeOut',          // Simplified easing for better performance
      }
    }
  }), []);

  // 🚀 OPTIMIZED: Ultra-performance card animation variants
  const cardVariants = useMemo(() => ({
    initial: { 
      scale: 1,
      filter: ensureValidFilter('brightness(1)')
    },
    hover: { 
      scale: 1.004,             // Much smaller for better performance
      filter: ensureValidFilter('brightness(1.005)'), // Much smaller for better performance
      transition: {
        type: 'spring',
        stiffness: 200,          // Reduced for better performance
        damping: 20,             // Reduced for performance
        duration: 0.06,          // Much faster for better performance
      }
    },
    tap: {
      scale: 0.999,              // Much smaller for better performance
      filter: ensureValidFilter('brightness(1)'),
      transition: {
        type: 'spring',
        stiffness: 250,          // Reduced for better performance
        damping: 25,             // Reduced for better performance
        duration: 0.03,          // Much faster for better performance
      }
    }
  }), []);

  // Fade in animation variants for smooth element transitions
  const fadeInVariants = useMemo(() => ({
    hidden: { 
      opacity: 0,
      y: 6,
      scale: 0.98
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        duration: 0.2,
        ease: 'easeOut'
      }
    },
    exit: {
      opacity: 0,
      y: -6,
      scale: 0.98,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration: 0.15,
        ease: 'easeIn'
      }
    }
  }), []);
  // 🚀 OPTIMIZED: Ultra-performance slide up animation variants
  const slideUpVariants = useMemo(() => ({
    hidden: { 
      opacity: 0,
      y: 8,   // Reduced for better performance
      filter: 'blur(0px)'        // Removed blur for better performance
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        duration: 0.2,            // Reduced for better performance
        ease: 'easeOut'           // Simplified easing for better performance
      }
    },
    exit: {
      opacity: 0,
      y: -8,                      // Reduced for better performance
      filter: 'blur(0px)',        // Removed blur for better performance
      transition: {
        type: 'spring',
        stiffness: 250,
        damping: 25,
        duration: 0.15,           // Reduced for better performance
        ease: 'easeIn'
      }
    }
  }), []);

  // 🚀 OPTIMIZED: Ultra-performance motion props for utility animations
  const fadeInMotionProps = useMemo(() => ({
    initial: { opacity: 0, y: 4, filter: 'blur(0px)' },  // Reduced values for better performance
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { 
      type: 'spring',
      stiffness: 200,             // Reduced for better performance
      damping: 15,                // Reduced for better performance
      duration: 0.15,             // Much faster for better performance
      ease: 'easeOut',            // Simplified easing for better performance
    },
  }), []);

  const slideUpMotionProps = useMemo(() => ({
    initial: { y: 6, opacity: 0, filter: 'blur(0px)' }, // Reduced values for better performance
    animate: { y: 0, opacity: 1, filter: 'blur(0px)' },
    transition: {
      type: 'spring',
      stiffness: 200,             // Reduced for better performance
      damping: 15,                // Reduced for better performance
      duration: 0.2,              // Much faster for better performance
      ease: 'easeOut',            // Simplified easing for better performance
    },
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
      try {
        if (existingStyle && existingStyle.parentNode && document.head.contains(existingStyle)) {
          existingStyle.parentNode.removeChild(existingStyle);
        }
      } catch (error) {
        console.warn('[MovieDetailsOverlay] Failed to remove scrollbar style:', error);
        // Fallback: try to remove even if contains check failed
        try {
          if (existingStyle && existingStyle.parentNode) {
            existingStyle.parentNode.removeChild(existingStyle);
          }
        } catch (fallbackError) {
          console.warn('[MovieDetailsOverlay] Fallback scrollbar style removal also failed:', fallbackError);
        }
      }
    };
  }, []);

  // 🚀 NEW: Enhanced memoization with performance optimization
  const movieStats = React.useMemo(() => {
    if (!movieDetails) return null;
    
    // Cache expensive operations
    const rating = movieDetails.vote_average;
    const releaseDate = movieDetails.release_date;
    const runtime = movieDetails.runtime;
    const budget = movieDetails.budget;
    const revenue = movieDetails.revenue;
    
    return {
      formattedRating: rating 
        ? (typeof rating === 'number' 
            ? rating.toFixed(1) 
            : parseFloat(rating).toFixed(1))
        : 'N/A',
      formattedReleaseDate: releaseDate 
        ? (() => {
            const date = new Date(releaseDate);
            return isNaN(date) ? 'N/A' : date.toLocaleDateString();
          })()
        : 'N/A',
      formattedRuntime: runtime 
        ? (() => {
            const hours = Math.floor(runtime / 60);
            const minutes = runtime % 60;
            return `${hours}h ${minutes}m`;
          })()
        : 'N/A',
      formattedBudget: budget 
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1
          }).format(budget)
        : 'N/A',
      formattedRevenue: revenue 
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1
          }).format(revenue)
        : 'N/A'
    };
  }, [movieDetails?.vote_average, movieDetails?.release_date, movieDetails?.runtime, movieDetails?.budget, movieDetails?.revenue]);

  // Get mobile/desktop state early to avoid initialization errors
  const { isMobile, isTablet, isDesktop } = useOptimizedIsMobile();

  // Determine how many cast per row based on screen size
  const castPerRow = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 5; // lg
      if (window.innerWidth >= 640) return 4; // sm/md
      return 2; // xs
    }
    return 5;
  }, [isMobile, isTablet, isDesktop]);

  // 🆕 NEW: Performance-optimized cast per row calculation with adaptive sizing
  const optimizedCastPerRow = React.useMemo(() => {
    // Reduce complexity on low-performance devices
    return castPerRow;
  }, [castPerRow, isDesktop, isTablet]);
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
    return filteredCast.slice(0, castRowsShown * optimizedCastPerRow);
  }, [movieDetails?.cast, castSearchTerm, castRowsShown, optimizedCastPerRow]);

  const optimizedSimilarMovies = React.useMemo(() => {
    if (!similarMovies || !Array.isArray(similarMovies)) return [];
    return similarMovies.slice(0, similarLimit);
  }, [similarMovies, similarLimit]);
  
  // Streaming state
  const [showStreamingPlayer, setShowStreamingPlayer] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState(null);
  const [currentService, setCurrentService] = useState(DEFAULT_STREAMING_SERVICE);
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  
  // Cast Details state
  const [selectedCastMember, setSelectedCastMember] = useState(null);
  const [showCastDetails, setShowCastDetails] = useState(false);
  
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
  
  // Add state to track when episodes are intentionally empty vs when they're still loading
  // This will help the UI make better decisions about what to show and prevent flashing
  const [showEmptyState, setShowEmptyState] = useState(false);
  
  // Track which seasons we've already attempted to load episodes for to prevent infinite loops
  const [attemptedSeasons, setAttemptedSeasons] = useState(new Set());

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
  
  // Effect to manage empty state display with delay to prevent flashing
  useEffect(() => {
    if (seasons.length > 0 && episodes.length === 0 && !isSeasonsLoading && !isEpisodesLoading) {
      // Only show empty state after a delay to prevent flashing
      const timer = setTimeout(() => {
        setShowEmptyState(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowEmptyState(false);
    }
  }, [seasons.length, episodes.length, isSeasonsLoading, isEpisodesLoading]);

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
    return filteredCast.slice(0, castRowsShown * optimizedCastPerRow);
  }, [movieDetails, castSearchTerm, castRowsShown, optimizedCastPerRow]);

  // Memoize similarToShow (already memoized, but add comment)
  // Memoize the visible similar movies list for performance
  const similarToShow = React.useMemo(() => {
    if (!similarMovies) return [];
    return similarMovies.slice(0, similarLimit);
  }, [similarMovies, similarLimit]);
  // FIXED: Prefetch next page of similar movies without infinite loops
  useEffect(() => {
    if (hasMoreSimilar && !isSimilarLoadingMore && similarMovies.length >= similarLimit && movie?.id) {
      const movieType = movie.media_type || movie.type || 'movie';
      const nextPage = similarMoviesPage + 1;
      
      // Use requestIdleCallback for background prefetching when possible
      const prefetchSimilar = () => {
        if (!isMountedRef.current) return; // Prevent execution if unmounted
        
        getSimilarMovies(movie.id, movieType, nextPage).then(data => {
          if (!isMountedRef.current) return; // Check again after async operation
          
          if (data?.results?.length > 0) {
            setSimilarMovies(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMovies = data.results.filter(m => !existingIds.has(m.id));
              return [...prev, ...newMovies];
            });
          }
        });
      };
      
      if (window.requestIdleCallback) {
        window.requestIdleCallback(prefetchSimilar, { timeout: 5000 });
      } else {
        // Fallback to setTimeout for older browsers
        setTimeout(prefetchSimilar, 1000);
      }
    }
  }, [movie?.id, similarMoviesPage, hasMoreSimilar, isSimilarLoadingMore, similarMovies.length, similarLimit]); // Added all necessary dependencies

  // Removed duplicate similar movies loading effect to prevent infinite loops

  // Memoized callback for toggling showAllCast
  const handleToggleShowAllCast = useCallback(() => setShowAllCast(v => !v), []);

  // 🚀 SIMPLIFIED: Basic scroll handler without complex optimizations
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const scrollTop = scrollContainerRef.current.scrollTop;
    setScrollY(scrollTop);
  }, []);

  // 🚀 FIXED: Scroll event listener without infinite loops
  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    
    if (!currentRef || loading) return;
    
    // Inline scroll handler to avoid function dependency
    const scrollHandler = () => {
      if (currentRef && isMountedRef.current) {
        const scrollTop = currentRef.scrollTop;
        setScrollY(scrollTop);
      }
    };
    
    // Simple scroll handler with passive listener
    currentRef.addEventListener('scroll', scrollHandler, { passive: true });
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', scrollHandler);
      }
    };
  }, [loading]); // Removed handleScroll dependency

  // Simplified loadMoreSimilar
  const loadMoreSimilar = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isSimilarLoadingMore || !hasMoreSimilar || !movie?.id) {
      return;
    }
    
    const movieType = movie.media_type || movie.type || 'movie';
    const nextPage = similarMoviesPage + 1;
    
    setIsSimilarLoadingMore(true);
    
    try {
      const data = await getSimilarMovies(movie.id, movieType, nextPage);
      
      if (data?.results?.length > 0) {
        setSimilarMovies(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMovies = data.results.filter(m => 
            m && m.id && !existingIds.has(m.id)
          );
          return [...prev, ...newMovies];
        });
        
        setSimilarMoviesPage(nextPage);
        setHasMoreSimilar(data.page < data.total_pages);
      } else {
        setHasMoreSimilar(false);
      }
    } catch (error) {
      console.warn('Failed to load more similar movies:', error);
      setHasMoreSimilar(false);
    } finally {
      setIsSimilarLoadingMore(false);
    }
  }, [isSimilarLoadingMore, hasMoreSimilar, similarMoviesPage, movie?.id, movie?.type]);

  // 🚀 FIXED: Intersection observer without infinite loops
  useEffect(() => {
    if (loading) return;
    let observer = null;
    const currentLoader = similarLoaderRef.current;
    
    if (currentLoader && isMountedRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreSimilar && isMountedRef.current) {
            // Inline the loadMoreSimilar logic to avoid function dependency
            if (!isSimilarLoadingMore && movie?.id) {
              const movieType = movie.media_type || movie.type || 'movie';
              const nextPage = similarMoviesPage + 1;
              
              setIsSimilarLoadingMore(true);
              getSimilarMovies(movie.id, movieType, nextPage)
                .then(data => {
                  if (!isMountedRef.current) return; // Check if still mounted
                  
                  if (data?.results?.length > 0) {
                    setSimilarMovies(prev => {
                      const existingIds = new Set(prev.map(m => m.id));
                      const newMovies = data.results.filter(m => 
                        m && m.id && !existingIds.has(m.id)
                      );
                      return [...prev, ...newMovies];
                    });
                    
                    setSimilarMoviesPage(nextPage);
                    setHasMoreSimilar(data.page < data.total_pages);
                  } else {
                    setHasMoreSimilar(false);
                  }
                })
                .catch(error => {
                  if (!isMountedRef.current) return; // Check if still mounted
                  console.warn('Failed to load more similar movies:', error);
                  setHasMoreSimilar(false);
                })
                .finally(() => {
                  if (!isMountedRef.current) return; // Check if still mounted
                  setIsSimilarLoadingMore(false);
                });
            }
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
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
  }, [loading, hasMoreSimilar, movie?.id, similarMoviesPage, isSimilarLoadingMore]); // Removed loadMoreSimilar dependency

  // 🚀 FIXED: Memoize click outside and escape handlers with stable references
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

  // 🚀 FIXED: Proper event listener cleanup with stable references
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

  // Memoize expensive computations to prevent unnecessary re-renders
  const memoizedMovieDetails = useMemo(() => movieDetails, [movieDetails?.id, movieDetails?.title]);
  const memoizedCredits = useMemo(() => credits, [credits?.cast?.length, credits?.crew?.length]);
  const memoizedVideos = useMemo(() => videos, [videos?.results?.length]);
  const memoizedSimilarMovies = useMemo(() => similarMovies, [similarMovies?.length]);

  // Memoize expensive calculations
  const isResumeAvailable = useMemo(() => {
    if (!movie || !movie.id || !viewingProgress) return false;
    const contentType = movie.type || movie.media_type || 'movie';
    // Movie: resume if any progress > 0 and < 100
    if (contentType === 'movie') {
      const entry = viewingProgress[`movie_${movie.id}`];
      return !!(entry && typeof entry.progress === 'number' && entry.progress > 0 && entry.progress < 100);
    }
    // TV: check specific episode if provided
    if (contentType === 'tv') {
      const season = movie.season;
      const episode = movie.episode;
      if (season && episode) {
        const epEntry = viewingProgress[`tv_${movie.id}_${season}_${episode}`];
        if (epEntry && typeof epEntry.progress === 'number' && epEntry.progress > 0 && epEntry.progress < 100) {
          return true;
        }
      }
      // Fallback: any episode of this show has progress
      for (const [key, val] of Object.entries(viewingProgress)) {
        if (key.startsWith(`tv_${movie.id}_`) && val && typeof val.progress === 'number' && val.progress > 0 && val.progress < 100) {
          return true;
        }
      }
    }
    return false;
  }, [movie?.id, movie?.type, movie?.media_type, movie?.season, movie?.episode, viewingProgress]);

  const [retryCount, setRetryCount] = useState(0);

  // 🚀 FIXED: Simplified fetchMovieData with desktop-specific optimizations and infinite loop prevention
  const fetchMovieData = useCallback(async (attempt = 0) => {
    if (!movie?.id) {
      console.warn('Invalid movie data provided to fetchMovieData');
      return;
    }
    
    const movieType = movie.media_type || movie.type || 'movie';
    const isDesktop = window.innerWidth > 1024;

    // Track latest request to avoid stale updates
    const requestId = Date.now();
    latestRequestRef.current = requestId;

    const fetchStartTime = performance.now();

    try {
      // Reset states only if mounted
      if (!isMountedRef.current || latestRequestRef.current !== requestId) return;
      setLoading(true);
      setError(null);

      // Desktop: Sequential API calls to prevent overwhelming the system
      let details, credits, videos, similarData;
      
      if (isDesktop) {
        // Desktop: Sequential loading to prevent hanging
        details = await getMovieDetails(movie.id, movieType);
        // Add small delay between calls to prevent hanging
        await new Promise(resolve => setTimeout(resolve, 100));
        credits = await getMovieCredits(movie.id, movieType);
        await new Promise(resolve => setTimeout(resolve, 100));
        videos = await getMovieVideos(movie.id, movieType);
        await new Promise(resolve => setTimeout(resolve, 100));
        similarData = await getSimilarMovies(movie.id, movieType, 1);
      } else {
        // Mobile: Parallel API calls for better performance
        const [movieDetails, movieCredits, movieVideos, similar] = await Promise.allSettled([
          getMovieDetails(movie.id, movieType),
          getMovieCredits(movie.id, movieType),
          getMovieVideos(movie.id, movieType),
          getSimilarMovies(movie.id, movieType, 1)
        ]);

        details = movieDetails.status === 'fulfilled' ? movieDetails.value : null;
        credits = movieCredits.status === 'fulfilled' ? movieCredits.value : null;
        videos = movieVideos.status === 'fulfilled' ? movieVideos.value : null;
        similarData = similar.status === 'fulfilled' ? similar.value : null;
      }

      if (!details) {
        throw new Error('Movie details not found or unavailable');
      }

      // Cache with memory check
      setCachedDetails(movie.id, movieType, details);
      
      // Extract trailer
      const trailer = videos?.results?.find(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
      )?.key;
      
      if (trailer) {
        setCachedTrailer(movie.id, movieType, trailer);
        preloadYouTubePlayer();
      }
      
      // Set data with desktop-specific optimizations
      if (!isMountedRef.current || latestRequestRef.current !== requestId) return;
      setMovieDetails(trailer ? { ...details, trailer } : details);
      setCredits(credits || { cast: [], crew: [] });
      setVideos(videos || { results: [] });
      
      // Desktop: Limit similar movies to prevent hanging
      if (isDesktop) {
        setSimilarMovies((similarData?.results || []).slice(0, 6)); // Limit to 6 for desktop to prevent hanging
        setHasMoreSimilar(false); // Disable pagination on desktop
      } else {
        setSimilarMovies(similarData?.results || []);
        setHasMoreSimilar(similarData ? (similarData.page < similarData.total_pages) : false);
      }
      
      setIsCastLoading(false);
      setIsSimilarLoading(false);
      setRetryCount(0);

    } catch (err) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, err);
      
      if (attempt < 1 && isMountedRef.current) { // Simple retry logic
        setRetryCount(attempt + 1);
        const retryTimer = setTimeout(() => {
          if (isMountedRef.current && latestRequestRef.current === requestId) {
            fetchMovieData(attempt + 1);
          }
        }, 1000);
        
        // Store retry timer for cleanup
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = retryTimer;
        return;
      } else {
        if (isMountedRef.current && latestRequestRef.current === requestId) {
          setError('Failed to load movie details. Please try again later.');
        }
      }
    } finally {
      if (isMountedRef.current && latestRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [movie?.id, movie?.media_type, movie?.type]); // Removed loading dependency to prevent infinite loops
  // 🚀 FIXED: Ultra-enhanced data fetching with infinite loop prevention and proper cleanup
  useEffect(() => {
    // Register cache cleanup with memory manager
    const unregisterCleanup = memoryOptimizationService.registerCleanupCallback(() => {
      clearCache();
    }, 'MovieDetailsOverlay');

    // Preload YouTube player component when component mounts
    preloadYouTubePlayer();

    // Mark mounted
    isMountedRef.current = true;

    // Prevent unnecessary fetches with comprehensive validation
    if (!movie?.id) {
      console.debug('Fetch blocked: No movie ID');
      return;
    }
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';

    // 🎯 Enhanced cache check with memory optimization
    const cachedDetails = getCachedDetails(movie.id, movieType);
    if (cachedDetails) {
      setMovieDetails(cachedDetails);
      setLoading(false);
      
      // 🚀 FIXED: Start background refresh for fresh data with proper cleanup
      const backgroundRefreshTimer = setTimeout(() => {
        if (isMountedRef.current) {
          fetchMovieData(0);
        }
      }, 1000); // Increased delay for better performance and to prevent hanging
      
      // 🚀 FIXED: Cleanup background refresh timer with memory leak prevention
      return () => {
        if (backgroundRefreshTimer) {
          clearTimeout(backgroundRefreshTimer);
        }

        if (unregisterCleanup) {
          unregisterCleanup();
        }
      };
    }

    // Track fetch performance for optimization insights
    const fetchStartTime = performance.now();

    // Execute fetch with enhanced performance monitoring
    fetchMovieData(0).finally(() => {
      const fetchDuration = performance.now() - fetchStartTime;
      
      // Enhanced performance metrics logging
      if (fetchDuration > 2000) {
        console.warn(`⚠️ Slow fetch detected: ${fetchDuration.toFixed(2)}ms`);
      }
    });

    // 🚀 FIXED: Enhanced cleanup: unsubscribe from real-time updates and memory manager with memory leak prevention
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (unregisterCleanup) {
        unregisterCleanup();
      }
    };
  }, [movie?.id, movie?.media_type, movie?.type, fetchMovieData]); // Removed loading dependency to prevent infinite loops

  // 🎯 FIXED: Enhanced retry handler with infinite loop prevention
  const handleRetry = useCallback(() => {
    // Validate current state before retry
    if (!movie?.id) {
      console.warn('Retry blocked: Invalid movie data');
      return;
    }
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';
    
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
     
    });
  }, [movie?.id, movie?.media_type, movie?.type, fetchMovieData]);

  // 🆕 FIXED: Performance-optimized error boundary with adaptive retry and infinite loop prevention
  const handleOptimizedRetry = useCallback(() => {
    // Validate current state before retry
    if (!movie?.id) {
      console.warn('Retry blocked: Invalid movie data');
      return;
    }
    
    // Simplified retry strategy
    setRetryCount(0);
    setError(null);
    setLoading(true);
    
    // Simplified retry logic - call fetchMovieData directly to avoid circular dependency
    fetchMovieData(0);
  }, [movie?.id, movie?.media_type, movie?.type, fetchMovieData]);

  // 🧹 Ultra-Comprehensive cleanup with enhanced memory leak prevention and performance optimization
  useEffect(() => {
    // Track unmount for diagnostics
    let isUnmounted = false;
    let cleanupTimers = [];
    let cleanupAnimationFrames = [];
    let cleanupAbortControllers = [];
    let cleanupEventListeners = [];
    let cleanupPromises = [];

    // Helper: Log state reset for debugging
    const logReset = (name) => {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[MovieDetailsOverlay] Resetting: ${name}`);
      }
    };

    // 🚀 FIXED: Enhanced safe state setter with aggressive memory optimization
    const safeSet = (setter, value, name) => {
      if (isUnmounted) return;
      try {
        setter(value);
        logReset(name);
        
        // Note: Force garbage collection removed to prevent memory leaks
        // Let the browser handle memory management naturally
      } catch (e) {
         
        console.warn(`[MovieDetailsOverlay] Failed to reset ${name}:`, e);
      }
    };

    // Helper: Add cleanup timer with validation
    const addCleanupTimer = (timerId) => {
      if (timerId && typeof timerId === 'number') {
        cleanupTimers.push(timerId);
      }
    };

    // Helper: Add cleanup animation frame with validation
    const addCleanupAnimationFrame = (frameId) => {
      if (frameId && typeof frameId === 'number') {
        cleanupAnimationFrames.push(frameId);
      }
    };

    // Helper: Add cleanup abort controller with validation
    const addCleanupAbortController = (controller) => {
      if (controller && typeof controller.abort === 'function') {
        cleanupAbortControllers.push(controller);
      }
    };

    // Helper: Add cleanup event listener with validation
    const addCleanupEventListener = (target, type, handler) => {
      if (target && type && handler) {
        cleanupEventListeners.push({ target, type, handler });
      }
    };

    // Helper: Add cleanup promise with validation
    const addCleanupPromise = (promise) => {
      if (promise && typeof promise.then === 'function') {
        cleanupPromises.push(promise);
      }
    };
    // 🚀 FIXED: Enhanced cleanup function with optimized state reset
    const cleanup = () => {
      isUnmounted = true;

      // Reset all state variables to prevent memory leaks with enhanced validation
      safeSet(setMovieDetails, null, "movieDetails");
      safeSet(setCredits, null, "credits");
      safeSet(setVideos, null, "videos");
      safeSet(setSimilarMovies, [], "similarMovies");
      safeSet(setLoading, true, "loading");
      safeSet(setError, null, "error");
      safeSet(setShowTrailer, false, "showTrailer");
      safeSet(setRetryCount, 0, "retryCount");

      // Reset UI states with enhanced cleanup
      safeSet(setShowAllCast, false, "showAllCast");
      safeSet(setCastLimit, 20, "castLimit");
      safeSet(setSimilarLimit, 20, "similarLimit");
      safeSet(setScrollY, 0, "scrollY");
      safeSet(setCastSearchTerm, "", "castSearchTerm");
      safeSet(setCastRowsShown, 1, "castRowsShown");

      // 🚀 FIXED: Enhanced timer cleanup with validation and optimization
      cleanupTimers.forEach(timerId => {
        try {
          if (typeof timerId === 'number') {
            clearTimeout(timerId);
            clearInterval(timerId);
          }
        } catch (e) {
           
          console.warn("[MovieDetailsOverlay] Failed to clear timer:", timerId, e);
        }
      });
      cleanupTimers = [];
      logReset("cleanupTimers");

      // Clear only the timers we actually created to prevent memory leaks
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // 🚀 FIXED: Enhanced animation frame cleanup with validation and optimization
      cleanupAnimationFrames.forEach(frameId => {
        try {
          if (typeof frameId === 'number') {
            cancelAnimationFrame(frameId);
          }
        } catch (e) {
           
          console.warn("[MovieDetailsOverlay] Failed to cancel animation frame:", frameId, e);
        }
      });
      cleanupAnimationFrames = [];
      logReset("cleanupAnimationFrames");

      // 🚀 FIXED: Enhanced abort controller cleanup with validation and optimization
      cleanupAbortControllers.forEach(controller => {
        try {
          if (controller && typeof controller.abort === 'function') {
            controller.abort();
          }
        } catch (e) {
           
          console.warn("[MovieDetailsOverlay] Failed to abort controller:", e);
        }
      });
      cleanupAbortControllers = [];
      logReset("cleanupAbortControllers");

      // Enhanced event listener cleanup with validation
      cleanupEventListeners.forEach(({ target, type, handler }) => {
        try {
          if (target && typeof target.removeEventListener === 'function') {
            target.removeEventListener(type, handler);
          }
        } catch (e) {
           
          console.warn("[MovieDetailsOverlay] Failed to remove event listener:", type, e);
        }
      });
      cleanupEventListeners = [];
      logReset("cleanupEventListeners");

      // Enhanced promise cleanup with validation
      cleanupPromises.forEach(promise => {
        try {
          if (promise && typeof promise.cancel === 'function') {
            promise.cancel();
          }
        } catch (e) {
           
          console.warn("[MovieDetailsOverlay] Failed to cancel promise:", e);
        }
      });
      cleanupPromises = [];
      logReset("cleanupPromises");

      // Enhanced scroll container cleanup
      if (scrollContainerRef.current) {
        try {
          scrollContainerRef.current.scrollTop = 0;
          scrollContainerRef.current.scrollLeft = 0;
          logReset("scrollContainerRef.scrollTop");
        } catch (e) {
           
          console.warn("[MovieDetailsOverlay] Failed to reset scrollContainerRef:", e);
        }
      }





        // 🚀 SIMPLIFIED: Basic cleanup without memory monitoring
        try {
          // Clear any remaining DOM references safely
          [overlayRef, contentRef, playerRef, similarLoaderRef, scrollContainerRef].forEach(ref => {
            if (ref.current) {
              ref.current = null;
            }
          });
          
        } catch (e) {
          console.warn("[MovieDetailsOverlay] Failed to perform cleanup:", e);
        }



      // Diagnostics: Log cleanup completion
      if (process.env.NODE_ENV === "development") {
         
        console.debug("[MovieDetailsOverlay] Cleanup complete.");
      }
    };

    // Return cleanup function for React to execute on unmount
    return cleanup;
  }, [movie?.id, movie?.media_type, movie?.type]); // Include movie dependencies to ensure proper cleanup on movie change

  // 🚀 FIXED: Ultra-enhanced scroll lock with memory leak prevention
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

    // 🚀 FIXED: Enhanced cleanup with comprehensive state restoration and memory leak prevention
    return () => {
      try {
        // Only restore styles if component is still mounted and document exists
        if (isMountedRef.current && document.body && document.body.style) {
          // Restore all original styles
          Object.entries(originalStyles).forEach(([property, value]) => {
            if (document.body.style[property] !== undefined) {
              document.body.style[property] = value;
            }
          });
          
          // Force a reflow to ensure styles are applied
          document.body.offsetHeight;
        }
      } catch (error) {
        console.warn('[MovieDetailsOverlay] Failed to restore body styles:', error);
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount/unmount

  // 🚀 Enhanced trailer handlers with accessibility, analytics, and robust state management
  const handleTrailerClick = useCallback(() => {
    setIsTrailerLoading(true);
    setShowTrailer(true);

    // Preload YouTube player component immediately when trailer is clicked
    preloadYouTubePlayer();

    // Check for cached trailer data first
    if (movie?.id) {
      const movieType = movie.media_type || movie.type || 'movie';
      const cachedTrailer = getCachedTrailer(movie.id, movieType);
      
      if (cachedTrailer && movieDetails && !movieDetails.trailer) {
        // Update movie details with cached trailer
        setMovieDetails(prev => prev ? { ...prev, trailer: cachedTrailer } : prev);
      }
    }

    // Accessibility: Move focus to trailer player after opening
    setTimeout(() => {
      if (!isMountedRef.current) return;
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
  }, [movie, playerRef, movieDetails]);

  const handleCloseTrailer = useCallback((e) => {
    
    // Prevent event bubbling to avoid closing the main overlay
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setShowTrailer(false);

    // Pause and reset trailer video if possible
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.pauseVideo === "function") {
          playerRef.current.pauseVideo();
        }
        // Optionally reset to start
        if (typeof playerRef.current.seekTo === "function") {
          playerRef.current.seekTo(0);
        }
      } catch (error) {
        // Handle AbortError silently - this is expected when component unmounts
        if (error.name !== 'AbortError') {
          console.warn('[MovieDetailsOverlay] Error pausing video:', error);
        }
      }
    }

    // Accessibility: Return focus to trailer button
    setTimeout(() => {
      if (!isMountedRef.current) return;
      try {
        const trailerBtn = document.querySelector('[data-trailer-button]');
        if (trailerBtn && typeof trailerBtn.focus === 'function') {
          trailerBtn.focus();
        }
      } catch (error) {
        console.warn('[MovieDetailsOverlay] Failed to focus trailer button:', error);
      }
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

  // 🚀 FIXED: Cleanup YouTube player on unmount with memory leak prevention
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.pauseVideo === "function") {
            playerRef.current.pauseVideo();
          }
          if (typeof playerRef.current.stopVideo === "function") {
            playerRef.current.stopVideo();
          }
          if (typeof playerRef.current.destroy === "function") {
            playerRef.current.destroy();
          }
        } catch (error) {
          // Handle AbortError silently - this is expected when component unmounts
          if (error.name !== 'AbortError') {
            console.warn('[MovieDetailsOverlay] Error cleaning up YouTube player:', error);
          }
        } finally {
          // Always clear reference to prevent memory leaks
          playerRef.current = null;
        }
      }
    };
  }, []);
  // Streaming handlers
  const handleStreamingClick = useCallback(() => {
    if (!movie) return;
    
    // Check if episode selection is needed for TV shows
    if (needsEpisodeSelection(movie)) {
      setShowEpisodeSelector(true);
      return;
    }
    
    // Track that user started watching this movie
    if ((movie.media_type || movie.type || 'movie') === 'movie') {
      startWatchingMovie(movie);
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
  }, [movie, currentService, startWatchingMovie]);

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

  // Handle cast member click
  const handleCastMemberClick = useCallback((person) => {
    setSelectedCastMember(person);
    setShowCastDetails(true);
  }, []);

  // Handle cast details close
  const handleCastDetailsClose = useCallback(() => {
    setShowCastDetails(false);
    setSelectedCastMember(null);
  }, []);
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
      name: similarMovie.name || similarMovie.title || 'Untitled', // Ensure both title and name for TV shows
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

    // Enhanced TV show detection and data enrichment for similar content
    if (movieData.type === 'tv' || 
        (similarMovie.name && !similarMovie.title) || 
        (similarMovie.media_type === 'tv')) {
      console.log('[Similar Content] Enhanced TV show data for:', movieData.title || movieData.name);
      
      // Ensure TV shows have the correct structure
      movieData.media_type = 'tv';
      movieData.type = 'tv';
      
      // Add TV-specific fields if missing
      if (!movieData.name && movieData.title) {
        movieData.name = movieData.title;
      }
      if (!movieData.title && movieData.name) {
        movieData.title = movieData.name;
      }
    }

    // Enhanced: Log the processed movie data for debugging
    console.log('[Similar Content] Processed movie data:', {
      id: movieData.id,
      title: movieData.title,
      name: movieData.name,
      type: movieData.type,
      media_type: movieData.media_type,
      isTVShow: movieData.type === 'tv' || movieData.media_type === 'tv'
    });

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
  
  // Watchlist feedback state
  const [watchlistFeedback, setWatchlistFeedback] = useState(null);

  // Compute current optimistic state
  const isOptimisticallyInWatchlist =
    optimisticWatchlist !== null ? optimisticWatchlist : isInWatchlist(movie.id);

  // Optimistic UI for watchlist with feedback
  const handleWatchlistClick = (e) => {
    e.stopPropagation();
    // Save previous state for rollback
    const prev = isInWatchlist(movie.id);
    if (isOptimisticallyInWatchlist) {
      setOptimisticWatchlist(false);
      // Set feedback message
      setWatchlistFeedback('Removed from list');
      try {
        removeFromWatchlist(movie.id);
      } catch (err) {
        setOptimisticWatchlist(prev);
        setWatchlistError('Failed to update watchlist.');
        setTimeout(() => setWatchlistError(null), 2000);
      }
    } else {
      setOptimisticWatchlist(true);
      // Set feedback message
      setWatchlistFeedback('Added to list!');
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
        setTimeout(() => setWatchlistFeedback(null), 2000);
      }
    }
    
    // Clear feedback message after delay
    setTimeout(() => {
      setWatchlistFeedback(null);
    }, 2000);
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
      if (!isMountedRef.current) return;
      setLikeAnimation(false);
    }, 600);
    
    // Clear feedback message after delay with proper cleanup
    const feedbackTimeout = setTimeout(() => {
      if (!isMountedRef.current) return;
      setLikeFeedback(null);
    }, 2000);
    
    // Here you would typically make an API call to save the like state
    // For now, we'll just log it
    
  }, [isLiked, movie, isMobile]);

  // Reset optimistic state if movie changes
  useEffect(() => {
    setOptimisticWatchlist(null);
    setWatchlistError(null);
    setIsLiked(false);
    setLikeAnimation(false);
    setLikeFeedback(null);
    setWatchlistFeedback(null);
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
    const requestId = latestRequestRef.current;
    if (!movie || !movie.id) {
      if (isMountedRef.current && latestRequestRef.current === requestId) {
        setError('Invalid movie data.');
        setMovieDetails(null);
        setBasicLoading(false);
      }
      if (process.env.NODE_ENV === "development") {
         
        console.warn('[MovieDetailsOverlay] fetchBasicInfo: Invalid movie object:', movie);
      }
      return;
    }
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';
    let fetchStart;
    try {
      if (isMountedRef.current && latestRequestRef.current === requestId) {
        setBasicLoading(true);
        setError(null);
      }

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
        console.debug(`[MovieDetailsOverlay] fetchBasicInfo: Fetched in ${fetchDuration.toFixed(2)}ms`);
      }
      if (fetchDuration > 2000) {
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
        if (!isMountedRef.current || latestRequestRef.current !== requestId) return;
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
        setBasicLoading(false);
        return;
      }

      // If successfully fetched details, update safely
      if (!isMountedRef.current || latestRequestRef.current !== requestId) return;
      setMovieDetails(details);
      setBasicLoading(false);

    } catch (error) {
      if (!isMountedRef.current || latestRequestRef.current !== requestId) return;
      setError('Failed to fetch basic info.');
      setBasicLoading(false);
      if (process.env.NODE_ENV === "development") {
         
        console.warn('[MovieDetailsOverlay] fetchBasicInfo failed:', error);
      }
    }
  }, [movie]);

  const fetchExtraInfo = useCallback(async () => {
    const requestId = latestRequestRef.current;
    if (!movie) return;
    
    // Use the same fallback pattern as other components
    const movieType = movie.media_type || movie.type || 'movie';
    
    setIsCastLoading(true);
    setIsSimilarLoading(true);
    setShowAllCast(false);
    setSimilarMovies([]);
    setSimilarMoviesPage(1);
    setHasMoreSimilar(true);
    
    // Reset seasons and episodes state - but preserve episodes if we're already loading them independently
    if (!isEpisodesLoading) {
      setSeasons([]);
      setCurrentSeason(null);
      setEpisodes([]);
    }
    
    try {
      const promises = [
        getMovieCredits(movie.id, movieType),
        getMovieVideos(movie.id, movieType),
        getSimilarMovies(movie.id, movieType, 1)
      ];
      
      // Seasons fetching moved to independent loading - prevents conflicts
      // if (movieType === 'tv') {
      //   promises.push(getTVSeasons(movie.id));
      // }
      
      const results = await Promise.all(promises);
      const [movieCredits, movieVideos, similar] = results;
      
      if (isMountedRef.current && latestRequestRef.current === requestId) {
        setCredits(movieCredits);
        setVideos(movieVideos);
        setSimilarMovies(similar?.results || []);
        setHasMoreSimilar(similar?.page < similar?.total_pages);
      }
      
      // Handle seasons for TV shows - DISABLED since episodes are now loaded independently
      // This prevents conflicts and flashing between independent loading and fetchExtraInfo
      /*
      if (movieType === 'tv' && rest[0]) {
        const seasonsData = rest[0];
        setSeasons(seasonsData);
        
        // Set the latest season as current (only if not already set by independent loading)
        if (seasonsData.length > 0 && !currentSeason) {
          const latestSeason = seasonsData[seasonsData.length - 1];
          setCurrentSeason(latestSeason);
          
          // Only fetch episodes if they haven't been loaded independently yet
          if (episodes.length === 0) {
            fetchSeasonEpisodes(latestSeason.season_number);
          }
        }
      }
      */
    } catch (err) {
      // Show partial data, but log error
      console.error('Failed to fetch extra info:', err);
    } finally {
      if (isMountedRef.current && latestRequestRef.current === requestId) {
        setIsCastLoading(false);
        setIsSimilarLoading(false);
      }
    }
  }, [movie]);

  // Consolidated episode loading function to prevent race conditions and flashing
  const loadEpisodesForSeason = useCallback(async (seasonNumber) => {
    if (!movie?.id || !seasonNumber || isEpisodesLoading) {
      console.log('[Episode Loading] Skipping load - conditions not met:', { 
        hasMovieId: !!movie?.id, 
        seasonNumber, 
        isEpisodesLoading 
      });
      return;
    }
    
    // Check if we've already attempted to load this season to prevent infinite loops
    if (attemptedSeasons.has(seasonNumber)) {
      console.log('[Episode Loading] Already attempted to load season:', seasonNumber, '- skipping to prevent infinite loop');
      return;
    }
    
    console.log('[Episode Loading] Loading episodes for season:', seasonNumber);
    setIsEpisodesLoading(true);
    
    // Mark this season as attempted
    setAttemptedSeasons(prev => new Set([...prev, seasonNumber]));
    
    try {
      const seasonData = await getTVSeason(movie.id, seasonNumber);
      const episodeList = seasonData.episodes || [];
      
      console.log('[Episode Loading] Successfully loaded episodes:', {
        seasonNumber,
        episodeCount: episodeList.length,
        firstEpisode: episodeList[0]?.name || 'N/A'
      });
      
      // Only update episodes if we have a valid result
      if (episodeList.length > 0) {
        setEpisodes(episodeList);
      } else {
        // Don't clear episodes if the season has no episodes - keep previous episodes
        // This prevents flashing when switching between seasons
        console.log('[Episode Loading] Season has no episodes, keeping previous episodes');
      }
      
    } catch (err) {
      console.error('[Episode Loading] Failed to fetch season episodes:', err);
      
      // Don't clear episodes on error - this prevents flashing
      // Instead, keep the previous episodes and just log the error
      console.warn('[Episode Loading] Keeping previous episodes due to error');
      
      // Show user-friendly error message
      if (import.meta.env.DEV) {
        console.error('Episode loading error details:', {
          movieId: movie.id,
          seasonNumber,
          error: err.message,
          stack: err.stack
        });
      }
    } finally {
      setIsEpisodesLoading(false);
    }
  }, [movie?.id, isEpisodesLoading, attemptedSeasons]);

  // Keep the old function for backward compatibility but mark as deprecated
  const fetchSeasonEpisodes = useCallback(async (seasonNumber) => {
    console.warn('[DEPRECATED] fetchSeasonEpisodes is deprecated, use loadEpisodesForSeason instead');
    return loadEpisodesForSeason(seasonNumber);
  }, [loadEpisodesForSeason]);

  // 🚀 FIXED: TV content loading without infinite loops
  useEffect(() => {
    // Enhanced TV show detection with fallbacks
    const isTVShow = movie?.media_type === 'tv' || 
                     movie?.type === 'tv' || 
                     (movie?.id && movie?.name && !movie?.title); // Fallback: if it has 'name' instead of 'title', likely TV
    
    if (isTVShow && movie?.id) {
      console.log('[TV Detection] Detected TV show:', {
        movieId: movie.id,
        title: movie.title || movie.name,
        mediaType: movie.media_type,
        type: movie.type,
        hasName: !!movie.name,
        hasTitle: !!movie.title
      });
      
      // Prevent multiple simultaneous loading requests
      if (isEpisodesLoading) return;
      
      // Load seasons and episodes immediately for TV shows, don't wait for other content
      const loadTVContent = async () => {
        try {
          console.log('[TV Loading] Starting to load TV content for:', movie.id);
          const seasonsData = await getTVSeasons(movie.id);
          
                      if (seasonsData && seasonsData.length > 0) {
              console.log('[TV Loading] Successfully loaded seasons:', seasonsData.length);
              setSeasons(seasonsData);
              
              // Always set current season for new TV shows to ensure episodes load automatically
              const latestSeason = seasonsData[seasonsData.length - 1];
              setCurrentSeason(latestSeason);
              
              // Load episodes for the latest season automatically
              if (import.meta.env.DEV) {
                console.log('[Episode Loading] Auto-loading episodes for season:', latestSeason.season_number);
              }
              
              // Load episodes for the latest season
              await loadEpisodesForSeason(latestSeason.season_number);
            } else {
              console.warn('[TV Loading] No seasons found for TV show:', movie.id);
              setSeasons([]);
              // Don't clear episodes here - keep them to prevent flashing
              // setEpisodes([]);
            }
        } catch (err) {
          console.error('[TV Loading] Failed to load TV content independently:', err);
          // Set empty states on error to prevent UI from showing stale data
          setSeasons([]);
          // Don't clear episodes here - keep them to prevent flashing
          // setEpisodes([]);
        }
      };
      
      loadTVContent();
    } else if (movie?.id) {
      console.log('[TV Detection] Not a TV show:', {
        movieId: movie.id,
        title: movie.title || movie.name,
        mediaType: movie.media_type,
        type: movie.type,
        hasName: !!movie.name,
        hasTitle: !!movie.title
      });
    }
  }, [movie?.id, movie?.media_type, movie?.type, movie?.name, movie?.title]); // Added name/title for better detection

  const handleSeasonChange = useCallback((season) => {
    if (import.meta.env.DEV) {
      console.log('[Season Change] User manually selected season:', season.season_number);
    }
    setCurrentSeason(season);
    
    // Load episodes for the new season
    if (movie?.id && season?.season_number) {
      // Inline the episode loading logic to avoid function dependency
      if (!isEpisodesLoading) {
        const loadEpisodes = async () => {
          try {
            const seasonData = await getTVSeason(movie.id, season.season_number);
            const episodeList = seasonData.episodes || [];
            // Only update episodes if we have a valid result
            if (episodeList.length > 0) {
              setEpisodes(episodeList);
            } else {
              // Don't clear episodes if the season has no episodes - keep previous episodes
              console.log('[Season Change] Season has no episodes, keeping previous episodes');
            }
            // Mark this season as attempted
            setAttemptedSeasons(prev => new Set([...prev, season.season_number]));
          } catch (err) {
            console.error('[Episode Loading] Failed to fetch season episodes:', err);
            // Don't clear episodes on error - this prevents flashing
            console.warn('[Season Change] Keeping previous episodes due to error');
            // Mark this season as attempted even on error
            setAttemptedSeasons(prev => new Set([...prev, season.season_number]));
          }
        };
        loadEpisodes();
      }
    }
  }, [movie?.id, isEpisodesLoading]); // Removed loadEpisodesForSeason dependency

  // Debug effect to monitor episodes state changes
  useEffect(() => {
    if (import.meta.env.DEV && movie?.media_type === 'tv') {
      console.log('[Episode Debug] Episodes state changed:', {
        episodeCount: episodes.length,
        isEpisodesLoading,
        currentSeason: currentSeason?.season_number,
        movieId: movie.id
      });
    }
  }, [episodes.length, isEpisodesLoading, currentSeason, movie?.id, movie?.media_type]);
  // Fallback effect to retry episode loading if episodes are empty but we have a season
  useEffect(() => {
    if (movie?.media_type === 'tv' && 
        movie?.id && 
        currentSeason?.season_number && 
        episodes.length === 0 && 
        !isEpisodesLoading) {
      
      console.log('[Episode Fallback] No episodes loaded, retrying for season:', currentSeason.season_number);
      
      // Small delay to prevent immediate retry
      const retryTimer = setTimeout(() => {
        if (episodes.length === 0 && !isEpisodesLoading) {
          console.log('[Episode Fallback] Retrying episode load...');
          loadEpisodesForSeason(currentSeason.season_number);
        }
      }, 1000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [movie?.id, movie?.media_type, currentSeason, episodes.length, isEpisodesLoading, loadEpisodesForSeason]);

  // Enhanced fallback: Retry TV content loading if seasons are empty but movie is detected as TV
  useEffect(() => {
    if (movie?.id && 
        (movie?.media_type === 'tv' || movie?.type === 'tv' || (movie?.name && !movie?.title)) &&
        seasons.length === 0 && 
        !isEpisodesLoading) {
      
      console.log('[TV Fallback] No seasons loaded, retrying TV content load for:', movie.id);
      
      // Small delay to prevent immediate retry
      const retryTimer = setTimeout(() => {
        if (seasons.length === 0 && !isEpisodesLoading) {
          console.log('[TV Fallback] Retrying TV content load...');
          
          // Force reload TV content
          const loadTVContent = async () => {
            try {
              const seasonsData = await getTVSeasons(movie.id);
              if (seasonsData && seasonsData.length > 0) {
                console.log('[TV Fallback] Successfully loaded seasons on retry:', seasonsData.length);
                setSeasons(seasonsData);
                
                if (!currentSeason) {
                  const latestSeason = seasonsData[seasonsData.length - 1];
                  setCurrentSeason(latestSeason);
                  await loadEpisodesForSeason(latestSeason.season_number);
                }
              }
            } catch (err) {
              console.error('[TV Fallback] Failed to load TV content on retry:', err);
            }
          };
          
          loadTVContent();
        }
      }, 2000); // Longer delay for TV content retry
      
      return () => clearTimeout(retryTimer);
    }
  }, [movie?.id, movie?.media_type, movie?.type, movie?.name, movie?.title, seasons.length, isEpisodesLoading, currentSeason, loadEpisodesForSeason]);

  // NEW: Force episode loading when seasons are available but episodes are empty
  useEffect(() => {
    if (movie?.id && 
        (movie?.media_type === 'tv' || movie?.type === 'tv' || (movie?.name && !movie?.title)) &&
        seasons.length > 0 && 
        currentSeason?.season_number && 
        episodes.length === 0 && 
        !isEpisodesLoading) {
      
      console.log('[Episode Force Load] Seasons available but no episodes, forcing load for season:', currentSeason.season_number);
      
      // Force load episodes for the current season
      loadEpisodesForSeason(currentSeason.season_number);
    }
  }, [movie?.id, movie?.media_type, movie?.type, movie?.name, movie?.title, seasons.length, currentSeason, episodes.length, isEpisodesLoading, loadEpisodesForSeason]);

  // NEW: Aggressive episode loading when movie changes (for similar content clicks)
  useEffect(() => {
    if (movie?.id && 
        (movie?.media_type === 'tv' || movie?.type === 'tv' || (movie?.name && !movie?.title))) {
      
      console.log('[Movie Change] TV show detected, ensuring episodes load automatically');
      
      // Small delay to allow seasons to load first
      const episodeLoadTimer = setTimeout(() => {
        if (seasons.length > 0 && currentSeason?.season_number && episodes.length === 0 && !isEpisodesLoading) {
          console.log('[Movie Change] Auto-loading episodes for season:', currentSeason.season_number);
          loadEpisodesForSeason(currentSeason.season_number);
        }
      }, 500); // Wait 500ms for seasons to load
      
      return () => clearTimeout(episodeLoadTimer);
    }
  }, [movie?.id]); // Only trigger when movie ID changes (similar content clicks)

  const handleEpisodeClick = useCallback((episode) => {
    if (!movie) return;
    
    
    
    // Track that user started watching this episode
    startWatchingEpisode(movie, episode.season_number, episode.episode_number, episode);
    
    // Update the movie object with season and episode information
    const tvShow = {
      ...movie,
      season: episode.season_number,
      episode: episode.episode_number
    };
    
    
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
      // Inline the retry logic to avoid dependency on fetchExtraInfo function
      if (!movie?.id) return;
      
      const movieType = movie.media_type || movie.type || 'movie';
      
      setIsCastLoading(true);
      setIsSimilarLoading(true);
      setShowAllCast(false);
      setSimilarMovies([]);
      setSimilarMoviesPage(1);
      setHasMoreSimilar(true);
      
      // Reset seasons and episodes state - but preserve episodes if we're already loading them independently
      if (!isEpisodesLoading) {
        setSeasons([]);
        setCurrentSeason(null);
        setEpisodes([]);
      }
      
      const promises = [
        getMovieCredits(movie.id, movieType),
        getMovieVideos(movie.id, movieType),
        getSimilarMovies(movie.id, movieType, 1)
      ];
      
      Promise.all(promises)
        .then(results => {
          if (!isMountedRef.current) return; // Check if still mounted
          
          const [movieCredits, movieVideos, similar] = results;
          
          setCredits(movieCredits);
          setVideos(movieVideos);
          setSimilarMovies(similar?.results || []);
          setHasMoreSimilar(similar?.page < similar?.total_pages);
        })
        .catch(err => {
          if (!isMountedRef.current) return; // Check if still mounted
          console.error('Failed to fetch extra info:', err);
        })
        .finally(() => {
          if (!isMountedRef.current) return; // Check if still mounted
          setIsCastLoading(false);
          setIsSimilarLoading(false);
        });
    }, [movie?.id, isEpisodesLoading]); // Removed fetchExtraInfo dependency

  // Debug: Monitor movieDetails changes
  useEffect(() => {
   
  }, [movieDetails]);
  // 🚀 PERFORMANCE OPTIMIZED: Early similar content preloading effect
  useEffect(() => {
    if (!movie?.id || !movie?.type) return;
    
    // 🚀 NEW: Trigger similar content preloading immediately when overlay opens
    const preloadSimilarContent = async () => {
      try {
        // Check if still mounted before proceeding
        if (!isMountedRef.current) return;
        
        // Preload similar content data for faster rendering
        const similarData = await getSimilarMovies(movie.id, movie.type, 1);
        
        // Check again after async operation
        if (!isMountedRef.current) return;
        
        if (similarData && Array.isArray(similarData.results)) {
          // Store in cache for immediate access by EnhancedSimilarContent
          if (window.similarContentCache && isMountedRef.current) {
            window.similarContentCache.set(`${movie.id}-${movie.type}`, {
              data: similarData.results,
              timestamp: Date.now(),
              prefetched: true
            });
          }
          
          if (import.meta.env.DEV && isMountedRef.current) {
            console.log(`🚀 Preloaded ${similarData.results.length} similar items for ${movie.title || movie.name}`);
          }
        }
      } catch (error) {
        if (!isMountedRef.current) return; // Check if still mounted
        if (import.meta.env.DEV) {
          console.warn(`Failed to preload similar content for ${movie.title || movie.name}:`, error);
        }
      }
    };
    
    // 🚀 OPTIMIZED: Use requestIdleCallback for better performance
    if (window.requestIdleCallback) {
      requestIdleCallback(preloadSimilarContent, { timeout: 500 }); // Fast timeout for immediate loading
    } else {
      setTimeout(preloadSimilarContent, 50); // Very fast fallback
    }
  }, [movie?.id, movie?.type]);

  // 🚀 FIXED: Main data fetching effect without infinite loops
  useEffect(() => {
    let isActive = true; // Prevent state updates if unmounted or movie changes rapidly
    let abortController = new AbortController();

    // Helper: Reset all relevant states for a clean slate
    const resetStates = () => {
      if (!isMountedRef.current) return; // Prevent state updates on unmounted component
      
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
        // Use refs to avoid dependency on functions
        if (isActive && movie?.id && isMountedRef.current) {
          await fetchBasicInfo();
          if (!isActive || !isMountedRef.current) return;
          await fetchExtraInfo();
        }
      } catch (err) {
        if (abortController.signal.aborted || !isMountedRef.current) {
          // Optionally log abort
          if (process.env.NODE_ENV === "development") {
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
  }, [movie?.id]); // Simplified dependencies to prevent infinite loops
  
  // 🚀 FIXED: Background refresh without infinite loops and proper cleanup
  useEffect(() => {
    if (!movie?.id || !movieDetails) return;
    
    let backgroundRefreshTimer = null;
    let isActive = true;
    
    backgroundRefreshTimer = setTimeout(() => {
      if (!isActive || !isMountedRef.current) return;
      
      // Use ref to avoid dependency on fetchMovieData function
      if (latestRequestRef.current && isMountedRef.current) {
        // Only refresh if we have a valid request ID and component is mounted
        fetchMovieData(0);
      }
    }, BACKGROUND_REFRESH_INTERVAL);
    
    return () => {
      isActive = false;
      if (backgroundRefreshTimer) {
        clearTimeout(backgroundRefreshTimer);
        backgroundRefreshTimer = null;
      }
    };
  }, [movie?.id]); // Removed movieDetails dependency to prevent infinite loops
  
  // 🚀 OPTIMIZED: Streamlined memory monitoring with improved thresholds
  useEffect(() => {
    let unregisterCleanup = null;
    let isActive = true;
    
    if (movie?.id) {
      // Memory optimizer removed to simplify monitoring
    }
    
    return () => {
      isActive = false;
      if (unregisterCleanup) {
        unregisterCleanup();
      }
    };
  }, [movie?.id]);
  
  // 🚀 OPTIMIZED: Streamlined mount/unmount memory optimization
  useEffect(() => {
    let isActive = true;
    
    // Cleanup function for unmount
    return () => {
      isActive = false;
      
      // Streamlined unmount cleanup
      try {
        // Portal cleanup is now handled by the usePortal hook
        
        // Clear any remaining timeouts
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Note: Aggressive image manipulation removed to prevent memory leaks
        // Let the browser handle image cleanup naturally
        
        if (import.meta.env.DEV) {
          console.debug('[MovieDetailsOverlay] Unmount cleanup completed');
        }
      } catch (e) {
        console.warn('[MovieDetailsOverlay] Failed to perform unmount cleanup:', e);
      }
    };
  }, []);



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

  // 🚀 ENHANCED: Advanced Portal Management with centralized coordination
  // - Centralized portal management with stacking support
  // - Enhanced accessibility and focus management
  // - Performance monitoring and memory leak prevention
  // - Portal coordination and event handling
  // - Advanced debugging and diagnostics

  // 🚀 ENHANCED: Portal focus management for accessibility
  useEffect(() => {
    if (portalReady && portalContainer) {
      // Focus the portal when it opens for accessibility
      const focusTimer = setTimeout(() => {
        focusPortal();
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [portalReady, focusPortal]);

  // 🚀 ENHANCED: Portal debugging and monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && portalReady) {
      const portalInfo = portalManagerService.getPortalInfo(portalIdActual);
      console.debug('[MovieDetailsOverlay] Portal Info:', {
        id: portalIdActual,
        zIndex: portalZIndex,
        movieId: movieDetails?.id,
        title: movieDetails?.title || movieDetails?.name,
        stackInfo: portalManagerService.getStackInfo()
      });
    }
  }, [portalReady, portalIdActual, portalZIndex, movieDetails?.id, movieDetails?.title, movieDetails?.name]);

  // Enhanced rendering check with portal readiness
  if (typeof window === "undefined" || !portalReady || !portalContainer) {
    return null;
  }
  const overlayContent = (
    <AnimatePresence>
      {/* Overlay background - parallax removed */}
      <motion.div
        className="fixed inset-0 bg-black/85 flex items-center justify-center z-[999999999] p-2 sm:p-4 contain-paint transition-none sm:mt-0"
        variants={getAdaptiveVariants(containerVariants)}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={handleClickOutside}
        tabIndex={-1}
        style={{ zIndex: 999999999 }}
      >
        {/* Main content - parallax removed */}
        <motion.div
          ref={contentRef}
          className="relative w-full max-w-6xl h-auto max-h-[calc(100vh-1rem)] z-[1000000000] sm:max-h-[95vh] bg-gradient-to-br from-[#1a1d24] to-[#121417] rounded-3xl shadow-3xl overflow-hidden flex flex-col pointer-events-auto overflow-y-auto mt-2 sm:mt-6"
          variants={getAdaptiveVariants(itemVariants)}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          style={{ 
            zIndex: 1000000000
          }}
        >
          {/* 🆕 NEW: Memory usage display for debugging */}
  
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
              {/* 🆕 SIMPLIFIED: Basic content placeholder */}
              {!contentPreRendered && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1d24] to-[#121417] z-10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4"></div>
                    <div className="h-4 bg-white/10 rounded w-32 mx-auto mb-2"></div>
                    <div className="h-3 bg-white/5 rounded w-24 mx-auto"></div>
                  </div>
                </div>
              )}
              <div className="relative h-[75vh] sm:h-[80vh]">
                {/* Desktop-only Share button at top-left */}
                <div className="hidden md:block absolute top-4 left-4 z-20">
                  <button 
                    onClick={async () => {
                      try {
                        setIsGeneratingShare(true);
                        const blob = await createShareCardBlob(movieDetails, shareConfig);
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          // Create a promise that resolves when the image is loaded
                          await new Promise((resolve, reject) => {
                            const img = new Image();
                            img.onload = resolve;
                            img.onerror = reject;
                            img.src = url;
                          });
                          setShareImageUrl(url);
                          // Set image as ready after a small delay
                          setTimeout(() => setIsImageReady(true), 150);
                          // Only open modal after image is fully loaded and rendered
                          setShowShareSheet(true);
                        }
                      } catch (error) {
                        console.error('Error generating share card:', error);
    } finally {
                        setIsGeneratingShare(false);
                      }
                    }}
                    className="group relative p-2 rounded-full overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-l-[1px] border-r-[1px] border-white/30 text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center transform-gpu will-change-transform shadow-sm shadow-black/20 hover:shadow-black/30"
                    title="Share"
                    aria-label="Share"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <div className="relative">
                      {isGeneratingShare ? (
                        <div className="animate-spin">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                      ) : (
                        /* Modern share icon (iOS-style share square with arrow) */
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-all duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12" />
                          <path d="M8 7l4-4 4 4" />
                          <path d="M5 12v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
                {movieDetails.backdrop && (
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div 
                      className="absolute inset-0"
                      variants={fadeInVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {/* Loading placeholder with smooth transition */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      />
                      
                      {/* 🚀 FIXED: Backdrop image with enhanced memory optimization */}
                      <motion.img
                        src={movieDetails.backdrop}
                        alt={movieDetails.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                        fetchpriority="high"
                        data-movie-details="true"
                        variants={imageVariants}
                        initial="initial"
                        animate="loaded"
                        onError={(e) => {
                          console.warn('Failed to load backdrop image:', e.target.src);
                          // Clear failed image to prevent memory leaks
                          if (e.target) {
                            e.target.src = '';
                            e.target.srcset = '';
                          }
                        }}

                      />
                    </motion.div>
                    
                    {/* Gradient overlay - parallax removed */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent pointer-events-none"
                      variants={fadeInVariants}
                      initial="hidden"
                      animate="visible"
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
                          variants={cardVariants}
                          initial="initial"
                          whileHover="hover"
                          whileTap="tap"
                        >
                          {/* Loading placeholder with smooth transition */}
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          />
                          
                          {/* 🚀 FIXED: Movie poster with enhanced memory optimization */}
                          <motion.img
                            src={movieDetails.image}
                            alt={movieDetails.title}
                            className="w-full h-full object-cover"
                            loading="eager"
                            decoding="async"
                            fetchpriority="high"
                            data-movie-details="true"
                            variants={imageVariants}
                            initial="initial"
                            animate="loaded"
                            onError={(e) => {
                              console.warn('Failed to load movie poster:', e.target.src);
                              // Clear failed image to prevent memory leaks
                              if (e.target) {
                                e.target.src = '';
                                e.target.srcset = '';
                              }
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
                        transition={{ 
                          duration: window.innerWidth > 1024 ? 0.15 : 0.3, 
                          delay: window.innerWidth > 1024 ? 0.2 : 0.5 
                        }}
                      >
                      {/* Action Buttons */}
                        <motion.div 
                          className="flex flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4 w-full"
                          variants={window.innerWidth > 1024 ? desktopStaggerItemVariants : staggerItemVariants}
                          initial="hidden"
                          animate="visible"
                        >
                        {/* Watch Now Button - Always show for movies, ensure mobile visibility */}
                        {((movie.media_type || movie.type || 'movie') === 'movie') && (
                          <motion.button
                            onClick={handleStreamingClick}
                            className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 text-base sm:text-base font-medium text-black bg-white flex-1 sm:flex-none w-full sm:w-auto justify-center min-w-0 transform-gpu will-change-transform"
                            variants={window.innerWidth > 1024 ? undefined : buttonVariants}
                            initial="initial"
                            whileHover={window.innerWidth > 1024 ? undefined : "hover"}
                            whileTap={window.innerWidth > 1024 ? undefined : "tap"}
                          >
                            
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
                              <span className="truncate whitespace-nowrap">{isResumeAvailable ? 'Resume' : 'Watch Now'}</span>
                            </div>
                          </motion.button>
                        )}

                        {/* Mobile Fallback Watch Now Button - Show if main button is hidden and it's a movie */}
                        {!isStreamingAvailable(movie) && ((movie.media_type || movie.type || 'movie') === 'movie') && (
                          <motion.button
                            onClick={handleStreamingClick}
                            className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 text-base sm:text-base font-medium text-black bg-white flex-1 sm:flex-none w-full sm:w-auto justify-center min-w-0 transform-gpu will-change-transform sm:hidden"
                            variants={buttonVariants}
                            initial="initial"
                            whileHover="hover"
                            whileTap="tap"
                          >
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
                              <span className="truncate whitespace-nowrap">{isResumeAvailable ? 'Resume' : 'Watch Now'}</span>
                            </div>
                          </motion.button>
                        )}

                        <motion.button 
                          data-trailer-button
                          onClick={handleTrailerClick}
                          className="group relative px-4 sm:px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 text-base sm:text-base font-medium text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10 flex-1 sm:flex-none w-full sm:w-auto justify-center min-w-0 transform-gpu will-change-transform transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm shadow-black/20"
                        >
                          {/* Animated background effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                          
                          {/* Button content */}
                          <div className="relative flex items-center gap-2 min-w-0">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110" 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                            >
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span className="truncate whitespace-nowrap">Watch Trailer</span>
                          </div>
                        </motion.button>

                        <motion.button 
                          onClick={handleWatchlistClick}
                          className={`group relative px-4 sm:px-6 py-3 rounded-full flex items-center gap-2 text-base sm:text-base font-medium overflow-hidden w-full sm:w-auto justify-center min-w-0 hidden sm:flex transform-gpu will-change-transform transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm shadow-black/20 hover:shadow-black/30 ${
                            isOptimisticallyInWatchlist
                              ? 'text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10' 
                              : 'text-white/80 overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 hover:bg-white/10'
                          }`}
                        >
                          {/* Animated background effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                          
                          {/* Button content */}
                          <div className="relative flex items-center gap-2 min-w-0">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110" 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                            >
                              {isOptimisticallyInWatchlist ? (
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                              ) : (
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                              )}
                            </svg>
                            <span className="truncate whitespace-nowrap">{isOptimisticallyInWatchlist ? 'Remove from List' : 'Add to List'}</span>
                          </div>
                        </motion.button>
                        </motion.div>

                        {/* Desktop Info Section - Rightmost */}
                        <motion.div 
                          className="hidden lg:block text-white/60 text-sm text-right"
                          variants={window.innerWidth > 1024 ? desktopStaggerItemVariants : staggerItemVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {/* Top Cast */}
                          {movieDetails.cast && movieDetails.cast.length > 0 && (
                            <div className="mb-2">
                                                              <span className="block">
                                  <span className="font-medium">Cast: </span>
                                  {movieDetails.cast.map((person, idx) => (
                                    <span 
                                      key={person.id || idx}
                                      onClick={() => handleCastMemberClick(person)}
                                      className="hover:text-white hover:cursor-pointer transition-colors duration-200"
                                    >
                                      {person.name}
                                      {idx < movieDetails.cast.length - 1 ? ', ' : ''}
                                    </span>
                                  ))}
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
                          animate="visible"
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
                              <span className="flex items-center justify-between">
                                <span className="flex-1 min-w-0 truncate">
                                  <span className="font-medium">Cast: </span>
                                  {movieDetails.cast.slice(0, 3).map((person, idx) => (
                                    <span 
                                      key={person.id || idx}
                                      onClick={() => handleCastMemberClick(person)}
                                      className="hover:text-white hover:cursor-pointer transition-colors duration-200"
                                    >
                                      {person.name}
                                      {idx < Math.min(2, movieDetails.cast.length - 1) ? ', ' : ''}
                                    </span>
                                  ))}
                                  {movieDetails.cast.length > 3 && '...'}
                                </span>
                                <button
                                  onClick={handleToggleShowAllCast}
                                  className="ml-2 p-1 hover:bg-white/10 rounded transition-colors duration-200 flex-shrink-0"
                                  title={showAllCast ? 'Show less' : 'Show all cast'}
                                >
                                  <svg 
                                    className={`w-4 h-4 text-white/60 transition-transform duration-200 ${showAllCast ? 'rotate-90' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </span>
                              
                              {/* Remaining Cast Names - Same Style */}
                              {showAllCast && movieDetails.cast.length > 3 && (
                                <motion.div 
                                  className="mt-1"
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <span className="block items-start text-left">
                                    {movieDetails.cast.slice(3).map((person, idx) => (
                                      <span 
                                        key={person.id || idx}
                                        onClick={() => handleCastMemberClick(person)}
                                        className="hover:text-white hover:cursor-pointer transition-colors duration-200"
                                      >
                                        {person.name}
                                        {idx < movieDetails.cast.slice(3).length - 1 ? ', ' : ''}
                                      </span>
                                    ))}
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      </motion.div>

                                                                                         {/* Mobile Action Buttons - Above Overview */}
                                             <motion.div 
                                               className="flex sm:hidden items-center justify-center gap-8 mt-4"
                                               variants={staggerContainerVariants}
                                               initial="hidden"
                                               animate="visible"
                                             >
                                                   {/* Add to List Button */}
                          <button 
                            onClick={handleWatchlistClick}
                            className={`group relative w-12 h-12 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden flex items-center justify-center transform-gpu will-change-transform shadow-sm shadow-black/20 hover:shadow-black/30 ${
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
                             className={`group relative w-12 h-12 rounded-full overflow-hidden backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:ring-offset-2 focus:ring-offset-black/50 transform-gpu will-change-transform shadow-sm shadow-black/20 hover:shadow-black/30 ${
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
                          <AnimatePresence mode="wait">
                            {likeFeedback && (
                              <motion.div
                                key="like-feedback"
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="absolute -top-20 left-2/5 transform -translate-x-1/2 bg-black/40 backdrop-blur-md text-white text-sm px-4 py-2 rounded-full border border-white/5 shadow-lg z-50 whitespace-nowrap"
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
                          </AnimatePresence>

                          {/* Mobile Watchlist Feedback Toast */}
                          <AnimatePresence mode="wait">
                            {watchlistFeedback && (
                              <motion.div
                                key="watchlist-feedback"
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="absolute -top-20 left-2/5 transform -translate-x-1/2 bg-black/40 backdrop-blur-md text-white text-sm px-4 py-2 rounded-full border border-white/5 shadow-lg z-50 whitespace-nowrap"
                              >
                                <div className="flex items-center gap-2">
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-4 w-4 text-green-400" 
                                    fill="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                  </svg>
                                  <span>{watchlistFeedback}</span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Share Button */}
                          <button 
                            onClick={async () => {
                              try {
                                setIsGeneratingShare(true);
                                const blob = await createShareCardBlob(movieDetails, shareConfig);
                                if (blob) {
                                  const url = URL.createObjectURL(blob);
                                  // Create a promise that resolves when the image is loaded
                                  await new Promise((resolve, reject) => {
                                    const img = new Image();
                                    img.onload = resolve;
                                    img.onerror = reject;
                                    img.src = url;
                                  });
                                  setShareImageUrl(url);
                                  // Set image as ready after a small delay
                                  setTimeout(() => setIsImageReady(true), 150);
                                  // Only open modal after image is fully loaded and rendered
                                  setShowShareSheet(true);
                                }
                              } catch (error) {
                                console.error('Error generating share card:', error);
                              } finally {
                                setIsGeneratingShare(false);
                              }
                            }}
                            className="group relative w-12 h-12 rounded-full overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center transform-gpu will-change-transform"
                            title="Share"
                          >
                            {/* Animated background effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            
                            {/* Button content */}
                            <div className="relative">
                              {isGeneratingShare ? (
                                <div className="animate-spin">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </div>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-all duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                              )}
                            </div>
                          </button>

                           {/* Report Button */}
                           <button 
                             onClick={() => {
                               // Handle report functionality
                             
                               // You could add a modal or navigation to report page
                             }}
                             className="group relative w-12 h-12 rounded-full overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-t-[1px] border-b-[1px] border-white/30 text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center transform-gpu will-change-transform shadow-sm shadow-black/20 hover:shadow-black/30"
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
              {/* Share Sheet Modal */}
              <AnimatePresence>
              {showShareSheet && isImageReady && (
                <motion.div
                  key="share-overlay"
                  className="fixed inset-0 z-[1000000001] flex items-end md:items-center justify-center bg-black/60"
                  onClick={() => {
                    setShowShareSheet(false);
                    setIsImageReady(false);
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.div
                    key="share-panel"
                    className="w-full md:w-auto bg-[#121417] border border-white/10 rounded-t-2xl md:rounded-2xl p-4 md:p-6 origin-bottom md:origin-center transform-gpu"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ y: isMobile ? 100 : 12, opacity: 0, scale: 1, width: isMobile ? '100%' : 520 }}
                    animate={{ y: 0, opacity: 1, scale: 1, width: isMobile ? '100%' : (sharePanelExpanded ? 1020 : 520) }}
                    exit={{ y: isMobile ? 100 : 14, opacity: 0, scale: 1, width: isMobile ? '100%' : 520 }}
                    transition={{ type: 'spring', stiffness: isMobile ? 300 : 360, damping: isMobile ? 34 : 32, mass: 0.85 }}
                    style={{ maxHeight: isMobile ? '80vh' : undefined, overflowY: isMobile ? 'auto' : undefined }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Share</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Edit toggle icon */}
                        <button
                          onClick={handleToggleShareEdit}
                          className="p-2 rounded-full hover:bg-white/20 text-white transition-colors group"
                          title={sharePanelExpanded ? 'Done' : 'Edit'}
                          aria-label={sharePanelExpanded ? 'Done' : 'Edit'}
                        >
                          {sharePanelExpanded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/80 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <PencilSquareIcon className="h-5 w-5 text-white/80 group-hover:text-white" />
                          )}
                        </button>
                        {/* Close */}
                        <button className="p-2 rounded-full hover:bg-white/10" onClick={() => {
                          setShowShareSheet(false);
                          setIsImageReady(false);
                        }} aria-label="Close share" title="Close">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                      </div>
                    </div>
                                      <motion.div
                    className="mb-4 grid gap-3"
                    animate={{ gridTemplateColumns: isMobile ? '1fr' : (sharePanelExpanded ? 'minmax(0,1fr) 420px' : '1fr') }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'grid' }}
                  >
                      <motion.div
                        className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] flex items-center justify-center aspect-[3/4] relative"
                        animate={{ x: isShareEditing ? -6 : 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      >
                        {isGeneratingShare && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-white/80 text-sm md:text-base">Generating preview...</div>
                          </div>
                        )}
                        <AnimatePresence mode="wait">
                          {!isGeneratingShare && shareImageUrl && (
                            <motion.img
                              key={shareImageUrl}
                              src={shareImageUrl}
                              alt="Share preview"
                              className="w-full h-full object-contain"
                              initial={{ opacity: 0, y: isMobile ? 6 : 6, scale: 1, filter: 'none' }}
                              animate={{ opacity: 1, y: 0, scale: 1, filter: 'none' }}
                              exit={{ opacity: 0, y: isMobile ? 4 : 4, scale: 1, filter: 'none' }}
                              transition={{ duration: isMobile ? 0.2 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                      <AnimatePresence>
                        {showShareEditor && (
                          <motion.div
                            key="share-editor"
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5 text-white/80 max-h-[70vh] overflow-y-auto share-editor-scroll"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.2 }}
                          >
                            {/* Quick Presets Section */}
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-white/80">Quick Presets</h4>
                                <div className="flex gap-2">
                                  <button
                                    className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                    onClick={() => setShareConfig((c) => ({
                                      ...c,
                                      layout: 'portrait', theme: 'dark', backgroundMode: 'image', imageSource: 'auto', textColor: '#FFFFFF', titleSize: 72,
                                      overviewLines: 2, showRating: true, titleAlign: 'center', metaAlign: 'center', spacingScale: 1.0,
                                      showGenres: true, maxGenres: 5
                                    }))}
                                  >Default</button>
                                  <button
                                    className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                    onClick={() => setShareConfig((c) => ({
                                      ...c,
                                      layout: 'portrait', theme: 'noir', backgroundMode: 'solid', solidColorStart: '#0b0b0c', solidColorEnd: '#0b0b0c',
                                      imageSource: 'poster', textColor: '#FFFFFF', titleSize: 80, overviewLines: 1, spacingScale: 0.9,
                                      titleAlign: 'left', metaAlign: 'left', showGenres: false
                                    }))}
                                  >Poster Focus</button>
                                  <button
                                    className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                    onClick={() => setShareConfig((c) => ({
                                      ...c,
                                      layout: 'portrait', theme: 'light', backgroundMode: 'gradient', solidColorStart: '#f7f9fc', solidColorEnd: '#e9edf5',
                                      imageSource: 'backdrop', textColor: '#111111', titleSize: 68, overviewLines: 2, spacingScale: 1.1,
                                      titleAlign: 'center', metaAlign: 'center', showGenres: true
                                    }))}
                                  >Backdrop Light</button>
                                  <button
                                    className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                    onClick={() => setShareConfig((c) => ({
                                      ...c,
                                      layout: 'landscape', theme: 'dark', backgroundMode: 'image', imageSource: 'backdrop', textColor: '#FFFFFF', titleSize: 60, overviewLines: 3, spacingScale: 0.9,
                                      titleAlign: 'left', metaAlign: 'left', showGenres: true, maxGenres: 4
                                    }))}
                                  >Landscape</button>
                                </div>
                              </div>
                            </div>

                            {/* Layout & Theme Section */}
                            <div className="space-y-4 mb-6">
                              <h4 className="text-sm font-medium text-white/80 border-b border-white/10 pb-2">Layout & Theme</h4>
                              
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs text-white/60 mb-2">Theme</label>
                                  <select
                                    value={shareConfig.theme}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, theme: e.target.value }))}
                                    className="w-full bg-black/40 text-white/90 text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                                  >
                                    <option value="dark">Dark</option>
                                    <option value="noir">Noir</option>
                                    <option value="twilight">Twilight</option>
                                    <option value="midnight">Midnight</option>
                                    <option value="light">Light</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-white/60 mb-2">Image Source</label>
                                  <select
                                    value={shareConfig.imageSource}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, imageSource: e.target.value }))}
                                    className="w-full bg-black/40 text-white/90 text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                                  >
                                    <option value="auto">Auto</option>
                                    <option value="poster">Poster</option>
                                    <option value="backdrop">Backdrop</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-white/60 mb-2">Background</label>
                                  <select
                                    value={shareConfig.backgroundMode}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, backgroundMode: e.target.value }))}
                                    className="w-full bg-black/40 text-white/90 text-xs px-2 rounded-lg border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                                  >
                                    <option value="gradient">Gradient</option>
                                    <option value="solid">Solid</option>
                                    <option value="image">Image</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4">

                              <div>
                                  <label className="block text-xs text-white/60 mb-2">Layout</label>
                                  <select
                                    value={shareConfig.layout}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, layout: e.target.value }))}
                                    className="w-full bg-black/40 text-white/90 text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                                  >
                                    <option value="portrait">Portrait</option>
                                    <option value="landscape">Landscape</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-white/60 mb-2">Title Align</label>
                                  <select
                                    value={shareConfig.titleAlign}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, titleAlign: e.target.value }))}
                                    className="w-full bg-black/40 text-white/90 text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                                  >
                                    <option value="center">Center</option>
                                    <option value="left">Left</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-white/60 mb-2">Meta Align</label>
                                  <select
                                    value={shareConfig.metaAlign}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, metaAlign: e.target.value }))}
                                    className="w-full bg-black/40 text-white/90 text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                                  >
                                    <option value="center">Center</option>
                                    <option value="left">Left</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Background Colors Section */}
                            <div className="space-y-4 mb-6">
                              <h4 className="text-sm font-medium text-white/80 border-b border-white/10 pb-2">Background Colors</h4>
                              
                              <div>
                                <label className="block text-xs text-white/60 mb-2">Mode</label>
                                <select
                                  value={shareConfig.backgroundMode}
                                  onChange={(e) => setShareConfig((c) => ({ ...c, backgroundMode: e.target.value }))}
                                  className="w-full bg-black/40 text-white/90 text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                                >
                                  <option value="gradient">Gradient</option>
                                  <option value="solid">Solid</option>
                                  <option value="image">Image</option>
                                </select>
                              </div>

                              {shareConfig.backgroundMode !== 'image' && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs text-white/60 mb-2">Start Color</label>
                                    <input
                                      type="color"
                                      value={shareConfig.solidColorStart}
                                      onChange={(e) => setShareConfig((c) => ({ ...c, solidColorStart: e.target.value }))}
                                      className="w-full h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                                    />
                                  </div>
                                  {shareConfig.backgroundMode === 'gradient' && (
                                    <div>
                                      <label className="block text-xs text-white/60 mb-2">End Color</label>
                                      <input
                                        type="color"
                                        value={shareConfig.solidColorEnd}
                                        onChange={(e) => setShareConfig((c) => ({ ...c, solidColorEnd: e.target.value }))}
                                        className="w-full h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Typography Section */}
                            <div className="space-y-4 mb-6">
                              <h4 className="text-sm font-medium text-white/80 border-b border-white/10 pb-2">Typography</h4>
                              
                              <div>
                                <label className="flex items-center justify-between text-xs text-white/60 mb-2">
                                  <span>Title Size</span>
                                  <span className="text-white/50 font-mono">{shareConfig.titleSize}px</span>
                                </label>
                                <input
                                  type="range"
                                  min="48"
                                  max="96"
                                  step="2"
                                  value={shareConfig.titleSize}
                                  onChange={(e) => setShareConfig((c) => ({ ...c, titleSize: Number(e.target.value) }))}
                                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-white/60 mb-2">Text Color</label>
                                <input
                                  type="color"
                                  value={shareConfig.textColor}
                                  onChange={(e) => setShareConfig((c) => ({ ...c, textColor: e.target.value }))}
                                  className="w-full h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                                />
                              </div>

                              <div>
                                <label className="flex items-center justify-between text-xs text-white/60 mb-2">
                                  <span>Overview Lines</span>
                                  <span className="text-white/50 font-mono">{shareConfig.overviewLines}</span>
                                </label>
                                <input
                                  type="range"
                                  min="1"
                                  max="4"
                                  step="1"
                                  value={shareConfig.overviewLines}
                                  onChange={(e) => setShareConfig((c) => ({ ...c, overviewLines: Number(e.target.value) }))}
                                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                                />
                              </div>

                              <div>
                                <label className="flex items-center justify-between text-xs text-white/60 mb-2">
                                  <span>Spacing Scale</span>
                                  <span className="text-white/50 font-mono">{shareConfig.spacingScale.toFixed(2)}x</span>
                                </label>
                                <input
                                  type="range"
                                  min="0.8"
                                  max="1.4"
                                  step="0.05"
                                  value={shareConfig.spacingScale}
                                  onChange={(e) => setShareConfig((c) => ({ ...c, spacingScale: Number(e.target.value) }))}
                                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                                />
                              </div>
                            </div>

                            {/* Content Options Section */}
                            <div className="space-y-4 mb-6">
                              <h4 className="text-sm font-medium text-white/80 border-b border-white/10 pb-2">Content Options</h4>
                              
                              <div className="grid grid-cols-4 gap-4">
                                <label className="flex items-center justify-between text-xs text-white/60">
                                  <span>Show Year</span>
                                  <input
                                    type="checkbox"
                                    checked={shareConfig.showYear}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, showYear: e.target.checked }))}
                                    className="w-4 h-4 text-white bg-black/40 border-white/10 rounded focus:ring-white/20"
                                  />
                                </label>
                                <label className="flex items-center justify-between text-xs text-white/60">
                                  <span>Show Runtime</span>
                                  <input
                                    type="checkbox"
                                    checked={shareConfig.showRuntime}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, showRuntime: e.target.checked }))}
                                    className="w-4 h-4 text-white bg-black/40 border-white/10 rounded focus:ring-white/20"
                                  />
                                </label>
                                <label className="flex items-center justify-between text-xs text-white/60">
                                  <span>Show Rating</span>
                                  <input
                                    type="checkbox"
                                    checked={shareConfig.showRating}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, showRating: e.target.checked }))}
                                    className="w-4 h-4 text-white bg-black/40 border-white/10 rounded focus:ring-white/20"
                                  />
                                </label>
                                <label className="flex items-center justify-between text-xs text-white/60">
                                  <span>Show Genres</span>
                                  <input
                                    type="checkbox"
                                    checked={shareConfig.showGenres}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, showGenres: e.target.checked }))}
                                    className="w-4 h-4 text-white bg-black/40 border-white/10 rounded focus:ring-white/20"
                                  />
                                </label>
                              </div>

                              {shareConfig.showGenres && (
                                <div>
                                  <label className="block text-xs text-white/60 mb-2">Max Genres</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="8"
                                    value={shareConfig.maxGenres}
                                    onChange={(e) => setShareConfig((c) => ({ ...c, maxGenres: Math.max(0, Math.min(8, Number(e.target.value))) }))}
                                    className="w-full bg-black/40 text-white/90 text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Visual Effects Section */}
                            <div className="space-y-4 mb-6">
                              <h4 className="text-sm font-medium text-white/80 border-b border-white/10 pb-2">Visual Effects</h4>
                              
                              <div>
                                <label className="flex items-center justify-between text-xs text-white/60 mb-2">
                                  <span>Poster Frame Opacity</span>
                                  <span className="text-white/50 font-mono">{(shareConfig.posterFrameOpacity * 100).toFixed(0)}%</span>
                                </label>
                                <input
                                  type="range"
                                  min="0"
                                  max="0.2"
                                  step="0.01"
                                  value={shareConfig.posterFrameOpacity}
                                  onChange={(e) => setShareConfig((c) => ({ ...c, posterFrameOpacity: Number(e.target.value) }))}
                                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                                />
                              </div>

                              <div>
                                <label className="flex items-center justify-between text-xs text-white/60 mb-2">
                                  <span>Background Image Opacity</span>
                                  <span className="text-white/50 font-mono">{(shareConfig.backgroundImageOpacity * 100).toFixed(0)}%</span>
                                </label>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={shareConfig.backgroundImageOpacity}
                                  onChange={(e) => setShareConfig((c) => ({ ...c, backgroundImageOpacity: Number(e.target.value) }))}
                                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                              <button
                                className="flex-1 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
                                onClick={async () => {
                                  try {
                                    setIsGeneratingShare(true);
                                    const blob = await createShareCardBlob(movieDetails, shareConfig);
                                    setIsGeneratingShare(false);
                                    if (blob) {
                                      const url = URL.createObjectURL(blob);
                                      setShareImageUrl(url);
                                    }
                                  } catch {}
                                }}
                              >
                                Apply Changes
                              </button>
                              <button
                                className="px-4 py-2.5 rounded-lg bg-white/5 text-white/80 text-sm font-medium hover:bg-white/10 border border-white/10 transition-colors"
                                onClick={() => setShareConfig(getDefaultShareConfig())}
                                title="Reset to defaults"
                              >
                                Reset
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={async () => {
                          try {
                            if (!shareImageUrl) {
                              setIsGeneratingShare(true);
                              const blob = await createShareCardBlob(movieDetails, shareConfig);
                              setIsGeneratingShare(false);
                              if (blob) {
                                const url = URL.createObjectURL(blob);
                                setShareImageUrl(url);
                              }
                            } else {
                              const a = document.createElement('a');
                              a.href = shareImageUrl;
                              a.download = `${(movieDetails?.title || 'movie').replace(/\s+/g,'_')}_share.png`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }
                          } catch {}
                        }}
                        className="px-3 py-2 rounded-lg bg-white text-black text-sm hover:bg-white/90 flex items-center justify-center group relative"
                        title="Download"
                        aria-label="Download"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        <span className="pointer-events-none absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/40 border border-white/15 px-2 py-0.5 rounded text-white/90">Download</span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const blob = await createShareCardBlob(movieDetails, shareConfig);
                            if (blob && typeof navigator !== 'undefined') {
                              const file = new File([blob], `${(movieDetails?.title || 'movie').replace(/\s+/g,'_')}_share.png`, { type: 'image/png' });
                              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                await navigator.share({
                                  files: [file],
                                  title: movieDetails?.title || 'Share',
                                  text: `Check out ${(movieDetails?.title || movie?.title)}!`
                                });
                                return;
                              }
                            }
                          } catch {}
                          const shareTarget = `${window.location.origin}/movies?id=${movie?.id || movieDetails?.id}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(shareTarget)}`, '_blank');
                        }}
                        className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 flex items-center justify-center group relative"
                        title="Share"
                        aria-label="Share"
                      >
                        <PaperAirplaneIcon className="h-5 w-5 rotate-45" />
                        <span className="pointer-events-none absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/40 border border-white/15 px-2 py-0.5 rounded text-white/90">Share</span>
                      </button>
                      <button
                        onClick={() => {
                          const shareTarget = `${window.location.origin}/movies?id=${movie?.id || movieDetails?.id}`;
                          navigator.clipboard.writeText(shareTarget);
                        }}
                        className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 flex items-center justify-center group relative"
                        title="Copy link"
                        aria-label="Copy link"
                      >
                        <LinkIcon className="h-5 w-5" />
                        <span className="pointer-events-none absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/40 border border-white/15 px-2 py-0.5 rounded text-white/90">Copy</span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const blob = await createShareCardBlob(movieDetails, shareConfig);
                            if (blob && typeof navigator !== 'undefined') {
                              const file = new File([blob], `${(movieDetails?.title || 'movie').replace(/\s+/g,'_')}_share.png`, { type: 'image/png' });
                              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                await navigator.share({
                                  files: [file],
                                  title: movieDetails?.title || 'Share',
                                  text: `Check out ${(movieDetails?.title || movie?.title)}!`
                                });
                                return;
                              }
                            }
                          } catch {}
                          const shareTarget = `${window.location.origin}/movies?id=${movie?.id || movieDetails?.id}`;
                          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${(movieDetails?.title || movie?.title)}! ${shareTarget}`)}`, '_blank');
                        }}
                        className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 flex items-center justify-center group relative"
                        title="Twitter"
                        aria-label="Twitter"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1227" className="h-4 w-4 fill-current"><path d="M714.163 519.284L1160.89 0H1022.79L667.137 410.552L357.328 0H0L468.492 632.736L0 1226.37H138.106L516.021 785.196L842.672 1226.37H1200L714.137 519.284H714.163ZM567.489 723.062L521.15 661.94L187.97 159.039H306.493L576.292 539.494L622.631 600.616L969.689 1070.64H851.166L567.489 723.088V723.062Z"/></svg>
                        <span className="pointer-events-none absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/40 border border-white/15 px-2 py-0.5 rounded text-white/90">Twitter</span>
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
              </AnimatePresence>
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
                        variants={slideUpVariants}
                        initial="hidden"
                        animate="visible"
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
                                  className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 transform-gpu will-change-transform ${
                                    episodesViewMode === 'card' ? 'text-white' : 'text-white/50 hover:text-white/70'
                                  }`}
                                  title="Card View"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                  </svg>
                                  {episodesViewMode === 'card' && (
                                    <motion.div
                                      layoutId="episodesViewToggleUnderline"
                                      className="absolute left-0 right-0 bottom-0 h-0.5 bg-white/70"
                                    />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEpisodesViewModeWithStorage('list')}
                                  className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                    episodesViewMode === 'list' ? 'text-white' : 'text-white/50 hover:text-white/70'
                                  }`}
                                  title="List View"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                  </svg>
                                  {episodesViewMode === 'list' && (
                                    <motion.div
                                      layoutId="episodesViewToggleUnderline"
                                      className="absolute left-0 right-0 bottom-0 h-0.5 bg-white/70"
                                    />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Episodes Content */}
                        {(() => {
                          // Stabilize the episode section rendering to prevent flashing
                          const isLoading = isSeasonsLoading || isEpisodesLoading;
                          const hasSeasons = seasons.length > 0;
                          const hasEpisodes = episodes.length > 0;
                          const isEpisodesLoadingOnly = hasSeasons && isEpisodesLoading && !isSeasonsLoading;
                          
                          // Show loading skeletons when initially loading
                          if (isLoading) {
                            return episodesViewMode === 'card' ? (
                              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                                {[...Array(8)].map((_, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="group relative bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] rounded-2xl overflow-hidden border border-white/[0.08] shadow-lg backdrop-blur-sm"
                                  >
                                    <div className="aspect-square sm:aspect-video lg:aspect-video bg-gradient-to-br from-gray-800 to-gray-700 rounded-t-2xl"></div>
                                    <div className="p-4 lg:p-5 space-y-3">
                                      <div className="h-4 bg-white/10 rounded"></div>
                                      <div className="h-3 bg-white/10 rounded w-2/3"></div>
                                      <div className="h-3 bg-white/10 rounded w-1/2"></div>
                                      <div className="pt-3 border-t border-white/[0.08]">
                                        <div className="flex items-center justify-between">
                                          <div className="h-3 bg-white/10 rounded w-16"></div>
                                          <div className="h-3 bg-white/10 rounded w-12"></div>
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
                                        <div className="w-6 h-6 bg-white/10 rounded"></div>
                                      </div>
                                      
                                      {/* Episode Thumbnail Skeleton */}
                                      <div className="relative w-32 h-20 sm:w-32 sm:h-20 md:w-40 md:h-24 overflow-hidden rounded-lg flex-shrink-0 bg-white/10"></div>
                                      
                                      {/* Episode Info Skeleton */}
                                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div className="space-y-3 sm:space-y-3">
                                          <div className="space-y-1 sm:space-y-2">
                                            {/* Episode Title Skeleton */}
                                            <div className="h-4 sm:h-5 bg-white/10 rounded" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
                                            
                                            {/* Episode Overview Skeleton - Hidden on mobile */}
                                            <div className="hidden sm:block space-y-1.5">
                                              <div className="h-3 bg-white/8 rounded" style={{ width: '100%' }}></div>
                                              <div className="h-3 bg-white/8 rounded" style={{ width: `${Math.random() * 20 + 80}%` }}></div>
                                            </div>
                                          </div>
                                          
                                          {/* Episode Details Skeleton */}
                                          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-white/45">
                                            {/* Desktop: Separate date and runtime skeletons */}
                                            <div className="hidden sm:flex items-center gap-4">
                                              {/* Date skeleton */}
                                              <div className="flex items-center gap-1">
                                                <div className="w-4 h-4 bg-white/10 rounded"></div>
                                                <div className="w-16 h-3 bg-white/10 rounded"></div>
                                              </div>
                                              <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                                              {/* Runtime skeleton */}
                                              <div className="flex items-center gap-1">
                                                <div className="w-4 h-4 bg-white/10 rounded"></div>
                                                <div className="w-12 h-3 bg-white/10 rounded"></div>
                                              </div>
                                            </div>
                                            
                                            {/* Mobile: Combined skeleton */}
                                            <div className="sm:hidden flex items-center gap-1 text-xs">
                                              <div className="w-8 h-3 bg-white/10 rounded "></div>
                                              <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                                              <div className="w-12 h-3 bg-white/10 rounded"></div>
                                              <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                                              <div className="w-10 h-3 bg-white/10 rounded"></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            );
                          }
                          
                          // Show loading indicator when seasons are loaded but episodes are still loading
                          if (isEpisodesLoadingOnly) {
                            return (
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
                            );
                          }
                          
                          // Show episodes when available
                          if (hasSeasons && hasEpisodes) {
                            return (
                              <AnimatePresence mode="wait" initial={false}>
                                {episodesViewMode === 'card' ? (
                            <motion.div key="episodes-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }} style={{ contain: 'layout' }} className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 pb-6">
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
                                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                          fetchpriority="low"
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
                                    

                                    {/* Episode Progress (Card view, inside thumbnail slightly above bottom) */}
                                    {(() => {
                                      const seasonNumber = episode.season_number || currentSeason?.season_number;
                                      const progressKey = seasonNumber ? `tv_${movie.id}_${seasonNumber}_${episode.episode_number}` : null;
                                      const progress = progressKey && viewingProgress ? (viewingProgress[progressKey]?.progress || 0) : 0;
                                      if (!progress || progress <= 0) return null;
                                      return (
                                        <div className="absolute left-3 right-3 bottom-1">
                                          <div className="w-full bg-white/20 rounded-full h-1">
                                            <div
                                              className={`h-1 rounded-full transition-all duration-300 ${progress > 0 ? 'bg-white' : 'bg-white/30'}`}
                                              style={{ width: `${Math.max(progress, 1)}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })()}
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
                                    
                                    {/* Air Date and Runtime */}
                                    <div className="pt-2 sm:pt-3 border-t border-white/8">
                                      <div className="flex items-center gap-2 text-white/45 text-xs font-medium">
                                        {episode.air_date && (
                                          <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                                            </svg>
                                            {new Date(episode.air_date).toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric',
                                              year: 'numeric'
                                            })}
                                          </span>
                                        )}
                                        {episode.air_date && episode.runtime && (
                                          <span className="inline-block w-2 text-center text-white/30 select-none">•</span>
                                        )}
                                        {episode.runtime && (
                                          <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {formatRuntime(episode.runtime)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                              
                              {hasMoreEpisodes && (
                                <div className="col-span-full flex justify-center mt-6"><EnhancedLoadMoreButton onClick={handleLoadMoreEpisodes} hasMore={hasMoreEpisodes} isLoading={false} totalItems={episodes.length} displayedItems={displayedEpisodes} loadingText="Loading more episodes..." buttonText="Load More Episodes" itemName="episodes" variant="primary" /></div>
                              )}
                            </motion.div>
                          ) : (
                            <motion.div key="episodes-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }} style={{ contain: 'layout' }} className="space-y-0 pb-6">
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
                                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                          fetchpriority="low"
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
                                      
                                      {/* Episode Progress (List view, under thumbnail) */}
                                      {(() => {
                                        const seasonNumber = episode.season_number || currentSeason?.season_number;
                                        const progressKey = seasonNumber ? `tv_${movie.id}_${seasonNumber}_${episode.episode_number}` : null;
                                        const progress = progressKey && viewingProgress ? (viewingProgress[progressKey]?.progress || 0) : 0;
                                        if (!progress || progress <= 0) return null;
                                        return (
                                          <div className="absolute left-0 right-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                                            <div className="w-full bg-white/20 rounded-full h-1">
                                              <div
                                                className={`h-1 rounded-full transition-all duration-300 ${progress > 0 ? 'bg-white' : 'bg-white/30'}`}
                                                style={{ width: `${Math.max(progress, 1)}%` }}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })()}
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
                              {(() => { return null; })()}

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
                            </motion.div>
                          )}
                              </AnimatePresence>
                            );
                           }
                          
                          // Show "no episodes" message when seasons exist but no episodes (with delay to prevent flashing)
                          if (hasSeasons && !hasEpisodes && showEmptyState) {
                            return (
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-center text-white/40 py-12 pt-0"
                              >
                                <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl p-8 border border-white/10">
                                  <svg className="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                                  </svg>
                                  <h3 className="text-lg font-semibold text-white/60 mb-2">No Episodes Available</h3>
                                  <p className="text-white/40 text-sm">This season doesn't have any episodes yet.</p>
                                </div>
                              </motion.div>
                            );
                          }
                          
                          // Default: Show nothing when no seasons or episodes
                          return null;
                        })()}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Similar Section */}
                <motion.div 
                  className="pt-6 sm:pt-8 relative"
                  variants={slideUpVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Enhanced border with matching radius */}
                  <div className="absolute -top-px left-0 w-full h-[1.5px] z-10 pointer-events-none">
                    <div className="w-full h-full border-t border-white/10 rounded-t-2xl" />
                  </div>
                  <div className="absolute -top-4 left-0 w-full flex justify-center pointer-events-none z-10">
                    <span className="inline-block h-1 w-32 bg-gradient-to-r from-primary/30 via-white/40 to-primary/30 rounded-full blur-sm opacity-60" />
                  </div>
                  
                  {/* 🚀 PERFORMANCE OPTIMIZED: Enhanced Similar Content Section with Early Preloading */}
                  <EnhancedSimilarContent
                    key={`${movie?.id}-${movie?.type}`}
                    contentId={movie?.id}
                    contentType={movie?.type || 'movie'}
                    onItemClick={handleSimilarMovieClick}
                    isMobile={isMobile}
                    maxItems={20} // 🚀 FIXED: Reduced from 24 to 20 to prevent memory buildup
                    showFilters={true}
                    showTitle={true}
                    showLoadMore={true}
                    className=""
                    // 🚀 FIXED: Enhanced memory optimization props for aggressive cleanup
                    enableVirtualization={true}
                    enableLazyLoading={true}
                    cleanupOnUnmount={true}
                    enableMemoryOptimization={true}
                    aggressiveCleanup={true}
                    // 🚀 NEW: Performance optimization props for faster loading
                    preloadOnMount={true}
                    enableAggressivePreloading={true}
                    preloadThreshold={0.1}
                  />
                  
                  {/* Enhanced bottom border with matching radius */}
                  <div className="absolute -bottom-px left-0 w-full h-[1.5px] z-10 pointer-events-none">
                    <div className="w-full h-full border-b border-white/10 rounded-b-2xl" />
                  </div>
                  <div className="absolute -bottom-4 left-0 w-full flex justify-center pointer-events-none z-10">
                    <span className="inline-block h-1 w-32 bg-gradient-to-r from-primary/30 via-white/40 to-primary/30 rounded-full blur-sm opacity-60" />
                  </div>
                </motion.div>
              </div>
            </div>
          ) : null}



          <motion.button
            onClick={() => {
              handleInteraction('close_button_clicked', { method: 'close_button' });
              onClose();
            }}
            className="absolute top-4 right-4 z-10 p-2 rounded-full text-white group overflow-hidden bg-[rgb(255,255,255,0.03)] backdrop-blur-[0.5px] border-l-[1px] border-r-[1px] border-white/30 hover:bg-white/10 transform-gpu will-change-transform"
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <motion.svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 relative z-10" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              whileHover={{ 
                rotate: 90,
                scale: 1.05,
                transition: { type: 'spring', stiffness: 500, damping: 30 }
              }}
            >
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </motion.svg>
            <motion.span 
              className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1a1a1a] rounded text-sm whitespace-nowrap z-20"
              variants={textRevealVariants}
              initial="hidden"
              whileHover="visible"
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
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="fixed inset-0 z-[1000000001] flex items-center justify-center bg-black/95"
                onClick={handleCloseTrailer}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <motion.div 
                  variants={slideUpVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
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
                        <Suspense fallback={
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                            <Loader size="large" color="white" variant="circular" />
                          </div>
                        }>
                          <LazyYouTube
                            videoId={movieDetails.trailer}
                            opts={{
                              width: '100%',
                              height: '100%',
                              playerVars: {
                                autoplay: 0, // Changed from 1 to 0 to prevent autoplay issues
                                controls: 1,
                                modestbranding: 1,
                                rel: 0,
                                showinfo: 0,
                                iv_load_policy: 3,
                                origin: window.location.origin,
                                enablejsapi: 1,
                                widget_referrer: window.location.origin,
                                // Optimize for faster loading
                                preload: 'metadata',
                                playsinline: 1,
                              },
                            }}
                            onReady={(event) => {
                              playerRef.current = event.target;
                              setIsTrailerLoading(false);
                             
                            }}
                            onError={(error) => {
                              // Use the YouTube error handler utility
                              const wasHandled = handleYouTubeError(error, import.meta.env.DEV);
                              if (!wasHandled) {
                                console.warn('YouTube player error:', error);
                              }
                              setIsTrailerLoading(false);
                            }}
                            onStateChange={(event) => {
                              // Handle player state changes (only log in development)
                             
                            }}
                            className="w-full h-full"
                            style={{ 
                              pointerEvents: 'auto',
                              position: 'relative',
                              zIndex: 1
                            }}
                          />
                        </Suspense>
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
                episode: movieDetails.episode,
                // Provide identifying fields so logs and context have names/images
                title: movieDetails.name || movieDetails.title,
                name: movieDetails.name || movieDetails.title,
                poster_path: movieDetails.poster_path || movieDetails.poster,
                backdrop_path: movieDetails.backdrop_path || movieDetails.backdrop
              };
             
              return content;
            }
            return movieDetails;
          })()}
          currentService={currentService}
          onServiceChange={handleServiceChange}
        />

        {/* Cast Details Overlay */}
        {showCastDetails && selectedCastMember && (
          <CastDetailsOverlay
            person={selectedCastMember}
            onClose={handleCastDetailsClose}
            onMovieSelect={onMovieSelect}
            onSeriesSelect={onMovieSelect}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortalContent(overlayContent);
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedMovieDetailsOverlay = React.memo(MovieDetailsOverlay, (prevProps, nextProps) => {
  // Only re-render if movie ID changes or onClose function changes
  return (
    prevProps.movie?.id === nextProps.movie?.id &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onMovieSelect === nextProps.onMovieSelect &&
    prevProps.onGenreClick === nextProps.onGenreClick
  );
});

export default MemoizedMovieDetailsOverlay;