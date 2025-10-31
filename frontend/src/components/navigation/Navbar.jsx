import React, { useState, useEffect, useRef, useCallback, useMemo, useTransition, useDeferredValue, memo } from 'react';
import { createPortal } from 'react-dom';
import { searchCombined, transformMovieData } from '../../services/tmdbService';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { HomeIcon, FilmIcon, TvIcon, UserGroupIcon, BookmarkIcon, ChevronRightIcon, EllipsisHorizontalIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { BookOpenIcon as BookOpenIconSolid } from '@heroicons/react/24/solid';
import { useWatchlistSafe } from '../../contexts/WatchlistContext';
import { formatRating } from '../../utils/ratingUtils';
import { getTmdbImageUrl } from '../../utils/imageUtils.js';
import { scheduleRaf, cancelRaf } from '../../utils/throttledRaf';
import {
  createSmartDebounce,
  OptimizedCache,
  createAdaptiveDebounce,
  isLowPowerDevice,
  getAnimationConfig,
  DeferredStateUpdater,
  filterSearchResults,
  debounce
} from '../../utils/searchOptimizations';


// Fix SERVER_URL construction for profile pictures
const SERVER_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:3001';

// Enhanced search cache for better performance
const searchCache = new OptimizedCache(100, 5 * 60 * 1000); // Max 100 entries, 5 min TTL

// Search suggestion cache
const suggestionCache = new OptimizedCache(50, 10 * 60 * 1000); // Max 50 entries, 10 min TTL

// Performance monitoring for dev mode
const performanceMetrics = {
  searchTime: [],
  renderTime: [],
  cacheHits: 0,
  cacheMisses: 0,
  averageQueryTime: 0,
};

const recordSearchMetric = (duration) => {
  performanceMetrics.searchTime.push(duration);
  if (performanceMetrics.searchTime.length > 100) {
    performanceMetrics.searchTime.shift();
  }
  performanceMetrics.averageQueryTime = 
    performanceMetrics.searchTime.reduce((a, b) => a + b, 0) / performanceMetrics.searchTime.length;
};

const SEARCH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached searches (now managed by OptimizedCache)
// Suggestion cache TTL
const SUGGESTION_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Fuzzy string matching utility
const fuzzyMatch = (str1, str2, threshold = 0.6) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  // Levenshtein distance calculation
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = 1 - (distance / maxLength);
  
  return similarity >= threshold ? similarity : 0;
};

// Advanced string similarity with multiple algorithms
const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  // Jaccard similarity for word-based matching
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const jaccardSimilarity = intersection.size / union.size;
  
  // Levenshtein similarity
  const levenshteinSimilarity = fuzzyMatch(s1, s2, 0);
  
  // Substring similarity
  const substringSimilarity = s1.includes(s2) || s2.includes(s1) ? 0.8 : 0;
  
  // Combined similarity score
  return Math.max(jaccardSimilarity, levenshteinSimilarity, substringSimilarity);
};

// AI-powered semantic search with context understanding
const semanticSearchScore = (query, result) => {
  const queryLower = query.toLowerCase().trim();
  const title = (result.title || result.name || '').toLowerCase();
  const overview = (result.overview || '').toLowerCase();
  const originalTitle = (result.original_title || result.original_name || '').toLowerCase();
  
  // Semantic keyword mapping for better context understanding
  const semanticKeywords = {
    // Action-related
    'action': ['fight', 'battle', 'war', 'combat', 'adventure', 'thriller', 'explosion', 'gun', 'weapon'],
    'comedy': ['funny', 'laugh', 'humor', 'joke', 'comic', 'hilarious', 'amusing'],
    'drama': ['emotional', 'serious', 'story', 'character', 'life', 'relationship', 'family'],
    'horror': ['scary', 'frightening', 'terrifying', 'monster', 'ghost', 'demon', 'blood', 'death'],
    'romance': ['love', 'romantic', 'couple', 'relationship', 'dating', 'marriage', 'heart'],
    'sci-fi': ['space', 'future', 'robot', 'alien', 'technology', 'science', 'time travel'],
    'fantasy': ['magic', 'wizard', 'dragon', 'kingdom', 'medieval', 'supernatural', 'mythical'],
    'thriller': ['suspense', 'mystery', 'crime', 'detective', 'murder', 'investigation', 'tension'],
    'documentary': ['real', 'true', 'history', 'biography', 'factual', 'educational', 'informative'],
    'anime': ['japanese', 'animation', 'manga', 'cartoon', 'anime', 'otaku', 'kawaii'],
    'superhero': ['hero', 'superhero', 'marvel', 'dc', 'comics', 'powers', 'villain', 'save'],
    'netflix': ['netflix', 'original', 'streaming', 'series', 'show'],
    'disney': ['disney', 'family', 'kids', 'children', 'cartoon', 'animation', 'princess'],
    'christmas': ['christmas', 'holiday', 'santa', 'gift', 'winter', 'snow', 'festive'],
    'halloween': ['halloween', 'spooky', 'costume', 'trick', 'treat', 'pumpkin', 'scary']
  };
  
  // Calculate semantic relevance
  let semanticScore = 0;
  const queryWords = queryLower.split(/\s+/);
  
  queryWords.forEach(word => {
    // Direct keyword match
    if (title.includes(word) || overview.includes(word) || originalTitle.includes(word)) {
      semanticScore += 50;
    }
    
    // Semantic keyword expansion
    Object.entries(semanticKeywords).forEach(([category, keywords]) => {
      if (word.includes(category) || category.includes(word)) {
        keywords.forEach(keyword => {
          if (title.includes(keyword) || overview.includes(keyword)) {
            semanticScore += 25;
          }
        });
      }
    });
  });
  
  // Context-aware scoring based on content type
  const mediaType = result.media_type;
  if (mediaType === 'movie' && (queryLower.includes('movie') || queryLower.includes('film'))) {
    semanticScore += 30;
  } else if (mediaType === 'tv' && (queryLower.includes('show') || queryLower.includes('series') || queryLower.includes('tv'))) {
    semanticScore += 30;
  }
  
  // Genre-based semantic matching
  if (result.genre_ids && Array.isArray(result.genre_ids)) {
    const genreMap = {
      28: ['action', 'fight', 'battle', 'war', 'combat'],
      35: ['comedy', 'funny', 'laugh', 'humor'],
      18: ['drama', 'emotional', 'serious', 'story'],
      27: ['horror', 'scary', 'frightening', 'terrifying'],
      10749: ['romance', 'love', 'romantic', 'couple'],
      878: ['sci-fi', 'space', 'future', 'robot', 'alien'],
      14: ['fantasy', 'magic', 'wizard', 'dragon'],
      53: ['thriller', 'suspense', 'mystery', 'crime'],
      99: ['documentary', 'real', 'true', 'history']
    };
    
    result.genre_ids.forEach(genreId => {
      const genreKeywords = genreMap[genreId] || [];
      genreKeywords.forEach(keyword => {
        if (queryWords.some(word => word.includes(keyword) || keyword.includes(word))) {
          semanticScore += 20;
        }
      });
    });
  }
  
  return Math.min(semanticScore, 200); // Cap at 200 points
};

// Advanced search prediction and auto-complete
const generateSearchPredictions = (query, searchHistory, popularQueries = {}) => {
  const queryLower = query.toLowerCase().trim();
  if (queryLower.length < 2) return [];
  
  const predictions = new Set();
  
  // History-based predictions
  searchHistory.forEach(item => {
    if (item.toLowerCase().includes(queryLower) && item.toLowerCase() !== queryLower) {
      predictions.add(item);
    }
  });
  
  // Popular queries predictions
  Object.keys(popularQueries).forEach(popularQuery => {
    if (popularQuery.toLowerCase().includes(queryLower) && popularQuery.toLowerCase() !== queryLower) {
      predictions.add(popularQuery);
    }
  });
  
  // Smart completions based on common patterns
  const smartCompletions = [
    'movies', 'shows', 'series', 'documentaries', 'anime', 'comedy', 'action', 'drama',
    'horror', 'romance', 'thriller', 'sci-fi', 'fantasy', 'netflix', 'disney', 'marvel'
  ];
  
  smartCompletions.forEach(completion => {
    if (completion.startsWith(queryLower) || queryLower.includes(completion.substring(0, 3))) {
      predictions.add(`${query} ${completion}`);
    }
  });
  
  return Array.from(predictions).slice(0, 8);
};

// Search term highlighting utility
const highlightSearchTerms = (text, query) => {
  if (!text || !query) return text;
  
  const queryWords = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return text;
  
  let highlightedText = text;
  const regex = new RegExp(`(${queryWords.join('|')})`, 'gi');
  
  highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  
  return highlightedText;
};


// Cache cleanup utility
const cleanupCache = () => {
  const now = Date.now();
  
  // Clean up search cache
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > SEARCH_CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
  
  // Clean up suggestion cache
  for (const [key, value] of suggestionCache.entries()) {
    if (now - value.timestamp > SUGGESTION_CACHE_DURATION) {
      suggestionCache.delete(key);
    }
  }
};

// Run cache cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// Custom hook for click outside
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    
    // Use passive listeners for better performance
    document.addEventListener('mousedown', listener, { passive: true });
    document.addEventListener('touchstart', listener, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
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
  const errorTimeoutRef = useRef(null);

  // Enhanced error handling with retry mechanism
  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      // Retry loading after a short delay
      const retryTimeout = setTimeout(() => {
        const img = new Image();
        img.onload = () => {
          setIsLoading(false);
          setIsLoaded(true);
          setError(false);
        };
        img.onerror = handleError;
        img.src = src;
      }, 1000 * (retryCount + 1)); // Exponential backoff
      
      // Store timeout ID for cleanup
      errorTimeoutRef.current = retryTimeout;
    } else {
      setError(true);
      setIsLoading(false);
      onImageError?.(src, alt);
    }
  }, [src, alt, retryCount, maxRetries, onImageError, setIsLoading, setIsLoaded, setError]);

  // Enhanced load handling with performance optimization
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setIsLoaded(true);
    setError(false);
    onImageLoad?.(src, alt);
  }, [src, alt, onImageLoad, setIsLoading, setIsLoaded, setError]);

  // FIXED: Preload image for better performance without infinite loops
  useEffect(() => {
    if (src && priority) {
      const img = new Image();
      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = src;
      
      // Cleanup function to prevent memory leaks
      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }
  }, [src, priority]); // Removed handleLoad and handleError dependencies to prevent infinite loops

  // FIXED: Cleanup timeouts on unmount or src change without infinite loops
  useEffect(() => {
    return () => {
      // Clear any pending retry timeouts
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    };
  }, [src]); // Removed handleError dependency to prevent infinite loops

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
        <div className="absolute inset-0 bg-gradient-to-r from-[#2b3036] via-[#3a4046] to-[#2b3036]">
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
          ${isLoaded ? 'group-hover/image:scale-105' : ''}
        `}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          transform: isLoaded ? 'translateZ(0)' : 'none' // Force hardware acceleration
        }}
      />
      
      {/* Enhanced overlay with better visual feedback */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover/image:opacity-100 transition-all duration-300 ease-out">
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 transform scale-90 group-hover/image:scale-100 transition-transform duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      

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
  }, [startTransition, setIsOpen]);
  
  const closeMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(false);
    });
  }, [startTransition, setIsOpen]);
  
  const toggleMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(prev => !prev);
    });
  }, [startTransition, setIsOpen]);
  
  return {
    isOpen: deferredIsOpen,
    isPending,
    openMenu,
    closeMenu,
    toggleMenu
  };
};

// Full animation variants for all devices
const useOptimizedAnimations = () => {
  return useMemo(() => ({
    // Full backdrop animation
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { 
        duration: 0.3, 
        ease: "easeInOut" 
      }
    },
    
    // Full menu container animation
    menuContainer: {
      initial: { 
        opacity: 0, 
        height: 0, 
        y: -20, 
        scale: 0.95 
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
        y: -20, 
        scale: 0.95 
      },
      transition: { 
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.08
      }
    },
    
    // Full menu item animations
    menuItem: {
      hidden: { 
        opacity: 0, 
        x: -20 
      },
      visible: { 
        opacity: 1, 
        x: 0 
      },
      transition: { 
        duration: 0.4, 
        ease: "easeOut" 
      }
    },
    
    // Full hamburger button animations
    hamburger: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      transition: { 
        duration: 0.4, 
        delay: 0.2 
      }
    }
  }), []); // No dependencies needed as this function doesn't depend on any external values
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
  }, []); // No dependencies needed as this function uses refs
  
  // Optimized escape key handler
  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape') {
      closeMenuRef.current();
    }
  }, []); // No dependencies needed as this function uses refs
  
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
        cleanupTouchListeners();
      }
    };
    
    const handleTouchEnd = () => {
      cleanupTouchListeners();
    };
    
    const cleanupTouchListeners = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
  }, []); // No dependencies needed as this function uses refs
  
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
  }, []); // No dependencies needed as this function doesn't depend on any external values
  
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

/**
 * Memoized SearchResultItem Component
 * Prevents unnecessary re-renders of individual search results
 * This is critical for performance when rendering large result lists
 */
const SearchResultItem = memo(({ 
  movie, 
  index, 
  selectedIndex, 
  onSelect, 
  isInWatchlist, 
  onAddToWatchlist, 
  onCastSelect,
  handleSearchQuery,
  debouncedSearch 
}) => {
  const animationConfig = getAnimationConfig();
  
  return (
    <motion.button
      key={movie.id}
      data-index={index}
      onClick={() => {
        if (movie.isSuggestion) {
          handleSearchQuery(movie.title);
          debouncedSearch.search(movie.title);
        } else {
          // Check if it's a cast/person - show CastDetailsOverlay
          // Otherwise show MovieDetailsOverlay for movies/series
          if (movie.type === 'person') {
            onCastSelect(movie);
          } else {
            onSelect(movie);
          }
        }
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: animationConfig.duration }}
      className={`w-full p-4 flex items-start gap-4 transition-all duration-200 rounded-xl group/item focus:outline-none relative ${
        index === selectedIndex 
          ? 'border-l-4 border-white/40 bg-gradient-to-r from-white/15 to-white/5 shadow-lg shadow-black/30'
          : 'hover:bg-white/8'
      }`}
      tabIndex={0}
      aria-selected={index === selectedIndex}
      role="option"
      style={{
        zIndex: index === selectedIndex ? 2 : 1
      }}
    >
      {/* Selection indicator */}
      {index === selectedIndex && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/80 rounded-r-lg"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{ scaleY: 0 }}
          transition={{ duration: 0.18 }}
          style={{ zIndex: 3 }}
        />
      )}
      <div className="w-20 h-28 flex-shrink-0 relative group/image overflow-hidden rounded-xl bg-white/8 border border-white/15 shadow-lg">
        {movie.isSuggestion ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        ) : (
          <MovieImage
            src={movie.image || movie.poster_path ? getTmdbImageUrl(movie.poster_path || movie.image, 'w185') : ''}
            alt={movie.type === 'person' ? movie.name : movie.title}
            className="w-full h-full"
            fallbackIcon={movie.type === 'person' ? 'person' : 'movie'}
          />
        )}
      </div>
      {/* Rest of the component remains the same but optimized */}
      <div className="flex-1 min-w-0 relative z-10">
        {/* Title and type badge */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-white font-semibold truncate text-base md:text-lg leading-tight">
            {movie.type === 'person' ? movie.name : movie.title}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
            movie.isSuggestion
              ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
              : movie.type === 'person' 
              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' 
              : 'bg-green-500/20 text-green-300 border border-green-400/30'
          }`}>
            {movie.isSuggestion ? 'Suggestion' : movie.type === 'person' ? 'Cast' : movie.type === 'tv' ? 'TV' : 'Movie'}
          </span>
        </div>
        
        {/* Meta information */}
        <div className="flex items-center gap-2 text-white/70 text-xs md:text-sm mb-2">
          {movie.isSuggestion ? (
            <>
              <span>Search suggestion</span>
              <span>•</span>
              <span>Click to search</span>
            </>
          ) : movie.type === 'person' ? (
            <>
              <span>{movie.knownForDepartment}</span>
              {movie.popularity > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.286 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/>
                    </svg>
                    {Math.round(movie.popularity)}
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <span>{movie.year}</span>
              <span>•</span>
              <span>{movie.type === 'tv' ? 'TV Show' : 'Movie'}</span>
              {movie.rating > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.286 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/>
                    </svg>
                    {formatRating(movie.rating)}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Genres */}
        {movie.genres && movie.genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 mb-2">
            {movie.genres.slice(0, 3).map((genre, idx) => (
              <span key={idx} className="px-2 py-1 rounded-full text-xs bg-white/10 text-white/80 border border-white/10">
                {genre}
              </span>
            ))}
          </div>
        )}
        
        {/* Overview or known works */}
        {movie.type === 'person' ? (
          movie.knownFor && movie.knownFor.length > 0 && (
            <div className="mt-2 text-xs text-white/60">
              <span className="text-white/70 font-medium">Known for: </span>
              {movie.knownFor.map((work, idx) => (
                <span key={work.id}>
                  {work.title} ({work.year || 'N/A'})
                  {idx < movie.knownFor.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )
        ) : (
          movie.overview && (
            <div className="mt-2 text-xs text-white/60 line-clamp-2 leading-relaxed">
              {movie.overview}
            </div>
          )
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/item:translate-x-0 flex-shrink-0">
        {/* Watchlist/Profile button */}
        <motion.div
          onClick={(e) => {
            e.stopPropagation();
            if (movie.type === 'person') {
              // Show CastDetailsOverlay for person type
              onCastSelect(movie);
            } else {
              if (isInWatchlist && isInWatchlist(movie.id)) {
                // Remove from watchlist
              } else {
                onAddToWatchlist(e, movie);
              }
            }
          }}
          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer flex-shrink-0 ${
            movie.type === 'person' 
              ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
              : (isInWatchlist && isInWatchlist(movie.id))
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {movie.type === 'person' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ) : (isInWatchlist && isInWatchlist(movie.id)) ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </motion.div>

        {/* Share button */}
        <motion.div
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share) {
              if (movie.type === 'person') {
                navigator.share({
                  title: movie.name,
                  text: `Check out ${movie.name} (${movie.knownForDepartment})`,
                  url: window.location.href
                });
              } else {
                navigator.share({
                  title: movie.title,
                  text: `Check out ${movie.title} (${movie.year})`,
                  url: window.location.href
                });
              }
            }
          }}
          className="relative w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all duration-200 text-white/70 hover:text-white cursor-pointer flex-shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </motion.div>
      </div>
    </motion.button>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if essential props change
  return (
    prevProps.movie.id === nextProps.movie.id &&
    prevProps.index === nextProps.index &&
    prevProps.selectedIndex === nextProps.selectedIndex &&
    prevProps.isInWatchlist === nextProps.isInWatchlist
  );
});

SearchResultItem.displayName = 'SearchResultItem';

const Navbar = ({ onMovieSelect, onCastSelect }) => {
  // 🚀 FIXED: Add mounted ref to prevent state updates on unmounted components
  const isMountedRef = useRef(true);
  // Responsive sizing: use a single window width source to derive breakpoints (fewer states => fewer re-renders)
  const useWindowWidth = () => {
    const isClient = typeof window !== 'undefined';
    const [width, setWidth] = useState(isClient ? window.innerWidth : 1200);
    useEffect(() => {
      if (!isClient) return;
      let rafId = null;
      const onResize = () => {
        // Throttle updates to animation frames for smoothness
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          setWidth(window.innerWidth);
          rafId = null;
        });
      };
      window.addEventListener('resize', onResize, { passive: true });
      return () => {
        window.removeEventListener('resize', onResize);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, [isClient]);
    return width;
  };

  const windowWidth = useWindowWidth();
  const isNarrow = windowWidth < 1450;
  const isNarrowSm = windowWidth < 1280; // <1280px
  const isNarrowXs = windowWidth < 1160; // <1160px
  const isNarrowLg = windowWidth < 1690; // <1690px
  const isNarrowMd = windowWidth < 1585; // <1585px
  const isNarrowMd2 = windowWidth < 1565; // <1565px
  const isNarrowMd3 = windowWidth < 1545; // <1545px
  const isNarrowMd4 = windowWidth < 1366; // <1366px
  const isNarrowMd5 = windowWidth < 1337; // <1337px
  const isNarrowMd6 = windowWidth < 1327; // <1327px
  const isNarrowMd7 = windowWidth < 1296; // <1296px
  const isNarrowMd8 = windowWidth < 1280; // <1280px
  const isNarrowMd9 = windowWidth < 1270; // <1270px
  const isNarrowMd10 = windowWidth < 1260; // <1260px
  const isNarrowMd11 = windowWidth < 1250; // <1250px
  const isNarrowMd12 = windowWidth < 1240; // <1240px

  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef(null);

  const overflowItems = useMemo(() => {
    const visibility = {
      movies: true,
      series: true,
      watchlist: !(isNarrowSm || isNarrowXs) && !isNarrowXs, // already covered by isNarrowSm and isNarrowXs
      manga: !isNarrowXs,
      community: !isNarrow,
      donate: !isNarrow && !isNarrowSm,
    };

    const links = [
      { key: 'movies', to: '/movies', label: 'Movies' },
      { key: 'series', to: '/series', label: 'Series' },
      { key: 'watchlist', to: '/watchlist', label: 'My List' },
      { key: 'manga', to: '/manga', label: 'Manga' },
      { key: 'community', to: '/community', label: 'Community' },
      { key: 'donate', to: '/donate', label: 'Support' },
    ];

    return links.filter(l => !visibility[l.key]);
  }, [windowWidth]);

  // window size is handled by useWindowWidth hook above

  useEffect(() => {
    const onDocClick = (e) => {
      if (!showOverflow) return;
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setShowOverflow(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showOverflow]);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isCenteredSearchOpen, setIsCenteredSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchPredictions, setSearchPredictions] = useState([]);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const watchlistContext = useWatchlistSafe();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = watchlistContext || {};
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  // Add ref for mobile search overlay
  const mobileSearchOverlayRef = useRef(null);
  const mobileSearchInputRef = inputRef; // already defined
  const rafHolderRef = useRef(null);
  // Filters state (used by keyboard handlers)
  const [showFilters, setShowFilters] = useState(false);
  // Dedicated refs for typeahead (avoid attaching refs to function objects)
  const typeaheadBufferRef = useRef('');
  const typeaheadTimeoutRef = useRef(null);

  // Performance-optimized mobile menu state management
  const { isOpen: isMobileMenuOpen, isPending, openMenu, closeMenu, toggleMenu } = useMobileMenuState();
  

  // Performance-optimized animation variants with reduced motion support
  const animations = useOptimizedAnimations();
  // Respect user's reduced motion preference to avoid continuous repaints / flashing
  const reducedMotion = useReducedMotion();
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

  // 🚀 FIXED: Enhanced cleanup on unmount with proper mounted ref management
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      // Mark as unmounted first to prevent any new operations
      isMountedRef.current = false;
      
      // Clear search state
      setSearchResults([]);
      setIsSearching(false);
      setShowResults(false);
      setSelectedIndex(-1);
      
      // Clear any pending timeouts
      // Clear any typeahead timeout
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current);
        typeaheadTimeoutRef.current = null;
      }
      
      // Clear any pending animations
      // We centralize RAF scheduling via `scheduleRaf` / `cancelRaf` across the app.
      // Cancel any stored RAF scheduled at the component level
      try {
        if (rafHolderRef?.current) {
          cancelRaf(rafHolderRef.current);
          rafHolderRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, []); // FIXED: Empty dependency array to prevent infinite loops

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
  }, [])); // FIXED: Empty dependency array to prevent infinite loops

  // Click outside for search
  useClickOutside(searchRef, useCallback(() => {
    setShowResults(false);
    setSelectedIndex(-1);
    setIsSearchFocused(false);
    // If centered desktop search is open, close the input container as well
    setIsCenteredSearchOpen(false);
  }, [])); // FIXED: Empty dependency array to prevent infinite loops

  // Close menu when route changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close mobile search overlay when clicking outside
  useEffect(() => {
    if (!isMobileSearchOpen || !isMountedRef.current) return;
    
    const handleClick = (e) => {
      // Simplified approach: only close if clicking outside the entire search overlay
      if (
        mobileSearchOverlayRef.current &&
        !mobileSearchOverlayRef.current.contains(e.target)
      ) {
        if (isMountedRef.current) {
          setIsMobileSearchOpen(false);
        }
      }
    };
    
    // Use mousedown only to avoid touch event issues
    document.addEventListener('mousedown', handleClick);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isMobileSearchOpen, setIsMobileSearchOpen]);

  // Enhanced mobile menu event listeners
  useEffect(() => {
    if (!isMobileMenuOpen || !isMountedRef.current) return;
    
    // Add escape key listener
    document.addEventListener('keydown', handleEscapeKey, { passive: true });
    // Add touch gesture listener
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isMobileMenuOpen, handleEscapeKey, handleTouchStart]);

  // Helper function to count result types
  const getResultTypeCounts = useCallback((results) => {
    const counts = { content: 0, person: 0 };
    results.forEach(result => {
      if (result.type === 'person') {
        counts.person++;
      } else {
        counts.content++;
      }
    });
    return counts;
  }, []);

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

        // Fuzzy matching score for typo tolerance
        const fuzzyTitleScore = calculateStringSimilarity(normalizedQuery, title) * 150;
        const fuzzyOriginalScore = calculateStringSimilarity(normalizedQuery, originalTitle) * 120;
        const fuzzyOverviewScore = calculateStringSimilarity(normalizedQuery, overview) * 30;

        // AI-powered semantic search scoring
        const semanticScore = semanticSearchScore(normalizedQuery, result);

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
          Math.max(fuzzyTitleScore, fuzzyOriginalScore) + // Use best fuzzy match
          fuzzyOverviewScore +
          semanticScore + // AI-powered semantic scoring
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
  }, []); // No dependencies needed as this function doesn't depend on any external values

  // Enhanced search handler with improved caching and performance
  const handleSearch = useCallback(async (query) => {
    const startTime = performance.now();
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Check cache first for instant results
    const cacheKey = `search_${trimmedQuery.toLowerCase()}`;
    const cachedResults = searchCache.get(cacheKey);
    if (cachedResults) {
      console.log('🎯 Using cached search results for:', trimmedQuery);
      performanceMetrics.cacheHits++;
      setSearchResults(cachedResults);
      setIsSearching(false);
      recordSearchMetric(performance.now() - startTime);
      return;
    }
    
    performanceMetrics.cacheMisses++;
    setIsSearching(true);

    // Use AbortController to cancel previous requests
    const abortController = new AbortController();
    let isActive = true;
    
    try {
      // Add minimum query length check for better performance and accuracy
      if (trimmedQuery.length < 3) {
        setSearchResults([]);
        setIsSearching(false);
        recordSearchMetric(performance.now() - startTime);
        return;
      }

      const results = await searchCombined(trimmedQuery, 1, { 
        signal: abortController.signal,
        includeAdult: true,
        language: 'en-US'
      });

      // Defensive: Ensure results is an object and has a results array
      const safeResults = (results && Array.isArray(results.results)) ? results.results : [];

      // Remove duplicates by id and media type
      const uniqueResults = Array.from(
        new Map(safeResults.map(item => [`${item.id}_${item.media_type || 'unknown'}`, item])).values()
      );

      // Process and sort results with enhanced scoring
      const processedResults = processSearchResults(uniqueResults, trimmedQuery);

      // Use smart filtering with early termination for better performance
      const filteredResults = filterSearchResults(processedResults, trimmedQuery, 25);

      if (isActive) {
        setSearchResults(filteredResults);
        setIsSearching(false);
        
        // Cache the results with size limit management (now handled by OptimizedCache)
        searchCache.set(cacheKey, filteredResults);
        
        recordSearchMetric(performance.now() - startTime);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error searching content and people:', error);
      if (isActive) {
        setSearchResults([]);
        setIsSearching(false);
      }
    }

    // Return cleanup function
    return () => { 
      isActive = false;
      abortController.abort();
    };
  }, [processSearchResults, setSearchResults, setIsSearching]);

  // Enhanced debounced search with adaptive timing for better performance
  const debouncedSearch = useMemo(() => {
    // Use adaptive debounce that adjusts delay based on query length
    const adaptiveDebounce = createAdaptiveDebounce(handleSearch);
    
    return {
      search: adaptiveDebounce,
      cancel: () => {
        // Cancel function is handled by the debounce implementation
      }
    };
  }, [handleSearch]);


  // Enhanced search suggestions handler with trending and popular terms
  const handleSearchSuggestions = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return [];
    }

    // Check suggestion cache first
    const suggestionKey = `suggestions_${trimmedQuery.toLowerCase()}`;
    const cachedSuggestions = suggestionCache.get(suggestionKey);
    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    try {
      // Get suggestions from search history with fuzzy matching
      // Early termination: stop after finding enough suggestions
      const historySuggestions = [];
      for (const item of searchHistory) {
        if (historySuggestions.length >= 5) break; // Early exit
        
        const score = calculateStringSimilarity(trimmedQuery, item);
        if (score > 0.2) {
          historySuggestions.push({ text: item, score });
        }
      }

      const sorted = historySuggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.text);

      // Popular search terms for better suggestions
      const popularTerms = [
        'action', 'comedy', 'drama', 'horror', 'romance', 'thriller', 'sci-fi',
        'superhero', 'marvel', 'dc', 'netflix', 'disney', 'anime', 'documentary',
        'christmas', 'halloween', 'war', 'crime', 'mystery', 'fantasy', 'adventure'
      ];

      const popularSuggestions = popularTerms
        .filter(term => term.toLowerCase().includes(trimmedQuery.toLowerCase()))
        .slice(0, 2);

      // Add some trending suggestions
      const trendingSuggestions = [
        'Action Movies', 'Netflix Originals', 'Disney Movies', 'Marvel Movies',
        'Horror Movies', 'Romantic Comedies', 'Documentaries', 'Anime Series'
      ].filter(term => 
        term.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        trimmedQuery.split(/\s+/).some(word => term.toLowerCase().includes(word))
      ).slice(0, 2);

      // Combine all suggestions and remove duplicates
      const allSuggestions = [...new Set([
        ...sorted,
        ...popularSuggestions,
        ...trendingSuggestions
      ])].slice(0, 5);

      // Cache the suggestions with automatic TTL management
      suggestionCache.set(suggestionKey, allSuggestions);

      return allSuggestions;
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }, [searchHistory]);

  // Cleanup debounced search on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending search operations
      if (debouncedSearch.cancel) {
        debouncedSearch.cancel();
      }
      // Clear any pending timeouts
      if (searchTimeoutRef?.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (errorTimeoutRef?.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [debouncedSearch]);

  // Enhanced search input handler with suggestions and better performance
  const handleSearchChange = useCallback(async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);
    setSelectedIndex(-1);

    // Support for Input Method Editors (IME) and composition events
    if (e.nativeEvent && typeof e.nativeEvent.isComposing === 'boolean' && e.nativeEvent.isComposing) {
      return;
    }

    // Accessibility: Announce search status for screen readers
    if (typeof scheduleRaf === 'function') {
      try {
        if (rafHolderRef?.current) {
          cancelRaf(rafHolderRef.current);
          rafHolderRef.current = null;
        }
      } catch (e) {
        // ignore
      }
      if (rafHolderRef) {
        rafHolderRef.current = scheduleRaf(() => {
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
    }

    // Clear any existing timeouts
    if (searchTimeoutRef?.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      // Show immediate loading state for better perceived performance
      setIsSearching(true);
      
      // Generate search predictions for better UX (with early termination)
      if (query.trim().length >= 2) {
        try {
          const analytics = JSON.parse(localStorage.getItem('searchAnalytics') || '{}');
          const predictions = generateSearchPredictions(query, searchHistory, analytics.popularQueries || {});
          setSearchPredictions(predictions.slice(0, 5)); // Limit to 5 predictions
        } catch (error) {
          console.warn('Failed to generate predictions:', error);
        }
      }
      
      // Check cache first for instant results, but only for queries with 3+ characters
      if (query.trim().length >= 3) {
        const cacheKey = `search_${query.trim().toLowerCase()}`;
        const cachedResults = searchCache.get(cacheKey);
        if (cachedResults) {
          console.log('🎯 Instant cache hit for:', query.trim());
          setSearchResults(cachedResults);
          setIsSearching(false);
          return;
        }
      }
      
      // Show suggestions for shorter queries
      if (query.trim().length >= 1 && query.trim().length < 4) {
        try {
          const suggestions = await handleSearchSuggestions(query);
          if (suggestions.length > 0) {
            // Convert suggestions to search result format
            const suggestionResults = suggestions.map((suggestion, index) => ({
              id: `suggestion_${index}`,
              title: suggestion,
              name: suggestion,
              media_type: 'suggestion',
              isSuggestion: true
            }));
            setSearchResults(suggestionResults);
          }
        } catch (error) {
          console.error('Error getting suggestions:', error);
        }
      }

      // Use adaptive debounce with dynamic delay
      const delay = query.trim().length < 4 ? 150 : 100;
      searchTimeoutRef.current = setTimeout(() => {
        debouncedSearch.search(query);
      }, delay);
    } else {
      debouncedSearch.cancel();
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearch, handleSearchSuggestions, setSearchQuery, setShowResults, setSelectedIndex, setSearchResults, setIsSearching]);

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
        
        // Enhanced localStorage handling with error recovery and race condition prevention
        scheduleNonCritical(() => {
          try {
            // Use a timestamp to prevent race conditions
            const timestamp = Date.now();
            const historyKey = `searchHistory_${timestamp}`;
            
            // Store with timestamp to prevent overwrites
            localStorage.setItem(historyKey, JSON.stringify(newHistory));
            
            // Clean up old entries to prevent localStorage bloat
            const keys = Object.keys(localStorage);
            const historyKeys = keys.filter(key => key.startsWith('searchHistory_'));
            if (historyKeys.length > 5) {
              // Keep only the 5 most recent
              historyKeys.sort().slice(0, -5).forEach(key => localStorage.removeItem(key));
            }
            
            // Track search history analytics with atomic update
            try {
              const analytics = JSON.parse(localStorage.getItem('searchAnalytics') || '{}');
              analytics.totalSearches = (analytics.totalSearches || 0) + 1;
              analytics.lastSearchDate = new Date().toISOString();
              analytics.lastUpdate = timestamp;
              localStorage.setItem('searchAnalytics', JSON.stringify(analytics));
            } catch (analyticsError) {
              console.warn('Failed to update analytics:', analyticsError);
            }
            
            // Set the main search history key
            localStorage.setItem('searchHistory', JSON.stringify(newHistory));
            
          } catch (e) {
            console.warn('Failed to persist search history:', e);
            // Fallback: try to clear and retry with limited data
            try {
              // Only clear search-related keys, not entire localStorage
              const keys = Object.keys(localStorage);
              keys.filter(key => key.startsWith('search')).forEach(key => localStorage.removeItem(key));
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
          if (g && typeof g === 'object') {
          try {
            return (g.name || g.id || '').toString().trim();
          } catch (err) {
            return (g.name || g.id || 'Unknown').trim();
          }
        }
          return '';
        }).filter(Boolean);
      } else if (Array.isArray(movie.genre_ids)) {
                  genres = movie.genre_ids.map(id => {
            try {
              return id.toString();
            } catch (err) {
              return String(id || '');
            }
          }).filter(Boolean);
      }
      
      return genres;
    };

    // Enhanced movie data object with comprehensive metadata and validation
    const movieData = {
      id: movie.id,
      title: movie.title || movie.name || 'Unknown Title',
      name: movie.name || movie.title || 'Unknown Title', // Ensure both title and name are present for TV shows
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
      adult: movie.adult || false,
      // 🎯 Skip full page loader on initial load (search result already has data)
      _skipInitialLoad: true
    };

    // Enhanced TV show detection and data enrichment
    if (movieData.media_type === 'tv' || movieData.type === 'tv' || 
        (movie.name && !movie.title)) { // If it has 'name' but no 'title', it's likely TV
      console.log('[Navbar] Enhanced TV show data for:', movieData.title || movieData.name);
      
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

    // ⚡ CRITICAL: Reset search state SYNCHRONOUSLY BEFORE calling onMovieSelect
    // This ensures the search overlay closes immediately without showing page loader
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
    setSelectedIndex(-1);
    setIsSearchFocused(false);
    setIsCenteredSearchOpen(false);
    setIsMobileSearchOpen(false);

    // Enhanced movie selection with analytics and caching
    if (onMovieSelect) {
      console.log('🎬 [Navbar] Calling onMovieSelect with movie:', movieData.title || movieData.name);
      console.log('🎬 [Navbar] Movie data:', movieData);
      
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
      // Add source flag to indicate this came from search (has pre-loaded data)
      try {
        onMovieSelect({
          ...movieData,
          _source: 'direct',  // Coming from navbar search
          _skipInitialLoad: true  // Skip the loader since we have all the data
        });
      } catch (error) {
        console.error('Error in movie selection callback:', error);
        // Fallback: try to recover gracefully
        if (typeof onMovieSelect === 'function') {
          onMovieSelect({ ...movieData, error: true });
        }
      }
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

  }, [onMovieSelect, setSearchHistory, setSearchQuery, setShowResults, setSearchResults, setSelectedIndex, setIsSearchFocused, setSearchHistory]);

  // Enhanced helper: Scroll selected item into view with advanced animation, accessibility, and performance optimizations
  const scrollToSelected = useCallback((index) => {
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

    // Use centralized throttled scheduler for optimal performance and visibility-aware gating
    // scheduleRaf returns null when the document is not visible; fall back to setTimeout in that case
    if (rafHolderRef) {
      rafHolderRef.current = scheduleRaf(() => performScroll());
      if (!rafHolderRef.current) {
        // Fallback for older browsers or when visibility prevents rAF
        setTimeout(performScroll, 16);
      }
    } else {
      // Fallback if rafHolderRef is not available
      setTimeout(performScroll, 16);
    }
  }, []);

  // Enhanced helper: Find next enabled index with intelligent wrap-around and accessibility
  const getNextIndex = useCallback((start, dir, maxIndex) => {
    let idx = start;
    
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
  }, []);

  // Enhanced typeahead with better matching
  const handleTypeahead = useCallback((char, selectedIndex, searchResults, setSelectedIndex, scrollToSelected) => {
    // Clear previous timeout
    if (typeaheadTimeoutRef.current) {
      clearTimeout(typeaheadTimeoutRef.current);
      typeaheadTimeoutRef.current = null;
    }
    // Append char to buffer
    typeaheadBufferRef.current = (typeaheadBufferRef.current || '') + char.toLowerCase();
    
    // Find matching item starting from current position
    let foundIndex = -1;
    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    
    // Search from current position to end
    for (let i = currentIndex; i < searchResults.length; i++) {
      const title = (searchResults[i].title || searchResults[i].name || '').toLowerCase();
      if (title.startsWith(typeaheadBufferRef.current || '')) {
        foundIndex = i;
        break;
      }
    }
    
    // If not found, search from beginning to current position
    if (foundIndex === -1) {
      for (let i = 0; i < currentIndex; i++) {
        const title = (searchResults[i].title || searchResults[i].name || '').toLowerCase();
        if (title.startsWith(typeaheadBufferRef.current || '')) {
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
    typeaheadTimeoutRef.current = setTimeout(() => {
      typeaheadBufferRef.current = '';
      typeaheadTimeoutRef.current = null;
    }, 1000); // Increased timeout for better UX
  }, []);

  // Enhanced visual feedback for selection with performance optimizations and accessibility
  const animateSelection = useCallback((index) => {
  // Performance optimization: Use centralized scheduler for smooth animations
  try {
    if (rafHolderRef?.current) {
      cancelRaf(rafHolderRef.current);
      rafHolderRef.current = null;
    }
  } catch (e) {}
  if (rafHolderRef) {
    rafHolderRef.current = scheduleRaf(() => {
      const el = document.querySelector(`[data-index="${index}"]`);
      if (!el) return;

      // Batch DOM operations for better performance
      const elementsToUpdate = document.querySelectorAll('.animate-navbar-select');
      elementsToUpdate.forEach(elem => elem.classList.remove('animate-navbar-select'));

      // Add new animation with enhanced visual feedback
      el.classList.add('animate-navbar-select');

      // Enhanced accessibility: Announce selection for screen readers
      const title = el.querySelector('[data-movie-title]')?.textContent || el.getAttribute('aria-label') || `Item ${index + 1}`;
      const liveRegion = document.getElementById('search-live-region');
      if (liveRegion) {
        liveRegion.textContent = `Selected: ${title}`;
        setTimeout(() => { liveRegion.textContent = ''; }, 300);
      }

      // Add subtle haptic feedback if supported
      if (navigator.vibrate && window.innerWidth <= 768) {
        navigator.vibrate(10);
      }

      // Cleanup after animation
      const cleanup = () => el.classList.remove('animate-navbar-select');
      if (window.requestIdleCallback) {
        window.requestIdleCallback(cleanup, { timeout: 350 });
      } else {
        setTimeout(cleanup, 300);
      }
    });
  }
  }, []);

  // Enhanced keyboard navigation for search results with improved accessibility and visual feedback
  const handleKeyDown = useCallback((e) => {
    if (!showResults || searchResults.length === 0) return;

    // Use dedicated refs (typeaheadBufferRef / typeaheadTimeoutRef) to persist typeahead state across renders



    // Handle different key inputs
    switch (e.key) {
      case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
          const next = getNextIndex(prev >= 0 ? prev : -1, 1, searchResults.length - 1);
              scrollToSelected(next);
              animateSelection(next);
            return next;
          });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = getNextIndex(prev >= 0 ? prev : searchResults.length, -1, searchResults.length - 1);
            scrollToSelected(next);
            animateSelection(next);
          return next;
        });
        break;
        
      case 'Tab':
        if (!e.shiftKey) {
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = getNextIndex(prev >= 0 ? prev : -1, 1, searchResults.length - 1);
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
        setShowFilters(false);
        // Clear search query on escape
        setSearchQuery('');
        setSearchResults([]);
        break;
        
      case '/':
        // Quick search shortcut
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          inputRef.current?.focus();
        }
        break;
        
      case 'f':
        // Toggle filters shortcut
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setShowFilters(prev => !prev);
        }
        break;
        
      case 'Backspace':
        // Clear typeahead buffer on backspace
        if (typeaheadBufferRef.current) {
          typeaheadBufferRef.current = '';
          if (typeaheadTimeoutRef.current) {
            clearTimeout(typeaheadTimeoutRef.current);
            typeaheadTimeoutRef.current = null;
          }
        }
        break;
        
      default:
        // Enhanced typeahead: support alphanumeric and some special characters
        if (e.key.length === 1 && /^[a-zA-Z0-9\s\-_\.]$/.test(e.key)) {
          handleTypeahead(e.key, selectedIndex, searchResults, setSelectedIndex, scrollToSelected);
        }
        break;
    }
  }, [showResults, searchResults, selectedIndex, handleMovieSelect, setSearchQuery, setSearchResults, setShowResults, setIsSearchFocused, setSelectedIndex, scrollToSelected, animateSelection]);

  // Clear search history
  const clearHistory = useCallback((e) => {
    // Handle case where no event is passed (programmatic call)
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    setSearchHistory([]);
  }, [setSearchHistory]);

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
    let isActive = true;
    
    const executeSearch = async () => {
      try {
        const results = await searchCombined(normalizedQuery, 1);
        
        // Check if component is still mounted
        if (!isActive) return;
        
        // Enhanced result validation
        if (!results || !Array.isArray(results.results)) {
          throw new Error('Invalid search results format');
        }

        const processedResults = processSearchResults(results.results, normalizedQuery);
        if (isActive) {
          setSearchResults(processedResults);
        }

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
          if (import.meta.env.DEV) {
          console.log(`Retrying search (${retryCount}/${maxRetries})...`);
        }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          return executeSearch();
        }

        // Enhanced error handling with user feedback
        if (isActive) {
          setSearchResults([]);
        }
        
        // Enhanced accessibility: Announce error
        scheduleNonCritical(() => {
          if (!isActive) return;
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
          error: error.message || (() => {
            try {
              return error.toString();
            } catch (err) {
              return 'Unknown error';
            }
          })()
        };
        console.error('Search error context:', errorContext);
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
        
        // Enhanced focus management with fallback options
        scheduleNonCritical(() => {
          if (!isActive) return;
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
    
    // Return cleanup function
    return () => {
      isActive = false;
    };
  }, [processSearchResults, setSearchQuery, setShowResults, setIsSearchFocused, setIsSearching, setSearchResults, setSelectedIndex, inputRef, setSearchHistory]);

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
        if (isInWatchlist && isInWatchlist(movie.id)) {
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
            .map(id => {
              try {
                return id.toString();
              } catch (err) {
                return String(id || '');
              }
            });
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
        if (addToWatchlist) {
          await Promise.resolve(addToWatchlist(movieData));
        } else {
          console.warn('Watchlist context not available, skipping add to watchlist');
          return;
        }
        
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
                      error: err.message || (() => {
              try {
                return err.toString();
              } catch (fallbackErr) {
                return 'Unknown error';
              }
            })(),
          stack: err.stack
        };
        // Robust error handling
        console.error('Failed to add movie to watchlist:', err);
        // Optionally, show an error notification/toast here
      }
    },
    [addToWatchlist, isInWatchlist, setSearchHistory]
  );

  // Cast overlay handlers
  const handleCastSelect = useCallback((cast) => {
    // ⚡ CRITICAL: Reset search state SYNCHRONOUSLY BEFORE calling onCastSelect
    // This ensures the search overlay closes immediately
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
    setSelectedIndex(-1);
    setIsSearchFocused(false);
    setIsCenteredSearchOpen(false);
    setIsMobileSearchOpen(false);
    
    if (onCastSelect) {
      onCastSelect(cast);
    }
  }, [onCastSelect, setSearchQuery, setShowResults, setSearchResults, setSelectedIndex, setIsSearchFocused]);

  return (
    <header className="relative z-[70] flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#2b3036] px-2 pl-4 py-3 bg-gradient-to-b from-[#23272F]/90 via-[#181A20]/80 to-[#181A20]/70 backdrop-blur-[10px] shadow-xl shadow-black/10 transition-all duration-500">
      {/* LEFT: Logo/Name (always visible) + Desktop nav links */}
      <div className="flex items-center gap-4 sm:gap-6 md:gap-8 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 text-white">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              {/* Animated Background Glow */}
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 via-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
                {...(reducedMotion ? {} : {
                  animate: {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  },
                  transition: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }
                })}
              />
              
              {/* Main Logo Container */}
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-white/30 via-white/10 to-white/5 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_16px_4px_rgba(255,255,255,0.18)] shadow-lg shadow-black/20">
                {/* Animated Logo Icon */}
                <motion.svg 
                  viewBox="0 0 48 48" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white transform transition-transform duration-300 group-hover:scale-110"
                  {...(reducedMotion ? {} : {
                    animate: {
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0],
                    },
                    transition: {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1
                    }
                  })}
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
                {...(reducedMotion ? {} : {
                  animate: {
                    scale: [1, 1.2, 1],
                    opacity: [0, 0.5, 0],
                  },
                  transition: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3
                  }
                })}
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
            onMouseEnter={() => {
              try {
                const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                const saveData = conn && (conn.saveData || false);
                const effectiveType = conn && conn.effectiveType;
                const isSlow = effectiveType && /(^2g$|^slow-2g$|^3g$)/i.test(effectiveType);
                if (saveData || isSlow) return;
              } catch (_) {}
              import('../../pages/MoviesPage');
            }}
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
                    )
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
                    )
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
          {/* Series (visible always; counts for initial sets) */}
          <Link
            to="/series"
            className={`relative ${location.pathname === '/series' ? 'text-white' : 'text-white/80 hover:text-white'} transition-all duration-300 group`}
            onMouseEnter={() => {
              try {
                const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                const saveData = conn && (conn.saveData || false);
                const effectiveType = conn && conn.effectiveType;
                const isSlow = effectiveType && /(^2g$|^slow-2g$|^3g$)/i.test(effectiveType);
                if (saveData || isSlow) return;
              } catch (_) {}
              import('../../pages/SeriesPage');
            }}
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
          {/* Watchlist */}
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

          {/* Manga */}
          <Link
            to="/manga"
            className={`relative ${location.pathname === '/manga' ? 'text-white' : 'text-white/80 hover:text-white'} transition-all duration-300 group`}
            onMouseEnter={() => {
              try {
                const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                const saveData = conn && (conn.saveData || false);
                const effectiveType = conn && conn.effectiveType;
                const isSlow = effectiveType && /(^2g$|^slow-2g$|^3g$)/i.test(effectiveType);
                if (saveData || isSlow) return;
              } catch (_) {}
              import('../../pages/MangaListPage');
            }}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <div className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-lg ${location.pathname === '/manga' ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'} flex items-center justify-center transition-all duration-300 shadow-sm shadow-black/10`}>
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
                
                {/* Animated Icon - BookOpenIcon for Manga */}
                {location.pathname === '/manga' ? (
                  <BookOpenIconSolid className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white group-hover:text-white transition-colors duration-300 relative z-10" />
                ) : (
                  <BookOpenIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/80 group-hover:text-white transition-colors duration-300 relative z-10" />
                )}
                
                {/* Floating Particles for Active State */}
                {location.pathname === '/manga' && (
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
              <span className="font-medium tracking-wide text-sm sm:text-base">Manga</span>
            </span>
            <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-white/90 via-white/60 to-white/30 transition-all duration-500 ${location.pathname === '/manga' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
          </Link>

          {/* Community + Donate */}
          <Link
            to="/community"
            className={`relative ${location.pathname === '/community' ? 'text-white' : 'text-white/80 hover:text-white'} transition-all duration-300 group`}
            onMouseEnter={() => {
              try {
                const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                const saveData = conn && (conn.saveData || false);
                const effectiveType = conn && conn.effectiveType;
                const isSlow = effectiveType && /(^2g$|^slow-2g$|^3g$)/i.test(effectiveType);
                if (saveData || isSlow) return;
              } catch (_) {}
              import('../../pages/CommunityPage');
            }}
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
            to="/donate"
            className={`relative ${location.pathname === '/donate' ? 'text-white' : 'text-white/80 hover:text-white'} transition-all duration-300 group`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <div className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-lg ${location.pathname === '/donate' ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'} flex items-center justify-center transition-all duration-300 shadow-sm shadow-black/10`}>
                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 transform transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill={location.pathname === '/donate' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M12.001 4.529c2.349-2.532 6.213-2.532 8.562 0 2.348 2.531 2.348 6.635 0 9.166l-7.07 7.622a2.1 2.1 0 01-3 0l-7.07-7.622c-2.348-2.531-2.348-6.635 0-9.166 2.349-2.532 6.213-2.532 8.562 0l1.016 1.095 1-1.095z" />
                </svg>
              </div>
              <span className="font-medium tracking-wide text-sm sm:text-base">Support</span>
            </span>
            <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-white/90 via-white/60 to-white/30 transition-all duration-500 ${location.pathname === '/donate' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
          </Link>
          

          
        </div>
      </div>
      {/* RIGHT: Desktop search and profile/auth menu (hidden on mobile) */}
      <div className="hidden sm:flex flex-1 justify-end items-center gap-2 sm:gap-3 md:gap-4 mr-2">
        {/* Desktop search icon trigger */}
        <button
          type="button"
          aria-label="Open search"
          onClick={() => {
            setIsCenteredSearchOpen(true);
            setShowResults(true);
            setIsSearchFocused(true);
            setTimeout(() => inputRef.current?.focus?.(), 0);
          }}
          className="group relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#2b3036] hover:bg-[#323840] border border-white/10 text-white/80 hover:text-white transition-colors overflow-hidden"
        >
          {/* Hover color expansion effect */}
          <div className="absolute inset-0 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform scale-0 group-hover:scale-100 origin-center"></div>
          
          {/* Search icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" className="relative z-10 transition-all duration-200 group-hover:scale-110 group-hover:text-black">
            <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
          </svg>
        </button>

        {/* Backdrop for centered search; closes on outside click */}
        {createPortal(
          <AnimatePresence>
            {isCenteredSearchOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="fixed inset-0 z-[50] hidden sm:block bg-black/40 backdrop-blur-sm"
                onClick={() => {
                  setIsCenteredSearchOpen(false);
                  setShowResults(false);
                  setIsSearchFocused(false);
                }}
              />
            )}
          </AnimatePresence>,
          document.body
        )}

        {isCenteredSearchOpen && createPortal(
          <div 
            ref={searchRef} 
            className="fixed top-[140px] left-1/2 transform -translate-x-1/2 w-[90vw] sm:w-[80vw] md:w-[60vw] lg:w-[50vw] xl:w-[40vw] max-w-[1100px] z-[60] transition-all duration-300 ease-out group"
          >
          {/* Enhanced Animated Background Glow for Search */}
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/8 via-white/15 to-white/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
            animate={{
              scale: [1, 1.02, 1],
              opacity: isSearchFocused ? [0.15, 0.25, 0.15] : [0, 0.12, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2
            }}
          />
          
          <label className="flex flex-col !h-12">
            <div className="flex w-full flex-1 items-stretch rounded-full h-full relative overflow-hidden bg-[#1a1d21]/95 backdrop-blur-2xl border border-white/20">
              <div className="text-[#a1abb5] flex border-none items-center justify-center pl-4 pr-2 rounded-l-full border-r-0 relative transition-colors duration-300">
                {/* Enhanced Animated Search Icon */}
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20px" 
                  height="20px" 
                  fill="currentColor" 
                  viewBox="0 0 256 256"
                  className="group-hover:text-white/90 transition-colors duration-300"
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
                placeholder="Search movies, TV shows, cast..."
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl rounded-r-full text-white focus:outline-0 focus:ring-0 border-none bg-transparent focus:border-none h-full placeholder:text-[#a1abb5] placeholder:group-hover:text-white/60 placeholder:focus:text-white/60 px-4 rounded-l-none border-l-0 pl-3 pr-10 text-base font-normal leading-normal relative z-10 transition-all duration-300"
              />
              
                             {/* Enhanced Clear Button */}
               {searchQuery && (
                 <motion.button
                   initial={{ opacity: 0, scale: 0.8, x: 10 }}
                   animate={{ opacity: 1, scale: 1, x: 0 }}
                   exit={{ opacity: 0, scale: 0.8, x: 10 }}
                   onClick={() => {
                     setSearchQuery('');
                     setSearchResults([]);
                     setShowResults(false);
                     inputRef.current?.focus();
                   }}
                   className="absolute right-3 top-0 bottom-0 my-auto w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all duration-300 z-20 group/clear border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md"
                   whileHover={{ 
                     scale: 1.15,
                     rotate: 90,
                     transition: { duration: 0.2 }
                   }}
                   whileTap={{ 
                     scale: 0.9,
                     transition: { duration: 0.1 }
                   }}
                   title="Clear search"
                 >
                   <svg 
                     xmlns="http://www.w3.org/2000/svg" 
                     className="h-3.5 w-3.5 text-white/70 group-hover/clear:text-white/90 transition-all duration-200" 
                     viewBox="0 0 24 24" 
                     fill="none" 
                     stroke="currentColor" 
                     strokeWidth="2.5"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                   >
                     <path d="M18 6L6 18M6 6l12 12" />
                   </svg>
                 </motion.button>
               )}
               
              
              {/* Enhanced Animated Ring Effect for Search Focus */}
              <motion.div
                className="absolute inset-0 rounded-full opacity-0"
                animate={{
                  scale: [1, 1.02, 1],
                  opacity: isSearchFocused ? [0, 0.4, 0] : [0, 0, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3
                }}
              />
              
              {/* Subtle Border for Better Definition */}
              <div className="absolute inset-0 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </label>
          

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25, duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-3 text-white/90 bg-[#1a1d21]/95 backdrop-blur-2xl border border-white/20 rounded-2xl z-50 shadow-2xl shadow-black/50 overflow-hidden"
                style={{ maxHeight: 'calc(100vh - 200px)', minHeight: '200px' }}
              >
                {/* ARIA live region for accessibility */}
                <div id="search-live-region" aria-live="polite" className="sr-only" />

                {/* Header */}
                <div className="sticky top-0 p-4 border-b border-white/15 flex items-center justify-between bg-[#1a1d21]/95 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    <h3 className="text-white font-semibold">Search Results</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span>{isSearching ? 'Searching...' : (() => {
                      const counts = getResultTypeCounts(searchResults);
                      const contentText = counts.content > 0 ? `${counts.content} content` : '';
                      const personText = counts.person > 0 ? `${counts.person} cast` : '';
                      const parts = [contentText, personText].filter(Boolean);
                      return `${searchResults.length} results (${parts.join(', ')})`;
                    })()}</span>
                    <span>•</span>
                    <span>Press Enter to select</span>
                  </div>
                </div>

                {/* Search History */}
                {!searchQuery && searchHistory.length > 0 && (
                  <div className="sticky top-14 p-4 border-b border-white/15 bg-[#1a1d21]/90 z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white/90 font-medium">Recent Searches</h4>
                      <button
                        onClick={(e) => clearHistory(e)}
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
                          className="relative px-3 py-1.5 bg-white/90 rounded-full text-black text-xs transition-all duration-200 ease-out flex items-center gap-2 border border-white/20 group overflow-hidden hover:scale-105"
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

                {/* Initial State - When search is focused but empty */}
                {!searchQuery && searchHistory.length === 0 && (
                  <div className="py-8 text-center">
                    {/* Minimal Search Icon */}
                    <motion.div
                      className="w-16 h-16 mx-auto mb-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <div className="w-full h-full bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </motion.div>
                    
                    {/* Clean Title */}
                    <motion.h3 
                      className="text-white/80 mb-3 text-lg font-medium"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                    >
                      Start searching
                    </motion.h3>
                    
                    {/* Simple Subtitle */}
                    <motion.div 
                      className="text-white/50 text-sm max-w-xs mx-auto leading-relaxed"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                    >
                      Find movies, TV shows, and cast members
                    </motion.div>
                  </div>
                )}

                {/* Results List */}
                <div 
                  className="overflow-y-auto overflow-x-hidden max-h-[60vh] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                >
                  {/* Pixel-Perfect Loading Skeleton */}
                  {isSearching ? (
                    <div className="divide-y divide-white/10" role="listbox">
                      {[...Array(3)].map((_, i) => (
                        <motion.div 
                          key={i} 
                          className="w-full p-4 flex items-start gap-4 transition-all duration-200 rounded-xl relative"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Movie Image Skeleton */}
                          <div className="w-20 h-28 flex-shrink-0 relative overflow-hidden rounded-xl bg-white/8 border border-white/15 shadow-lg">
                            <div className="w-full h-full bg-gradient-to-br from-white/10 via-white/5 to-white/10" />
                          </div>
                          
                          {/* Content Skeleton */}
                          <div className="flex-1 min-w-0 relative z-10">
                            <div className="flex items-start justify-between gap-4">
                              <div className='flex flex-col flex-1 items-start gap-2.5'>
                                {/* Title Skeleton */}
                                <div className="h-6 w-3/4 rounded bg-white/10" />
                                
                                {/* Meta Info Skeleton */}
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-8 rounded bg-white/10" />
                                  <div className="h-4 w-1 rounded-full bg-white/10" />
                                  <div className="h-4 w-16 rounded bg-white/10" />
                                  <div className="h-4 w-1 rounded-full bg-white/10" />
                                  <div className="h-4 w-12 rounded bg-white/10 flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-yellow-400/30" />
                                  </div>
                                </div>
                                
                                {/* Genres Skeleton */}
                                <div className="flex items-center gap-2 mt-3">
                                  <div className="h-6 w-16 rounded-full bg-white/10" />
                                  <div className="h-6 w-20 rounded-full bg-white/10" />
                                  <div className="h-6 w-14 rounded-full bg-white/10" />
                                </div>
                                
                                {/* Overview Skeleton */}
                                <div className="mt-3 space-y-2">
                                  <div className="h-4 w-full rounded bg-white/10" />
                                  <div className="h-4 w-2/3 rounded bg-white/10" />
                                </div>
                              </div>
                              
                              {/* Action Buttons Skeleton */}
                              <div className="flex items-center gap-1.5">
                                <div className="w-7 h-7 rounded-lg bg-white/10" />
                                <div className="w-7 h-7 rounded-lg bg-white/10" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : searchQuery.trim() ? (
                    <>
                      {/* Search Predictions */}
                      {searchPredictions.length > 0 && searchQuery.trim().length >= 2 && (
                        <div className="px-4 py-2 border-b border-white/10">
                          <div className="text-xs text-white/60 mb-2">Suggestions:</div>
                          <div className="flex flex-wrap gap-2">
                            {searchPredictions.slice(0, 4).map((prediction, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSearchQuery(prediction);
                                  setSearchPredictions([]);
                                  inputRef.current?.focus();
                                }}
                                className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-full transition-colors duration-200 text-white/80 hover:text-white"
                              >
                                {prediction}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {searchResults.length > 0 ? (
                        <div className="divide-y divide-white/10" role="listbox">
                          {searchResults.map((movie, index) => (
                            <SearchResultItem
                              key={movie.id}
                              movie={movie}
                              index={index}
                              selectedIndex={selectedIndex}
                              onSelect={handleMovieSelect}
                              isInWatchlist={isInWatchlist}
                              onAddToWatchlist={handleAddToWatchlist}
                              onCastSelect={handleCastSelect}
                              handleSearchQuery={setSearchQuery}
                              debouncedSearch={debouncedSearch}
                            />
                          ))}
                        </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          duration: 0.4,
                          ease: "easeOut"
                        }}
                        className="text-center py-16"
                      >
                        {/* Minimal No Results Icon */}
                        <motion.div
                          className="w-16 h-16 mx-auto mb-6"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                        >
                          <div className="w-full h-full bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                            </svg>
                          </div>
                        </motion.div>
                        
                        {/* Clean Message */}
                        <motion.h3 
                          className="text-white/80 mb-3 text-lg font-medium"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                        >
                          No results found
                        </motion.h3>
                        
                        {/* Simple Subtitle */}
                        <motion.div 
                          className="text-white/50 mb-6 text-sm max-w-sm mx-auto"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                        >
                          Try different keywords or check your spelling
                        </motion.div>
                        
                        {/* Minimal Tips */}
                        <motion.div 
                          className="max-w-md mx-auto space-y-3"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
                        >
                          <div className="flex items-center justify-center gap-6 text-xs text-white/40">
                            <span>• Try synonyms</span>
                            <span>• Check spelling</span>
                            <span>• Use keywords</span>
                          </div>
                        </motion.div>
                        
                        {/* Character Count Tip */}
                        {searchQuery.length < 3 && (
                          <motion.div 
                            className="mt-6 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                          >
                            <div className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                              <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-white/50 text-xs">Use at least 3 characters</span>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )
                    }
                    </>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
        )}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
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
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
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
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture.startsWith('http') ? user.profilePicture : `${SERVER_URL}${user.profilePicture}`}
                        alt="User Avatar"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="relative z-10">
                        {user?.name ? user.name[0].toUpperCase() : 'U'}
                      </span>
                    )}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 rounded-full ring-2 ring-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-white/20 opacity-0 group-hover:opacity-100 blur transition-all duration-300" />
                  </motion.div>

                </motion.button>
              ) : (
                <motion.div
                  key="auth-buttons"
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="flex items-center gap-2 sm:gap-4"
                >
                  <Link
                    to="/login"
                    className="relative px-3 sm:px-4 md:px-5 py-2 sm:py-2 text-white/90 hover:text-white transition-all duration-300 group rounded-full bg-white/5 ring-1 ring-white/10 hover:ring-white/20 shadow-sm hover:shadow-white/10 backdrop-blur-sm overflow-hidden"
                  >
                    {/* Hover color expansion effect */}
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform scale-0 group-hover:scale-[7] origin-center"></div>
                    
                    <span className="relative z-10 flex items-center gap-2 font-medium text-sm sm:text-base group-hover:text-black transition-colors duration-200">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                      Sign In
                    </span>
                  </Link>
                  <Link
                    to="/signup"
                    className="relative px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-white font-medium transition-all duration-300 group md:hidden"
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
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  
                  {/* Desktop Menu */}
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 200,
                      damping: 20
                    }}
                    className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#1a1a1a]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50 sm:right-0 right-4 hidden md:block"
                  >
                    {/* User Info Section */}
                    <div className="p-5 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white font-semibold text-2xl shadow-lg ring-2 ring-white/10">
                          {user?.profilePicture ? (
                            <img
                              src={user.profilePicture.startsWith('http') ? user.profilePicture : `${SERVER_URL}${user.profilePicture}`}
                              alt="User Avatar"
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span>{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg">{user?.name || 'User'}</p>
                          <p className="text-white/60 text-sm mt-0.5">{user?.email}</p>
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
                        to="/donate"
                        className="flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12.001 4.529c2.349-2.532 6.213-2.532 8.562 0 2.348 2.531 2.348 6.635 0 9.166l-7.07 7.622a2.1 2.1 0 01-3 0l-7.07-7.622c-2.348-2.531-2.348-6.635 0-9.166 2.349-2.532 6.213-2.532 8.562 0l1.016 1.095 1-1.095z" />
                          </svg>
                        </div>
                        <span className="flex-1 font-medium">Support</span>
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


      {/* MOBILE: Search and Profile aligned to the right */}
      <div className="flex items-center gap-2 ml-auto md:hidden">
        
        {/* Right side - Search and Profile */}
        <div className="flex items-center gap-2">
          {/* Search icon (mobile) */}
          <motion.button
            onClick={() => setIsMobileSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-all duration-200"
            aria-label="Open search"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </motion.button>

        {/* Mobile profile/hamburger trigger */}
        <div className="relative">
          <motion.button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`relative z-[10000] w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 ${isMenuOpen ? 'bg-white/20 ring-2 ring-white/30' : 'bg-white/10 hover:bg-white/15'}`}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            data-profile-btn
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {user ? (
              user?.profilePicture ? (
                <img
                  src={user.profilePicture.startsWith('http') ? user.profilePicture : `${SERVER_URL}${user.profilePicture}`}
                  alt="User Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-sm font-medium">
                  {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              )
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </motion.button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="absolute right-0 top-full mt-2 w-52 max-w-[85vw] bg-[#0f1216]/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 overflow-hidden z-[9999] md:hidden"
                onClick={(e) => e.stopPropagation()}
                ref={menuRef}
              >
                <div className="py-1">
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors duration-150 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span className="font-medium">Profile</span>
                      </Link>
                      <Link
                        to="/watchlist"
                        className="flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors duration-150 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="font-medium">My List</span>
                      </Link>
                      <Link
                        to="/donate"
                        className="flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors duration-150 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12.001 4.529c2.349-2.532 6.213-2.532 8.562 0 2.348 2.531 2.348 6.635 0 9.166l-7.07 7.622a2.1 2.1 0 01-3 0l-7.07-7.622c-2.348-2.531-2.348-6.635 0-9.166 2.349-2.532 6.213-2.532 8.562 0l1.016 1.095 1-1.095z" />
                        </svg>
                        <span className="font-medium">Support</span>
                      </Link>
                      <button
                        onClick={() => { logout(); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors duration-150 text-sm text-left"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                        </svg>
                        <span className="font-medium">Logout</span>
                      </button>
                    
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors duration-150 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                          <polyline points="10 17 15 12 10 7" />
                          <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                        <span className="font-medium">Sign in</span>
                      </Link>
                      <Link
                        to="/signup"
                        className="flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors duration-150 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium">Sign up</span>
                      </Link>
                      <Link
                        to="/donate"
                        className="flex items-center gap-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors duration-150 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12.001 4.529c2.349-2.532 6.213-2.532 8.562 0 2.348 2.531 2.348 6.635 0 9.166l-7.07 7.622a2.1 2.1 0 01-3 0l-7.07-7.622c-2.348-2.531-2.348-6.635 0-9.166 2.349-2.532 6.213-2.532 8.562 0l1.016 1.095 1-1.095z" />
                        </svg>
                        <span className="font-medium">Support</span>
                      </Link>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
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
            className="fixed inset-0 z-[90000] md:hidden search-overlay"
            data-search-element="true"
            onClick={(e) => {
              // Only close search when clicking on the overlay background, not on search content
              if (e.target === e.currentTarget) {
                setIsMobileSearchOpen(false);
                setIsMobileSearchActive(false);
                setShowResults(false);
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
              className="absolute top-20 left-4 right-4 search-results"
              data-search-element="true"
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
                                  className="relative bg-[#1a1d21]/95 backdrop-blur-2xl rounded-2xl border border-white/20 p-4 shadow-2xl shadow-black/50 search-content"
                data-search-element="true"
                onClick={(e) => {
                  // Prevent closing when clicking inside the search content
                  e.stopPropagation();
                }}
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
                      className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
                      whileHover={{ scale: 1.02, rotate: 2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </motion.div>
                    <span className="text-white/90 font-medium text-lg">Search Movies, TV Shows & Cast</span>
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
                      placeholder="Search for movies, TV shows, cast members..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                      onFocus={() => {
                        setIsSearchFocused(true);
                        setShowResults(true);
                        setIsMobileSearchActive(true);
                      }}
                      onBlur={(e) => {
                        // For mobile search, keep results visible even on blur
                        if (isMobileSearchOpen) {
                          setIsSearchFocused(false);
                          // Keep results visible in mobile search
                          setShowResults(true);
                        } else {
                          // For desktop search, hide results on blur
                          setTimeout(() => {
                            if (!e.relatedTarget || !e.relatedTarget.closest('.search-results-container')) {
                              setIsSearchFocused(false);
                              setShowResults(false);
                            }
                          }, 100);
                        }
                      }}
                      className="w-full bg-white/10 border border-white/30 rounded-full px-4 py-[0.5rem] pr-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300 search-input"
                      data-search-element="true"
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
                            if (e && typeof e.preventDefault === 'function') {
                              e.preventDefault();
                            }
                            if (e && typeof e.stopPropagation === 'function') {
                              e.stopPropagation();
                            }
                          }}
                          onTouchStart={(e) => {
                            if (e && typeof e.stopPropagation === 'function') {
                              e.stopPropagation();
                            }
                          }}
                          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors duration-200 cursor-pointer select-none search-clear-button"
                          data-search-element="true"
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
                  <AnimatePresence mode="sync">
                    {(showResults || isMobileSearchActive) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ 
                          duration: 0.2,
                          ease: "easeInOut"
                        }}
                        className="mt-4 search-results-container"
                        data-search-element="true"
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
                            className="mb-4 search-history"
                            data-search-element="true"
                            onClick={(e) => {
                              // Prevent closing when clicking inside search history
                              if (e && typeof e.stopPropagation === 'function') {
                                e.stopPropagation();
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-white/90 font-medium text-sm">Recent Searches</h4>
                              <button
                                onClick={(e) => {
                                  if (e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                  clearHistory(e);
                                }}
                                onMouseDown={(e) => {
                                  if (e && typeof e.stopPropagation === 'function') {
                                    e.stopPropagation();
                                  }
                                }}
                                onTouchStart={(e) => {
                                  if (e && typeof e.stopPropagation === 'function') {
                                    e.stopPropagation();
                                  }
                                }}
                                className="text-white/50 hover:text-white/70 text-xs transition-colors search-clear-history"
                                data-search-element="true"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {searchHistory.map((query, index) => (
                                <motion.button
                                  key={index}
                                  onClick={(e) => {
                                    if (e) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                    handleHistoryItemClick(query);
                                  }}
                                  onMouseDown={(e) => {
                                    if (e && typeof e.stopPropagation === 'function') {
                                      e.stopPropagation();
                                    }
                                  }}
                                  onTouchStart={(e) => {
                                    if (e && typeof e.stopPropagation === 'function') {
                                      e.stopPropagation();
                                    }
                                  }}
                                  className="relative px-3 py-1.5 bg-white/90 rounded-full text-black text-xs transition-all duration-200 ease-out flex items-center gap-2 border border-white/20 search-history-item group overflow-hidden"
                                  data-search-element="true"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ 
                                    duration: 0.15, 
                                    delay: index * 0.02,
                                    ease: "easeOut"
                                  }}
                                  whileHover={{ scale: 1.05 }}
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

                                                {/* Initial State - When mobile search is focused but empty */}
                        {!searchQuery && searchHistory.length === 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ 
                              duration: 0.2,
                              ease: "easeOut"
                            }}
                            className="text-center py-3"
                            onClick={(e) => {
                              // Prevent closing when clicking inside initial state
                              if (e && typeof e.stopPropagation === 'function') {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {/* Minimal Mobile Search Icon */}
                            <motion.div
                              className="w-14 h-14 mx-auto mb-5"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                              <div className="w-full h-full bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
                                <svg className="w-7 h-7 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                            </motion.div>
                            
                            {/* Clean Title */}
                            <motion.h3 
                              className="text-white/80 mb-3 text-base font-medium"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                            >
                              Start searching
                            </motion.h3>
                            
                            {/* Simple Subtitle */}
                            <motion.div 
                              className="text-white/50 text-sm max-w-xs mx-auto leading-relaxed"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                            >
                              Find movies, TV shows, and cast members
                            </motion.div>
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
                            onClick={(e) => {
                              // Prevent closing when clicking inside loading state
                              if (e && typeof e.stopPropagation === 'function') {
                                e.stopPropagation();
                              }
                            }}
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
                            className="max-h-96 overflow-y-auto overflow-x-hidden search-results-list"
                            data-search-element="true"
                            onClick={(e) => {
                              // Prevent closing when clicking inside search results
                              if (e && typeof e.stopPropagation === 'function') {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {searchResults.length > 0 ? (
                              <div className="divide-y divide-white/10" role="listbox">
                                {searchResults.map((movie, index) => (
                                  <motion.button
                                    key={movie.id}
                                    data-index={index}
                                    onClick={(e) => {
                                      if (e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }
                                      if (movie.isSuggestion) {
                                        // Handle suggestion selection
                                        setSearchQuery(movie.title);
                                        debouncedSearch.search(movie.title);
                                      } else if (movie.type === 'person') {
                                        handleCastSelect(movie);
                                        setIsMobileSearchOpen(false);
                                        setIsMobileSearchActive(false);
                                        setShowResults(false);
                                      } else {
                                        handleMovieSelect(movie);
                                        setIsMobileSearchOpen(false);
                                        setIsMobileSearchActive(false);
                                        setShowResults(false);
                                      }
                                    }}
                                    onMouseDown={(e) => {
                                      // Prevent any mouse events from bubbling
                                      if (e && typeof e.stopPropagation === 'function') {
                                        e.stopPropagation();
                                      }
                                    }}
                                    onTouchStart={(e) => {
                                      // Prevent any touch events from bubbling
                                      if (e && typeof e.stopPropagation === 'function') {
                                        e.stopPropagation();
                                      }
                                    }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`w-full p-4 px-0 flex items-start gap-4 transition-all duration-200 rounded-xl group/item focus:outline-none relative ${
                                      index === selectedIndex 
                                        ? 'border-l-4 border-white/40 bg-gradient-to-r from-white/15 to-white/5 shadow-lg shadow-black/30'
                                        : 'hover:bg-white/8'
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
                                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/80 rounded-r-lg"
                                        initial={{ scaleY: 0 }}
                                        animate={{ scaleY: 1 }}
                                        exit={{ scaleY: 0 }}
                                        transition={{ duration: 0.18 }}
                                        style={{ zIndex: 3 }}
                                      />
                                    )}
                                    <div className="w-20 h-28 flex-shrink-0 relative group/image overflow-hidden rounded-xl bg-white/8 border border-white/15 shadow-lg">
                                      <MovieImage
                                        src={movie.image || movie.poster_path ? getTmdbImageUrl(movie.poster_path || movie.image, 'w185') : ''}
                                        alt={movie.type === 'person' ? movie.name : movie.title}
                                        className="w-full h-full"
                                        fallbackIcon={movie.type === 'person' ? 'person' : 'movie'}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0 relative z-10">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className='flex flex-col flex-1 items-start gap-2.5'>
                                          <div className="flex items-center gap-2">
                                            <h3 className="text-white font-semibold truncate text-base md:text-lg leading-tight">
                                              {movie.type === 'person' ? movie.name : movie.title}
                                            </h3>
                                          </div>
                                          <div className="flex items-center gap-2 text-white/70 text-xs md:text-sm">
                                            {movie.type === 'person' ? (
                                              <>
                                                <span>{movie.knownForDepartment}</span>
                                                {movie.popularity > 0 && (
                                                  <>
                                                    <span>•</span>
                                                    <span className="inline-flex items-center gap-1">
                                                      <svg className="w-3 h-3 text-yellow-400 inline" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.286 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/>
                                                      </svg>
                                                      {Math.round(movie.popularity)}
                                                    </span>
                                                  
                    </>
                                                )}
                                              
                    </>
                                            ) : (
                                              <>
                                                <span>{movie.year}</span>
                                                <span>•</span>
                                                <span>{movie.type === 'tv' ? 'TV Show' : 'Movie'}</span>
                                              
                                              </>
                                            )}
                                            {movie.type !== 'person' && movie.rating > 0 && (
                                              <>
                                                <span>•</span>
                                                <span className="inline-flex items-center gap-1">
                                                  <svg className="w-3 h-3 text-yellow-400 inline" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"/>
                                                  </svg>
                                                  {formatRating(movie.rating)}
                                                </span>
                                              
                    </>
                                            )}
                                          </div>
                                        </div>
                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1.5 transition-all duration-300">
                                          {/* Add to Watchlist Button (for content) or View Profile Button (for people) */}
                                          <motion.div
                                            onClick={(e) => {
                                              if (e && typeof e.stopPropagation === 'function') {
                                                e.stopPropagation();
                                              }
                                              if (movie.type === 'person') {
                                                // For people, show cast details overlay
                                                handleCastSelect(movie);
                                              } else {
                                                // For content, handle watchlist
                                                if (isInWatchlist && isInWatchlist(movie.id)) {
                                                  // Remove from watchlist using context
                                                  if (removeFromWatchlist) {
                                                    removeFromWatchlist(movie.id);
                                                  }
                                                } else {
                                                  // Add to watchlist
                                                  handleAddToWatchlist(e, movie);
                                                }
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              if (e && typeof e.stopPropagation === 'function') {
                                                e.stopPropagation();
                                              }
                                            }}
                                            onTouchStart={(e) => {
                                              if (e && typeof e.stopPropagation === 'function') {
                                                e.stopPropagation();
                                              }
                                            }}
                                            className={`relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer group/btn
                                              ${movie.type === 'person' 
                                                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200'
                                                : (isInWatchlist && isInWatchlist(movie.id))
                                                  ? 'bg-white/20 text-white'
                                                  : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                                              }
                                            `}
                                            title={movie.type === 'person' ? 'View profile' : (isInWatchlist && isInWatchlist(movie.id)) ? 'Remove from watchlist' : 'Add to watchlist'}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                          >
                                            {/* Icon */}
                                            <div className="relative z-10">
                                              {movie.type === 'person' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                  <circle cx="12" cy="7" r="4" />
                                                </svg>
                                              ) : (isInWatchlist && isInWatchlist(movie.id)) ? (
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
                                            {movie.type !== 'person' && isInWatchlist && isInWatchlist(movie.id) && (
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
                                              if (e && typeof e.stopPropagation === 'function') {
                                                e.stopPropagation();
                                              }
                                              if (navigator.share) {
                                                if (movie.type === 'person') {
                                                  navigator.share({
                                                    title: movie.name,
                                                    text: `Check out ${movie.name} (${movie.knownForDepartment})`,
                                                    url: window.location.href
                                                  });
                                                } else {
                                                  navigator.share({
                                                    title: movie.title,
                                                    text: `Check out ${movie.title} (${movie.year})`,
                                                    url: window.location.href
                                                  });
                                                }
                                              } else {
                                                if (movie.type === 'person') {
                                                  navigator.clipboard.writeText(`${movie.name} (${movie.knownForDepartment}) - ${window.location.href}`);
                                                } else {
                                                  navigator.clipboard.writeText(`${movie.title} (${movie.year}) - ${window.location.href}`);
                                                }
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              if (e && typeof e.stopPropagation === 'function') {
                                                e.stopPropagation();
                                              }
                                            }}
                                            onTouchStart={(e) => {
                                              if (e && typeof e.stopPropagation === 'function') {
                                                e.stopPropagation();
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
                                        {movie.genres?.slice(0, 2).map((genre, idx) => (
                                          <span key={idx} className="px-2 py-1 rounded-full text-xs bg-white/10 text-white/80 border border-white/10">
                                            {genre}
                                          </span>
                                        ))}
                                      </div>
                                      {/* Short overview/excerpt or known works for people */}
                                      {movie.type === 'person' ? (
                                        movie.knownFor && movie.knownFor.length > 0 && (
                                          <div className="mt-3 text-xs text-white/60">
                                            <span className="text-white/70 font-medium">Known for: </span>
                                            {movie.knownFor.map((work, idx) => (
                                              <span key={work.id}>
                                                {work.title} ({work.year || 'N/A'})
                                                {idx < movie.knownFor.length - 1 ? ', ' : ''}
                                              </span>
                                            ))}
                                          </div>
                                        )
                                      ) : (
                                        movie.overview && (
                                          <div className="mt-3 text-xs text-white/60 line-clamp-2 leading-relaxed">
                                            {movie.overview}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                                                                                        <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ 
                                  duration: 0.4,
                                  ease: "easeOut"
                                }}
                                className="text-center py-12"
                              >
                                {/* Minimal Mobile No Results Icon */}
                                <motion.div
                                  className="w-14 h-14 mx-auto mb-5"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                                >
                                  <div className="w-full h-full bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                                    </svg>
                                  </div>
                                </motion.div>
                                
                                {/* Clean Message */}
                                <motion.h3 
                                  className="text-white/80 mb-3 text-base font-medium"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                                >
                                  No results found
                                </motion.h3>
                                
                                {/* Simple Subtitle */}
                                <motion.div 
                                  className="text-white/50 mb-5 text-sm max-w-xs mx-auto"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                                >
                                  Try different keywords or check your spelling
                                </motion.div>
                                
                                {/* Minimal Tips */}
                                <motion.div 
                                  className="space-y-2 max-w-xs mx-auto"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
                                >
                                  <div className="flex items-center justify-center gap-4 text-xs text-white/40">
                                    <span>• Try synonyms</span>
                                    <span>• Check spelling</span>
                                  </div>
                                </motion.div>
                                
                                {/* Character Count Tip for Mobile */}
                                {searchQuery.length < 3 && (
                                  <motion.div 
                                    className="mt-5 text-center"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                                  >
                                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                                      <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="text-white/50 text-xs">Use at least 3 characters</span>
                                    </div>
                                  </motion.div>
                                )}
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
      

    </header>
  );
};

export default Navbar;