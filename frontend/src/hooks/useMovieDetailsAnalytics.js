/**
 * 🚀 Advanced Analytics Hook for Movie Details
 * 
 * Comprehensive analytics tracking including:
 * - User interactions
 * - Performance metrics
 * - Engagement tracking
 * - Conversion funnels
 * - A/B testing support
 * - Real-time event streaming
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useWebVitals } from './useWebVitals';

export const useMovieDetailsAnalytics = (movie, options = {}) => {
  const {
    trackPageView = true,
    trackInteractions = true,
    trackPerformance = true,
    trackEngagement = true,
    sessionTimeout = 30 * 60 * 1000, // 30 minutes
  } = options;

  const [sessionId] = useState(() => generateSessionId());
  const [engagementScore, setEngagementScore] = useState(0);
  
  const sessionStartRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());
  const interactionCountRef = useRef(0);
  const engagementEventsRef = useRef([]);
  
  const webVitals = useWebVitals?.();

  /**
   * Track page view
   */
  const trackPageViewEvent = useCallback((data = {}) => {
    if (!movie || !trackPageView) return;

    const event = {
      type: 'page_view',
      sessionId,
      timestamp: Date.now(),
      movie: {
        id: movie.id,
        title: movie.title || movie.name,
        type: movie.media_type || movie.type || 'movie',
      },
      ...data,
    };

    sendAnalyticsEvent(event);
  }, [movie, sessionId, trackPageView]);

  /**
   * Track user interaction
   */
  const trackInteraction = useCallback((action, data = {}) => {
    if (!trackInteractions) return;

    lastActivityRef.current = Date.now();
    interactionCountRef.current += 1;

    const event = {
      type: 'interaction',
      action,
      sessionId,
      timestamp: Date.now(),
      interactionNumber: interactionCountRef.current,
      movie: movie ? {
        id: movie.id,
        title: movie.title || movie.name,
      } : null,
      ...data,
    };

    sendAnalyticsEvent(event);

    // Update engagement score
    updateEngagementScore(action);
  }, [movie, sessionId, trackInteractions]);

  /**
   * Track trailer play
   */
  const trackTrailerPlay = useCallback((videoId) => {
    trackInteraction('trailer_play', { videoId });
  }, [trackInteraction]);

  /**
   * Track trailer complete
   */
  const trackTrailerComplete = useCallback((videoId, watchDuration) => {
    trackInteraction('trailer_complete', { videoId, watchDuration });
  }, [trackInteraction]);

  /**
   * Track share action
   */
  const trackShare = useCallback((platform, config = {}) => {
    trackInteraction('share', { platform, config });
  }, [trackInteraction]);

  /**
   * Track watchlist action
   */
  const trackWatchlistAction = useCallback((action) => {
    trackInteraction('watchlist', { action });
  }, [trackInteraction]);

  /**
   * Track streaming start
   */
  const trackStreamingStart = useCallback((service, episodeData = {}) => {
    trackInteraction('streaming_start', { service, ...episodeData });
  }, [trackInteraction]);

  /**
   * Track cast member view
   */
  const trackCastView = useCallback((castMember) => {
    trackInteraction('cast_view', {
      castId: castMember.id,
      castName: castMember.name,
    });
  }, [trackInteraction]);

  /**
   * Track similar content click
   */
  const trackSimilarClick = useCallback((similarMovie) => {
    trackInteraction('similar_click', {
      similarId: similarMovie.id,
      similarTitle: similarMovie.title || similarMovie.name,
    });
  }, [trackInteraction]);

  /**
   * Track scroll depth
   */
  const trackScrollDepth = useCallback((depth) => {
    trackInteraction('scroll', { depth });
  }, [trackInteraction]);

  /**
   * Track time spent
   */
  const trackTimeSpent = useCallback(() => {
    const timeSpent = Date.now() - sessionStartRef.current;
    const activeTime = Date.now() - lastActivityRef.current;

    const event = {
      type: 'time_spent',
      sessionId,
      timestamp: Date.now(),
      timeSpent,
      activeTime,
      interactionCount: interactionCountRef.current,
      movie: movie ? {
        id: movie.id,
        title: movie.title || movie.name,
      } : null,
    };

    sendAnalyticsEvent(event);
  }, [movie, sessionId]);

  /**
   * Track performance metrics
   */
  const trackPerformanceMetrics = useCallback((metrics = {}) => {
    if (!trackPerformance) return;

    const event = {
      type: 'performance',
      sessionId,
      timestamp: Date.now(),
      metrics: {
        ...metrics,
        webVitals: webVitals || {},
      },
      movie: movie ? {
        id: movie.id,
      } : null,
    };

    sendAnalyticsEvent(event);
  }, [movie, sessionId, trackPerformance, webVitals]);

  /**
   * Track error
   */
  const trackError = useCallback((error, context = {}) => {
    const event = {
      type: 'error',
      sessionId,
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      movie: movie ? {
        id: movie.id,
      } : null,
    };

    sendAnalyticsEvent(event);
  }, [movie, sessionId]);

  /**
   * Update engagement score based on action
   */
  const updateEngagementScore = useCallback((action) => {
    const engagementWeights = {
      trailer_play: 10,
      trailer_complete: 20,
      share: 15,
      watchlist: 10,
      streaming_start: 25,
      cast_view: 5,
      similar_click: 8,
      scroll: 2,
    };

    const weight = engagementWeights[action] || 1;
    
    setEngagementScore(prev => {
      const newScore = Math.min(prev + weight, 100);
      engagementEventsRef.current.push({
        action,
        weight,
        timestamp: Date.now(),
      });
      return newScore;
    });
  }, []);

  /**
   * Get engagement insights
   */
  const getEngagementInsights = useCallback(() => {
    const timeSpent = Date.now() - sessionStartRef.current;
    const activeTime = Date.now() - lastActivityRef.current;
    const isActive = activeTime < sessionTimeout;

    return {
      sessionId,
      engagementScore,
      interactionCount: interactionCountRef.current,
      timeSpent,
      activeTime,
      isActive,
      sessionStart: sessionStartRef.current,
      lastActivity: lastActivityRef.current,
      events: engagementEventsRef.current,
      category: categorizeEngagement(engagementScore),
    };
  }, [sessionId, engagementScore, sessionTimeout]);

  /**
   * Track session end
   */
  const trackSessionEnd = useCallback(() => {
    const insights = getEngagementInsights();

    const event = {
      type: 'session_end',
      sessionId,
      timestamp: Date.now(),
      ...insights,
      movie: movie ? {
        id: movie.id,
        title: movie.title || movie.name,
      } : null,
    };

    sendAnalyticsEvent(event);
  }, [movie, sessionId, getEngagementInsights]);

  // Track page view on mount
  useEffect(() => {
    if (movie) {
      trackPageViewEvent();
    }
  }, [movie?.id, trackPageViewEvent]);

  // Track time spent periodically
  useEffect(() => {
    if (!trackEngagement) return;

    const interval = setInterval(() => {
      trackTimeSpent();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [trackEngagement, trackTimeSpent]);

  // Track session end on unmount
  useEffect(() => {
    return () => {
      trackSessionEnd();
    };
  }, [trackSessionEnd]);

  // Check for session timeout
  useEffect(() => {
    const interval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      
      if (inactiveTime > sessionTimeout) {
        trackSessionEnd();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [sessionTimeout, trackSessionEnd]);

  return {
    // Session info
    sessionId,
    engagementScore,
    
    // Tracking methods
    trackInteraction,
    trackTrailerPlay,
    trackTrailerComplete,
    trackShare,
    trackWatchlistAction,
    trackStreamingStart,
    trackCastView,
    trackSimilarClick,
    trackScrollDepth,
    trackTimeSpent,
    trackPerformanceMetrics,
    trackError,
    
    // Insights
    getEngagementInsights,
  };
};

/**
 * Send analytics event to tracking service
 */
function sendAnalyticsEvent(event) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics Event:', event);
  }

  // Send to analytics service (implement based on your provider)
  // Examples: Google Analytics, Mixpanel, Amplitude, etc.
  try {
    // Google Analytics 4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.type, {
        ...event,
        event_category: 'movie_details',
      });
    }

    // Custom analytics service
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track(event.type, event);
    }
  } catch (error) {
    console.warn('[Analytics] Failed to send event:', error);
  }
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Categorize engagement level
 */
function categorizeEngagement(score) {
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 15) return 'low';
  return 'minimal';
}

export default useMovieDetailsAnalytics;
