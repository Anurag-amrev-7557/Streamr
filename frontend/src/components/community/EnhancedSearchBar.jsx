import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '../../hooks/useDebounce';

const EnhancedSearchBar = ({ 
  searchQuery, 
  onSearch, 
  onClear, 
  onFilterChange, 
  filters = {},
  savedSearches = [],
  onSaveSearch,
  onLoadSavedSearch,
  onDeleteSavedSearch
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [localFilters, setLocalFilters] = useState(filters);
  const [isTyping, setIsTyping] = useState(false);
  
  const debouncedQuery = useDebounce(localQuery, 300);
  const searchInputRef = useRef(null);
  const filtersRef = useRef(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery !== searchQuery) {
      onSearch(debouncedQuery, localFilters);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFilters(false);
        setShowSavedSearches(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(localQuery, localFilters);
    setIsTyping(false);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    setLocalQuery('');
    setLocalFilters({});
    onClear();
    setIsTyping(false);
  };

  const handleSaveSearch = () => {
    if (localQuery.trim() || Object.keys(localFilters).length > 0) {
      const searchName = prompt('Enter a name for this search:');
      if (searchName) {
        onSaveSearch({
          name: searchName,
          query: localQuery,
          filters: localFilters,
          timestamp: Date.now()
        });
      }
    }
  };

  const hasActiveFilters = Object.values(localFilters).some(v => v && v !== '');

  return (
    <div className="relative w-full" ref={filtersRef}>
      {/* Main Search Bar */}
      <div className="relative">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center">
            {/* Search Icon */}
            <div className="absolute left-3 text-white/60">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Search Input */}
            <input
              ref={searchInputRef}
              type="text"
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                setIsTyping(true);
              }}
              onFocus={() => setIsExpanded(true)}
              placeholder="Search discussions, users, or content..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-20 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all duration-200"
            />

            {/* Action Buttons */}
            <div className="absolute right-2 flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-full transition-colors ${
                  hasActiveFilters 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Advanced Filters"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
              </button>

              {/* Saved Searches */}
              <button
                type="button"
                onClick={() => setShowSavedSearches(!showSavedSearches)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Saved Searches"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              {/* Clear Button */}
              {(localQuery || hasActiveFilters) && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Clear Search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Search Button */}
              <button
                type="submit"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors font-medium"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex flex-wrap gap-2"
          >
            {Object.entries(localFilters).map(([key, value]) => {
              if (!value || value === '') return null;
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full border border-blue-500/30"
                >
                  <span className="capitalize">{key}: {value}</span>
                  <button
                    onClick={() => handleFilterChange(key, '')}
                    className="text-blue-300 hover:text-blue-100 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d21] border border-white/10 rounded-lg shadow-xl z-50 p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Date Range</label>
                <select
                  value={localFilters.dateRange || ''}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Any time</option>
                  <option value="1h">Last hour</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="1y">Last year</option>
                </select>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Content Type</label>
                <select
                  value={localFilters.contentType || ''}
                  onChange={(e) => handleFilterChange('contentType', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">All content</option>
                  <option value="discussion">Discussions only</option>
                  <option value="reply">Replies only</option>
                  <option value="media">With media</option>
                </select>
              </div>

              {/* Engagement Level */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Engagement</label>
                <select
                  value={localFilters.engagement || ''}
                  onChange={(e) => handleFilterChange('engagement', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Any engagement</option>
                  <option value="high">High engagement</option>
                  <option value="medium">Medium engagement</option>
                  <option value="low">Low engagement</option>
                </select>
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Author</label>
                <input
                  type="text"
                  value={localFilters.author || ''}
                  onChange={(e) => handleFilterChange('author', e.target.value)}
                  placeholder="Username"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Has Replies */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Has Replies</label>
                <select
                  value={localFilters.hasReplies || ''}
                  onChange={(e) => handleFilterChange('hasReplies', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Any</option>
                  <option value="true">Has replies</option>
                  <option value="false">No replies</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Sort By</label>
                <select
                  value={localFilters.sortBy || ''}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Relevance</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="popular">Most popular</option>
                  <option value="trending">Trending</option>
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => setLocalFilters({})}
                className="text-white/60 hover:text-white transition-colors"
              >
                Reset Filters
              </button>
              <button
                onClick={handleSaveSearch}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors border border-blue-500/30"
              >
                Save Search
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Searches Panel */}
      <AnimatePresence>
        {showSavedSearches && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d21] border border-white/10 rounded-lg shadow-xl z-50 p-4 max-h-64 overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Saved Searches</h3>
            {savedSearches.length === 0 ? (
              <p className="text-white/60 text-center py-4">No saved searches yet</p>
            ) : (
              <div className="space-y-2">
                {savedSearches.map((search, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{search.name}</span>
                        <span className="text-xs text-white/40">
                          {new Date(search.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-white/60 mt-1">
                        {search.query && `"${search.query}"`}
                        {Object.entries(search.filters).map(([key, value]) => 
                          value ? ` • ${key}: ${value}` : null
                        ).filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setLocalQuery(search.query);
                          setLocalFilters(search.filters);
                          onLoadSavedSearch(search);
                          setShowSavedSearches(false);
                        }}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Load Search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteSavedSearch(index)}
                        className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                        title="Delete Search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedSearchBar; 