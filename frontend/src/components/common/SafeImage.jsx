import React, { useState } from 'react';
import { getFileUrl } from '../../config/api';

const SafeImage = ({ 
  src, 
  alt = '', 
  className = '', 
  fallbackSrc = '/default-avatar.png',
  onError,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get the correct file URL based on backend configuration
  const imageSrc = getFileUrl(src) || src;

  const handleLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleError = (e) => {
    setIsLoading(false);
    setImageError(true);
    
    // Call the onError prop if provided
    if (onError) {
      onError(e);
    }
  };

  // If we have an error and a fallback, use the fallback
  if (imageError && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        onError={(e) => {
          // Prevent infinite loop by not setting error state for fallback
          if (onError) onError(e);
        }}
        {...props}
      />
    );
  }

  return (
    <div className={`safe-image-container ${className}`} style={{ position: 'relative' }}>
      {isLoading && (
        <div 
          className="image-loading-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#666'
          }}
        >
          Loading...
        </div>
      )}
      
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onLoad={handleLoad}
        onError={handleError}
        style={{ 
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out'
        }}
        {...props}
      />
    </div>
  );
};

export default SafeImage;
