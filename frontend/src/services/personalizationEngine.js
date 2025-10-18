/**
 * Advanced Personalization & Recommendation Engine
 * Provides intelligent content recommendations based on user behavior and preferences
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * User Preference Manager
 */
class UserPreferenceManager {
  constructor() {
    this.preferences = this.loadPreferences();
    this.viewingHistory = this.loadViewingHistory();
    this.interactions = this.loadInteractions();
  }

  loadPreferences() {
    try {
      const stored = localStorage.getItem('user_preferences');
      return stored ? JSON.parse(stored) : {
        genres: {},
        actors: {},
        directors: {},
        contentTypes: { movie: 0, tv: 0 },
        ratings: {},
        releaseYears: {}
      };
    } catch {
      return {
        genres: {},
        actors: {},
        directors: {},
        contentTypes: { movie: 0, tv: 0 },
        ratings: {},
        releaseYears: {}
      };
    }
  }

  loadViewingHistory() {
    try {
      const stored = localStorage.getItem('viewing_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  loadInteractions() {
    try {
      const stored = localStorage.getItem('user_interactions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  savePreferences() {
    try {
      localStorage.setItem('user_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  saveViewingHistory() {
    try {
      // Keep only last 100 items
      const trimmed = this.viewingHistory.slice(-100);
      localStorage.setItem('viewing_history', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save viewing history:', error);
    }
  }

  saveInteractions() {
    try {
      // Keep only last 200 interactions
      const trimmed = this.interactions.slice(-200);
      localStorage.setItem('user_interactions', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save interactions:', error);
    }
  }

  recordView(content, duration) {
    const entry = {
      id: content.id,
      type: content.media_type || (content.first_air_date ? 'tv' : 'movie'),
      title: content.title || content.name,
      genres: content.genres || content.genre_ids || [],
      rating: content.vote_average,
      releaseYear: this.extractYear(content.release_date || content.first_air_date),
      timestamp: Date.now(),
      duration
    };

    this.viewingHistory.push(entry);
    this.updatePreferences(entry, 'view', duration > 30000 ? 2 : 1); // Higher weight for longer views
    this.saveViewingHistory();
  }

  recordInteraction(content, interactionType) {
    const weights = {
      click: 1,
      hover: 0.3,
      like: 3,
      watchlist: 2,
      share: 2.5,
      search: 1.5
    };

    const entry = {
      contentId: content.id,
      type: interactionType,
      timestamp: Date.now()
    };

    this.interactions.push(entry);
    this.updatePreferences(content, interactionType, weights[interactionType] || 1);
    this.saveInteractions();
  }

  updatePreferences(content, interactionType, weight = 1) {
    // Update genre preferences
    if (content.genres || content.genre_ids) {
      const genres = content.genres || content.genre_ids;
      genres.forEach(genre => {
        const genreId = genre.id || genre;
        this.preferences.genres[genreId] = (this.preferences.genres[genreId] || 0) + weight;
      });
    }

    // Update content type preference
    const contentType = content.media_type || (content.first_air_date ? 'tv' : 'movie');
    this.preferences.contentTypes[contentType] = 
      (this.preferences.contentTypes[contentType] || 0) + weight;

    // Update rating preference
    if (content.vote_average) {
      const ratingBucket = Math.floor(content.vote_average);
      this.preferences.ratings[ratingBucket] = 
        (this.preferences.ratings[ratingBucket] || 0) + weight;
    }

    // Update release year preference
    const year = this.extractYear(content.release_date || content.first_air_date);
    if (year) {
      const yearBucket = Math.floor(year / 5) * 5; // Group by 5-year periods
      this.preferences.releaseYears[yearBucket] = 
        (this.preferences.releaseYears[yearBucket] || 0) + weight;
    }

    this.savePreferences();
  }

  extractYear(dateString) {
    if (!dateString) return null;
    const match = dateString.match(/^\d{4}/);
    return match ? parseInt(match[0]) : null;
  }

  getTopPreferences(category, limit = 5) {
    const prefs = this.preferences[category];
    if (!prefs || Object.keys(prefs).length === 0) return [];

    return Object.entries(prefs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key]) => parseInt(key) || key);
  }

  getPreferenceScore(content) {
    let score = 0;

    // Genre score
    if (content.genres || content.genre_ids) {
      const genres = content.genres || content.genre_ids;
      genres.forEach(genre => {
        const genreId = genre.id || genre;
        score += this.preferences.genres[genreId] || 0;
      });
    }

    // Content type score
    const contentType = content.media_type || (content.first_air_date ? 'tv' : 'movie');
    score += (this.preferences.contentTypes[contentType] || 0) * 0.5;

    // Rating score
    if (content.vote_average) {
      const ratingBucket = Math.floor(content.vote_average);
      score += (this.preferences.ratings[ratingBucket] || 0) * 0.3;
    }

    // Release year score
    const year = this.extractYear(content.release_date || content.first_air_date);
    if (year) {
      const yearBucket = Math.floor(year / 5) * 5;
      score += (this.preferences.releaseYears[yearBucket] || 0) * 0.2;
    }

    return score;
  }

  getSimilarContent(content, allContent, limit = 10) {
    if (!allContent || allContent.length === 0) return [];

    const scored = allContent
      .filter(item => item.id !== content.id)
      .map(item => ({
        ...item,
        similarityScore: this.calculateSimilarity(content, item)
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return scored;
  }

  calculateSimilarity(content1, content2) {
    let score = 0;

    // Genre similarity
    const genres1 = new Set((content1.genres || content1.genre_ids || []).map(g => g.id || g));
    const genres2 = new Set((content2.genres || content2.genre_ids || []).map(g => g.id || g));
    const genreIntersection = new Set([...genres1].filter(x => genres2.has(x)));
    const genreUnion = new Set([...genres1, ...genres2]);
    
    if (genreUnion.size > 0) {
      score += (genreIntersection.size / genreUnion.size) * 10;
    }

    // Rating similarity
    if (content1.vote_average && content2.vote_average) {
      const ratingDiff = Math.abs(content1.vote_average - content2.vote_average);
      score += Math.max(0, 5 - ratingDiff);
    }

    // Release year similarity
    const year1 = this.extractYear(content1.release_date || content1.first_air_date);
    const year2 = this.extractYear(content2.release_date || content2.first_air_date);
    if (year1 && year2) {
      const yearDiff = Math.abs(year1 - year2);
      score += Math.max(0, 3 - yearDiff / 5);
    }

    return score;
  }

  clearHistory() {
    this.viewingHistory = [];
    this.interactions = [];
    this.preferences = {
      genres: {},
      actors: {},
      directors: {},
      contentTypes: { movie: 0, tv: 0 },
      ratings: {},
      releaseYears: {}
    };
    
    this.saveViewingHistory();
    this.saveInteractions();
    this.savePreferences();
  }
}

const preferenceManager = new UserPreferenceManager();

/**
 * Personalization Hook
 */
export const usePersonalization = () => {
  const [preferences, setPreferences] = useState(preferenceManager.preferences);

  const recordView = useCallback((content, duration) => {
    preferenceManager.recordView(content, duration);
    setPreferences({ ...preferenceManager.preferences });
  }, []);

  const recordInteraction = useCallback((content, interactionType) => {
    preferenceManager.recordInteraction(content, interactionType);
    setPreferences({ ...preferenceManager.preferences });
  }, []);

  const getRecommendations = useCallback((allContent, limit = 20) => {
    if (!allContent || allContent.length === 0) return [];

    // Score all content based on preferences
    const scored = allContent.map(content => ({
      ...content,
      personalScore: preferenceManager.getPreferenceScore(content)
    }));

    // Mix personalized and popular content (80/20 split)
    const personalizedLimit = Math.floor(limit * 0.8);
    const popularLimit = limit - personalizedLimit;

    const personalized = scored
      .sort((a, b) => b.personalScore - a.personalScore)
      .slice(0, personalizedLimit);

    const popular = scored
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .filter(item => !personalized.find(p => p.id === item.id))
      .slice(0, popularLimit);

    return [...personalized, ...popular];
  }, []);

  const getSimilarContent = useCallback((content, allContent, limit = 10) => {
    return preferenceManager.getSimilarContent(content, allContent, limit);
  }, []);

  const getTopGenres = useCallback((limit = 5) => {
    return preferenceManager.getTopPreferences('genres', limit);
  }, []);

  const clearHistory = useCallback(() => {
    preferenceManager.clearHistory();
    setPreferences({ ...preferenceManager.preferences });
  }, []);

  return {
    preferences,
    recordView,
    recordInteraction,
    getRecommendations,
    getSimilarContent,
    getTopGenres,
    clearHistory
  };
};

/**
 * Content Prioritization Hook
 */
export const useContentPrioritization = () => {
  const prioritizeContent = useCallback((content, factors = {}) => {
    const {
      recency = 0.2,
      popularity = 0.3,
      rating = 0.25,
      personalization = 0.25
    } = factors;

    if (!Array.isArray(content)) return [];

    const now = Date.now();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in ms

    return content.map(item => {
      let score = 0;

      // Recency score
      const releaseDate = item.release_date || item.first_air_date;
      if (releaseDate) {
        const age = now - new Date(releaseDate).getTime();
        const recencyScore = Math.max(0, 1 - (age / maxAge));
        score += recencyScore * recency * 100;
      }

      // Popularity score
      if (item.popularity) {
        const popularityScore = Math.min(1, item.popularity / 1000);
        score += popularityScore * popularity * 100;
      }

      // Rating score
      if (item.vote_average) {
        const ratingScore = item.vote_average / 10;
        score += ratingScore * rating * 100;
      }

      // Personalization score
      const personalScore = preferenceManager.getPreferenceScore(item);
      score += personalScore * personalization;

      return {
        ...item,
        priorityScore: score
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, []);

  return { prioritizeContent };
};

/**
 * Smart Content Filter Hook
 */
export const useSmartFilter = () => {
  const [filterHistory, setFilterHistory] = useState([]);

  const applySmartFilter = useCallback((content, filters) => {
    if (!Array.isArray(content)) return [];

    let filtered = [...content];

    // Genre filter
    if (filters.genres && filters.genres.length > 0) {
      filtered = filtered.filter(item => {
        const itemGenres = item.genres || item.genre_ids || [];
        return filters.genres.some(genreId => 
          itemGenres.some(g => (g.id || g) === genreId)
        );
      });
    }

    // Rating filter
    if (filters.minRating !== undefined) {
      filtered = filtered.filter(item => 
        (item.vote_average || 0) >= filters.minRating
      );
    }

    // Year filter
    if (filters.yearRange) {
      filtered = filtered.filter(item => {
        const year = preferenceManager.extractYear(
          item.release_date || item.first_air_date
        );
        return year && 
               year >= filters.yearRange[0] && 
               year <= filters.yearRange[1];
      });
    }

    // Content type filter
    if (filters.contentType) {
      filtered = filtered.filter(item => {
        const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        return type === filters.contentType;
      });
    }

    // Record filter usage
    setFilterHistory(prev => [...prev, {
      filters,
      resultCount: filtered.length,
      timestamp: Date.now()
    }].slice(-20));

    return filtered;
  }, []);

  const getSuggestedFilters = useCallback(() => {
    const topGenres = preferenceManager.getTopPreferences('genres', 3);
    const topRatings = preferenceManager.getTopPreferences('ratings', 1);
    const topYears = preferenceManager.getTopPreferences('releaseYears', 1);

    return {
      genres: topGenres,
      minRating: topRatings[0] || 7,
      yearRange: topYears[0] ? [topYears[0], topYears[0] + 5] : null
    };
  }, []);

  return {
    applySmartFilter,
    getSuggestedFilters,
    filterHistory
  };
};

/**
 * Trending Content Algorithm
 */
export const useTrendingAlgorithm = () => {
  const calculateTrendingScore = useCallback((content, timeWindow = 7) => {
    if (!Array.isArray(content)) return [];

    const now = Date.now();
    const windowMs = timeWindow * 24 * 60 * 60 * 1000;

    return content.map(item => {
      let score = 0;

      // Popularity momentum (40%)
      if (item.popularity) {
        score += (item.popularity / 1000) * 40;
      }

      // Rating quality (30%)
      if (item.vote_average && item.vote_count) {
        const confidence = Math.min(1, item.vote_count / 500);
        score += (item.vote_average / 10) * 30 * confidence;
      }

      // Recency boost (30%)
      const releaseDate = item.release_date || item.first_air_date;
      if (releaseDate) {
        const age = now - new Date(releaseDate).getTime();
        if (age < windowMs) {
          const recencyBoost = 1 - (age / windowMs);
          score += recencyBoost * 30;
        }
      }

      return {
        ...item,
        trendingScore: score
      };
    }).sort((a, b) => b.trendingScore - a.trendingScore);
  }, []);

  return { calculateTrendingScore };
};

export default {
  usePersonalization,
  useContentPrioritization,
  useSmartFilter,
  useTrendingAlgorithm
};
