// Enhanced Cache Service with AI-Powered Optimization
import advancedCache from './advancedCacheService.js';
import performanceMonitor from './performanceMonitor.js';

class EnhancedCacheService {
  constructor() {
    this.config = {
      // Core settings
      maxMemory: 100 * 1024 * 1024, // 100MB
      maxEntries: 2000,
      compressionThreshold: 1024, // 1KB
      
      // Adaptive TTL settings
      adaptiveTTL: true,
      baseTTL: 15 * 60 * 1000, // 15 minutes
      maxTTL: 60 * 60 * 1000, // 1 hour
      minTTL: 5 * 60 * 1000, // 5 minutes
      
      // Intelligent prefetching
      prefetchEnabled: true,
      prefetchThreshold: 0.7, // Start prefetching when 70% scrolled
      maxPrefetchItems: 10,
      
      // Machine learning settings
      mlEnabled: true,
      learningRate: 0.1,
      predictionConfidence: 0.8,
      
      // Cache warming
      warmupEnabled: true,
      warmupDelay: 2000, // 2 seconds after page load
      
      // Compression settings
      compressionEnabled: true,
      compressionLevel: 6, // 0-9, higher = better compression but slower
      
      // Analytics
      analyticsEnabled: true,
      analyticsRetention: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    
    this.state = {
      isInitialized: false,
      prefetchQueue: new Map(),
      warmupQueue: new Map(),
      analytics: {
        accessPatterns: new Map(),
        hitRates: new Map(),
        userBehavior: new Map(),
        performanceMetrics: []
      },
      mlModel: {
        accessPredictions: new Map(),
        ttlPredictions: new Map(),
        priorityPredictions: new Map()
      }
    };
    
    // Initialize asynchronously but don't block constructor
    this.initialize().catch(error => {
      console.error('Background initialization failed:', error);
    });
  }

  // Initialize the enhanced cache service
  async initialize() {
    try {
      // Initialize IndexedDB for persistent storage
      await this.initializeIndexedDB();
      
      // Load analytics data
      await this.loadAnalytics();
      
      // Mark as initialized before starting background processes
      this.state.isInitialized = true;
      
      // Start background processes only after initialization is complete
      this.startBackgroundProcesses();
      
      // Initialize ML model
      if (this.config.mlEnabled) {
        this.initializeMLModel();
      }
      
      console.log('🚀 Enhanced Cache Service initialized');
    } catch (error) {
      console.error('Failed to initialize Enhanced Cache Service:', error);
      // Set initialized to true even if some components fail
      // This prevents the service from being completely broken
      this.state.isInitialized = true;
      
      // Don't start background processes if initialization failed
      console.warn('Enhanced Cache Service initialization incomplete, background processes disabled');
    }
  }

  // Initialize IndexedDB for persistent storage
  async initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EnhancedCacheDB', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('namespace', 'namespace', { unique: false });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('priority', 'priority', { unique: false });
        }
        
        // Analytics store
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
          analyticsStore.createIndex('type', 'type', { unique: false });
        }
        
        // ML model store
        if (!db.objectStoreNames.contains('mlModel')) {
          const mlStore = db.createObjectStore('mlModel', { keyPath: 'key' });
        }
      };
    });
  }

  // Enhanced set method with intelligent features
  async set(key, value, options = {}) {
    const {
      namespace = 'default',
      ttl = null,
      priority = 'normal',
      compress = this.config.compressionEnabled,
      tags = [],
      params = {},
      metadata = {}
    } = options;

    // Generate intelligent TTL if not provided
    const intelligentTTL = ttl || this.predictTTL(key, namespace, value);
    
    // Determine optimal priority
    const intelligentPriority = this.predictPriority(key, namespace, value);
    
    // Compress data if beneficial
    const compressedValue = compress ? await this.compressData(value) : value;
    
    // Create cache entry
    const entry = {
      key,
      value: compressedValue,
      compressed: compress,
      timestamp: Date.now(),
      ttl: intelligentTTL,
      priority: intelligentPriority,
      namespace,
      tags,
      params,
      metadata,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(compressedValue),
      predictedAccess: this.predictAccess(key, namespace)
    };

    // Store in memory cache
    const success = advancedCache.set(key, entry, {
      ttl: intelligentTTL,
      priority: intelligentPriority,
      namespace,
      tags,
      compress: false // Already compressed
    });

    // Store in IndexedDB for persistence
    if (success) {
      await this.storeInIndexedDB(entry);
      
      // Update analytics
      this.updateAnalytics('set', { key, namespace, size: entry.size });
      
      // Trigger prefetching if enabled
      if (this.config.prefetchEnabled) {
        this.schedulePrefetch(key, namespace, value);
      }
    }

    return success;
  }

  // Enhanced get method with intelligent features
  async get(key, options = {}) {
    const { namespace = 'default', params = {} } = options;
    
    // Try memory cache first
    let entry = advancedCache.get(key, { namespace, params });
    
    // If not in memory, try IndexedDB
    if (!entry) {
      entry = await this.getFromIndexedDB(key);
    }
    
    if (!entry) {
      this.updateAnalytics('miss', { key, namespace });
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      await this.delete(key);
      this.updateAnalytics('expired', { key, namespace });
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Decompress if necessary
    const value = entry.compressed ? await this.decompressData(entry.value) : entry.value;
    
    // Update analytics
    this.updateAnalytics('hit', { key, namespace, accessCount: entry.accessCount });
    
    // Update ML model
    this.updateMLModel(key, namespace, 'access');
    
    // Trigger background refresh if needed
    this.scheduleBackgroundRefresh(key, entry);
    
    return value;
  }

  // Intelligent TTL prediction based on access patterns
  predictTTL(key, namespace, value) {
    if (!this.config.adaptiveTTL) {
      return this.config.baseTTL;
    }

    const accessPattern = this.state.analytics.accessPatterns.get(`${namespace}:${key}`);
    if (!accessPattern) {
      return this.config.baseTTL;
    }

    const { frequency, recency, volatility } = accessPattern;
    
    // Calculate adaptive TTL based on access patterns
    let predictedTTL = this.config.baseTTL;
    
    // High frequency access = longer TTL
    if (frequency > 10) {
      predictedTTL *= 2;
    }
    
    // Recent access = longer TTL
    if (recency < 5 * 60 * 1000) { // 5 minutes
      predictedTTL *= 1.5;
    }
    
    // Low volatility = longer TTL
    if (volatility < 0.3) {
      predictedTTL *= 1.3;
    }
    
    // Apply bounds
    return Math.min(Math.max(predictedTTL, this.config.minTTL), this.config.maxTTL);
  }

  // Predict priority based on content type and user behavior
  predictPriority(key, namespace, value) {
    const mlPrediction = this.state.mlModel.priorityPredictions.get(`${namespace}:${key}`);
    if (mlPrediction && mlPrediction.confidence > this.config.predictionConfidence) {
      return mlPrediction.priority;
    }

    // Default priority logic
    if (namespace === 'movie' && key.includes('details')) {
      return 'high';
    }
    
    if (namespace === 'api' && key.includes('trending')) {
      return 'high';
    }
    
    if (namespace === 'user') {
      return 'critical';
    }
    
    return 'normal';
  }

  // Predict access patterns using ML
  predictAccess(key, namespace) {
    const mlPrediction = this.state.mlModel.accessPredictions.get(`${namespace}:${key}`);
    if (mlPrediction) {
      return {
        probability: mlPrediction.probability,
        nextAccess: mlPrediction.nextAccess,
        confidence: mlPrediction.confidence
      };
    }
    
    return { probability: 0.5, nextAccess: null, confidence: 0.5 };
  }

  // Advanced compression using modern algorithms
  async compressData(data) {
    if (!this.config.compressionEnabled) {
      return data;
    }

    try {
      // Use CompressionStream if available (modern browsers)
      if ('CompressionStream' in window) {
        const jsonString = JSON.stringify(data);
        const blob = new Blob([jsonString]);
        const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
        const compressedBlob = await new Response(stream).blob();
        return await compressedBlob.arrayBuffer();
      } else {
        // Fallback to simple compression
        return JSON.stringify(data);
      }
    } catch (error) {
      console.warn('Compression failed, using uncompressed data:', error);
      return data;
    }
  }

  // Decompress data
  async decompressData(data) {
    try {
      // Check if data is compressed (ArrayBuffer)
      if (data instanceof ArrayBuffer) {
        if ('DecompressionStream' in window) {
          const blob = new Blob([data]);
          const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
          const decompressedBlob = await new Response(stream).blob();
          const text = await decompressedBlob.text();
          return JSON.parse(text);
        }
      }
      
      // Fallback to JSON parsing
      return JSON.parse(data);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return data;
    }
  }

  // Intelligent prefetching based on user behavior
  schedulePrefetch(key, namespace, value) {
    const predictions = this.generatePrefetchPredictions(key, namespace, value);
    
    predictions.forEach(prediction => {
      const prefetchKey = `${prediction.type}_${prediction.id}`;
      
      if (!this.state.prefetchQueue.has(prefetchKey)) {
        this.state.prefetchQueue.set(prefetchKey, {
          ...prediction,
          priority: prediction.priority || 'low',
          scheduledAt: Date.now()
        });
      }
    });
    
    // Process prefetch queue
    this.processPrefetchQueue();
  }

  // Generate prefetch predictions
  generatePrefetchPredictions(key, namespace, value) {
    const predictions = [];
    
    if (namespace === 'movie' && value && value.id) {
      // Predict similar movies
      predictions.push({
        type: 'similar',
        id: value.id,
        url: `/api/movie/${value.id}/similar`,
        priority: 'medium'
      });
      
      // Predict recommendations
      predictions.push({
        type: 'recommendations',
        id: value.id,
        url: `/api/movie/${value.id}/recommendations`,
        priority: 'medium'
      });
      
      // Predict genre exploration
      if (value.genres && value.genres.length > 0) {
        const topGenre = value.genres[0];
        predictions.push({
          type: 'genre',
          id: topGenre.id,
          url: `/api/discover/movie?with_genres=${topGenre.id}`,
          priority: 'low'
        });
      }
    }
    
    return predictions;
  }

  // Process prefetch queue
  async processPrefetchQueue() {
    // Check if prefetchQueue is properly initialized
    if (!this.state || !this.state.prefetchQueue || this.state.prefetchQueue.size === 0) {
      return;
    }
    
    const entries = Array.from(this.state.prefetchQueue.entries());
    entries.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b[1].priority] - priorityOrder[a[1].priority];
    });
    
    // Process top entries
    const toProcess = entries.slice(0, this.config.maxPrefetchItems);
    
    for (const [key, entry] of toProcess) {
      try {
        const response = await fetch(entry.url);
        if (response.ok) {
          const data = await response.json();
          await this.set(key, data, {
            namespace: 'prefetch',
            priority: entry.priority,
            ttl: 30 * 60 * 1000 // 30 minutes for prefetched data
          });
        }
      } catch (error) {
        console.debug('Prefetch failed:', entry.url, error);
      } finally {
        this.state.prefetchQueue.delete(key);
      }
    }
  }

  // Cache warming on app startup
  async warmupCache() {
    if (!this.config.warmupEnabled) return;
    
    // Check if service is ready
    if (!this.state || !this.state.warmupQueue) {
      console.warn('Enhanced Cache Service not ready for warmup');
      return;
    }
    
    const warmupData = this.generateWarmupData();
    
    for (const item of warmupData) {
      this.state.warmupQueue.set(item.key, {
        ...item,
        scheduledAt: Date.now()
      });
    }
    
    // Process warmup queue with delay
    setTimeout(() => {
      this.processWarmupQueue();
    }, this.config.warmupDelay);
  }

  // Generate warmup data based on user patterns
  generateWarmupData() {
    const warmupData = [];
    
    // Add trending content
    warmupData.push({
      key: 'trending',
      url: '/api/tmdb/trending',
      priority: 'high',
      namespace: 'api'
    });
    
    // Add popular movies
    warmupData.push({
      key: 'popular',
      url: '/api/tmdb/popular',
      priority: 'high',
      namespace: 'api'
    });
    
    // Add user preferences if available
    const userPreferences = this.getUserPreferences();
    if (userPreferences.favoriteGenres) {
      userPreferences.favoriteGenres.forEach(genreId => {
        warmupData.push({
          key: `genre_${genreId}`,
          url: `/api/tmdb/discover/movie?with_genres=${genreId}`,
          priority: 'medium',
          namespace: 'api'
        });
      });
    }
    
    return warmupData;
  }

  // Process warmup queue
  async processWarmupQueue() {
    // Check if service is ready
    if (!this.state || !this.state.warmupQueue || this.state.warmupQueue.size === 0) {
      return;
    }
    
    for (const [key, entry] of this.state.warmupQueue.entries()) {
      try {
        const response = await fetch(entry.url);
        if (response.ok) {
          const data = await response.json();
          await this.set(key, data, {
            namespace: entry.namespace,
            priority: entry.priority,
            ttl: 60 * 60 * 1000 // 1 hour for warmup data
          });
        }
      } catch (error) {
        console.debug('Warmup failed:', entry.url, error);
      } finally {
        this.state.warmupQueue.delete(key);
      }
    }
  }

  // Background refresh for frequently accessed data
  scheduleBackgroundRefresh(key, entry) {
    const timeUntilExpiry = entry.timestamp + entry.ttl - Date.now();
    const refreshThreshold = entry.ttl * 0.2; // Refresh when 20% of TTL remains
    
    if (timeUntilExpiry < refreshThreshold && entry.accessCount > 5) {
      setTimeout(async () => {
        await this.refreshEntry(key, entry);
      }, timeUntilExpiry - refreshThreshold);
    }
  }

  // Refresh cache entry
  async refreshEntry(key, entry) {
    try {
      // Re-fetch data
      const response = await fetch(entry.metadata.url || key);
      if (response.ok) {
        const newData = await response.json();
        await this.set(key, newData, {
          namespace: entry.namespace,
          priority: entry.priority,
          ttl: entry.ttl,
          tags: entry.tags
        });
      }
    } catch (error) {
      console.debug('Background refresh failed:', key, error);
    }
  }

  // Update analytics
  updateAnalytics(type, data) {
    if (!this.config.analyticsEnabled) return;
    
    const timestamp = Date.now();
    const analyticsEntry = {
      type,
      data,
      timestamp,
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
    
    // Store in memory
    this.state.analytics.performanceMetrics.push(analyticsEntry);
    
    // Store in IndexedDB
    this.storeAnalytics(analyticsEntry);
    
    // Update access patterns
    if (type === 'hit' || type === 'miss') {
      this.updateAccessPatterns(data.key, data.namespace, type);
    }
  }

  // Update access patterns for ML
  updateAccessPatterns(key, namespace, type) {
    const patternKey = `${namespace}:${key}`;
    let pattern = this.state.analytics.accessPatterns.get(patternKey) || {
      hits: 0,
      misses: 0,
      accesses: [],
      lastAccess: 0
    };
    
    if (type === 'hit') pattern.hits++;
    if (type === 'miss') pattern.misses++;
    
    pattern.accesses.push(Date.now());
    pattern.lastAccess = Date.now();
    
    // Keep only recent accesses (last 100)
    if (pattern.accesses.length > 100) {
      pattern.accesses = pattern.accesses.slice(-100);
    }
    
    // Calculate metrics
    pattern.frequency = pattern.accesses.length;
    pattern.recency = Date.now() - pattern.lastAccess;
    pattern.volatility = this.calculateVolatility(pattern.accesses);
    
    this.state.analytics.accessPatterns.set(patternKey, pattern);
  }

  // Calculate volatility of access times
  calculateVolatility(accesses) {
    if (accesses.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < accesses.length; i++) {
      intervals.push(accesses[i] - accesses[i - 1]);
    }
    
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  // Update ML model
  updateMLModel(key, namespace, event) {
    if (!this.config.mlEnabled) return;
    
    const modelKey = `${namespace}:${key}`;
    
    // Update access predictions
    const accessPrediction = this.state.mlModel.accessPredictions.get(modelKey) || {
      probability: 0.5,
      nextAccess: null,
      confidence: 0.5,
      updates: 0
    };
    
    accessPrediction.updates++;
    accessPrediction.probability = Math.min(1, accessPrediction.probability + this.config.learningRate);
    accessPrediction.confidence = Math.min(1, accessPrediction.confidence + 0.01);
    
    this.state.mlModel.accessPredictions.set(modelKey, accessPrediction);
  }

  // Initialize ML model
  initializeMLModel() {
    // Load ML model from IndexedDB
    this.loadMLModel();
    
    // Start ML training interval
    setInterval(() => {
      this.trainMLModel();
    }, 5 * 60 * 1000); // Train every 5 minutes
  }

  // Train ML model
  async trainMLModel() {
    // Simple ML training based on access patterns
    for (const [key, pattern] of this.state.analytics.accessPatterns.entries()) {
      const prediction = this.state.mlModel.accessPredictions.get(key) || {
        probability: 0.5,
        nextAccess: null,
        confidence: 0.5,
        updates: 0
      };
      
      // Update prediction based on access frequency
      const frequencyScore = Math.min(1, pattern.frequency / 50);
      prediction.probability = prediction.probability * 0.9 + frequencyScore * 0.1;
      
      this.state.mlModel.accessPredictions.set(key, prediction);
    }
    
    // Save ML model
    await this.saveMLModel();
  }

  // Store in IndexedDB
  async storeInIndexedDB(entry) {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    await store.put(entry);
  }

  // Get from IndexedDB
  async getFromIndexedDB(key) {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return await store.get(key);
  }

  // Store analytics
  async storeAnalytics(entry) {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    
    await store.add(entry);
  }

  // Load analytics
  async loadAnalytics() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['analytics'], 'readonly');
      const store = transaction.objectStore('analytics');
      
      const cutoff = Date.now() - this.config.analyticsRetention;
      const index = store.index('timestamp');
      
      const entries = await index.getAll(IDBKeyRange.lowerBound(cutoff));
      
      // Ensure entries is an array before calling forEach
      if (Array.isArray(entries)) {
        entries.forEach(entry => {
          this.state.analytics.performanceMetrics.push(entry);
        });
      }
    } catch (error) {
      console.warn('Failed to load analytics:', error);
    }
  }

  // Load ML model
  async loadMLModel() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['mlModel'], 'readonly');
      const store = transaction.objectStore('mlModel');
      
      const entries = await store.getAll();
      
      // Ensure entries is an array before calling forEach
      if (Array.isArray(entries)) {
        entries.forEach(entry => {
          if (entry.key.startsWith('access_')) {
            this.state.mlModel.accessPredictions.set(entry.key.slice(7), entry.data);
          } else if (entry.key.startsWith('ttl_')) {
            this.state.mlModel.ttlPredictions.set(entry.key.slice(4), entry.data);
          } else if (entry.key.startsWith('priority_')) {
            this.state.mlModel.priorityPredictions.set(entry.key.slice(9), entry.data);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load ML model:', error);
    }
  }

  // Save ML model
  async saveMLModel() {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['mlModel'], 'readwrite');
    const store = transaction.objectStore('mlModel');
    
    // Save access predictions
    for (const [key, data] of this.state.mlModel.accessPredictions.entries()) {
      await store.put({ key: `access_${key}`, data });
    }
    
    // Save TTL predictions
    for (const [key, data] of this.state.mlModel.ttlPredictions.entries()) {
      await store.put({ key: `ttl_${key}`, data });
    }
    
    // Save priority predictions
    for (const [key, data] of this.state.mlModel.priorityPredictions.entries()) {
      await store.put({ key: `priority_${key}`, data });
    }
  }

  // Start background processes
  startBackgroundProcesses() {
    // Only start background processes if the service is properly initialized
    if (!this.state || !this.state.isInitialized) {
      console.warn('Enhanced Cache Service not ready, skipping background processes');
      return;
    }

    // Cleanup expired entries
    setInterval(async () => {
      if (this.isReady()) {
        try {
          await this.cleanup();
        } catch (error) {
          console.error('Background cleanup failed:', error);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Save analytics
    setInterval(() => {
      if (this.isReady()) {
        this.saveAnalytics();
      }
    }, 60 * 1000); // Every minute
    
    // Process prefetch queue
    setInterval(() => {
      if (this.isReady()) {
        this.processPrefetchQueue();
      }
    }, 10 * 1000); // Every 10 seconds
  }

  // Cleanup expired entries
  async cleanup() {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      // Clean memory cache
      if (advancedCache && typeof advancedCache.getKeys === 'function') {
        try {
          const memoryEntries = advancedCache.getKeys();
          // Ensure memoryEntries is iterable before iteration
          const memoryKeysArray = Array.isArray(memoryEntries) ? memoryEntries : Array.from(memoryEntries || []);
          
          for (const key of memoryKeysArray) {
            const entry = advancedCache.get(key);
            if (entry && this.isExpired(entry)) {
              advancedCache.delete(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          console.warn('Memory cache cleanup failed:', error);
        }
      }
      
      // Clean IndexedDB
      if (this.db) {
        try {
          const transaction = this.db.transaction(['cache'], 'readwrite');
          const store = transaction.objectStore('cache');
          const index = store.index('timestamp');
          
          const cutoff = now - this.config.maxTTL;
          const expiredKeys = await index.getAllKeys(IDBKeyRange.upperBound(cutoff));
          
          // Ensure expiredKeys is an array before iteration
          const keysArray = Array.isArray(expiredKeys) ? expiredKeys : Array.from(expiredKeys || []);
          
          for (const key of keysArray) {
            await store.delete(key);
            cleanedCount++;
          }
        } catch (error) {
          console.warn('IndexedDB cleanup failed:', error);
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Enhanced cache cleanup: removed ${cleanedCount} expired entries`);
      }
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  // Save analytics
  async saveAnalytics() {
    // Analytics are saved in real-time, this is just for cleanup
    if (this.state.analytics.performanceMetrics.length > 1000) {
      this.state.analytics.performanceMetrics = this.state.analytics.performanceMetrics.slice(-500);
    }
  }

  // Get user preferences
  getUserPreferences() {
    try {
      const preferences = localStorage.getItem('streamr_user_preferences');
      return preferences ? JSON.parse(preferences) : {};
    } catch {
      return {};
    }
  }

  // Calculate data size
  calculateSize(data) {
    try {
      if (data instanceof ArrayBuffer) {
        return data.byteLength;
      }
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  // Check if entry is expired
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // Delete entry
  async delete(key) {
    advancedCache.delete(key);
    
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      await store.delete(key);
    }
  }

  // Check if service is ready
  isReady() {
    return this.state && 
           this.state.isInitialized && 
           advancedCache && 
           typeof advancedCache.getStats === 'function';
  }

  // Wait for service to be ready
  async waitForReady(timeout = 5000) {
    const startTime = Date.now();
    
    while (!this.isReady() && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.isReady();
  }

  // Get cache statistics
  getStats() {
    try {
      // Check if service is ready
      if (!this.isReady()) {
        console.warn('Enhanced cache service not ready, returning fallback stats');
        return this.getFallbackStats();
      }
      
      const baseStats = advancedCache.getStats();
      const enhancedStats = {
        ...baseStats,
        prefetchQueueSize: this.state && this.state.prefetchQueue ? this.state.prefetchQueue.size : 0,
        warmupQueueSize: this.state && this.state.warmupQueue ? this.state.warmupQueue.size : 0,
        mlPredictions: this.state && this.state.mlModel && this.state.mlModel.accessPredictions ? this.state.mlModel.accessPredictions.size : 0,
        analyticsEntries: this.state && this.state.analytics && this.state.analytics.performanceMetrics ? this.state.analytics.performanceMetrics.length : 0,
        accessPatterns: this.state && this.state.analytics && this.state.analytics.accessPatterns ? this.state.analytics.accessPatterns.size : 0
      };
      
      return enhancedStats;
    } catch (error) {
      console.warn('Failed to get enhanced cache stats:', error);
      return this.getFallbackStats();
    }
  }

  // Get fallback statistics when service is not ready
  getFallbackStats() {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      memoryUsage: 0,
      hitRate: '0%',
      efficiency: 0,
      memoryUsageMB: '0.00',
      averageEntrySize: 0,
      prefetchQueueSize: 0,
      warmupQueueSize: 0,
      mlPredictions: 0,
      analyticsEntries: 0,
      accessPatterns: 0
    };
  }

  // Clear all cache
  async clear() {
    advancedCache.clear();
    
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      await store.clear();
    }
    
    // Clear queues safely
    if (this.state && this.state.prefetchQueue) {
      this.state.prefetchQueue.clear();
    }
    if (this.state && this.state.warmupQueue) {
      this.state.warmupQueue.clear();
    }
    
    // Clear analytics and ML data safely
    if (this.state && this.state.analytics) {
      this.state.analytics.performanceMetrics = [];
      if (this.state.analytics.accessPatterns) {
        this.state.analytics.accessPatterns.clear();
      }
    }
    
    if (this.state && this.state.mlModel) {
      if (this.state.mlModel.accessPredictions) {
        this.state.mlModel.accessPredictions.clear();
      }
      if (this.state.mlModel.ttlPredictions) {
        this.state.mlModel.ttlPredictions.clear();
      }
      if (this.state.mlModel.priorityPredictions) {
        this.state.mlModel.priorityPredictions.clear();
      }
    }
  }
}

// Create singleton instance
const enhancedCache = new EnhancedCacheService();

// Export the singleton instance
export default enhancedCache;

// Export utility functions
export const enhancedCacheUtils = {
  // Initialize cache warming
  warmup: () => enhancedCache.warmupCache(),
  
  // Get enhanced statistics
  getStats: () => enhancedCache.getStats(),
  
  // Clear all cache
  clear: () => enhancedCache.clear(),
  
  // Export cache data
  export: () => enhancedCache.export(),
  
  // Import cache data
  import: (data) => enhancedCache.import(data),
  
  // Generate cache key
  generateKey: (namespace, key, params = {}) => {
    return enhancedCache.generateKey(namespace, key, params);
  },
  
  // Invalidate by pattern
  invalidate: (options) => enhancedCache.invalidate(options),
  
  // Preload data
  preload: (keys, options) => enhancedCache.preload(keys, options)
}; 