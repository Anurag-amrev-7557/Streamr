// Advanced Image Service
// Handles intelligent image loading, format optimization, and adaptive quality

import enhancedNetworkService from './enhancedNetworkService.js';

class AdvancedImageService {
  constructor() {
    this.imageCache = new Map();
    this.preloadQueue = new Map();
    this.intersectionObserver = null;
    this.performanceObserver = null;
    
    this.config = {
      cacheSize: 200,
      preloadDistance: 3,
      qualityThresholds: {
        highQuality: { format: 'webp', quality: 85, size: 'w780' },
        mediumQuality: { format: 'webp', quality: 75, size: 'w500' },
        lowQuality: { format: 'jpeg', quality: 60, size: 'w342' },
        slowConnection: { format: 'jpeg', quality: 50, size: 'w185' }
      },
      lazyLoadThreshold: 0.1,
      preloadThreshold: 0.5
    };
    
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalLoads: 0,
      averageLoadTime: 0,
      formatUsage: { webp: 0, jpeg: 0, png: 0 }
    };
    
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupPerformanceMonitoring();
    this.setupNetworkAdaptation();
    this.setupCacheCleanup();
  }

  // Setup intersection observer for lazy loading
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.intersectionObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: this.config.lazyLoadThreshold
      }
    );
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    if (!('PerformanceObserver' in window)) return;
    
    this.performanceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'resource' && entry.name.includes('image')) {
          this.trackImagePerformance(entry);
        }
      });
    });
    
    this.performanceObserver.observe({ entryTypes: ['resource'] });
  }

  // Setup network adaptation
  setupNetworkAdaptation() {
    window.addEventListener('networkQualityChange', (e) => {
      this.adaptToNetworkQuality(e.detail);
    });
  }

  // Setup cache cleanup
  setupCacheCleanup() {
    setInterval(() => {
      this.cleanupCache();
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  // Get optimal image configuration based on network quality
  getOptimalConfig() {
    const networkQuality = enhancedNetworkService.getStats().currentQuality;
    return this.config.qualityThresholds[networkQuality] || this.config.qualityThresholds.mediumQuality;
  }

  // Generate optimized image URL
  generateOptimizedUrl(imagePath, options = {}) {
    if (!imagePath) return null;
    
    const config = { ...this.getOptimalConfig(), ...options };
    const baseUrl = 'https://image.tmdb.org/t/p';
    
    // Ensure path starts with /
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    // Build URL with quality parameters
    let url = `${baseUrl}/${config.size}${cleanPath}`;
    
    // Add format parameter if supported
    if (config.format && config.format !== 'jpeg') {
      url += `?format=${config.format}`;
    }
    
    return url;
  }

  // Intelligent image loading with caching
  async loadImage(imgElement, options = {}) {
    const {
      src,
      alt = '',
      priority = false,
      preload = false,
      onLoad = null,
      onError = null
    } = options;

    if (!src) return;

    // Check cache first
    const cacheKey = this.generateCacheKey(src, options);
    const cached = this.imageCache.get(cacheKey);
    
    if (cached) {
      this.metrics.cacheHits++;
      this.setImageSource(imgElement, cached.url, alt);
      if (onLoad) onLoad(cached.url);
      return;
    }

    this.metrics.cacheMisses++;
    this.metrics.totalLoads++;

    // Generate optimized URL
    const optimizedUrl = this.generateOptimizedUrl(src, options);
    
    try {
      const startTime = performance.now();
      
      // Load image with timeout
      const imageUrl = await this.loadImageWithTimeout(optimizedUrl, priority);
      const loadTime = performance.now() - startTime;
      
      // Cache the result
      this.cacheImage(cacheKey, imageUrl, loadTime);
      
      // Set image source
      this.setImageSource(imgElement, imageUrl, alt);
      
      // Track performance
      this.updateLoadTimeMetrics(loadTime);
      
      if (onLoad) onLoad(imageUrl);
      
    } catch (error) {
      console.warn('Image load failed:', src, error);
      
      // Fallback to original image
      this.setImageSource(imgElement, src, alt);
      
      if (onError) onError(error);
    }
  }

  // Load image with timeout and retry logic
  async loadImageWithTimeout(url, priority = false) {
    const timeout = priority ? 5000 : 10000;
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        priority: priority ? 'high' : 'low'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Set image source with smooth loading
  setImageSource(imgElement, src, alt) {
    // Add loading class
    imgElement.classList.add('image-loading');
    
    // Create new image for preloading
    const tempImg = new Image();
    
    tempImg.onload = () => {
      // Smooth transition
      imgElement.style.opacity = '0';
      imgElement.src = src;
      imgElement.alt = alt;
      
      // Fade in
      requestAnimationFrame(() => {
        imgElement.style.transition = 'opacity 0.3s ease-in-out';
        imgElement.style.opacity = '1';
        imgElement.classList.remove('image-loading');
        imgElement.classList.add('image-loaded');
      });
    };
    
    tempImg.onerror = () => {
      imgElement.classList.remove('image-loading');
      imgElement.classList.add('image-error');
    };
    
    tempImg.src = src;
  }

  // Cache image with metadata
  cacheImage(key, url, loadTime) {
    // Check cache size limit
    if (this.imageCache.size >= this.config.cacheSize) {
      this.evictOldestCache();
    }
    
    this.imageCache.set(key, {
      url,
      loadTime,
      timestamp: Date.now(),
      accessCount: 1,
      size: this.estimateImageSize(url)
    });
  }

  // Generate cache key
  generateCacheKey(src, options) {
    const config = this.getOptimalConfig();
    return `${src}_${config.size}_${config.format}_${config.quality}`;
  }

  // Estimate image size (rough approximation)
  estimateImageSize(url) {
    // Extract size from URL
    const sizeMatch = url.match(/\/w(\d+)/);
    if (sizeMatch) {
      const width = parseInt(sizeMatch[1]);
      // Rough estimation: width * height * 3 bytes (RGB) * compression factor
      return Math.round((width * width * 1.5 * 3) / 1024); // KB
    }
    return 100; // Default estimate
  }

  // Preload images for better UX
  async preloadImages(imageUrls, priority = 'low') {
    const preloadPromises = imageUrls.map(url => 
      this.loadImageWithTimeout(url, priority === 'high')
    );
    
    try {
      const results = await Promise.allSettled(preloadPromises);
      
      // Cache successful preloads
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const cacheKey = this.generateCacheKey(imageUrls[index]);
          this.cacheImage(cacheKey, result.value, 0);
        }
      });
      
      return results;
    } catch (error) {
      console.warn('Preload failed:', error);
      return [];
    }
  }

  // Lazy load image with intersection observer
  observeImage(imgElement, options = {}) {
    if (!this.intersectionObserver) {
      // Fallback: load immediately
      this.loadImage(imgElement, options);
      return;
    }
    
    // Add data attributes for lazy loading
    imgElement.dataset.src = options.src;
    imgElement.dataset.alt = options.alt || '';
    imgElement.dataset.priority = options.priority ? 'true' : 'false';
    
    // Set placeholder
    imgElement.src = this.generatePlaceholder(options.src);
    
    // Observe for intersection
    this.intersectionObserver.observe(imgElement);
  }

  // Generate placeholder image
  generatePlaceholder(src) {
    // Generate a simple placeholder based on image path
    const hash = this.simpleHash(src);
    const colors = [
      '#1a1d24', '#2b3036', '#3a3f47', '#4a4f57',
      '#5a5f67', '#6a6f77', '#7a7f87', '#8a8f97'
    ];
    
    const color = colors[hash % colors.length];
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" viewBox="0 0 100 150"><rect width="100" height="150" fill="${color}"/></svg>`;
  }

  // Simple hash function
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Track image performance
  trackImagePerformance(entry) {
    const loadTime = entry.duration;
    this.updateLoadTimeMetrics(loadTime);
    
    // Track format usage
    const url = entry.name;
    if (url.includes('.webp')) {
      this.metrics.formatUsage.webp++;
    } else if (url.includes('.jpeg') || url.includes('.jpg')) {
      this.metrics.formatUsage.jpeg++;
    } else if (url.includes('.png')) {
      this.metrics.formatUsage.png++;
    }
  }

  // Update load time metrics
  updateLoadTimeMetrics(loadTime) {
    this.metrics.averageLoadTime = 
      (this.metrics.averageLoadTime * (this.metrics.totalLoads - 1) + loadTime) / 
      this.metrics.totalLoads;
  }

  // Adapt to network quality changes
  adaptToNetworkQuality(networkInfo) {
    const quality = networkInfo.quality;
    
    // Adjust preload distance based on network quality
    const distances = {
      highQuality: 5,
      mediumQuality: 3,
      lowQuality: 2,
      slowConnection: 1
    };
    
    this.config.preloadDistance = distances[quality] || 3;
    
    // Clear high-quality cache for slow connections
    if (quality === 'slowConnection') {
      this.clearHighQualityCache();
    }
  }

  // Clear high-quality cache
  clearHighQualityCache() {
    const keysToDelete = [];
    
    for (const [key, value] of this.imageCache.entries()) {
      if (key.includes('w780') || key.includes('w500')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.imageCache.delete(key));
  }

  // Cleanup cache
  cleanupCache() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, value] of this.imageCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.imageCache.delete(key);
      }
    }
  }

  // Evict oldest cache entry
  evictOldestCache() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, value] of this.imageCache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.imageCache.delete(oldestKey);
    }
  }

  // Get image statistics
  getStats() {
    const cacheHitRate = this.metrics.totalLoads > 0 
      ? this.metrics.cacheHits / this.metrics.totalLoads 
      : 0;
    
    return {
      cache: {
        size: this.imageCache.size,
        hitRate: cacheHitRate,
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses
      },
      performance: {
        averageLoadTime: this.metrics.averageLoadTime,
        totalLoads: this.metrics.totalLoads
      },
      formats: this.metrics.formatUsage,
      config: {
        preloadDistance: this.config.preloadDistance,
        currentQuality: enhancedNetworkService.getStats().currentQuality
      }
    };
  }

  // Cleanup resources
  cleanup() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.imageCache.clear();
    this.preloadQueue.clear();
  }
}

// Create singleton instance
const advancedImageService = new AdvancedImageService();

// Export the singleton instance
export default advancedImageService;

// Export utility functions
export const imageUtils = {
  // Load image
  loadImage: (imgElement, options) => advancedImageService.loadImage(imgElement, options),
  
  // Observe image for lazy loading
  observeImage: (imgElement, options) => advancedImageService.observeImage(imgElement, options),
  
  // Preload images
  preloadImages: (imageUrls, priority) => advancedImageService.preloadImages(imageUrls, priority),
  
  // Generate optimized URL
  generateOptimizedUrl: (imagePath, options) => advancedImageService.generateOptimizedUrl(imagePath, options),
  
  // Get stats
  getStats: () => advancedImageService.getStats(),
  
  // Cleanup
  cleanup: () => advancedImageService.cleanup()
}; 