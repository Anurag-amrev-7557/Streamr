import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { similarContentUtils } from '../services/enhancedSimilarContentService';
import { formatRating } from '../utils/ratingUtils';
import memoryOptimizationService from '../utils/memoryOptimizationService';
import { getTmdbImageUrl } from '../utils/imageUtils.js';

// 🚀 SIMPLIFIED: Basic performance monitoring without complex overhead
const performanceOptimizer = {
  // Simplified performance mode detection
  getPerformanceMode: () => {
    // Always return high performance to avoid complex logic
    return 'high';
  },
  
  // Simplified animation settings
  getAnimationSettings: () => {
    return {
      duration: 0.2,
      staggerDelay: 0.03,
      enableComplexAnimations: true,
      enableHoverEffects: true,
      enableTransformAnimations: true
    };
  }
};

// FIXED: Simplified memory optimization utility - removed complex memory leak detector
const memoryOptimizer = {
  // FIXED: Use WeakMap for better memory management - prevents memory leaks
  cachedData: new WeakMap(),
  
  // NEW: Cache failed image URLs to prevent repeated CORS errors
  failedImageUrls: new Set(),
  
  cleanup: () => {
    try {
      // Clear any cached data
      if (similarContentUtils.clearCache) {
        similarContentUtils.clearCache();
      }
      
      // FIXED: Clear all similar content cache
      if (similarContentUtils.clearAllSimilarContentCache) {
        similarContentUtils.clearAllSimilarContentCache();
      }
      
      // FIXED: Clear WeakMap cache - this prevents memory leaks
      memoryOptimizer.cachedData = new WeakMap();
      
      // NEW: Clear failed image URLs to prevent memory buildup
      memoryOptimizer.failedImageUrls.clear();
      
      // Get memory stats from centralized manager
      const stats = memoryOptimizationService.getStats();
      if (stats && stats.current > 800) {
        console.warn(`[MemoryOptimizer] Memory usage high: ${stats.current.toFixed(2)}MB, performing cleanup`);
      }
    } catch (error) {
      console.warn('[MemoryOptimizer] Cleanup error:', error);
    }
  },
  
  monitor: () => {
    // Delegate to centralized memory manager
    const stats = memoryOptimizationService.getStats();
    if (stats && stats.current > 1000) {
      console.warn(`[MemoryOptimizer] Critical memory usage: ${stats.current.toFixed(2)}MB`);
      memoryOptimizer.cleanup();
    }
  },
  
  // FIXED: Enhanced cleanup for component unmount - prevents memory leaks
  componentCleanup: () => {
    try {
      // Clear all caches
      if (similarContentUtils.clearAllSimilarContentCache) {
        similarContentUtils.clearAllSimilarContentCache();
      }
      
      // FIXED: Clear WeakMap to prevent circular references and memory leaks
      memoryOptimizer.cachedData = new WeakMap();
      
      // NEW: Clear failed image URLs cache to prevent memory buildup
      memoryOptimizer.failedImageUrls.clear();
      
      // Force garbage collection hint - only in development
      if (import.meta.env.DEV && window.gc) {
        window.gc();
      }
    } catch (error) {
      console.warn('[MemoryOptimizer] Component cleanup error:', error);
    }
  }
};

// Custom Modern Minimalist Dropdown Component
const CustomDropdown = React.memo(({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isMountedRef = useRef(true); // FIXED: Add mounted ref for cleanup

  // FIXED: Enhanced cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Close dropdown when clicking outside - FIXED: Enhanced cleanup with useCallback
  const handleClickOutside = useCallback((event) => {
    if (isMountedRef.current && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    // Only add listener if dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        // FIXED: Always remove listener on cleanup to avoid leaks
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, handleClickOutside]);

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

// Netflix-Level Enhanced Similar Content Card with AI indicators - FIXED: Enhanced memory leak prevention
const EnhancedSimilarCard = React.memo(({ item, onClick, isMobile, showRelevanceScore = false, disableAnimations = false }) => {
  const isMountedRef = useRef(true); // FIXED: Add mounted ref for cleanup
  const imageRef = useRef(null); // FIXED: Add image ref for cleanup
  const correctSrcRef = useRef(null); // Track the correct src
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  // Always allow full animations on all devices
  const prefersReducedMotion = false;

  // FIXED: Enhanced cleanup on unmount - prevents memory leaks
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // FIXED: Clear image reference to help garbage collection
      if (imageRef.current) {
        try {
          imageRef.current.src = '';
          imageRef.current.onload = null;
          imageRef.current.onerror = null;
          imageRef.current = null;
        } catch (error) {
          // Silent cleanup error
        }
      }
      // FIXED: Clear correct src reference
      correctSrcRef.current = null;
    };
  }, []);

  // Set the correct src reference
  useEffect(() => {
    if (item.poster_path && typeof item.poster_path === 'string') {
      correctSrcRef.current = getTmdbImageUrl(item.poster_path, 'w500');
    }
  }, [item.poster_path]);

  // FIXED: Memoize computed values to prevent unnecessary recalculations
  const displayTitle = useMemo(() => item.title || item.name || 'Untitled', [item.title, item.name]);
  
  const displayYear = useMemo(() => {
    if (item.year) return item.year;
    if (item.release_date) return new Date(item.release_date).getFullYear();
    if (item.first_air_date) return new Date(item.first_air_date).getFullYear();
    return 'N/A';
  }, [item.year, item.release_date, item.first_air_date]);
  
  const relevanceColor = useMemo(() => {
    if (!item.similarityScore) return 'text-gray-400';
    if (item.similarityScore >= 0.8) return 'text-green-400';
    if (item.similarityScore >= 0.6) return 'text-yellow-400';
    if (item.similarityScore >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  }, [item.similarityScore]);

  const relevanceText = useMemo(() => {
    if (!item.similarityScore) return '';
    if (item.similarityScore >= 0.8) return 'Perfect Match';
    if (item.similarityScore >= 0.6) return 'Great Match';
    if (item.similarityScore >= 0.4) return 'Good Match';
    return 'Decent Match';
  }, [item.similarityScore]);

  // 🚀 SIMPLIFIED: Basic animation variants without complex performance checks
  const cardVariants = useMemo(() => {
    if (disableAnimations) return undefined;
    
    // Simple, consistent variants for better performance
    return {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      hover: { scale: isMobile ? 1.02 : 1.01 },
      tap: { scale: 0.98 }
    };
  }, [isMobile, disableAnimations]);

  // FIXED: Optimized click handler with useCallback
  const handleClick = useCallback(async () => {
    if (isMountedRef.current && onClick) {
      try {
        setIsOpening(true);
        const maybe = onClick(item);
        if (maybe && typeof maybe.then === 'function') {
          await maybe;
        }
      } finally {
        if (isMountedRef.current) setIsOpening(false);
      }
    }
  }, [onClick, item]);

  // FIXED: Enhanced image error handler with cleanup
  const handleImageError = useCallback((e) => {
    if (isMountedRef.current && e.target) {
      // Cache failed image URL to prevent repeated attempts
      if (e.target.src && e.target.src.includes('image.tmdb.org')) {
        memoryOptimizer.failedImageUrls.add(e.target.src);
        if (import.meta.env.DEV) {
          console.warn(`Cached failed image URL: ${e.target.src}`);
        }
      }
      
      // Only log in development and if it's not a localhost issue
      if (import.meta.env.DEV && !e.target.src.includes('localhost')) {
        console.warn('Similar content image failed to load:', {
          src: e.target.src,
          poster_path: item.poster_path,
          title: displayTitle,
          expectedSrc: getTmdbImageUrl(item.poster_path, 'w500')
        });
      }
      
      // Don't try fallback if src has been changed to localhost (likely by another component)
      if (e.target.src.includes('localhost')) {
        if (import.meta.env.DEV) {
          console.warn('Image src was changed to localhost, resetting to correct URL');
        }
        if (correctSrcRef.current) {
          e.target.src = correctSrcRef.current;
        }
        return;
      }
      
      // Try fallback URL if this was a CORS error
      if (e.target.src.includes('image.tmdb.org') && !e.target.dataset.fallbackTried && correctSrcRef.current) {
        e.target.dataset.fallbackTried = 'true';
        e.target.src = correctSrcRef.current;
        return;
      }
      
      setImageError(true);
      setImageLoaded(false);
      e.target.style.display = 'none';
      // Show fallback content
      const fallback = e.target.parentNode.querySelector('.image-fallback');
      if (fallback) {
        fallback.style.display = 'flex';
        fallback.classList.remove('hidden');
      }
    }
  }, [item.poster_path, displayTitle]);

  // FIXED: Enhanced image load handler with cleanup
  const handleImageLoad = useCallback((e) => {
    if (isMountedRef.current && e.target) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.log('Similar content image loaded successfully:', {
          src: e.target.src,
          poster_path: item.poster_path,
          title: displayTitle
        });
      }
      setImageLoaded(true);
      setImageError(false);
      // Hide fallback when image loads successfully
      const fallback = e.target.parentNode.querySelector('.image-fallback');
      if (fallback) {
        fallback.style.display = 'none';
        fallback.classList.add('hidden');
      }
    }
  }, [item.poster_path, displayTitle]);



  return (
    <motion.div 
      className="group cursor-pointer relative"
      onClick={handleClick}
      variants={cardVariants}
      initial={cardVariants ? 'initial' : undefined}
      animate={cardVariants ? 'animate' : undefined}
      exit={cardVariants ? 'exit' : undefined}
      whileHover={cardVariants ? 'hover' : undefined}
      whileTap={cardVariants ? 'tap' : undefined}
      transition={cardVariants ? { 
        type: 'spring', 
        stiffness: 300, 
        damping: 20, 
        duration: performanceOptimizer.getAnimationSettings().duration 
      } : undefined}
      layout={performanceOptimizer.getAnimationSettings().enableComplexAnimations}
    >
      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 relative shadow-lg border border-white/5 hover:border-white/10 transition-all duration-300">
        {item.poster_path && typeof item.poster_path === 'string' && item.poster_path.startsWith('/') ? (
          <img 
            key={`${item.id}-${item.poster_path}`}
            ref={imageRef}
            src={getTmdbImageUrl(item.poster_path, 'w500')} 
            alt={displayTitle} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            sizes={isMobile ? '50vw' : '20vw'}
            style={{
              willChange: 'auto',
              backfaceVisibility: 'hidden',
              contain: 'layout style paint'
            }}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : null}
        
        {/* FIXED: Always show fallback, but hide when image loads */}
        <div className={`w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-700 to-gray-800 image-fallback ${(item.poster_path && typeof item.poster_path === 'string' && item.poster_path.startsWith('/') && imageLoaded && !imageError) ? 'hidden' : ''}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        
        {/* Relevance Score Badge */}
        {showRelevanceScore && item.similarityScore && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold bg-black/80 backdrop-blur-sm border border-white/20 ${relevanceColor}`}>
            {Math.round(item.similarityScore * 100)}%
          </div>
        )}
        
        {/* Rating Badge */}
        {item.vote_average && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold bg-black/80 backdrop-blur-sm text-white border border-white/20">
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
              {formatRating(item.vote_average)}
            </div>
          </div>
        )}
        
        {/* Hover Overlay - Desktop Only */}
        {!isMobile && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
              <h4 className="font-semibold text-white text-sm truncate">{displayTitle}</h4>
              <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                <span>{displayYear}</span>
                {item.genres && item.genres.length > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/50"></span>
                    <span className="truncate">{item.genres[0]?.name || item.genres[0]}</span>
                  </>
                )}
              </div>
              {showRelevanceScore && item.similarityScore && (
                <div className={`text-xs mt-1 ${relevanceColor}`}>
                  {relevanceText}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Mobile Info Overlay */}
        {isMobile && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
            <div className="text-center">
              <h4 className="font-semibold text-white text-xs truncate mb-1">{displayTitle}</h4>
              <div className="flex items-center justify-center gap-1 text-xs text-white/70">
                <span>{displayYear}</span>
                {item.vote_average && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/50"></span>
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                      {formatRating(item.vote_average)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Click Loader Overlay or Play Button */}
        {isOpening ? (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
            <div className="spinner"></div>
            <style>{`
              .spinner { --size: 18px; --first-block-clr: rgba(255,255,255, 0.8); --second-block-clr: rgba(255,255,255, 0.8); --clr: #111; width: 48px; height: 48px; position: relative; }
              .spinner::after,.spinner::before { box-sizing: border-box; position: absolute; content: ""; width: 18px; height: 20px; top: 50%; animation: up 2.4s cubic-bezier(0,0,0.24,1.21) infinite; left: 50%; background: var(--first-block-clr); backdrop-filter: blur(10px); }
              .spinner::after { background: var(--second-block-clr); top: calc(50% - var(--size)); left: calc(50% - var(--size)); animation: down 2.4s cubic-bezier(0,0,0.24,1.21) infinite; backdrop-filter: blur(10px); }
              @keyframes down { 0%,100% { transform: none; } 25% { transform: translateX(80%);} 50% { transform: translateX(80%) translateY(80%);} 75% { transform: translateY(80%);} }
              @keyframes up { 0%,100% { transform: none; } 25% { transform: translateX(-90%);} 50% { transform: translateX(-90%) translateY(-90%);} 75% { transform: translateY(-90%);} }
            `}</style>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <motion.div 
              className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30`}
              whileHover={performanceOptimizer.getAnimationSettings().enableHoverEffects ? { scale: 1.1 } : undefined}
              transition={{ duration: performanceOptimizer.getAnimationSettings().duration }}
            >
              <svg className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// Enhanced Filter Component with more options - FIXED: Optimized state management and animations
const SimilarContentFilters = React.memo(({ filters, onFilterChange, isMobile = false }) => {
  const [showFilters, setShowFilters] = useState(false);
  
  // FIXED: Memoize filter options to prevent unnecessary re-renders
  const relevanceOptions = useMemo(() => [
    { value: 0, label: 'All' },
    { value: 0.3, label: 'Somewhat Similar' },
    { value: 0.5, label: 'Similar' },
    { value: 0.7, label: 'Very Similar' },
    { value: 0.8, label: 'Highly Similar' }
  ], []);

  const sortOptions = useMemo(() => [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'year', label: 'Newest First' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'title', label: 'Alphabetical' }
  ], []);

  const yearOptions = useMemo(() => [
    { value: 0, label: 'All Years' },
    { value: 2024, label: '2024' },
    { value: 2023, label: '2023' },
    { value: 2022, label: '2022' },
    { value: 2021, label: '2021' },
    { value: 2020, label: '2020' },
    { value: 2019, label: '2019' },
    { value: 2018, label: '2018' }
  ], []);

  // FIXED: Optimized animation variants
  const filterPanelVariants = useMemo(() => ({
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' },
    exit: { opacity: 0, height: 0 }
  }), []);

  // FIXED: Optimized event handlers with useCallback
  const handleFilterChange = useCallback((filterName, value) => {
    onFilterChange(filterName, value);
  }, [onFilterChange]);

  const handleResetFilters = useCallback(() => {
    onFilterChange('minRelevance', 0);
    onFilterChange('sortBy', 'relevance');
    onFilterChange('showRelevanceScore', false);
    onFilterChange('year', 0);
  }, [onFilterChange]);

  const handleToggleRelevanceScore = useCallback(() => {
    onFilterChange('showRelevanceScore', !filters.showRelevanceScore);
  }, [onFilterChange, filters.showRelevanceScore]);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  // Mobile filter interface
  if (isMobile) {
    return (
      <div className="mb-4">
        {/* Mobile Filter Toggle Button */}
        <button
          onClick={handleToggleFilters}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white/90 hover:bg-white/15 transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            <span className="text-sm font-medium">Filters & Sort</span>
          </div>
          <motion.svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            animate={{ rotate: showFilters ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>

        {/* Mobile Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              variants={filterPanelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-3"
            >
              {/* Relevance Filter */}
              <div className="bg-white/5 rounded-lg p-3">
                <label className="block text-sm font-medium text-white/80 mb-2">Relevance</label>
                <CustomDropdown
                  options={relevanceOptions}
                  value={filters.minRelevance}
                  onChange={(value) => handleFilterChange('minRelevance', value)}
                  placeholder="Select relevance"
                  className="w-full"
                />
              </div>

              {/* Sort Options */}
              <div className="bg-white/5 rounded-lg p-3">
                <label className="block text-sm font-medium text-white/80 mb-2">Sort by</label>
                <CustomDropdown
                  options={sortOptions}
                  value={filters.sortBy}
                  onChange={(value) => handleFilterChange('sortBy', value)}
                  placeholder="Select sort"
                  className="w-full"
                />
              </div>

              {/* Year Filter */}
              <div className="bg-white/5 rounded-lg p-3">
                <label className="block text-sm font-medium text-white/80 mb-2">Year</label>
                <CustomDropdown
                  options={yearOptions}
                  value={filters.year}
                  onChange={(value) => handleFilterChange('year', value)}
                  placeholder="Select year"
                  className="w-full"
                />
              </div>

              {/* Show Relevance Score Toggle */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white/80">Show relevance scores</label>
                  <button
                    onClick={handleToggleRelevanceScore}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      filters.showRelevanceScore ? 'bg-primary' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        filters.showRelevanceScore ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleResetFilters}
                  className="flex-1 px-3 py-2 text-xs font-medium text-white/70 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-white bg-primary/5 border border-primary/10 rounded-full hover:bg-primary/30 transition-colors"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop filter interface
  return (
    <div className="flex items-center gap-4">
      {/* Relevance Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/60 font-medium">Relevance</label>
        <CustomDropdown
          options={relevanceOptions}
          value={filters.minRelevance}
          onChange={(value) => handleFilterChange('minRelevance', value)}
          placeholder="Select relevance"
        />
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/60 font-medium">Sort</label>
        <CustomDropdown
          options={sortOptions}
          value={filters.sortBy}
          onChange={(value) => handleFilterChange('sortBy', value)}
          placeholder="Select sort"
        />
      </div>

      {/* Year Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/60 font-medium">Year</label>
        <CustomDropdown
          options={yearOptions}
          value={filters.year}
          onChange={(value) => handleFilterChange('year', value)}
          placeholder="Select year"
        />
      </div>

      {/* Show Relevance Score Toggle */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/60 font-medium">Scores</label>
        <button
          type="button"
          aria-pressed={filters.showRelevanceScore}
          onClick={handleToggleRelevanceScore}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${filters.showRelevanceScore ? 'bg-primary/80' : 'bg-white/20'}`}
          tabIndex={0}
        >
          <span
            className={`absolute top-0 left-0 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${filters.showRelevanceScore ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>
    </div>
  );
});



// Main Enhanced Similar Content Component - FIXED: Optimized memory management and animations
const EnhancedSimilarContent = React.memo(({ 
  contentId, 
  contentType = 'movie', 
  onItemClick, 
  isMobile = false,
  maxItems = 16, // Reduced from 24 to 16 for better memory management
  showFilters = true,
  showTitle = true,
  showPagination = false, // Changed to false by default
  showLoadMore = true,
  className = ""
}) => {
  const [similarContent, setSimilarContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayedItems, setDisplayedItems] = useState(12); // Reduced from 16 to 12 for better performance
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  // Always allow full animations on all devices
  const prefersReducedMotion = false;
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState({
    minRelevance: 0,
    sortBy: 'relevance',
    showRelevanceScore: false,
    year: 0
  });

  // Defer filters to reduce synchronous render cost when changing controls
  const deferredFilters = useDeferredValue(filters);

  // FIXED: Enhanced abort controller and request tracking with proper cleanup
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const currentRequestsRef = useRef(new Set()); // FIXED: Use ref instead of function property
  const timeoutRef = useRef(null); // FIXED: Add timeout ref for cleanup
  const requestIdRef = useRef(0); // Prevent race conditions across async requests

  // FIXED: Enhanced cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // FIXED: Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // FIXED: Clear debounced load more timer
      if (debouncedLoadMore.current) {
        clearTimeout(debouncedLoadMore.current);
        debouncedLoadMore.current = null;
      }
      
      // FIXED: Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // FIXED: Clear all tracked requests
      currentRequestsRef.current.clear();
      

    };
  }, []);

  // FIXED: Fetch similar content with infinite loop prevention and proper cleanup
  const fetchSimilarContent = useCallback(async (page = 1, append = false) => {
    const requestId = ++requestIdRef.current;
    if (!contentId || !isMountedRef.current) return;
    
    // FIXED: Prevent duplicate requests for the same page
    const requestKey = `${contentId}-${contentType}-${page}`;
    if (currentRequestsRef.current.has(requestKey)) {
      return;
    }
    
    // FIXED: Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // FIXED: Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // FIXED: Track current request using ref
    currentRequestsRef.current.add(requestKey);
    
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const results = await similarContentUtils.getSimilarContent(contentId, contentType, {
        limit: 50, // FIXED: Reduced from 100 to 50 for better memory management
        minScore: 0.3, // FIXED: Increased threshold for better relevance and reduced data
        forceRefresh: false,
        page: page,
        infiniteLoading: page > 1, // Only enable infinite loading for subsequent pages
        // Pass abort signal to enable proper cancellation of in-flight network requests
        signal: abortControllerRef.current ? abortControllerRef.current.signal : undefined
      });
      
      // FIXED: Check if component is still mounted, request current, and not cancelled
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      
      // FIXED: Check if the request was aborted and handle gracefully
      if (abortControllerRef.current?.signal.aborted) {
        console.debug('Request was aborted, skipping results processing');
        return;
      }
      
      if (results && Array.isArray(results)) {
        if (append) {
          setSimilarContent(prev => {
            // Enhanced duplicate handling with smart strategy
            const combined = [...prev, ...results];
            
            // Use the service's enhanced duplicate removal
            const uniqueItems = similarContentUtils.removeDuplicates ? 
              similarContentUtils.removeDuplicates(combined, {
                strategy: 'smart',
                keepBestScore: true,
                preserveOrder: false
              }) : 
              // Fallback to basic duplicate removal
              combined.filter((item, index, self) => 
                index === self.findIndex(t => t.id === item.id)
              );
            
            // Limit total items to prevent memory issues
            return uniqueItems.slice(0, maxItems);
          });
        } else {
          // For initial load, also apply duplicate removal
          const uniqueResults = similarContentUtils.removeDuplicates ? 
            similarContentUtils.removeDuplicates(results, {
              strategy: 'smart',
              keepBestScore: true,
              preserveOrder: false
            }) : 
            results;
          
          setSimilarContent(uniqueResults.slice(0, maxItems));
        }
        
        setHasMore(results.length >= 10); // FIXED: Reduced threshold for better performance
      } else {
        setSimilarContent([]);
        setHasMore(false);
      }
    } catch (error) {
      // FIXED: Handle AbortError gracefully without logging it as an error
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.debug('Request was aborted:', error.message);
        return;
      }
      
      // FIXED: Check if component is still mounted and request current before setting error state
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      
      console.error('Error fetching similar content:', error);
      setError('Failed to load similar content');
      setHasMore(false);
    } finally {
      // FIXED: Remove request from tracking using ref
      currentRequestsRef.current.delete(requestKey);
      
      // FIXED: Only update state if component is still mounted
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [contentId, contentType, maxItems]); // FIXED: Added maxItems back but with proper dependency management

  // Filter and sort content - FIXED: Optimized with useMemo and performance improvements
  const filteredContent = useMemo(() => {
    // FIXED: Early return for empty content to prevent unnecessary processing
    if (!similarContent.length) return [];
    
    // FIXED: Use more efficient filtering with early returns
    let filtered = similarContent.filter(item => {
      // Relevance filter - early return for better performance
      if (deferredFilters.minRelevance && (!item.similarityScore || item.similarityScore < deferredFilters.minRelevance)) {
        return false;
      }
      
      // Year filter - early return for better performance
      if (deferredFilters.year > 0) {
        const itemYear = item.year || 
          (item.release_date ? new Date(item.release_date).getFullYear() : 
           item.first_air_date ? new Date(item.first_air_date).getFullYear() : 0);
        if (itemYear !== deferredFilters.year) {
          return false;
        }
      }
      
      return true;
    });

    // FIXED: Only sort if there are items to sort
    if (filtered.length > 1) {
      // FIXED: Use more efficient sorting with cached values
      switch (deferredFilters.sortBy) {
        case 'rating':
          filtered.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
          break;
        case 'year':
          filtered.sort((a, b) => {
            const yearA = a.year || new Date(a.release_date || a.first_air_date).getFullYear();
            const yearB = b.year || new Date(b.release_date || b.first_air_date).getFullYear();
            return yearB - yearA;
          });
          break;
        case 'popularity':
          filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          break;
        case 'title':
          filtered.sort((a, b) => {
            const titleA = (a.title || a.name || '').toLowerCase();
            const titleB = (b.title || b.name || '').toLowerCase();
            return titleA.localeCompare(titleB);
          });
          break;
        case 'relevance':
        default:
          filtered.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
          break;
      }
    }

    return filtered;
  }, [similarContent, deferredFilters]);

  // Get content to display (first N items) - FIXED: Optimized with useMemo and memory limits
  const displayedContent = useMemo(() => {
    // FIXED: Limit the maximum number of items to prevent memory issues
    const maxDisplayItems = Math.min(displayedItems, 24); // Hard limit of 24 items
    return filteredContent.slice(0, maxDisplayItems);
  }, [filteredContent, displayedItems]);

  // Handle filter changes - FIXED: Optimized with useCallback
  const handleFilterChange = useCallback((filterName, value) => {
    // Small enhancement: cancel stale work when filters change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debouncedLoadMore.current) {
      clearTimeout(debouncedLoadMore.current);
      debouncedLoadMore.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    currentRequestsRef.current.clear();

    startTransition(() => {
      setFilters(prev => ({ ...prev, [filterName]: value }));
      setDisplayedItems(12); // Align with initial displayed count to avoid jumps
      setCurrentPage(1); // Reset page when filters change
    });
  }, []);

  // FIXED: Debounced load more function to prevent rapid successive calls - MEMORY LEAK FIX
  const debouncedLoadMore = useRef(null);

  // FIXED: Handle load more without infinite loops and proper cleanup
  const handleLoadMore = useCallback(async () => {
    if (document.hidden) {
      return;
    }
    if (hasMore && !loading && !loadingMore && isMountedRef.current) {
      // FIXED: Clear any existing debounce timer
      if (debouncedLoadMore.current) {
        clearTimeout(debouncedLoadMore.current);
        debouncedLoadMore.current = null;
      }
      
      // FIXED: Debounce the load more operation with proper cleanup
      debouncedLoadMore.current = setTimeout(async () => {
        // FIXED: Check if component is still mounted before proceeding
        if (!isMountedRef.current) {
          debouncedLoadMore.current = null;
          return;
        }
        
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        
        try {
          // FIXED: Check memory before loading more - only in development
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
            memoryOptimizer.monitor();
          }
          
          // Fetch more content from the next page - call directly to avoid dependency issues
          if (contentId && contentType) {
            // Inline the fetchSimilarContent logic to avoid function dependency
            const requestKey = `${contentId}-${contentType}-${nextPage}`;
            if (!currentRequestsRef.current.has(requestKey)) {
              // Create new abort controller
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              abortControllerRef.current = new AbortController();
              
              // Track current request
              currentRequestsRef.current.add(requestKey);
              setLoadingMore(true);
              
              try {
                const results = await similarContentUtils.getSimilarContent(contentId, contentType, {
                  limit: 50,
                  minScore: 0.3,
                  forceRefresh: false,
                  page: nextPage,
                  infiniteLoading: true,
                  signal: abortControllerRef.current.signal
                });
                
                if (!isMountedRef.current || abortControllerRef.current.signal.aborted) {
                  return;
                }
                
                if (results && Array.isArray(results)) {
                  setSimilarContent(prev => {
                    const combined = [...prev, ...results];
                    const uniqueItems = similarContentUtils.removeDuplicates ? 
                      similarContentUtils.removeDuplicates(combined, {
                        strategy: 'smart',
                        keepBestScore: true,
                        preserveOrder: false
                      }) : 
                      combined.filter((item, index, self) => 
                        index === self.findIndex(t => t.id === item.id)
                      );
                    return uniqueItems.slice(0, maxItems);
                  });
                  setHasMore(results.length >= 10);
                } else {
                  setHasMore(false);
                }
              } catch (error) {
                if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                  console.debug('Request was aborted:', error.message);
                  return;
                }
                console.error('Error loading more content:', error);
                if (isMountedRef.current) {
                  setCurrentPage(prev => prev - 1);
                }
              } finally {
                // FIXED: Always clean up request tracking to prevent memory leaks
                currentRequestsRef.current.delete(requestKey);
                
                if (isMountedRef.current) {
                  setLoadingMore(false);
                }
              }
            }
          }
          
          // FIXED: Limit displayed items to prevent memory issues
          if (isMountedRef.current) {
            setDisplayedItems(prev => {
              const newCount = Math.min(prev + 6, maxItems);
              return newCount;
            });
          }
        } catch (error) {
          // Reset page on error
          if (isMountedRef.current) {
            setCurrentPage(prev => prev - 1);
          }
          console.error('Error loading more content:', error);
        } finally {
          // FIXED: Clear the timeout reference after completion
          if (debouncedLoadMore.current) {
            debouncedLoadMore.current = null;
          }
        }
      }, 300); // FIXED: 300ms debounce delay
    }
  }, [hasMore, loading, loadingMore, currentPage, contentId, contentType, maxItems]); // FIXED: Removed fetchSimilarContent dependency to prevent infinite loops

  // Handle item click - FIXED: Optimized with useCallback
  const handleItemClick = useCallback((item) => {
    if (onItemClick) {
      onItemClick(item);
    }
  }, [onItemClick]);

  // 🚀 PERFORMANCE OPTIMIZED: Basic container animation variants with reduced complexity
  const containerVariants = useMemo(() => {
    return { 
      initial: { opacity: 0, y: 3 }, // FIXED: Further reduced for better performance
      animate: { opacity: 1, y: 0 }, 
      exit: { opacity: 0, y: -3 } // FIXED: Further reduced for better performance
    };
  }, []);

  const gridVariants = useMemo(() => {
    return { 
      initial: { opacity: 0 }, 
      animate: { opacity: 1 }, 
      exit: { opacity: 0 } 
    };
  }, []);

  const itemVariants = useMemo(() => {
    // 🚀 FIXED: Consistent animation variants for better performance
    return { 
      initial: { opacity: 0, y: 3 }, // FIXED: Further reduced for better performance
      animate: { opacity: 1, y: 0 }, 
      exit: { opacity: 0, y: -3 } // FIXED: Further reduced for better performance
    };
  }, []);

  // 🚀 PERFORMANCE OPTIMIZED: Basic stagger variants with faster rendering
  const staggerContainerVariants = useMemo(() => {
    return { 
      initial: { opacity: 0 }, 
      animate: { 
        opacity: 1, 
        transition: { 
          staggerChildren: 0.01, // FIXED: Further reduced for faster rendering
          delayChildren: 0.02 // FIXED: Further reduced for faster rendering
        } 
      } 
    };
  }, []);

  const staggerItemVariants = useMemo(() => {
    return { 
      initial: { opacity: 0, y: 3 }, // 🚀 FIXED: Consistent with other variants
      animate: { 
        opacity: 1, y: 0, 
        transition: { 
          type: 'spring', 
          stiffness: 150, // FIXED: Reduced stiffness for smoother animation
          damping: 25, // FIXED: Increased damping for better performance
          duration: 0.15 // FIXED: Reduced duration for faster animation
        } 
      } 
    };
  }, []);

  // FIXED: Fetch content on mount and when contentId/contentType changes with infinite loop prevention
  useEffect(() => {
    // FIXED: Clear any existing requests
    currentRequestsRef.current.clear();
    
    // Clear previous content when switching to a new movie/show
    setSimilarContent([]);
    setDisplayedItems(12); // FIXED: Reduced from 16 to 12 for better performance
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    
    if (contentId && isMountedRef.current) {
      const initRequestId = ++requestIdRef.current;
      // 🚀 NEW: Check for preloaded data first for instant loading
      if (window.similarContentCache) {
        const preloadedData = window.similarContentCache.get(`${contentId}-${contentType}`);
        if (preloadedData && preloadedData.prefetched && preloadedData.data) {
          // Use preloaded data immediately
          setSimilarContent(preloadedData.data);
          setDisplayedItems(Math.min(preloadedData.data.length, 12));
          setLoading(false);
          setError(null);
          
          if (import.meta.env.DEV) {
            console.log(`🚀 Using preloaded data for ${contentId}: ${preloadedData.data.length} items`);
          }
          
          // Clear from cache to prevent memory leaks
          window.similarContentCache.delete(`${contentId}-${contentType}`);
          return; // Skip API call since we have preloaded data
        }
      }
      
      // FIXED: Use ref for timeout to ensure proper cleanup
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && initRequestId === requestIdRef.current) {
          // Inline the fetchSimilarContent logic to avoid function dependency issues
          const requestKey = `${contentId}-${contentType}-1`;
          if (!currentRequestsRef.current.has(requestKey)) {
            // Create new abort controller
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();
            
            // Track current request
            currentRequestsRef.current.add(requestKey);
            setLoading(true);
            setError(null);
            
            similarContentUtils.getSimilarContent(contentId, contentType, {
              limit: 50,
              minScore: 0.3,
              forceRefresh: false,
              page: 1,
              infiniteLoading: false,
              signal: abortControllerRef.current.signal
            }).then(results => {
              if (!isMountedRef.current || initRequestId !== requestIdRef.current || abortControllerRef.current.signal.aborted) {
                return;
              }
              
              if (results && Array.isArray(results)) {
                const uniqueResults = similarContentUtils.removeDuplicates ? 
                  similarContentUtils.removeDuplicates(results, {
                    strategy: 'smart',
                    keepBestScore: true,
                    preserveOrder: false
                  }) : 
                  results;
                
                setSimilarContent(uniqueResults.slice(0, maxItems));
                setHasMore(results.length >= 10);
              } else {
                setSimilarContent([]);
                setHasMore(false);
              }
            }).catch(error => {
              if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                console.debug('Request was aborted:', error.message);
                return;
              }
              console.error('Error fetching similar content:', error);
              if (isMountedRef.current && initRequestId === requestIdRef.current) {
                setError('Failed to load similar content');
              }
            }).finally(() => {
              if (isMountedRef.current && initRequestId === requestIdRef.current) {
                setLoading(false);
              }
              currentRequestsRef.current.delete(requestKey);
            });
          }
        }
      }, 100);
    }

    // FIXED: Enhanced cleanup function with comprehensive memory management
    return () => {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // FIXED: Clear debounced load more timer
      if (debouncedLoadMore.current) {
        clearTimeout(debouncedLoadMore.current);
        debouncedLoadMore.current = null;
      }
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clear request tracking
      currentRequestsRef.current.clear();
      
      // FIXED: Only clear state if component is still mounted to prevent memory leaks
      if (isMountedRef.current) {
        setSimilarContent([]);
        setLoading(false);
        setLoadingMore(false);
        setError(null);
      }
    };
  }, [contentId, contentType, maxItems]); // FIXED: Added maxItems dependency but with proper management

  // Update hasMore when filtered content changes - FIXED: Optimized with useMemo and memory checks
  useEffect(() => {
    // FIXED: Check memory usage before allowing more content - only in development
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true' && performance.memory) {
      const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      if (memoryMB > 800) {
        // If memory usage is high, limit the content
        setHasMore(false);
        return;
      }
    }
    
    setHasMore(displayedItems < filteredContent.length || (hasMore && similarContent.length > 0));
  }, [filteredContent.length, displayedItems, hasMore, similarContent.length]);

  // FIXED: Optimized performance monitoring with reduced logging and better memory management
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
      const startTime = performance.now();
      let isActive = true;
      
      return () => {
        if (!isActive || !isMountedRef.current) return;
        isActive = false;
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // FIXED: Only log if render takes too long and component is still mounted
        if (duration > 1000) {
          console.warn(`[EnhancedSimilarContent] Component took ${duration.toFixed(2)}ms to render`);
        }
        
        // FIXED: Only log memory usage if it's significantly high and component is still active
        if (performance.memory && isMountedRef.current) {
          const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          if (memoryMB > 500) { // Only log if memory usage is over 500MB
            console.warn(`[EnhancedSimilarContent] High memory usage: ${memoryMB.toFixed(2)}MB`);
          }
        }
      };
    }
  }, []); // FIXED: Removed dependencies to prevent excessive re-runs

  // FIXED: Performance-based cleanup and memory management with enhanced global cache management
  useEffect(() => {
    // FIXED: Initialize global cache for preloaded data if it doesn't exist
    if (!window.similarContentCache) {
      window.similarContentCache = new Map();
      
      if (import.meta.env.DEV) {
        console.log('🚀 Initialized global similar content cache for preloading');
      }
    }
    
    // FIXED: Add cache size limit to prevent memory leaks
    const MAX_CACHE_SIZE = 20; // FIXED: Further reduced from 30 to 20 for better memory management
    if (window.similarContentCache.size > MAX_CACHE_SIZE) {
      // FIXED: Use more efficient cache cleanup to prevent memory leaks
      const entries = Array.from(window.similarContentCache.entries());
      const entriesToRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
      
      // FIXED: Clear entries and their data to prevent memory leaks
      entriesToRemove.forEach(([key, value]) => {
        if (value && value.data) {
          // Clear the data arrays to help garbage collection
          value.data = null;
        }
        window.similarContentCache.delete(key);
      });
      
      if (import.meta.env.DEV) {
        console.log(`🧹 Cleared ${entriesToRemove.length} old cache entries to prevent memory leaks`);
      }
      
      // FIXED: Force garbage collection hint in development
      if (import.meta.env.DEV && window.gc) {
        window.gc();
      }
    }
    
    // Register cleanup callback with memory manager
    const unregisterCleanup = memoryOptimizationService.registerCleanupCallback(() => {
      if (isMountedRef.current) {
        memoryOptimizer.cleanup();
      }
    }, 'EnhancedSimilarContent');
    
    return () => {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true') {
        console.log('[EnhancedSimilarContent] Component unmounted, cleaning up...');
      }
      
      // Unregister cleanup callback
      unregisterCleanup();
      
      // Enhanced cleanup with garbage collection hint
      memoryOptimizer.componentCleanup();
      
      // Clear failed image URLs cache on unmount
      memoryOptimizer.failedImageUrls.clear();
      
      // FIXED: Clear global cache entries for this component to prevent memory leaks
      if (window.similarContentCache && contentId && contentType) {
        const cacheKey = `${contentId}-${contentType}`;
        if (window.similarContentCache.has(cacheKey)) {
          window.similarContentCache.delete(cacheKey);
          if (import.meta.env.DEV) {
            console.log(`🧹 Cleared cache entry for ${cacheKey} on unmount`);
          }
        }
      }
      
      // FIXED: Clear all timers and intervals
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (debouncedLoadMore.current) {
        clearTimeout(debouncedLoadMore.current);
        debouncedLoadMore.current = null;
      }
      
      // FIXED: Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clear request tracking
      currentRequestsRef.current.clear();
      
      // Only clear state if component is still mounted to prevent memory leaks
      if (isMountedRef.current) {
        setSimilarContent([]);
        setLoading(false);
        setLoadingMore(false);
        setError(null);
      }
    };
  }, [contentId, contentType]); // FIXED: Minimal dependencies to prevent infinite loops

  // 🚀 ULTRA-SMOOTH: Performance-based visibility management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Abort any in-flight request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        // Clear pending timers
        if (debouncedLoadMore.current) {
          clearTimeout(debouncedLoadMore.current);
          debouncedLoadMore.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        // No-op; do not mutate perf flags to avoid leaks or globals drift
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Pixel-Perfect Loading Skeleton - Enhanced with detailed structure
  if (loading) {
    return (
      <motion.div 
        className={`${className}`}
        variants={containerVariants}
        initial={containerVariants ? 'initial' : undefined}
        animate={containerVariants ? 'animate' : undefined}
        exit={containerVariants ? 'exit' : undefined}
        transition={{ duration: 0.5 }}
      >
        {showTitle && (
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
                         {/* Desktop: Heading and filters skeleton */}
             <div className="hidden lg:flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <div className="w-5 h-5 bg-gradient-to-br from-primary/30 to-primary/20 rounded animate-skeleton-shimmer" />
                 <div className="h-8 w-48 bg-gradient-to-br from-white/20 to-white/10 rounded animate-skeleton-shimmer" />
               </div>
               <div className="h-4 w-32 bg-gradient-to-br from-white/10 to-white/5 rounded animate-skeleton-shimmer" />
             </div>
             
             {/* Mobile: Stacked layout skeleton */}
             <div className="lg:hidden">
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-5 h-5 bg-gradient-to-br from-primary/30 to-primary/20 rounded animate-skeleton-shimmer" />
                 <div className="h-6 w-40 bg-gradient-to-br from-white/20 to-white/10 rounded animate-skeleton-shimmer" />
               </div>
               <div className="h-4 w-48 bg-gradient-to-br from-white/10 to-white/5 rounded animate-skeleton-shimmer mb-4" />
             </div>
          </motion.div>
        )}

        {/* Mobile filters skeleton */}
        {showFilters && isMobile && (
          <div className="mb-4">
            <div className="w-full h-12 bg-gradient-to-br from-white/10 to-white/5 rounded-lg border border-white/20 animate-skeleton-shimmer" />
          </div>
        )}

        {/* FIXED: Optimized Grid Skeleton for better performance */}
        <motion.div 
          className={`grid gap-4 ${
            isMobile 
              ? 'grid-cols-2 gap-3'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4'
          }`}
          variants={gridVariants}
          initial="initial"
          animate="animate"
        >
          {Array.from({ length: isMobile ? 6 : 12 }).map((_, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              transition={{ 
                duration: 0.15, // FIXED: Reduced duration for better performance
                delay: Math.min(i * 0.02, 0.2), // FIXED: Reduced delay and capped for better performance
                type: 'spring', 
                stiffness: 150, // FIXED: Reduced stiffness for smoother animation
                damping: 25 // FIXED: Increased damping for better performance
              }}
              className="group cursor-pointer relative"
            >
              {/* Enhanced Movie Card Skeleton */}
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 relative shadow-lg border border-white/10">
                {/* Poster Skeleton with enhanced shimmer effect */}
                <div className="w-full h-full relative overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 animate-skeleton-shimmer" />
                </div>
                
                {/* Top badges skeleton */}
                <div className="absolute top-2 left-2">
                  <div className="w-8 h-5 bg-gradient-to-br from-black/60 to-black/40 rounded-full animate-skeleton-shimmer" />
                </div>
                <div className="absolute top-2 right-2">
                  <div className="w-12 h-5 bg-gradient-to-br from-black/60 to-black/40 rounded-full animate-skeleton-shimmer" />
                </div>
                
                                 {/* Bottom info skeleton - Desktop only */}
                 {!isMobile && (
                   <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                     <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                       <div className="h-4 w-3/4 bg-gradient-to-br from-white/20 to-white/10 rounded animate-skeleton-shimmer mb-2" />
                       <div className="flex items-center gap-2">
                         <div className="h-3 w-8 bg-gradient-to-br from-white/15 to-white/8 rounded animate-skeleton-shimmer" />
                         <div className="w-1 h-1 rounded-full bg-white/30" />
                         <div className="h-3 w-16 bg-gradient-to-br from-white/15 to-white/8 rounded animate-skeleton-shimmer" />
                       </div>
                     </div>
                   </div>
                 )}
                
                                 {/* Mobile info skeleton */}
                 {isMobile && (
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
                     <div className="text-center">
                       <div className="h-3 w-3/4 bg-gradient-to-br from-white/20 to-white/10 rounded animate-skeleton-shimmer mb-1 mx-auto" />
                       <div className="flex items-center justify-center gap-1">
                         <div className="h-3 w-6 bg-gradient-to-br from-white/15 to-white/8 rounded animate-skeleton-shimmer" />
                         <div className="w-1 h-1 rounded-full bg-white/30" />
                         <div className="h-3 w-8 bg-gradient-to-br from-white/15 to-white/8 rounded animate-skeleton-shimmer" />
                       </div>
                     </div>
                   </div>
                 )}
                
                                 {/* Play button skeleton */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-full animate-skeleton-shimmer border border-white/30" />
                 </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Loading indicator */}
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-3 text-white/60">
            <svg className="w-5 h-5 text-primary animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium">Analyzing content patterns...</span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <h3 className="text-xl font-bold text-white mb-4">Similar Content</h3>
        )}
        <div className="text-center text-gray-400 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p>{error}</p>
          <button 
            onClick={() => fetchSimilarContent(1, false)}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredContent.length === 0) {
    return (
      <motion.div 
        className={`${className}`}
        variants={containerVariants}
        initial={containerVariants ? 'initial' : undefined}
        animate={containerVariants ? 'animate' : undefined}
        exit={containerVariants ? 'exit' : undefined}
        transition={{ duration: 0.5 }}
      >
        {showTitle && (
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Desktop: Heading and filters in one line */}
            <div className="hidden lg:flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Similar {contentType === 'tv' ? 'Shows' : 'Movies'}
                </h2>
                <p className="text-white/60 text-xs sm:text-sm mt-1">
                  Discover more {contentType === 'tv' ? 'shows' : 'movies'} you might enjoy
                </p>
              </div>
              
              {/* Desktop filters inline with heading */}
              {showFilters && !isMobile && (
                <div className="flex items-center gap-4">
                  <SimilarContentFilters 
                    filters={filters} 
                    onFilterChange={handleFilterChange}
                    isMobile={false}
                  />
                </div>
              )}
            </div>
            
            {/* Mobile: Stacked layout */}
            <div className="lg:hidden">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Similar {contentType === 'tv' ? 'Shows' : 'Movies'}
              </h2>
              <p className="text-white/60 text-xs sm:text-sm mb-4">
                Discover more {contentType === 'tv' ? 'shows' : 'movies'} you might enjoy
              </p>
            </div>
        </motion.div>
      )}

      {/* Mobile filters below heading */}
      {showFilters && isMobile && (
        <SimilarContentFilters 
          filters={filters} 
          onFilterChange={handleFilterChange}
          isMobile={true}
        />
      )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-white/40"
        >
          <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl p-8 border border-white/10">
            <svg className="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-lg font-semibold text-white/60 mb-2">No AI Recommendations Found</h3>
            <p className="text-white/40 text-sm">Our AI couldn't find any recommendations at the moment.</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`${className}`}
      variants={containerVariants}
      initial={containerVariants ? 'initial' : undefined}
      animate={containerVariants ? 'animate' : undefined}
      exit={containerVariants ? 'exit' : undefined}
      transition={{ duration: 0.5 }}
    >
      {showTitle && (
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Desktop: Heading and filters in one line */}
          <div className="hidden lg:flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Recommendations
              </h2>
              <p className="text-white/60 text-xs sm:text-sm mt-1">
                AI-powered recommendations
              </p>
            </div>
            
            {/* Desktop filters inline with heading */}
            {showFilters && !isMobile && (
              <div className="flex items-center gap-4">
                <SimilarContentFilters 
                  filters={filters} 
                  onFilterChange={handleFilterChange}
                  isMobile={false}
                />
              </div>
            )}
          </div>
          
          {/* Mobile: Stacked layout */}
          <div className="lg:hidden">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Recommendations
            </h2>
            <p className="text-white/60 text-xs sm:text-sm mb-4">
              AI-powered recommendations
            </p>
          </div>
        </motion.div>
      )}

      {/* Mobile filters below heading */}
      {showFilters && isMobile && (
        <SimilarContentFilters 
          filters={filters} 
          onFilterChange={handleFilterChange}
          isMobile={true}
        />
      )}

      <motion.div 
        className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-2 gap-3'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4'
        }`}
        variants={gridVariants}
        initial="initial"
        animate="animate"
      >
        {displayedContent.map((item, index) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            transition={{ 
              duration: 0.12,
              delay: Math.min(index * 0.015, 0.15),
              type: 'spring', 
              stiffness: 140,
              damping: 26
            }}
            // Avoid exit animations on scroll to prevent background flashes
            style={{ contain: 'layout paint', willChange: 'transform' }}
            // Only animate on first reveal to avoid repeated opacity toggles
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          >
            <EnhancedSimilarCard
              item={item}
              onClick={handleItemClick}
              isMobile={isMobile}
              showRelevanceScore={filters.showRelevanceScore}
              disableAnimations={false}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Load More Button */}
      {showLoadMore && hasMore && (
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <button 
            onClick={handleLoadMore}
            disabled={loading || loadingMore}
            className="px-6 py-3 text-sm font-medium text-white/80 bg-white/10 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loading more...
              </div>
            ) : (
              'Load More AI Recommendations'
            )}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
});

// FIXED: Basic intersection observer hook without infinite loops - optimized for performance
const useSimpleIntersectionObserver = (callback, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);
  const callbackRef = useRef(callback);
  
  // FIXED: Update callback ref to prevent stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    // FIXED: Use more efficient intersection observer settings
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasIntersected) {
          setIsIntersecting(true);
          setHasIntersected(true);
          // FIXED: Use requestAnimationFrame for better performance
          if (callbackRef.current) {
            requestAnimationFrame(() => callbackRef.current());
          }
        }
      },
      {
        threshold: 0.05, // FIXED: Reduced threshold for better performance
        rootMargin: '25px', // FIXED: Reduced margin for better performance
        ...options
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [hasIntersected]); // FIXED: Removed options dependency to prevent infinite loops
  
  return [ref, isIntersecting, hasIntersected];
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedEnhancedSimilarContent = React.memo(EnhancedSimilarContent, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.contentId === nextProps.contentId &&
    prevProps.contentType === nextProps.contentType &&
    prevProps.onItemClick === nextProps.onItemClick &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.maxItems === nextProps.maxItems &&
    prevProps.showFilters === nextProps.showFilters &&
    prevProps.showTitle === nextProps.showTitle &&
    prevProps.showPagination === nextProps.showPagination &&
    prevProps.showLoadMore === nextProps.showLoadMore &&
    prevProps.className === nextProps.className
  );
});

export default MemoizedEnhancedSimilarContent; 