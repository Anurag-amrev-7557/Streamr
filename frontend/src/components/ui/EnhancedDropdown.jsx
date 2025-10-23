import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
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
  error = null,
  closeOnSelect = true,
  virtualized = false,
  debounceSearch = 300,
  highlightMatches = true,
  sortOptions = false,
  allowCustomValue = false,
  maxSelections = null,
  position = 'bottom',
  align = 'left',
  portal = false,
  onOpen = null,
  onClose = null,
  onChange = null,
  filterFunction = null,
  caseSensitive = false,
  minSearchLength = 0,
  showSelectAll = false,
  keepSearchOnSelect = false,
  autoFocus = false,
  validateSelection = null,
  customStyles = {},
  badges = false,
  size = 'medium'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [localError, setLocalError] = useState(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);
  const searchTimeoutRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownId = useId();
  const listboxId = `${dropdownId}-listbox`;
  const searchId = `${dropdownId}-search`;

  // Normalize option for comparison
  const normalizeOption = useCallback((option) => {
    if (option === null || option === undefined) return null;
    if (typeof option === 'string' || typeof option === 'number') return option;
    return option.value ?? option.id ?? option;
  }, []);

  // Get display text from option
  const getDisplayText = useCallback((option) => {
    if (option === null || option === undefined) return '';
    if (typeof option === 'string' || typeof option === 'number') return String(option);
    return String(option.label ?? option.name ?? option.title ?? option.value ?? option.id ?? option);
  }, []);

  // Advanced filter function with fuzzy matching
  const defaultFilterFunction = useCallback((option, query) => {
    const text = getDisplayText(option);
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    
    if (!highlightMatches) {
      return searchText.includes(searchTerm);
    }
    
    // Fuzzy matching: check if all characters in query appear in order
    let queryIndex = 0;
    for (let i = 0; i < searchText.length && queryIndex < searchTerm.length; i++) {
      if (searchText[i] === searchTerm[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === searchTerm.length;
  }, [caseSensitive, highlightMatches, getDisplayText]);

  // Filter options based on search query with debouncing
  const filteredOptions = useMemo(() => {
    if (!searchable || searchQuery.trim().length < minSearchLength) {
      return options;
    }
    
    const query = searchQuery.trim();
    const filterFn = filterFunction || defaultFilterFunction;
    
    const filtered = options.filter(option => filterFn(option, query));
    
    if (sortOptions && query) {
      return filtered.sort((a, b) => {
        const aText = getDisplayText(a);
        const bText = getDisplayText(b);
        const aIndex = aText.toLowerCase().indexOf(query.toLowerCase());
        const bIndex = bText.toLowerCase().indexOf(query.toLowerCase());
        
        if (aIndex === 0 && bIndex !== 0) return -1;
        if (bIndex === 0 && aIndex !== 0) return 1;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return aText.localeCompare(bText);
      });
    }
    
    return filtered;
  }, [options, searchQuery, searchable, minSearchLength, filterFunction, defaultFilterFunction, sortOptions, getDisplayText]);

  // Group options if groupBy is provided
  const groupedOptions = useMemo(() => {
    if (!groupBy) return null;
    
    const groups = {};
    filteredOptions.forEach(option => {
      const groupKey = typeof groupBy === 'function' 
        ? groupBy(option) 
        : (option[groupBy] || 'Other');
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(option);
    });
    
    // Sort groups alphabetically
    const sortedGroups = Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {});
    
    return sortedGroups;
  }, [filteredOptions, groupBy]);

  // Check if option is selected
  const isSelected = useCallback((option) => {
    if (multiSelect && Array.isArray(selectedValue)) {
      return selectedValue.some(val => {
        const normalizedVal = normalizeOption(val);
        const normalizedOption = normalizeOption(option);
        return normalizedVal === normalizedOption;
      });
    }
    
    if (!selectedValue) return false;
    
    const normalizedVal = normalizeOption(selectedValue);
    const normalizedOption = normalizeOption(option);
    return normalizedVal === normalizedOption;
  }, [multiSelect, selectedValue, normalizeOption]);

  // Validate selection
  const validateAndSelect = useCallback((value) => {
    if (validateSelection) {
      const validationResult = validateSelection(value);
      if (validationResult !== true) {
        setLocalError(typeof validationResult === 'string' ? validationResult : 'Invalid selection');
        return false;
      }
    }
    setLocalError(null);
    return true;
  }, [validateSelection]);

  // Handle option selection with advanced logic
  const handleSelect = useCallback((option) => {
    if (disabled) return;
    
    if (multiSelect) {
      const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
      const optionIsSelected = isSelected(option);
      
      if (optionIsSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => {
          const normalizedVal = normalizeOption(val);
          const normalizedOption = normalizeOption(option);
          return normalizedVal !== normalizedOption;
        });
        
        if (!validateAndSelect(newValues)) return;
        onSelect(newValues);
        onChange?.(newValues, 'remove', option);
      } else {
        // Check max selections limit
        if (maxSelections && currentValues.length >= maxSelections) {
          setLocalError(`Maximum ${maxSelections} selections allowed`);
          setTimeout(() => setLocalError(null), 3000);
          return;
        }
        
        // Add to selection
        const newValues = [...currentValues, option];
        if (!validateAndSelect(newValues)) return;
        onSelect(newValues);
        onChange?.(newValues, 'add', option);
        
        if (closeOnSelect && !keepSearchOnSelect) {
          setIsOpen(false);
          setSearchQuery('');
        } else if (!keepSearchOnSelect) {
          setSearchQuery('');
        }
      }
    } else {
      if (!validateAndSelect(option)) return;
      onSelect(option);
      onChange?.(option, 'select', option);
      
      if (closeOnSelect) {
        setIsOpen(false);
        if (!keepSearchOnSelect) {
          setSearchQuery('');
        }
      }
    }
    
    setFocusedIndex(-1);
  }, [disabled, multiSelect, selectedValue, isSelected, onSelect, onChange, closeOnSelect, 
      keepSearchOnSelect, validateAndSelect, maxSelections, normalizeOption]);

  // Handle clear selection
  const handleClear = useCallback((e) => {
    e?.stopPropagation();
    if (disabled) return;
    const newValue = multiSelect ? [] : null;
    if (!validateAndSelect(newValue)) return;
    onSelect(newValue);
    onChange?.(newValue, 'clear');
    setSearchQuery('');
  }, [disabled, multiSelect, onSelect, onChange, validateAndSelect]);

  // Handle select all for multi-select
  const handleSelectAll = useCallback(() => {
    if (!multiSelect || disabled) return;
    const allValues = filteredOptions;
    if (!validateAndSelect(allValues)) return;
    onSelect(allValues);
    onChange?.(allValues, 'select-all');
  }, [multiSelect, disabled, filteredOptions, onSelect, onChange, validateAndSelect]);

  // Handle keyboard navigation with advanced features
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleDropdownOpen();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return nextIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const prevIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return prevIndex;
        });
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(filteredOptions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[focusedIndex]);
        } else if (allowCustomValue && searchQuery.trim()) {
          handleSelect(searchQuery.trim());
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleDropdownClose();
        break;
      case 'Tab':
        handleDropdownClose();
        break;
      case 'a':
        if ((e.ctrlKey || e.metaKey) && multiSelect && showSelectAll) {
          e.preventDefault();
          handleSelectAll();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (!searchQuery && multiSelect && Array.isArray(selectedValue) && selectedValue.length > 0) {
          e.preventDefault();
          const newValues = selectedValue.slice(0, -1);
          if (!validateAndSelect(newValues)) return;
          onSelect(newValues);
          onChange?.(newValues, 'remove', selectedValue[selectedValue.length - 1]);
        }
        break;
    }
  }, [isOpen, filteredOptions, focusedIndex, handleSelect, searchQuery, allowCustomValue, 
      multiSelect, selectedValue, onSelect, onChange, showSelectAll, handleSelectAll, validateAndSelect]);

  // Handle search input change with debouncing
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFocusedIndex(-1);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (onSearch && debounceSearch > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        onSearch(query);
      }, debounceSearch);
    } else if (onSearch) {
      onSearch(query);
    }
  }, [onSearch, debounceSearch]);

  // Handle dropdown open
  const handleDropdownOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    onOpen?.();
    if (searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [disabled, searchable, onOpen]);

  // Handle dropdown close
  const handleDropdownClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
    setLocalError(null);
    onClose?.();
  }, [onClose]);

  // Calculate dropdown position for advanced positioning
  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current || !portal) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;
    
    // Handle position prop
    if (position === 'top') {
      top = rect.top + window.scrollY - 300; // Approximate dropdown height
    } else if (position === 'auto') {
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 300 && spaceAbove > spaceBelow) {
        top = rect.top + window.scrollY - 300;
      }
    }
    
    // Handle align prop
    if (align === 'right') {
      left = rect.right + window.scrollX - rect.width;
    } else if (align === 'center') {
      left = rect.left + window.scrollX + rect.width / 2;
    }
    
    setDropdownPosition({ top, left, width: rect.width });
  }, [portal, position, align]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleDropdownClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, handleDropdownClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
      updateDropdownPosition();
    }
  }, [isOpen, searchable, updateDropdownPosition]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [autoFocus]);

  // Scroll to focused option with improved behavior
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      const element = optionRefs.current[focusedIndex];
      const container = element.closest('.enhanced-dropdown-scroll');
      
      if (container) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        if (elementRect.top < containerRect.top) {
          element.scrollIntoView({ block: 'start', behavior: 'smooth' });
        } else if (elementRect.bottom > containerRect.bottom) {
          element.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }
      }
    }
  }, [focusedIndex]);

  // Reset focused index when options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredOptions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Highlight matching text in options
  const highlightText = useCallback((text, query) => {
    if (!highlightMatches || !query.trim()) return text;
    
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    const searchText = caseSensitive ? text : text.toLowerCase();
    
    const parts = [];
    let lastIndex = 0;
    let matchIndex = searchText.indexOf(searchTerm);
    
    while (matchIndex !== -1) {
      if (matchIndex > lastIndex) {
        parts.push({ text: text.slice(lastIndex, matchIndex), highlight: false });
      }
      parts.push({ text: text.slice(matchIndex, matchIndex + searchTerm.length), highlight: true });
      lastIndex = matchIndex + searchTerm.length;
      matchIndex = searchText.indexOf(searchTerm, lastIndex);
    }
    
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlight: false });
    }
    
    return parts.map((part, i) => 
      part.highlight ? (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200">{part.text}</mark>
      ) : (
        <span key={i}>{part.text}</span>
      )
    );
  }, [highlightMatches, caseSensitive]);

  // Render option content with advanced features
  const renderOptionContent = (option, index) => {
    if (renderOption) {
      return renderOption(option, index);
    }
    
    const displayText = getDisplayText(option);
    const highlightedText = searchQuery ? highlightText(displayText, searchQuery) : displayText;
    
    return (
      <div className="flex items-center justify-between w-full gap-2">
        <span className="truncate flex-1">
          {highlightedText}
        </span>
        {multiSelect && isSelected(option) && (
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    );
  };

  // Render selected value with advanced formatting
  const renderSelectedContent = () => {
    if (renderSelected) {
      return renderSelected(selectedValue);
    }
    
    if (multiSelect && Array.isArray(selectedValue)) {
      if (selectedValue.length === 0) {
        return <span className="text-gray-400">{placeholder}</span>;
      }
      
      if (badges && selectedValue.length <= 3) {
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {selectedValue.map((val, idx) => {
              const displayText = getDisplayText(val);
              return (
                <span 
                  key={idx} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded-full text-xs"
                >
                  {displayText}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newValues = selectedValue.filter((_, i) => i !== idx);
                      if (validateAndSelect(newValues)) {
                        onSelect(newValues);
                        onChange?.(newValues, 'remove', val);
                      }
                    }}
                    className="hover:text-red-400 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        );
      }
      
      if (selectedValue.length === 1) {
        const option = selectedValue[0];
        const displayText = getDisplayText(option);
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
    
    const displayText = getDisplayText(selectedValue);
    return (
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 bg-black rounded-full"></span>
        {displayText}
      </span>
    );
  };

  // Size-based styles
  const sizeStyles = {
    small: {
      button: 'px-3 py-1.5 text-xs',
      option: 'px-3 py-1.5 text-xs',
      search: 'px-2 py-1.5 text-xs'
    },
    medium: {
      button: 'px-4 py-2.5 text-sm',
      option: 'px-4 py-2 text-sm',
      search: 'px-3 py-2 text-sm'
    },
    large: {
      button: 'px-5 py-3 text-base',
      option: 'px-5 py-3 text-base',
      search: 'px-4 py-2.5 text-base'
    }
  };

  const currentSize = sizeStyles[size] || sizeStyles.medium;

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
      <div ref={dropdownRef} className={`relative ${className}`} style={customStyles.container}>
      {/* Dropdown Button */}
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={handleDropdownOpen}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        id={dropdownId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${dropdownId}-label`}
        aria-controls={listboxId}
        className={`
          enhanced-dropdown-button flex items-center gap-2 rounded-full font-medium 
          transition-all duration-300 focus:outline-none focus:ring-0 active:outline-none active:ring-0
          ${currentSize.button}
          ${isOpen ? 'text-black' : 'text-gray-400 hover:text-white'} 
          bg-[#1a1a1a]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          relative overflow-hidden
        `}
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
