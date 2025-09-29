import React, { useRef, useEffect, useState, memo } from 'react';
import { getOptimizedImageUrl, createLazyImageLoader, getProgressiveImageUrls } from '../services/imageOptimizationService';

// Create a module-level lazy loader instance to avoid creating multiple observers
const lazyLoader = createLazyImageLoader({ 
  rootMargin: '300px', 
  threshold: 0.01,
  priority: 'normal',
  maxConcurrent: 4 // Limit concurrent image loads for better performance
});

const observeImage = (element) => {
  try {
    if (element) lazyLoader.observe(element);
  } catch (_e) {
    // no-op
  }
};

// Performance optimization: Preload critical images
const preloadCriticalImages = (src) => {
  if (!src || typeof window === 'undefined') return;
  
  // Use requestIdleCallback for non-critical preloading
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    }, { timeout: 1000 });
  }
};

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
  const [currentSrcSet, setCurrentSrcSet] = useState('');

  // Get device- and network-appropriate image size
  const getImageSize = () => {
    if (typeof window === 'undefined') return 'w500';

    const width = window.innerWidth || 1024;
    const dpr = typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1;
    let size = 'w500';

    if (width <= 480) size = 'w154';
    else if (width <= 768) size = 'w342';
    else if (width <= 1024) size = 'w500';
    else size = 'w780';

    // Respect Save-Data and slow connections by stepping down one tier
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const saveData = conn && (conn.saveData || false);
      const effectiveType = conn && conn.effectiveType;
      const isSlow = effectiveType && /(^2g$|^slow-2g$|^3g$)/i.test(effectiveType);
      if (saveData || isSlow) {
        if (size === 'w780') size = 'w500';
        else if (size === 'w500') size = 'w342';
        else if (size === 'w342') size = 'w154';
      }
    } catch (_) {}

    // Increase one tier for high-DPR displays to avoid blur (when not slow)
    try {
      if (dpr >= 1.75) {
        if (size === 'w154') size = 'w342';
        else if (size === 'w342') size = 'w500';
        else if (size === 'w500') size = 'w780';
      }
    } catch (_) {}

    return size;
  };

  // Generate optimized URL
  const optimizedSrc = getOptimizedImageUrl(src, getImageSize());

  // Preload critical images for better performance
  useEffect(() => {
    if (priority && optimizedSrc) {
      preloadCriticalImages(optimizedSrc);
    }
  }, [priority, optimizedSrc]);

  useEffect(() => {
    if (!imgRef.current || !src) return;

    const img = imgRef.current;
    let timeoutId = null;
    let isCancelled = false;

    // Generate a responsive srcset for TMDB images if possible
    try {
      let derivedSrcSet = '';
      // Attempt to derive a TMDB path from a full URL and generate srcset
      if (typeof optimizedSrc === 'string' && optimizedSrc.includes('image.tmdb.org')) {
        const url = new URL(optimizedSrc);
        // Expect pathname like /t/p/w500/xyz.jpg -> extract "/xyz.jpg" and current size
        const parts = url.pathname.split('/');
        const sizeCandidate = parts.length > 3 ? parts[3] : 'w500';
        const filePath = parts.length > 4 ? `/${parts.slice(4).join('/')}` : null;
        if (filePath) {
          const prog = getProgressiveImageUrls(filePath, sizeCandidate);
          derivedSrcSet = prog.srcSet || '';
        }
      }
      setCurrentSrcSet(derivedSrcSet);
    } catch (_e) {
      setCurrentSrcSet('');
    }

    // Set up lazy loading if not priority
    if (!priority) {
      img.dataset.src = optimizedSrc;
      if (currentSrcSet) {
        img.dataset.srcset = currentSrcSet;
      }
      observeImage(img);
    } else {
      // Load immediately for priority images
      img.src = optimizedSrc;
      if (currentSrcSet) {
        img.srcset = currentSrcSet;
      }
    }

    // Set up load/error handlers
    
    const handleLoad = () => {
      if (isCancelled) return;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      setIsLoaded(true);
      setHasError(false);
      onLoad?.(img);
    };

    const handleError = () => {
      if (isCancelled) return;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      setHasError(true);
      setIsLoaded(false);
      onError?.(img);
      
      // Fallback to original image
      if (img.src !== src) {
        img.src = src;
      }
    };

    // Add timeout for slow networks (15 seconds)
    if (!priority) {
      timeoutId = setTimeout(() => {
        if (!img.complete && !isLoaded) {
          console.warn(`Image loading timeout for: ${src}`);
          handleError();
        }
      }, 15000);
    }

    const loadHandler = handleLoad;
    const errorHandler = handleError;
    
    img.addEventListener('load', loadHandler);
    img.addEventListener('error', errorHandler);

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      img.removeEventListener('load', loadHandler);
      img.removeEventListener('error', errorHandler);
    };
  }, [src, optimizedSrc, currentSrcSet, priority, onLoad, onError]);

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
        }}
        fetchpriority={priority ? 'high' : undefined}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        crossOrigin="anonymous"
        src={priority ? currentSrc : undefined}
        srcSet={priority && currentSrcSet ? currentSrcSet : undefined}
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