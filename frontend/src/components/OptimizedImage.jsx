import React, { useRef, useEffect, useState, memo } from 'react';
import { observeImage, getOptimizedImageUrl } from '../services/performanceOptimizationService';

const OptimizedImage = memo(({
  src,
  alt = "",
  className = "",
  style = {},
  aspectRatio = "16/10",
  priority = false,
  sizes = "100vw",
  onLoad,
  onError,
  placeholder = true,
  blur = true,
  ...rest
}) => {
  const imgRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);

  // Get device-appropriate image size
  const getImageSize = () => {
    if (typeof window === 'undefined') return 'w500';
    
    const width = window.innerWidth;
    if (width <= 480) return 'w154'; // Mobile
    if (width <= 768) return 'w342'; // Tablet
    if (width <= 1024) return 'w500'; // Desktop
    return 'w780'; // Large desktop
  };

  // Generate optimized URL
  const optimizedSrc = getOptimizedImageUrl(src, getImageSize());

  useEffect(() => {
    if (!imgRef.current || !src) return;

    const img = imgRef.current;

    // Set up lazy loading if not priority
    if (!priority) {
      img.dataset.src = optimizedSrc;
      observeImage(img);
    } else {
      // Load immediately for priority images
      img.src = optimizedSrc;
    }

    // Set up load/error handlers
    const handleLoad = () => {
      setIsLoaded(true);
      setHasError(false);
      onLoad?.(img);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoaded(false);
      onError?.(img);
      
      // Fallback to original image
      if (img.src !== src) {
        img.src = src;
      }
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src, optimizedSrc, priority, onLoad, onError]);

  // Update current source when optimized URL changes
  useEffect(() => {
    setCurrentSrc(optimizedSrc);
  }, [optimizedSrc]);

  // Generate placeholder styles
  const placeholderStyle = {
    backgroundColor: '#1a1a1a',
    backgroundImage: blur && src ? `url(${getOptimizedImageUrl(src, 'w92')})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: blur ? 'blur(10px)' : 'none',
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out'
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio,
        ...style
      }}
    >
      {/* Placeholder */}
      {placeholder && !isLoaded && (
        <div 
          className="absolute inset-0"
          style={placeholderStyle}
          aria-hidden="true"
        />
      )}

      {/* Main Image */}
      <img
        ref={imgRef}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          willChange: 'opacity',
          ...(priority && { fetchPriority: 'high' })
        }}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...rest}
      />

      {/* Loading Indicator */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white/60">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage; 