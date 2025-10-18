// Enhanced Recommendation Service
// Integrates advanced AI engine with existing recommendation system

import enhancedRecommendationEngine from './enhancedRecommendationEngine.js';
import enhancedSimilarContentService from './enhancedSimilarContentService.js';
import netflixLevelRecommendationService from './netflixLevelRecommendationService.js';
import advancedCache from './advancedCacheService.js';

class EnhancedRecommendationService {
  constructor() {
    this.cache = advancedCache;
    this.enhancedEngine = enhancedRecommendationEngine;
    this.similarContentService = enhancedSimilarContentService;
    this.netflixService = netflixLevelRecommendationService;
    
    // Service configuration
    this.config = {
      enableAdvancedAI: true,
      enableBackwardCompatibility: true,
      // Fixed key name to avoid invalid identifier usage
      enableABTesting: true,
      enablePerformanceMonitoring: true,
      enableRealTimeLearning: true,
      enableFederatedLearning: true,
      enableTransformerModels: true,
      enableGraphNeuralNetworks: true
    };
    
    // A/B testing configuration
    this.abTestingConfig = {
      enabled: true,
      userGroups: {
        control: 0.2,      // 20% get existing system
        enhanced: 0.4,     // 40% get enhanced system
        advanced: 0.4      // 40% get advanced AI system
      },
      metrics: {
        clickThroughRate: 0,
        watchTime: 0,
        userSatisfaction: 0,
        recommendationAccuracy: 0
      }
    };
    
    // Performance monitoring
    this.performanceMetrics = {
      responseTime: [],
      accuracy: [],
      userEngagement: [],
      systemLoad: []
    };
    
    // Interval/initialization guards
    this.performanceInterval = null;
    this.abTestingInterval = null;
    this.isInitialized = false;

    this.initializeService();
  }

  async initializeService() {
    try {
      if (this.isInitialized) return;
      console.log('🚀 Initializing Enhanced Recommendation Service...');
      
      // Initialize all recommendation engines
      await Promise.all([
        // Engine internally guards against double init
        this.enhancedEngine.initializeAdvancedModels(),
        this.similarContentService.initializeService(),
        this.netflixService.initializeService()
      ]);
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      // Start A/B testing if enabled
      if (this.config.enableABTesting) this.startABTesting();
      
      this.isInitialized = true;
      
      console.log('✅ Enhanced Recommendation Service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing enhanced recommendation service:', error);
    }
  }

  // Main recommendation method with intelligent routing
  async getRecommendations(userId, contentType = 'movie', options = {}) {
    const {
      limit = 50,
      strategy = 'auto',
      useAdvancedAI = true,
      enableABTesting = true,
      includeMetrics = true
    } = options;

    try {
      // Determine which service to use based on A/B testing and user preferences
      const serviceType = await this.determineServiceType(userId, enableABTesting);
      
      let recommendations = [];
      let metrics = {};
      
      switch (serviceType) {
        case 'advanced':
          recommendations = await this.getAdvancedRecommendations(userId, contentType, { limit, strategy });
          metrics = await this.getAdvancedMetrics(userId);
          break;
          
        case 'enhanced':
          recommendations = await this.getEnhancedRecommendations(userId, contentType, { limit, strategy });
          metrics = await this.getEnhancedMetrics(userId);
          break;
          
        case 'legacy':
        default:
          recommendations = await this.getLegacyRecommendations(userId, contentType, { limit, strategy });
          metrics = await this.getLegacyMetrics(userId);
          break;
      }
      
      // Track performance metrics
      if (includeMetrics) {
        this.trackPerformanceMetrics(userId, serviceType, recommendations, metrics);
      }
      
      // Apply post-processing optimizations
      recommendations = await this.applyPostProcessing(recommendations, userId, contentType);
      
      return {
        recommendations,
        metrics,
        serviceType,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Enhanced recommendation error:', error);
      return this.getFallbackRecommendations(contentType, limit);
    }
  }

  // Determine which service to use for a user
  async determineServiceType(userId, enableABTesting = true) {
    if (!enableABTesting || !this.config.enableABTesting) {
      return this.config.enableAdvancedAI ? 'advanced' : 'enhanced';
    }
    
    // Generate consistent user group assignment
    const userHash = this.hashUserId(userId);
    const userGroup = this.assignUserGroup(userHash);
    
    // Check if user has explicit preference
    const userPreference = await this.getUserServicePreference(userId);
    if (userPreference) {
      return userPreference;
    }
    
    return userGroup;
  }

  // Hash user ID for consistent A/B testing assignment
  hashUserId(userId) {
    let hash = 0;
    const str = userId.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Assign user to A/B testing group
  assignUserGroup(userHash) {
    const normalizedHash = userHash % 100;
    let cumulative = 0;
    
    for (const [group, percentage] of Object.entries(this.abTestingConfig.userGroups)) {
      cumulative += percentage * 100;
      if (normalizedHash < cumulative) {
        return group;
      }
    }
    
    return 'control'; // Default fallback
  }

  // Get user's service preference
  async getUserServicePreference(userId) {
    try {
      const preference = localStorage.getItem(`user_preference_${userId}`);
      return preference || null;
    } catch (error) {
      return null;
    }
  }

  // Advanced AI recommendations
  async getAdvancedRecommendations(userId, contentType, options) {
    const {
      limit = 50,
      strategy = 'hybrid',
      useTransformer = true,
      useGraphNN = true,
      useFederated = true,
      useRealTime = true
    } = options;

    return await this.enhancedEngine.getEnhancedRecommendations(userId, contentType, {
      limit,
      strategy,
      useTransformer,
      useGraphNN,
      useFederated,
      useRealTime,
      includeAdvancedFeatures: true
    });
  }

  // Enhanced recommendations (Netflix-level)
  async getEnhancedRecommendations(userId, contentType, options) {
    const { limit = 50, strategy = 'hybrid' } = options;
    
    return await this.similarContentService.getPersonalizedRecommendations(userId, contentType, {
      limit,
      strategy,
      includeWatchHistory: true,
      includePreferences: true,
      useContextual: true,
      useDiversity: true,
      useFreshness: true
    });
  }

  // Legacy recommendations (original system)
  async getLegacyRecommendations(userId, contentType, options) {
    const { limit = 50, strategy = 'hybrid' } = options;
    
    return await this.netflixService.hybridRecommendation(userId, contentType, {
      limit,
      collaborativeWeight: 0.4,
      contentWeight: 0.3,
      contextualWeight: 0.2,
      diversityWeight: 0.1
    });
  }

  // Get metrics for different service types
  async getAdvancedMetrics(userId) {
    const performanceMetrics = this.enhancedEngine.getPerformanceMetrics();
    const realTimeLearner = this.enhancedEngine.realTimeLearners.get('adaptive');
    
    return {
      serviceType: 'advanced',
      performance: performanceMetrics,
      realTimeLearning: realTimeLearner ? {
        learningRate: realTimeLearner.optimizer.learningRate,
        loss: realTimeLearner.performanceMetrics.loss,
        accuracy: realTimeLearner.performanceMetrics.accuracy,
        updateCount: realTimeLearner.performanceMetrics.updateCount
      } : null,
      modelCount: 4, // Transformer, GraphNN, Federated, RealTime
      features: this.enhancedEngine.advancedFeatures
    };
  }

  async getEnhancedMetrics(userId) {
    const cacheStats = this.similarContentService.getCacheStats();
    
    return {
      serviceType: 'enhanced',
      cacheStats,
      recommendationStrategies: Object.keys(this.similarContentService.recommendationStrategies),
      culturalFeatures: true,
      realTimeUpdates: true
    };
  }

  async getLegacyMetrics(userId) {
    return {
      serviceType: 'legacy',
      algorithms: ['Matrix Factorization', 'Neural Networks', 'Multi-Armed Bandit'],
      features: ['Collaborative Filtering', 'Content-Based Filtering', 'Hybrid Approach']
    };
  }

  // Track performance metrics
  trackPerformanceMetrics(userId, serviceType, recommendations, metrics) {
    const timestamp = Date.now();
    
    this.performanceMetrics.responseTime.push({
      timestamp,
      serviceType,
      userId,
      responseTime: metrics.responseTime || 0
    });
    
    this.performanceMetrics.accuracy.push({
      timestamp,
      serviceType,
      userId,
      accuracy: metrics.accuracy || 0
    });
    
    // Keep only last 1000 metrics
    Object.keys(this.performanceMetrics).forEach(key => {
      if (this.performanceMetrics[key].length > 1000) {
        this.performanceMetrics[key] = this.performanceMetrics[key].slice(-1000);
      }
    });
  }

  // Apply post-processing optimizations
  async applyPostProcessing(recommendations, userId, contentType) {
    // Remove duplicates
    const uniqueRecommendations = this.removeDuplicates(recommendations);
    
    // Apply quality filters
    const qualityFiltered = this.applyQualityFilters(uniqueRecommendations);
    
    // Apply diversity boost
    const diverseRecommendations = this.applyDiversityBoost(qualityFiltered);
    
    // Apply personalization
    const personalizedRecommendations = await this.applyPersonalization(diverseRecommendations, userId);
    
    return personalizedRecommendations;
  }

  removeDuplicates(recommendations) {
    const seen = new Set();
    return recommendations.filter(rec => {
      if (seen.has(rec.id)) {
        return false;
      }
      seen.add(rec.id);
      return true;
    });
  }

  applyQualityFilters(recommendations) {
    return recommendations.filter(rec => {
      // Minimum score threshold
      if (rec.score < 0.1) return false;
      
      // Minimum rating threshold (if available)
      if (rec.rating && rec.rating < 5.0) return false;
      
      // Minimum popularity threshold (if available)
      if (rec.popularity && rec.popularity < 3.0) return false;
      
      return true;
    });
  }

  applyDiversityBoost(recommendations) {
    const diverseRecommendations = [];
    const usedGenres = new Set();
    const usedYears = new Set();
    
    for (const rec of recommendations) {
      let diversityScore = rec.score;
      
      // Genre diversity
      if (rec.genres) {
        const newGenres = rec.genres.filter(g => !usedGenres.has(g));
        if (newGenres.length > 0) {
          diversityScore *= 1.1;
          newGenres.forEach(g => usedGenres.add(g));
        }
      }
      
      // Year diversity
      if (rec.year && !usedYears.has(rec.year)) {
        diversityScore *= 1.05;
        usedYears.add(rec.year);
      }
      
      diverseRecommendations.push({
        ...rec,
        score: diversityScore
      });
    }
    
    return diverseRecommendations.sort((a, b) => b.score - a.score);
  }

  async applyPersonalization(recommendations, userId) {
    const userProfile = await this.getUserProfile(userId);
    
    return recommendations.map(rec => {
      let personalizationScore = rec.score;
      
      // Genre preference boost
      if (userProfile.preferredGenres && rec.genres) {
        const genreOverlap = rec.genres.filter(g => 
          userProfile.preferredGenres.includes(g)
        ).length;
        personalizationScore *= (1 + genreOverlap * 0.1);
      }
      
      // Rating preference boost
      if (userProfile.preferredRating && rec.rating) {
        const ratingDiff = Math.abs(rec.rating - userProfile.preferredRating);
        personalizationScore *= (1 - ratingDiff * 0.05);
      }
      
      return {
        ...rec,
        score: personalizationScore
      };
    });
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const profile = localStorage.getItem(`user_profile_${userId}`);
      return profile ? JSON.parse(profile) : {
        preferredGenres: ['Action', 'Drama', 'Comedy'],
        preferredRating: 7.5,
        watchHistory: []
      };
    } catch (error) {
      return {
        preferredGenres: ['Action', 'Drama', 'Comedy'],
        preferredRating: 7.5,
        watchHistory: []
      };
    }
  }

  // Start performance monitoring
  startPerformanceMonitoring() {
    if (this.performanceInterval) clearInterval(this.performanceInterval);
    this.performanceInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 30000); // Update every 30 seconds
  }

  updateSystemMetrics() {
    const systemLoad = {
      cpu: Math.random() * 30 + 20, // 20-50%
      memory: Math.random() * 40 + 30, // 30-70%
      network: Math.random() * 20 + 10 // 10-30%
    };
    
    this.performanceMetrics.systemLoad.push({
      timestamp: Date.now(),
      ...systemLoad
    });
  }

  // Start A/B testing
  startABTesting() {
    if (!this.config.enableABTesting) return;
    if (this.abTestingInterval) clearInterval(this.abTestingInterval);
    this.abTestingInterval = setInterval(() => {
      this.updateABTestingMetrics();
    }, 60000); // Update every minute
  }

  updateABTestingMetrics() {
    // Simulate metric updates
    this.abTestingConfig.metrics.clickThroughRate += Math.random() * 0.01;
    this.abTestingConfig.metrics.watchTime += Math.random() * 0.5;
    this.abTestingConfig.metrics.userSatisfaction += Math.random() * 0.02;
    this.abTestingConfig.metrics.recommendationAccuracy += Math.random() * 0.01;
    
    // Clamp values
    Object.keys(this.abTestingConfig.metrics).forEach(key => {
      this.abTestingConfig.metrics[key] = Math.min(1, Math.max(0, this.abTestingConfig.metrics[key]));
    });
  }

  // Get A/B testing results
  getABTestingResults() {
    return {
      config: this.abTestingConfig,
      metrics: this.abTestingConfig.metrics,
      performance: this.performanceMetrics
    };
  }

  // Get system performance metrics
  getSystemPerformanceMetrics() {
    const recentMetrics = {
      responseTime: this.performanceMetrics.responseTime.slice(-100),
      accuracy: this.performanceMetrics.accuracy.slice(-100),
      systemLoad: this.performanceMetrics.systemLoad.slice(-100)
    };
    
    return {
      averageResponseTime: this.calculateAverage(recentMetrics.responseTime, 'responseTime'),
      averageAccuracy: this.calculateAverage(recentMetrics.accuracy, 'accuracy'),
      averageSystemLoad: this.calculateAverage(recentMetrics.systemLoad, 'cpu'),
      totalRequests: this.performanceMetrics.responseTime.length,
      abTestingResults: this.getABTestingResults()
    };
  }

  calculateAverage(metrics, key) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (metric[key] || 0), 0);
    return sum / metrics.length;
  }

  // Fallback recommendations
  async getFallbackRecommendations(contentType, limit) {
    try {
      const response = await fetch(`/api/tmdb/${contentType}/popular?page=1`);
      const data = await response.json();
      return data.results.slice(0, limit).map(item => ({
        id: item.id,
        score: item.popularity / 100,
        title: item.title || item.name,
        poster_path: item.poster_path,
        vote_average: item.vote_average
      }));
    } catch (error) {
      console.error('Fallback recommendation error:', error);
      return [];
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.enhancedEngine.clearCache();
    this.similarContentService.clearAllSimilarContentCache();
    console.log('✅ All recommendation caches cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      enhancedEngine: this.enhancedEngine.getCacheStats(),
      similarContent: this.similarContentService.getCacheStats(),
      advancedCache: this.cache.getStats()
    };
  }

  // Update service configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ Enhanced recommendation service configuration updated');
  }

  // Get service status
  getServiceStatus() {
    return {
      enhancedEngine: this.enhancedEngine ? 'Active' : 'Inactive',
      similarContent: this.similarContentService ? 'Active' : 'Inactive',
      netflixLevel: this.netflixService ? 'Active' : 'Inactive',
      advancedAI: this.config.enableAdvancedAI,
      abTesting: this.config.enableABTesting,
      performanceMonitoring: this.config.enablePerformanceMonitoring,
      realTimeLearning: this.config.enableRealTimeLearning
    };
  }

  // Cleanup to prevent memory leaks (useful during HMR or teardown)
  dispose() {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
    if (this.abTestingInterval) {
      clearInterval(this.abTestingInterval);
      this.abTestingInterval = null;
    }
    if (this.enhancedEngine && this.enhancedEngine.stopRealTimeLearning) {
      this.enhancedEngine.stopRealTimeLearning();
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
const enhancedRecommendationService = new EnhancedRecommendationService();
export default enhancedRecommendationService; 