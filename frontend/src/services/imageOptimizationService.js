// Optimized Image Optimization Service
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Backend proxy URL for images to handle CORS (keeping for fallback)
export const BACKEND_IMAGE_PROXY_URL = 'http://localhost:5000/api/tmdb/image';

// Image sizes for different use cases
export const IMAGE_SIZES = {
  THUMBNAIL: 'w92',
  SMALL: 'w154',
  MEDIUM: 'w185',
  LARGE: 'w342',
  EXTRA_LARGE: 'w500',
  ORIGINAL: 'original'
};

// Progressive loading sizes
export const PROGRESSIVE_SIZES = [
  IMAGE_SIZES.THUMBNAIL,
  IMAGE_SIZES.SMALL,
  IMAGE_SIZES.MEDIUM,
  IMAGE_SIZES.LARGE,
  IMAGE_SIZES.EXTRA_LARGE
];

// Enhanced image cache with memory management
const imageCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000; // Maximum number of cached images

// Memory-aware cache cleanup
const cleanupCache = () => {
  if (imageCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(imageCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
    entries.slice(0, toRemove).forEach(([key]) => imageCache.delete(key));
    
    console.log(`[ImageService] Cache cleaned: removed ${toRemove} old entries`);
  }
};

// Function to get direct TMDB image URL with CORS handling
export const getDirectImageUrl = (path, size = IMAGE_SIZES.MEDIUM) => {
  if (!path) {
    return '/placeholder-image.jpg';
  }
  
  // If it's already a full URL, return it as-is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Always use direct TMDB URLs - CORS issues will be handled by the img element
  // with crossOrigin attribute and error handling
  const url = `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
  return url;
};

// Function to get proxied image URL (fallback method)
export const getProxiedImageUrl = (path, size = IMAGE_SIZES.MEDIUM) => {
  if (!path) {
    return '/placeholder-image.jpg';
  }
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Use backend proxy to avoid CORS issues
  return `${BACKEND_IMAGE_PROXY_URL}/t/p/${size}${cleanPath}`;
};

// Optimized image URL generation with CORS-safe approach
export const getOptimizedImageUrl = (path, size = IMAGE_SIZES.MEDIUM, fallback = null, useProxy = false) => {
  if (!path) {
    return fallback || '/placeholder-image.jpg';
  }
  
  const cacheKey = `${path}_${size}_${useProxy}`;
  const cached = imageCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }
  
  // Use CORS-safe URL generation
  const url = getDirectImageUrl(path, size);
    
  // Clean cache before adding new entry
  cleanupCache();
  
  imageCache.set(cacheKey, {
    url,
    timestamp: Date.now()
  });
  
  return url;
};

// Progressive image loading with CORS-safe approach
export const getProgressiveImageUrls = (path, targetSize = IMAGE_SIZES.LARGE, useProxy = false) => {
  if (!path) {
    return {
      placeholder: '/placeholder-image.jpg',
      src: '/placeholder-image.jpg',
      srcSet: ''
    };
  }
  
  const sizes = PROGRESSIVE_SIZES.filter(size => {
    const sizeValue = parseInt(size.replace('w', ''));
    const targetValue = parseInt(targetSize.replace('w', ''));
    return sizeValue <= targetValue;
  });
  
  const baseUrl = TMDB_IMAGE_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const srcSet = sizes
    .map(size => `${baseUrl}/${size}${cleanPath} ${size.replace('w', '')}w`)
    .join(', ');
  
  return {
    placeholder: getOptimizedImageUrl(path, IMAGE_SIZES.THUMBNAIL, null, useProxy),
    src: getOptimizedImageUrl(path, targetSize, null, useProxy),
    srcSet
  };
};

// Enhanced lazy loading with intersection observer, CORS handling, and performance optimization
export const createLazyImageLoader = (options = {}) => {
  const {
    rootMargin = '300px', // Increased for better preloading
    threshold = 0.1,
    fallback = '/placeholder-image.jpg',
    priority = 'normal', // 'high', 'normal', 'low'
    maxConcurrent = 3 // Limit concurrent image loads
  } = options;
  
  // Adjust rootMargin based on priority and device performance
  const adjustedRootMargin = priority === 'high' ? '500px' : 
                            priority === 'low' ? '100px' : 
                            navigator.hardwareConcurrency > 4 ? '400px' : '200px';
  
  let loadingCount = 0;
  const loadingQueue = [];
  
  const processQueue = () => {
    if (loadingCount >= maxConcurrent || loadingQueue.length === 0) return;
    
    const { img, src, srcSet } = loadingQueue.shift();
    loadingCount++;
    
    const loadImage = () => {
      if (src) {
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.removeAttribute('data-src');
      }
      
      if (srcSet) {
        img.srcset = srcSet;
        img.removeAttribute('data-srcset');
      }
      
      img.classList.remove('lazy');
      observer.unobserve(img);
      loadingCount--;
      
      // Process next item in queue
      processQueue();
    };
    
    // Add small delay to prevent overwhelming the browser
    setTimeout(loadImage, 50);
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        const srcSet = img.dataset.srcset;
        
        // Add to queue instead of loading immediately
        loadingQueue.push({ img, src, srcSet });
        processQueue();
      }
    });
  }, {
    rootMargin: adjustedRootMargin,
    threshold
  });
  
  return {
    observe: (element) => observer.observe(element),
    unobserve: (element) => observer.unobserve(element),
    disconnect: () => observer.disconnect()
  };
};

// Preload critical images with CORS handling
export const preloadImages = async (imagePaths, size = IMAGE_SIZES.MEDIUM) => {
  const preloadPromises = imagePaths
    .filter(path => path)
    .map(path => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Handle CORS
        img.onload = () => resolve(path);
        img.onerror = () => resolve(null);
        img.src = getOptimizedImageUrl(path, size);
      });
    });
  
  return Promise.allSettled(preloadPromises);
};

// Optimized movie poster component props with CORS handling
export const getMoviePosterProps = (movie, size = IMAGE_SIZES.LARGE) => {
  const imageUrls = getProgressiveImageUrls(movie.poster_path, size);
  
  return {
    src: imageUrls.src,
    srcSet: imageUrls.srcSet,
    alt: movie.title || movie.name || 'Movie poster',
    loading: 'lazy',
    className: 'movie-poster',
    crossOrigin: 'anonymous', // Handle CORS
    'data-src': imageUrls.src,
    'data-srcset': imageUrls.srcSet,
    'data-placeholder': imageUrls.placeholder
  };
};

// Optimized backdrop image props with CORS handling
export const getBackdropProps = (movie, size = IMAGE_SIZES.EXTRA_LARGE) => {
  const imageUrls = getProgressiveImageUrls(movie.backdrop_path, size);
  
  return {
    src: imageUrls.src,
    srcSet: imageUrls.srcSet,
    alt: `${movie.title || movie.name} backdrop`,
    loading: 'lazy',
    className: 'backdrop-image',
    crossOrigin: 'anonymous', // Handle CORS
    'data-src': imageUrls.src,
    'data-srcset': imageUrls.srcSet,
    'data-placeholder': imageUrls.placeholder
  };
};

// Optimized profile image props with CORS handling
export const getProfileImageProps = (person, size = IMAGE_SIZES.MEDIUM) => {
  const imageUrls = getProgressiveImageUrls(person.profile_path, size);
  
  return {
    src: imageUrls.src,
    srcSet: imageUrls.srcSet,
    alt: person.name || 'Profile image',
    loading: 'lazy',
    className: 'profile-image',
    crossOrigin: 'anonymous', // Handle CORS
    'data-src': imageUrls.src,
    'data-srcset': imageUrls.srcSet,
    'data-placeholder': imageUrls.placeholder
  };
};

// Image quality optimization based on network
export const getOptimalImageSize = (networkType = 'unknown') => {
  switch (networkType) {
    case 'slow-2g':
    case '2g':
      return IMAGE_SIZES.SMALL;
    case '3g':
      return IMAGE_SIZES.MEDIUM;
    case '4g':
    case 'wifi':
    case 'ethernet':
      return IMAGE_SIZES.LARGE;
    default:
      return IMAGE_SIZES.MEDIUM;
  }
};

// Network-aware image loading
export const getNetworkOptimizedImageUrl = (path, fallback = null) => {
  if (typeof navigator !== 'undefined' && navigator.connection) {
    const networkType = navigator.connection.effectiveType || navigator.connection.type || 'unknown';
    const optimalSize = getOptimalImageSize(networkType);
    return getOptimizedImageUrl(path, optimalSize, fallback);
  }
  
  return getOptimizedImageUrl(path, IMAGE_SIZES.MEDIUM, fallback);
};

// Clear image cache
export const clearImageCache = () => {
  imageCache.clear();
};

// Get cache statistics
export const getImageCacheStats = () => {
  return {
    size: imageCache.size,
    entries: Array.from(imageCache.keys())
  };
};

// Optimized image component hook
export const useOptimizedImage = (path, size = IMAGE_SIZES.MEDIUM) => {
  const [imageState, setImageState] = useState({
    src: null,
    loading: true,
    error: false
  });
  
  useEffect(() => {
    if (!path) {
      setImageState({
        src: '/placeholder-image.jpg',
        loading: false,
        error: false
      });
      return;
    }
    
    setImageState(prev => ({ ...prev, loading: true, error: false }));
    
    const img = new Image();
    img.onload = () => {
      setImageState({
        src: img.src,
        loading: false,
        error: false
      });
    };
    img.onerror = () => {
      setImageState({
        src: '/placeholder-image.jpg',
        loading: false,
        error: true
      });
    };
    img.src = getOptimizedImageUrl(path, size);
  }, [path, size]);
  
  return imageState;
}; 