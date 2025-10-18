import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableStreamingServices, DEFAULT_STREAMING_SERVICE } from '../services/streamingService';

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
  const [lastSelectedService, setLastSelectedService] = useState(null);
  const dropdownRef = useRef(null);

  // Memoize the current service data to prevent unnecessary re-renders
  const currentServiceData = useMemo(() => {
    return availableServices.find(s => s.key === currentService) || availableServices[0];
  }, [availableServices, currentService]);

  // Memoize the service change handler to prevent infinite loops
  const handleServiceSelect = useCallback(async (service) => {
    if (service.key === currentService) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setLastSelectedService(currentService);

    try {
      // Call the service change handler
      await onServiceChange(service);
      
      // Notify about service load if callback provided
      if (onServiceLoad) {
        onServiceLoad(service);
      }

      // Close dropdown after successful change
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing streaming service:', error);
      // Revert to last selected service on error
      if (lastSelectedService) {
        const fallbackService = availableServices.find(s => s.key === lastSelectedService);
        if (fallbackService) {
          await onServiceChange(fallbackService);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentService, onServiceChange, onServiceLoad, lastSelectedService, availableServices]);

  const handleToggle = useCallback(() => {
    if (!isLoading) {
      setIsOpen(!isOpen);
    }
  }, [isOpen, isLoading]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

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

  // Don't show if no services available or disabled
  if (availableServices.length === 0 || disabled) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Service Toggle Button */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full text-white text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/40 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      >
        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
          />
        )}
        
        <span className="truncate max-w-20">
          {isLoading ? 'Loading...' : (currentServiceData?.name || 'Server')}
        </span>
        {!isLoading && currentServiceData?.description && (
          <span className="text-xs text-white/60 ml-1">
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
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl overflow-hidden min-w-32 max-h-60 overflow-y-auto"
            style={{ zIndex: 1000 }}
          >
            <div className="py-1">
              {availableServices.map((service, index) => (
                <motion.button
                  key={service.key}
                  onClick={() => handleServiceSelect(service)}
                  disabled={isLoading}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                    service.key === currentService 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/80 hover:text-white'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${index === availableServices.length - 1 ? 'rounded-b-lg' : ''} ${
                    isLoading ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span>{service.name}</span>
                        {service.description && (
                          <span className="text-xs text-white/60">
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
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamingServiceToggler; 