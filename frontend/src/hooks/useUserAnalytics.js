import { useState, useEffect, useMemo, useCallback } from 'react';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import userAnalyticsService from '../services/userAnalyticsService';

/**
 * Custom hook for user analytics data
 * Provides comprehensive user statistics that can be used across the website
 * @returns {Object} User analytics data and loading state
 */
export const useUserAnalytics = () => {
  const { continueWatching } = useViewingProgress();
  const { watchlist } = useWatchlist();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize the viewing progress data structure for analytics
  const viewingProgressData = useMemo(() => {
    if (!continueWatching || !Array.isArray(continueWatching)) {
      return {};
    }

    return continueWatching.reduce((acc, item) => {
      const key = item.type === 'movie' 
        ? `movie_${item.id}` 
        : `tv_${item.id}_${item.season}_${item.episode}`;
      acc[key] = item;
      return acc;
    }, {});
  }, [continueWatching]);

  // Calculate analytics when data changes
  useEffect(() => {
    if (continueWatching && watchlist) {
      setIsLoading(true);
      
      try {
        const stats = userAnalyticsService.getComprehensiveStats({
          viewingProgress: viewingProgressData,
          watchlist
        });
        
        setAnalytics(stats);
      } catch (error) {
        console.error('Error calculating user analytics:', error);
        setAnalytics(null);
        setError(error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [viewingProgressData, watchlist]);

  // Memoized computed values for performance
  const computedStats = useMemo(() => {
    if (!analytics) return null;

    return {
      ...analytics,
      achievements: userAnalyticsService.getAchievementBadgesWithProgress(analytics),
      achievementStats: userAnalyticsService.getAchievementStats(
        userAnalyticsService.getAchievementBadgesWithProgress(analytics)
      )
    };
  }, [analytics]);

  const getQuickStats = useCallback(() => {
    if (!computedStats) return [];
    
    return [
      { label: 'Watch Time', value: computedStats.watchTime.formatted, icon: 'ClockIcon' },
      { label: 'Completed', value: computedStats.content.completed, icon: 'CheckCircleIcon' },
      { label: 'Watchlist', value: computedStats.reviews.written, icon: 'StarIcon' },
      { label: 'Streak', value: computedStats.preferences.viewingStreak, icon: 'FireIcon' },
      { label: 'Rating', value: computedStats.reviews.averageRating.toFixed(1), icon: 'StarIcon' }
    ];
  }, [computedStats]);

  const getAchievements = useCallback(() => {
    if (!computedStats) return [];
    return computedStats.achievements || [];
  }, [computedStats]);

  const getAchievementStats = useCallback(() => {
    if (!computedStats) return null;
    return computedStats.achievementStats || null;
  }, [computedStats]);

  const getRecentlyUnlocked = useCallback(() => {
    if (!computedStats?.achievements) return [];
    return userAnalyticsService.getRecentlyUnlocked(computedStats.achievements, 5);
  }, [computedStats]);

  const getNextAchievements = useCallback(() => {
    if (!computedStats?.achievements) return [];
    return userAnalyticsService.getNextAchievements(computedStats.achievements, 3);
  }, [computedStats]);

  const getAchievementsByCategory = useCallback((category) => {
    if (!computedStats?.achievements) return [];
    return computedStats.achievements.filter(achievement => achievement.category === category);
  }, [computedStats]);

  const getAchievementsByRarity = useCallback((rarity) => {
    if (!computedStats?.achievements) return [];
    return computedStats.achievements.filter(achievement => achievement.rarity === rarity);
  }, [computedStats]);

  // Helper functions for common analytics queries
  const getProgressStats = () => {
    if (!computedStats) return null;
    
    return {
      inProgress: computedStats.content.inProgress,
      completionRate: computedStats.completionRate,
      averageRating: computedStats.reviews.averageRating
    };
  };

  const getWatchTimeBreakdown = () => {
    if (!computedStats) return null;
    
    return {
      movies: computedStats.watchTime.movies,
      tv: computedStats.watchTime.tv,
      total: computedStats.watchTime.total,
      formatted: computedStats.watchTime.formatted
    };
  };

  const getGenreInsights = () => {
    if (!computedStats) return null;
    
    return {
      favoriteGenres: computedStats.preferences.favoriteGenres,
      genreCount: computedStats.preferences.favoriteGenres.length
    };
  };

  return { 
    analytics: computedStats, 
    isLoading, 
    error,
    getQuickStats,
    getProgressStats,
    getAchievements,
    getAchievementStats,
    getRecentlyUnlocked,
    getNextAchievements,
    getAchievementsByCategory,
    getAchievementsByRarity,
    getWatchTimeBreakdown,
    getGenreInsights,
    
    // Raw data access
    viewingProgress: viewingProgressData,
    watchlist,
    
    // Service access for custom calculations
    analyticsService: userAnalyticsService
  };
};

export default useUserAnalytics; 