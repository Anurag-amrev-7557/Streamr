import { 
  getStreamingUrlWithQuality, 
  getBestStreamingService, 
  getAdaptiveStreamingOptions,
  STREAMING_SERVICES 
} from './streamingService';

/**
 * Enhanced Streaming Service with Network Detection and Adaptive Quality
 */
class EnhancedStreamingService {
  constructor() {
    this.networkInfo = null;
    this.currentQuality = 'auto';
    this.performanceMetrics = {};
    this.qualityHistory = [];
    this.isMonitoring = false;
  }

  /**
   * Initialize network monitoring
   */
  async initialize() {
    try {
      // Check if Network Information API is available
      if ('connection' in navigator) {
        this.networkInfo = navigator.connection;
        this.setupNetworkListeners();
      }
      
      // Check if Performance API is available
      if ('performance' in window) {
        this.setupPerformanceMonitoring();
      }
      
      console.log('🎬 Enhanced Streaming Service initialized');
    } catch (error) {
      console.warn('Enhanced Streaming Service initialization failed:', error);
    }
  }

  /**
   * Setup network change listeners
   */
  setupNetworkListeners() {
    if (this.networkInfo) {
      this.networkInfo.addEventListener('change', this.handleNetworkChange.bind(this));
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPerformanceMetric(entry);
          }
        });
        
        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (error) {
        console.warn('Performance monitoring setup failed:', error);
      }
    }
  }

  /**
   * Handle network changes
   */
  handleNetworkChange() {
    if (this.networkInfo) {
      const newQuality = this.getOptimalQuality();
      if (newQuality !== this.currentQuality) {
        this.currentQuality = newQuality;
        this.emitQualityChange(newQuality);
      }
    }
  }

  /**
   * Get optimal quality based on network conditions
   */
  getOptimalQuality() {
    if (!this.networkInfo) return '720p';

    const { downlink, effectiveType, connectionType } = this.networkInfo;
    
    if (downlink > 25 || effectiveType === '4g') {
      return '1080p';
    } else if (downlink > 10 || effectiveType === '3g') {
      return '720p';
    } else if (downlink > 5) {
      return '480p';
    } else {
      return '360p';
    }
  }

  /**
   * Get streaming URL with optimal settings
   */
  getOptimalStreamingUrl(content, preferredService = null) {
    try {
      // Determine best service based on network conditions
      const serviceKey = preferredService || this.getBestServiceForNetwork();
      
      // Get adaptive options based on current network
      const options = this.getAdaptiveOptions();
      
      // Generate URL with optimal settings
      const url = getStreamingUrlWithQuality(content, serviceKey, options);
      
      // Log the optimization
      console.log('🎬 Optimized streaming URL:', {
        service: serviceKey,
        quality: options.quality,
        network: this.networkInfo ? {
          downlink: this.networkInfo.downlink,
          effectiveType: this.networkInfo.effectiveType
        } : 'unknown'
      });
      
      return url;
    } catch (error) {
      console.error('Error getting optimal streaming URL:', error);
      return null;
    }
  }

  /**
   * Get best service for current network
   */
  getBestServiceForNetwork() {
    if (!this.networkInfo) return 'MOVIES111';
    
    return getBestStreamingService({
      connectionType: this.networkInfo.connectionType,
      downlink: this.networkInfo.downlink,
      effectiveType: this.networkInfo.effectiveType
    });
  }

  /**
   * Get adaptive options for current network
   */
  getAdaptiveOptions() {
    if (!this.networkInfo) {
      return {
        quality: '720p',
        preload: 'metadata',
        adaptive: true,
        buffer: 'medium'
      };
    }
    
    return getAdaptiveStreamingOptions({
      downlink: this.networkInfo.downlink,
      effectiveType: this.networkInfo.effectiveType
    });
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetric(entry) {
    const metric = {
      name: entry.name,
      type: entry.entryType,
      duration: entry.duration,
      timestamp: Date.now()
    };
    
    this.performanceMetrics[entry.name] = metric;
    
    // Keep only last 100 metrics
    const keys = Object.keys(this.performanceMetrics);
    if (keys.length > 100) {
      delete this.performanceMetrics[keys[0]];
    }
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics() {
    const metrics = Object.values(this.performanceMetrics);
    
    if (metrics.length === 0) return null;
    
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const slowest = metrics.reduce((max, m) => m.duration > max.duration ? m : max, metrics[0]);
    const fastest = metrics.reduce((min, m) => m.duration < min.duration ? m : min, metrics[0]);
    
    return {
      totalMetrics: metrics.length,
      averageDuration: avgDuration,
      slowest: slowest,
      fastest: fastest,
      networkInfo: this.networkInfo ? {
        downlink: this.networkInfo.downlink,
        effectiveType: this.networkInfo.effectiveType,
        connectionType: this.networkInfo.connectionType
      } : null
    };
  }

  /**
   * Emit quality change event
   */
  emitQualityChange(newQuality) {
    const event = new CustomEvent('streamingQualityChange', {
      detail: {
        quality: newQuality,
        networkInfo: this.networkInfo,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Get current network status
   */
  getNetworkStatus() {
    if (!this.networkInfo) return 'unknown';
    
    const { downlink, effectiveType } = this.networkInfo;
    
    if (downlink > 25) return 'excellent';
    if (downlink > 15) return 'good';
    if (downlink > 8) return 'fair';
    if (downlink > 3) return 'poor';
    return 'very-poor';
  }

  /**
   * Get recommended quality for current network
   */
  getRecommendedQuality() {
    const status = this.getNetworkStatus();
    
    switch (status) {
      case 'excellent': return '1080p';
      case 'good': return '720p';
      case 'fair': return '480p';
      case 'poor': return '360p';
      case 'very-poor': return '240p';
      default: return '720p';
    }
  }
}

// Create singleton instance
const enhancedStreamingService = new EnhancedStreamingService();

// Export functions that use the enhanced service
export const getEnhancedStreamingUrl = (content, preferredService = null) => {
  return enhancedStreamingService.getOptimalStreamingUrl(content, preferredService);
};

export const getNetworkStatus = () => {
  return enhancedStreamingService.getNetworkStatus();
};

export const getRecommendedQuality = () => {
  return enhancedStreamingService.getRecommendedQuality();
};

export const getPerformanceAnalytics = () => {
  return enhancedStreamingService.getPerformanceAnalytics();
};

export const initializeEnhancedStreaming = () => {
  return enhancedStreamingService.initialize();
};

export default enhancedStreamingService; 