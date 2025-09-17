// Enhanced Resource Manager - Centralized Resource Management System (Enhanced Version)
import memoryManager from '../utils/memoryManager.js';
import performanceMonitor from './performanceMonitor.js';
import enhancedCacheService from './enhancedCacheService.js';
import performanceOptimizationService from './performanceOptimizationService.js';

// Utility: Deep merge for config overrides
function deepMerge(target, source) {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

class EnhancedResourceManager {
  constructor(userConfig = {}) {
    // Default config
    this.config = deepMerge(
      {
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
        debugMode: import.meta.env.DEV,

        // New: Custom hooks
        hooks: {},
        // New: Telemetry endpoint
        telemetryEndpoint: null,
        // New: Auto-tune thresholds
        autoTuneThresholds: true,
      },
      userConfig
    );

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
          trend: 'stable',
          leakSuspected: false,
        },
        network: {
          activeRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          bandwidth: null,
        },
        cache: {
          size: 0,
          hitRate: 0,
          efficiency: 0,
          evictionCount: 0,
        },
        performance: {
          fps: 60,
          loadTime: 0,
          responsiveness: 1.0,
          tti: 0,
        },
      },

      // Optimization history
      optimizationHistory: [],
      lastOptimization: 0,

      // Event listeners
      listeners: new Map(),

      // Background processes
      intervals: new Set(),
      timeouts: new Set(),

      // New: Telemetry
      lastTelemetrySent: 0,
      telemetryQueue: [],
    };

    // Initialize services
    this.services = {
      memory: memoryManager,
      performance: performanceMonitor,
      cache: enhancedCacheService,
      optimization: performanceOptimizationService,
    };

    // Initialize asynchronously
    this.initialize().catch((error) => {
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

      // Device performance assessment
      this.state.devicePerformance = await this.assessDevicePerformance();

      // Emit initialization complete event
      this.emit('initialized', this.getStatus());

      // Send telemetry
      this.sendTelemetry('initialized', this.getStatus());

      console.log('✅ Enhanced Resource Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Resource Manager:', error);
      throw error;
    }
  }

  // Assess device performance (basic benchmark)
  async assessDevicePerformance() {
    // Simple FPS/CPU test (can be expanded)
    let start = performance.now();
    let count = 0;
    while (performance.now() - start < 100) count++;
    // Normalize to [0,1]
    let perf = Math.min(1, Math.max(0.2, count / 100000));
    return perf;
  }

  // Initialize all services
  async initializeServices() {
    const servicePromises = [
      this.services.memory.start(),
      this.services.performance.start(),
      this.services.cache.initialize(),
      this.services.optimization.initialize(),
    ];

    await Promise.allSettled(servicePromises);

    // Register cleanup callbacks
    this.services.memory.registerCleanupCallback(() => {
      this.performComprehensiveCleanup();
    });

    // Register memory leak detection if enabled
    if (this.config.memoryLeakDetectionEnabled) {
      this.services.memory.onLeakDetected?.(() => {
        this.state.resourceUsage.memory.leakSuspected = true;
        this.emit('memoryleak', this.getStatus());
        this.sendTelemetry('memoryleak', this.getStatus());
        this.performAggressiveCleanup();
      });
    }
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

    // Telemetry sending
    if (this.config.telemetryEndpoint) {
      const telemetryInterval = setInterval(() => {
        this.flushTelemetry();
      }, 60 * 1000);
      this.state.intervals.add(telemetryInterval);
    }

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
      .filter((h) => h.type === 'memory')
      .slice(-5)
      .map((h) => h.value);

    if (recentMemory.length >= 3) {
      const trend = recentMemory[recentMemory.length - 1] - recentMemory[0];
      this.state.resourceUsage.memory.trend =
        trend > 50 ? 'increasing' : trend < -50 ? 'decreasing' : 'stable';
      // Leak suspicion
      if (
        this.config.memoryLeakDetectionEnabled &&
        trend > 100 &&
        memoryMB > this.config.warningMemoryThreshold
      ) {
        this.state.resourceUsage.memory.leakSuspected = true;
        this.emit('memoryleak', this.getStatus());
        this.sendTelemetry('memoryleak', this.getStatus());
      }
    }

    // Auto-tune thresholds if enabled
    if (this.config.autoTuneThresholds) {
      this.autoTuneMemoryThresholds();
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

  // Auto-tune memory thresholds based on device performance
  autoTuneMemoryThresholds() {
    if (!this.state.devicePerformance) return;
    const perf = this.state.devicePerformance;
    // Lower thresholds for low-end devices, raise for high-end
    this.config.criticalMemoryThreshold = 800 * perf + 400 * (1 - perf);
    this.config.warningMemoryThreshold = 600 * perf + 300 * (1 - perf);
  }

  // Monitor network status
  monitorNetwork() {
    // Get network metrics from performance monitor
    const networkMetrics = this.services.performance.getNetworkMetrics?.() || {};

    this.state.resourceUsage.network = {
      activeRequests: networkMetrics.activeRequests || 0,
      failedRequests: networkMetrics.failedRequests || 0,
      averageResponseTime: networkMetrics.averageResponseTime || 0,
      bandwidth: networkMetrics.bandwidth || null,
    };

    // Determine network status
    const { failedRequests, averageResponseTime } =
      this.state.resourceUsage.network;

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
    const cacheStats = this.services.cache.getStats?.();

    if (cacheStats) {
      this.state.resourceUsage.cache = {
        size: cacheStats.size || 0,
        hitRate: cacheStats.hitRate || 0,
        efficiency: cacheStats.efficiency || 0,
        evictionCount: cacheStats.evictionCount || 0,
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
    const performanceMetrics = this.services.performance.getMetrics?.() || {};

    this.state.resourceUsage.performance = {
      fps: performanceMetrics.fps || 60,
      loadTime: performanceMetrics.loadTime || 0,
      responsiveness: performanceMetrics.responsiveness || 1.0,
      tti: performanceMetrics.tti || 0,
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
    this.invokeHook('beforeCriticalMemory');
    this.performAggressiveCleanup();
    this.emit('critical', {
      type: 'memory',
      usage: this.state.currentMemoryUsage,
      threshold: this.config.criticalMemoryThreshold,
    });
    this.sendTelemetry('critical', this.getStatus());
    this.invokeHook('afterCriticalMemory');
  }

  // Handle warning memory usage
  handleWarningMemoryUsage() {
    console.warn('⚠️ Warning memory usage detected');
    this.invokeHook('beforeWarningMemory');
    this.performModerateCleanup();
    this.emit('warning', {
      type: 'memory',
      usage: this.state.currentMemoryUsage,
      threshold: this.config.warningMemoryThreshold,
    });
    this.sendTelemetry('warning', this.getStatus());
    this.invokeHook('afterWarningMemory');
  }

  // Handle poor network performance
  handlePoorNetworkPerformance() {
    console.warn('🌐 Poor network performance detected');
    this.invokeHook('beforePoorNetwork');
    this.optimizeNetworkRequests();
    this.emit('network', {
      status: 'poor',
      metrics: this.state.resourceUsage.network,
    });
    this.sendTelemetry('network', this.getStatus());
    this.invokeHook('afterPoorNetwork');
  }

  // Handle poor cache performance
  handlePoorCachePerformance() {
    console.warn('💾 Poor cache performance detected');
    this.invokeHook('beforePoorCache');
    this.optimizeCache();
    this.emit('cache', {
      status: 'poor',
      metrics: this.state.resourceUsage.cache,
    });
    this.sendTelemetry('cache', this.getStatus());
    this.invokeHook('afterPoorCache');
  }

  // Handle poor performance
  handlePoorPerformance() {
    console.warn('⚡ Poor performance detected');
    this.invokeHook('beforePoorPerformance');
    this.optimizePerformance();
    this.emit('performance', {
      status: 'poor',
      metrics: this.state.resourceUsage.performance,
    });
    this.sendTelemetry('performance', this.getStatus());
    this.invokeHook('afterPoorPerformance');
  }

  // Perform comprehensive cleanup
  performComprehensiveCleanup() {
    console.log('🧹 Performing comprehensive cleanup...');
    this.invokeHook('beforeComprehensiveCleanup');
    this.services.cache.clearAll?.();
    this.services.memory.clearCommonCaches?.();
    if (window.gc) window.gc();
    this.state.optimizationHistory = [];
    this.invokeHook('afterComprehensiveCleanup');
    console.log('✅ Comprehensive cleanup completed');
  }

  // Perform aggressive cleanup
  performAggressiveCleanup() {
    console.log('🔥 Performing aggressive cleanup...');
    this.invokeHook('beforeAggressiveCleanup');
    this.services.cache.clearAll?.();
    this.services.memory.clearCommonCaches?.();
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
    if (window.gc) {
      for (let i = 0; i < 3; i++) window.gc();
    }
    this.invokeHook('afterAggressiveCleanup');
    console.log('✅ Aggressive cleanup completed');
  }

  // Perform moderate cleanup
  performModerateCleanup() {
    console.log('🧽 Performing moderate cleanup...');
    this.invokeHook('beforeModerateCleanup');
    this.services.cache.cleanExpiredEntries?.();
    this.services.memory.clearCommonCaches?.();
    if (window.gc) window.gc();
    this.invokeHook('afterModerateCleanup');
    console.log('✅ Moderate cleanup completed');
  }

  // Optimize network requests
  optimizeNetworkRequests() {
    console.log('🌐 Optimizing network requests...');
    this.config.maxConcurrentRequests = Math.max(
      2,
      this.config.maxConcurrentRequests - 1
    );
    this.config.requestTimeout = Math.min(
      15000,
      this.config.requestTimeout + 2000
    );
    this.services.optimization.enableRequestBatching?.();
    this.services.optimization.enableNetworkThrottling?.();
    console.log('✅ Network optimization completed');
  }

  // Optimize cache
  optimizeCache() {
    console.log('💾 Optimizing cache...');
    this.services.cache.cleanExpiredEntries?.();
    this.services.cache.optimizeSize?.();
    this.services.cache.warmup?.();
    this.services.cache.evictLeastUsed?.();
    console.log('✅ Cache optimization completed');
  }

  // Optimize performance
  optimizePerformance() {
    console.log('⚡ Optimizing performance...');
    if (this.config.lazyLoadingEnabled) {
      this.services.optimization.enableLazyLoading?.();
    }
    if (this.config.imageOptimizationEnabled) {
      this.services.optimization.optimizeImages?.();
    }
    this.services.optimization.reduceAnimations?.();
    this.services.optimization.deferNonCritical?.();
    console.log('✅ Performance optimization completed');
  }

  // Start background processes
  startBackgroundProcesses() {
    // Garbage collection interval
    if (this.config.memoryOptimizationEnabled) {
      const gcInterval = setInterval(() => {
        if (window.gc) window.gc();
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
    this.emit('adaptiveOptimization', this.getStatus());
    this.sendTelemetry('adaptiveOptimization', this.getStatus());
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

    // Listen for custom hooks
    if (this.config.hooks && typeof this.config.hooks.onCustomEvent === 'function') {
      this.on('custom', this.config.hooks.onCustomEvent);
    }
  }

  // Handle page hidden
  handlePageHidden() {
    console.log('📱 Page hidden, optimizing resources...');
    this.invokeHook('beforePageHidden');
    this.config.monitoringInterval = 30000; // 30 seconds
    this.services.cache.clearNonEssential?.();
    this.services.optimization.reduceBackgroundProcesses?.();
    this.emit('pagehidden', this.getStatus());
    this.sendTelemetry('pagehidden', this.getStatus());
    this.invokeHook('afterPageHidden');
  }

  // Handle page visible
  handlePageVisible() {
    console.log('📱 Page visible, restoring resources...');
    this.invokeHook('beforePageVisible');
    this.config.monitoringInterval = 10000; // 10 seconds
    this.services.optimization.restoreBackgroundProcesses?.();
    this.services.cache.warmup?.();
    this.emit('pagevisible', this.getStatus());
    this.sendTelemetry('pagevisible', this.getStatus());
    this.invokeHook('afterPageVisible');
  }

  // Handle online
  handleOnline() {
    console.log('🌐 Network online, optimizing for online mode...');
    this.invokeHook('beforeOnline');
    this.config.maxConcurrentRequests = 6;
    this.config.requestTimeout = 8000;
    this.services.cache.prefetchEssential?.();
    this.emit('online', this.getStatus());
    this.sendTelemetry('online', this.getStatus());
    this.invokeHook('afterOnline');
  }

  // Handle offline
  handleOffline() {
    console.log('🌐 Network offline, optimizing for offline mode...');
    this.invokeHook('beforeOffline');
    this.config.maxConcurrentRequests = 2;
    this.config.requestTimeout = 15000;
    this.services.cache.enableOfflineMode?.();
    this.emit('offline', this.getStatus());
    this.sendTelemetry('offline', this.getStatus());
    this.invokeHook('afterOffline');
  }

  // Handle memory pressure
  handleMemoryPressure() {
    console.log('💾 Memory pressure detected, performing cleanup...');
    this.invokeHook('beforeMemoryPressure');
    this.performAggressiveCleanup();
    this.emit('memorypressure', this.getStatus());
    this.sendTelemetry('memorypressure', this.getStatus());
    this.invokeHook('afterMemoryPressure');
  }

  // Record optimization in history
  recordOptimization(type, value) {
    this.state.optimizationHistory.push({
      type,
      value,
      timestamp: Date.now(),
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
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.warn('Event listener error:', error);
        }
      });
    }
  }

  // Hook system for extensibility
  invokeHook(hookName, ...args) {
    if (
      this.config.hooks &&
      typeof this.config.hooks[hookName] === 'function'
    ) {
      try {
        this.config.hooks[hookName](...args, this.getStatus());
      } catch (e) {
        console.warn(`Hook "${hookName}" error:`, e);
      }
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
      devicePerformance: this.state.devicePerformance,
      leakSuspected: this.state.resourceUsage.memory.leakSuspected,
    };
  }

  // Get optimization recommendations
  getOptimizationRecommendations() {
    const recommendations = [];

    if (this.state.currentMemoryUsage > this.config.warningMemoryThreshold) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message:
          'High memory usage detected. Consider clearing cache or refreshing the page.',
        action: () => this.performModerateCleanup(),
      });
    }

    if (this.state.resourceUsage.memory.leakSuspected) {
      recommendations.push({
        type: 'memory',
        priority: 'critical',
        message:
          'Possible memory leak detected. Please reload the page or contact support.',
        action: () => this.performAggressiveCleanup(),
      });
    }

    if (this.state.networkStatus === 'poor') {
      recommendations.push({
        type: 'network',
        priority: 'medium',
        message: 'Poor network performance. Reducing request frequency.',
        action: () => this.optimizeNetworkRequests(),
      });
    }

    if (this.state.cacheStatus === 'poor') {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        message: 'Poor cache performance. Optimizing cache.',
        action: () => this.optimizeCache(),
      });
    }

    if (this.state.performanceStatus === 'poor') {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Poor performance detected. Enabling optimizations.',
        action: () => this.optimizePerformance(),
      });
    }

    return recommendations;
  }

  // Telemetry: queue and send
  sendTelemetry(eventType, data) {
    if (!this.config.telemetryEndpoint) return;
    this.state.telemetryQueue.push({
      eventType,
      data,
      timestamp: Date.now(),
    });
    // Optionally flush immediately for critical events
    if (
      ['critical', 'memoryleak', 'memorypressure'].includes(eventType) ||
      this.state.telemetryQueue.length > 10
    ) {
      this.flushTelemetry();
    }
  }

  async flushTelemetry() {
    if (!this.config.telemetryEndpoint || this.state.telemetryQueue.length === 0)
      return;
    const payload = this.state.telemetryQueue.splice(0, 20);
    try {
      await fetch(this.config.telemetryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      this.state.lastTelemetrySent = Date.now();
    } catch (e) {
      // Re-queue on failure
      this.state.telemetryQueue.unshift(...payload);
    }
  }

  // Cleanup and destroy
  destroy() {
    console.log('🗑️ Destroying Enhanced Resource Manager...');
    this.state.isMonitoring = false;
    this.state.intervals.forEach(clearInterval);
    this.state.timeouts.forEach(clearTimeout);
    this.state.intervals.clear();
    this.state.timeouts.clear();
    this.services.memory.stop?.();
    this.services.performance.stop?.();
    this.services.cache.destroy?.();
    this.services.optimization.destroy?.();
    this.state.listeners.clear();
    this.state = null;
    console.log('✅ Enhanced Resource Manager destroyed');
  }
}

// Create singleton instance
const enhancedResourceManager = new EnhancedResourceManager();

// Auto-initialize in development
if (import.meta.env.DEV) {
  window.enhancedResourceManager = enhancedResourceManager;
}

export default enhancedResourceManager;