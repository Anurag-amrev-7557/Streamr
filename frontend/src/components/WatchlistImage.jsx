import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WatchlistImage = memo(({
  src,
  alt = "",
  className = "",
  onLoad,
  onError,
  priority = false,
  ...props
}) => {
  const [imageState, setImageState] = useState('loading');
  const [currentSrc, setCurrentSrc] = useState(null);
  const imageRef = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 2;

  // Generate low-quality placeholder for blur effect
  const getPlaceholderSrc = useCallback((originalSrc) => {
    if (!originalSrc) return null;
    // Create a very small version for blur effect
    return originalSrc.replace(/\/(w\d+|original)/, "/w92");
  }, []);

  // Load image with retry logic and progressive loading
  const loadImage = useCallback(async (imageSrc) => {
    if (!imageSrc) return;

    try {
      setImageState('loading');
      const placeholderSrc = getPlaceholderSrc(imageSrc);
      
      // Load placeholder first for immediate visual feedback
      if (placeholderSrc) {
        setCurrentSrc(placeholderSrc);
      }

      // Preload full image
      const img = new Image();
      img.onload = () => {
        setCurrentSrc(imageSrc);
        setImageState('loaded');
        if (onLoad) onLoad();
      };
      img.onerror = () => {
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(() => loadImage(imageSrc), 1000 * retryCount.current);
        } else {
          setImageState('error');
          if (onError) onError();
        }
      };
      img.src = imageSrc;
    } catch (error) {
      setImageState('error');
      if (onError) onError(error);
    }
  }, [getPlaceholderSrc, onLoad, onError]);

  useEffect(() => {
    loadImage(src);
  }, [src, loadImage]);

  return (
    <div className={`relative overflow-hidden ${className}`} {...props}>
      {/* Shimmer Loading Placeholder */}
      {imageState === 'loading' && !currentSrc && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </motion.div>
      )}

      {/* Blurred Placeholder - Progressive Loading */}
      {currentSrc && imageState === 'loading' && (
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("${currentSrc}")`,
            filter: "blur(8px) brightness(0.8)",
            transform: "scale(1.1)"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Full Image with Smooth Transition */}
      {currentSrc && imageState === 'loaded' && (
        <motion.img
          ref={imageRef}
          src={currentSrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.7, 
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.1
          }}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}

      {/* Error State */}
      {imageState === 'error' && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center text-white/60">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs">Image unavailable</p>
          </div>
        </motion.div>
      )}

      {/* Loading Spinner for longer loads */}
      {imageState === 'loading' && (
        <AnimatePresence>
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1 }} // Only show after 1 second
          >
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
});

WatchlistImage.displayName = 'WatchlistImage';

export default WatchlistImage; 