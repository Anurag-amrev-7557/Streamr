import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getAvailableStreamingServices, openStreamingUrl, openEmbedPlayer, DEFAULT_STREAMING_SERVICE } from '../services/streamingService';
import { usePortal } from '../hooks/usePortal';
import { PORTAL_CONFIGS, createPortalEventHandlers } from '../utils/portalUtils';

const StreamingServiceSelector = ({ 
  content, 
  isOpen, 
  onClose, 
  onServiceSelect 
}) => {
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // Memoize available services to prevent unnecessary recalculations
  const memoizedAvailableServices = useMemo(() => {
    if (!content) return [];
    return getAvailableStreamingServices(content);
  }, [content]);

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
      setAvailableServices(memoizedAvailableServices);
      if (memoizedAvailableServices.length > 0) {
        const preferred = memoizedAvailableServices.find(s => s.key === DEFAULT_STREAMING_SERVICE) || memoizedAvailableServices[0];
        setSelectedService(preferred);
      } else {
        setSelectedService(null);
      }
    }
  }, [isOpen, content, memoizedAvailableServices]);

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

  const handleWatchNow = useCallback(() => {
    if (selectedService && onServiceSelect) {
      onServiceSelect(selectedService);
    }
  }, [selectedService, onServiceSelect]);

  const handleOpenInNewTab = useCallback(() => {
    if (selectedService) {
      openStreamingUrl(selectedService.url);
      handleClose();
    }
  }, [selectedService, handleClose]);

  const handleOpenEmbed = useCallback(() => {
    if (selectedService) {
      openEmbedPlayer(selectedService.url);
      handleClose();
    }
  }, [selectedService, handleClose]);

  // Event listeners with proper cleanup
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

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
        >
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-full shadow-2xl overflow-hidden z-[99999999999]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
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
              {content && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Select a streaming service to watch "{content.title || content.name}"
                </p>
              )}
            </div>

            {/* Service List */}
            <div className="p-6">
              {availableServices.length === 0 ? (
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
                <div className="space-y-3">
                  {availableServices.map((service) => (
                    <div
                      key={service.key}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedService?.key === service.key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedService?.key === service.key
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedService?.key === service.key && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {service.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              External streaming service
                            </p>
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {availableServices.length > 0 && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
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