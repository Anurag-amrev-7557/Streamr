import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Loader } from './Loader';

const StreamingPlayer = ({ 
  streamingUrl, 
  title, 
  isOpen, 
  onClose, 
  onError 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [portalContainer, setPortalContainer] = useState(null);
  const iframeRef = useRef(null);

  // Create portal container for the modal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let container = document.getElementById('streaming-player-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'streaming-player-portal';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      if (container && container.parentNode && container.children.length === 0) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, streamingUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    if (onError) {
      onError('Failed to load streaming content');
    }
  };

  const handleClose = () => {
    setIsLoading(true);
    setHasError(false);
    onClose();
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClickOutside = (e) => {
    if (e.target.classList.contains('streaming-player-overlay')) {
      handleClose();
    }
  };

  // Don't render if portal container is not ready or in SSR
  if (typeof window === 'undefined' || !portalContainer) {
    return null;
  }

  const embedUrl = streamingUrl ? `${streamingUrl}?embed=1` : null;

  const overlayContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="streaming-player-overlay fixed inset-0 bg-black/95 flex items-center justify-center z-[99999999999] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={handleClickOutside}
        >
          <motion.div
            className="relative w-full max-w-7xl h-[90vh] bg-black rounded-2xl shadow-2xl overflow-hidden z-[99999999999]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-16 z-[99999999999] p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200"
              aria-label="Close streaming player"
            >
              <svg
                className="w-6 h-6 text-white"
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

            {/* Player Container */}
            <div className="relative w-full h-full">

              {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-red-400"
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
                    <h3 className="text-white text-lg font-semibold mb-2">
                      Streaming Unavailable
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      This content is not available for streaming at the moment.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {embedUrl && !hasError && (
                <iframe
                  ref={iframeRef}
                  src={embedUrl}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  title={`Streaming ${title || 'content'}`}
                />
              )}
            </div>


          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlayContent, portalContainer);
};

export default StreamingPlayer; 