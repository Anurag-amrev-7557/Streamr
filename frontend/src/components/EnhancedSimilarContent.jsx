import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { similarContentUtils } from '../services/enhancedSimilarContentService';

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

// Enhanced Similar Content Card with relevance indicators
const EnhancedSimilarCard = React.memo(({ item, onClick, isMobile, showRelevanceScore = false }) => {
  const displayTitle = item.title || item.name || 'Untitled';
  const displayYear = item.year || 
    (item.release_date ? new Date(item.release_date).getFullYear() : 
     item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A');
  
  const relevanceColor = useMemo(() => {
    if (!item.similarityScore) return 'text-gray-400';
    if (item.similarityScore >= 0.8) return 'text-green-400';
    if (item.similarityScore >= 0.6) return 'text-yellow-400';
    if (item.similarityScore >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  }, [item.similarityScore]);

  const relevanceText = useMemo(() => {
    if (!item.similarityScore) return '';
    if (item.similarityScore >= 0.8) return 'Very Similar';
    if (item.similarityScore >= 0.6) return 'Similar';
    if (item.similarityScore >= 0.4) return 'Somewhat Similar';
    return 'Less Similar';
  }, [item.similarityScore]);

  return (
    <motion.div 
      className="group cursor-pointer relative"
      onClick={() => onClick(item)}
      whileHover={{ scale: isMobile ? 1.05 : 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className={`${isMobile ? 'aspect-[3/4]' : 'aspect-[2/3]'} rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 relative shadow-lg border border-white/5 hover:border-white/10 transition-all duration-300`}>
        {item.poster_path ? (
          <img 
            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
            alt={displayTitle} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-700 to-gray-800">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
        )}
        
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
              {item.vote_average.toFixed(1)}
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
                      {item.vote_average.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Play Button - Enhanced for Mobile */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <motion.div 
            className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30`}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <svg className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
});

// Enhanced Filter Component with more options
const SimilarContentFilters = ({ filters, onFilterChange, isMobile = false }) => {
  const [showFilters, setShowFilters] = useState(false);
  
  const relevanceOptions = [
    { value: 0, label: 'All' },
    { value: 0.3, label: 'Somewhat Similar' },
    { value: 0.5, label: 'Similar' },
    { value: 0.7, label: 'Very Similar' },
    { value: 0.8, label: 'Highly Similar' }
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'year', label: 'Newest First' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'title', label: 'Alphabetical' }
  ];

  const yearOptions = [
    { value: 0, label: 'All Years' },
    { value: 2024, label: '2024' },
    { value: 2023, label: '2023' },
    { value: 2022, label: '2022' },
    { value: 2021, label: '2021' },
    { value: 2020, label: '2020' },
    { value: 2019, label: '2019' },
    { value: 2018, label: '2018' }
  ];

  // Mobile filter interface
  if (isMobile) {
    return (
      <div className="mb-4">
        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white/90 hover:bg-white/15 transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            <span className="text-sm font-medium">Filters & Sort</span>
          </div>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Mobile Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-3"
            >
              {/* Relevance Filter */}
              <div className="bg-white/5 rounded-lg p-3">
                <label className="block text-sm font-medium text-white/80 mb-2">Relevance</label>
                <CustomDropdown
                  options={relevanceOptions}
                  value={filters.minRelevance}
                  onChange={(value) => onFilterChange('minRelevance', value)}
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
                  onChange={(value) => onFilterChange('sortBy', value)}
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
                  onChange={(value) => onFilterChange('year', value)}
                  placeholder="Select year"
                  className="w-full"
                />
              </div>

              {/* Show Relevance Score Toggle */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white/80">Show relevance scores</label>
                  <button
                    onClick={() => onFilterChange('showRelevanceScore', !filters.showRelevanceScore)}
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
                  onClick={() => {
                    onFilterChange('minRelevance', 0);
                    onFilterChange('sortBy', 'relevance');
                    onFilterChange('showRelevanceScore', false);
                    onFilterChange('year', 0);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium text-white/70 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-white bg-primary/20 border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors"
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
          onChange={(value) => onFilterChange('minRelevance', value)}
          placeholder="Select relevance"
        />
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/60 font-medium">Sort</label>
        <CustomDropdown
          options={sortOptions}
          value={filters.sortBy}
          onChange={(value) => onFilterChange('sortBy', value)}
          placeholder="Select sort"
        />
      </div>

      {/* Year Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/60 font-medium">Year</label>
        <CustomDropdown
          options={yearOptions}
          value={filters.year}
          onChange={(value) => onFilterChange('year', value)}
          placeholder="Select year"
        />
      </div>

      {/* Show Relevance Score Toggle */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-white/60 font-medium">Scores</label>
        <button
          type="button"
          aria-pressed={filters.showRelevanceScore}
          onClick={() => onFilterChange('showRelevanceScore', !filters.showRelevanceScore)}
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
};



// Main Enhanced Similar Content Component
const EnhancedSimilarContent = ({ 
  contentId, 
  contentType = 'movie', 
  onItemClick, 
  isMobile = false,
  maxItems = 24, // Increased from 12 to 24
  showFilters = true,
  showTitle = true,
  showPagination = false, // Changed to false by default
  showLoadMore = true,
  className = ""
}) => {
  const [similarContent, setSimilarContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayedItems, setDisplayedItems] = useState(16); // Track how many items to show
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState({
    minRelevance: 0,
    sortBy: 'relevance',
    showRelevanceScore: false,
    year: 0
  });

  // Fetch similar content with infinite loading support
  const fetchSimilarContent = useCallback(async (page = 1, append = false) => {
    if (!contentId) return;
    
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const results = await similarContentUtils.getSimilarContent(contentId, contentType, {
        limit: 200, // Increased limit for faster loading
        minScore: 0.2, // Increased threshold for better relevance
        forceRefresh: false,
        page: page,
        infiniteLoading: page > 1 // Only enable infinite loading for subsequent pages
      });
      
      // Debug log to verify different content for different movies
      if (import.meta.env.DEV) {
        console.log(`[EnhancedSimilarContent] Fetched ${results.length} similar items for ${contentType} ${contentId} (page ${page}):`, 
          results.slice(0, 3).map(item => ({ id: item.id, title: item.title || item.name }))
        );
      }
      
      if (append) {
        // Append new results to existing content
        setSimilarContent(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = results.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        // Replace content for first load
        setSimilarContent(results);
      }
      
      // Check if there are more results available
      setHasMore(results.length >= 15); // Lowered threshold for more aggressive loading
    } catch (err) {
      console.error('Error fetching similar content:', err);
      setError('Failed to load similar content');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []); // Removed contentId and contentType dependencies since we handle them in useEffect

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let filtered = similarContent.filter(item => {
      // Relevance filter
      if (filters.minRelevance && (!item.similarityScore || item.similarityScore < filters.minRelevance)) {
        return false;
      }
      
      // Year filter
      if (filters.year > 0) {
        const itemYear = item.year || 
          (item.release_date ? new Date(item.release_date).getFullYear() : 
           item.first_air_date ? new Date(item.first_air_date).getFullYear() : 0);
        if (itemYear !== filters.year) {
          return false;
        }
      }
      
      return true;
    });

    // Sort content
    switch (filters.sortBy) {
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

    return filtered;
  }, [similarContent, filters]);

  // Get content to display (first N items)
  const displayedContent = useMemo(() => {
    return filteredContent.slice(0, displayedItems);
  }, [filteredContent, displayedItems]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setDisplayedItems(16); // Reset to initial amount when filters change
    setCurrentPage(1); // Reset page when filters change
  }, []);

  // Handle load more - optimized for faster loading
  const handleLoadMore = useCallback(async () => {
    if (hasMore && !loading && !loadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      // Fetch more content from the next page
      await fetchSimilarContent(nextPage, true);
      
      // Increase displayed items more aggressively
      setDisplayedItems(prev => prev + 16); // Increased from 8 to 16
    }
  }, [hasMore, loading, loadingMore, currentPage, fetchSimilarContent]);

  // Handle item click
  const handleItemClick = useCallback((item) => {
    if (onItemClick) {
      onItemClick(item);
    }
  }, [onItemClick]);

  // Fetch content on mount and when contentId/contentType changes
  useEffect(() => {
    // Clear previous content when switching to a new movie/show
    setSimilarContent([]);
    setDisplayedItems(16);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    
    if (contentId) {
      // Use hybrid recommendations for better results
      fetchSimilarContent(1, false);
    }
  }, [contentId, contentType]); // Changed dependency to contentId and contentType instead of fetchSimilarContent

  // Update hasMore when filtered content changes
  useEffect(() => {
    setHasMore(displayedItems < filteredContent.length || (hasMore && similarContent.length > 0));
  }, [filteredContent, displayedItems, hasMore, similarContent.length]);

  // Loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Finding similar content...
          </h3>
        )}
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-2 gap-3' 
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
        }`}>
          {Array.from({ length: isMobile ? 6 : 8 }).map((_, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="group relative bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] rounded-xl overflow-hidden border border-white/[0.08] shadow-lg backdrop-blur-sm"
            >
              {/* Movie Poster Skeleton - Full Card */}
              <div className={`${isMobile ? 'aspect-[3/4]' : 'aspect-[2/3]'} bg-gradient-to-br from-gray-800 to-gray-700 animate-pulse rounded-xl`}></div>
            </motion.div>
          ))}
        </div>
      </div>
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
      <div className={`${className}`}>
        {showTitle && (
          <h3 className="text-xl font-bold text-white mb-4">Similar Content</h3>
        )}
        <div className="text-center text-gray-400 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547z" />
          </svg>
          <p>No similar content found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
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
        className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1 xs:grid-cols-2 gap-3' 
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
        }`}
        layout
      >
        <AnimatePresence>
          {displayedContent.map((item, index) => (
            <motion.div
              key={`${item.id}-${index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              layout
            >
              <EnhancedSimilarCard
                item={item}
                onClick={handleItemClick}
                isMobile={isMobile}
                showRelevanceScore={filters.showRelevanceScore}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Load More Button */}
      {showLoadMore && hasMore && (
        <div className="mt-6 text-center">
          <button 
            onClick={handleLoadMore}
            disabled={loading || loadingMore}
            className="px-6 py-3 text-sm font-medium text-white/80 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loading more...
              </div>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedSimilarContent; 