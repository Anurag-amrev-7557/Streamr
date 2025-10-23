import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition, memo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableStreamingServices, DEFAULT_STREAMING_SERVICE } from '../services/streamingService';

/**
 * StreamingServiceToggler component for switching streaming services with accessibility, performance, and UX optimizations.
 * @param {Object} props
 * @param {any} props.content - Content to determine available streaming services.
 * @param {string} props.currentService - Currently selected service key.
 * @param {Function} props.onServiceChange - Callback for service change.
 * @param {string} [props.className] - Additional class names.
 * @param {Function} [props.onServiceLoad] - Callback after service loads.
 * @param {boolean} [props.disabled] - Disable toggler.
 */
const StreamingServiceToggler = ({ 
  content, 
  currentService, 
  onServiceChange,
  className = "",
  onServiceLoad = null,
  disabled = false
}) => {
  const [availableServices, setAvailableServices] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lastSelectedService, setLastSelectedService] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Memoize the current service data to prevent unnecessary re-renders
  const currentServiceData = useMemo(() => {
    return availableServices.find(s => s.key === currentService) || availableServices[0];
  }, [availableServices, currentService]);

  // Memoize the service change handler to prevent infinite loops
  // Debounce service selection
  const debounceTimeout = useRef(null);
  const handleServiceSelect = useCallback((service) => {
    if (service.key === currentService) {
      setIsOpen(false);
      return;
    }
    setLastSelectedService(currentService);
    setIsLoading(true);
    setErrorMsg("");
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await onServiceChange(service);
          if (onServiceLoad) {
            onServiceLoad(service);
          }
          setIsOpen(false);
        } catch (error) {
          console.error('Error changing streaming service:', error);
          setErrorMsg("Failed to change service. Please try again.");
          if (lastSelectedService) {
            const fallbackService = availableServices.find(s => s.key === lastSelectedService);
            if (fallbackService) {
              await onServiceChange(fallbackService);
            }
          }
        } finally {
          setIsLoading(false);
        }
      });
    }, 200); // 200ms debounce
  }, [currentService, onServiceChange, onServiceLoad, lastSelectedService, availableServices]);

  const handleToggle = useCallback(() => {
    if (!isLoading) {
      setIsOpen(!isOpen);
    }
  }, [isOpen, isLoading]);

  // Keyboard navigation for accessibility
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      setIsOpen(true);
      setFocusedIndex(0);
      event.preventDefault();
    }
    if (isOpen) {
      if (event.key === 'ArrowDown') {
        setFocusedIndex((prev) => Math.min(prev + 1, availableServices.length - 1));
        event.preventDefault();
      }
      if (event.key === 'ArrowUp') {
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        event.preventDefault();
      }
      if (event.key === 'Tab') {
        setIsOpen(false);
      }
      if (event.key === 'Enter' && focusedIndex >= 0) {
        handleServiceSelect(availableServices[focusedIndex]);
        event.preventDefault();
      }
    }
  }, [isOpen, availableServices, focusedIndex, handleServiceSelect]);

  // Memoize the available services processing to prevent unnecessary recalculations
  const processAvailableServices = useCallback(async () => {
    if (!content) return;
    
    setIsLoading(true);
    try {
      console.log('StreamingServiceToggler: Processing content:', content);
      const services = getAvailableStreamingServices(content);
      console.log('StreamingServiceToggler: Available services:', services);
      setAvailableServices(services);
      
      // Auto-select default service if none set; fallback to first available
      if (!currentService && services.length > 0) {
        const preferred = services.find(s => s.key === DEFAULT_STREAMING_SERVICE) || services[0];
        onServiceChange(preferred);
      }
    } catch (error) {
      console.error('Error loading streaming services:', error);
    } finally {
      setIsLoading(false);
    }
  }, [content, currentService, onServiceChange]);

  // Get available services when content changes - optimized dependencies
  useEffect(() => {
    processAvailableServices();
  }, [processAvailableServices]);

  // Close dropdown when clicking outside - optimized with useCallback
  const handleClickOutside = useCallback((event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Focus management for dropdown items
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      const item = document.getElementById(`streaming-service-item-${focusedIndex}`);
      item?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Don't show if no services available or disabled
  if (availableServices.length === 0 || disabled) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Service Toggle Button */}
      <motion.button
        ref={buttonRef}
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={isLoading || isPending}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="streaming-service-dropdown"
        className={`flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full text-white text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/40 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        title={currentServiceData?.description || ''}
      >
        {/* Loading indicator */}
        {(isLoading || isPending) && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            aria-label="Loading"
            role="status"
          />
        )}
        <motion.span layout className="truncate">
          {isLoading ? 'Loading...' : (currentServiceData?.name || 'Server')}
        </motion.span>
        {!isLoading && currentServiceData?.description && (
          <span className="text-xs text-white/60 ml-1" title={currentServiceData.description}>
            ({currentServiceData.description})
          </span>
        )}
        <motion.svg 
          className="w-4 h-4 text-white/70 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      {/* Dropdown Menu */}
      {/* Error message feedback */}
      {errorMsg && (
        <div className="text-red-400 text-xs mt-1" role="alert">{errorMsg}</div>
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="streaming-service-dropdown"
            role="listbox"
            aria-activedescendant={focusedIndex >= 0 ? `streaming-service-item-${focusedIndex}` : undefined}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl overflow-hidden min-w-32 max-h-60 overflow-y-auto"
            style={{ zIndex: 1000 }}
          >
            <div className="py-1">
              {availableServices.map((service, index) => (
                <DropdownItem
                  key={service.key}
                  service={service}
                  index={index}
                  currentService={currentService}
                  focusedIndex={focusedIndex}
                  isLoading={isLoading}
                  handleServiceSelect={handleServiceSelect}
                  setFocusedIndex={setFocusedIndex}
                  isFirst={index === 0}
                  isLast={index === availableServices.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Memoized dropdown item for streaming service selection.
 */
const DropdownItem = memo(function DropdownItem({ service, index, currentService, focusedIndex, isLoading, handleServiceSelect, setFocusedIndex, isFirst, isLast }) {
  return (
    <motion.button
      id={`streaming-service-item-${index}`}
      role="option"
      aria-selected={service.key === currentService}
      tabIndex={focusedIndex === index ? 0 : -1}
      onClick={() => handleServiceSelect(service)}
      onFocus={() => setFocusedIndex(index)}
      disabled={isLoading}
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
        service.key === currentService 
          ? 'bg-white/20 text-white' 
          : 'text-white/80 hover:text-white'
      } ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} ${
        isLoading ? 'cursor-not-allowed opacity-50' : ''
      }`}
      title={service.description || ''}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span>{service.name}</span>
            {service.description && (
              <span className="text-xs text-white/60" title={service.description}>
                {service.description}
              </span>
            )}
          </div>
          {service.key === currentService && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-1.5 h-1.5 bg-white rounded-full"
            />
          )}
        </div>
        {service.key === currentService && (
          <motion.svg 
            className="w-4 h-4 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </div>
    </motion.button>
  );
});

StreamingServiceToggler.propTypes = {
  content: PropTypes.any,
  currentService: PropTypes.string,
  onServiceChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  onServiceLoad: PropTypes.func,
  disabled: PropTypes.bool,
};

export default StreamingServiceToggler;