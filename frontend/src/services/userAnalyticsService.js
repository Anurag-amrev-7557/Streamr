/**
 * User Analytics Service
 * Calculates comprehensive user statistics from viewing progress, watchlist, and other data
 */

class UserAnalyticsService {
  /**
   * Calculate total watch time in hours
   * @param {Object} viewingProgress - User's viewing progress data
   * @returns {number} Total watch time in hours
   */
  calculateTotalWatchTime(viewingProgress) {
    if (!viewingProgress || typeof viewingProgress !== 'object') {
      return 0;
    }

    let totalMinutes = 0;
    
    Object.values(viewingProgress).forEach(item => {
      if (item.progress && item.progress > 0) {
        // Estimate duration based on content type and progress
        let estimatedDuration = 0;
        
        if (item.type === 'movie') {
          // Movies typically 90-180 minutes, use 120 as average
          estimatedDuration = 120;
        } else if (item.type === 'tv') {
          // TV episodes typically 22-60 minutes, use 45 as average
          estimatedDuration = 45;
        }
        
        // Calculate actual watch time based on progress percentage
        const watchTime = (item.progress / 100) * estimatedDuration;
        totalMinutes += watchTime;
      }
    });

    // Convert to hours and round to 1 decimal place
    return Math.round((totalMinutes / 60) * 10) / 10;
  }

  /**
   * Calculate total content completed
   * @param {Object} viewingProgress - User's viewing progress data
   * @returns {Object} Object with counts for movies and TV episodes
   */
  calculateContentCompleted(viewingProgress) {
    if (!viewingProgress || typeof viewingProgress !== 'object') {
      return { movies: 0, tvEpisodes: 0, total: 0 };
    }

    let moviesCompleted = 0;
    let tvEpisodesCompleted = 0;

    Object.values(viewingProgress).forEach(item => {
      if (item.progress && item.progress >= 90) { // Consider 90%+ as completed
        if (item.type === 'movie') {
          moviesCompleted++;
        } else if (item.type === 'tv') {
          tvEpisodesCompleted++;
        }
      }
    });

    return {
      movies: moviesCompleted,
      tvEpisodes: tvEpisodesCompleted,
      total: moviesCompleted + tvEpisodesCompleted
    };
  }

  /**
   * Calculate total reviews written
   * @param {Array} watchlist - User's watchlist
   * @param {Object} viewingProgress - User's viewing progress data
   * @returns {number} Total number of reviews
   */
  calculateReviewsWritten(watchlist, viewingProgress) {
    if (!watchlist || !Array.isArray(watchlist)) {
      return 0;
    }

    let reviewCount = 0;
    
    // Count items in watchlist as potential reviews (user has shown interest)
    reviewCount += watchlist.length;
    
    // Add bonus for completed content
    if (viewingProgress && typeof viewingProgress === 'object') {
      Object.values(viewingProgress).forEach(item => {
        if (item.progress && item.progress >= 90) {
          reviewCount += 0.5; // Bonus for completed content
        }
      });
    }

    return Math.round(reviewCount);
  }

  /**
   * Calculate watch time by content type
   * @param {Object} viewingProgress - User's viewing progress data
   * @returns {Object} Watch time breakdown by type
   */
  calculateWatchTimeByType(viewingProgress) {
    if (!viewingProgress || typeof viewingProgress !== 'object') {
      return { movies: 0, tv: 0 };
    }

    let movieMinutes = 0;
    let tvMinutes = 0;

    Object.values(viewingProgress).forEach(item => {
      if (item.progress && item.progress > 0) {
        let estimatedDuration = 0;
        
        if (item.type === 'movie') {
          estimatedDuration = 120; // Average movie duration
          const watchTime = (item.progress / 100) * estimatedDuration;
          movieMinutes += watchTime;
        } else if (item.type === 'tv') {
          estimatedDuration = 45; // Average episode duration
          const watchTime = (item.progress / 100) * estimatedDuration;
          tvMinutes += watchTime;
        }
      }
    });

    return {
      movies: Math.round((movieMinutes / 60) * 10) / 10,
      tv: Math.round((tvMinutes / 60) * 10) / 10
    };
  }

  /**
   * Calculate average rating given by user
   * @param {Array} watchlist - User's watchlist
   * @returns {number} Average rating (0-10)
   */
  calculateAverageRating(watchlist) {
    if (!watchlist || !Array.isArray(watchlist) || watchlist.length === 0) {
      return 0;
    }

    const totalRating = watchlist.reduce((sum, item) => {
      const rating = parseFloat(item.rating) || 0;
      return sum + rating;
    }, 0);

    return Math.round((totalRating / watchlist.length) * 10) / 10;
  }

  /**
   * Calculate favorite genres based on watchlist
   * @param {Array} watchlist - User's watchlist
   * @returns {Array} Top 3 favorite genres
   */
  calculateFavoriteGenres(watchlist) {
    if (!watchlist || !Array.isArray(watchlist)) {
      return [];
    }

    const genreCounts = {};
    
    watchlist.forEach(item => {
      if (item.genres && Array.isArray(item.genres)) {
        item.genres.forEach(genre => {
          const genreName = typeof genre === 'string' ? genre : genre.name;
          if (genreName) {
            genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
          }
        });
      }
    });

    // Sort genres by count and return top 3
    return Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
  }

  /**
   * Calculate viewing streak (consecutive days watched)
   * @param {Object} viewingProgress - User's viewing progress data
   * @returns {number} Current viewing streak
   */
  calculateViewingStreak(viewingProgress) {
    if (!viewingProgress || typeof viewingProgress !== 'object') {
      return 0;
    }

    const today = new Date();
    const dates = Object.values(viewingProgress)
      .map(item => new Date(item.lastWatched))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => b - a); // Sort by most recent

    if (dates.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) { // Check up to 1 year
      const hasWatched = dates.some(date => {
        const watchDate = new Date(date);
        watchDate.setHours(0, 0, 0, 0);
        return watchDate.getTime() === currentDate.getTime();
      });

      if (hasWatched) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get comprehensive user statistics
   * @param {Object} userData - User data including viewing progress and watchlist
   * @returns {Object} Complete user statistics
   */
  getComprehensiveStats(userData) {
    const { viewingProgress = {}, watchlist = [] } = userData;

    const totalWatchTime = this.calculateTotalWatchTime(viewingProgress);
    const contentCompleted = this.calculateContentCompleted(viewingProgress);
    const reviewsWritten = this.calculateReviewsWritten(watchlist, viewingProgress);
    const watchTimeByType = this.calculateWatchTimeByType(viewingProgress);
    const averageRating = this.calculateAverageRating(watchlist);
    const favoriteGenres = this.calculateFavoriteGenres(watchlist);
    const viewingStreak = this.calculateViewingStreak(viewingProgress);

    return {
      watchTime: {
        total: totalWatchTime,
        movies: watchTimeByType.movies,
        tv: watchTimeByType.tv,
        formatted: `${totalWatchTime}h`
      },
      content: {
        completed: contentCompleted.total,
        movies: contentCompleted.movies,
        tvEpisodes: contentCompleted.tvEpisodes,
        inProgress: Object.keys(viewingProgress).length
      },
      reviews: {
        written: reviewsWritten,
        averageRating: averageRating,
        watchlistItems: watchlist.length
      },
      preferences: {
        favoriteGenres: favoriteGenres,
        viewingStreak: viewingStreak
      },
      summary: {
        totalHours: totalWatchTime,
        completedContent: contentCompleted.total,
        totalReviews: reviewsWritten,
        currentStreak: viewingStreak
      }
    };
  }

  /**
   * Format watch time for display
   * @param {number} hours - Hours to format
   * @returns {string} Formatted time string
   */
  formatWatchTime(hours) {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      const days = Math.round(hours / 24);
      return `${days}d`;
    }
  }

  /**
   * Get comprehensive achievement badges with progress tracking
   * @param {Object} stats - User statistics
   * @returns {Array} Array of achievement objects with progress and unlock status
   */
  getAchievementBadgesWithProgress(stats) {
    if (!stats) return [];

    const achievements = [
      // Watch Time Achievements
      {
        id: 'century_watcher',
        name: 'Century Watcher',
        description: 'Watch 100+ hours of content',
        icon: 'FilmIcon',
        category: 'watch_time',
        progress: Math.min(stats.watchTime.total, 100),
        maxProgress: 100,
        unlocked: stats.watchTime.total >= 100,
        rarity: 'common',
        points: 10
      },
      {
        id: 'binge_master',
        name: 'Binge Master',
        description: 'Watch 500+ hours of content',
        icon: 'TvIcon',
        category: 'watch_time',
        progress: Math.min(stats.watchTime.total, 500),
        maxProgress: 500,
        unlocked: stats.watchTime.total >= 500,
        rarity: 'rare',
        points: 25
      },
      {
        id: 'marathon_runner',
        name: 'Marathon Runner',
        description: 'Watch 1000+ hours of content',
        icon: 'TrophyIcon',
        category: 'watch_time',
        progress: Math.min(stats.watchTime.total, 1000),
        maxProgress: 1000,
        unlocked: stats.watchTime.total >= 1000,
        rarity: 'epic',
        points: 50
      },

      // Content Completion Achievements
      {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Complete your first piece of content',
        icon: 'CheckCircleIcon',
        category: 'completion',
        progress: Math.min(stats.content.completed, 1),
        maxProgress: 1,
        unlocked: stats.content.completed >= 1,
        rarity: 'common',
        points: 5
      },
      {
        id: 'content_crusher',
        name: 'Content Crusher',
        description: 'Complete 50+ pieces of content',
        icon: 'PlayIcon',
        category: 'completion',
        progress: Math.min(stats.content.completed, 50),
        maxProgress: 50,
        unlocked: stats.content.completed >= 50,
        rarity: 'rare',
        points: 20
      },
      {
        id: 'completionist',
        name: 'Completionist',
        description: 'Complete 100+ pieces of content',
        icon: 'TrophyIcon',
        category: 'completion',
        progress: Math.min(stats.content.completed, 100),
        maxProgress: 100,
        unlocked: stats.content.completed >= 100,
        rarity: 'epic',
        points: 40
      },

      // Viewing Streak Achievements
      {
        id: 'getting_hooked',
        name: 'Getting Hooked',
        description: 'Maintain a 3+ day viewing streak',
        icon: 'FlagIcon',
        category: 'streak',
        progress: Math.min(stats.preferences.viewingStreak, 3),
        maxProgress: 3,
        unlocked: stats.preferences.viewingStreak >= 3,
        rarity: 'common',
        points: 10
      },
      {
        id: 'weekly_warrior',
        name: 'Weekly Warrior',
        description: 'Maintain a 7+ day viewing streak',
        icon: 'BoltIcon',
        category: 'streak',
        progress: Math.min(stats.preferences.viewingStreak, 7),
        maxProgress: 7,
        unlocked: stats.preferences.viewingStreak >= 7,
        rarity: 'rare',
        points: 20
      },
      {
        id: 'streak_master',
        name: 'Streak Master',
        description: 'Maintain a 30+ day viewing streak',
        icon: 'FireIcon',
        category: 'streak',
        progress: Math.min(stats.preferences.viewingStreak, 30),
        maxProgress: 30,
        unlocked: stats.preferences.viewingStreak >= 30,
        rarity: 'legendary',
        points: 100
      },

      // Rating Achievements
      {
        id: 'critic',
        name: 'Critic',
        description: 'Rate 10+ pieces of content',
        icon: 'StarIcon',
        category: 'rating',
        progress: Math.min(stats.reviews.written, 10),
        maxProgress: 10,
        unlocked: stats.reviews.written >= 10,
        rarity: 'common',
        points: 15
      },
      {
        id: 'senior_critic',
        name: 'Senior Critic',
        description: 'Rate 50+ pieces of content',
        icon: 'StarIcon',
        category: 'rating',
        progress: Math.min(stats.reviews.written, 50),
        maxProgress: 50,
        unlocked: stats.reviews.written >= 50,
        rarity: 'rare',
        points: 30
      },
      {
        id: 'master_critic',
        name: 'Master Critic',
        description: 'Rate 100+ pieces of content',
        icon: 'TrophyIcon',
        category: 'rating',
        progress: Math.min(stats.reviews.written, 100),
        maxProgress: 100,
        unlocked: stats.reviews.written >= 100,
        rarity: 'epic',
        points: 60
      },

      // Genre Diversity Achievements
      {
        id: 'explorer',
        name: 'Explorer',
        description: 'Watch content from 5+ different genres',
        icon: 'GlobeAltIcon',
        category: 'diversity',
        progress: Math.min(stats.preferences.favoriteGenres.length, 5),
        maxProgress: 5,
        unlocked: stats.preferences.favoriteGenres.length >= 5,
        rarity: 'common',
        points: 15
      },
      {
        id: 'genre_master',
        name: 'Genre Master',
        description: 'Watch content from 10+ different genres',
        icon: 'LightBulbIcon',
        category: 'diversity',
        progress: Math.min(stats.preferences.favoriteGenres.length, 10),
        maxProgress: 10,
        unlocked: stats.preferences.favoriteGenres.length >= 10,
        rarity: 'rare',
        points: 30
      },

      // Special Achievements
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Join the platform early',
        icon: 'UserIcon',
        category: 'special',
        progress: 1,
        maxProgress: 1,
        unlocked: true, // Always unlocked for existing users
        rarity: 'special',
        points: 5
      },
      {
        id: 'active_user',
        name: 'Active User',
        description: 'Use the platform for 7+ consecutive days',
        icon: 'FireIcon',
        category: 'special',
        progress: Math.min(stats.preferences.viewingStreak, 7),
        maxProgress: 7,
        unlocked: stats.preferences.viewingStreak >= 7,
        rarity: 'common',
        points: 15
      }
    ];

    return achievements;
  }

  /**
   * Calculate total achievement points
   * @param {Array} achievements - Array of achievement objects
   * @returns {number} Total points earned
   */
  calculateTotalPoints(achievements) {
    if (!achievements || !Array.isArray(achievements)) return 0;
    
    return achievements
      .filter(achievement => achievement.unlocked)
      .reduce((total, achievement) => total + achievement.points, 0);
  }

  /**
   * Get achievement statistics
   * @param {Array} achievements - Array of achievement objects
   * @returns {Object} Achievement statistics
   */
  getAchievementStats(achievements) {
    if (!achievements || !Array.isArray(achievements)) {
      return {
        total: 0,
        unlocked: 0,
        locked: 0,
        totalPoints: 0,
        completionRate: 0,
        rarityBreakdown: {
          common: 0,
          rare: 0,
          epic: 0,
          legendary: 0,
          special: 0
        }
      };
    }

    const stats = {
      total: achievements.length,
      unlocked: achievements.filter(a => a.unlocked).length,
      locked: achievements.filter(a => !a.unlocked).length,
      totalPoints: this.calculateTotalPoints(achievements),
      completionRate: Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100),
      rarityBreakdown: {
        common: achievements.filter(a => a.rarity === 'common' && a.unlocked).length,
        rare: achievements.filter(a => a.rarity === 'rare' && a.unlocked).length,
        epic: achievements.filter(a => a.rarity === 'epic' && a.unlocked).length,
        legendary: achievements.filter(a => a.rarity === 'legendary' && a.unlocked).length,
        special: achievements.filter(a => a.rarity === 'special' && a.unlocked).length
      }
    };

    return stats;
  }

  /**
   * Get recently unlocked achievements (for notifications)
   * @param {Array} achievements - Array of achievement objects
   * @param {number} limit - Maximum number of recent achievements to return
   * @returns {Array} Recently unlocked achievements
   */
  getRecentlyUnlocked(achievements, limit = 5) {
    if (!achievements || !Array.isArray(achievements)) return [];
    
    return achievements
      .filter(achievement => achievement.unlocked)
      .slice(0, limit);
  }

  /**
   * Get next achievable achievements (for motivation)
   * @param {Array} achievements - Array of achievement objects
   * @param {number} limit - Maximum number of next achievements to return
   * @returns {Array} Next achievable achievements
   */
  getNextAchievements(achievements, limit = 3) {
    if (!achievements || !Array.isArray(achievements)) return [];
    
    return achievements
      .filter(achievement => !achievement.unlocked)
      .sort((a, b) => a.maxProgress - b.maxProgress)
      .slice(0, limit);
  }
}

export default new UserAnalyticsService(); 