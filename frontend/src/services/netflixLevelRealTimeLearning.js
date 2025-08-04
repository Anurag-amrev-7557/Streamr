// Netflix-Level Real-Time Learning Service
// Continuously improves recommendations based on user interactions

class NetflixLevelRealTimeLearning {
  constructor() {
    this.userInteractions = new Map();
    this.recommendationPerformance = new Map();
    this.learningRate = 0.01;
    this.explorationRate = 0.1;
    this.decayFactor = 0.95;
    this.minInteractions = 5;
    this.maxHistorySize = 1000;
  }

  // Track user interaction for real-time learning
  trackInteraction(userId, itemId, interactionType, timestamp = Date.now()) {
    const interaction = {
      itemId,
      interactionType, // 'view', 'like', 'dislike', 'watch', 'skip', 'rate'
      timestamp,
      score: this.getInteractionScore(interactionType)
    };

    if (!this.userInteractions.has(userId)) {
      this.userInteractions.set(userId, []);
    }

    const userHistory = this.userInteractions.get(userId);
    userHistory.push(interaction);

    // Keep history size manageable
    if (userHistory.length > this.maxHistorySize) {
      userHistory.splice(0, userHistory.length - this.maxHistorySize);
    }

    // Update recommendation performance
    this.updateRecommendationPerformance(userId, itemId, interaction);
  }

  // Get interaction score based on type
  getInteractionScore(interactionType) {
    const scores = {
      'view': 0.1,
      'like': 0.8,
      'dislike': -0.5,
      'watch': 1.0,
      'skip': -0.3,
      'rate_5': 1.0,
      'rate_4': 0.8,
      'rate_3': 0.5,
      'rate_2': 0.2,
      'rate_1': -0.5
    };
    return scores[interactionType] || 0;
  }

  // Update recommendation performance metrics
  updateRecommendationPerformance(userId, itemId, interaction) {
    const key = `${userId}_${itemId}`;
    const current = this.recommendationPerformance.get(key) || {
      totalScore: 0,
      interactions: 0,
      lastUpdated: Date.now()
    };

    current.totalScore += interaction.score;
    current.interactions += 1;
    current.lastUpdated = Date.now();

    this.recommendationPerformance.set(key, current);
  }

  // Get real-time user preferences
  getUserPreferences(userId) {
    const userHistory = this.userInteractions.get(userId) || [];
    
    if (userHistory.length < this.minInteractions) {
      return this.getDefaultPreferences();
    }

    // Calculate dynamic preferences based on recent interactions
    const recentInteractions = userHistory
      .filter(interaction => Date.now() - interaction.timestamp < 30 * 24 * 60 * 60 * 1000) // Last 30 days
      .sort((a, b) => b.timestamp - a.timestamp);

    const preferences = {
      genres: this.extractGenrePreferences(recentInteractions),
      actors: this.extractActorPreferences(recentInteractions),
      directors: this.extractDirectorPreferences(recentInteractions),
      years: this.extractYearPreferences(recentInteractions),
      moods: this.extractMoodPreferences(recentInteractions),
      watchPatterns: this.extractWatchPatterns(recentInteractions),
      timePreferences: this.extractTimePreferences(recentInteractions),
      qualityPreferences: this.extractQualityPreferences(recentInteractions)
    };

    return preferences;
  }

  // Extract genre preferences from interactions
  extractGenrePreferences(interactions) {
    const genreScores = new Map();
    
    for (const interaction of interactions) {
      const itemGenres = this.getItemGenres(interaction.itemId);
      for (const genre of itemGenres) {
        const currentScore = genreScores.get(genre) || 0;
        genreScores.set(genre, currentScore + interaction.score);
      }
    }

    return Array.from(genreScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
  }

  // Extract actor preferences
  extractActorPreferences(interactions) {
    const actorScores = new Map();
    
    for (const interaction of interactions) {
      const itemActors = this.getItemActors(interaction.itemId);
      for (const actor of itemActors) {
        const currentScore = actorScores.get(actor) || 0;
        actorScores.set(actor, currentScore + interaction.score);
      }
    }

    return Array.from(actorScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([actor]) => actor);
  }

  // Extract director preferences
  extractDirectorPreferences(interactions) {
    const directorScores = new Map();
    
    for (const interaction of interactions) {
      const itemDirectors = this.getItemDirectors(interaction.itemId);
      for (const director of itemDirectors) {
        const currentScore = directorScores.get(director) || 0;
        directorScores.set(director, currentScore + interaction.score);
      }
    }

    return Array.from(directorScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([director]) => director);
  }

  // Extract year preferences
  extractYearPreferences(interactions) {
    const yearScores = new Map();
    
    for (const interaction of interactions) {
      const itemYear = this.getItemYear(interaction.itemId);
      if (itemYear) {
        const currentScore = yearScores.get(itemYear) || 0;
        yearScores.set(itemYear, currentScore + interaction.score);
      }
    }

    return Array.from(yearScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([year]) => year);
  }

  // Extract mood preferences
  extractMoodPreferences(interactions) {
    const moodScores = new Map();
    
    for (const interaction of interactions) {
      const itemMood = this.getItemMood(interaction.itemId);
      if (itemMood) {
        const currentScore = moodScores.get(itemMood) || 0;
        moodScores.set(itemMood, currentScore + interaction.score);
      }
    }

    return Array.from(moodScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mood]) => mood);
  }

  // Extract watch patterns
  extractWatchPatterns(interactions) {
    const patterns = {
      bingeWatching: 0,
      genrePreference: 0,
      timeBased: 0,
      socialInfluence: 0,
      moodBased: 0
    };

    // Analyze binge watching (multiple interactions in short time)
    const bingeSessions = this.detectBingeSessions(interactions);
    patterns.bingeWatching = bingeSessions.length / interactions.length;

    // Analyze genre preference strength
    const genrePreferences = this.extractGenrePreferences(interactions);
    patterns.genrePreference = genrePreferences.length > 0 ? 0.8 : 0.2;

    // Analyze time-based patterns
    patterns.timeBased = this.analyzeTimePatterns(interactions);

    return patterns;
  }

  // Extract time preferences
  extractTimePreferences(interactions) {
    const timeSlots = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };

    for (const interaction of interactions) {
      const hour = new Date(interaction.timestamp).getHours();
      if (hour < 12) timeSlots.morning += interaction.score;
      else if (hour < 18) timeSlots.afternoon += interaction.score;
      else if (hour < 22) timeSlots.evening += interaction.score;
      else timeSlots.night += interaction.score;
    }

    return timeSlots;
  }

  // Extract quality preferences
  extractQualityPreferences(interactions) {
    const qualityScores = {
      high: 0,
      medium: 0,
      low: 0
    };

    for (const interaction of interactions) {
      const itemQuality = this.getItemQuality(interaction.itemId);
      qualityScores[itemQuality] += interaction.score;
    }

    return qualityScores;
  }

  // Detect binge watching sessions
  detectBingeSessions(interactions) {
    const sessions = [];
    const timeWindow = 2 * 60 * 60 * 1000; // 2 hours

    for (let i = 0; i < interactions.length - 1; i++) {
      const current = interactions[i];
      const next = interactions[i + 1];
      
      if (next.timestamp - current.timestamp < timeWindow) {
        sessions.push([current, next]);
      }
    }

    return sessions;
  }

  // Analyze time patterns
  analyzeTimePatterns(interactions) {
    const timeSlots = this.extractTimePreferences(interactions);
    const totalScore = Object.values(timeSlots).reduce((sum, score) => sum + score, 0);
    
    if (totalScore === 0) return 0.5;
    
    const maxScore = Math.max(...Object.values(timeSlots));
    return maxScore / totalScore;
  }

  // Get item information (simplified - would fetch from API/cache)
  getItemGenres(itemId) {
    // This would fetch from TMDB API or cache
    return ['Action', 'Drama'];
  }

  getItemActors(itemId) {
    // This would fetch from TMDB API or cache
    return ['Actor 1', 'Actor 2'];
  }

  getItemDirectors(itemId) {
    // This would fetch from TMDB API or cache
    return ['Director 1'];
  }

  getItemYear(itemId) {
    // This would fetch from TMDB API or cache
    return 2020;
  }

  getItemMood(itemId) {
    // This would be determined by genre/content analysis
    return 'excited';
  }

  getItemQuality(itemId) {
    // This would be determined by rating/popularity
    return 'high';
  }

  // Get default preferences for new users
  getDefaultPreferences() {
    return {
      genres: ['Action', 'Drama', 'Comedy'],
      actors: [],
      directors: [],
      years: [2020, 2019, 2018],
      moods: ['excited', 'relaxed'],
      watchPatterns: {
        bingeWatching: 0.3,
        genrePreference: 0.5,
        timeBased: 0.4,
        socialInfluence: 0.2,
        moodBased: 0.3
      },
      timePreferences: {
        morning: 0.2,
        afternoon: 0.3,
        evening: 0.3,
        night: 0.2
      },
      qualityPreferences: {
        high: 0.6,
        medium: 0.3,
        low: 0.1
      }
    };
  }

  // Get real-time recommendation adjustments
  getRecommendationAdjustments(userId, recommendations) {
    const userHistory = this.userInteractions.get(userId) || [];
    const adjustments = new Map();

    for (const rec of recommendations) {
      let adjustment = 0;

      // Recent interaction boost
      const recentInteraction = userHistory.find(interaction => 
        interaction.itemId === rec.id && 
        Date.now() - interaction.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
      );

      if (recentInteraction) {
        adjustment += recentInteraction.score * 0.2;
      }

      // Similar item interaction boost
      const similarItems = this.getSimilarItems(rec.id);
      for (const similarItem of similarItems) {
        const similarInteraction = userHistory.find(interaction => 
          interaction.itemId === similarItem.id
        );
        if (similarInteraction) {
          adjustment += similarInteraction.score * 0.1;
        }
      }

      // Time-based adjustment
      const currentHour = new Date().getHours();
      const timePreferences = this.extractTimePreferences(userHistory);
      const currentTimeSlot = this.getTimeSlot(currentHour);
      adjustment += timePreferences[currentTimeSlot] * 0.05;

      adjustments.set(rec.id, adjustment);
    }

    return adjustments;
  }

  // Get similar items (simplified)
  getSimilarItems(itemId) {
    // This would fetch from recommendation service
    return [];
  }

  // Get time slot for current hour
  getTimeSlot(hour) {
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  // Update learning parameters based on performance
  updateLearningParameters(userId) {
    const userHistory = this.userInteractions.get(userId) || [];
    
    if (userHistory.length < this.minInteractions) {
      return;
    }

    // Calculate recommendation accuracy
    const recentInteractions = userHistory
      .filter(interaction => Date.now() - interaction.timestamp < 7 * 24 * 60 * 60 * 1000) // Last week
      .slice(-10); // Last 10 interactions

    const positiveInteractions = recentInteractions.filter(interaction => interaction.score > 0);
    const accuracy = positiveInteractions.length / recentInteractions.length;

    // Adjust learning rate based on accuracy
    if (accuracy > 0.7) {
      this.learningRate = Math.min(0.02, this.learningRate * 1.1);
    } else if (accuracy < 0.3) {
      this.learningRate = Math.max(0.005, this.learningRate * 0.9);
    }

    // Adjust exploration rate based on user engagement
    const engagement = recentInteractions.length / 10;
    if (engagement > 0.8) {
      this.explorationRate = Math.min(0.2, this.explorationRate * 1.1);
    } else if (engagement < 0.3) {
      this.explorationRate = Math.max(0.05, this.explorationRate * 0.9);
    }
  }

  // Get learning statistics
  getLearningStats(userId) {
    const userHistory = this.userInteractions.get(userId) || [];
    
    return {
      totalInteractions: userHistory.length,
      recentInteractions: userHistory.filter(interaction => 
        Date.now() - interaction.timestamp < 7 * 24 * 60 * 60 * 1000
      ).length,
      averageScore: userHistory.reduce((sum, interaction) => sum + interaction.score, 0) / userHistory.length || 0,
      learningRate: this.learningRate,
      explorationRate: this.explorationRate,
      accuracy: this.calculateAccuracy(userHistory)
    };
  }

  // Calculate recommendation accuracy
  calculateAccuracy(userHistory) {
    if (userHistory.length === 0) return 0;

    const recentInteractions = userHistory
      .filter(interaction => Date.now() - interaction.timestamp < 30 * 24 * 60 * 60 * 1000) // Last 30 days
      .slice(-20); // Last 20 interactions

    if (recentInteractions.length === 0) return 0;

    const positiveInteractions = recentInteractions.filter(interaction => interaction.score > 0);
    return positiveInteractions.length / recentInteractions.length;
  }

  // Clear user data (for privacy/GDPR compliance)
  clearUserData(userId) {
    this.userInteractions.delete(userId);
    
    // Clear recommendation performance data for this user
    const keysToDelete = [];
    for (const [key, value] of this.recommendationPerformance.entries()) {
      if (key.startsWith(`${userId}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.recommendationPerformance.delete(key));
  }

  // Export user data (for privacy/GDPR compliance)
  exportUserData(userId) {
    const userHistory = this.userInteractions.get(userId) || [];
    const performanceData = {};
    
    for (const [key, value] of this.recommendationPerformance.entries()) {
      if (key.startsWith(`${userId}_`)) {
        performanceData[key] = value;
      }
    }

    return {
      userId,
      interactions: userHistory,
      performanceData,
      learningStats: this.getLearningStats(userId),
      exportDate: new Date().toISOString()
    };
  }
}

// Create singleton instance
const netflixLevelRealTimeLearning = new NetflixLevelRealTimeLearning();

// Export the service
export default netflixLevelRealTimeLearning;

// Export utility functions for easy access
export const realTimeLearningUtils = {
  // Track user interaction
  trackInteraction: (userId, itemId, interactionType, timestamp) =>
    netflixLevelRealTimeLearning.trackInteraction(userId, itemId, interactionType, timestamp),

  // Get real-time user preferences
  getUserPreferences: (userId) =>
    netflixLevelRealTimeLearning.getUserPreferences(userId),

  // Get recommendation adjustments
  getRecommendationAdjustments: (userId, recommendations) =>
    netflixLevelRealTimeLearning.getRecommendationAdjustments(userId, recommendations),

  // Update learning parameters
  updateLearningParameters: (userId) =>
    netflixLevelRealTimeLearning.updateLearningParameters(userId),

  // Get learning statistics
  getLearningStats: (userId) =>
    netflixLevelRealTimeLearning.getLearningStats(userId),

  // Clear user data
  clearUserData: (userId) =>
    netflixLevelRealTimeLearning.clearUserData(userId),

  // Export user data
  exportUserData: (userId) =>
    netflixLevelRealTimeLearning.exportUserData(userId)
}; 