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
  searchDelay = 300,
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
  // Add a stable identifier for keys
  const componentId = useRef(Math.random().toString(36).substr(2, 9));
  
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showTrendingDropdown, setShowTrendingDropdown] = useState(false);
  
  // Ensure only one dropdown is shown at a time
  const activeDropdown = useMemo(() => {
    if (showSuggestionsDropdown && suggestions.length > 0) return 'suggestions';
    if (showHistoryDropdown && searchHistory.length > 0 && showHistory) return 'history';
    if (showTrendingDropdown && trendingSearches.length > 0 && showTrendingSearches) return 'trending';
    return null;
  }, [showSuggestionsDropdown, suggestions.length, showHistoryDropdown, searchHistory.length, showHistory, showTrendingDropdown, trendingSearches.length, showTrendingSearches]);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const historyRef = useRef(null);
  const trendingRef = useRef(null);

  // Debounced search function for real-time search
  const debouncedSearch = useMemo(
    () => debounce((searchQuery) => {
      if (onSearch && searchQuery.trim()) {
        onSearch(searchQuery.trim());
      }
    }, searchDelay),
    [onSearch, searchDelay]
  );

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
      setQuery(value);
      setSelectedSuggestionIndex(-1);
      
      if (value.trim()) {
        setShowSuggestionsDropdown(true);
        setShowHistoryDropdown(false);
        setShowTrendingDropdown(false);
        debouncedSearch(value);
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
  }, [debouncedSearch, onClear]);

  // Handle input focus
  const handleFocus = useCallback((e) => {
    try {
      setIsFocused(true);
      // Ensure only one dropdown is shown at a time
      if (query.trim()) {
        setShowSuggestionsDropdown(true);
        setShowHistoryDropdown(false);
        setShowTrendingDropdown(false);
      } else {
        setShowHistoryDropdown(true);
        setShowTrendingDropdown(showTrendingSearches);
        setShowSuggestionsDropdown(false);
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
    // Delay to allow for suggestion clicks
    setTimeout(() => {
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
        setShowSuggestionsDropdown(false);
        setShowHistoryDropdown(false);
        setShowTrendingDropdown(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [suggestions, searchHistory, trendingSearches, selectedSuggestionIndex, query, onSuggestionSelect, onHistorySelect, onTrendingSelect, onSearch, showHistory, showTrendingSearches]);

  // Handle clear button
  const handleClear = useCallback(() => {
    setQuery('');
    setShowSuggestionsDropdown(false);
    setShowHistoryDropdown(false);
    setShowTrendingDropdown(false);
    setSelectedSuggestionIndex(-1);
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
    setQuery(suggestionText);
    setShowSuggestionsDropdown(false);
    setSelectedSuggestionIndex(-1);
    // Submit to history when suggestion is clicked
    handleSearchSubmit(suggestionText);
  }, [onSuggestionSelect, handleSearchSubmit]);

  // Handle history click
  const handleHistoryClick = useCallback((historyItem) => {
    if (onHistorySelect) onHistorySelect(historyItem);
    setQuery(historyItem || '');
    setShowHistoryDropdown(false);
    setSelectedSuggestionIndex(-1);
    // Submit to history when history item is clicked
    handleSearchSubmit(historyItem || '');
  }, [onHistorySelect, handleSearchSubmit]);

  // Handle remove individual history item
  const handleRemoveHistoryItem = useCallback((historyItem, e) => {
    e.stopPropagation();
    if (searchHistoryService && typeof searchHistoryService.removeFromHistory === 'function') {
      searchHistoryService.removeFromHistory(historyItem);
    }
  }, []);

  // Handle trending click
  const handleTrendingClick = useCallback((trendingItem) => {
    if (onTrendingSelect) onTrendingSelect(trendingItem);
    setQuery(trendingItem || '');
    setShowTrendingDropdown(false);
    setSelectedSuggestionIndex(-1);
    // Submit to history when trending item is clicked
    handleSearchSubmit(trendingItem || '');
  }, [onTrendingSelect, handleSearchSubmit]);

  // Size classes
  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-12 px-4 text-base",
    lg: "h-14 px-5 text-lg"
  };

  // Theme classes
  const themeClasses = {
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
  };

  // Variant classes
  const variantClasses = {
    default: "rounded-xl border",
    minimal: "rounded-lg border-0 bg-transparent",
    floating: "rounded-2xl border shadow-lg"
  };

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
          whileHover={{ scale: disabled ? 1 : 1.01 }}
          whileTap={{ scale: disabled ? 1 : 0.99 }}
        >
          {/* Search Icon */}
          {showSearchIcon && (
            <motion.div
              className="absolute left-3 text-gray-400"
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
            value={query || ''}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
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
        {/* Suggestions Dropdown */}
        {activeDropdown === 'suggestions' && (
          <motion.div
            key="suggestions-dropdown"
            ref={suggestionsRef}
            className={`absolute top-full left-0 right-0 mt-2 ${currentTheme.dropdown} rounded-xl border max-h-64 overflow-y-auto z-50`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {(() => {
              const validSuggestions = suggestions
                .slice(0, maxSuggestions)
                .filter(suggestion => {
                  // Ensure suggestion is a valid object
                  if (!suggestion || typeof suggestion !== 'object') {
                    return false;
                  }
                  // Ensure it has a valid text property
                  const suggestionText = suggestion.title || suggestion.name || suggestion;
                  return suggestionText && typeof suggestionText === 'string' && suggestionText.trim() !== '';
                })
                // Remove duplicates based on ID or title
                .filter((suggestion, index, array) => {
                  const suggestionId = suggestion.id || suggestion.title || suggestion.name || suggestion;
                  return array.findIndex(item => {
                    const itemId = item.id || item.title || item.name || item;
                    return itemId === suggestionId;
                  }) === index;
                })
                // Additional validation to ensure all suggestions have required properties
                .filter(suggestion => {
                  const hasValidId = suggestion.id !== undefined && suggestion.id !== null;
                  const hasValidTitle = suggestion.title && typeof suggestion.title === 'string' && suggestion.title.trim() !== '';
                  return hasValidId || hasValidTitle;
                });

              return validSuggestions.map((suggestion, index) => {
                // Ensure we have a valid suggestion
                if (!suggestion || typeof suggestion !== 'object') {
                  console.warn('Invalid suggestion detected:', suggestion);
                  return null;
                }
                
                // Add component ID to ensure uniqueness
                const renderId = componentId.current;
                
                const suggestionText = suggestion.title || suggestion.name || suggestion || '';
                if (!suggestionText || typeof suggestionText !== 'string' || suggestionText.trim() === '') {
                  return null;
                }
                
                const suggestionId = suggestion.id || suggestionText || `suggestion-${index}`;
                // Create a more robust unique key using multiple properties and a stable hash
                const contentHash = suggestionText ? suggestionText.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                const uniqueKey = `suggestion-${suggestionId || 'unknown'}-${index}-${suggestionText?.substring(0, 10) || 'unknown'}-${contentHash}-${renderId}`;
                
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
                    transition={{ delay: index * 0.05 }}
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

        {/* History Dropdown */}
        {activeDropdown === 'history' && (() => {
          const validHistoryItems = searchHistory
            .filter(item => item && typeof item === 'string' && item.trim() !== '')
            // Remove duplicates
            .filter((item, index, array) => array.indexOf(item) === index)
            // Show most recent first (assuming searchHistory is already in reverse chronological order)
            .slice(0, 10); // Limit to 10 most recent items

          return (
            <motion.div
              key="history-dropdown"
              ref={historyRef}
              className={`absolute top-full left-0 right-0 mt-2 ${currentTheme.dropdown} rounded-xl border max-h-64 overflow-y-auto z-50`}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
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
                
                // Add component ID to ensure uniqueness
                const renderId = componentId.current;
                
                const historyId = historyItem || `history-${index}`;
                // Create a more robust unique key using multiple properties and a stable hash
                const contentHash = historyItem ? historyItem.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                const uniqueKey = `history-${historyId || 'unknown'}-${index}-${historyItem?.substring(0, 10) || 'unknown'}-${contentHash}-${renderId}`;
                
                // Ensure we never have an empty key
                if (!uniqueKey || uniqueKey.trim() === '') {
                  return null;
                }
                return (
                  <motion.button
                    key={uniqueKey}
                    onClick={() => handleHistoryClick(historyItem)}
                    className={`w-full px-4 py-3 text-left ${currentTheme.item} transition-all duration-200 ${
                      selectedSuggestionIndex === suggestions.length + index ? currentTheme.selected : ''
                    }`}
                    whileHover={{ 
                      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      scale: 1.02,
                      x: 5
                    }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                          <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-300 group-hover:text-white transition-colors truncate block font-medium">
                            {historyItem}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                              Click to search
                            </span>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                              Recently used
                            </span>
                          </div>
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
                    </div>
                  </motion.button>
                );
              }).filter(Boolean);
            })()}
          </motion.div>
        )}
        )}

        {/* Trending Searches Dropdown */}
        {activeDropdown === 'trending' && (
          <motion.div
            key="trending-dropdown"
            ref={trendingRef}
            className={`absolute top-full left-0 right-0 mt-2 ${currentTheme.dropdown} rounded-xl border max-h-64 overflow-y-auto z-50`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-400">Trending</span>
            </div>
            {(() => {
              const validTrendingItems = trendingSearches
                .filter(item => item && typeof item === 'string' && item.trim() !== '')
                // Remove duplicates
                .filter((item, index, array) => array.indexOf(item) === index);

              return validTrendingItems.map((trendingItem, index) => {
                // Ensure we have a valid trending item
                if (!trendingItem || typeof trendingItem !== 'string' || trendingItem.trim() === '') {
                  return null;
                }
                
                // Ensure we don't have duplicate items
                if (index > 0 && validTrendingItems.slice(0, index).includes(trendingItem)) {
                  return null;
                }
                
                // Add component ID to ensure uniqueness
                const renderId = componentId.current;
                
                const trendingId = trendingItem || `trending-${index}`;
                // Create a more robust unique key using multiple properties and a stable hash
                const contentHash = trendingItem ? trendingItem.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : index;
                const uniqueKey = `trending-${trendingId || 'unknown'}-${index}-${trendingItem?.substring(0, 10) || 'unknown'}-${contentHash}-${renderId}`;
                
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
                    transition={{ delay: index * 0.05 }}
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