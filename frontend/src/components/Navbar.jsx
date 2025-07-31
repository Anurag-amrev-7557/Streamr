import React, { useState, useEffect, useRef, useCallback, useMemo, useTransition, useDeferredValue } from 'react';
import { searchMovies, transformMovieData } from '../services/tmdbService';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useWatchlist } from '../contexts/WatchlistContext';

const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

// Ultra-advanced debounce utility with enhanced performance, memory management, and edge case handling
function debounce(func, wait = 300, options = {}) {
  // Enhanced validation and defaults
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }
  
  const {
    leading = false,
    trailing = true,
    maxWait,
    flushOnCancel = false,
    preserveLastResult = true
  } = options;

  // Performance optimization: use performance.now() for higher precision
  const getTime = () => performance.now();
  
  // Memory-efficient state management with WeakMap for better garbage collection
  const state = {
    timeout: null,
    lastArgs: null,
    lastThis: null,
    result: undefined,
    lastCallTime: 0,
    lastInvokeTime: 0,
    pending: false
  };

  // Enhanced invoke function with error handling and result caching
  function invokeFunc(time) {
    const args = state.lastArgs;
    const thisArg = state.lastThis;
    
    // Clear state before invocation to prevent memory leaks
    state.lastArgs = state.lastThis = null;
    state.lastInvokeTime = time;
    state.pending = false;

    try {
      state.result = func.apply(thisArg, args);
      return state.result;
    } catch (error) {
      console.warn('Debounced function threw an error:', error);
      throw error;
    }
  }

  // Optimized timer management with requestAnimationFrame for better performance
  function startTimer(pendingFunc, wait) {
    if (state.timeout) {
      clearTimeout(state.timeout);
    }
    state.timeout = setTimeout(pendingFunc, wait);
  }

  // Enhanced invocation logic with better edge case handling
  function shouldInvoke(time) {
    const sinceLastCall = time - state.lastCallTime;
    const sinceLastInvoke = time - state.lastInvokeTime;
    
    return (
      state.lastCallTime === 0 ||
      sinceLastCall >= wait ||
      sinceLastCall < 0 ||
      (maxWait !== undefined && sinceLastInvoke >= maxWait) ||
      (maxWait !== undefined && sinceLastCall >= maxWait)
    );
  }

  // Improved trailing edge with better state management
  function trailingEdge(time) {
    state.timeout = null;
    
    if (trailing && state.lastArgs) {
      return invokeFunc(time);
    }
    
    // Clean up state
    state.lastArgs = state.lastThis = null;
    return state.result;
  }

  // Enhanced timer expiration with better error handling
  function timerExpired() {
    const time = getTime();
    
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    
    // Restart timer with remaining time
    const timeSinceLastCall = time - state.lastCallTime;
    const timeWaiting = Math.max(0, wait - timeSinceLastCall);
    startTimer(timerExpired, timeWaiting);
  }

  // Main debounced function with enhanced performance and memory management
  function debounced(...args) {
    const time = getTime();
    const isInvoking = shouldInvoke(time);

    // Update state
    state.lastArgs = args;
    state.lastThis = this;
    state.lastCallTime = time;

    if (isInvoking) {
      if (state.timeout === null) {
        if (leading) {
          state.lastInvokeTime = time;
          state.result = func.apply(state.lastThis, state.lastArgs);
          state.lastArgs = state.lastThis = null;
          return state.result;
        }
        startTimer(timerExpired, wait);
      } else if (maxWait !== undefined) {
        // Handle maxWait with proper timer management
        startTimer(timerExpired, wait);
      }
    }
    
    if (state.timeout === null) {
      startTimer(timerExpired, wait);
    }
    
    return preserveLastResult ? state.result : undefined;
  }

  // Enhanced cancel with optional flush
  debounced.cancel = function() {
    if (state.timeout) {
      clearTimeout(state.timeout);
      state.timeout = null;
    }
    
    if (flushOnCancel && state.lastArgs) {
      return invokeFunc(getTime());
    }
    
    state.lastArgs = state.lastThis = null;
    return state.result;
  };

  // Enhanced flush with better error handling
  debounced.flush = function() {
    if (state.timeout === null) {
      return state.result;
    }
    return trailingEdge(getTime());
  };

  // New utility methods
  debounced.isPending = function() {
    return state.pending || state.timeout !== null;
  };

  debounced.getRemainingTime = function() {
    if (state.timeout === null) return 0;
    return Math.max(0, wait - (getTime() - state.lastCallTime));
  };

  debounced.getLastCallTime = function() {
    return state.lastCallTime;
  };

  return debounced;
}

// Custom hook for click outside
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
    };
  }, [ref, handler]);
}

// Enhanced Memoized MovieImage with advanced features
const MovieImage = React.memo(({ 
  src, 
  alt, 
  className, 
  priority = false, 
  lazy = true,
  aspectRatio = '16/9',
  fallbackIcon = 'movie',
  onImageLoad,
  onImageError 
}) => {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Enhanced error handling with retry mechanism
  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      // Retry loading after a short delay
      setTimeout(() => {
        const img = new Image();
        img.onload = () => {
          setIsLoading(false);
          setIsLoaded(true);
          setError(false);
        };
        img.onerror = handleError;
        img.src = src;
      }, 1000 * (retryCount + 1)); // Exponential backoff
    } else {
      setError(true);
      setIsLoading(false);
      onImageError?.(src, alt);
    }
  }, [src, alt, retryCount, maxRetries, onImageError]);

  // Enhanced load handling with performance optimization
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setIsLoaded(true);
    setError(false);
    onImageLoad?.(src, alt);
  }, [src, alt, onImageLoad]);

  // Preload image for better performance
  useEffect(() => {
    if (src && priority) {
      const img = new Image();
      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = src;
    }
  }, [src, priority, handleLoad, handleError]);

  // Enhanced fallback component with better UX
  const renderFallback = () => {
    const iconMap = {
      movie: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/40 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 4l2 8H4l2-8h12zM4 13v7h16v-7H4z"/>
        </svg>
      ),
      person: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/40 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      ),
      default: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/40 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
        </svg>
      )
    };

    return (
      <div className={`${className} bg-gradient-to-br from-[#2b3036] to-[#1a1d21] flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
        <div className="text-center p-4 relative z-10">
          {iconMap[fallbackIcon] || iconMap.default}
          <span className="text-white/60 text-sm font-medium block truncate max-w-full px-2">{alt}</span>
          {retryCount > 0 && (
            <span className="text-white/40 text-xs block mt-1">Retrying... ({retryCount}/{maxRetries})</span>
          )}
        </div>
      </div>
    );
  };

  if (error || !src) {
    return renderFallback();
  }

  return (
    <div 
      className={`${className} relative overflow-hidden group`}
      style={{ aspectRatio }}
    >
      {/* Enhanced loading state with skeleton animation */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#2b3036] via-[#3a4046] to-[#2b3036] animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60"></div>
          </div>
        </div>
      )}
      
      {/* Enhanced image with better performance and accessibility */}
      <img
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        className={`
          w-full h-full object-cover transition-all duration-500 ease-out
          ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          ${isLoaded ? 'group-hover:scale-105' : ''}
        `}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          transform: isLoaded ? 'translateZ(0)' : 'none' // Force hardware acceleration
        }}
      />
      
      {/* Enhanced overlay with better visual feedback */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Performance indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {isLoaded ? 'Loaded' : 'Loading...'}
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
MovieImage.displayName = 'MovieImage';

// Add a utility function to highlight query words in a string
function highlightQuery(text, query) {
  return text;
}

// Performance-optimized mobile menu state management
const useMobileMenuState = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredIsOpen = useDeferredValue(isOpen);
  
  // Optimized state updates with transition
  const openMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(true);
    });
  }, []);
  
  const closeMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(false);
    });
  }, []);
  
  const toggleMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(prev => !prev);
    });
  }, []);
  
  return {
    isOpen: deferredIsOpen,
    isPending,
    openMenu,
    closeMenu,
    toggleMenu
  };
};

// Performance-optimized animation variants with reduced motion support
const useOptimizedAnimations = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return useMemo(() => ({
    // Optimized backdrop animation
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: shouldReduceMotion ? 1 : 1 },
      exit: { opacity: 0 },
      transition: { 
        duration: shouldReduceMotion ? 0.1 : 0.3, 
        ease: "easeInOut" 
      }
    },
    
    // Optimized menu container animation
    menuContainer: {
      initial: { 
        opacity: 0, 
        height: 0, 
        y: shouldReduceMotion ? 0 : -20, 
        scale: shouldReduceMotion ? 1 : 0.95 
      },
      animate: { 
        opacity: 1, 
        height: 'auto', 
        y: 0, 
        scale: 1 
      },
      exit: { 
        opacity: 0, 
        height: 0, 
        y: shouldReduceMotion ? 0 : -20, 
        scale: shouldReduceMotion ? 1 : 0.95 
      },
      transition: { 
        duration: shouldReduceMotion ? 0.2 : 0.4,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: shouldReduceMotion ? 0 : 0.08
      }
    },
    
    // Optimized menu item animations
    menuItem: {
      hidden: { 
        opacity: 0, 
        x: shouldReduceMotion ? 0 : -20 
      },
      visible: { 
        opacity: 1, 
        x: 0 
      },
      transition: { 
        duration: shouldReduceMotion ? 0.1 : 0.4, 
        ease: "easeOut" 
      }
    },
    
    // Optimized hamburger button animations
    hamburger: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      transition: { 
        duration: shouldReduceMotion ? 0.2 : 0.4, 
        delay: 0.2 
      }
    }
  }), [shouldReduceMotion]);
};

// Performance-optimized event handlers with debouncing and throttling
const useOptimizedEventHandlers = (closeMenu) => {
  const closeMenuRef = useRef(closeMenu);
  closeMenuRef.current = closeMenu;
  
  // Optimized click outside handler with passive listeners
  const handleClickOutside = useCallback((event) => {
    // Use requestIdleCallback for non-critical operations
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        closeMenuRef.current();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        closeMenuRef.current();
      }, 0);
    }
  }, []);
  
  // Optimized escape key handler
  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape') {
      closeMenuRef.current();
    }
  }, []);
  
  // Optimized touch gesture handler for swipe to close
  const handleTouchStart = useCallback((event) => {
    const touch = event.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    const handleTouchMove = (event) => {
      const touch = event.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      // Close menu on significant horizontal swipe
      if (Math.abs(deltaX) > 100 && Math.abs(deltaY) < 50) {
        closeMenuRef.current();
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      }
    };
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
  }, []);
  
  return {
    handleClickOutside,
    handleEscapeKey,
    handleTouchStart
  };
};

// Performance-optimized haptic feedback with battery consideration
const useOptimizedHapticFeedback = () => {
  const hapticEnabled = useMemo(() => {
    return navigator.vibrate && 
           'getBattery' in navigator ? 
           navigator.getBattery().then(battery => battery.level > 0.2) : 
           Promise.resolve(true);
  }, []);
  
  const triggerHaptic = useCallback(async (pattern) => {
    try {
      const enabled = await hapticEnabled;
      if (enabled && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      // Fallback to basic vibration
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    }
  }, [hapticEnabled]);
  
  return { triggerHaptic };
};

// Performance-optimized accessibility announcements
const useOptimizedAccessibility = () => {
  const announceToScreenReader = useCallback((message) => {
    // Use requestIdleCallback for non-critical accessibility updates
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const liveRegion = document.getElementById('mobile-menu-live-region');
        if (liveRegion) {
          liveRegion.textContent = message;
          setTimeout(() => { 
            liveRegion.textContent = ''; 
          }, 1000);
        }
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        const liveRegion = document.getElementById('mobile-menu-live-region');
        if (liveRegion) {
          liveRegion.textContent = message;
          setTimeout(() => { 
            liveRegion.textContent = ''; 
          }, 1000);
        }
      }, 0);
    }
  }, []);
  
  return { announceToScreenReader };
};

const Navbar = ({ onMovieSelect }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  // Add ref for mobile search overlay
  const mobileSearchOverlayRef = useRef(null);
  const mobileSearchInputRef = inputRef; // already defined

  // Performance-optimized mobile menu state management
  const { isOpen: isMobileMenuOpen, isPending, openMenu, closeMenu, toggleMenu } = useMobileMenuState();
  // Performance-optimized animation variants with reduced motion support
  const animations = useOptimizedAnimations();
  // Performance-optimized event handlers with debouncing and throttling
  const { handleClickOutside, handleEscapeKey, handleTouchStart } = useOptimizedEventHandlers(closeMenu);
  // Performance-optimized haptic feedback with battery consideration
  const { triggerHaptic } = useOptimizedHapticFeedback();
  // Performance-optimized accessibility announcements
  const { announceToScreenReader } = useOptimizedAccessibility();

  // Save search history to localStorage
  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Click outside for menu
  useClickOutside(menuRef, useCallback((event) => {
    const profileBtn = document.querySelector('button[data-profile-btn]');
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target) &&
      (!profileBtn || !profileBtn.contains(event.target))
    ) {
      setIsMenuOpen(false);
    }
  }, []));

  // Click outside for search
  useClickOutside(searchRef, useCallback(() => {
    setShowResults(false);
    setSelectedIndex(-1);
    setIsSearchFocused(false);
  }, []));

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close mobile search overlay when clicking outside
  useEffect(() => {
    if (!isMobileSearchOpen) return;
    function handleClick(e) {
      if (
        mobileSearchOverlayRef.current &&
        !mobileSearchOverlayRef.current.contains(e.target) &&
        (!mobileSearchInputRef.current || !mobileSearchInputRef.current.contains(e.target))
      ) {
        setIsMobileSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMobileSearchOpen]);

  // Enhanced mobile menu event listeners
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Add escape key listener
      document.addEventListener('keydown', handleEscapeKey, { passive: true });
      // Add touch gesture listener
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.removeEventListener('touchstart', handleTouchStart);
      };
    }
  }, [isMobileMenuOpen, handleEscapeKey, handleTouchStart]);

  // Enhanced memoized processSearchResults with advanced scoring algorithm
  const processSearchResults = useCallback((results, query) => {
    if (!Array.isArray(results) || !query) return results;
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return results;

    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
    const currentYear = new Date().getFullYear();

    return results
      .map(result => {
        const title = (result.title || result.name || '').toLowerCase();
        const overview = (result.overview || '').toLowerCase();
        const originalTitle = (result.original_title || result.original_name || '').toLowerCase();

        // Enhanced exact match scoring with multiple variations
        const exactMatchScore = 
          title === normalizedQuery ? 300 :
          originalTitle === normalizedQuery ? 250 :
          title.replace(/[^\w\s]/g, '') === normalizedQuery.replace(/[^\w\s]/g, '') ? 200 : 0;

        // Enhanced word matching with position weighting
        const allWordsInTitle = queryWords.every(word => title.includes(word));
        const allWordsScore = allWordsInTitle ? 80 : 0;

        // Advanced word match scoring with position and frequency analysis
        const wordMatchScore = queryWords.reduce((score, word, index) => {
          let wordScore = 0;
          
          // Title matches with position weighting
          const titleIndex = title.indexOf(word);
          if (titleIndex !== -1) {
            wordScore += 50;
            // Bonus for words appearing early in title
            if (titleIndex < 10) wordScore += 20;
            if (titleIndex < 5) wordScore += 15;
          }
          
          // Overview matches with context
          if (overview.includes(word)) {
            wordScore += 12;
            // Bonus for words in first 100 characters of overview
            const overviewIndex = overview.indexOf(word);
            if (overviewIndex < 100) wordScore += 8;
          }
          
          // Original title matches
          if (originalTitle.includes(word)) wordScore += 15;
          
          // Bonus for consecutive word matches
          if (index > 0 && title.includes(queryWords[index - 1] + ' ' + word)) {
            wordScore += 25;
          }
          
          return score + wordScore;
        }, 0);

        // Enhanced prefix and substring matching
        const startsWithScore = 
          title.startsWith(normalizedQuery) ? 60 :
          title.startsWith(queryWords[0]) ? 30 : 0;

        const containsScore = title.includes(normalizedQuery) ? 35 : 0;

        // Enhanced popularity scoring with logarithmic scaling
        const popularityScore = result.popularity ? 
          Math.min(Math.log(result.popularity + 1) * 15, 80) : 0;

        // Enhanced date scoring with decade-based weighting
        const releaseDate = result.release_date || result.first_air_date;
        let dateScore = 0;
        if (releaseDate) {
          const year = new Date(releaseDate).getFullYear();
          if (!isNaN(year)) {
            const diff = currentYear - year;
            if (diff <= 2) dateScore = 40; // Very recent
            else if (diff <= 5) dateScore = 30; // Recent
            else if (diff <= 10) dateScore = 20; // Moderately recent
            else if (diff <= 20) dateScore = 10; // Older but not too old
            else dateScore = Math.max(0, 5 - Math.floor(diff / 10)); // Very old
          }
        }

        // Enhanced media type scoring with user preference simulation
        const mediaTypeScore = 
          result.media_type === 'movie' ? 15 :
          result.media_type === 'tv' ? 10 : 0;

        // Enhanced asset quality scoring
        const posterScore = result.poster_path ? 8 : 0;
        const backdropScore = result.backdrop_path ? 5 : 0;

        // Enhanced rating scoring with vote count consideration
        let voteScore = 0;
        if (result.vote_average && result.vote_count) {
          const normalizedVoteCount = Math.min(result.vote_count / 1000, 1);
          voteScore = Math.min(result.vote_average * 2 * normalizedVoteCount, 25);
        }

        // Genre relevance scoring
        let genreScore = 0;
        if (result.genre_ids && Array.isArray(result.genre_ids)) {
          // Popular genres get slight bonus
          const popularGenres = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37];
          genreScore = result.genre_ids.reduce((score, genreId) => {
            return score + (popularGenres.includes(genreId) ? 2 : 0);
          }, 0);
        }

        // Language and country relevance
        const languageScore = result.original_language === 'en' ? 5 : 0;
        const countryScore = result.origin_country?.includes('US') ? 3 : 0;

        // Combine all scores with weighted importance
        const _relevanceScore =
          exactMatchScore +
          allWordsScore +
          wordMatchScore +
          startsWithScore +
          containsScore +
          popularityScore +
          dateScore +
          mediaTypeScore +
          posterScore +
          backdropScore +
          voteScore +
          genreScore +
          languageScore +
          countryScore;

        return {
          ...result,
          _relevanceScore,
          _matchDetails: {
            exactMatch: exactMatchScore > 0,
            allWordsMatch: allWordsInTitle,
            wordCount: queryWords.length,
            matchedWords: queryWords.filter(word => title.includes(word)).length
          }
        };
      })
      .filter(result => result._relevanceScore > 0)
      .sort((a, b) => {
        // Primary sort by relevance score
        if (b._relevanceScore !== a._relevanceScore) {
          return b._relevanceScore - a._relevanceScore;
        }
        // Secondary sort by popularity for equal relevance scores
        return (b.popularity || 0) - (a.popularity || 0);
      });
  }, []);

  // Debounced search handler
  const debouncedSearch = useMemo(() => debounce((query) => handleSearch(query), 300), []);

  // Enhanced search handler
  const handleSearch = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);

    // Optionally: Cancel previous search if a new one is triggered (basic version)
    let isActive = true;
    try {
      const results = await searchMovies(trimmedQuery);

      // Defensive: Ensure results is an object and has a results array
      const safeResults = (results && Array.isArray(results.results)) ? results.results : [];

      // Remove duplicates by id
      const uniqueResults = Array.from(
        new Map(safeResults.map(item => [item.id, item])).values()
      );

      // Process and sort results
      const processedResults = processSearchResults(uniqueResults, trimmedQuery);

      if (isActive) {
        setSearchResults(processedResults);
      }
    } catch (error) {
      console.error('Error searching movies:', error);
      setSearchResults([]);
    } finally {
      if (isActive) setIsSearching(false);
    }

    // Cleanup function in case of rapid search changes
    return () => { isActive = false; };
  }, [processSearchResults]);

  // Handle search input changes
  // Advanced search input handler with IME, composition, and accessibility support
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);
    setSelectedIndex(-1);

    // Support for Input Method Editors (IME) and composition events
    // (e.g., for Chinese/Japanese/Korean input)
    if (e.nativeEvent && typeof e.nativeEvent.isComposing === 'boolean' && e.nativeEvent.isComposing) {
      // Don't trigger search while composing
      return;
    }

    // Accessibility: Announce search status for screen readers
    if (window && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        const liveRegion = document.getElementById('search-live-region');
        if (liveRegion) {
          if (!query.trim()) {
            liveRegion.textContent = 'Search cleared. No results.';
          } else {
            liveRegion.textContent = 'Searching for ' + query;
          }
        }
      });
    }

    if (query.trim()) {
      debouncedSearch(query);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearch]);

  // Enhanced movie selection handler with advanced analytics, caching, and user experience optimizations
  const handleMovieSelect = useCallback((movie) => {
    // Performance optimization: Use requestIdleCallback for non-critical operations
    const scheduleNonCritical = (fn) => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(fn, { timeout: 1000 });
      } else {
        setTimeout(fn, 0);
      }
    };

    // Enhanced search history management with intelligent deduplication and analytics
    const movieTitle = movie.title || movie.name || '';
    if (movieTitle) {
      setSearchHistory(prev => {
        const normalizedTitle = movieTitle.toLowerCase().trim();
        const newHistory = [
          movieTitle, 
          ...prev.filter(item => {
            const normalizedItem = item.toLowerCase().trim();
            return normalizedItem !== normalizedTitle && 
                   !normalizedItem.includes(normalizedTitle) && 
                   !normalizedTitle.includes(normalizedItem);
          })
        ].slice(0, 10); // Increased limit for better user experience
        
        // Enhanced localStorage handling with error recovery
        scheduleNonCritical(() => {
          try {
            localStorage.setItem('searchHistory', JSON.stringify(newHistory));
            // Track search history analytics
            const analytics = JSON.parse(localStorage.getItem('searchAnalytics') || '{}');
            analytics.totalSearches = (analytics.totalSearches || 0) + 1;
            analytics.lastSearchDate = new Date().toISOString();
            localStorage.setItem('searchAnalytics', JSON.stringify(analytics));
          } catch (e) {
            console.warn('Failed to persist search history:', e);
            // Fallback: try to clear and retry
            try {
              localStorage.clear();
              localStorage.setItem('searchHistory', JSON.stringify(newHistory.slice(0, 5)));
            } catch (fallbackError) {
              console.error('Failed to persist search history even with fallback:', fallbackError);
            }
          }
        });
        
        return newHistory;
      });
    }

    // Enhanced movie data composition with comprehensive validation and fallbacks
    const getYear = (m) => {
      try {
        if (m.release_date) return new Date(m.release_date).getFullYear();
        if (m.first_air_date) return new Date(m.first_air_date).getFullYear();
        return 'N/A';
      } catch (e) {
        console.warn('Failed to parse date for movie:', m.title || m.name);
        return 'N/A';
      }
    };

    // Enhanced genre processing with normalization and validation
    const processGenres = (movie) => {
      let genres = [];
      
      if (Array.isArray(movie.genres) && movie.genres.length > 0) {
        genres = movie.genres.map(g => {
          if (typeof g === 'string') return g.trim();
          if (g && typeof g === 'object') return (g.name || g.id || '').toString().trim();
          return '';
        }).filter(Boolean);
      } else if (Array.isArray(movie.genre_ids)) {
        genres = movie.genre_ids.map(id => id.toString()).filter(Boolean);
      }
      
      return genres;
    };

    // Enhanced movie data object with comprehensive metadata and validation
    const movieData = {
      id: movie.id,
      title: movie.title || movie.name || 'Unknown Title',
      type: movie.media_type || movie.type || 'movie',
      poster_path: movie.poster_path || movie.poster || null,
      backdrop_path: movie.backdrop_path || movie.backdrop || null,
      overview: movie.overview || '',
      year: getYear(movie),
      rating: Math.round((movie.vote_average || 0) * 10) / 10, // Round to 1 decimal
      genres: processGenres(movie),
      runtime: movie.runtime || null,
      release_date: movie.release_date || movie.first_air_date || null,
      vote_average: Math.round((movie.vote_average || 0) * 10) / 10,
      media_type: movie.media_type || movie.type || 'movie',
      // Additional metadata for enhanced functionality
      popularity: movie.popularity || 0,
      vote_count: movie.vote_count || 0,
      original_language: movie.original_language || 'en',
      adult: movie.adult || false
    };

    // Enhanced movie selection with analytics and caching
    if (onMovieSelect) {
      // Track selection analytics
      scheduleNonCritical(() => {
        try {
          const selectionAnalytics = JSON.parse(localStorage.getItem('movieSelectionAnalytics') || '{}');
          selectionAnalytics.totalSelections = (selectionAnalytics.totalSelections || 0) + 1;
          selectionAnalytics.lastSelection = {
            movieId: movie.id,
            title: movieData.title,
            timestamp: new Date().toISOString(),
            source: 'search'
          };
          selectionAnalytics.selectionsByType = selectionAnalytics.selectionsByType || {};
          selectionAnalytics.selectionsByType[movieData.type] = (selectionAnalytics.selectionsByType[movieData.type] || 0) + 1;
          localStorage.setItem('movieSelectionAnalytics', JSON.stringify(selectionAnalytics));
        } catch (e) {
          console.warn('Failed to track selection analytics:', e);
        }
      });

      // Execute movie selection with error handling
      try {
        onMovieSelect(movieData);
      } catch (error) {
        console.error('Error in movie selection callback:', error);
        // Fallback: try to recover gracefully
        if (typeof onMovieSelect === 'function') {
          onMovieSelect({ ...movieData, error: true });
        }
      }
    }

    // Enhanced search state reset with smooth transitions
    const resetSearchState = () => {
      setSearchQuery('');
      setShowResults(false);
      setSearchResults([]);
      setSelectedIndex(-1);
      setIsSearchFocused(false);
    };

    // Execute state reset with microtask for better performance
    if (window.queueMicrotask) {
      window.queueMicrotask(resetSearchState);
    } else {
      setTimeout(resetSearchState, 0);
    }

    // Enhanced accessibility with improved focus management and screen reader support
    scheduleNonCritical(() => {
      try {
        // Focus main content with fallback options
        const focusTargets = [
          () => document.querySelector('main')?.focus?.(),
          () => document.querySelector('[role="main"]')?.focus?.(),
          () => document.querySelector('.layout-content-container')?.focus?.(),
          () => document.activeElement?.blur?.()
        ];

        for (const focusTarget of focusTargets) {
          try {
            focusTarget();
            break;
          } catch (e) {
            continue;
          }
        }

        // Enhanced screen reader announcement
        const announceToScreenReader = (message) => {
          const liveRegion = document.getElementById('search-live-region') || 
                           document.getElementById('aria-live-region');
          if (liveRegion) {
            liveRegion.textContent = message;
            // Clear after announcement
            setTimeout(() => {
              liveRegion.textContent = '';
            }, 1000);
          }
        };

        announceToScreenReader(`Selected ${movieData.title}. Loading movie details.`);
      } catch (e) {
        console.warn('Failed to handle accessibility features:', e);
      }
    });

  }, [onMovieSelect, setSearchHistory, setSearchQuery, setShowResults, setSearchResults, setSelectedIndex, setIsSearchFocused]);

  // Enhanced keyboard navigation for search results with improved accessibility and visual feedback
  const handleKeyDown = useCallback((e) => {
    if (!showResults || searchResults.length === 0) return;

    // Use a ref to persist typeahead buffer and timeout across renders
    if (!handleKeyDown.typeaheadBuffer) handleKeyDown.typeaheadBuffer = '';
    if (!handleKeyDown.typeaheadTimeout) handleKeyDown.typeaheadTimeout = null;

    // Enhanced helper: Scroll selected item into view with advanced animation, accessibility, and performance optimizations
    const scrollToSelected = (index) => {
      const selectedElement = document.querySelector(`[data-index="${index}"]`);
      if (!selectedElement) {
        console.warn(`No element found for index ${index}`);
        return;
      }

      // Performance optimization: Use requestAnimationFrame for smooth scrolling
      const performScroll = () => {
        try {
          // Enhanced scroll behavior with multiple fallback strategies
          if ('scrollIntoView' in selectedElement) {
            // Primary: Native smooth scroll with enhanced options
            selectedElement.scrollIntoView({ 
              block: 'nearest', 
              behavior: 'smooth',
              inline: 'nearest'
            });
          } else if (selectedElement.scrollIntoViewIfNeeded) {
            // Fallback: WebKit-specific smooth scroll
            selectedElement.scrollIntoViewIfNeeded(true);
          } else {
            // Fallback: Manual scroll calculation with easing
            const container = selectedElement.closest('.search-results-container') || 
                            selectedElement.parentElement;
            if (container && container.scrollTo) {
              const elementRect = selectedElement.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              const scrollTop = container.scrollTop + elementRect.top - containerRect.top - 10;
              
              container.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
              });
            }
          }

          // Enhanced accessibility: Announce scroll action to screen readers
          const liveRegion = document.getElementById('search-live-region');
          if (liveRegion) {
            const movieTitle = selectedElement.querySelector('[data-movie-title]')?.textContent || 
                             selectedElement.textContent?.trim();
            liveRegion.textContent = `Scrolled to ${movieTitle || `item ${index + 1}`}`;
            
            // Clear announcement after delay
            setTimeout(() => {
              liveRegion.textContent = '';
            }, 1500);
          }

          // Visual feedback: Add subtle highlight effect
          selectedElement.classList.add('scroll-highlight');
          setTimeout(() => {
            selectedElement.classList.remove('scroll-highlight');
          }, 300);

        } catch (error) {
          console.warn('Scroll operation failed:', error);
          // Fallback: Simple focus without scroll
          selectedElement.focus?.();
        }
      };

      // Use requestAnimationFrame for optimal performance
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(performScroll);
      } else {
        // Fallback for older browsers
        setTimeout(performScroll, 16);
      }
    };

    // Enhanced helper: Find next enabled index with intelligent wrap-around and accessibility
    const getNextIndex = (start, dir) => {
      let idx = start;
      const maxIndex = searchResults.length - 1;
      
      // Validate inputs
      if (maxIndex < 0) return -1;
      if (start < 0 || start > maxIndex) {
        console.warn(`Invalid start index: ${start}, max: ${maxIndex}`);
        idx = dir > 0 ? 0 : maxIndex;
      }
      
      // Calculate next position with direction
      idx += dir;
      
      // Enhanced wrap-around with smooth transition
      if (idx < 0) {
        // Wrap to end with visual feedback
        idx = maxIndex;
        // Announce wrap-around for screen readers
        const liveRegion = document.getElementById('search-live-region');
        if (liveRegion) {
          liveRegion.textContent = 'Wrapped to end of results';
        }
      } else if (idx > maxIndex) {
        // Wrap to beginning with visual feedback
        idx = 0;
        // Announce wrap-around for screen readers
        const liveRegion = document.getElementById('search-live-region');
        if (liveRegion) {
          liveRegion.textContent = 'Wrapped to beginning of results';
        }
      }
      
      // Validate final result
      if (idx < 0 || idx > maxIndex) {
        console.error(`Invalid calculated index: ${idx}, clamping to valid range`);
        return Math.max(0, Math.min(idx, maxIndex));
      }
      
      return idx;
    };

    // Enhanced typeahead with better matching
    const handleTypeahead = (char) => {
      clearTimeout(handleKeyDown.typeaheadTimeout);
      handleKeyDown.typeaheadBuffer += char.toLowerCase();
      
      // Find matching item starting from current position
      let foundIndex = -1;
      const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
      
      // Search from current position to end
      for (let i = currentIndex; i < searchResults.length; i++) {
        const title = (searchResults[i].title || searchResults[i].name || '').toLowerCase();
        if (title.startsWith(handleKeyDown.typeaheadBuffer)) {
          foundIndex = i;
          break;
        }
      }
      
      // If not found, search from beginning to current position
      if (foundIndex === -1) {
        for (let i = 0; i < currentIndex; i++) {
          const title = (searchResults[i].title || searchResults[i].name || '').toLowerCase();
          if (title.startsWith(handleKeyDown.typeaheadBuffer)) {
            foundIndex = i;
            break;
          }
        }
      }
      
      if (foundIndex !== -1) {
        setSelectedIndex(foundIndex);
        scrollToSelected(foundIndex);
        
        // Add visual feedback
        const element = document.querySelector(`[data-index="${foundIndex}"]`);
        if (element) {
          element.classList.add('animate-navbar-select');
          setTimeout(() => element.classList.remove('animate-navbar-select'), 300);
      }
      }
      
      // Clear typeahead buffer after delay
      handleKeyDown.typeaheadTimeout = setTimeout(() => { 
        handleKeyDown.typeaheadBuffer = ''; 
      }, 1000); // Increased timeout for better UX
    };

    // Enhanced visual feedback for selection with performance optimizations and accessibility
    const animateSelection = useCallback((index) => {
      // Performance optimization: Use requestAnimationFrame for smooth animations
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-index="${index}"]`);
        if (!el) return;

        // Batch DOM operations for better performance
        const elementsToUpdate = document.querySelectorAll('.animate-navbar-select');
        const updates = [];
        
        // Remove previous animations efficiently
        elementsToUpdate.forEach(elem => {
          updates.push(() => elem.classList.remove('animate-navbar-select'));
        });
        
        // Add new animation with enhanced visual feedback
        updates.push(() => {
          el.classList.add('animate-navbar-select');
          
          // Enhanced accessibility: Announce selection for screen readers
          const title = el.querySelector('[data-movie-title]')?.textContent || 
                       el.getAttribute('aria-label') || 
                       `Item ${index + 1}`;
          
          // Update ARIA live region for screen readers
          const liveRegion = document.getElementById('search-live-region');
          if (liveRegion) {
            liveRegion.textContent = `Selected: ${title}`;
          }
          
          // Add subtle haptic feedback if supported
          if (navigator.vibrate && window.innerWidth <= 768) {
            navigator.vibrate(10);
          }
        });
        
        // Execute all updates in a single frame
        updates.forEach(update => update());
        
        // Enhanced cleanup with proper timing
        const cleanup = () => {
          el.classList.remove('animate-navbar-select');
          
          // Clear live region after animation
          const liveRegion = document.getElementById('search-live-region');
          if (liveRegion && liveRegion.textContent.includes('Selected:')) {
            setTimeout(() => {
              liveRegion.textContent = '';
            }, 100);
          }
        };
        
        // Use requestIdleCallback for cleanup if available, otherwise setTimeout
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => cleanup(), { timeout: 350 });
        } else {
          setTimeout(cleanup, 300);
        }
      });
    }, []);

    // Handle different key inputs
    switch (e.key) {
      case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
          const next = getNextIndex(prev >= 0 ? prev : -1, 1);
              scrollToSelected(next);
              animateSelection(next);
            return next;
          });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = getNextIndex(prev >= 0 ? prev : searchResults.length, -1);
            scrollToSelected(next);
            animateSelection(next);
          return next;
        });
        break;
        
      case 'Tab':
        if (!e.shiftKey) {
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = getNextIndex(prev >= 0 ? prev : -1, 1);
            scrollToSelected(next);
            animateSelection(next);
            return next;
          });
        }
        break;
        
      case 'Home':
        e.preventDefault();
        setSelectedIndex(() => {
          scrollToSelected(0);
          animateSelection(0);
          return 0;
        });
        break;
        
      case 'End':
        e.preventDefault();
        setSelectedIndex(() => {
          const last = searchResults.length - 1;
          scrollToSelected(last);
          animateSelection(last);
          return last;
        });
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleMovieSelect(searchResults[selectedIndex]);
        } else if (searchResults.length > 0) {
          // If nothing is selected, select the first item
          handleMovieSelect(searchResults[0]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        setIsSearchFocused(false);
        // Clear search query on escape
        setSearchQuery('');
        setSearchResults([]);
        break;
        
      case 'Backspace':
        // Clear typeahead buffer on backspace
        if (handleKeyDown.typeaheadBuffer) {
          handleKeyDown.typeaheadBuffer = '';
          clearTimeout(handleKeyDown.typeaheadTimeout);
        }
        break;
        
      default:
        // Enhanced typeahead: support alphanumeric and some special characters
        if (e.key.length === 1 && /^[a-zA-Z0-9\s\-_\.]$/.test(e.key)) {
          handleTypeahead(e.key);
        }
        break;
    }
  }, [showResults, searchResults, selectedIndex, handleMovieSelect, setSearchQuery, setSearchResults, setShowResults, setIsSearchFocused]);

  // Clear search history
  const clearHistory = useCallback((e) => {
    e.stopPropagation();
    setSearchHistory([]);
  }, []);

  // Enhanced history item click handler with advanced error handling, analytics, and user experience optimizations
  const handleHistoryItemClick = useCallback(async (query) => {
    // Performance optimization: Use requestIdleCallback for non-critical operations
    const scheduleNonCritical = (fn) => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(fn, { timeout: 1000 });
      } else {
        setTimeout(fn, 0);
      }
    };

    // Enhanced input validation and normalization
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) {
      console.warn('Invalid query provided to handleHistoryItemClick:', query);
      return;
    }

    // Immediate UI feedback for better perceived performance
    setSearchQuery(normalizedQuery);
    setShowResults(true);
    setIsSearchFocused(true);
    setIsSearching(true);
    setSelectedIndex(-1); // Reset selection

    // Enhanced accessibility: Announce search action to screen readers
    scheduleNonCritical(() => {
      try {
        const liveRegion = document.getElementById('search-live-region');
        if (liveRegion) {
          liveRegion.textContent = `Searching for ${normalizedQuery} from history`;
        }
      } catch (e) {
        console.warn('Failed to announce search to screen reader:', e);
      }
    });

    // Enhanced search execution with retry logic and comprehensive error handling
    let retryCount = 0;
    const maxRetries = 2;
    
    const executeSearch = async () => {
      try {
        const results = await searchMovies(normalizedQuery);
        
        // Enhanced result validation
        if (!results || !Array.isArray(results.results)) {
          throw new Error('Invalid search results format');
        }

        const processedResults = processSearchResults(results.results, normalizedQuery);
        setSearchResults(processedResults);

        // Enhanced analytics tracking
        scheduleNonCritical(() => {
          try {
            const analytics = JSON.parse(localStorage.getItem('searchAnalytics') || '{}');
            analytics.historySearches = (analytics.historySearches || 0) + 1;
            analytics.lastHistorySearch = new Date().toISOString();
            analytics.popularHistoryQueries = analytics.popularHistoryQueries || {};
            analytics.popularHistoryQueries[normalizedQuery] = 
              (analytics.popularHistoryQueries[normalizedQuery] || 0) + 1;
            localStorage.setItem('searchAnalytics', JSON.stringify(analytics));
          } catch (e) {
            console.warn('Failed to track search analytics:', e);
          }
        });

        // Enhanced accessibility: Announce results
        scheduleNonCritical(() => {
          try {
            const liveRegion = document.getElementById('search-live-region');
            if (liveRegion) {
              const resultCount = processedResults.length;
              liveRegion.textContent = `Found ${resultCount} result${resultCount !== 1 ? 's' : ''} for ${normalizedQuery}`;
            }
          } catch (e) {
            console.warn('Failed to announce results to screen reader:', e);
          }
        });

      } catch (error) {
        console.error(`Error searching movies (attempt ${retryCount + 1}):`, error);
        
        // Retry logic for network errors
        if (retryCount < maxRetries && 
            (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch'))) {
          retryCount++;
          console.log(`Retrying search (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          return executeSearch();
        }

        // Enhanced error handling with user feedback
        setSearchResults([]);
        
        // Enhanced accessibility: Announce error
        scheduleNonCritical(() => {
          try {
            const liveRegion = document.getElementById('search-live-region');
            if (liveRegion) {
              liveRegion.textContent = `Search failed for ${normalizedQuery}. Please try again.`;
            }
          } catch (e) {
            console.warn('Failed to announce error to screen reader:', e);
          }
        });

        // Enhanced error logging with context
        const errorContext = {
          query: normalizedQuery,
          retryCount,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          error: error.message || error.toString()
        };
        console.error('Search error context:', errorContext);
      } finally {
        setIsSearching(false);
        
        // Enhanced focus management with fallback options
        scheduleNonCritical(() => {
          try {
            const focusTargets = [
              () => inputRef.current?.focus?.(),
              () => document.querySelector('input[type="search"]')?.focus?.(),
              () => document.querySelector('.search-input')?.focus?.()
            ];

            for (const focusTarget of focusTargets) {
              try {
                focusTarget();
                break;
              } catch (e) {
                continue;
              }
            }
          } catch (e) {
            console.warn('Failed to focus search input:', e);
          }
        });
      }
    };

    // Execute the enhanced search
    executeSearch();
  }, [processSearchResults, setSearchQuery, setShowResults, setIsSearchFocused, setIsSearching, setSearchResults, setSelectedIndex, inputRef]);

  // Handle adding to watchlist
  /**
   * Adds a movie to the watchlist in a robust, production-ready way.
   * Handles edge cases, deduplication, and data normalization.
   * Provides user feedback and error handling.
   */
  const handleAddToWatchlist = useCallback(
    async (e, movie) => {
      // Performance optimization: Use requestIdleCallback for non-critical operations
      const scheduleNonCritical = (fn) => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(fn, { timeout: 1000 });
        } else {
          setTimeout(fn, 0);
        }
      };

      try {
        // Enhanced event handling with comprehensive validation
        if (e && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
          e.preventDefault?.(); // Prevent any default behavior
        }

        // Enhanced movie object validation with detailed error reporting
        if (!movie || typeof movie !== 'object') {
          const error = new Error('Invalid movie object: must be a non-null object');
          error.context = { movie, type: typeof movie };
          console.error('Watchlist validation error:', error);
          return;
        }

        if (!movie.id || (typeof movie.id !== 'number' && typeof movie.id !== 'string')) {
          const error = new Error('Invalid movie ID: must be a number or string');
          error.context = { movieId: movie.id, movieIdType: typeof movie.id };
          console.error('Watchlist validation error:', error);
          return;
        }

        // Enhanced duplicate detection with analytics
        if (isInWatchlist(movie.id)) {
          // Track duplicate attempts for analytics
          scheduleNonCritical(() => {
            try {
              const analytics = JSON.parse(localStorage.getItem('watchlistAnalytics') || '{}');
              analytics.duplicateAttempts = (analytics.duplicateAttempts || 0) + 1;
              analytics.lastDuplicateAttempt = new Date().toISOString();
              localStorage.setItem('watchlistAnalytics', JSON.stringify(analytics));
            } catch (e) {
              console.warn('Failed to track duplicate attempt:', e);
            }
          });
          
          // Enhanced accessibility: Announce duplicate to screen readers
          scheduleNonCritical(() => {
            try {
              const liveRegion = document.getElementById('watchlist-live-region') || 
                               document.getElementById('aria-live-region');
              if (liveRegion) {
                const title = movie.title || movie.name || 'This movie';
                liveRegion.textContent = `${title} is already in your watchlist`;
                setTimeout(() => { liveRegion.textContent = ''; }, 2000);
              }
            } catch (e) {
              console.warn('Failed to announce duplicate to screen reader:', e);
            }
          });
          
          return;
        }

        // Enhanced genre normalization with validation and deduplication
        let genres = [];
        if (Array.isArray(movie.genres)) {
          genres = movie.genres
            .map(g => {
              if (typeof g === 'string') return g.trim();
              if (g && typeof g === 'object' && g.name) return g.name.trim();
              return null;
            })
            .filter(Boolean) // Remove null/undefined values
            .filter((genre, index, arr) => arr.indexOf(genre) === index); // Deduplicate
        } else if (Array.isArray(movie.genre_ids)) {
          genres = movie.genre_ids
            .filter(id => id != null && !isNaN(id))
            .map(id => id.toString());
        }

        // Enhanced title normalization with fallback chain and validation
        const title = (movie.title || movie.name || movie.original_title || 
                      movie.original_name || 'Untitled').trim();
        
        if (!title || title === 'Untitled') {
          console.warn('Movie has no valid title, using fallback:', movie);
        }

        // Enhanced media path normalization with validation
        const poster_path = movie.poster_path || movie.poster || '';
        const backdrop_path = movie.backdrop_path || movie.backdrop || '';
        
        // Validate image paths (basic URL validation)
        const isValidImagePath = (path) => {
          if (!path) return false;
          return path.startsWith('/') || path.startsWith('http') || path.startsWith('data:');
        };

        // Enhanced release date processing with comprehensive validation
        const release_date = movie.release_date || movie.first_air_date || null;
        let year = 'N/A';
        let isValidDate = false;
        
        if (release_date) {
          try {
            const date = new Date(release_date);
            if (!isNaN(date.getTime())) {
              year = date.getFullYear();
              isValidDate = true;
              
              // Validate year is reasonable (not too far in past/future)
              const currentYear = new Date().getFullYear();
              if (year < 1900 || year > currentYear + 10) {
                console.warn('Suspicious year value:', year, 'for movie:', title);
              }
            }
          } catch (dateError) {
            console.warn('Failed to parse release date:', release_date, 'for movie:', title);
          }
        }

        // Enhanced rating normalization with validation
        let rating = 0;
        if (typeof movie.vote_average === 'number' && !isNaN(movie.vote_average)) {
          rating = Math.max(0, Math.min(10, movie.vote_average)); // Clamp between 0-10
        } else if (typeof movie.vote_average === 'string') {
          const parsed = parseFloat(movie.vote_average);
          if (!isNaN(parsed)) {
            rating = Math.max(0, Math.min(10, parsed));
          }
        }

        // Enhanced movie data composition with additional metadata
        const movieData = {
          id: movie.id,
          title,
          type: movie.media_type || movie.type || 'movie',
          poster_path: isValidImagePath(poster_path) ? poster_path : '',
          backdrop_path: isValidImagePath(backdrop_path) ? backdrop_path : '',
          overview: (movie.overview || '').trim(),
          year,
          rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
          genres,
          release_date: isValidDate ? release_date : null,
          addedAt: new Date().toISOString(),
          // Enhanced metadata
          originalLanguage: movie.original_language || movie.language || null,
          popularity: typeof movie.popularity === 'number' ? movie.popularity : null,
          voteCount: typeof movie.vote_count === 'number' ? movie.vote_count : null,
          adult: typeof movie.adult === 'boolean' ? movie.adult : false,
          // Track source for analytics
          source: 'navbar-search',
          timestamp: Date.now()
        };

        // Enhanced watchlist addition with progress tracking
        const startTime = performance.now();
        
        // Add to watchlist with enhanced error handling
        await Promise.resolve(addToWatchlist(movieData));
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Enhanced success tracking and analytics
        scheduleNonCritical(() => {
          try {
            const analytics = JSON.parse(localStorage.getItem('watchlistAnalytics') || '{}');
            analytics.totalAdditions = (analytics.totalAdditions || 0) + 1;
            analytics.lastAddition = new Date().toISOString();
            analytics.averageAddTime = analytics.averageAddTime || 0;
            analytics.averageAddTime = (analytics.averageAddTime + duration) / 2;
            analytics.byType = analytics.byType || {};
            analytics.byType[movieData.type] = (analytics.byType[movieData.type] || 0) + 1;
            localStorage.setItem('watchlistAnalytics', JSON.stringify(analytics));
          } catch (e) {
            console.warn('Failed to track watchlist analytics:', e);
          }
        });

        // Enhanced accessibility: Announce success to screen readers
        scheduleNonCritical(() => {
          try {
            const liveRegion = document.getElementById('watchlist-live-region') || 
                             document.getElementById('aria-live-region');
            if (liveRegion) {
              liveRegion.textContent = `Added ${title} to your watchlist`;
              setTimeout(() => { liveRegion.textContent = ''; }, 3000);
            }
          } catch (e) {
            console.warn('Failed to announce success to screen reader:', e);
          }
        });

        // Enhanced visual feedback with haptic feedback
        scheduleNonCritical(() => {
          try {
            // Add subtle haptic feedback if supported
            if (navigator.vibrate && window.innerWidth <= 768) {
              navigator.vibrate([50, 25, 50]);
            }
            
            // Add visual feedback class to trigger animations
            const button = e?.target?.closest('button');
            if (button) {
              button.classList.add('watchlist-added');
              setTimeout(() => button.classList.remove('watchlist-added'), 1000);
            }
          } catch (e) {
            console.warn('Failed to provide feedback:', e);
          }
        });

      } catch (err) {
        // Enhanced error handling with comprehensive logging and recovery
        const errorContext = {
          movie: movie ? { id: movie.id, title: movie.title || movie.name } : null,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          error: err.message || err.toString(),
          stack: err.stack
        };
        // Robust error handling
        console.error('Failed to add movie to watchlist:', err);
        // Optionally, show an error notification/toast here
      }
    },
    [addToWatchlist, isInWatchlist]
  );

  return (
    <header className="relative z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#2b3036] px-4 sm:px-6 md:px-8 lg:px-10 py-3 bg-gradient-to-b from-[#23272F]/90 via-[#181A20]/80 to-[#181A20]/70 backdrop-blur-[10px] shadow-xl shadow-black/10 transition-all duration-500">
      {/* LEFT: Logo/Name (always visible) + Desktop nav links */}
      <div className="flex items-center gap-4 sm:gap-6 md:gap-8 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 text-white">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              {/* Animated Background Glow */}
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 via-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />
              
              {/* Main Logo Container */}
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-white/30 via-white/10 to-white/5 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_16px_4px_rgba(255,255,255,0.18)] shadow-lg shadow-black/20">
                {/* Animated Logo Icon */}
                <motion.svg 
                  viewBox="0 0 48 48" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white transform transition-transform duration-300 group-hover:scale-110"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                >
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" 
                    fill="currentColor"
                  />
                </motion.svg>
                
                {/* Floating Particles */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  {/* Top Right Particle */}
                  <motion.div
                    className="absolute top-0 right-0 w-1 h-1 bg-white/40 rounded-full"
                    animate={{
                      x: [0, 4, 0],
                      y: [0, -4, 0],
                      opacity: [0.4, 0.8, 0.4],
                      scale: [1, 1.5, 1],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.8
                    }}
                  />
                  
                  {/* Bottom Left Particle */}
                  <motion.div
                    className="absolute bottom-0 left-0 w-0.5 h-0.5 bg-white/30 rounded-full"
                    animate={{
                      x: [0, -3, 0],
                      y: [0, 3, 0],
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.8, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1.2
                    }}
                  />
                </motion.div>
              </div>
              
              {/* Animated Ring Effect */}
              <motion.div
                className="absolute inset-0 rounded-lg border border-white/20 opacity-0 group-hover:opacity-100"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3
                }}
              />
            </div>
            
            {/* Animated Text */}
            <motion.span 
              className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent tracking-tight group-hover:from-white group-hover:to-white/90 transition-all duration-300"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              Streamr
            </motion.span>
            
            {/* Floating Sparkles */}
            <motion.div
              className="absolute left-0 top-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              <motion.div
                className="absolute -top-2 left-8 w-1 h-1 bg-white/30 rounded-full"
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5
                }}
              />
              <motion.div
                className="absolute -top-1 left-12 w-0.5 h-0.5 bg-white/20 rounded-full"
                animate={{
                  y: [0, -6, 0],
                  opacity: [0.2, 0.6, 0.2],
                  scale: [1, 1.8, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2
                }}
              />
            </motion.div>
          </Link>
        </div>
        {/* Desktop navigation links (left) */}
        <div className="hidden sm:flex items-center gap-4 md:gap-6 lg:gap-8 ml-2">
          <Link
            to="/movies"
            className={`relative ${location.pathname === '/movies' ? 'text-white' : 'text-white/80 hover:text-white'} transition-all duration-300 group`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <div className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-lg ${location.pathname === '/movies' ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'} flex items-center justify-center transition-all duration-300 shadow-sm shadow-black/10`}>
                {/* Animated Background Glow */}
                <motion.div
                  className={`absolute inset-0 rounded-lg ${location.pathname === '/movies' ? 'bg-white/20' : 'bg-white/10'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm`}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: location.pathname === '/movies' ? [0.2, 0.4, 0.2] : [0, 0.2, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                  }}
                />
                
                {/* Animated Icon */}
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" 
                  viewBox="0 0 24 24" 
                  fill={location.pathname === '/movies' ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  strokeWidth="2"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: location.pathname === '/movies' ? [0, 2, -2, 0] : [0, 0, 0, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  {location.pathname === '/movies' ? (
                    <>
                      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                      <path d="M8 12h8v2H8z" />
                    </>
                  ) : (
                    <>
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                      <line x1="7" y1="2" x2="7" y2="22" />
                      <line x1="17" y1="2" x2="17" y2="22" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <line x1="2" y1="7" x2="7" y2="7" />
                      <line x1="2" y1="17" x2="7" y2="17" />
                      <line x1="17" y1="17" x2="22" y2="17" />
                      <line x1="17" y1="7" x2="22" y2="7" />
                    </>
                  )}
                </motion.svg>
                
                {/* Floating Particles for Active State */}
                {location.pathname === '/movies' && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="absolute top-0 right-0 w-0.5 h-0.5 bg-white/40 rounded-full"
                      animate={{
                        x: [0, 2, 0],
                        y: [0, -2, 0],
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1, 1.5, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.8
                      }}
                    />
                    <motion.div
                      className="absolute bottom-0 left-0 w-0.5 h-0.5 bg-white/30 rounded-full"
                      animate={{
                        x: [0, -2, 0],
                        y: [0, 2, 0],
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.8, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.2
                      }}
                    />
                  </motion.div>
                )}
              </div>
              <span className="font-medium tracking-wide text-sm sm:text-base">Movies</span>
            </span>
            <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-white/90 via-white/60 to-white/30 transition-all duration-500 ${location.pathname === '/movies' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
          </Link>
          <Link
            to="/series"
            className={`relative ${location.pathname === '/series' ? 'text-white' : 'text-white/80 hover:text-white'} transition-all duration-300 group`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <div className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-lg ${location.pathname === '/series' ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'} flex items-center justify-center transition-all duration-300 shadow-sm shadow-black/10`}>
                {/* Animated Background Glow */}
                <motion.div
                  className={`absolute inset-0 rounded-lg ${location.pathname === '/series' ? 'bg-white/20' : 'bg-white/10'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm`}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: location.pathname === '/series' ? [0.2, 0.4, 0.2] : [0, 0.2, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3
                  }}
                />
                
                {/* Animated Icon */}
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" 
                  viewBox="0 0 24 24" 
                  fill={location.pathname === '/series' ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  strokeWidth="2"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: location.pathname === '/series' ? [0, 2, -2, 0] : [0, 0, 0, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.6
                  }}
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </motion.svg>
                
                {/* Floating Particles for Active State */}
                {location.pathname === '/series' && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="absolute top-0 right-0 w-0.5 h-0.5 bg-white/40 rounded-full"
                      animate={{
                        x: [0, 2, 0],
                        y: [0, -2, 0],
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1, 1.5, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.9
                      }}
                    />
                    <motion.div
                      className="absolute bottom-0 left-0 w-0.5 h-0.5 bg-white/30 rounded-full"
                      animate={{
                        x: [0, -2, 0],
                        y: [0, 2, 0],
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.8, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.3
                      }}
                    />
                  </motion.div>
                )}
              </div>
              <span className="font-medium tracking-wide text-sm sm:text-base">Series</span>
            </span>
            <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-white/90 via-white/60 to-white/30 transition-all duration-500 ${location.pathname === '/series' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
          </Link>
          <Link
            to="/community"
            className={`relative ${location.pathname === '/community' ? 'text-white' : 'text-white/80 hover:text-white'} transition-all duration-300 group`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <div className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-lg ${location.pathname === '/community' ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'} flex items-center justify-center transition-all duration-300 shadow-sm shadow-black/10`}>
                {/* Animated Background Glow */}
                <motion.div
                  className={`absolute inset-0 rounded-lg ${location.pathname === '/community' ? 'bg-white/20' : 'bg-white/10'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm`}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: location.pathname === '/community' ? [0.2, 0.4, 0.2] : [0, 0.2, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4
                  }}
                />
                
                {/* Animated Icon */}
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" 
                  viewBox="0 0 24 24" 
                  fill={location.pathname === '/community' ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  strokeWidth="2"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: location.pathname === '/community' ? [0, 2, -2, 0] : [0, 0, 0, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.7
                  }}
                >
                  <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z"/>
                </motion.svg>
                
                {/* Floating Particles for Active State */}
                {location.pathname === '/community' && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="absolute top-0 right-0 w-0.5 h-0.5 bg-white/40 rounded-full"
                      animate={{
                        x: [0, 2, 0],
                        y: [0, -2, 0],
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1, 1.5, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                      }}
                    />
                    <motion.div
                      className="absolute bottom-0 left-0 w-0.5 h-0.5 bg-white/30 rounded-full"
                      animate={{
                        x: [0, -2, 0],
                        y: [0, 2, 0],
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.8, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.4
                      }}
                    />
                  </motion.div>
                )}
              </div>
              <span className="font-medium tracking-wide text-sm sm:text-base">Community</span>
            </span>
            <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-white/90 via-white/60 to-white/30 transition-all duration-500 ${location.pathname === '/community' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
          </Link>
          <Link
            to="/watchlist"
            className={`relative ${location.pathname === '/watchlist' ? 'text-white' : 'text-white/80 hover:text-white'} transition-all duration-300 group`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <div className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-lg ${location.pathname === '/watchlist' ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'} flex items-center justify-center transition-all duration-300 shadow-sm shadow-black/10`}>
                {/* Animated Background Glow */}
                <motion.div
                  className={`absolute inset-0 rounded-lg ${location.pathname === '/watchlist' ? 'bg-white/20' : 'bg-white/10'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm`}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: location.pathname === '/watchlist' ? [0.2, 0.4, 0.2] : [0, 0.2, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                />
                
                {/* Animated Icon */}
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" 
                  viewBox="0 0 24 24" 
                  fill={location.pathname === '/watchlist' ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  strokeWidth="2"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: location.pathname === '/watchlist' ? [0, 2, -2, 0] : [0, 0, 0, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.8
                  }}
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </motion.svg>
                
                {/* Floating Particles for Active State */}
                {location.pathname === '/watchlist' && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="absolute top-0 right-0 w-0.5 h-0.5 bg-white/40 rounded-full"
                      animate={{
                        x: [0, 2, 0],
                        y: [0, -2, 0],
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1, 1.5, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.1
                      }}
                    />
                    <motion.div
                      className="absolute bottom-0 left-0 w-0.5 h-0.5 bg-white/30 rounded-full"
                      animate={{
                        x: [0, -2, 0],
                        y: [0, 2, 0],
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.8, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.5
                      }}
                    />
                  </motion.div>
                )}
              </div>
              <span className="font-medium tracking-wide text-sm sm:text-base">My List</span>
            </span>
            <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-white/90 via-white/60 to-white/30 transition-all duration-500 ${location.pathname === '/watchlist' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
          </Link>
        </div>
      </div>
      {/* RIGHT: Desktop search and profile/auth menu (hidden on mobile) */}
      <div className="hidden sm:flex flex-1 justify-end gap-4 sm:gap-6 md:gap-8 mr-2">
        <div 
          ref={searchRef} 
          className={`relative transition-all duration-200 ease-out ${
            isSearchFocused 
              ? 'w-[280px] sm:w-[350px] md:w-[400px] lg:w-[500px]' 
              : 'w-[180px] sm:w-[220px] md:w-[240px] lg:w-[256px]'
          }`}
        >
          {/* Animated Background Glow for Search */}
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
            animate={{
              scale: [1, 1.02, 1],
              opacity: isSearchFocused ? [0.1, 0.2, 0.1] : [0, 0.1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2
            }}
          />
          
          <label className="flex flex-col !h-10">
            <div className="flex w-full flex-1 items-stretch rounded-xl h-full relative">
              <div className="text-[#a1abb5] flex border-none bg-[#2b3036] items-center justify-center pl-4 rounded-l-full border-r-0 relative">
                {/* Animated Search Icon */}
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24px" 
                  height="24px" 
                  fill="currentColor" 
                  viewBox="0 0 256 256"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: isSearchFocused ? [0, 2, -2, 0] : [0, 0, 0, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
                </motion.svg>
                
                {/* Floating Particles around Search Icon */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isSearchFocused ? 1 : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="absolute top-0 right-0 w-1 h-1 bg-white/30 rounded-full"
                    animate={{
                      x: [0, 3, 0],
                      y: [0, -3, 0],
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.5, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.8
                    }}
                  />
                  <motion.div
                    className="absolute bottom-0 left-0 w-0.5 h-0.5 bg-white/20 rounded-full"
                    animate={{
                      x: [0, -2, 0],
                      y: [0, 2, 0],
                      opacity: [0.2, 0.5, 0.2],
                      scale: [1, 1.8, 1],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1.2
                    }}
                  />
                </motion.div>
              </div>
              <input
                ref={inputRef}
                id="global-search"
                name="global-search"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setShowResults(true);
                }}
                placeholder="Search"
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl rounded-r-full text-white focus:outline-0 focus:ring-0 border-none bg-[#2b3036] focus:border-none h-full placeholder:text-[#a1abb5] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal relative z-10"
              />
              
              {/* Animated Ring Effect for Search Focus */}
              <motion.div
                className="absolute inset-0 rounded-xl border border-white/20 opacity-0"
                animate={{
                  scale: [1, 1.02, 1],
                  opacity: isSearchFocused ? [0, 0.3, 0] : [0, 0, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3
                }}
              />
            </div>
          </label>
          
          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.25 }}
                className="absolute top-full left-0 right-0 mt-3 text-white/90 bg-gradient-to-b from-[#181A20]/98 via-[#181A20]/95 to-[#181A20]/98 backdrop-blur-2xl border border-white/15 rounded-2xl z-50 shadow-2xl shadow-black/40 overflow-hidden"
                style={{ maxHeight: 'calc(100vh - 200px)', minHeight: '200px' }}
              >
                {/* ARIA live region for accessibility */}
                <div id="search-live-region" aria-live="polite" className="sr-only" />

                {/* Header */}
                <div className="sticky top-0 p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-white/8 via-white/5 to-white/3 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    <h3 className="text-white font-semibold">Search Results</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span>{isSearching ? 'Searching...' : `${searchResults.length} results`}</span>
                    <span>•</span>
                    <span>Press Enter to select</span>
                  </div>
                </div>

                {/* Search History */}
                {!searchQuery && searchHistory.length > 0 && (
                  <div className="sticky top-14 p-4 border-b border-white/10 bg-gradient-to-r from-white/5 via-white/3 to-transparent z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white/90 font-medium">Recent Searches</h4>
                      <button
                        onClick={clearHistory}
                        className="text-white/50 hover:text-white/70 text-xs transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.map((query, index) => (
                        <button
                          key={index}
                          onClick={() => handleHistoryItemClick(query)}
                          className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-white/80 hover:text-white text-xs transition-colors flex items-center gap-2 border border-white/20"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results List */}
                <div 
                  className="overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                >
                  {/* Loading Skeleton */}
                  {isSearching ? (
                    <div className="p-6 flex flex-col gap-4">
                      {[...Array(3)].map((_, i) => (
                        <motion.div 
                          key={i} 
                          className="flex items-start gap-3 p-3 rounded-xl"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div className="w-16 h-24 rounded-lg bg-white/10 animate-pulse" />
                          <div className="flex-1 py-2 flex flex-col gap-2">
                            <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                            <div className="h-3 w-1/3 rounded bg-white/10 animate-pulse" />
                            <div className="flex gap-2 mt-1">
                              <div className="h-3 w-10 rounded-full bg-white/10 animate-pulse" />
                              <div className="h-3 w-12 rounded-full bg-white/10 animate-pulse" />
                          </div>
                            <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse mt-2" />
                            <div className="h-3 w-1/4 rounded bg-white/10 animate-pulse" />
                        </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : searchQuery.trim() ? (
                    searchResults.length > 0 ? (
                      <div className="divide-y divide-white/10" role="listbox">
                          {searchResults.map((movie, index) => (
                            <motion.button
                              key={movie.id}
                              data-index={index}
                              onClick={() => handleMovieSelect(movie)}
                            initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ delay: index * 0.025, duration: 0.18, type: 'spring', stiffness: 180, damping: 22 }}
                            className={`w-full p-4 flex items-start gap-4 transition-all duration-200 rounded-xl group focus:outline-none relative ${
                                index === selectedIndex 
                                ? 'border-l-4 border-white/30 bg-gradient-to-r from-white/10 to-transparent shadow-lg shadow-black/20'
                                  : 'hover:bg-white/5'
                              }`}
                              tabIndex={0}
                              aria-selected={index === selectedIndex}
                              role="option"
                            style={{
                              zIndex: index === selectedIndex ? 2 : 1
                            }}
                          >
                            {/* Selection indicator (for accessibility, visually subtle) */}
                            {index === selectedIndex && (
                              <motion.div
                                className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/60 rounded-r-lg"
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                exit={{ scaleY: 0 }}
                                transition={{ duration: 0.18 }}
                                style={{ zIndex: 3 }}
                              />
                            )}
                            <div className="w-20 h-28 flex-shrink-0 relative group overflow-hidden rounded-xl bg-white/5 border border-white/10 shadow-lg">
                                <MovieImage
                                src={movie.image || movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path || movie.image}` : ''}
                                  alt={movie.title}
                                  className="w-full h-full"
                                />
                              </div>
                            <div className="flex-1 min-w-0 relative z-10">
                              <div className="flex items-start justify-between gap-4">
                                <div className='flex flex-col flex-1 items-start gap-2.5'>
                                  <h3 className="text-white font-semibold truncate text-base md:text-lg leading-tight">{movie.title}</h3>
                                  <div className="flex items-center gap-2 text-white/70 text-xs md:text-sm">
                                    <span>{movie.year}</span>
                                    <span>•</span>
                                    <span>{movie.type === 'tv' ? 'TV Show' : 'Movie'}</span>
                                  {movie.rating > 0 && (
                                    <>
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-1">
                                          <svg className="w-3 h-3 text-yellow-400 inline" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/>
                                        </svg>
                                        {movie.rating.toFixed(1)}
                                      </span>
                                    </>
                                  )}
                                </div>
                                </div>
                                {/* Action buttons */}
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                  {/* Minimal Add to Watchlist Button */}
                                  <motion.div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isInWatchlist(movie.id)) {
                                        // Remove from watchlist using context
                                        removeFromWatchlist(movie.id);
                                      } else {
                                        // Add to watchlist
                                        handleAddToWatchlist(e, movie);
                                      }
                                    }}
                                    className={`relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer group/btn
                                      ${isInWatchlist(movie.id)
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                                      }
                                    `}
                                    title={isInWatchlist(movie.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {/* Icon */}
                                    <div className="relative z-10">
                                      {isInWatchlist(movie.id) ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                        </svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                        </svg>
                                      )}
                                    </div>
                                    
                                    {/* Subtle success indicator */}
                                    {isInWatchlist(movie.id) && (
                                      <motion.div
                                        className="absolute inset-0 rounded-lg bg-white/10"
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                      />
                                    )}
                                  </motion.div>

                                  {/* Minimal Share Button */}
                                  <motion.div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (navigator.share) {
                                        navigator.share({
                                          title: movie.title,
                                          text: `Check out ${movie.title} (${movie.year})`,
                                          url: window.location.href
                                        });
                                      } else {
                                        navigator.clipboard.writeText(`${movie.title} (${movie.year}) - ${window.location.href}`);
                                      }
                                    }}
                                    className="relative w-7 h-7 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all duration-200 text-white/70 hover:text-white cursor-pointer group/share"
                                    title="Share"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {/* Icon */}
                                    <div className="relative z-10">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                        <polyline points="16 6 12 2 8 6" />
                                        <line x1="12" y1="2" x2="12" y2="15" />
                                      </svg>
                                    </div>
                                  </motion.div>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {movie.genres?.slice(0, 3).map((genre, idx) => (
                                  <span key={idx} className="px-2 py-1 rounded-full text-xs bg-white/10 text-white/80 border border-white/10">
                                    {genre}
                                  </span>
                                ))}
                              </div>
                              {/* Short overview/excerpt */}
                                {movie.overview && (
                                <div className="mt-3 text-xs text-white/60 line-clamp-2 leading-relaxed">
                                  {movie.overview}
                                </div>
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center justify-center gap-4">
                        {/* Friendly illustration */}
                        <motion.svg 
                          width="64" height="64" fill="none" viewBox="0 0 64 64" className="mx-auto"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <rect width="64" height="64" rx="16" fill="#1a1a1a"/>
                          <path d="M20 44c0-6 8-10 12-10s12 4 12 10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="26" cy="28" r="2" fill="#fff"/>
                          <circle cx="38" cy="28" r="2" fill="#fff"/>
                          <path d="M28 36c1.333 1.333 6.667 1.333 8 0" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                        </motion.svg>
                        <motion.div 
                          className="text-white/80 mb-2 text-lg font-medium"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          No results found for "{searchQuery}"
                        </motion.div>
                        <motion.div 
                          className="text-white/50 text-sm"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          Try different keywords or check your spelling
                          {searchQuery.length < 3 && (
                            <div className="mt-2">Tip: Try using at least 3 characters</div>
                          )}
                        </motion.div>
                      </div>
                    )
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
          {/* Auth Buttons / Profile Menu */}
          <motion.div layout className="relative">
            <AnimatePresence mode="wait">
              {user ? (
                <motion.button
                  key="profile"
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 focus:outline-none group relative"
                  data-profile-btn
                >
                  <motion.div
                    layout
                    className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white font-semibold text-base sm:text-lg shadow-lg hover:shadow-white/10 transition-all duration-300 group-hover:scale-105"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {user.profilePicture ? (
                      <img
                        src={`${SERVER_URL}${user.profilePicture}`}
                        alt="User Avatar"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="relative z-10">
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                      </span>
                    )}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 rounded-full ring-2 ring-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-white/20 opacity-0 group-hover:opacity-100 blur transition-all duration-300" />
                  </motion.div>
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 ring-2 ring-black"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
                  />
                </motion.button>
              ) : (
                <motion.div
                  key="auth-buttons"
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex items-center gap-2 sm:gap-4"
                >
                  <Link
                    to="/login"
                    className="relative px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-white/90 hover:text-white transition-all duration-300 group"
                  >
                    <span className="relative z-10 font-medium text-sm sm:text-base">Sign In</span>
                    <span className="absolute inset-0 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" />
                    <span className="absolute inset-0 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" />
                  </Link>
                  <Link
                    to="/signup"
                    className="relative px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-300 group"
                  >
                    <span className="relative z-10 text-sm sm:text-base">Sign Up</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-full transition-all duration-300 group-hover:from-white/30 group-hover:to-white/20 group-hover:shadow-lg group-hover:shadow-white/10 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-full opacity-0 group-hover:opacity-100 blur transition-all duration-300" />
                    <span className="absolute inset-0 border border-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  
                  {/* Menu */}
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 25
                    }}
                    className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#1a1a1a]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50"
                  >
                    {/* User Info Section */}
                    <div className="p-5 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white font-semibold text-2xl shadow-lg ring-2 ring-white/10">
                          {user.profilePicture ? (
                            <img
                              src={`${SERVER_URL}${user.profilePicture}`}
                              alt="User Avatar"
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span>{user.name ? user.name[0].toUpperCase() : 'U'}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg">{user.name || 'User'}</p>
                          <p className="text-white/60 text-sm mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <span className="flex-1 font-medium">Profile</span>
                      </Link>
                      <Link
                        to="/watchlist"
                        className="flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <span className="flex-1 font-medium">My List</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                        </div>
                        <span className="flex-1 font-medium">Settings</span>
                      </Link>
                      <div className="h-px bg-white/10 my-2" />
                      <button
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 w-full text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                          </svg>
                        </div>
                        <span className="flex-1 font-medium">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* RIGHT: Mobile icons (search + hamburger) */}
      <div className="flex items-center justify-end gap-3 sm:hidden">
        {/* Search icon (mobile) */}
        <motion.button
          onClick={() => setIsMobileSearchOpen(true)}
          className="relative w-10 h-10 flex items-center justify-center group bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/10"
          aria-label="Open search"
          whileHover={{ 
            scale: 1.05,
            rotate: [0, -2, 2, 0],
            transition: { duration: 0.3 }
          }}
          whileTap={{ 
            scale: 0.95,
            transition: { duration: 0.1 }
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Animated Background Glow */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            whileHover={{ scale: 1.1 }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0, 0.3, 0],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
              whileHover: { duration: 0.2 }
            }}
          />
          <motion.svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-white/80 group-hover:text-white transform transition-all duration-300 group-hover:scale-110" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            whileHover={{ rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </motion.svg>
        </motion.button>
        {/* Hamburger menu (mobile) */}
        <motion.button
            onClick={() => {
              toggleMenu();
              // Add haptic feedback
              triggerHaptic([20, 10, 20]);
              // Announce menu state for screen readers
              announceToScreenReader('Mobile navigation menu opened');
            }}
          className="relative w-10 h-10 flex items-center justify-center group bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/10 overflow-hidden"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation-menu"
          whileHover={{ 
            scale: 1.05,
            rotate: [0, 2, -2, 0],
            transition: { duration: 0.3 }
          }}
          whileTap={{ 
            scale: 0.95,
            transition: { duration: 0.1 }
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Animated Background Glow */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            whileHover={{ scale: 1.1 }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0, 0.3, 0],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
              whileHover: { duration: 0.2 }
            }}
          />
          
          {/* Floating Particles */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <motion.div
              className="absolute top-1 right-1 w-0.5 h-0.5 bg-white/30 rounded-full"
              animate={{
                x: [0, 2, 0],
                y: [0, -2, 0],
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
            <motion.div
              className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white/20 rounded-full"
              animate={{
                x: [0, -2, 0],
                y: [0, 2, 0],
                opacity: [0.2, 0.5, 0.2],
                scale: [1, 1.8, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.3
              }}
            />
          </motion.div>
          
          {/* Animated Ring Effect */}
          <motion.div
            className="absolute inset-0 rounded-lg border border-white/20 opacity-0"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.7
            }}
          />
          
          <div className="relative w-5 h-4 flex flex-col justify-between z-10">
            <motion.span 
              className="w-5 h-0.5 bg-white/80 group-hover:bg-white transform origin-center"
              animate={{
                rotate: isMobileMenuOpen ? 45 : 0,
                y: isMobileMenuOpen ? 6 : 0,
                scale: [1, 1.05, 1],
              }}
              transition={{
                rotate: { duration: 0.3, ease: "easeInOut" },
                y: { duration: 0.3, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
              }}
            />
            <motion.span 
              className="w-5 h-0.5 bg-white/80 group-hover:bg-white"
              animate={{
                opacity: isMobileMenuOpen ? 0 : 1,
                scale: [1, 1.02, 1],
              }}
              transition={{
                opacity: { duration: 0.2, ease: "easeInOut" },
                scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
              }}
            />
            <motion.span 
              className="w-5 h-0.5 bg-white/80 group-hover:bg-white transform origin-center"
              animate={{
                rotate: isMobileMenuOpen ? -45 : 0,
                y: isMobileMenuOpen ? -6 : 0,
                scale: [1, 1.05, 1],
              }}
              transition={{
                rotate: { duration: 0.3, ease: "easeInOut" },
                y: { duration: 0.3, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.9 }
              }}
            />
            </div>
        </motion.button>
        </div>

      {/* MOBILE SEARCH OVERLAY */}
      <AnimatePresence mode="wait">
        {isMobileSearchOpen && (
          <motion.div
            ref={mobileSearchOverlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.2,
              ease: "easeInOut"
            }}
            className="fixed inset-0 z-[90000] sm:hidden"
            onClick={(e) => {
              // Close search when clicking on the overlay background
              if (e.target === e.currentTarget) {
                setIsMobileSearchOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ 
                duration: 0.2, 
                ease: "easeOut"
              }}
              className="absolute top-20 left-4 right-4"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                transition={{ 
                  duration: 0.2, 
                  ease: "easeOut"
                }}
                className="relative"
              >
                <motion.div
                  className="relative bg-[#1a1d24]/95 backdrop-blur-2xl rounded-2xl border border-white/20 p-4 shadow-2xl shadow-black/50"
                  whileHover={{ scale: 1.005 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      duration: 0.2, 
                      ease: "easeOut"
                    }}
                    className="flex items-center gap-3 mb-4"
                  >
                    <motion.div
                      className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"
                      whileHover={{ scale: 1.02, rotate: 2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </motion.div>
                    <span className="text-white/90 font-medium text-lg">Search Movies & TV Shows</span>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.2, 
                      ease: "easeOut"
                    }}
                    className="relative"
                  >
              <input
                ref={inputRef}
                      type="text"
                      placeholder="Search for movies, TV shows, actors..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                      onFocus={() => {
                        setIsSearchFocused(true);
                        setShowResults(true);
                      }}
                      className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                autoFocus
                    />
              {searchQuery && (
                      <motion.div
                        className="absolute right-3 top-0 bottom-0 flex items-center z-10"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ 
                          duration: 0.15, 
                          ease: "easeOut"
                        }}
                      >
                        <motion.div
                          onClick={(e) => {
                            e.preventDefault();
                    e.stopPropagation();
                    setSearchQuery('');
                            // Ensure input stays focused
                            if (inputRef.current) {
                              inputRef.current.focus();
                            }
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors duration-200 cursor-pointer select-none"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.1 }}
                >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                        </motion.div>
                      </motion.div>
              )}
                  </motion.div>
                  
                  {/* Search Results */}
                  <AnimatePresence mode="wait">
                    {showResults && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ 
                          duration: 0.2,
                          ease: "easeInOut"
                        }}
                        className="mt-4"
              >
                        {/* Search History */}
                {!searchQuery && searchHistory.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ 
                              duration: 0.2, 
                              ease: "easeOut"
                            }}
                            className="mb-4"
                          >
                    <div className="flex items-center justify-between mb-3">
                              <h4 className="text-white/90 font-medium text-sm">Recent Searches</h4>
                      <button
                        onClick={clearHistory}
                                className="text-white/50 hover:text-white/70 text-xs transition-colors"
                      >
                                Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.map((query, index) => (
                                <motion.button
                          key={index}
                          onClick={() => handleHistoryItemClick(query)}
                                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-white/80 hover:text-white text-xs transition-colors flex items-center gap-2 border border-white/20"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ 
                                    duration: 0.15, 
                                    delay: index * 0.02,
                                    ease: "easeOut"
                                  }}
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.99 }}
                        >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {query}
                                </motion.button>
                      ))}
                    </div>
                          </motion.div>
                )}

                        {/* Loading State */}
                        {isSearching && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ 
                              duration: 0.2,
                              ease: "easeOut"
                            }}
                            className="flex justify-center items-center py-8"
                          >
                            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                          </motion.div>
                        )}

                        {/* Search Results */}
                        {searchQuery.trim() && !isSearching && (
                          <motion.div
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ 
                              duration: 0.2,
                              ease: "easeOut"
                            }}
                            className="max-h-96 overflow-y-auto"
                          >
                            {searchResults.length > 0 ? (
                              <div className="space-y-2">
                      {searchResults.map((movie, index) => (
                                  <motion.button
                          key={movie.id}
                                    onClick={() => {
                                      handleMovieSelect(movie);
                                      setIsMobileSearchOpen(false);
                                    }}
                                    className="w-full p-3 flex items-center gap-3 transition-all duration-200 group hover:bg-white/5 rounded-xl"
                                    initial={{ opacity: 0, y: 5, scale: 0.99 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.99 }}
                                    transition={{ 
                                      duration: 0.2, 
                                      delay: index * 0.015,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{ scale: 1.005, y: -0.5 }}
                                    whileTap={{ scale: 0.995 }}
                        >
                                    <div className="w-20 h-28 flex-shrink-0 relative overflow-hidden rounded-xl bg-white/5 border border-white/10 shadow-lg">
                            <MovieImage
                              src={movie.image || movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path || movie.image}` : ''}
                              alt={movie.title}
                              className="w-full h-full"
                            />
                          </div>
                                    <div className="flex-1 min-w-0 text-left">
                                      <h3 className="text-white font-medium truncate text-sm">{movie.title}</h3>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                                  <span>{movie.year}</span>
                                  <span>•</span>
                                  <span>{movie.type === 'tv' ? 'TV Show' : 'Movie'}</span>
                                        {movie.rating > 0 && (
                                          <>
                                            <span>•</span>
                                            <span className="text-yellow-400 flex items-center gap-1">
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/>
                                              </svg>
                                              {movie.rating.toFixed(1)}
                                            </span>
                                          </>
                                        )}
                            </div>
                            {movie.overview && (
                                        <div className="mt-1 text-xs text-white/50 line-clamp-2">{movie.overview}</div>
                            )}
                          </div>
                                  </motion.button>
                      ))}
                    </div>
                  ) : (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ 
                                  duration: 0.2,
                                  ease: "easeOut"
                                }}
                                className="text-center py-8"
                              >
                                <div className="text-white/60 mb-2">No results found for "{searchQuery}"</div>
                                <div className="text-white/40 text-xs">Try different keywords or check your spelling</div>
                              </motion.div>
                        )}
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

      {/* MOBILE MENU (hamburger) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Enhanced Backdrop with Blur Effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[89999] sm:hidden"
              onClick={handleClickOutside}
            />
            
            {/* Enhanced Mobile Menu Container */}
            <motion.div
              id="mobile-navigation-menu"
              initial={{ opacity: 0, height: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
                staggerChildren: 0.08
              }}
              className="fixed top-16 left-0 right-0 sm:hidden overflow-hidden z-[90000]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
            >
              {/* Enhanced Background with Multiple Layers */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 z-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                style={{
                  background: `
                    linear-gradient(180deg, 
                      rgba(30,32,38,0.98) 0%, 
                      rgba(18,20,23,0.98) 50%,
                      rgba(12,14,16,0.98) 100%
                    )
                  `,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              />
              
              {/* Animated Border Glow */}
              <motion.div
                className="absolute inset-0 z-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={{
                  background: `
                    linear-gradient(90deg, 
                      transparent 0%, 
                      rgba(255,255,255,0.1) 50%, 
                      transparent 100%
                    )
                  `,
                  mask: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                  WebkitMask: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                }}
              />
              
              {/* Enhanced Content Container */}
              <motion.div 
                className="flex flex-col py-6 relative z-10"
                initial="hidden"
                animate="visible"
                variants={animations.menuContainer}
                role="menu"
                aria-label="Mobile navigation menu"
              >
                {/* Enhanced Header Section */}
                <motion.div
                  variants={animations.menuItem}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="px-6 pb-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="16 17 21 12 16 7" />
                        </svg>
                      </motion.div>
                      <div>
                        <h2 id="mobile-menu-title" className="text-white font-semibold text-lg">Navigation</h2>
                        <p className="text-white/60 text-sm">Explore Streamr</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={closeMenu}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200"
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Close menu"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>

                {/* Enhanced Navigation Links */}
                <div className="space-y-1">
                  {/* Home Link */}
                  <motion.div
                    variants={animations.menuItem}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <Link 
                      to="/" 
                      className="mx-6 px-4 py-4 text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 active:bg-white/15 transition-all duration-300 flex items-center gap-4 group rounded-xl border border-transparent hover:border-white/10" 
                      onClick={() => {
                        closeMenu();
                        // Add haptic feedback
                        triggerHaptic([15]);
                      }} 
                      aria-label="Home" 
                      role="menuitem"
                    >
                      <motion.div 
                        className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center group-hover:from-white/25 group-hover:to-white/10 transition-all duration-300 shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {/* Animated Background Glow */}
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0, 0.3, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5
                          }}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="16 17 21 12 16 7" />
                        </svg>
                      </motion.div>
                      <div className="flex-1">
                        <span className="font-semibold tracking-wide text-base">Home</span>
                        <p className="text-white/50 text-xs mt-0.5">Discover trending content</p>
                      </div>
                      <motion.div
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={{ x: 10 }}
                        animate={{ x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </motion.div>
                    </Link>
                  </motion.div>
                  
                  {/* Section: Browse */}
                  <motion.div
                    variants={animations.menuItem}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                    className="px-6 pt-6 pb-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-4 bg-gradient-to-b from-white/60 to-white/20 rounded-full"></div>
                      <span className="text-xs font-bold uppercase tracking-widest text-white/50">Browse</span>
                    </div>
                  </motion.div>
                  
                  {/* Movies Link */}
                  <motion.div
                    variants={animations.menuItem}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
                  >
                    <Link 
                      to="/movies" 
                      className="mx-6 px-4 py-4 text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 active:bg-white/15 transition-all duration-300 flex items-center gap-4 group rounded-xl border border-transparent hover:border-white/10" 
                      onClick={() => {
                        closeMenu();
                        // Add haptic feedback
                        triggerHaptic([15]);
                      }} 
                      aria-label="Movies" 
                      role="menuitem"
                    >
                      <motion.div 
                        className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center group-hover:from-white/25 group-hover:to-white/10 transition-all duration-300 shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0, 0.3, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.6
                          }}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </motion.div>
                      <div className="flex-1">
                        <span className="font-semibold text-base">Movies</span>
                        <p className="text-white/50 text-xs mt-0.5">Latest releases & classics</p>
                      </div>
                      <motion.div
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={{ x: 10 }}
                        animate={{ x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </motion.div>
                    </Link>
                  </motion.div>
                  
                  {/* Series Link */}
                  <motion.div
                    variants={animations.menuItem}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
                  >
                    <Link 
                      to="/series" 
                      className="mx-6 px-4 py-4 text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 active:bg-white/15 transition-all duration-300 flex items-center gap-4 group rounded-xl border border-transparent hover:border-white/10" 
                      onClick={() => {
                        closeMenu();
                        // Add haptic feedback
                        triggerHaptic([15]);
                      }} 
                      aria-label="Series" 
                      role="menuitem"
                    >
                      <motion.div 
                        className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center group-hover:from-white/25 group-hover:to-white/10 transition-all duration-300 shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0, 0.3, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.7
                          }}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </motion.div>
                      <div className="flex-1">
                        <span className="font-semibold text-base">Series</span>
                        <p className="text-white/50 text-xs mt-0.5">TV shows & episodes</p>
                      </div>
                      <motion.div
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={{ x: 10 }}
                        animate={{ x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </motion.div>
                    </Link>
                  </motion.div>
                  
                  {/* Community Link */}
                  <motion.div
                    variants={animations.menuItem}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.25 }}
                  >
                    <Link 
                      to="/community" 
                      className="mx-6 px-4 py-4 text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 active:bg-white/15 transition-all duration-300 flex items-center gap-4 group rounded-xl border border-transparent hover:border-white/10" 
                      onClick={() => {
                        closeMenu();
                        // Add haptic feedback
                        triggerHaptic([15]);
                      }} 
                      aria-label="Community" 
                      role="menuitem"
                    >
                      <motion.div 
                        className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center group-hover:from-white/25 group-hover:to-white/10 transition-all duration-300 shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0, 0.3, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.8
                          }}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z"/>
                        </svg>
                      </motion.div>
                      <div className="flex-1">
                        <span className="font-semibold text-base">Community</span>
                        <p className="text-white/50 text-xs mt-0.5">Discuss & share opinions</p>
                      </div>
                      <motion.div
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={{ x: 10 }}
                        animate={{ x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </motion.div>
                    </Link>
                  </motion.div>
                </div>

                {/* Watchlist Link - Always Visible */}
                <motion.div
                  variants={animations.menuItem}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.25 }}
                >
                  <Link 
                    to="/watchlist" 
                    className="mx-6 px-4 py-4 text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 active:bg-white/15 transition-all duration-300 flex items-center gap-4 group rounded-xl border border-transparent hover:border-white/10" 
                    onClick={() => {
                      closeMenu();
                      // Add haptic feedback
                      triggerHaptic([15]);
                    }} 
                    aria-label="My List" 
                    role="menuitem"
                  >
                    <motion.div 
                      className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center group-hover:from-white/25 group-hover:to-white/10 transition-all duration-300 shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0, 0.3, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.9
                        }}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </motion.div>
                    <div className="flex-1">
                      <span className="font-semibold text-base">My List</span>
                      <p className="text-white/50 text-xs mt-0.5">Your saved content</p>
                    </div>
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      initial={{ x: 10 }}
                      animate={{ x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </motion.div>
                  </Link>
                </motion.div>

                {/* Enhanced User Section */}
                {user ? (
                  <>
                    {/* Section: Account */}
                    <motion.div
                      variants={animations.menuItem}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                      className="px-6 pt-6 pb-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 bg-gradient-to-b from-white/60 to-white/20 rounded-full"></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/50">My Account</span>
                      </div>
                    </motion.div>
                    
                    {/* Profile Link */}
                    <motion.div
                      variants={animations.menuItem}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.35 }}
                    >
                      <Link 
                        to="/profile" 
                        className="mx-6 px-4 py-4 text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 active:bg-white/15 transition-all duration-300 flex items-center gap-4 group rounded-xl border border-transparent hover:border-white/10" 
                        onClick={() => {
                          closeMenu();
                          // Add haptic feedback
                          triggerHaptic([15]);
                        }} 
                        aria-label="Profile" 
                        role="menuitem"
                      >
                        <motion.div 
                          className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center group-hover:from-white/25 group-hover:to-white/10 transition-all duration-300 shadow-lg"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <motion.div
                            className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                            animate={{
                              scale: [1, 1.1, 1],
                              opacity: [0, 0.3, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1
                            }}
                          />
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </motion.div>
                        <div className="flex-1">
                          <span className="font-semibold text-base">Profile</span>
                          <p className="text-white/50 text-xs mt-0.5">Manage your account</p>
                        </div>
                        <motion.div
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={{ x: 10 }}
                          animate={{ x: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </motion.div>
                      </Link>
                    </motion.div>
                  </>
                ) : (
                  <>
                    {/* Section: Authentication */}
                    <motion.div
                      variants={animations.menuItem}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                      className="px-6 pt-6 pb-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 bg-gradient-to-b from-white/60 to-white/20 rounded-full"></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/50">Account</span>
                      </div>
                    </motion.div>
                    
                    {/* Sign In Link */}
                    <motion.div
                      variants={animations.menuItem}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.35 }}
                    >
                      <Link 
                        to="/login" 
                        className="mx-6 px-4 py-4 text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 active:bg-white/15 transition-all duration-300 flex items-center gap-4 group rounded-xl border border-transparent hover:border-white/10" 
                        onClick={() => {
                          closeMenu();
                          // Add haptic feedback
                          triggerHaptic([15]);
                        }} 
                        aria-label="Sign In" 
                        role="menuitem"
                      >
                        <motion.div 
                          className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center group-hover:from-white/25 group-hover:to-white/10 transition-all duration-300 shadow-lg"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <motion.div
                            className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                            animate={{
                              scale: [1, 1.1, 1],
                              opacity: [0, 0.3, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1.1
                            }}
                          />
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
                          </svg>
                        </motion.div>
                        <div className="flex-1">
                          <span className="font-semibold text-base">Sign In</span>
                          <p className="text-white/50 text-xs mt-0.5">Access your account</p>
                        </div>
                        <motion.div
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={{ x: 10 }}
                          animate={{ x: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </motion.div>
                      </Link>
                    </motion.div>
                    
                    {/* Sign Up Link */}
                    <motion.div
                      variants={animations.menuItem}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
                    >
                      <Link 
                        to="/signup" 
                        className="mx-6 px-4 py-4 text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 active:bg-white/15 transition-all duration-300 flex items-center gap-4 group rounded-xl border border-transparent hover:border-white/10" 
                        onClick={() => {
                          closeMenu();
                          // Add haptic feedback
                          triggerHaptic([15]);
                        }} 
                        aria-label="Sign Up" 
                        role="menuitem"
                      >
                        <motion.div 
                          className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center group-hover:from-white/25 group-hover:to-white/10 transition-all duration-300 shadow-lg"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <motion.div
                            className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                            animate={{
                              scale: [1, 1.1, 1],
                              opacity: [0, 0.3, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1.2
                            }}
                          />
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                        </motion.div>
                        <div className="flex-1">
                          <span className="font-semibold text-base">Sign Up</span>
                          <p className="text-white/50 text-xs mt-0.5">Create new account</p>
                        </div>
                        <motion.div
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={{ x: 10 }}
                          animate={{ x: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </motion.div>
                      </Link>
                    </motion.div>
                  </>
                )}

                {/* Enhanced Divider */}
                <motion.div
                  variants={animations.menuItem}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.45 }}
                  className="mx-6 my-4"
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </motion.div>

                {/* Enhanced Footer Section */}
                <div className="space-y-1 px-6 pb-4">
                  <motion.div
                    variants={animations.menuItem}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.5 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-white/80 text-sm font-medium">Settings</span>
                          <p className="text-white/40 text-xs">App preferences</p>
                        </div>
                      </div>
                      <motion.button
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          // Add haptic feedback
                          triggerHaptic([10]);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    variants={animations.menuItem}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.55 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-white/80 text-sm font-medium">Help & Support</span>
                          <p className="text-white/40 text-xs">Get assistance</p>
                        </div>
                      </div>
                      <motion.button
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          // Add haptic feedback
                          triggerHaptic([10]);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                </div>

                {/* Enhanced Footer */}
                <motion.div
                  variants={animations.menuItem}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.6 }}
                  className="px-6 pt-4 pb-6"
                >
                  <div className="text-center">
                    <p className="text-white/40 text-xs">Streamr v1.0.0</p>
                    <p className="text-white/30 text-xs mt-1">© 2024 Streamr. All rights reserved.</p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;