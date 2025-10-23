import React, { useState, useRef, useEffect, useCallback, useMemo, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';

// Advanced state management using useReducer for complex state logic
const searchBarReducer = (state, action) => {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload, selectedSuggestionIndex: -1 };
    case 'SET_FOCUS':
      return { ...state, isFocused: action.payload };
    case 'SHOW_SUGGESTIONS':
      return {
        ...state,
        showSuggestionsDropdown: true,
        showHistoryDropdown: false,
        showTrendingDropdown: false,
      };
    case 'SHOW_HISTORY':
      return {
        ...state,
        showSuggestionsDropdown: false,
        showHistoryDropdown: true,
        showTrendingDropdown: false,
      };
    case 'SHOW_TRENDING':
      return {
        ...state,
        showSuggestionsDropdown: false,
        showHistoryDropdown: false,
        showTrendingDropdown: true,
      };
    case 'HIDE_ALL_DROPDOWNS':
      return {
        ...state,
        showSuggestionsDropdown: false,
        showHistoryDropdown: false,
        showTrendingDropdown: false,
        selectedSuggestionIndex: -1,
      };
    case 'SET_SELECTED_INDEX':
      return { ...state, selectedSuggestionIndex: action.payload };
    case 'RESET':
      return {
        ...state,
        query: '',
        showSuggestionsDropdown: false,
        showHistoryDropdown: false,
        showTrendingDropdown: false,
        selectedSuggestionIndex: -1,
      };
    default:
      return state;
  }
};

const EnhancedSearchBar = ({
  placeholder = "Search...",
  onSearch,
  onSearchSubmit,
  onClear,
  onFocus,
  onBlur,
  className = "",
  initialValue = "",
  searchDelay = 50,
  showSuggestions = true,
  suggestions = [],
  onSuggestionSelect,
  isLoading = false,
  disabled = false,
  variant = "default",
  size = "md",
  theme = "dark",
  showClearButton = true,
  showSearchIcon = true,
  showLoadingSpinner = true,
  autoFocus = false,
  maxSuggestions = 5,
  searchHistory = [],
  onHistorySelect,
  clearHistory,
  showHistory = true,
  showTrendingSearches = false,
  trendingSearches = [],
  onTrendingSelect,
  minSearchLength = 1, // Minimum characters before triggering search
  enableFuzzySearch = true, // Enable fuzzy matching for suggestions
  enableSearchCache = true, // Cache search results
  cacheTimeout = 300000, // Cache timeout in ms (5 minutes)
  enableAnalytics = false, // Track search analytics
  onAnalyticsEvent, // Callback for analytics events
  ...props
}) => {
  // Stable component ID for unique keys
  const componentId = useRef(`search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).current;
  
  // Advanced state management with useReducer
  const [state, dispatch] = useReducer(searchBarReducer, {
    query: initialValue,
    isFocused: false,
    showSuggestionsDropdown: false,
    selectedSuggestionIndex: -1,
    showHistoryDropdown: false,
    showTrendingDropdown: false,
  });
  
  // Advanced caching system for search results
  const searchCache = useRef(new Map());
  const cacheTimestamps = useRef(new Map());
  
  // Analytics tracking
  const analyticsData = useRef({
    searchCount: 0,
    lastSearchTime: null,
    searchDuration: [],
    popularSearches: new Map(),
  });
  
  // Performance monitoring
  const performanceMetrics = useRef({
    renderCount: 0,
    lastRenderTime: Date.now(),
    averageRenderTime: 0,
  });
  
  // Track render performance
  useEffect(() => {
    performanceMetrics.current.renderCount++;
    const now = Date.now();
    const renderTime = now - performanceMetrics.current.lastRenderTime;
    performanceMetrics.current.averageRenderTime = 
      (performanceMetrics.current.averageRenderTime * (performanceMetrics.current.renderCount - 1) + renderTime) / 
      performanceMetrics.current.renderCount;
    performanceMetrics.current.lastRenderTime = now;
  });
  
  // Fuzzy search implementation for better suggestion matching
  const fuzzyMatch = useCallback((searchText, targetText) => {
    if (!enableFuzzySearch) {
      return targetText.toLowerCase().includes(searchText.toLowerCase());
    }
    
    const search = searchText.toLowerCase();
    const target = targetText.toLowerCase();
    
    let searchIndex = 0;
    let targetIndex = 0;
    let score = 0;
    let consecutiveMatches = 0;
    
    while (searchIndex < search.length && targetIndex < target.length) {
      if (search[searchIndex] === target[targetIndex]) {
        score += 1 + consecutiveMatches;
        consecutiveMatches++;
        searchIndex++;
      } else {
        consecutiveMatches = 0;
      }
      targetIndex++;
    }
    
    return searchIndex === search.length ? score : 0;
  }, [enableFuzzySearch]);
  
  // Advanced filtering with fuzzy matching and scoring
  const getFilteredSuggestions = useCallback(() => {
    if (!suggestions || suggestions.length === 0) return [];
    
    return suggestions
      .map(suggestion => {
        if (!suggestion || typeof suggestion !== 'object') return null;
        
        const suggestionText = suggestion.title || suggestion.name || '';
        if (!suggestionText || typeof suggestionText !== 'string' || suggestionText.trim() === '') {
          return null;
        }
        
        const score = fuzzyMatch(state.query, suggestionText);
        return { ...suggestion, matchScore: score };
      })
      .filter(Boolean)
      .filter(suggestion => suggestion.matchScore > 0 || !state.query.trim())
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxSuggestions)
      .filter((suggestion, index, array) => {
        const suggestionId = suggestion.id || suggestion.title || suggestion.name;
        return array.findIndex(item => {
          const itemId = item.id || item.title || item.name;
          return itemId === suggestionId;
        }) === index;
      })
      .filter(suggestion => {
        const hasValidId = suggestion.id !== undefined && suggestion.id !== null;
        const hasValidTitle = suggestion.title && typeof suggestion.title === 'string' && suggestion.title.trim() !== '';
        return hasValidId || hasValidTitle;
      });
  }, [suggestions, maxSuggestions, state.query, fuzzyMatch]);
  
  // Memoize filtered suggestions with advanced logic
  const filteredSuggestions = useMemo(() => getFilteredSuggestions(), [getFilteredSuggestions]);
  
  // Determine active dropdown with priority logic
  const activeDropdown = useMemo(() => {
    const { showSuggestionsDropdown, showHistoryDropdown, showTrendingDropdown } = state;
    
    if (!showSuggestionsDropdown && !showHistoryDropdown && !showTrendingDropdown) {
      return null;
    }
    
    // Priority: suggestions > history > trending
    if (showSuggestionsDropdown && filteredSuggestions.length > 0) return 'suggestions';
    if (showHistoryDropdown && searchHistory.length > 0 && showHistory) return 'history';
    if (showTrendingDropdown && trendingSearches.length > 0 && showTrendingSearches) return 'trending';
    return null;
  }, [state.showSuggestionsDropdown, filteredSuggestions.length, state.showHistoryDropdown, searchHistory.length, showHistory, state.showTrendingDropdown, trendingSearches.length, showTrendingSearches]);

  // Memoize valid history items with advanced deduplication
  const validHistoryItems = useMemo(() => {
    if (!searchHistory || searchHistory.length === 0) return [];
    
    const seen = new Set();
    return searchHistory
      .filter(item => {
        if (!item || typeof item !== 'string' || item.trim() === '') return false;
        const normalized = item.toLowerCase().trim();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .slice(0, 10);
  }, [searchHistory]);

  // Memoize valid trending items with scoring
  const validTrendingItems = useMemo(() => {
    if (!trendingSearches || trendingSearches.length === 0) return [];
    
    const seen = new Set();
    return trendingSearches
      .filter(item => {
        if (!item || typeof item !== 'string' || item.trim() === '') return false;
        const normalized = item.toLowerCase().trim();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
  }, [trendingSearches]);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const historyRef = useRef(null);
  const trendingRef = useRef(null);
  const abortControllerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Advanced search function with caching and abort control
  const performSearch = useCallback((searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < minSearchLength) {
      return;
    }
    
    const trimmedQuery = searchQuery.trim();
    
    // Check cache first
    if (enableSearchCache) {
      const cached = searchCache.current.get(trimmedQuery);
      const cacheTime = cacheTimestamps.current.get(trimmedQuery);
      
      if (cached && cacheTime && (Date.now() - cacheTime < cacheTimeout)) {
        console.log('🎯 Using cached results for:', trimmedQuery);
        return;
      }
    }
    
    // Abort previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    // Track analytics
    if (enableAnalytics) {
      analyticsData.current.searchCount++;
      analyticsData.current.lastSearchTime = Date.now();
      
      const searchPopularity = analyticsData.current.popularSearches.get(trimmedQuery) || 0;
      analyticsData.current.popularSearches.set(trimmedQuery, searchPopularity + 1);
      
      if (onAnalyticsEvent) {
        onAnalyticsEvent({
          type: 'search',
          query: trimmedQuery,
          timestamp: Date.now(),
          searchCount: analyticsData.current.searchCount,
        });
      }
    }
    
    console.log('🔍 Performing search for:', trimmedQuery);
    
    if (onSearch) {
      const searchStartTime = Date.now();
      onSearch(trimmedQuery);
      
      // Track search duration
      if (enableAnalytics) {
        const duration = Date.now() - searchStartTime;
        analyticsData.current.searchDuration.push(duration);
      }
      
      // Update cache
      if (enableSearchCache) {
        searchCache.current.set(trimmedQuery, true);
        cacheTimestamps.current.set(trimmedQuery, Date.now());
      }
    }
  }, [onSearch, minSearchLength, enableSearchCache, cacheTimeout, enableAnalytics, onAnalyticsEvent]);

  // Advanced debounced search with dynamic delay
  const debouncedSearch = useCallback(
    debounce((searchQuery) => {
      performSearch(searchQuery);
    }, searchDelay),
    [performSearch, searchDelay]
  );

  // Cleanup on unmount with advanced resource management
  useEffect(() => {
    return () => {
      // Cancel debounced search
      if (debouncedSearch && debouncedSearch.cancel) {
        debouncedSearch.cancel();
      }
      
      // Abort any pending searches
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Clear cache to prevent memory leaks
      if (enableSearchCache) {
        searchCache.current.clear();
        cacheTimestamps.current.clear();
      }
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 SearchBar Performance Metrics:', {
          renderCount: performanceMetrics.current.renderCount,
          averageRenderTime: performanceMetrics.current.averageRenderTime.toFixed(2) + 'ms',
          searchCount: analyticsData.current.searchCount,
          averageSearchDuration: analyticsData.current.searchDuration.length > 0 
            ? (analyticsData.current.searchDuration.reduce((a, b) => a + b, 0) / analyticsData.current.searchDuration.length).toFixed(2) + 'ms'
            : 'N/A',
        });
      }
    };
  }, [debouncedSearch, enableSearchCache]);

  // Advanced search submit handler with history tracking
  const handleSearchSubmit = useCallback((searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) return;
    
    const trimmedQuery = searchQuery.trim();
    
    if (onSearchSubmit) {
      onSearchSubmit(trimmedQuery);
    }
    
    // Track in analytics
    if (enableAnalytics && onAnalyticsEvent) {
      onAnalyticsEvent({
        type: 'search_submit',
        query: trimmedQuery,
        timestamp: Date.now(),
      });
    }
  }, [onSearchSubmit, enableAnalytics, onAnalyticsEvent]);

  // Advanced input change handler with intelligent state management
  const handleInputChange = useCallback((e) => {
    try {
      const value = e.target.value || '';
      console.log('📝 Input changed to:', value);
      
      dispatch({ type: 'SET_QUERY', payload: value });
      
      if (value.trim()) {
        dispatch({ type: 'SHOW_SUGGESTIONS' });
        
        // Clear existing search timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        
        // Intelligent search triggering based on query length
        if (value.trim().length >= minSearchLength) {
          console.log('🔍 Initiating debounced search');
          debouncedSearch(value);
          
          // Immediate search for queries >= 3 characters (better UX)
          if (value.trim().length >= 3) {
            console.log('⚡ Immediate search triggered');
            performSearch(value.trim());
          }
        }
      } else {
        dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
        if (onClear) onClear();
      }
      
      // Track input analytics
      if (enableAnalytics && onAnalyticsEvent) {
        onAnalyticsEvent({
          type: 'input_change',
          query: value,
          length: value.length,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('❌ Error in handleInputChange:', error);
      dispatch({ type: 'RESET' });
    }
  }, [debouncedSearch, performSearch, onClear, minSearchLength, enableAnalytics, onAnalyticsEvent]);

  // Advanced focus handler with intelligent dropdown management
  const handleFocus = useCallback((e) => {
    try {
      dispatch({ type: 'SET_FOCUS', payload: true });
      
      if (state.query.trim()) {
        dispatch({ type: 'SHOW_SUGGESTIONS' });
      } else {
        // Show history by default when focused with empty query
        dispatch({ type: 'SHOW_HISTORY' });
        
        // Also show trending if enabled
        if (showTrendingSearches && validTrendingItems.length > 0) {
          dispatch({ type: 'SHOW_TRENDING' });
        }
      }
      
      if (onFocus) onFocus(e);
      
      // Track focus analytics
      if (enableAnalytics && onAnalyticsEvent) {
        onAnalyticsEvent({
          type: 'focus',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('❌ Error in handleFocus:', error);
      dispatch({ type: 'SET_FOCUS', payload: true });
    }
  }, [onFocus, showTrendingSearches, validTrendingItems.length, state.query, enableAnalytics, onAnalyticsEvent]);

  // Advanced blur handler with delayed dropdown closing
  const handleBlur = useCallback((e) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Delay to allow for dropdown item clicks
    searchTimeoutRef.current = setTimeout(() => {
      try {
        dispatch({ type: 'SET_FOCUS', payload: false });
        dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
        
        if (onBlur) onBlur(e);
        
        // Track blur analytics
        if (enableAnalytics && onAnalyticsEvent) {
          onAnalyticsEvent({
            type: 'blur',
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('❌ Error in handleBlur:', error);
        dispatch({ type: 'SET_FOCUS', payload: false });
        dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
      }
    }, 150);
  }, [onBlur, enableAnalytics, onAnalyticsEvent]);

  // Advanced keyboard navigation with intelligent item selection
  const handleKeyDown = useCallback((e) => {
    // Allow default behavior for modifier key combinations
    if (e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }
    
    const totalItems = filteredSuggestions.length + 
      (showHistory ? validHistoryItems.length : 0) + 
      (showTrendingSearches ? validTrendingItems.length : 0);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        dispatch({ 
          type: 'SET_SELECTED_INDEX', 
          payload: state.selectedSuggestionIndex < totalItems - 1 
            ? state.selectedSuggestionIndex + 1 
            : state.selectedSuggestionIndex 
        });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        dispatch({ 
          type: 'SET_SELECTED_INDEX', 
          payload: state.selectedSuggestionIndex > 0 
            ? state.selectedSuggestionIndex - 1 
            : -1 
        });
        break;
        
      case 'Enter':
        e.preventDefault();
        if (state.selectedSuggestionIndex >= 0) {
          // Handle suggestion selection
          if (state.selectedSuggestionIndex < filteredSuggestions.length) {
            const suggestion = filteredSuggestions[state.selectedSuggestionIndex];
            if (suggestion && onSuggestionSelect) {
              onSuggestionSelect(suggestion);
              const suggestionText = suggestion.title || suggestion.name || '';
              dispatch({ type: 'SET_QUERY', payload: suggestionText });
              handleSearchSubmit(suggestionText);
            }
          } else if (state.selectedSuggestionIndex < filteredSuggestions.length + validHistoryItems.length) {
            // Handle history selection
            const historyIndex = state.selectedSuggestionIndex - filteredSuggestions.length;
            const historyItem = validHistoryItems[historyIndex];
            if (onHistorySelect) onHistorySelect(historyItem);
            dispatch({ type: 'SET_QUERY', payload: historyItem });
            handleSearchSubmit(historyItem);
          } else {
            // Handle trending selection
            const trendingIndex = state.selectedSuggestionIndex - filteredSuggestions.length - validHistoryItems.length;
            const trendingItem = validTrendingItems[trendingIndex];
            if (onTrendingSelect) onTrendingSelect(trendingItem);
            dispatch({ type: 'SET_QUERY', payload: trendingItem });
            handleSearchSubmit(trendingItem);
          }
          dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
        } else if (state.query.trim()) {
          // Perform search with current query
          performSearch(state.query.trim());
          handleSearchSubmit(state.query.trim());
          dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
        inputRef.current?.blur();
        break;
        
      case 'Tab':
        // Autocomplete with first suggestion on Tab
        if (filteredSuggestions.length > 0 && state.query.trim()) {
          e.preventDefault();
          const firstSuggestion = filteredSuggestions[0];
          const suggestionText = firstSuggestion.title || firstSuggestion.name || '';
          dispatch({ type: 'SET_QUERY', payload: suggestionText });
          dispatch({ type: 'SET_SELECTED_INDEX', payload: 0 });
        }
        break;
    }
    
    // Track keyboard analytics
    if (enableAnalytics && onAnalyticsEvent) {
      onAnalyticsEvent({
        type: 'keyboard_navigation',
        key: e.key,
        selectedIndex: state.selectedSuggestionIndex,
        timestamp: Date.now(),
      });
    }
  }, [
    filteredSuggestions, 
    validHistoryItems, 
    validTrendingItems, 
    state.selectedSuggestionIndex, 
    state.query, 
    onSuggestionSelect, 
    onHistorySelect, 
    onTrendingSelect, 
    showHistory, 
    showTrendingSearches, 
    handleSearchSubmit,
    performSearch,
    enableAnalytics,
    onAnalyticsEvent
  ]);

  // Advanced clear handler with state reset
  const handleClear = useCallback(() => {
    dispatch({ type: 'RESET' });
    
    if (onClear) onClear();
    inputRef.current?.focus();
    
    // Track clear analytics
    if (enableAnalytics && onAnalyticsEvent) {
      onAnalyticsEvent({
        type: 'clear',
        timestamp: Date.now(),
      });
    }
  }, [onClear, enableAnalytics, onAnalyticsEvent]);

  // Advanced suggestion click handler with validation and tracking
  const handleSuggestionClick = useCallback((suggestion, index) => {
    if (!suggestion || typeof suggestion !== 'object') {
      console.warn('⚠️ Invalid suggestion object:', suggestion);
      return;
    }
    
    const suggestionText = suggestion.title || suggestion.name || '';
    if (!suggestionText) {
      console.warn('⚠️ Suggestion has no text:', suggestion);
      return;
    }
    
    if (onSuggestionSelect) onSuggestionSelect(suggestion);
    
    dispatch({ type: 'SET_QUERY', payload: suggestionText });
    dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
    
    handleSearchSubmit(suggestionText);
    
    // Track suggestion click analytics
    if (enableAnalytics && onAnalyticsEvent) {
      onAnalyticsEvent({
        type: 'suggestion_click',
        suggestion: suggestionText,
        index,
        timestamp: Date.now(),
      });
    }
  }, [onSuggestionSelect, handleSearchSubmit, enableAnalytics, onAnalyticsEvent]);

  // Advanced history click handler
  const handleHistoryClick = useCallback((historyItem) => {
    if (!historyItem || typeof historyItem !== 'string') {
      console.warn('⚠️ Invalid history item:', historyItem);
      return;
    }
    
    if (onHistorySelect) onHistorySelect(historyItem);
    
    dispatch({ type: 'SET_QUERY', payload: historyItem });
    dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
    
    handleSearchSubmit(historyItem);
    
    // Track history click analytics
    if (enableAnalytics && onAnalyticsEvent) {
      onAnalyticsEvent({
        type: 'history_click',
        item: historyItem,
        timestamp: Date.now(),
      });
    }
  }, [onHistorySelect, handleSearchSubmit, enableAnalytics, onAnalyticsEvent]);

  // Advanced remove history item handler
  const handleRemoveHistoryItem = useCallback((historyItem, e) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      if (typeof window !== 'undefined' && window.searchHistoryService?.removeFromHistory) {
        window.searchHistoryService.removeFromHistory(historyItem);
      }
      
      // Track removal analytics
      if (enableAnalytics && onAnalyticsEvent) {
        onAnalyticsEvent({
          type: 'history_remove',
          item: historyItem,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.warn('⚠️ searchHistoryService not available:', error);
    }
  }, [enableAnalytics, onAnalyticsEvent]);

  // Advanced trending click handler
  const handleTrendingClick = useCallback((trendingItem) => {
    if (!trendingItem || typeof trendingItem !== 'string') {
      console.warn('⚠️ Invalid trending item:', trendingItem);
      return;
    }
    
    if (onTrendingSelect) onTrendingSelect(trendingItem);
    
    dispatch({ type: 'SET_QUERY', payload: trendingItem });
    dispatch({ type: 'HIDE_ALL_DROPDOWNS' });
    
    handleSearchSubmit(trendingItem);
    
    // Track trending click analytics
    if (enableAnalytics && onAnalyticsEvent) {
      onAnalyticsEvent({
        type: 'trending_click',
        item: trendingItem,
        timestamp: Date.now(),
      });
    }
  }, [onTrendingSelect, handleSearchSubmit, enableAnalytics, onAnalyticsEvent]);

  // Memoized style classes for performance
  const sizeClasses = useMemo(() => ({
    sm: "h-9 px-3 text-sm",
    md: "h-12 px-4 text-base",
    lg: "h-14 px-5 text-lg"
  }), []);

  const themeClasses = useMemo(() => ({
    dark: {
      input: "bg-[#2b3036] text-white placeholder-gray-400 border-gray-600 focus:border-white/30",
      dropdown: "bg-[#1a1a1a] border-gray-700 shadow-xl",
      item: "text-gray-300 hover:bg-[#2b3036] hover:text-white",
      selected: "bg-[#2b3036] text-white",
      highlight: "bg-yellow-400/20 text-yellow-300"
    },
    light: {
      input: "bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:border-blue-500",
      dropdown: "bg-white border-gray-200 shadow-lg",
      item: "text-gray-700 hover:bg-gray-50",
      selected: "bg-blue-50 text-blue-900",
      highlight: "bg-yellow-100 text-yellow-800"
    }
  }), []);

  const variantClasses = useMemo(() => ({
    default: "rounded-full border",
    minimal: "rounded-full border-0 bg-transparent",
    floating: "rounded-full border shadow-lg"
  }), []);

  const currentTheme = themeClasses[theme];
  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  // Highlight matching text in suggestions (advanced feature)
  const highlightMatch = useCallback((text, query) => {
    if (!query.trim() || !enableFuzzySearch) return text;
    
    const parts = [];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let lastIndex = 0;
    
    for (let i = 0; i < lowerQuery.length; i++) {
      const charIndex = lowerText.indexOf(lowerQuery[i], lastIndex);
      if (charIndex !== -1) {
        if (charIndex > lastIndex) {
          parts.push({ text: text.substring(lastIndex, charIndex), highlight: false });
        }
        parts.push({ text: text[charIndex], highlight: true });
        lastIndex = charIndex + 1;
      }
    }
    
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), highlight: false });
    }
    
    return parts;
  }, [enableFuzzySearch]);

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <motion.div
          className={`relative flex items-center ${currentVariant} ${currentTheme.input} ${currentSize} transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          whileHover={disabled ? {} : { scale: 1.01 }}
          whileTap={disabled ? {} : { scale: 0.99 }}
          layout={false}
        >
          {/* Search Icon */}
          {showSearchIcon && (
            <motion.div
              className="absolute left-4 text-gray-400"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </motion.div>
          )}

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={state.query || ''}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            name="search-input"
            id="search-input"
            className={`w-full bg-transparent outline-none focus:outline-none focus:ring-0 ${showSearchIcon ? 'pl-10' : 'pl-4'} pr-12`}
            {...props}
          />

          {/* Loading Spinner */}
          {isLoading && showLoadingSpinner && (
            <motion.div
              className="absolute right-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
            </motion.div>
          )}

          {/* Clear Button */}
          {showClearButton && state.query && !isLoading && (
            <motion.button
              key="clear-button"
              onClick={handleClear}
              className="absolute right-3 p-1 rounded-full hover:bg-gray-200 hover:bg-opacity-20 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}

          {/* Animated Focus Ring */}
          {state.isFocused && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.div>
      </div>

      {/* Dropdowns */}
      <AnimatePresence mode="wait">
        {activeDropdown === 'suggestions' && (
          <motion.div
            key="suggestions-dropdown"
            ref={suggestionsRef}
            className={`absolute top-full left-0 right-0 mt-2 ${currentTheme.dropdown} rounded-xl border max-h-64 overflow-y-auto z-50`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            layout={false}
          >
            {filteredSuggestions.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/30">
                <span className="text-xs font-medium text-gray-400">
                  {filteredSuggestions.length} suggestion{filteredSuggestions.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {(() => {
              return filteredSuggestions.map((suggestion, index) => {
                // Ensure we have a valid suggestion
                if (!suggestion || typeof suggestion !== 'object') {
                  console.warn('Invalid suggestion detected:', suggestion);
                  return null;
                }
                
                const suggestionText = suggestion.title || suggestion.name || suggestion || '';
                if (!suggestionText || typeof suggestionText !== 'string' || suggestionText.trim() === '') {
                  return null;
                }
                
                const suggestionId = suggestion.id || suggestionText || `suggestion-${index}`;
                // Create a robust unique key
                const contentHash = suggestionText ? suggestionText.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                const uniqueKey = `suggestion-${suggestionId || 'unknown'}-${index}-${suggestionText?.substring(0, 10) || 'unknown'}-${contentHash}-${componentId}`;
                
                if (!uniqueKey || uniqueKey.trim() === '') {
                  console.warn('⚠️ Empty key detected for suggestion:', suggestion);
                  return null;
                }
                
                // Get highlighted text parts
                const highlightedParts = highlightMatch(suggestionText, state.query);
                
                return (
                  <motion.button
                    key={uniqueKey}
                    onClick={() => handleSuggestionClick(suggestion, index)}
                    className={`w-full px-4 py-3 text-left ${currentTheme.item} transition-colors ${
                      state.selectedSuggestionIndex === index ? currentTheme.selected : ''
                    }`}
                    whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    layout={false}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="flex-1">
                        {Array.isArray(highlightedParts) ? (
                          highlightedParts.map((part, i) => (
                            <span 
                              key={i} 
                              className={part.highlight ? currentTheme.highlight : ''}
                            >
                              {part.text}
                            </span>
                          ))
                        ) : (
                          suggestionText
                        )}
                      </span>
                      {suggestion.matchScore > 0 && enableFuzzySearch && (
                        <span className="text-xs text-gray-500 ml-2">
                          {Math.round(suggestion.matchScore * 10) / 10}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              }).filter(Boolean);
            })()}
          </motion.div>
        )}
        {activeDropdown === 'history' && (() => {

          return (
            <motion.div
              key="history-dropdown"
              ref={historyRef}
              className={`absolute top-full left-0 right-0 mt-2 ${currentTheme.dropdown} rounded-xl border max-h-64 overflow-y-auto z-50`}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              layout={false}
            >
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-300">Recent Searches</span>
                  <motion.span 
                    className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded-full"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    key={validHistoryItems.length}
                  >
                    {validHistoryItems.length}
                  </motion.span>
                </div>
                {clearHistory && (
                  <button
                    key="clear-history-button"
                    onClick={clearHistory}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    title="Clear all search history"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              {(() => {
                if (validHistoryItems.length === 0) {
                  return (
                    <motion.div
                      key="empty-history"
                      className="px-4 py-6 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">No search history yet</p>
                      <p className="text-xs text-gray-600 mt-1">Your recent searches will appear here</p>
                    </motion.div>
                  );
                }

                return validHistoryItems.map((historyItem, index) => {
                  // Ensure we have a valid history item
                  if (!historyItem || typeof historyItem !== 'string' || historyItem.trim() === '') {
                    return null;
                  }
                  
                  const historyId = historyItem || `history-${index}`;
                  const contentHash = historyItem ? historyItem.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                  const uniqueKey = `history-${historyId || 'unknown'}-${index}-${historyItem?.substring(0, 10) || 'unknown'}-${contentHash}-${componentId}`;
                  
                  if (!uniqueKey || uniqueKey.trim() === '') {
                    console.warn('⚠️ Empty key detected for history item:', historyItem);
                    return null;
                  }
                  
                  return (
                    <motion.div
                      key={uniqueKey}
                      onClick={() => handleHistoryClick(historyItem)}
                      className={`w-full px-4 py-3 text-left ${currentTheme.item} transition-colors group cursor-pointer ${
                        state.selectedSuggestionIndex === filteredSuggestions.length + index ? currentTheme.selected : ''
                      }`}
                      whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.3) }}
                      layout={false}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="flex-1">{historyItem}</span>
                          <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            Press Enter
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleRemoveHistoryItem(historyItem, e)}
                          className="p-1 rounded-full hover:bg-red-500/20 transition-colors"
                          title="Remove from history"
                        >
                          <svg className="w-3 h-3 text-gray-500 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </motion.div>
                  );
                }).filter(Boolean);
              })()}
            </motion.div>
          );
        })()}
        {activeDropdown === 'trending' && (
          <motion.div
            key="trending-dropdown"
            ref={trendingRef}
            className={`absolute top-full left-0 right-0 mt-2 ${currentTheme.dropdown} rounded-xl border max-h-64 overflow-y-auto z-50`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            layout={false}
          >
            <div className="px-4 py-3 border-b border-gray-700 bg-gradient-to-r from-red-900/20 to-orange-900/20">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="text-sm font-medium text-red-300">Trending Searches</span>
                <motion.span 
                  className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded-full"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  key={validTrendingItems.length}
                >
                  {validTrendingItems.length}
                </motion.span>
              </div>
            </div>
            {(() => {
              return validTrendingItems.map((trendingItem, index) => {
                if (!trendingItem || typeof trendingItem !== 'string' || trendingItem.trim() === '') {
                  return null;
                }
                
                const trendingId = trendingItem || `trending-${index}`;
                const contentHash = trendingItem ? trendingItem.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                const uniqueKey = `trending-${trendingId || 'unknown'}-${index}-${trendingItem?.substring(0, 10) || 'unknown'}-${contentHash}-${componentId}`;
                
                if (!uniqueKey || uniqueKey.trim() === '') {
                  console.warn('⚠️ Empty key detected for trending item:', trendingItem);
                  return null;
                }
                
                return (
                  <motion.button
                    key={uniqueKey}
                    onClick={() => handleTrendingClick(trendingItem)}
                    className={`w-full px-4 py-3 text-left ${currentTheme.item} transition-colors ${
                      state.selectedSuggestionIndex === filteredSuggestions.length + validHistoryItems.length + index ? currentTheme.selected : ''
                    }`}
                    whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    layout={false}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="flex-1">{trendingItem}</span>
                      <svg className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </motion.button>
                );
              }).filter(Boolean);
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedSearchBar;
 