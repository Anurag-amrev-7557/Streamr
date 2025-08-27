// Enhanced Image Optimization Service
class EnhancedImageOptimizationService {
  constructor() {
    this.config = {
      // Image loading strategies
      lazyLoadingEnabled: true,
      progressiveLoadingEnabled: true,
      preloadingEnabled: true,
      
      // Image quality and format optimization
      webpEnabled: true,
      avifEnabled: true,
      qualityOptimization: true,
      adaptiveQuality: true,
      
      // Caching strategies
      memoryCacheEnabled: true,
      diskCacheEnabled: true,
      maxMemoryCacheSize: 50 * 1024 * 1024, // 50MB
      maxDiskCacheSize: 200 * 1024 * 1024, // 200MB
      
      // Performance settings
      maxConcurrentLoads: 4,
      loadTimeout: 10000,
      retryAttempts: 2,
      
      // Responsive image settings
      responsiveImagesEnabled: true,
      breakpoints: [320, 480, 768, 1024, 1440, 1920],
      pixelDensity: [1, 2],
      
      // Analytics
      analyticsEnabled: true,
      debugMode: import.meta.env.DEV
    };
    
    this.state = {
      isInitialized: false,
      memoryCache: new Map(),
      diskCache: new Map(),
      loadingQueue: new Map(),
      failedImages: new Set(),
      
      // Performance tracking
      stats: {
        totalRequests: 0,
        successfulLoads: 0,
        failedLoads: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageLoadTime: 0,
        totalLoadTime: 0
      },
      
      // Active loads
      activeLoads: 0,
      maxActiveLoads: this.config.maxConcurrentLoads,
      
      // Event listeners
      listeners: new Map()
    };
    
    // Initialize asynchronously
    this.initialize().catch(error => {
      console.error('Enhanced Image Optimization Service initialization failed:', error);
    });
  }

  // Initialize the service
  async initialize() {
    try {
      console.log('🖼️ Initializing Enhanced Image Optimization Service...');
      
      // Initialize caches
      await this.initializeCaches();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start background processes
      this.startBackgroundProcesses();
      
      // Mark as initialized
      this.state.isInitialized = true;
      
      console.log('✅ Enhanced Image Optimization Service initialized');
      
      // Emit initialization complete event
      this.emit('initialized', this.getStats());
      
    } catch (error) {
      console.error('Failed to initialize Enhanced Image Optimization Service:', error);
      throw error;
    }
  }

  // Initialize caches
  async initializeCaches() {
    // Initialize memory cache
    if (this.config.memoryCacheEnabled) {
      this.state.memoryCache = new Map();
    }
    
    // Initialize disk cache (IndexedDB)
    if (this.config.diskCacheEnabled) {
      await this.initializeIndexedDB();
    }
  }

  // Initialize IndexedDB for disk cache
  async initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ImageCacheDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for image cache
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });
  }

  // Setup event listeners
  setupEventListeners() {
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleOnline();
    });
    
    window.addEventListener('offline', () => {
      this.handleOffline();
    });
  }

  // Start background processes
  startBackgroundProcesses() {
    // Cache cleanup interval
    const cleanupInterval = setInterval(() => {
      this.cleanupCaches();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Store interval for cleanup
    this.cleanupInterval = cleanupInterval;
  }

  // Optimize image URL based on device capabilities
  optimizeImageUrl(originalUrl, options = {}) {
    if (!originalUrl) return null;
    
    const {
      width = 500,
      height = 750,
      quality = 80,
      format = 'auto',
      pixelDensity = 1
    } = options;
    
    // If it's already a full URL, return as is
    if (originalUrl.startsWith('http')) {
      return this.optimizeExternalImageUrl(originalUrl, options);
    }
    
    // For TMDB images, optimize the URL
    if (originalUrl.includes('tmdb.org')) {
      return this.optimizeTMDBImageUrl(originalUrl, options);
    }
    
    // For other images, try to optimize
    return this.optimizeGenericImageUrl(originalUrl, options);
  }

  // Optimize TMDB image URL
  optimizeTMDBImageUrl(originalUrl, options) {
    const { width, height, quality, format, pixelDensity } = options;
    
    // Extract the path from TMDB URL
    const path = originalUrl.replace('https://image.tmdb.org/t/p/', '');
    const size = this.getOptimalSize(width, height);
    
    // Build optimized URL
    let optimizedUrl = `https://image.tmdb.org/t/p/${size}${path}`;
    
    // Add format optimization if supported
    if (format === 'webp' && this.config.webpEnabled && this.supportsWebP()) {
      optimizedUrl += '?format=webp';
    } else if (format === 'avif' && this.config.avifEnabled && this.supportsAvif()) {
      optimizedUrl += '?format=avif';
    }
    
    return optimizedUrl;
  }

  // Optimize external image URL
  optimizeExternalImageUrl(originalUrl, options) {
    // For external images, we can't optimize the URL directly
    // But we can add query parameters for optimization if the service supports it
    const { quality, format } = options;
    
    let optimizedUrl = originalUrl;
    
    // Add quality parameter if supported
    if (quality && quality !== 80) {
      const separator = optimizedUrl.includes('?') ? '&' : '?';
      optimizedUrl += `${separator}quality=${quality}`;
    }
    
    // Add format parameter if supported
    if (format && format !== 'auto') {
      const separator = optimizedUrl.includes('?') ? '&' : '?';
      optimizedUrl += `${separator}format=${format}`;
    }
    
    return optimizedUrl;
  }

  // Optimize generic image URL
  optimizeGenericImageUrl(originalUrl, options) {
    // For generic images, return as is for now
    // This could be extended with image optimization services
    return originalUrl;
  }

  // Get optimal image size based on display size
  getOptimalSize(width, height) {
    const sizes = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'w1280', 'original'];
    const targetWidth = Math.max(width, height);
    
    for (const size of sizes) {
      const sizeWidth = parseInt(size.replace('w', '')) || 1920;
      if (sizeWidth >= targetWidth) {
        return size;
      }
    }
    
    return 'w500'; // Default fallback
  }

  // Check WebP support
  supportsWebP() {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  // Check AVIF support
  supportsAvif() {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = () => {
        resolve(avif.height === 1);
      };
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  }

  // Load image with optimization
  async loadImage(imageUrl, options = {}) {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }
    
    const startTime = performance.now();
    this.state.stats.totalRequests++;
    
    // Check memory cache first
    const cacheKey = this.generateCacheKey(imageUrl, options);
    const cachedImage = this.getFromMemoryCache(cacheKey);
    
    if (cachedImage) {
      this.state.stats.cacheHits++;
      return cachedImage;
    }
    
    this.state.stats.cacheMisses++;
    
    // Check if we're at max concurrent loads
    if (this.state.activeLoads >= this.state.maxActiveLoads) {
      // Queue the load
      return this.queueImageLoad(imageUrl, options);
    }
    
    // Load the image
    return this.performImageLoad(imageUrl, options, startTime);
  }

  // Perform actual image load
  async performImageLoad(imageUrl, options, startTime) {
    this.state.activeLoads++;
    
    try {
      // Optimize the URL
      const optimizedUrl = this.optimizeImageUrl(imageUrl, options);
      
      // Create image element
      const img = new Image();
      
      // Set up load promise
      const loadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Image load timeout'));
        }, this.config.loadTimeout);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Image load failed'));
        };
      });
      
      // Start loading
      img.src = optimizedUrl;
      
      // Wait for load
      const loadedImage = await loadPromise;
      
      // Calculate load time
      const loadTime = performance.now() - startTime;
      this.updateLoadStats(loadTime, true);
      
      // Cache the image
      const cacheKey = this.generateCacheKey(imageUrl, options);
      this.addToMemoryCache(cacheKey, loadedImage);
      
      // Emit load success event
      this.emit('imageLoaded', {
        url: imageUrl,
        optimizedUrl,
        loadTime,
        size: loadedImage.naturalWidth * loadedImage.naturalHeight
      });
      
      return loadedImage;
      
    } catch (error) {
      this.updateLoadStats(0, false);
      
      // Add to failed images set
      this.state.failedImages.add(imageUrl);
      
      // Emit load error event
      this.emit('imageLoadError', {
        url: imageUrl,
        error: error.message
      });
      
      throw error;
      
    } finally {
      this.state.activeLoads--;
      
      // Process queue if there are pending loads
      this.processLoadQueue();
    }
  }

  // Queue image load when at max concurrent loads
  async queueImageLoad(imageUrl, options) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        imageUrl,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.state.loadingQueue.set(imageUrl, queueItem);
      
      // Set timeout for queued items
      setTimeout(() => {
        if (this.state.loadingQueue.has(imageUrl)) {
          this.state.loadingQueue.delete(imageUrl);
          reject(new Error('Queued image load timeout'));
        }
      }, this.config.loadTimeout * 2);
    });
  }

  // Process loading queue
  processLoadQueue() {
    if (this.state.loadingQueue.size === 0 || this.state.activeLoads >= this.state.maxActiveLoads) {
      return;
    }
    
    // Get the oldest queued item
    const [imageUrl, queueItem] = this.state.loadingQueue.entries().next().value;
    this.state.loadingQueue.delete(imageUrl);
    
    // Process the queued load
    this.performImageLoad(queueItem.imageUrl, queueItem.options)
      .then(queueItem.resolve)
      .catch(queueItem.reject);
  }

  // Generate cache key
  generateCacheKey(imageUrl, options) {
    const optionsString = JSON.stringify(options);
    return `${imageUrl}|${optionsString}`;
  }

  // Get from memory cache
  getFromMemoryCache(cacheKey) {
    if (!this.config.memoryCacheEnabled) return null;
    
    const cached = this.state.memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 minutes TTL
      return cached.image;
    }
    
    // Remove expired entry
    if (cached) {
      this.state.memoryCache.delete(cacheKey);
    }
    
    return null;
  }

  // Add to memory cache
  addToMemoryCache(cacheKey, image) {
    if (!this.config.memoryCacheEnabled) return;
    
    // Check cache size
    if (this.state.memoryCache.size >= 100) { // Max 100 entries
      // Remove oldest entries
      const entries = Array.from(this.state.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove 20% of oldest entries
      const toRemove = entries.slice(0, Math.floor(entries.length * 0.2));
      toRemove.forEach(([key]) => this.state.memoryCache.delete(key));
    }
    
    this.state.memoryCache.set(cacheKey, {
      image,
      timestamp: Date.now()
    });
  }

  // Update load statistics
  updateLoadStats(loadTime, success) {
    if (success) {
      this.state.stats.successfulLoads++;
      this.state.stats.totalLoadTime += loadTime;
      this.state.stats.averageLoadTime = this.state.stats.totalLoadTime / this.state.stats.successfulLoads;
    } else {
      this.state.stats.failedLoads++;
    }
  }

  // Preload images
  async preloadImages(imageUrls, options = {}) {
    const preloadPromises = imageUrls.map(url => 
      this.loadImage(url, options).catch(error => {
        console.warn(`Failed to preload image: ${url}`, error);
        return null;
      })
    );
    
    return Promise.allSettled(preloadPromises);
  }

  // Cleanup caches
  cleanupCaches() {
    // Clean memory cache
    if (this.config.memoryCacheEnabled) {
      const now = Date.now();
      const ttl = 30 * 60 * 1000; // 30 minutes
      
      for (const [key, value] of this.state.memoryCache.entries()) {
        if (now - value.timestamp > ttl) {
          this.state.memoryCache.delete(key);
        }
      }
    }
    
    // Clean disk cache
    if (this.config.diskCacheEnabled && this.db) {
      this.cleanDiskCache();
    }
    
    // Clear failed images set
    this.state.failedImages.clear();
  }

  // Clean disk cache
  async cleanDiskCache() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const index = store.index('timestamp');
      
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      const range = IDBKeyRange.upperBound(cutoff);
      
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('Failed to clean disk cache:', error);
    }
  }

  // Handle page hidden
  handlePageHidden() {
    // Reduce concurrent loads
    this.state.maxActiveLoads = Math.max(1, this.state.maxActiveLoads - 1);
    
    // Clear non-essential caches
    this.cleanupCaches();
  }

  // Handle page visible
  handlePageVisible() {
    // Restore concurrent loads
    this.state.maxActiveLoads = this.config.maxConcurrentLoads;
  }

  // Handle online
  handleOnline() {
    // Restore full functionality
    this.config.loadTimeout = 10000;
    this.config.retryAttempts = 2;
  }

  // Handle offline
  handleOffline() {
    // Reduce functionality for offline mode
    this.config.loadTimeout = 5000;
    this.config.retryAttempts = 0;
  }

  // Event system
  on(event, callback) {
    if (!this.state.listeners.has(event)) {
      this.state.listeners.set(event, new Set());
    }
    this.state.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.state.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  emit(event, data) {
    const listeners = this.state.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn('Event listener error:', error);
        }
      });
    }
  }

  // Get statistics
  getStats() {
    return {
      ...this.state.stats,
      memoryCacheSize: this.state.memoryCache.size,
      loadingQueueSize: this.state.loadingQueue.size,
      activeLoads: this.state.activeLoads,
      failedImagesCount: this.state.failedImages.size
    };
  }

  // Clear all caches
  clearAllCaches() {
    this.state.memoryCache.clear();
    this.state.failedImages.clear();
    this.state.loadingQueue.clear();
    
    if (this.db) {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      store.clear();
    }
  }

  // Destroy the service
  destroy() {
    console.log('🗑️ Destroying Enhanced Image Optimization Service...');
    
    // Clear all caches
    this.clearAllCaches();
    
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Close database connection
    if (this.db) {
      this.db.close();
    }
    
    // Clear all listeners
    this.state.listeners.clear();
    
    // Clear all state
    this.state = null;
    
    console.log('✅ Enhanced Image Optimization Service destroyed');
  }
}

// Create singleton instance
const enhancedImageOptimizationService = new EnhancedImageOptimizationService();

// Auto-initialize in development
if (import.meta.env.DEV) {
  // Add to window for debugging
  window.enhancedImageOptimizationService = enhancedImageOptimizationService;
}

export default enhancedImageOptimizationService; 