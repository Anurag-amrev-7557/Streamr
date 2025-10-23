// Performance Optimization Service for Ultra-Fast Initial Loading
import performanceMonitor from './performanceMonitor.js';

class PerformanceOptimizationService {
  constructor() {
    this.config = {
      // Critical content loading - Optimized for faster loading
      criticalSections: ['featured', 'trending'],
      highPrioritySections: ['popular', 'topRated', 'upcoming'],
      mediumPrioritySections: [
        'action', 'comedy', 'drama', 'horror', 'sciFi', 'documentary',
        'family', 'animation', 'awardWinning', 'latest', 'popularTV',
        'topRatedTV', 'airingToday', 'nowPlaying'
      ],
      lowPrioritySections: [], // Moved all sections to higher priority
      
      // Loading strategies - Optimized for faster loading and memory efficiency
      maxConcurrentRequests: 4, // Optimized for memory efficiency
      requestTimeout: 8000, // Increased for better reliability
      batchDelay: 150, // Optimized for smooth loading
      idleDelay: 300, // Faster idle loading
      
      // Memory optimization
      maxCacheSize: 500, // Limit cache size to prevent memory issues
  memoryThreshold: 200 * 1024 * 1024, // 200MB memory threshold (raised to reduce premature cleanup)
      aggressiveCleanup: true, // Enable aggressive memory cleanup
      
      // Cache optimization
      aggressiveCaching: true,
      prefetchThreshold: 0.8, // Start prefetching when 80% loaded
      cacheWarmup: true,
      
      // Persistent cache settings
      persistentCacheEnabled: true,
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      maxCacheAge: 30 * 60 * 1000 // 30 minutes max age
    };
    
    this.state = {
      isInitialLoadComplete: false,
      loadedSections: new Set(),
      pendingRequests: new Map(),
      performanceMetrics: {
        initialLoadTime: 0,
        criticalLoadTime: 0,
        highPriorityLoadTime: 0,
        mediumPriorityLoadTime: 0,
        cacheHitRate: 0
      }
    };
    
    // Persistent cache for cross-navigation
    this.persistentCache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    this.observers = new Set();
    
    // Initialize persistent cache from localStorage if available
    this.initializePersistentCache();
    
    // Initialize memory monitoring
    this.initializeMemoryMonitoring();
  }

  // Initialize persistent cache from localStorage
  initializePersistentCache() {
    if (!this.config.persistentCacheEnabled) return;
    
    try {
      const cachedData = localStorage.getItem('streamr_persistent_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.persistentCache = new Map(parsed.cache || []);
        this.cacheTimestamps = new Map(parsed.timestamps || []);
        this.cacheHits = parsed.cacheHits || 0;
        this.cacheMisses = parsed.cacheMisses || 0;
        
        // Clean expired entries
        this.cleanExpiredCache();
        
        console.log('✅ Persistent cache restored:', {
          entries: this.persistentCache.size,
          hits: this.cacheHits,
          misses: this.cacheMisses
        });
      }
    } catch (error) {
      console.warn('Failed to restore persistent cache:', error);
      this.clearPersistentCache();
    }
  }

  // Save persistent cache to localStorage
  savePersistentCache() {
    if (!this.config.persistentCacheEnabled) return;
    
    try {
      const dataToSave = {
        cache: Array.from(this.persistentCache.entries()),
        timestamps: Array.from(this.cacheTimestamps.entries()),
        cacheHits: this.cacheHits,
        cacheMisses: this.cacheMisses,
        lastSaved: Date.now()
      };
      
      localStorage.setItem('streamr_persistent_cache', JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Failed to save persistent cache:', error);
    }
  }

  // Get cached data for a section
  getCachedSection(sectionKey) {
    if (!this.config.persistentCacheEnabled) return null;
    
    const cached = this.persistentCache.get(sectionKey);
    if (!cached) {
      this.cacheMisses++;
      return null;
    }
    
    const timestamp = this.cacheTimestamps.get(sectionKey);
    const age = Date.now() - timestamp;
    
    // Check if cache is still valid
    if (age > this.config.maxCacheAge) {
      this.persistentCache.delete(sectionKey);
      this.cacheTimestamps.delete(sectionKey);
      this.cacheMisses++;
      return null;
    }
    
    this.cacheHits++;
    return cached;
  }

  // Set cached data for a section
  setCachedSection(sectionKey, data) {
    if (!this.config.persistentCacheEnabled) return;
    
    this.persistentCache.set(sectionKey, data);
    this.cacheTimestamps.set(sectionKey, Date.now());
    
    // Save to localStorage periodically
    if (this.persistentCache.size % 5 === 0) { // Save every 5 entries
      this.savePersistentCache();
    }
  }

  // Clean expired cache entries
  cleanExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.config.maxCacheAge) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.persistentCache.delete(key);
      this.cacheTimestamps.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }

  // Clear persistent cache
  clearPersistentCache() {
    this.persistentCache.clear();
    this.cacheTimestamps.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    try {
      localStorage.removeItem('streamr_persistent_cache');
    } catch (error) {
      console.warn('Failed to clear persistent cache from localStorage:', error);
    }
  }

  // Initialize memory monitoring
  initializeMemoryMonitoring() {
    if (!this.config.aggressiveCleanup) return;
    
    // Monitor memory usage every 10 seconds
    setInterval(() => {
      this.checkMemoryUsage();
    }, 10000);
    
    // Monitor memory on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performMemoryCleanup();
      }
    });
  }

  // Check memory usage and trigger cleanup if needed
  checkMemoryUsage() {
    if (!performance.memory) return;
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    
    if (memoryMB > this.config.memoryThreshold / 1024 / 1024) {
      console.warn(`[PerformanceService] High memory usage: ${memoryMB.toFixed(2)}MB - triggering cleanup`);
      this.performMemoryCleanup();
    }
  }

  // Perform aggressive memory cleanup
  performMemoryCleanup() {
    console.log('[PerformanceService] Performing memory cleanup');
    
    // Clear old cache entries
    this.cleanExpiredCache();
    
    // Reduce cache size if too large
    if (this.persistentCache.size > this.config.maxCacheSize) {
      const entries = Array.from(this.persistentCache.entries());
      entries.sort((a, b) => (this.cacheTimestamps.get(a[0]) || 0) - (this.cacheTimestamps.get(b[0]) || 0));
      
      const toRemove = this.persistentCache.size - this.config.maxCacheSize;
      entries.slice(0, toRemove).forEach(([key]) => {
        this.persistentCache.delete(key);
        this.cacheTimestamps.delete(key);
      });
      
      console.log(`[PerformanceService] Removed ${toRemove} old cache entries`);
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  // Check if section data is available in cache
  isSectionCached(sectionKey) {
    if (!this.config.persistentCacheEnabled) return false;
    
    const cached = this.persistentCache.get(sectionKey);
    if (!cached) return false;
    
    const timestamp = this.cacheTimestamps.get(sectionKey);
    const age = Date.now() - timestamp;
    
    return age <= this.config.maxCacheAge;
  }

  // Get cache statistics
  getCacheStats() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    
    return {
      totalEntries: this.persistentCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: hitRate, // Return as number, not string
      totalRequests
    };
  }

  // 🚀 Ultra-fast initial loading strategy with persistent cache
  async executeInitialLoad(fetchFunctions, stateSetters = {}) {
    const startTime = performance.now();
    
    try {
      // PHASE 1: Check persistent cache for all sections first
      const cachedSections = new Set();
      const sectionsToFetch = new Set();
      
      // Check what's available in cache
      const allSections = [
        ...this.config.criticalSections,
        ...this.config.highPrioritySections,
        ...this.config.mediumPrioritySections,
        ...this.config.lowPrioritySections
      ];
      
      for (const section of allSections) {
        if (this.isSectionCached(section)) {
          const cachedData = this.getCachedSection(section);
          if (cachedData && stateSetters[section]) {
            stateSetters[section](cachedData);
            cachedSections.add(section);
            this.state.loadedSections.add(section);
          }
        } else {
          sectionsToFetch.add(section);
        }
      }
      
      console.log('📊 Cache status:', {
        cached: Array.from(cachedSections),
        toFetch: Array.from(sectionsToFetch),
        cacheStats: this.getCacheStats()
      });
      
      // If we have all critical sections cached, mark as complete immediately
      const criticalCached = this.config.criticalSections.every(section => 
        cachedSections.has(section)
      );
      
      if (criticalCached) {
        this.state.isInitialLoadComplete = true;
        this.notifyObservers('initialLoadComplete');
        console.log('✅ All critical sections loaded from cache');
      }
      
      // PHASE 2: Fetch only uncached sections
      if (sectionsToFetch.size > 0) {
        // Critical content first (if not cached)
        const criticalStart = performance.now();
        const criticalToFetch = this.config.criticalSections.filter(section => 
          sectionsToFetch.has(section)
        );
        
        if (criticalToFetch.length > 0) {
          const criticalPromises = criticalToFetch.map(async section => {
            const result = await this.fetchSectionWithTimeout(section, fetchFunctions[section]);
            if (result && stateSetters[section]) {
              stateSetters[section](result);
              // Cache the result
              this.setCachedSection(section, result);
            }
            return result;
          });
          
          await Promise.allSettled(criticalPromises);
          this.state.performanceMetrics.criticalLoadTime = performance.now() - criticalStart;
        }
        
        // High priority content (if not cached)
        const highPriorityStart = performance.now();
        const highPriorityToFetch = this.config.highPrioritySections.filter(section => 
          sectionsToFetch.has(section)
        );
        
        if (highPriorityToFetch.length > 0) {
          const highPriorityPromises = highPriorityToFetch.map(async section => {
            const result = await this.fetchSectionWithTimeout(section, fetchFunctions[section]);
            if (result && stateSetters[section]) {
              stateSetters[section](result);
              // Cache the result
              this.setCachedSection(section, result);
            }
            return result;
          });
          
          await Promise.allSettled(highPriorityPromises);
          this.state.performanceMetrics.highPriorityLoadTime = performance.now() - highPriorityStart;
        }
        
        // Medium priority content (if not cached) - Load immediately for faster experience
        const mediumPriorityStart = performance.now();
        const mediumPriorityToFetch = this.config.mediumPrioritySections.filter(section => 
          sectionsToFetch.has(section)
        );
        
        if (mediumPriorityToFetch.length > 0) {
          console.log(`🚀 Loading ${mediumPriorityToFetch.length} medium priority sections immediately`);
          const mediumPriorityPromises = mediumPriorityToFetch.map(async section => {
            const result = await this.fetchSectionWithTimeout(section, fetchFunctions[section]);
            if (result && stateSetters[section]) {
              stateSetters[section](result);
              // Cache the result
              this.setCachedSection(section, result);
            }
            return result;
          });
          
          // Load medium priority sections in parallel with high priority
          Promise.allSettled(mediumPriorityPromises).then(() => {
            this.state.performanceMetrics.mediumPriorityLoadTime = performance.now() - mediumPriorityStart;
            console.log('✅ Medium priority sections loaded');
          });
        }
        
        // Mark initial loading as complete
        this.state.isInitialLoadComplete = true;
        this.notifyObservers('initialLoadComplete');
        
        // Load remaining sections in background (only low priority now)
        const remainingSections = Array.from(sectionsToFetch).filter(section => 
          !this.config.criticalSections.includes(section) && 
          !this.config.highPrioritySections.includes(section) &&
          !this.config.mediumPrioritySections.includes(section)
        );
        
        if (remainingSections.length > 0) {
          this.loadRemainingSections(remainingSections, fetchFunctions, stateSetters);
        }
      }
      
      this.state.performanceMetrics.initialLoadTime = performance.now() - startTime;
      
      // Log performance metrics
      this.logPerformanceMetrics();
      
      return true;
      
    } catch (error) {
      console.error('❌ Critical error in initial load:', error);
      performanceMonitor.trackError(error, { 
        service: 'PerformanceOptimizationService', 
        function: 'executeInitialLoad' 
      });
      return false;
    }
  }

  // Fetch section with timeout and error handling
  async fetchSectionWithTimeout(sectionKey, fetchFunction) {
    if (!fetchFunction) {
      console.warn(`No fetch function for section: ${sectionKey}`);
      return null;
    }

    const requestKey = `${sectionKey}-initial`;
    
    // Check if request is already pending
    if (this.state.pendingRequests.has(requestKey)) {
      return this.state.pendingRequests.get(requestKey);
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout for ${sectionKey}`)), this.config.requestTimeout);
      });

      // Execute fetch with timeout
      const fetchPromise = fetchFunction(1);
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Mark section as loaded
      this.state.loadedSections.add(sectionKey);
      
      // Cache the result for future use
      if (result && this.config.persistentCacheEnabled) {
        this.setCachedSection(sectionKey, result);
      }
      
      return result;
      
    } catch (error) {
      console.warn(`Failed to load ${sectionKey}:`, error);
      return null;
    } finally {
      // Remove from pending requests
      this.state.pendingRequests.delete(requestKey);
    }
  }

  // Load remaining sections in background with caching - Optimized for faster loading
  async loadRemainingSections(sections, fetchFunctions, stateSetters = {}) {
    const batchSize = 4; // Increased from 2 to 4 sections at a time for faster loading
    
    console.log(`🚀 Loading ${sections.length} remaining sections in batches of ${batchSize}`);
    
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      console.log(`📦 Loading batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
      
      const batchPromises = batch.map(async section => {
        const result = await this.fetchSectionWithTimeout(section, fetchFunctions[section]);
        // Set state and cache the result
        if (result && stateSetters[section]) {
          stateSetters[section](result);
          this.setCachedSection(section, result);
          console.log(`✅ Loaded ${section} section`);
        }
        return result;
      });
      
      try {
        await Promise.allSettled(batchPromises);
        
        // Reduced delay between batches for faster loading
        if (i + batchSize < sections.length) {
          await new Promise(resolve => setTimeout(resolve, this.config.batchDelay));
        }
      } catch (error) {
        console.warn('Background section loading failed:', error);
      }
    }
    
    console.log('✅ All remaining sections loaded in background');
  }

  // Load medium priority content in background (kept for backward compatibility)
  async loadMediumPriorityContent(fetchFunctions, stateSetters = {}) {
    const batchSize = 2; // Load 2 sections at a time
    
    for (let i = 0; i < this.config.mediumPrioritySections.length; i += batchSize) {
      const batch = this.config.mediumPrioritySections.slice(i, i + batchSize);
      const batchPromises = batch.map(async section => {
        const result = await this.fetchSectionWithTimeout(section, fetchFunctions[section]);
        // Set state for medium priority content
        if (result && stateSetters[section]) {
          stateSetters[section](result);
          // Cache the result
          this.setCachedSection(section, result);
        }
        return result;
      });
      
      try {
        await Promise.allSettled(batchPromises);
        
        // Add delay between batches to prevent overwhelming the API
        if (i + batchSize < this.config.mediumPrioritySections.length) {
          await new Promise(resolve => setTimeout(resolve, this.config.batchDelay));
        }
      } catch (error) {
        console.warn('Medium priority batch loading failed:', error);
      }
    }
    
    console.log('✅ Medium priority content loaded in background');
  }

  // Schedule low priority content loading
  scheduleLowPriorityLoading(fetchFunctions, stateSetters = {}) {
    // Start loading after idle delay
    setTimeout(() => {
      this.loadLowPriorityContent(fetchFunctions, stateSetters);
    }, this.config.idleDelay);
  }

  // Load low priority content in small batches
  async loadLowPriorityContent(fetchFunctions, stateSetters = {}) {
    const batchSize = 2; // Load only 2 sections at a time
    
    const loadBatch = async (startIndex) => {
      const batch = this.config.lowPrioritySections.slice(startIndex, startIndex + batchSize);
      const batchPromises = batch.map(async section => {
        const result = await this.fetchSectionWithTimeout(section, fetchFunctions[section]);
        // Set state for low priority content
        if (result && stateSetters[section]) {
          stateSetters[section](result);
        }
        return result;
      });
      
      try {
        await Promise.allSettled(batchPromises);
        
        // Load next batch after a delay
        if (startIndex + batchSize < this.config.lowPrioritySections.length) {
          setTimeout(() => loadBatch(startIndex + batchSize), this.config.batchDelay);
        }
      } catch (error) {
        console.warn('Low priority batch loading failed:', error);
      }
    };
    
    // Start loading first batch
    loadBatch(0);
  }

  // Observer pattern for performance events
  addObserver(observer) {
    this.observers.add(observer);
  }

  removeObserver(observer) {
    this.observers.delete(observer);
  }

  notifyObservers(event, data = null) {
    this.observers.forEach(observer => {
      if (typeof observer === 'function') {
        observer(event, data);
      } else if (observer && typeof observer.handlePerformanceEvent === 'function') {
        observer.handlePerformanceEvent(event, data);
      }
    });
  }

  // Log performance metrics
  logPerformanceMetrics() {
    const metrics = this.state.performanceMetrics;
    const cacheStats = this.getCacheStats();
    
    console.log('🎯 Performance Optimization Service Metrics:', {
      initialLoadTime: `${metrics.initialLoadTime.toFixed(0)}ms`,
      criticalLoadTime: `${metrics.criticalLoadTime.toFixed(0)}ms`,
      highPriorityLoadTime: `${metrics.highPriorityLoadTime.toFixed(0)}ms`,
      mediumPriorityLoadTime: `${metrics.mediumPriorityLoadTime.toFixed(0)}ms`,
      loadedSections: Array.from(this.state.loadedSections),
      isInitialLoadComplete: this.state.isInitialLoadComplete,
      cacheStats: cacheStats
    });
  }

  // Get current performance state
  getPerformanceState() {
    return {
      ...this.state,
      config: this.config
    };
  }

  // Get performance metrics (alias for getPerformanceState for compatibility)
  getMetrics() {
    return this.getPerformanceState();
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset service state (preserves persistent cache)
  reset() {
    this.state = {
      isInitialLoadComplete: false,
      loadedSections: new Set(),
      pendingRequests: new Map(),
      performanceMetrics: {
        initialLoadTime: 0,
        criticalLoadTime: 0,
        highPriorityLoadTime: 0,
        mediumPriorityLoadTime: 0,
        cacheHitRate: 0
      }
    };
    
    // Don't clear persistent cache on reset - it should survive component remounts
    console.log('🔄 Service state reset (persistent cache preserved)');
    
    this.notifyObservers('reset');
  }

  // Cleanup
  cleanup() {
    this.observers.clear();
    this.state.pendingRequests.clear();
    this.state.loadedSections.clear();
    
    // Save persistent cache before cleanup
    if (this.config.persistentCacheEnabled) {
      this.savePersistentCache();
    }
  }
}

// Create singleton instance
const performanceOptimizationService = new PerformanceOptimizationService();

export default performanceOptimizationService; 