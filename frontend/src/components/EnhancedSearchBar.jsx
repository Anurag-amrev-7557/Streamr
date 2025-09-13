import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';

const EnhancedSearchBar = ({
  placeholder = "Search...",
  onSearch,
  onSearchSubmit, // New callback for when search is actually submitted
  onClear,
  onFocus,
  onBlur,
  className = "",
  initialValue = "",
  searchDelay = 50, // Reduced from 100ms to 50ms for faster response
  showSuggestions = true,
  suggestions = [],
  onSuggestionSelect,
  isLoading = false,
  disabled = false,
  variant = "default", // "default", "minimal", "floating"
  size = "md", // "sm", "md", "lg"
  theme = "dark", // "dark", "light"
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
  ...props
}) => {
  // Use a stable identifier for keys that doesn't change on every render
  const componentId = useRef(`search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showTrendingDropdown, setShowTrendingDropdown] = useState(false);
  
  // Ensure only one dropdown is shown at a time - memoized to prevent unnecessary recalculations
  const activeDropdown = useMemo(() => {
    // Early return if no dropdowns should be shown
    if (!showSuggestionsDropdown && !showHistoryDropdown && !showTrendingDropdown) {
      return null;
    }
    
    if (showSuggestionsDropdown && suggestions.length > 0) return 'suggestions';
    if (showHistoryDropdown && searchHistory.length > 0 && showHistory) return 'history';
    if (showTrendingDropdown && trendingSearches.length > 0 && showTrendingSearches) return 'trending';
    return null;
  }, [showSuggestionsDropdown, suggestions.length, showHistoryDropdown, searchHistory.length, showHistory, showTrendingDropdown, trendingSearches.length, showTrendingSearches]);

  // Memoize filtered suggestions to prevent unnecessary re-renders
  const filteredSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    
    return suggestions
      .slice(0, maxSuggestions)
      .filter(suggestion => {
        if (!suggestion || typeof suggestion !== 'object') {
          return false;
        }
        const suggestionText = suggestion.title || suggestion.name || suggestion;
        return suggestionText && typeof suggestionText === 'string' && suggestionText.trim() !== '';
      })
      .filter((suggestion, index, array) => {
        const suggestionId = suggestion.id || suggestion.title || suggestion.name || suggestion;
        return array.findIndex(item => {
          const itemId = item.id || item.title || item.name || item;
          return itemId === suggestionId;
        }) === index;
      })
      .filter(suggestion => {
        const hasValidId = suggestion.id !== undefined && suggestion.id !== null;
        const hasValidTitle = suggestion.title && typeof suggestion.title === 'string' && suggestion.title.trim() !== '';
        return hasValidId || hasValidTitle;
      });
  }, [suggestions, maxSuggestions]);

  // Memoize valid history items to prevent recalculation on every render
  const validHistoryItems = useMemo(() => {
    if (!searchHistory || searchHistory.length === 0) return [];
    
    return searchHistory
      .filter(item => item && typeof item === 'string' && item.trim() !== '')
      // Remove duplicates
      .filter((item, index, array) => array.indexOf(item) === index)
      // Show most recent first (assuming searchHistory is already in reverse chronological order)
      .slice(0, 10); // Limit to 10 most recent items
  }, [searchHistory]);

  // Memoize valid trending items to prevent recalculation on every render
  const validTrendingItems = useMemo(() => {
    if (!trendingSearches || trendingSearches.length === 0) return [];
    
    return trendingSearches
      .filter(item => item && typeof item === 'string' && item.trim() !== '')
      // Remove duplicates
      .filter((item, index, array) => array.indexOf(item) === index);
  }, [trendingSearches]);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const historyRef = useRef(null);
  const trendingRef = useRef(null);

  // Debounced search function for real-time search - use useCallback to prevent recreation
  const debouncedSearch = useCallback(
    debounce((searchQuery) => {
      if (onSearch && searchQuery.trim()) {
        console.log('🔍 Triggering search for:', searchQuery.trim());
        onSearch(searchQuery.trim());
      }
    }, searchDelay),
    [onSearch, searchDelay]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if (debouncedSearch && debouncedSearch.cancel) {
        debouncedSearch.cancel();
      }
    };
  }, [debouncedSearch]);

  // Track timeouts for cleanup
  const timeoutsRef = useRef([]);

  // Cleanup component on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
      
      // Clear refs to prevent memory leaks
      if (inputRef.current) {
        inputRef.current = null;
      }
      if (suggestionsRef.current) {
        suggestionsRef.current = null;
      }
      if (historyRef.current) {
        historyRef.current = null;
      }
      if (trendingRef.current) {
        trendingRef.current = null;
      }
      
      // Clear componentId to prevent memory leaks
      if (componentId.current) {
        componentId.current = null;
      }
    };
  }, []);

  // Function to handle actual search submission (for history)
  const handleSearchSubmit = useCallback((searchQuery) => {
    if (onSearchSubmit && searchQuery.trim()) {
      onSearchSubmit(searchQuery.trim());
    }
  }, [onSearchSubmit]);

  // Handle input change
  const handleInputChange = useCallback((e) => {
    try {
      const value = e.target.value || '';
      console.log('📝 Input changed to:', value);
      setQuery(value);
      setSelectedSuggestionIndex(-1);
      
      if (value.trim()) {
        // Batch state updates to reduce re-renders
        const updates = () => {
          setShowSuggestionsDropdown(true);
          setShowHistoryDropdown(false);
          setShowTrendingDropdown(false);
        };
        updates();
        console.log('🔍 Calling debouncedSearch with:', value);
        debouncedSearch(value);
        
        // Also trigger immediate search for short queries (3+ characters)
        if (value.trim().length >= 3) {
          console.log('⚡ Triggering immediate search for:', value.trim());
          if (onSearch) onSearch(value.trim());
        }
        
        // Fallback: trigger search for any non-empty query after a short delay
        if (value.trim().length > 0) {
          // Clear any existing fallback timeout first
          if (timeoutsRef.current.length > 0) {
            timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            timeoutsRef.current = [];
          }
          const timeoutId = setTimeout(() => {
            if (onSearch) onSearch(value.trim());
          }, 100);
          timeoutsRef.current.push(timeoutId);
        }
      } else {
        setShowSuggestionsDropdown(false);
        setShowHistoryDropdown(false);
        setShowTrendingDropdown(false);
        if (onClear) onClear();
      }
    } catch (error) {
      console.error('Error in handleInputChange:', error);
      // Fallback to safe state
      setQuery('');
      setShowSuggestionsDropdown(false);
      setShowHistoryDropdown(false);
      setShowTrendingDropdown(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [debouncedSearch, onClear, onSearch]);

  // Handle input focus
  const handleFocus = useCallback((e) => {
    try {
      setIsFocused(true);
      // Ensure only one dropdown is shown at a time - batch updates
      if (query.trim()) {
        const updates = () => {
          setShowSuggestionsDropdown(true);
          setShowHistoryDropdown(false);
          setShowTrendingDropdown(false);
        };
        updates();
      } else {
        const updates = () => {
          setShowHistoryDropdown(true);
          setShowTrendingDropdown(showTrendingSearches);
          setShowSuggestionsDropdown(false);
        };
        updates();
      }
      if (onFocus) onFocus(e);
    } catch (error) {
      console.error('Error in handleFocus:', error);
      // Fallback to safe state
      setIsFocused(true);
      setShowSuggestionsDropdown(false);
      setShowHistoryDropdown(false);
      setShowTrendingDropdown(false);
    }
  }, [onFocus, showTrendingSearches, query]);

  // Handle input blur
  const handleBlur = useCallback((e) => {
    // Clear any existing blur timeout first
    if (timeoutsRef.current.length > 0) {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
    }
    
    // Delay to allow for suggestion clicks
    const timeoutId = setTimeout(() => {
      try {
        setIsFocused(false);
        setShowSuggestionsDropdown(false);
        setShowHistoryDropdown(false);
        setShowTrendingDropdown(false);
        setSelectedSuggestionIndex(-1);
        if (onBlur) onBlur(e);
      } catch (error) {
        console.error('Error in handleBlur:', error);
        // Fallback to safe state
        setIsFocused(false);
        setShowSuggestionsDropdown(false);
        setShowHistoryDropdown(false);
        setShowTrendingDropdown(false);
        setSelectedSuggestionIndex(-1);
      }
    }, 150);
    timeoutsRef.current.push(timeoutId);
  }, [onBlur]);

  // Handle key navigation
  const handleKeyDown = useCallback((e) => {
    // Allow default behavior for modifier key combinations (Ctrl, Alt, Meta)
    if (e.ctrlKey || e.altKey || e.metaKey) {
      return; // Let the browser handle Ctrl+A, Ctrl+C, etc.
    }
    
    const validSuggestions = suggestions.filter(suggestion => 
      suggestion && typeof suggestion === 'object' && (suggestion.title || suggestion.name)
    );
    const totalItems = validSuggestions.length + (showHistory ? searchHistory.length : 0) + (showTrendingSearches ? trendingSearches.length : 0);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : -1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          // Handle suggestion selection
          if (selectedSuggestionIndex < validSuggestions.length) {
            const suggestion = validSuggestions[selectedSuggestionIndex];
            if (suggestion && onSuggestionSelect) onSuggestionSelect(suggestion);
          } else if (selectedSuggestionIndex < validSuggestions.length + searchHistory.length) {
            // Handle history selection
            const historyIndex = selectedSuggestionIndex - validSuggestions.length;
            const historyItem = searchHistory[historyIndex];
            if (onHistorySelect) onHistorySelect(historyItem);
          } else {
            // Handle trending selection
            const trendingIndex = selectedSuggestionIndex - validSuggestions.length - searchHistory.length;
            const trendingItem = trendingSearches[trendingIndex];
            if (onTrendingSelect) onTrendingSelect(trendingItem);
          }
        } else if (query.trim()) {
          // Perform search with current query and submit to history
          if (onSearch) onSearch(query.trim());
          handleSearchSubmit(query.trim());
        }
        break;
      case 'Escape':
        // Batch state updates to reduce re-renders
        const updates = () => {
          setShowSuggestionsDropdown(false);
          setShowHistoryDropdown(false);
          setShowTrendingDropdown(false);
          setSelectedSuggestionIndex(-1);
        };
        updates();
        inputRef.current?.blur();
        break;
    }
  }, [suggestions, searchHistory, trendingSearches, selectedSuggestionIndex, query, onSuggestionSelect, onHistorySelect, onTrendingSelect, onSearch, showHistory, showTrendingSearches, handleSearchSubmit]);

  // Handle clear button
  const handleClear = useCallback(() => {
    // Batch state updates to reduce re-renders
    const updates = () => {
      setQuery('');
      setShowSuggestionsDropdown(false);
      setShowHistoryDropdown(false);
      setShowTrendingDropdown(false);
      setSelectedSuggestionIndex(-1);
    };
    updates();
    
    if (onClear) onClear();
    inputRef.current?.focus();
  }, [onClear]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion, index) => {
    // Validate the suggestion object
    if (!suggestion || typeof suggestion !== 'object') {
      console.warn('Invalid suggestion object:', suggestion);
      return;
    }
    
    if (onSuggestionSelect) onSuggestionSelect(suggestion);
    const suggestionText = suggestion?.title || suggestion?.name || suggestion || '';
    
    // Batch state updates to reduce re-renders
    const updates = () => {
      setQuery(suggestionText);
      setShowSuggestionsDropdown(false);
      setSelectedSuggestionIndex(-1);
    };
    updates();
    
    // Submit to history when suggestion is clicked
    handleSearchSubmit(suggestionText);
  }, [onSuggestionSelect, handleSearchSubmit]);

  // Handle history click
  const handleHistoryClick = useCallback((historyItem) => {
    if (onHistorySelect) onHistorySelect(historyItem);
    
    // Batch state updates to reduce re-renders
    const updates = () => {
      setQuery(historyItem || '');
      setShowHistoryDropdown(false);
      setSelectedSuggestionIndex(-1);
    };
    updates();
    
    // Submit to history when history item is clicked
    handleSearchSubmit(historyItem || '');
  }, [onHistorySelect, handleSearchSubmit]);

  // Handle remove individual history item
  const handleRemoveHistoryItem = useCallback((historyItem, e) => {
    e.stopPropagation();
    try {
      // Check if searchHistoryService is available (it might not be imported)
      if (typeof window !== 'undefined' && window.searchHistoryService && typeof window.searchHistoryService.removeFromHistory === 'function') {
        window.searchHistoryService.removeFromHistory(historyItem);
      }
    } catch (error) {
      console.warn('searchHistoryService not available:', error);
    }
  }, []);

  // Handle trending click
  const handleTrendingClick = useCallback((trendingItem) => {
    if (onTrendingSelect) onTrendingSelect(trendingItem);
    
    // Batch state updates to reduce re-renders
    const updates = () => {
      setQuery(trendingItem || '');
      setShowTrendingDropdown(false);
      setSelectedSuggestionIndex(-1);
    };
    updates();
    
    // Submit to history when trending item is clicked
    handleSearchSubmit(trendingItem || '');
  }, [onTrendingSelect, handleSearchSubmit]);

  // Size classes - memoized to prevent recreation on every render
  const sizeClasses = useMemo(() => ({
    sm: "h-9 px-3 text-sm",
    md: "h-12 px-4 text-base",
    lg: "h-14 px-5 text-lg"
  }), []);

  // Theme classes - memoized to prevent recreation on every render
  const themeClasses = useMemo(() => ({
    dark: {
      input: "bg-[#2b3036] text-white placeholder-gray-400 border-gray-600 focus:border-white/30 focus:ring-white/20",
      dropdown: "bg-[#1a1a1a] border-gray-700 shadow-xl",
      item: "text-gray-300 hover:bg-[#2b3036] hover:text-white",
      selected: "bg-[#2b3036] text-white"
    },
    light: {
      input: "bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:border-blue-500 focus:ring-blue-200",
      dropdown: "bg-white border-gray-200 shadow-lg",
      item: "text-gray-700 hover:bg-gray-50",
      selected: "bg-blue-50 text-blue-900"
    }
  }), []);

  // Variant classes - memoized to prevent recreation on every render
  const variantClasses = useMemo(() => ({
    default: "rounded-full border",
    minimal: "rounded-full border-0 bg-transparent",
    floating: "rounded-full border shadow-lg"
  }), []);

  const currentTheme = themeClasses[theme];
  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <motion.div
          className={`relative flex items-center ${currentVariant} ${currentTheme.input} ${currentSize} transition-all duration-300 ${
            isFocused ? 'ring-2 ring-opacity-50' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              onError={(error) => {
                console.warn('Animation error in search icon:', error);
              }}
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
            value={query || ''}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            name="search-input"
            id="search-input"
            className={`w-full bg-transparent outline-none ${showSearchIcon ? 'pl-10' : 'pl-4'} pr-12`}
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
          {showClearButton && query && !isLoading && (
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
          {isFocused && (
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
      <AnimatePresence>
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
                // Create a more robust unique key using multiple properties and a stable hash
                const contentHash = suggestionText ? suggestionText.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                const uniqueKey = `suggestion-${suggestionId || 'unknown'}-${index}-${suggestionText?.substring(0, 10) || 'unknown'}-${contentHash}-${componentId.current}`;
                
                // Ensure we never have an empty key
                if (!uniqueKey || uniqueKey.trim() === '') {
                  console.warn('Empty key detected for suggestion:', suggestion);
                  return null;
                }
                return (
                  <motion.button
                    key={uniqueKey}
                    onClick={() => handleSuggestionClick(suggestion, index)}
                    className={`w-full px-4 py-3 text-left ${currentTheme.item} transition-colors ${
                      selectedSuggestionIndex === index ? currentTheme.selected : ''
                    }`}
                    whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    layout={false}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>{suggestionText}</span>
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
                  
                  // Ensure we don't have duplicate items
                  if (index > 0 && validHistoryItems.slice(0, index).includes(historyItem)) {
                    return null;
                  }
                  
                  const historyId = historyItem || `history-${index}`;
                  // Create a more robust unique key using multiple properties and a stable hash
                  const contentHash = historyItem ? historyItem.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                  const uniqueKey = `history-${historyId || 'unknown'}-${index}-${historyItem?.substring(0, 10) || 'unknown'}-${contentHash}-${componentId.current}`;
                  
                  // Ensure we never have an empty key
                  if (!uniqueKey || uniqueKey.trim() === '') {
                    console.warn('Empty key detected for history item:', historyItem);
                    return null;
                  }
                  return (
                    <motion.div
                      key={uniqueKey}
                      onClick={() => handleHistoryClick(historyItem)}
                      className={`w-full px-4 py-3 text-left ${currentTheme.item} transition-colors group ${
                        selectedSuggestionIndex === suggestions.length + index ? currentTheme.selected : ''
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
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{historyItem}</span>
                          <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            Recently used
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
            <div className="px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">Trending</span>
            </div>
            {(() => {
              // Use the memoized validTrendingItems instead of recalculating

              return validTrendingItems.map((trendingItem, index) => {
                // Ensure we have a valid trending item
                if (!trendingItem || typeof trendingItem !== 'string' || trendingItem.trim() === '') {
                  return null;
                }
                
                // Ensure we don't have duplicate items
                if (index > 0 && validTrendingItems.slice(0, index).includes(trendingItem)) {
                  return null;
                }
                
                const trendingId = trendingItem || `trending-${index}`;
                // Create a more robust unique key using multiple properties and a stable hash
                const contentHash = trendingItem ? trendingItem.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                const uniqueKey = `trending-${trendingId || 'unknown'}-${index}-${trendingItem?.substring(0, 10) || 'unknown'}-${contentHash}-${componentId.current}`;
                
                // Ensure we never have an empty key
                if (!uniqueKey || uniqueKey.trim() === '') {
                  console.warn('Empty key detected for trending item:', trendingItem);
                  return null;
                }
                return (
                  <motion.button
                    key={uniqueKey}
                    onClick={() => handleTrendingClick(trendingItem)}
                    className={`w-full px-4 py-3 text-left ${currentTheme.item} transition-colors ${
                      selectedSuggestionIndex === suggestions.length + searchHistory.length + index ? currentTheme.selected : ''
                    }`}
                    whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    layout={false}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span>{trendingItem}</span>
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