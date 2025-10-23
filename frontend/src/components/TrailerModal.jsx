/**
 * 🚀 Advanced Trailer Modal Component
 * 
 * Features:
 * - YouTube player integration
 * - Auto-play with user interaction
 * - Keyboard controls
 * - Accessibility support
 * - Performance optimized
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

const TrailerModal = ({ videoId, onClose, autoplay = true }) => {
  const [playerReady, setPlayerReady] = useState(false);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  /**
   * YouTube Player options
   */
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
    },
  };

  /**
   * Handle player ready
   */
  const onPlayerReady = useCallback((event) => {
    setPlayerReady(true);
    playerRef.current = event.target;

    if (autoplay) {
      event.target.playVideo();
    }
  }, [autoplay]);

  /**
   * Handle player error
   */
  const onPlayerError = useCallback((event) => {
    console.error('[TrailerModal] YouTube player error:', event.data);
    setError('Failed to load video. Please try again.');
  }, []);

  /**
   * Handle ESC key
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  /**
   * Stop video on unmount
   */
  useEffect(() => {
    return () => {
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        playerRef.current.stopVideo();
      }
    };
  }, []);

  /**
   * Focus trap
   */
  useEffect(() => {
    const firstFocusable = containerRef.current?.querySelector('button');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }, []);

  if (!videoId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trailer-modal-title"
      >
        <motion.div
          ref={containerRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110"
            aria-label="Close trailer"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>

          {/* Hidden title for accessibility */}
          <h2 id="trailer-modal-title" className="sr-only">
            Movie Trailer
          </h2>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-red-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-white text-lg">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {!playerReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary" />
            </div>
          )}

          {/* YouTube Player */}
          {!error && (
            <div className="w-full h-full">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&controls=1&modestbranding=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                onLoad={() => setPlayerReady(true)}
                onError={() => onPlayerError({ data: 'iframe_load_error' })}
              />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default React.memo(TrailerModal);
