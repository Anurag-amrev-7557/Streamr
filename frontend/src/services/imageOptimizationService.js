// Optimized Image Optimization Service
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

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

// Image cache for better performance
const imageCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Optimized image URL generation
export const getOptimizedImageUrl = (path, size = IMAGE_SIZES.MEDIUM, fallback = null) => {
  if (!path) {
    return fallback || '/placeholder-image.jpg';
  }
  
  const cacheKey = `${path}_${size}`;
  const cached = imageCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }
  
  const url = `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  imageCache.set(cacheKey, {
    url,
    timestamp: Date.now()
  });
  
  return url;
};

// Progressive image loading
export const getProgressiveImageUrls = (path, targetSize = IMAGE_SIZES.LARGE) => {
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
  
  const srcSet = sizes
    .map(size => `${TMDB_IMAGE_BASE_URL}/${size}${path} ${size.replace('w', '')}w`)
    .join(', ');
  
  return {
    placeholder: getOptimizedImageUrl(path, IMAGE_SIZES.THUMBNAIL),
    src: getOptimizedImageUrl(path, targetSize),
    srcSet
  };
};

// Lazy loading with intersection observer
export const createLazyImageLoader = (options = {}) => {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    fallback = '/placeholder-image.jpg'
  } = options;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        const srcSet = img.dataset.srcset;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        
        if (srcSet) {
          img.srcset = srcSet;
          img.removeAttribute('data-srcset');
        }
        
        img.classList.remove('lazy');
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin,
    threshold
  });
  
  return {
    observe: (element) => observer.observe(element),
    unobserve: (element) => observer.unobserve(element),
    disconnect: () => observer.disconnect()
  };
};

// Preload critical images
export const preloadImages = async (imagePaths, size = IMAGE_SIZES.MEDIUM) => {
  const preloadPromises = imagePaths
    .filter(path => path)
    .map(path => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(path);
        img.onerror = () => resolve(null);
        img.src = getOptimizedImageUrl(path, size);
      });
    });
  
  return Promise.allSettled(preloadPromises);
};

// Optimized movie poster component props
export const getMoviePosterProps = (movie, size = IMAGE_SIZES.LARGE) => {
  const imageUrls = getProgressiveImageUrls(movie.poster_path, size);
  
  return {
    src: imageUrls.src,
    srcSet: imageUrls.srcSet,
    alt: movie.title || movie.name || 'Movie poster',
    loading: 'lazy',
    className: 'movie-poster',
    'data-src': imageUrls.src,
    'data-srcset': imageUrls.srcSet,
    'data-placeholder': imageUrls.placeholder
  };
};

// Optimized backdrop image props
export const getBackdropProps = (movie, size = IMAGE_SIZES.EXTRA_LARGE) => {
  const imageUrls = getProgressiveImageUrls(movie.backdrop_path, size);
  
  return {
    src: imageUrls.src,
    srcSet: imageUrls.srcSet,
    alt: `${movie.title || movie.name} backdrop`,
    loading: 'lazy',
    className: 'backdrop-image',
    'data-src': imageUrls.src,
    'data-srcset': imageUrls.srcSet,
    'data-placeholder': imageUrls.placeholder
  };
};

// Optimized profile image props
export const getProfileImageProps = (person, size = IMAGE_SIZES.MEDIUM) => {
  const imageUrls = getProgressiveImageUrls(person.profile_path, size);
  
  return {
    src: imageUrls.src,
    srcSet: imageUrls.srcSet,
    alt: person.name || 'Profile image',
    loading: 'lazy',
    className: 'profile-image',
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