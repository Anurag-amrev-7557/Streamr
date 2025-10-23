import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getAvailableStreamingServices, openStreamingUrl, openEmbedPlayer, DEFAULT_STREAMING_SERVICE } from '../services/streamingService';
import { usePortal } from '../hooks/usePortal';
import { PORTAL_CONFIGS, createPortalEventHandlers } from '../utils/portalUtils';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';

const StreamingServiceSelector = ({ 
  content, 
  isOpen, 
  onClose, 
  onServiceSelect 
}) => {
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serviceRatings, setServiceRatings] = useState({});
  const [recentServices, setRecentServices] = useState([]);
  const [keyboardIndex, setKeyboardIndex] = useState(-1);

  // Context hooks
  const { preferences, setPreferences } = useUserPreferences();
  const { watchHistory } = useWatchHistory();

  // Memoize available services to prevent unnecessary recalculations
  const memoizedAvailableServices = useMemo(() => {
    if (!content) return [];
    const services = getAvailableStreamingServices(content);
    
    // Add user preferences data
    return services.map(service => ({
      ...service,
      isFavorite: preferences?.favoriteStreamingServices?.includes(service.key) || false,
      rating: serviceRatings[service.key] || 0,
      lastUsed: recentServices.find(rs => rs.key === service.key)?.lastUsed
    }));
  }, [content, preferences?.favoriteStreamingServices, serviceRatings, recentServices]);

  // Sort services with personalization
  const sortedServices = useMemo(() => {
    const services = [...memoizedAvailableServices];
    
    return services.sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // Recently used next
      if (a.lastUsed && b.lastUsed) {
        return new Date(b.lastUsed) - new Date(a.lastUsed);
      }
      if (a.lastUsed && !b.lastUsed) return -1;
      if (!a.lastUsed && b.lastUsed) return 1;
      
      // Higher rated services
      if (a.rating !== b.rating) return b.rating - a.rating;
      
      // Alphabetical fallback
      return a.name.localeCompare(b.name);
    });
  }, [memoizedAvailableServices]);

  // Filter services based on search
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return sortedServices;
    
    const query = searchQuery.toLowerCase();
    return sortedServices.filter(service =>
      service.name.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query) ||
      service.key.toLowerCase().includes(query)
    );
  }, [sortedServices, searchQuery]);

  // Enhanced portal management
  const portalId = `streaming-service-selector-${content?.id || 'default'}`;
  const {
    container: portalContainer,
    createPortal: createPortalContent,
    isReady: portalReady
  } = usePortal(portalId, {
    ...PORTAL_CONFIGS.MODAL,
    ...createPortalEventHandlers(portalId, { onClose })
  });

  // Get available services when modal opens - optimized
  useEffect(() => {
    if (isOpen && content) {
      setIsLoading(true);
      // Simulate async availability check
      setTimeout(() => {
        setAvailableServices(filteredServices);
        if (filteredServices.length > 0) {
          // Prefer user's default service, then favorite, then first available
          const userDefault = preferences?.defaultStreamingService;
          const defaultService = filteredServices.find(s => s.key === userDefault) ||
                                filteredServices.find(s => s.isFavorite) ||
                                filteredServices[0];
          setSelectedService(defaultService);
        } else {
          setSelectedService(null);
        }
        setIsLoading(false);
      }, 100); // Small delay to show loading state
    }
  }, [isOpen, content, filteredServices, preferences?.defaultStreamingService]);

  // Load recent services and ratings on mount
  useEffect(() => {
    const loadUserData = () => {
      // Load recent services from preferences
      const recent = preferences?.recentStreamingServices || [];
      setRecentServices(recent);
      
      // Load service ratings (mock data for now)
      const ratings = preferences?.serviceRatings || {};
      setServiceRatings(ratings);
    };
    
    loadUserData();
  }, [preferences]);

  // Save recent services to preferences
  useEffect(() => {
    if (recentServices.length > 0) {
      setPreferences({
        ...preferences,
        recentStreamingServices: recentServices
      });
    }
  }, [recentServices, preferences, setPreferences]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleClose = useCallback(() => {
    setSelectedService(null);
    onClose();
  }, [onClose]);

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  }, [isOpen, handleClose]);

  const handleClickOutside = useCallback((e) => {
    if (e.target.classList.contains('streaming-service-selector-overlay')) {
      handleClose();
    }
  }, [handleClose]);

  const handleServiceSelect = useCallback((service) => {
    setSelectedService(service);
  }, []);

  const handleToggleFavorite = useCallback((serviceKey, e) => {
    e.stopPropagation();
    const currentFavorites = preferences?.favoriteStreamingServices || [];
    const isCurrentlyFavorite = currentFavorites.includes(serviceKey);
    
    const newFavorites = isCurrentlyFavorite
      ? currentFavorites.filter(key => key !== serviceKey)
      : [...currentFavorites, serviceKey];
    
    setPreferences({
      ...preferences,
      favoriteStreamingServices: newFavorites
    });
  }, [preferences, setPreferences]);

  const handleSetDefault = useCallback((serviceKey) => {
    setPreferences({
      ...preferences,
      defaultStreamingService: serviceKey
    });
  }, [preferences, setPreferences]);

  const handleWatchNow = useCallback(() => {
    if (selectedService && onServiceSelect) {
      // Track service usage
      const usageData = {
        service: selectedService.key,
        contentId: content?.id,
        contentType: content?.title ? 'movie' : 'tv',
        timestamp: new Date().toISOString()
      };
      
      // Update recent services
      const updatedRecent = [usageData, ...recentServices.filter(rs => rs.service !== selectedService.key)].slice(0, 5);
      setRecentServices(updatedRecent);
      
      // Save to preferences
      const currentUsage = preferences?.streamingServiceUsage || {};
      currentUsage[selectedService.key] = (currentUsage[selectedService.key] || 0) + 1;
      
      setPreferences({
        ...preferences,
        streamingServiceUsage: currentUsage,
        lastUsedStreamingService: selectedService.key
      });
      
      onServiceSelect(selectedService);
    }
  }, [selectedService, onServiceSelect, content, recentServices, preferences, setPreferences]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;
    
    const services = filteredServices;
    if (services.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setKeyboardIndex(prev => 
          prev < services.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setKeyboardIndex(prev => 
          prev > 0 ? prev - 1 : services.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (keyboardIndex >= 0 && keyboardIndex < services.length) {
          setSelectedService(services[keyboardIndex]);
        }
        break;
      case ' ': // Space
        e.preventDefault();
        if (keyboardIndex >= 0 && keyboardIndex < services.length) {
          handleToggleFavorite(services[keyboardIndex].key, e);
        }
        break;
      case 'Escape':
        handleClose();
        break;
    }
  }, [isOpen, filteredServices, keyboardIndex, handleToggleFavorite, handleClose]);

  // Update selected service when keyboard index changes
  useEffect(() => {
    if (keyboardIndex >= 0 && keyboardIndex < filteredServices.length) {
      setSelectedService(filteredServices[keyboardIndex]);
    }
  }, [keyboardIndex, filteredServices]);

  // Event listeners with proper cleanup
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Reset keyboard index when opening
      setKeyboardIndex(-1);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown, handleEscape]);

  // Don't render if portal container is not ready or in SSR
  if (typeof window === 'undefined' || !portalReady || !portalContainer) {
    return null;
  }

  const overlayContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="streaming-service-selector-overlay fixed inset-0 bg-black/80 flex items-center justify-center z-[99999999999] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={handleClickOutside}
          role="dialog"
          aria-modal="true"
          aria-labelledby="streaming-service-title"
          aria-describedby="streaming-service-description"
        >
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-full shadow-2xl overflow-hidden z-[99999999999]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 id="streaming-service-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                  Choose Streaming Service
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search streaming services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    aria-label="Search streaming services"
                    aria-describedby="search-help"
                    autoComplete="off"
                  />
                  <div id="search-help" className="sr-only">
                    Type to filter the list of streaming services below
                  </div>
                  <svg
                    className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
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
                </div>
              </div>
              
              {content && (
                <p id="streaming-service-description" className="text-sm text-gray-600 dark:text-gray-400">
                  Select a streaming service to watch "{content.title || content.name}"
                </p>
              )}
            </div>

            {/* Service List */}
            <div className="p-6">
              {/* Status announcements for screen readers */}
              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {isLoading && "Loading streaming services..."}
                {!isLoading && availableServices.length === 0 && "No streaming services available"}
                {!isLoading && filteredServices.length > 0 && searchQuery && 
                  `Found ${filteredServices.length} service${filteredServices.length === 1 ? '' : 's'} matching "${searchQuery}"`
                }
                {!isLoading && filteredServices.length > 0 && !searchQuery &&
                  `${filteredServices.length} streaming service${filteredServices.length === 1 ? '' : 's'} available`
                }
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Checking availability...</span>
                </div>
              ) : availableServices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Streaming Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    This content is not available for streaming at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto" role="listbox" aria-label="Available streaming services">
                  {filteredServices.map((service, index) => (
                    <div
                      key={service.key}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedService?.key === service.key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : keyboardIndex === index
                          ? 'border-gray-400 bg-gray-50 dark:bg-gray-800/50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => handleServiceSelect(service)}
                      role="option"
                      aria-selected={selectedService?.key === service.key}
                      tabIndex={0}
                      aria-label={`${service.name} - ${service.description}${service.isFavorite ? ' (favorite)' : ''}${service.lastUsed ? ` (last used ${new Date(service.lastUsed).toLocaleDateString()})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedService?.key === service.key
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedService?.key === service.key && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {service.name}
                              </h3>
                              {service.isFavorite && (
                                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              )}
                              {service.lastUsed && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Last used {new Date(service.lastUsed).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {service.description}
                            </p>
                            {service.rating > 0 && (
                              <div className="flex items-center mt-1">
                                <div className="flex text-yellow-400">
                                  {[...Array(5)].map((_, i) => (
                                    <svg key={i} className={`w-3 h-3 ${i < service.rating ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 24 24">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500 ml-1">({service.rating})</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => handleToggleFavorite(service.key, e)}
                            className={`p-1 rounded-full transition-colors ${
                              service.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-400 hover:text-yellow-500'
                            }`}
                            aria-label={service.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg className="w-4 h-4" fill={service.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          {selectedService?.key === service.key && (
                            <button
                              onClick={() => handleSetDefault(service.key)}
                              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              aria-label="Set as default service"
                            >
                              Set Default
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {availableServices.length > 0 && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
                {/* Keyboard Navigation Help */}
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Use ↑↓ arrows to navigate, Enter to select, Space to favorite, Esc to close
                </div>
                
                <button
                  onClick={handleWatchNow}
                  disabled={!selectedService}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Watch Now
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={handleOpenInNewTab}
                    disabled={!selectedService}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Open in New Tab
                  </button>
                  <button
                    onClick={handleOpenEmbed}
                    disabled={!selectedService}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Embed Player
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortalContent(overlayContent);
};

export default StreamingServiceSelector;