// Enhanced Resource Manager - Centralized Resource Management System
import memoryManager from '../utils/memoryManager.js';
import performanceMonitor from './performanceMonitor.js';
import enhancedCacheService from './enhancedCacheService.js';
import performanceOptimizationService from './performanceOptimizationService.js';

class EnhancedResourceManager {
  constructor() {
    this.config = {
      // Resource monitoring
      monitoringEnabled: true,
      monitoringInterval: 10000, // 10 seconds
      criticalMemoryThreshold: 800, // MB
      warningMemoryThreshold: 600, // MB
      
      // Network optimization
      networkOptimizationEnabled: true,
      maxConcurrentRequests: 6,
      requestTimeout: 8000,
      retryAttempts: 2,
      
      // Cache management
      cacheOptimizationEnabled: true,
      maxCacheSize: 150 * 1024 * 1024, // 150MB
      cacheCleanupInterval: 5 * 60 * 1000, // 5 minutes
      
      // Performance optimization
      performanceOptimizationEnabled: true,
      lazyLoadingEnabled: true,
      imageOptimizationEnabled: true,
      
      // Memory management
      memoryOptimizationEnabled: true,
      garbageCollectionInterval: 30 * 1000, // 30 seconds
      memoryLeakDetectionEnabled: true,
      
      // Adaptive optimization
      adaptiveOptimizationEnabled: true,
      devicePerformanceThreshold: 0.7,
      
      // Analytics and reporting
      analyticsEnabled: true,
      debugMode: import.meta.env.DEV
    };
    
    this.state = {
      isInitialized: false,
      isMonitoring: false,
      currentMemoryUsage: 0,
      networkStatus: 'good',
      cacheStatus: 'good',
      performanceStatus: 'good',
      devicePerformance: 1.0,
      
      // Resource usage tracking
      resourceUsage: {
        memory: {
          current: 0,
          peak: 0,
          trend: 'stable'
        },
        network: {
          activeRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        cache: {
          size: 0,
          hitRate: 0,
          efficiency: 0
        },
        performance: {
          fps: 60,
          loadTime: 0,
          responsiveness: 1.0
        }
      },
      
      // Optimization history
      optimizationHistory: [],
      lastOptimization: 0,
      
      // Event listeners
      listeners: new Map(),
      
      // Background processes
      intervals: new Set(),
      timeouts: new Set()
    };
    
    // Initialize services
    this.services = {
      memory: memoryManager,
      performance: performanceMonitor,
      cache: enhancedCacheService,
      optimization: performanceOptimizationService
    };
    
    // Initialize asynchronously
    this.initialize().catch(error => {
      console.error('Enhanced Resource Manager initialization failed:', error);
    });
  }

  // Initialize the resource manager
  async initialize() {
    try {
      console.log('🚀 Initializing Enhanced Resource Manager...');
      
      // Initialize all services
      await this.initializeServices();
      
      // Start monitoring
      if (this.config.monitoringEnabled) {
        this.startMonitoring();
      }
      
      // Start background optimization processes
      this.startBackgroundProcesses();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Mark as initialized
      this.state.isInitialized = true;
      
      console.log('✅ Enhanced Resource Manager initialized successfully');
      
      // Emit initialization complete event
      this.emit('initialized', this.getStatus());
      
    } catch (error) {
      console.error('Failed to initialize Enhanced Resource Manager:', error);
      throw error;
    }
  }

  // Initialize all services
  async initializeServices() {
    const servicePromises = [
      this.services.memory.start(),
      this.services.performance.start(),
      this.services.cache.initialize(),
      this.services.optimization.initialize()
    ];
    
    await Promise.allSettled(servicePromises);
    
    // Register cleanup callbacks
    this.services.memory.registerCleanupCallback(() => {
      this.performComprehensiveCleanup();
    });
  }

  // Start monitoring resources
  startMonitoring() {
    if (this.state.isMonitoring) return;
    
    this.state.isMonitoring = true;
    
    // Memory monitoring
    const memoryInterval = setInterval(() => {
      this.monitorMemory();
    }, this.config.monitoringInterval);
    
    // Network monitoring
    const networkInterval = setInterval(() => {
      this.monitorNetwork();
    }, this.config.monitoringInterval);
    
    // Cache monitoring
    const cacheInterval = setInterval(() => {
      this.monitorCache();
    }, this.config.cacheCleanupInterval);
    
    // Performance monitoring
    const performanceInterval = setInterval(() => {
      this.monitorPerformance();
    }, this.config.monitoringInterval);
    
    // Store intervals for cleanup
    this.state.intervals.add(memoryInterval);
    this.state.intervals.add(networkInterval);
    this.state.intervals.add(cacheInterval);
    this.state.intervals.add(performanceInterval);
    
    console.log('📊 Resource monitoring started');
  }

  // Monitor memory usage
  monitorMemory() {
    if (!performance.memory) return;
    
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    this.state.currentMemoryUsage = memoryMB;
    
    // Update resource usage
    this.state.resourceUsage.memory.current = memoryMB;
    this.state.resourceUsage.memory.peak = Math.max(
      this.state.resourceUsage.memory.peak,
      memoryMB
    );
    
    // Determine trend
    const recentMemory = this.state.optimizationHistory
      .filter(h => h.type === 'memory')
      .slice(-5)
      .map(h => h.value);
    
    if (recentMemory.length >= 3) {
      const trend = recentMemory[recentMemory.length - 1] - recentMemory[0];
      this.state.resourceUsage.memory.trend = 
        trend > 50 ? 'increasing' : 
        trend < -50 ? 'decreasing' : 'stable';
    }
    
    // Check thresholds
    if (memoryMB > this.config.criticalMemoryThreshold) {
      this.handleCriticalMemoryUsage();
    } else if (memoryMB > this.config.warningMemoryThreshold) {
      this.handleWarningMemoryUsage();
    }
    
    // Record in history
    this.recordOptimization('memory', memoryMB);
  }

  // Monitor network status
  monitorNetwork() {
    // Get network metrics from performance monitor
    const networkMetrics = this.services.performance.getNetworkMetrics();
    
    this.state.resourceUsage.network = {
      activeRequests: networkMetrics.activeRequests || 0,
      failedRequests: networkMetrics.failedRequests || 0,
      averageResponseTime: networkMetrics.averageResponseTime || 0
    };
    
    // Determine network status
    const { activeRequests, failedRequests, averageResponseTime } = this.state.resourceUsage.network;
    
    if (failedRequests > 10 || averageResponseTime > 5000) {
      this.state.networkStatus = 'poor';
      this.handlePoorNetworkPerformance();
    } else if (failedRequests > 5 || averageResponseTime > 2000) {
      this.state.networkStatus = 'fair';
    } else {
      this.state.networkStatus = 'good';
    }
    
    // Record in history
    this.recordOptimization('network', averageResponseTime);
  }

  // Monitor cache performance
  monitorCache() {
    const cacheStats = this.services.cache.getStats();
    
    if (cacheStats) {
      this.state.resourceUsage.cache = {
        size: cacheStats.size || 0,
        hitRate: cacheStats.hitRate || 0,
        efficiency: cacheStats.efficiency || 0
      };
      
      // Determine cache status
      const { hitRate, efficiency } = this.state.resourceUsage.cache;
      
      if (hitRate < 0.3 || efficiency < 0.5) {
        this.state.cacheStatus = 'poor';
        this.handlePoorCachePerformance();
      } else if (hitRate < 0.6 || efficiency < 0.7) {
        this.state.cacheStatus = 'fair';
      } else {
        this.state.cacheStatus = 'good';
      }
    }
    
    // Record in history
    this.recordOptimization('cache', this.state.resourceUsage.cache.hitRate);
  }

  // Monitor performance metrics
  monitorPerformance() {
    const performanceMetrics = this.services.performance.getMetrics();
    
    this.state.resourceUsage.performance = {
      fps: performanceMetrics.fps || 60,
      loadTime: performanceMetrics.loadTime || 0,
      responsiveness: performanceMetrics.responsiveness || 1.0
    };
    
    // Determine performance status
    const { fps, responsiveness } = this.state.resourceUsage.performance;
    
    if (fps < 30 || responsiveness < 0.5) {
      this.state.performanceStatus = 'poor';
      this.handlePoorPerformance();
    } else if (fps < 50 || responsiveness < 0.7) {
      this.state.performanceStatus = 'fair';
    } else {
      this.state.performanceStatus = 'good';
    }
    
    // Record in history
    this.recordOptimization('performance', fps);
  }

  // Handle critical memory usage
  handleCriticalMemoryUsage() {
    console.warn('🚨 Critical memory usage detected');
    
    // Perform aggressive cleanup
    this.performAggressiveCleanup();
    
    // Emit critical event
    this.emit('critical', {
      type: 'memory',
      usage: this.state.currentMemoryUsage,
      threshold: this.config.criticalMemoryThreshold
    });
  }

  // Handle warning memory usage
  handleWarningMemoryUsage() {
    console.warn('⚠️ Warning memory usage detected');
    
    // Perform moderate cleanup
    this.performModerateCleanup();
    
    // Emit warning event
    this.emit('warning', {
      type: 'memory',
      usage: this.state.currentMemoryUsage,
      threshold: this.config.warningMemoryThreshold
    });
  }

  // Handle poor network performance
  handlePoorNetworkPerformance() {
    console.warn('🌐 Poor network performance detected');
    
    // Optimize network requests
    this.optimizeNetworkRequests();
    
    // Emit network event
    this.emit('network', {
      status: 'poor',
      metrics: this.state.resourceUsage.network
    });
  }

  // Handle poor cache performance
  handlePoorCachePerformance() {
    console.warn('💾 Poor cache performance detected');
    
    // Optimize cache
    this.optimizeCache();
    
    // Emit cache event
    this.emit('cache', {
      status: 'poor',
      metrics: this.state.resourceUsage.cache
    });
  }

  // Handle poor performance
  handlePoorPerformance() {
    console.warn('⚡ Poor performance detected');
    
    // Optimize performance
    this.optimizePerformance();
    
    // Emit performance event
    this.emit('performance', {
      status: 'poor',
      metrics: this.state.resourceUsage.performance
    });
  }

  // Perform comprehensive cleanup
  performComprehensiveCleanup() {
    console.log('🧹 Performing comprehensive cleanup...');
    
    // Clear all caches
    this.services.cache.clearAll();
    
    // Clear memory
    this.services.memory.clearCommonCaches();
    
    // Force garbage collection
    if (window.gc) {
      window.gc();
    }
    
    // Clear optimization history
    this.state.optimizationHistory = [];
    
    console.log('✅ Comprehensive cleanup completed');
  }

  // Perform aggressive cleanup
  performAggressiveCleanup() {
    console.log('🔥 Performing aggressive cleanup...');
    
    // Clear all caches aggressively
    this.services.cache.clearAll();
    
    // Clear all memory
    this.services.memory.clearCommonCaches();
    
    // Clear localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
    
    // Force garbage collection multiple times
    if (window.gc) {
      for (let i = 0; i < 3; i++) {
        window.gc();
      }
    }
    
    console.log('✅ Aggressive cleanup completed');
  }

  // Perform moderate cleanup
  performModerateCleanup() {
    console.log('🧽 Performing moderate cleanup...');
    
    // Clear old cache entries
    this.services.cache.cleanExpiredEntries();
    
    // Clear some memory
    this.services.memory.clearCommonCaches();
    
    // Force garbage collection once
    if (window.gc) {
      window.gc();
    }
    
    console.log('✅ Moderate cleanup completed');
  }

  // Optimize network requests
  optimizeNetworkRequests() {
    console.log('🌐 Optimizing network requests...');
    
    // Reduce concurrent requests
    this.config.maxConcurrentRequests = Math.max(2, this.config.maxConcurrentRequests - 1);
    
    // Increase timeout
    this.config.requestTimeout = Math.min(15000, this.config.requestTimeout + 2000);
    
    // Enable request batching
    this.services.optimization.enableRequestBatching();
    
    console.log('✅ Network optimization completed');
  }

  // Optimize cache
  optimizeCache() {
    console.log('💾 Optimizing cache...');
    
    // Clear old entries
    this.services.cache.cleanExpiredEntries();
    
    // Optimize cache size
    this.services.cache.optimizeSize();
    
    // Warm up cache with popular items
    this.services.cache.warmup();
    
    console.log('✅ Cache optimization completed');
  }

  // Optimize performance
  optimizePerformance() {
    console.log('⚡ Optimizing performance...');
    
    // Enable lazy loading
    if (this.config.lazyLoadingEnabled) {
      this.services.optimization.enableLazyLoading();
    }
    
    // Optimize images
    if (this.config.imageOptimizationEnabled) {
      this.services.optimization.optimizeImages();
    }
    
    // Reduce animations
    this.services.optimization.reduceAnimations();
    
    console.log('✅ Performance optimization completed');
  }

  // Start background processes
  startBackgroundProcesses() {
    // Garbage collection interval
    if (this.config.memoryOptimizationEnabled) {
      const gcInterval = setInterval(() => {
        if (window.gc) {
          window.gc();
        }
      }, this.config.garbageCollectionInterval);
      
      this.state.intervals.add(gcInterval);
    }
    
    // Adaptive optimization
    if (this.config.adaptiveOptimizationEnabled) {
      const adaptiveInterval = setInterval(() => {
        this.performAdaptiveOptimization();
      }, 60 * 1000); // Every minute
      
      this.state.intervals.add(adaptiveInterval);
    }
  }

  // Perform adaptive optimization
  performAdaptiveOptimization() {
    const now = Date.now();
    if (now - this.state.lastOptimization < 30000) return; // Minimum 30 seconds between optimizations
    
    this.state.lastOptimization = now;
    
    // Analyze current state
    const memoryUsage = this.state.resourceUsage.memory.current;
    const networkStatus = this.state.networkStatus;
    const cacheStatus = this.state.cacheStatus;
    const performanceStatus = this.state.performanceStatus;
    
    // Determine optimization strategy
    if (memoryUsage > this.config.warningMemoryThreshold) {
      this.performModerateCleanup();
    }
    
    if (networkStatus === 'poor') {
      this.optimizeNetworkRequests();
    }
    
    if (cacheStatus === 'poor') {
      this.optimizeCache();
    }
    
    if (performanceStatus === 'poor') {
      this.optimizePerformance();
    }
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
    
    // Listen for memory pressure events
    if ('memory' in performance) {
      window.addEventListener('memorypressure', () => {
        this.handleMemoryPressure();
      });
    }
  }

  // Handle page hidden
  handlePageHidden() {
    console.log('📱 Page hidden, optimizing resources...');
    
    // Reduce monitoring frequency
    this.config.monitoringInterval = 30000; // 30 seconds
    
    // Clear non-essential caches
    this.services.cache.clearNonEssential();
    
    // Reduce background processes
    this.services.optimization.reduceBackgroundProcesses();
  }

  // Handle page visible
  handlePageVisible() {
    console.log('📱 Page visible, restoring resources...');
    
    // Restore monitoring frequency
    this.config.monitoringInterval = 10000; // 10 seconds
    
    // Restore background processes
    this.services.optimization.restoreBackgroundProcesses();
    
    // Warm up cache
    this.services.cache.warmup();
  }

  // Handle online
  handleOnline() {
    console.log('🌐 Network online, optimizing for online mode...');
    
    // Restore network optimizations
    this.config.maxConcurrentRequests = 6;
    this.config.requestTimeout = 8000;
    
    // Prefetch essential data
    this.services.cache.prefetchEssential();
  }

  // Handle offline
  handleOffline() {
    console.log('🌐 Network offline, optimizing for offline mode...');
    
    // Reduce network requests
    this.config.maxConcurrentRequests = 2;
    this.config.requestTimeout = 15000;
    
    // Enable offline mode
    this.services.cache.enableOfflineMode();
  }

  // Handle memory pressure
  handleMemoryPressure() {
    console.log('💾 Memory pressure detected, performing cleanup...');
    
    // Perform aggressive cleanup
    this.performAggressiveCleanup();
  }

  // Record optimization in history
  recordOptimization(type, value) {
    this.state.optimizationHistory.push({
      type,
      value,
      timestamp: Date.now()
    });
    
    // Keep only recent history (last 100 entries)
    if (this.state.optimizationHistory.length > 100) {
      this.state.optimizationHistory = this.state.optimizationHistory.slice(-100);
    }
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

  // Get current status
  getStatus() {
    return {
      isInitialized: this.state.isInitialized,
      isMonitoring: this.state.isMonitoring,
      memoryUsage: this.state.currentMemoryUsage,
      networkStatus: this.state.networkStatus,
      cacheStatus: this.state.cacheStatus,
      performanceStatus: this.state.performanceStatus,
      resourceUsage: this.state.resourceUsage,
      devicePerformance: this.state.devicePerformance
    };
  }

  // Get optimization recommendations
  getOptimizationRecommendations() {
    const recommendations = [];
    
    if (this.state.currentMemoryUsage > this.config.warningMemoryThreshold) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'High memory usage detected. Consider clearing cache or refreshing the page.',
        action: () => this.performModerateCleanup()
      });
    }
    
    if (this.state.networkStatus === 'poor') {
      recommendations.push({
        type: 'network',
        priority: 'medium',
        message: 'Poor network performance. Reducing request frequency.',
        action: () => this.optimizeNetworkRequests()
      });
    }
    
    if (this.state.cacheStatus === 'poor') {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        message: 'Poor cache performance. Optimizing cache.',
        action: () => this.optimizeCache()
      });
    }
    
    if (this.state.performanceStatus === 'poor') {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Poor performance detected. Enabling optimizations.',
        action: () => this.optimizePerformance()
      });
    }
    
    return recommendations;
  }

  // Cleanup and destroy
  destroy() {
    console.log('🗑️ Destroying Enhanced Resource Manager...');
    
    // Stop monitoring
    this.state.isMonitoring = false;
    
    // Clear all intervals and timeouts
    this.state.intervals.forEach(clearInterval);
    this.state.timeouts.forEach(clearTimeout);
    this.state.intervals.clear();
    this.state.timeouts.clear();
    
    // Stop all services
    this.services.memory.stop();
    this.services.performance.stop();
    
    // Clear all listeners
    this.state.listeners.clear();
    
    // Clear all state
    this.state = null;
    
    console.log('✅ Enhanced Resource Manager destroyed');
  }
}

// Create singleton instance
const enhancedResourceManager = new EnhancedResourceManager();

// Auto-initialize in development
if (import.meta.env.DEV) {
  // Add to window for debugging
  window.enhancedResourceManager = enhancedResourceManager;
}

export default enhancedResourceManager; 