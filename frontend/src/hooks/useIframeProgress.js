import { useEffect, useRef, useCallback } from 'react';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import iframeProgressService from '../services/iframeProgressService';

/**
 * Custom hook for tracking iframe progress from external streaming services
 * @param {Object} content - Content object with id, type, and optional season/episode
 * @param {React.RefObject} iframeRef - Reference to the iframe element
 * @param {Object} options - Configuration options
 * @returns {Object} Progress tracking state and functions
 */
export const useIframeProgress = (content, iframeRef, options = {}) => {
  const {
    autoStart = true,
    updateInterval = 10000,
    urlCheckInterval = 5000,
    minProgressChange = 1,
    enableLocalStorageCheck = true,
    enableUrlMonitoring = true,
    enablePostMessage = true
  } = options;

  const { startWatchingMovie, startWatchingEpisode, updateProgress } = useViewingProgress();
  
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const isTrackingRef = useRef(false);
  const urlMonitoringRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const listenerIdRef = useRef(null);

  // Generate unique listener ID
  const listenerId = useRef(`progress-${content?.id}-${Date.now()}`);

  /**
   * Start progress tracking
   */
  const startTracking = useCallback(() => {
    if (!content || !iframeRef?.current || isTrackingRef.current) return;

    console.log('🎬 Starting iframe progress tracking for:', content);
    isTrackingRef.current = true;

    // Start watching the content
    if (content.type === 'movie') {
      startWatchingMovie(content);
    } else if (content.type === 'tv' && content.season && content.episode) {
      startWatchingEpisode(content, content.season, content.episode);
    }

    // Strategy 1: PostMessage listener
    if (enablePostMessage) {
      listenerIdRef.current = listenerId.current;
      iframeProgressService.addListener(listenerIdRef.current, handleProgressUpdate);
    }

    // Strategy 2: URL monitoring
    if (enableUrlMonitoring) {
      urlMonitoringRef.current = iframeProgressService.startUrlMonitoring(
        iframeRef.current,
        handleUrlProgressUpdate,
        urlCheckInterval
      );
    }

    // Strategy 3: localStorage check
    if (enableLocalStorageCheck) {
      setTimeout(() => {
        const localStorageProgress = iframeProgressService.checkLocalStorageForProgress();
        if (localStorageProgress) {
          handleProgressUpdate(localStorageProgress);
        }
      }, 2000); // Delay to allow iframe to load
    }

    // Strategy 4: Periodic progress requests
    progressIntervalRef.current = setInterval(() => {
      if (iframeRef.current) {
        iframeProgressService.requestProgressFromIframe(iframeRef.current);
      }
    }, updateInterval);

  }, [content, iframeRef, startWatchingMovie, startWatchingEpisode, enablePostMessage, enableUrlMonitoring, enableLocalStorageCheck, updateInterval, urlCheckInterval]);

  /**
   * Stop progress tracking
   */
  const stopTracking = useCallback(() => {
    if (!isTrackingRef.current) return;

    console.log('🛑 Stopping iframe progress tracking');
    isTrackingRef.current = false;

    // Remove postMessage listener
    if (listenerIdRef.current) {
      iframeProgressService.removeListener(listenerIdRef.current);
      listenerIdRef.current = null;
    }

    // Stop URL monitoring
    if (urlMonitoringRef.current) {
      iframeProgressService.stopUrlMonitoring(urlMonitoringRef.current);
      urlMonitoringRef.current = null;
    }

    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle progress updates from postMessage
   */
  const handleProgressUpdate = useCallback((progressData) => {
    if (!progressData || !content) return;

    const { progress, currentTime, duration } = progressData;
    
    // Only update if progress has changed significantly
    if (Math.abs(progress - progressRef.current) >= minProgressChange) {
      progressRef.current = progress;
      durationRef.current = duration || 0;
      
      console.log('📊 Iframe progress update:', {
        content: content.title || content.name,
        progress: progress.toFixed(1) + '%',
        currentTime,
        duration
      });

      // Update progress in context
      if (content.type === 'movie') {
        updateProgress(content.id, 'movie', null, null, progress);
      } else if (content.type === 'tv') {
        updateProgress(content.id, 'tv', content.season, content.episode, progress);
      }
    }
  }, [content, updateProgress, minProgressChange]);

  /**
   * Handle progress updates from URL monitoring
   */
  const handleUrlProgressUpdate = useCallback((timestampData) => {
    if (!timestampData || !content) return;

    const { progress, timestamp } = timestampData;
    
    // Only update if progress has changed significantly
    if (Math.abs(progress - progressRef.current) >= minProgressChange) {
      progressRef.current = progress;
      
      console.log('⏰ URL timestamp progress update:', {
        content: content.title || content.name,
        progress: progress.toFixed(1) + '%',
        timestamp
      });

      // Update progress in context
      if (content.type === 'movie') {
        updateProgress(content.id, 'movie', null, null, progress);
      } else if (content.type === 'tv') {
        updateProgress(content.id, 'tv', content.season, content.episode, progress);
      }
    }
  }, [content, updateProgress, minProgressChange]);

  /**
   * Get current progress
   */
  const getCurrentProgress = useCallback(() => {
    return {
      progress: progressRef.current,
      duration: durationRef.current,
      isTracking: isTrackingRef.current
    };
  }, []);

  /**
   * Manually update progress
   */
  const setProgress = useCallback((progress, duration = 0) => {
    if (!content) return;

    progressRef.current = Math.max(0, Math.min(100, progress));
    durationRef.current = duration;

    console.log('🎯 Manual progress update:', {
      content: content.title || content.name,
      progress: progressRef.current.toFixed(1) + '%'
    });

    // Update progress in context
    if (content.type === 'movie') {
      updateProgress(content.id, 'movie', null, null, progressRef.current);
    } else if (content.type === 'tv') {
      updateProgress(content.id, 'tv', content.season, content.episode, progressRef.current);
    }
  }, [content, updateProgress]);

  /**
   * Check if tracking is active
   */
  const isTracking = useCallback(() => {
    return isTrackingRef.current;
  }, []);

  // Auto-start tracking when content changes
  useEffect(() => {
    if (autoStart && content && iframeRef?.current) {
      // Small delay to ensure iframe is loaded
      const timer = setTimeout(() => {
        startTracking();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [content, iframeRef, autoStart, startTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    startTracking,
    stopTracking,
    getCurrentProgress,
    setProgress,
    isTracking: isTracking(),
    progress: progressRef.current,
    duration: durationRef.current
  };
};

export default useIframeProgress; 