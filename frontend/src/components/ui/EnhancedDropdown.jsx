import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EnhancedDropdown = ({
  options = [],
  selectedValue = null,
  onSelect,
  placeholder = "Select option",
  searchable = false,
  multiSelect = false,
  maxHeight = "60vh",
  className = "",
  disabled = false,
  icon = null,
  showClear = true,
  groupBy = null,
  renderOption = null,
  renderSelected = null,
  onSearch = null,
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  loading = false,
  error = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return options;
    }
    
    const query = searchQuery.toLowerCase();
    return options.filter(option => {
      const searchText = typeof option === 'string' ? option : option.label || option.name || option;
      return searchText.toLowerCase().includes(query);
    });
  }, [options, searchQuery, searchable]);

  // Group options if groupBy is provided
  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return filteredOptions;
    
    const groups = {};
    filteredOptions.forEach(option => {
      const groupKey = option[groupBy] || 'Other';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(option);
    });
    
    return groups;
  }, [filteredOptions, groupBy]);

  // Handle option selection
  const handleSelect = useCallback((option) => {
    if (disabled) return;
    
    if (multiSelect) {
      const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
      const isSelected = currentValues.some(val => 
        (typeof val === 'object' ? val.value || val.id : val) === 
        (typeof option === 'object' ? option.value || option.id : option)
      );
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => 
          (typeof val === 'object' ? val.value || val.id : val) !== 
          (typeof option === 'object' ? option.value || option.id : option)
        );
        onSelect(newValues);
      } else {
        // Add to selection
        onSelect([...currentValues, option]);
      }
    } else {
      onSelect(option);
      setIsOpen(false);
      setSearchQuery('');
    }
  }, [disabled, multiSelect, selectedValue, onSelect]);

  // Handle clear selection
  const handleClear = useCallback((e) => {
    e.stopPropagation();
    if (disabled) return;
    onSelect(multiSelect ? [] : null);
  }, [disabled, multiSelect, onSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        if (searchable && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
    }
  }, [isOpen, filteredOptions, focusedIndex, handleSelect]);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFocusedIndex(-1);
    if (onSearch) {
      onSearch(query);
    }
  }, [onSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus management
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Scroll to focused option
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [focusedIndex]);

  // Reset focused index when options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredOptions]);

  // Render option content
  const renderOptionContent = (option, index) => {
    if (renderOption) {
      return renderOption(option, index);
    }
    
    const displayText = typeof option === 'string' ? option : option.label || option.name || option.title || option;
    const value = typeof option === 'object' ? option.value || option.id : option;
    
    return (
      <span className="truncate">
        {displayText}
      </span>
    );
  };

  // Render selected value
  const renderSelectedContent = () => {
    if (renderSelected) {
      return renderSelected(selectedValue);
    }
    
    if (multiSelect && Array.isArray(selectedValue)) {
      if (selectedValue.length === 0) {
        return <span className="text-gray-400">{placeholder}</span>;
      }
      if (selectedValue.length === 1) {
        const option = selectedValue[0];
        const displayText = typeof option === 'string' ? option : option.label || option.name || option;
        return (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-black rounded-full"></span>
            {displayText}
          </span>
        );
      }
      return (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-black rounded-full"></span>
          {selectedValue.length} selected
        </span>
      );
    }
    
    if (!selectedValue) {
      return <span className="text-gray-400">{placeholder}</span>;
    }
    
    const displayText = typeof selectedValue === 'string' ? selectedValue : selectedValue.label || selectedValue.name || selectedValue;
    return (
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 bg-black rounded-full"></span>
        {displayText}
      </span>
    );
  };

  // Check if option is selected
  const isSelected = (option) => {
    if (multiSelect && Array.isArray(selectedValue)) {
      return selectedValue.some(val => 
        (typeof val === 'object' ? val.value || val.id : val) === 
        (typeof option === 'object' ? option.value || option.id : option)
      );
    }
    
    if (!selectedValue) return false;
    
    return (typeof selectedValue === 'object' ? selectedValue.value || selectedValue.id : selectedValue) === 
           (typeof option === 'object' ? option.value || option.id : option);
  };

  return (
    <>
      <style>
        {`
          .enhanced-dropdown-scroll::-webkit-scrollbar {
            display: none;
          }
          .enhanced-dropdown-button {
            outline: none !important;
            box-shadow: none !important;
            -webkit-tap-highlight-color: transparent !important;
            -webkit-focus-ring-color: transparent !important;
          }
          .enhanced-dropdown-button:focus {
            outline: none !important;
            box-shadow: none !important;
          }
          .enhanced-dropdown-button:active {
            outline: none !important;
            box-shadow: none !important;
          }
          .enhanced-dropdown-button:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }
          .enhanced-dropdown-option {
            outline: none !important;
            box-shadow: none !important;
            -webkit-tap-highlight-color: transparent !important;
            -webkit-focus-ring-color: transparent !important;
          }
          .enhanced-dropdown-option:focus {
            outline: none !important;
            box-shadow: none !important;
          }
          .enhanced-dropdown-option:active {
            outline: none !important;
            box-shadow: none !important;
          }
          .enhanced-dropdown-option:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }
        `}
      </style>
      <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Button */}
      <motion.button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          enhanced-dropdown-button flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium 
          transition-all duration-300 focus:outline-none focus:ring-0 active:outline-none active:ring-0
          ${isOpen ? 'text-black' : 'text-gray-400 hover:text-white'} 
          bg-[#1a1a1a]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          relative overflow-hidden
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={placeholder}
      >
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              key="dropdown-bg-open"
              layoutId="activeDropdownBg"
              className="absolute inset-0 bg-white rounded-full z-0"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1]
              }}
            />
          ) : (
            <motion.div
              key="dropdown-bg-hover"
              className="absolute inset-0 rounded-full z-0"
              initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.13)' }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
        {icon && <span className="flex-shrink-0 relative z-10">{icon}</span>}
        <span className="relative z-10">{renderSelectedContent()}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 relative z-10 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {showClear && selectedValue && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClear(e);
            }}
            className="enhanced-dropdown-button ml-1 p-1 hover:bg-gray-800 rounded-full transition-colors focus:outline-none focus:ring-0 active:outline-none active:ring-0 cursor-pointer"
            aria-label="Clear selection"
            role="button"
            tabIndex={0}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full min-w-[180px] bg-[#0F0F0F] rounded-3xl shadow-2xl border border-white/5 border-1"
            style={{ maxHeight }}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-3 border-b border-gray-800">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  className="w-full px-3 py-2 bg-[#1a1a1a] text-white rounded-2xl text-sm focus:outline-none focus:ring-0 border border-gray-700"
                />
              </div>
            )}

            {/* Clear All Button */}
            {multiSelect && Array.isArray(selectedValue) && selectedValue.length > 0 && (
              <div className="p-2 border-b border-gray-800">
                <button
                  onClick={() => onSelect([])}
                  className="enhanced-dropdown-option w-full px-3 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors focus:outline-none focus:ring-0 active:outline-none active:ring-0"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Options List */}
            <div 
              className="max-h-60 overflow-y-auto enhanced-dropdown-scroll"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {loading ? (
                <div className="px-4 py-8 text-center text-gray-300">
                  <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                  <p className="mt-2 text-sm">Loading...</p>
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center text-red-400">
                  <p className="text-sm">{error}</p>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-300">
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              ) : groupBy ? (
                // Grouped options
                Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                  <div key={groupName}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide sticky top-0 bg-[#0F0F0F]">
                      {groupName}
                    </div>
                    {groupOptions.map((option, index) => {
                      const globalIndex = filteredOptions.indexOf(option);
                      return (
                        <button
                          key={typeof option === 'object' ? option.id || option.value : option}
                          ref={el => optionRefs.current[globalIndex] = el}
                          onClick={() => handleSelect(option)}
                        className={`
                          enhanced-dropdown-option w-full px-4 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-0 active:outline-none active:ring-0
                          ${index === 0 ? 'rounded-t-3xl' : ''}
                          ${index === groupOptions.length - 1 ? 'rounded-b-3xl' : ''}
                          ${isSelected(option) 
                            ? 'text-white bg-gray-800' 
                            : 'text-gray-300 hover:text-white hover:bg-gray-800'
                          }
                        `}
                        >
                          {renderOptionContent(option, globalIndex)}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                // Regular options
                filteredOptions.map((option, index) => (
                  <button
                    key={typeof option === 'object' ? option.id || option.value : option}
                    ref={el => optionRefs.current[index] = el}
                    onClick={() => handleSelect(option)}
                    className={`
                      enhanced-dropdown-option w-full px-4 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-0 active:outline-none active:ring-0
                      ${index === 0 ? 'rounded-t-3xl' : ''}
                      ${index === filteredOptions.length - 1 ? 'rounded-b-3xl' : ''}
                      ${isSelected(option) 
                        ? 'text-white bg-gray-800' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }
                    `}
                  >
                    {renderOptionContent(option, index)}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};

export default EnhancedDropdown;
