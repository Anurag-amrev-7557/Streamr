import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const LightweightImage = ({
  src,
  alt,
  width,
  height,
  className,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB4PSI0MCIgeT0iNDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTAgMTBIMTlWMTlIMTBWMTBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMiAxMkgxN1YxN0gxMlYxMloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K',
  lazy = true,
  priority = false,
  onLoad,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) {
      setIsInView(true);
      return;
    }

    if (imgRef.current && 'IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observerRef.current?.disconnect();
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before image comes into view
          threshold: 0.1
        }
      );

      observerRef.current.observe(imgRef.current);
    } else {
      // Fallback for browsers without IntersectionObserver
      setIsInView(true);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, priority]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setHasError(false);
      onLoad?.(img);
    };

    img.onerror = () => {
      setHasError(true);
      onError?.(new Error('Failed to load image'));
    };

    // Add timeout for slow networks
    const timeoutId = setTimeout(() => {
      if (!img.complete) {
        img.src = ''; // Cancel loading
        setHasError(true);
        onError?.(new Error('Image loading timeout'));
      }
    }, 15000); // 15 second timeout

    img.onload = () => {
      clearTimeout(timeoutId);
      setImageSrc(src);
      setIsLoaded(true);
      setHasError(false);
      onLoad?.(img);
    };

    img.src = src;
  }, [isInView, src, onLoad, onError]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleError = () => {
    setHasError(true);
    onError?.(new Error('Image failed to load'));
  };

  return (
    <div
      ref={imgRef}
      className={`lightweight-image-container ${className || ''}`}
      style={{
        width: width || 'auto',
        height: height || 'auto',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f3f4f6'
      }}
    >
      {/* Placeholder/loading state */}
      {!isLoaded && !hasError && (
        <div
          className="lightweight-image-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `url(${placeholder}) center/cover no-repeat`,
            opacity: 0.7,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="lightweight-image-error"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            fontSize: '12px',
            textAlign: 'center',
            padding: '8px'
          }}
        >
          <div>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🖼️</div>
            <div>Image failed to load</div>
          </div>
        </div>
      )}

      {/* Actual image */}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`lightweight-image ${isLoaded ? 'loaded' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          display: hasError ? 'none' : 'block'
        }}
        onError={handleError}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        {...props}
      />

      {/* Loading indicator */}
      {!isLoaded && !hasError && (
        <div
          className="lightweight-image-loading"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      )}

      {/* CSS for loading animation */}
      <style>{`
        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        .lightweight-image-container {
          background-color: #f3f4f6;
        }
        
        .lightweight-image {
          transition: opacity 0.3s ease;
        }
        
        .lightweight-image.loaded {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

LightweightImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  placeholder: PropTypes.string,
  lazy: PropTypes.bool,
  priority: PropTypes.bool,
  onLoad: PropTypes.func,
  onError: PropTypes.func
};

export default LightweightImage; 