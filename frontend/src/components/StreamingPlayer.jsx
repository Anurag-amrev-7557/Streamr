import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Loader } from './Loader';
import StreamingServiceToggler from './StreamingServiceToggler';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { initializeEnhancedStreaming } from '../services/enhancedStreamingService';
import { usePortal } from '../hooks/usePortal';
import { PORTAL_CONFIGS, createPortalEventHandlers } from '../utils/portalUtils';
import { scheduleRaf, cancelRaf } from '../utils/throttledRaf';
import PropTypes from 'prop-types';

const StreamingPlayer = ({ 
  streamingUrl = null, 
  title = '', 
  isOpen = false, 
  onClose, 
  onError = null,
  content = null,
  currentService = null,
  onServiceChange = null
}) => {
  // 🚀 FIXED: Add mounted ref to prevent state updates on unmounted components
  const isMountedRef = useRef(true);
  
  // Consolidate state to reduce re-renders
  const [playerState, setPlayerState] = useState({
    isLoading: true,
    hasError: false,
    currentProgress: 0,
    totalDuration: 0,
    isPlaying: false,
    lastProgressUpdate: 0,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false
  });
  
  // Extract state for backward compatibility
  const { 
    isLoading, 
    hasError, 
    currentProgress, 
    totalDuration, 
    isPlaying, 
    lastProgressUpdate, 
    isOffline 
  } = playerState;
  
  // Optimized state setter to reduce unnecessary updates
  const updatePlayerState = useCallback((updates) => {
    if (!isMountedRef.current) return;
    setPlayerState(prev => {
      // Check if any values actually changed
      const hasChanges = Object.keys(updates).some(key => prev[key] !== updates[key]);
      if (!hasChanges) return prev;
      // Sync important refs to keep timers and handlers using latest values
      try {
        if (updates.currentProgress !== undefined) currentProgressRef.current = updates.currentProgress;
        if (updates.totalDuration !== undefined) totalDurationRef.current = updates.totalDuration;
        if (updates.lastProgressUpdate !== undefined) lastProgressUpdateRef.current = updates.lastProgressUpdate;
        if (updates.isPlaying !== undefined) isPlayingRef.current = updates.isPlaying;
        if (updates.isOffline !== undefined) isOfflineRef.current = updates.isOffline;
        if (updates.isLoading !== undefined) isLoadingRef.current = updates.isLoading;
      } catch (e) {
        // Ignore if refs aren't initialized yet
      }

      return { ...prev, ...updates };
    });
  }, []);
  
  // Individual setters for backward compatibility
  const setIsLoading = useCallback((value) => updatePlayerState({ isLoading: value }), [updatePlayerState]);
  const setHasError = useCallback((value) => updatePlayerState({ hasError: value }), [updatePlayerState]);
  const setCurrentProgress = useCallback((value) => updatePlayerState({ currentProgress: value }), [updatePlayerState]);
  const setTotalDuration = useCallback((value) => updatePlayerState({ totalDuration: value }), [updatePlayerState]);
  const setIsPlaying = useCallback((value) => updatePlayerState({ isPlaying: value }), [updatePlayerState]);
  const setLastProgressUpdate = useCallback((value) => updatePlayerState({ lastProgressUpdate: value }), [updatePlayerState]);
  const setIsOffline = useCallback((value) => updatePlayerState({ isOffline: value }), [updatePlayerState]);

  // Enhanced portal management - use stable ID to prevent re-renders
  const portalId = useMemo(() => `streaming-player-${content?.id || 'default'}`, [content?.id]);
  
  // Memoize portal options to prevent infinite re-renders
  const portalOptions = useMemo(() => ({
    ...PORTAL_CONFIGS.STREAMING_PLAYER,
    ...createPortalEventHandlers(portalId, { onClose }),
    priority: 'critical',
    group: 'streaming-players',
    animationType: 'fullscreen',
    analytics: true,
    statePersistence: true,
    theme: 'streaming-player'
  }), [portalId, onClose]);
  
  const {
    container: portalContainer,
    createPortal: createPortalContent,
    isReady: portalReady,
    trackInteraction,
    savePortalState,
    loadPortalState,
    coordinateAnimation,
    analytics
  } = usePortal(portalId, portalOptions);
  
  const iframeRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const messageListenerRef = useRef(null);
  const urlCheckIntervalRef = useRef(null);
  const lastTimeUpdateRef = useRef(0);
  const timeUpdateCountRef = useRef(0);
  const stallCheckIntervalRef = useRef(null);
  const reconnectingRef = useRef(false);
  const reloadAttemptsRef = useRef(0);
  const lastRecoveryAtRef = useRef(0);
  const progressUpdateTimeoutRef = useRef(null);
  const playerRafRef = useRef(null);
  const perfObserverRef = useRef(null);
  const isPlayingRef = useRef(false);
  const idleCallbackRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const isVisibleRef = useRef(true);
  const connectionQualityRef = useRef('good'); // 'good', 'moderate', 'poor'
  const lastQualityCheckRef = useRef(0);
  const bufferHealthRef = useRef('healthy'); // 'healthy', 'warning', 'critical'
  const stallCountRef = useRef(0);
  const lastBufferCheckRef = useRef(0);
  const progressWorkerRef = useRef(null);
  const workerReadyRef = useRef(false);
  const totalDurationRef = useRef(0);
  const isOfflineRef = useRef(playerState.isOffline);
  const isLoadingRef = useRef(playerState.isLoading);
  const iframeInitTimeoutRef = useRef(null);
  
  // Initialize WebWorker for heavy calculations
  useEffect(() => {
    // Only initialize worker in browser environment
    if (typeof Worker === 'undefined') return;
    
    try {
      // Create worker from separate file
      const workerPath = '/src/workers/progressWorker.js';
      progressWorkerRef.current = new Worker(workerPath, { type: 'module' });
      
      // Handle messages from worker
      progressWorkerRef.current.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'WORKER_READY':
            workerReadyRef.current = true;
            if (process.env.NODE_ENV === 'development') {
              console.log('🧑‍💼 Progress worker initialized');
            }
            break;
            
          case 'PROGRESS_RESULT':
            // Handle progress calculation results
            if (process.env.NODE_ENV === 'development' && data.playbackRate !== 1.0) {
              console.log('📊 Playback rate:', data.playbackRate);
            }
            break;
            
          case 'PERFORMANCE_RESULT':
            // Handle performance analysis results
            if (process.env.NODE_ENV === 'development') {
              console.log('📈 Performance metrics:', data.metrics);
              if (data.recommendations.length > 0) {
                console.log('💡 Recommendations:', data.recommendations);
              }
            }
            break;
            
          case 'BUFFER_PREDICTION':
            // Update buffer health based on prediction
            if (data.prediction !== bufferHealthRef.current) {
              bufferHealthRef.current = data.prediction;
              if (process.env.NODE_ENV === 'development') {
                console.log('🔮 Buffer prediction:', data.prediction, `(${(data.confidence * 100).toFixed(0)}% confident)`);
              }
            }
            break;
            
          case 'QUALITY_RESULT':
            // Log quality recommendations
            if (process.env.NODE_ENV === 'development') {
              console.log('🎯 Recommended quality:', data.recommendedQuality, `(${data.reason})`);
            }
            break;
            
          case 'ERROR':
            console.error('Worker error:', data.message);
            break;
        }
      });
      
      // Handle worker errors
      progressWorkerRef.current.addEventListener('error', (error) => {
        console.error('Progress worker error:', error);
        workerReadyRef.current = false;
      });
      
    } catch (error) {
      console.warn('Failed to initialize progress worker:', error);
    }
    
    return () => {
      // Terminate worker on cleanup
      if (progressWorkerRef.current) {
        progressWorkerRef.current.terminate();
        progressWorkerRef.current = null;
        workerReadyRef.current = false;
      }
    };
  }, []);
  
  const { startWatchingMovie, startWatchingEpisode, updateProgress } = useViewingProgress();
  const latestContentRef = useRef(null);
  const currentServiceRef = useRef(currentService);
  const currentProgressRef = useRef(0);
  const lastProgressUpdateRef = useRef(0);
  const progressTrackingStartedRef = useRef(false);

  // Keep a ref to the latest content to avoid stale closures in listeners
  // Use weak reference pattern for better memory management
  useEffect(() => {
    if (content) {
      latestContentRef.current = content;
    }
    
    return () => {
      // Clear reference on unmount to prevent memory leaks
      latestContentRef.current = null;
    };
  }, [content?.id]); // Only depend on content ID to prevent unnecessary updates

  // Keep a ref to the current service to avoid stale closures
  useEffect(() => {
    currentServiceRef.current = currentService;
  }, [currentService]);

  // Connection quality monitoring
  const checkConnectionQuality = useCallback(() => {
    const now = Date.now();
    // Only check every 30 seconds to avoid overhead
    if (now - lastQualityCheckRef.current < 30000) return;
    lastQualityCheckRef.current = now;
    
    if (typeof navigator === 'undefined' || !navigator.connection) return;
    
    const connection = navigator.connection;
    const downlink = connection.downlink; // Mbps
    const rtt = connection.rtt; // Round trip time in ms
    const effectiveType = connection.effectiveType;
    
    let quality = 'good';
    
    // Determine quality based on multiple factors
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1 || rtt > 500) {
      quality = 'poor';
    } else if (effectiveType === '3g' || downlink < 5 || rtt > 200) {
      quality = 'moderate';
    }
    
    const previousQuality = connectionQualityRef.current;
    connectionQualityRef.current = quality;
    
    // Log quality changes
    if (previousQuality !== quality && process.env.NODE_ENV === 'development') {
      console.log('🌐 Connection quality changed:', {
        from: previousQuality,
        to: quality,
        downlink: downlink + ' Mbps',
        rtt: rtt + ' ms',
        effectiveType
      });
    }
    
    return quality;
  }, []);

  // Buffer health monitoring for proactive quality adjustment
  const checkBufferHealth = useCallback(() => {
    const now = Date.now();
    // Check every 10 seconds
    if (now - lastBufferCheckRef.current < 10000) return;
    lastBufferCheckRef.current = now;
    
    // Monitor stall frequency
    const recentStalls = stallCountRef.current;
    let bufferHealth = 'healthy';
    
    if (recentStalls > 5) {
      bufferHealth = 'critical';
    } else if (recentStalls > 2) {
      bufferHealth = 'warning';
    }
    
    const previousHealth = bufferHealthRef.current;
    bufferHealthRef.current = bufferHealth;
    
    if (previousHealth !== bufferHealth && process.env.NODE_ENV === 'development') {
      console.log('📊 Buffer health changed:', {
        from: previousHealth,
        to: bufferHealth,
        stallCount: recentStalls
      });
    }
    
    // Reset stall count every minute to avoid accumulation
    if (now % 60000 < 10000) {
      stallCountRef.current = Math.floor(stallCountRef.current / 2);
    }
    
    return bufferHealth;
  }, []);

  // Note: Refs are updated directly in updateProgressState to avoid circular dependencies
  
  // 🚀 FIXED: Enhanced cleanup on unmount with proper mounted ref management
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      // Mark as unmounted first to prevent any new operations
      isMountedRef.current = false;
      
      // Clear all intervals and timeouts
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (urlCheckIntervalRef.current) {
        clearInterval(urlCheckIntervalRef.current);
        urlCheckIntervalRef.current = null;
      }
      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current);
        progressUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  // Portal cleanup is now handled by the usePortal hook

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (isOpen) {
      // Batch reset all state at once
      updatePlayerState({
        isLoading: true,
        hasError: false,
        currentProgress: 0,
        totalDuration: 0,
        isPlaying: false,
        lastProgressUpdate: 0
      });
      
      // Track player opening - use refs to avoid dependency issues
      const currentContent = latestContentRef.current;
      if (trackInteraction && currentContent) {
        trackInteraction('player_opened', {
          contentId: currentContent.id,
          title: currentContent.title || currentContent.name,
          service: currentServiceRef.current
        });
      }
      
      // Coordinate animations
      if (coordinateAnimation) {
        coordinateAnimation('fullscreen');
      }
      
      // Load saved state
      if (loadPortalState) {
        const savedState = loadPortalState();
        if (savedState && savedState.progress) {
          setCurrentProgress(savedState.progress);
          if (process.env.NODE_ENV === 'development') {
            console.debug('[StreamingPlayer] Loaded saved progress:', savedState.progress);
          }
        }
      }
    } else {
      // Save final progress when player closes - use refs to avoid dependency issues
      const currentContent = latestContentRef.current;
      saveProgress();
      stopProgressTracking();
      
      // Track player closing
      if (trackInteraction && currentContent) {
        trackInteraction('player_closed', {
          contentId: currentContent.id,
          finalProgress: currentProgress,
          totalDuration: totalDuration
        });
      }
      
      // Save state
      if (savePortalState && currentContent) {
        savePortalState({
          progress: currentProgress,
          totalDuration: totalDuration,
          isPlaying: isPlaying,
          lastWatched: Date.now(),
          contentId: currentContent.id
        });
      }
    }
  }, [isOpen]); // Only depend on isOpen to prevent infinite re-renders

  // Start progress tracking after modal opens and all functions are defined
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const currentContent = latestContentRef.current;
    if (isOpen && currentContent && !progressTrackingStartedRef.current) {
      // Start tracking progress when player opens
      progressTrackingStartedRef.current = true;
      startProgressTracking();
    } else if (!isOpen) {
      // Reset tracking flag when modal closes
      progressTrackingStartedRef.current = false;
    }
  }, [isOpen]); // Only depend on isOpen to prevent infinite re-renders

  // Performance-optimized progress update with throttling
  const updateProgressState = useCallback((progress, duration, currentTime) => {
    const now = Date.now();
    
    // Enhanced throttling: only update if progress changed significantly OR time threshold reached (less aggressive)
    const progressThreshold = 2; // Increased from 1% to 2% to reduce updates
    const timeThreshold = 60000; // Increased from 30s to 60s to reduce updates
    const hasSignificantProgressChange = Math.abs(progress - currentProgressRef.current) > progressThreshold;
    const hasTimeThresholdReached = now - lastProgressUpdateRef.current > timeThreshold;
    
    if (hasSignificantProgressChange || hasTimeThresholdReached) {
      // Capture previous progress then update refs immediately
        const previousProgress = currentProgressRef.current;
        currentProgressRef.current = progress;
        lastProgressUpdateRef.current = now;
      
      // Use centralized, throttled scheduler for smoother UI updates and visibility-aware gating
      // Cancel any previous RAF scheduled for player updates
      // Cancel any previous RAF scheduled for player updates
      if (playerRafRef.current) {
        try { cancelRaf(playerRafRef.current); } catch (_) {}
        playerRafRef.current = null;
      }

      // Gate heavy UI updates to only happen when tab is visible and playback likely ongoing
      const isHidden = typeof document !== 'undefined' ? document.hidden : false;
      if (!isHidden && isPlayingRef.current) {
        playerRafRef.current = scheduleRaf(() => {
          if (isMountedRef.current) {
            // Batch state updates to reduce re-renders
            updatePlayerState({
              currentProgress: progress,
              totalDuration: duration,
              lastProgressUpdate: now
            });
          }
        });
      } else {
        // Defer light update for when not visible or not playing
        if (isMountedRef.current) {
          // Batch state updates
          updatePlayerState({
            currentProgress: progress,
            totalDuration: duration,
            lastProgressUpdate: now
          });
        }
      }
      // If scheduling was skipped due to visibility, ensure a one-time fallback
      if (!playerRafRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            // Batch state updates
            updatePlayerState({
              currentProgress: progress,
              totalDuration: duration,
              lastProgressUpdate: now
            });
          }
        }, 50);
      }
      
      // Log progress updates (throttled to reduce console spam)
      if (hasSignificantProgressChange || timeUpdateCountRef.current % 10 === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Updating progress state:', { 
            progress: progress.toFixed(1) + '%', 
            duration, 
            currentTime,
            previousProgress: (typeof previousProgress === 'number' ? previousProgress.toFixed(1) + '%' : '0%'),
            reason: hasSignificantProgressChange ? 'progress_change' : 'time_threshold'
          });
        }
      }
      
      // Update progress in context using latest content ref (debounced)
      const latestContent = latestContentRef.current;
  if (latestContent) {
        // Debounce context updates to reduce excessive calls
        if (!progressUpdateTimeoutRef.current) {
          progressUpdateTimeoutRef.current = setTimeout(() => {
            try {
              if (latestContent.type === 'movie') {
                updateProgress(latestContent.id, 'movie', null, null, progress);
              } else if (latestContent.type === 'tv') {
                // Validate that we have season and episode data
                if (!latestContent.season || !latestContent.episode) {
                  console.warn('⚠️ StreamingPlayer: Cannot update TV progress - missing season or episode data', {
                    content: latestContent,
                    season: latestContent.season,
                    episode: latestContent.episode
                  });
                  return;
                }
                
                updateProgress(
                  latestContent.id,
                  'tv',
                  latestContent.season,
                  latestContent.episode,
                  progress
                );
              }
            } catch (error) {
              console.warn('Error updating progress in context:', error);
            }
            progressUpdateTimeoutRef.current = null;
          }, 1000); // 1 second debounce
        }
        
        // Use requestIdleCallback for non-critical analytics updates
        if (typeof requestIdleCallback !== 'undefined') {
          // Cancel previous idle callback if exists
          if (idleCallbackRef.current) {
            try { cancelIdleCallback(idleCallbackRef.current); } catch (_) {}
          }
          
          idleCallbackRef.current = requestIdleCallback(
            () => {
              // Check connection quality during idle time
              checkConnectionQuality();
              
              // Offload heavy calculations to WebWorker if available
              if (workerReadyRef.current && progressWorkerRef.current) {
                // Send progress data to worker for analysis
                progressWorkerRef.current.postMessage({
                  type: 'CALCULATE_PROGRESS',
                  data: {
                    currentTime,
                    duration,
                    timestamp: Date.now()
                  }
                });
                
                // Request performance analysis
                progressWorkerRef.current.postMessage({
                  type: 'ANALYZE_PERFORMANCE',
                  data: {
                    eventType: hasSignificantProgressChange ? 'progress' : 'update',
                    eventData: { progress, duration, currentTime }
                  }
                });
                
                // Request quality calculation if network info available
                if (typeof navigator !== 'undefined' && navigator.connection) {
                  const conn = navigator.connection;
                  progressWorkerRef.current.postMessage({
                    type: 'CALCULATE_QUALITY',
                    data: {
                      downlink: conn.downlink || 0,
                      rtt: conn.rtt || 0,
                      effectiveType: conn.effectiveType || '4g',
                      saveData: conn.saveData || false
                    }
                  });
                }
              }
              
              // Log analytics data during idle time
              if (analytics && hasSignificantProgressChange) {
                try {
                  analytics.trackEvent('progress_update', {
                    contentId: latestContent.id,
                    progress: progress.toFixed(1),
                    connectionQuality: connectionQualityRef.current,
                    isVisible: isVisibleRef.current,
                    bufferHealth: bufferHealthRef.current
                  });
                } catch (e) {
                  // Silent fail for analytics
                }
              }
            },
            { timeout: 3000 } // Execute within 3s even if not idle
          );
        }
      } else {
        console.warn('⚠️ No content available for progress update');
      }
    }
  }, []); // Keep empty dependencies to prevent re-renders during playback

  // Progress tracking functions - moved here after all dependencies are defined
  const startProgressTracking = useCallback(() => {
    const currentContent = latestContentRef.current;
    if (!currentContent) return;
    // Initialize last progress update timestamp to now to avoid false-positive stall detection
    // when no postMessage/timeupdate has been received yet from some streaming servers.
    lastProgressUpdateRef.current = Date.now();

  if (process.env.NODE_ENV === 'development') console.log('🎬 Starting progress tracking for:', currentContent);

    // Start watching the content
    if (currentContent.type === 'movie') {
      startWatchingMovie(currentContent);
    } else if (currentContent.type === 'tv' && currentContent.season && currentContent.episode) {
      startWatchingEpisode(currentContent, currentContent.season, currentContent.episode);
    }

    // Strategy 1: Listen for postMessage events from iframe
    // Create the message listener inline to avoid initialization order issues
    const handleMessage = (event) => {
      // Only accept messages from our streaming domains
      const allowedDomains = [
        '111movies.com',
        'player.videasy.net',
        'vidjoy.pro',
        'vidfast.pro',
        'rivestream.net',
        'cinemaos.tech'
      ];
      
      const origin = event.origin || '';
      const isAllowedDomain = allowedDomains.some(domain => origin.includes(domain));
      
      if (!isAllowedDomain) return;

      try {
        const data = event.data;
        
        // Handle different message formats from streaming services
        if (data && typeof data === 'object') {
          let progressData = null;
          
          // Format 1: Nested event format (like timeupdate)
          if (data.event === 'timeupdate' && data.data) {
            progressData = data.data;
            
            // Throttle timeupdate events to reduce spam and improve performance (less aggressive)
            const now = Date.now();
            timeUpdateCountRef.current++;
            
            // Only process timeupdate events every 5 seconds to reduce excessive updates (increased from 2s)
              if (now - lastTimeUpdateRef.current > 5000) {
              // Only log every 50th processed timeupdate event to reduce console spam (increased from 20th)
              if (timeUpdateCountRef.current % 50 === 0 && process.env.NODE_ENV === 'development') {
                console.log(`📨 Processed timeupdate #${timeUpdateCountRef.current} from iframe`);
              }
              lastTimeUpdateRef.current = now;
            } else {
              // Skip processing this timeupdate event to reduce load
              return;
            }
          }
          // Format 2: Direct data format
          else if (data.currentTime !== undefined || data.progress !== undefined) {
            progressData = data;
            if (process.env.NODE_ENV === 'development') console.log('📊 Parsed direct data format:', progressData);
          }
          
          // Process the progress data
          if (progressData) {
            if (progressData.currentTime !== undefined && progressData.duration !== undefined) {
              const progress = (progressData.currentTime / progressData.duration) * 100;
              updateProgressState(progress, progressData.duration, progressData.currentTime);
            } else if (progressData.progress !== undefined) {
              updateProgressState(progressData.progress, progressData.duration || 0, progressData.currentTime || 0);
            } else if (progressData.time !== undefined) {
              // Some services send just current time
              const progress = progressData.duration ? (progressData.time / progressData.duration) * 100 : 0;
              updateProgressState(progress, progressData.duration || 0, progressData.time);
            }
          }
          
          // Handle playing state
          if (data.playing !== undefined) {
            setIsPlaying(data.playing);
            isPlayingRef.current = !!data.playing;
          }
        }
      } catch (error) {
        console.warn('Error processing postMessage:', error);
      }
    };

    // Remove existing listener if any
    if (messageListenerRef.current) {
      window.removeEventListener('message', messageListenerRef.current);
    }
    messageListenerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);

  // Strategy 2: Monitor URL changes for timestamp parameters (less frequent)
    // Create URL monitoring inline
    const checkUrlForTimestamp = () => {
      if (!iframeRef.current) return;

      try {
        const iframe = iframeRef.current;
        const currentSrc = iframe.src;
        
        if (!currentSrc) return;

        const url = new URL(currentSrc);
        
        // Common timestamp parameters used by streaming services
        const timestampParams = ['t', 'time', 'start', 'position', 'seek', 'timestamp'];
        
        for (const param of timestampParams) {
          const value = url.searchParams.get(param);
          if (value) {
            const timestamp = parseFloat(value);
            if (!isNaN(timestamp) && timestamp > 0) {
              if (process.env.NODE_ENV === 'development') console.log(`⏰ Found timestamp in URL parameter '${param}':`, timestamp);
              // Estimate progress based on timestamp (assuming average movie length)
              const estimatedDuration = 7200; // 2 hours in seconds
              const progress = Math.min((timestamp / estimatedDuration) * 100, 100);
              updateProgressState(progress, estimatedDuration, timestamp);
              break;
            }
          }
        }
      } catch (error) {
        console.warn('Error checking URL for timestamp:', error);
      }
    };

    // Clear existing interval if any
    if (urlCheckIntervalRef.current) {
      clearInterval(urlCheckIntervalRef.current);
      urlCheckIntervalRef.current = null;
    }
    checkUrlForTimestamp();
    // Reduce URL check frequency to every 15s to lower CPU when idle
    urlCheckIntervalRef.current = setInterval(checkUrlForTimestamp, 15000);

    // Strategy 3: Check localStorage for saved timestamps
    // Create localStorage checking inline
    try {
      const storageKeys = Object.keys(localStorage);
      const progressKeys = storageKeys.filter(key => 
        key.includes('progress') || 
        key.includes('time') || 
        key.includes('position') ||
        key.includes('watch') ||
        key.includes('video')
      );

  if (process.env.NODE_ENV === 'development') console.log('🔍 Checking localStorage for progress keys:', progressKeys);

      for (const key of progressKeys) {
        let value = null;
        try {
          value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            if (data && (data.currentTime || data.time || data.position)) {
              const timestamp = data.currentTime || data.time || data.position;
              const duration = data.duration || 7200; // Default 2 hours
              const progress = Math.min((timestamp / duration) * 100, 100);
              
              if (process.env.NODE_ENV === 'development') console.log(`📦 Found progress in localStorage key '${key}':`, { timestamp, duration, progress });
              updateProgressState(progress, duration, timestamp);
              break;
            }
          }
        } catch (parseError) {
          // Try parsing as simple number
          const timestamp = parseFloat(value);
          if (!isNaN(timestamp) && timestamp > 0) {
            const duration = 7200; // Default 2 hours
            const progress = Math.min((timestamp / duration) * 100, 100);
            if (process.env.NODE_ENV === 'development') console.log(`📦 Found timestamp in localStorage key '${key}':`, { timestamp, progress });
            updateProgressState(progress, duration, timestamp);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Error checking localStorage for progress:', error);
    }

    // Strategy 4: Periodic progress updates (fallback) - reduced frequency to avoid interference
    // Create periodic checking inline
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    // Only poll for progress when playing or visible; use much longer interval when idle
    const pollInterval = 120000; // Increased from 20s to 2 minutes to be much less intrusive
    progressIntervalRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return; // skip when in background
      if (!isPlayingRef.current) return; // skip when not playing

      if (iframeRef.current) {
        try {
          // Send message to iframe requesting progress (much less frequently)
          iframeRef.current.contentWindow?.postMessage({
            type: 'GET_PROGRESS',
            action: 'getProgress'
          }, '*');
        } catch (error) {
          if (process.env.NODE_ENV === 'development') console.warn('Error requesting progress from iframe:', error);
        }
      }
    }, pollInterval);
  }, []); // Removed dependencies to prevent re-renders during playback

  const stopProgressTracking = useCallback(() => {
    // Clear all intervals and listeners
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (urlCheckIntervalRef.current) {
      clearInterval(urlCheckIntervalRef.current);
      urlCheckIntervalRef.current = null;
    }

    if (stallCheckIntervalRef.current) {
      clearInterval(stallCheckIntervalRef.current);
      stallCheckIntervalRef.current = null;
    }

    if (messageListenerRef.current) {
      window.removeEventListener('message', messageListenerRef.current);
      messageListenerRef.current = null;
    }
    
    // Reset counters
    lastTimeUpdateRef.current = 0;
    timeUpdateCountRef.current = 0;
    
    // Reset recovery state
    reconnectingRef.current = false;
    reloadAttemptsRef.current = 0;
  }, []);

  // Remove the old setupPostMessageListener function since it's now inlined

  // Remove the old setupUrlMonitoring function since it's now inlined

  // Remove the old checkLocalStorageForProgress function since it's now inlined

  // Remove the old startPeriodicProgressCheck function since it's now inlined

  // Stall detection and auto-recovery (made much less aggressive to prevent interruptions)
  const startStallDetection = useCallback(() => {
    // Clear existing interval if any
    if (stallCheckIntervalRef.current) {
      clearInterval(stallCheckIntervalRef.current);
      stallCheckIntervalRef.current = null;
    }

  // Much less aggressive stall detection: check every 5 minutes, threshold of 20 minutes
  stallCheckIntervalRef.current = setInterval(() => {
    const now = Date.now();
    const timeSinceUpdate = now - (lastProgressUpdateRef.current || 0);
    const isHidden = typeof document !== 'undefined' ? document.hidden : false;
      
      // Check buffer health
      checkBufferHealth();
      
      // Only attempt recovery after 20 minutes of no updates while visible and online (much more conservative)
  if (!isHidden && !isOfflineRef.current && isOpen && !isLoadingRef.current && timeSinceUpdate > 1200000) { // 20 minutes
        // Increment stall counter
        stallCountRef.current += 1;
        
        // Inline recovery logic to avoid circular dependency
        const recoveryNow = Date.now();
        if (recoveryNow - lastRecoveryAtRef.current < 300000) { // 5 minute cooldown between recovery attempts
          if (process.env.NODE_ENV === 'development') console.log(`⏳ Recovery attempt skipped (too soon): stall`);
          return;
        }
        if (reloadAttemptsRef.current >= 2) { // Reduced max attempts to 2
          if (process.env.NODE_ENV === 'development') console.log(`🚫 Max recovery attempts reached (${reloadAttemptsRef.current}/2): stall`);
          return;
        }
        if (reconnectingRef.current) {
          if (process.env.NODE_ENV === 'development') console.log(`⏳ Recovery skipped (already reconnecting): stall`);
          return;
        }
        lastRecoveryAtRef.current = recoveryNow;
        reloadAttemptsRef.current += 1;
        if (process.env.NODE_ENV === 'development') console.log(`🔁 Attempting recovery (stall), attempt #${reloadAttemptsRef.current}/2`);
        
        // Inline reload logic
        if (!iframeRef.current || !streamingUrl) {
          console.warn('⚠️ Cannot reload iframe: missing ref or URL');
          return;
        }
        try {
          const seconds = totalDurationRef.current && currentProgressRef.current ? (currentProgressRef.current / 100) * totalDurationRef.current : 0;
          // Inline buildResumeUrl logic to avoid circular dependency
          let resumeUrl = streamingUrl;
          try {
            if (!streamingUrl || typeof streamingUrl !== 'string') {
              console.warn('⚠️ Invalid streaming URL for resume:', streamingUrl);
              return;
            }
            const url = new URL(streamingUrl);
            if (!Number.isNaN(seconds) && seconds > 0 && seconds < 86400) {
              url.searchParams.set('t', Math.floor(seconds));
              url.searchParams.set('start', Math.floor(seconds));
              url.searchParams.set('time', Math.floor(seconds));
            }
            url.searchParams.set('embed', '1');
            resumeUrl = url.toString();
          } catch (urlError) {
            console.warn('⚠️ Error building resume URL:', urlError);
            resumeUrl = streamingUrl;
          }
          
          if (process.env.NODE_ENV === 'development') console.log(`🔄 Reloading iframe with resume URL (${seconds.toFixed(0)}s)`);
          reconnectingRef.current = true;
          iframeRef.current.src = resumeUrl;
          setTimeout(() => {
            reconnectingRef.current = false;
          }, 5000);
        } catch (error) {
          console.error('❌ Failed to reload iframe:', error);
          reconnectingRef.current = false;
        }
      }
    }, 300000); // Check every 5 minutes instead of every 60 seconds
  }, []); // Removed dependencies to prevent re-renders during playback

  const buildResumeUrl = useCallback((baseUrl, seconds) => {
    try {
      if (!baseUrl || typeof baseUrl !== 'string') {
        console.warn('⚠️ Invalid base URL for resume:', baseUrl);
        return baseUrl;
      }
      
      const url = new URL(baseUrl);
      
      // Preserve existing params and add common timestamp params
      if (!Number.isNaN(seconds) && seconds > 0 && seconds < 86400) { // Max 24 hours
        url.searchParams.set('t', Math.floor(seconds));
        url.searchParams.set('start', Math.floor(seconds));
        url.searchParams.set('time', Math.floor(seconds));
      }
      
      url.searchParams.set('embed', '1');
      return url.toString();
    } catch (error) {
      console.warn('⚠️ Error building resume URL:', error);
      return baseUrl;
    }
  }, []);

  // Remove the old attemptRecovery function since it's now inlined

  // Remove the old reloadIframe function since it's now inlined

  // Note: Online/Offline and visibility handlers are now inlined in the main useEffect
  // to prevent circular dependency issues that were causing infinite re-renders

  const saveProgress = useCallback(() => {
    try {
      const latestContent = latestContentRef.current;
      const finalProgress = currentProgressRef.current || 0;
      const finalTotal = totalDurationRef.current || 0;
      if (finalProgress > 0 && latestContent) {
        if (process.env.NODE_ENV === 'development') console.log('💾 Saving final progress:', { 
          content: latestContent.title || latestContent.name, 
          progress: finalProgress.toFixed(1) + '%',
          totalDuration: finalTotal,
          totalTimeUpdates: timeUpdateCountRef.current
        });
        // Progress is already being saved by updateProgressState; this is a final log/backup
      }
    } catch (error) {
      console.warn('⚠️ Error saving progress:', error);
    }
  }, []); // Removed dependencies to prevent re-renders during playback

  const handleIframeLoad = useCallback(() => {
  setIsLoading(false);
  if (process.env.NODE_ENV === 'development') console.log('🎬 Iframe loaded, starting progress tracking...');
    
    // Reset recovery state
    reconnectingRef.current = false;
    reloadAttemptsRef.current = 0;
    
    // Start progress tracking after iframe loads with a small delay to ensure iframe is fully loaded
    if (iframeInitTimeoutRef.current) {
      clearTimeout(iframeInitTimeoutRef.current);
      iframeInitTimeoutRef.current = null;
    }
    // Mark last progress update as now on load to prevent immediate recovery triggers
    lastProgressUpdateRef.current = Date.now();

    iframeInitTimeoutRef.current = setTimeout(() => {
      const currentContent = latestContentRef.current;
      if (isOpen && currentContent) { // Only start if still open and has content
        if (process.env.NODE_ENV === 'development') console.log('🎬 Starting progress tracking with content:', currentContent);
        startProgressTracking();
      }
      iframeInitTimeoutRef.current = null;
    }, 1000);
  }, [isOpen]); // Removed content and startProgressTracking dependencies

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    if (onError) {
      onError('Failed to load streaming content');
    }
  }, [onError]);

  const handleClose = useCallback(() => {
    // Track close interaction - use refs to avoid dependency issues
    const currentContent = latestContentRef.current;
    if (trackInteraction && currentContent) {
      try {
        trackInteraction('close_button_clicked', {
          contentId: currentContent.id,
          progress: currentProgressRef.current || 0,
          totalDuration: totalDurationRef.current || 0,
          method: 'close_button'
        });
      } catch (e) {
        // Analytics should not block close
      }
    }

    // Save progress before closing
    saveProgress();
    stopProgressTracking();

    setIsLoading(true);
    setHasError(false);
    onClose();
  }, [onClose, trackInteraction, saveProgress, stopProgressTracking]); // Use refs for mutable values

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  }, [isOpen, handleClose]); // Keep essential dependencies

  useEffect(() => {
    if (isOpen) {
      // Create stable event handlers to avoid dependency issues
      const escapeHandler = (e) => {
        if (e.key === 'Escape' && isOpen) {
          handleClose();
        }
      };

      const onlineHandler = () => {
  if (process.env.NODE_ENV === 'development') console.log('🌐 Network connection restored');
        setIsOffline(false);
        isOfflineRef.current = false;
        
        // Check connection quality when coming back online
        checkConnectionQuality();
        
        // DISABLED: Automatic iframe reloading on network recovery to prevent interruptions
        // Users can manually retry using the "Try Reconnect Now" button if needed
        // Give network a moment to stabilize but don't auto-reload
        // This prevents interrupting legitimate streaming sessions
      };

      const offlineHandler = () => {
        console.log('📡 Network connection lost');
        setIsOffline(true);
        isOfflineRef.current = true;
        connectionQualityRef.current = 'poor';
      };

      const visibilityHandler = () => {
        if (typeof document === 'undefined') return;
        
        if (document.hidden) {
          // Pause tracking when hidden to save resources
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          if (urlCheckIntervalRef.current) {
            clearInterval(urlCheckIntervalRef.current);
            urlCheckIntervalRef.current = null;
          }
        } else {
          // Resume lightweight tracking when visible again, but only if not already tracking
          if (!progressIntervalRef.current) {
            // Create a simple periodic check when visible (reduced frequency)
            progressIntervalRef.current = setInterval(() => {
              if (iframeRef.current) {
                try {
                  iframeRef.current.contentWindow?.postMessage({
                    type: 'GET_PROGRESS',
                    action: 'getProgress'
                  }, '*');
                } catch (error) {
                  console.warn('Error requesting progress from iframe:', error);
                }
              }
            }, 60000); // Reduced from 10s to 60s to be less intrusive
          }
          if (!urlCheckIntervalRef.current) {
            // Create a simple URL check when visible (reduced frequency)
            const checkUrlForTimestamp = () => {
              if (!iframeRef.current) return;
              try {
                const iframe = iframeRef.current;
                const currentSrc = iframe.src;
                if (!currentSrc) return;
                const url = new URL(currentSrc);
                const timestampParams = ['t', 'time', 'start', 'position', 'seek', 'timestamp'];
                for (const param of timestampParams) {
                  const value = url.searchParams.get(param);
                  if (value) {
                    const timestamp = parseFloat(value);
                    if (!isNaN(timestamp) && timestamp > 0) {
                      const estimatedDuration = 7200;
                      const progress = Math.min((timestamp / estimatedDuration) * 100, 100);
                      updateProgressState(progress, estimatedDuration, timestamp);
                      break;
                    }
                  }
                }
              } catch (error) {
                console.warn('Error checking URL for timestamp:', error);
              }
            };
            checkUrlForTimestamp();
            urlCheckIntervalRef.current = setInterval(checkUrlForTimestamp, 120000); // Reduced from 5s to 2 minutes
          }
          // DISABLED: Don't automatically restart stall detection when tab becomes visible
          // This prevents interrupting streaming sessions when users switch tabs
          // Stall detection will continue running in background if it was already active
          // try {
          //   startStallDetection();
          // } catch (e) {
          //   console.warn('Error restarting stall detection on visibility:', e);
          // }
        }
      };

      const beforeUnloadHandler = () => {
        try { 
          // Inline saveProgress logic to avoid circular dependency
          const latestContent = latestContentRef.current;
          if (currentProgress > 0 && latestContent) {
            console.log('💾 Saving final progress:', { 
              content: latestContent.title || latestContent.name, 
              progress: currentProgress.toFixed(1) + '%',
              totalTimeUpdates: timeUpdateCountRef.current
            });
          }
        } catch (e) {}
      };

      document.addEventListener('keydown', escapeHandler);
      document.body.style.overflow = 'hidden';
      
      // Initialize enhanced streaming (network/perf monitoring)
      try { initializeEnhancedStreaming(); } catch (e) {}
      
      // Performance monitoring (store observer to disconnect later)
      if (typeof window !== 'undefined' && window.performance) {
        try {
          const perfObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'measure' && entry.name.includes('streaming')) {
                if (process.env.NODE_ENV === 'development') console.log('📊 Performance measure:', entry.name, entry.duration);
              }
            }
          });
          perfObserver.observe({ entryTypes: ['measure'] });
          perfObserverRef.current = perfObserver;
        } catch (e) {
          if (process.env.NODE_ENV === 'development') console.warn('Performance observer not supported:', e);
        }
      }
      
      // Attach network and visibility listeners (passive where possible for better performance)
      window.addEventListener('online', onlineHandler, { passive: true });
      window.addEventListener('offline', offlineHandler, { passive: true });
      document.addEventListener('visibilitychange', visibilityHandler, { passive: true });
      window.addEventListener('beforeunload', beforeUnloadHandler);
      
      // Setup IntersectionObserver for better visibility detection
      if (typeof IntersectionObserver !== 'undefined' && iframeRef.current) {
        intersectionObserverRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const wasVisible = isVisibleRef.current;
              isVisibleRef.current = entry.isIntersecting;
              
              // Only log visibility changes
              if (wasVisible !== entry.isIntersecting && process.env.NODE_ENV === 'development') {
                console.log('👁️ Player visibility changed:', entry.isIntersecting ? 'visible' : 'hidden');
              }
              
              // Pause tracking when not visible to save resources
              if (!entry.isIntersecting) {
                // Cancel RAF updates when not visible
                if (playerRafRef.current) {
                  try { cancelRaf(playerRafRef.current); } catch (_) {}
                  playerRafRef.current = null;
                }
              }
            });
          },
          {
            threshold: [0, 0.25, 0.5, 0.75, 1], // Track visibility at multiple thresholds
            rootMargin: '0px'
          }
        );
        
        // Observe the iframe container
        const container = iframeRef.current.parentElement;
        if (container) {
          intersectionObserverRef.current.observe(container);
        }
      }
      
      // Periodic connection quality check (every 30 seconds)
      const qualityCheckInterval = setInterval(() => {
        if (isOpen && !isOfflineRef.current) {
          checkConnectionQuality();
        }
      }, 30000);
      
      // Start stall detection
      startStallDetection();
      
      return () => {
        // Clean up all listeners when component unmounts or modal closes
        document.removeEventListener('keydown', escapeHandler);
        document.body.style.overflow = '';
        window.removeEventListener('online', onlineHandler, { passive: true });
        window.removeEventListener('offline', offlineHandler, { passive: true });
        document.removeEventListener('visibilitychange', visibilityHandler, { passive: true });
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        stopProgressTracking();
        
        // Clean up IntersectionObserver
        if (intersectionObserverRef.current) {
          try {
            intersectionObserverRef.current.disconnect();
            intersectionObserverRef.current = null;
          } catch (e) {
            if (process.env.NODE_ENV === 'development') console.warn('Failed to disconnect IntersectionObserver', e);
          }
        }
        
        // Clean up quality check interval
        if (qualityCheckInterval) {
          clearInterval(qualityCheckInterval);
        }
        
        // Clean up performance observer
        try {
          if (perfObserverRef.current && typeof perfObserverRef.current.disconnect === 'function') {
            perfObserverRef.current.disconnect();
            perfObserverRef.current = null;
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') console.warn('Failed to disconnect perfObserver', e);
        }
      };
    }

    return () => {
      // Clean up when component unmounts
      document.body.style.overflow = '';
      stopProgressTracking();
    };
  }, [isOpen]); // Only depend on isOpen to prevent infinite re-renders

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up all intervals and listeners on unmount
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (urlCheckIntervalRef.current) {
        clearInterval(urlCheckIntervalRef.current);
        urlCheckIntervalRef.current = null;
      }

      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }

      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current);
        messageListenerRef.current = null;
      }
      
      // Reset all refs
      lastTimeUpdateRef.current = 0;
      timeUpdateCountRef.current = 0;
      reconnectingRef.current = false;
      reloadAttemptsRef.current = 0;
      lastRecoveryAtRef.current = 0;
      
      // Clear progress update timeout
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current);
        progressUpdateTimeoutRef.current = null;
      }
      // Cancel any pending RAF scheduled for player updates
      if (playerRafRef.current) {
        try { cancelRaf(playerRafRef.current); } catch (_) {}
        playerRafRef.current = null;
      }
      // Cancel any pending idle callbacks
      if (idleCallbackRef.current && typeof cancelIdleCallback !== 'undefined') {
        try { cancelIdleCallback(idleCallbackRef.current); } catch (_) {}
        idleCallbackRef.current = null;
      }
      // Clear iframe init timeout
      if (iframeInitTimeoutRef.current) {
        clearTimeout(iframeInitTimeoutRef.current);
        iframeInitTimeoutRef.current = null;
      }
    };
  }, []);

  const handleClickOutside = useCallback((e) => {
    if (e.target.classList.contains('streaming-player-overlay')) {
      handleClose();
    }
  }, [handleClose]); // Keep essential dependency

  // Optimize embedUrl generation to prevent unnecessary re-renders
  // Add adaptive quality based on network conditions
  const embedUrl = useMemo(() => {
    if (!streamingUrl) return null;
    
    try {
      const url = new URL(streamingUrl);
      url.searchParams.set('embed', '1');
      
      // Add adaptive quality parameters based on network conditions
      if (typeof navigator !== 'undefined' && navigator.connection) {
        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;
        
        // Adjust quality based on connection speed
        if (effectiveType === '4g') {
          url.searchParams.set('quality', 'auto');
          url.searchParams.set('maxQuality', '1080p');
        } else if (effectiveType === '3g') {
          url.searchParams.set('quality', '720p');
          url.searchParams.set('maxQuality', '720p');
        } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
          url.searchParams.set('quality', '480p');
          url.searchParams.set('maxQuality', '480p');
        }
        
        // Enable save-data mode if user has data saver on
        if (connection.saveData) {
          url.searchParams.set('quality', '360p');
          url.searchParams.set('saveData', '1');
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🌐 Network-adaptive quality:', {
            effectiveType,
            saveData: connection.saveData,
            quality: url.searchParams.get('quality')
          });
        }
      }
      
      // Enable hardware acceleration hints
      url.searchParams.set('hwaccel', '1');
      url.searchParams.set('preload', 'auto');
      
      return url.toString();
    } catch (error) {
      console.warn('Error generating adaptive embedUrl:', error);
      return `${streamingUrl}?embed=1&hwaccel=1`;
    }
  }, [streamingUrl]);

  // Defer setting the iframe src briefly to allow overlay UI to render first (reduces jank)
  const [iframeSrc, setIframeSrc] = useState(null);
  const iframeSrcTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen && embedUrl) {
      // Clear any previous timeout
      if (iframeSrcTimeoutRef.current) {
        clearTimeout(iframeSrcTimeoutRef.current);
        iframeSrcTimeoutRef.current = null;
      }
      // Set a small delay so the modal chrome renders first
      iframeSrcTimeoutRef.current = setTimeout(() => {
        setIframeSrc(embedUrl);
      }, 200);
    } else {
      // Delay clearing src when modal closes to avoid immediate iframe teardown
      // which can cause a visible reset if the modal briefly toggles.
      if (iframeSrcTimeoutRef.current) {
        clearTimeout(iframeSrcTimeoutRef.current);
        iframeSrcTimeoutRef.current = null;
      }
      iframeSrcTimeoutRef.current = setTimeout(() => {
        setIframeSrc(null);
        iframeSrcTimeoutRef.current = null;
      }, 500);
      if (iframeSrcTimeoutRef.current) {
        clearTimeout(iframeSrcTimeoutRef.current);
        iframeSrcTimeoutRef.current = null;
      }
    }

    return () => {
      if (iframeSrcTimeoutRef.current) {
        clearTimeout(iframeSrcTimeoutRef.current);
        iframeSrcTimeoutRef.current = null;
      }
    };
  }, [isOpen, embedUrl]);

  // Don't render if portal container is not ready or in SSR
  if (typeof window === 'undefined' || !portalReady || !portalContainer) {
    return null;
  }

  const overlayContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="streaming-player-overlay fixed inset-0 bg-black/95 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={handleClickOutside}
          style={{ 
            zIndex: 1, 
            pointerEvents: 'auto',
            // GPU acceleration for overlay
            transform: 'translateZ(0)',
            willChange: 'opacity',
            backfaceVisibility: 'hidden',
            contain: 'layout style paint'
          }}
        >
          <motion.div
            className="relative w-full max-w-7xl h-[90vh] bg-black rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              zIndex: 2, 
              pointerEvents: 'auto',
              // GPU acceleration for modal
              transform: 'translateZ(0)',
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              contain: 'layout style paint',
              isolation: 'isolate'
            }}
          >
            {/* Close Button - Moved to top of modal */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200"
              aria-label="Close streaming player"
              style={{ zIndex: 10 }}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Top Controls Bar */}
            <div className="absolute top-4 left-4 flex items-center justify-start" style={{ zIndex: 10 }}>
              {/* Service Toggler */}
              <StreamingServiceToggler
                content={content}
                currentService={currentService}
                onServiceChange={onServiceChange}
                className="flex-shrink-0"
              />
            </div>

            {/* Player Container */}
            <div className="relative w-full h-full" style={{
              // GPU acceleration for the container
              transform: 'translateZ(0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              contain: 'layout style paint'
            }}>

              {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-white text-lg font-semibold mb-2">
                      Streaming Unavailable
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      This content is not available for streaming at the moment.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {embedUrl && !hasError && (
                <div className="relative w-full h-full" style={{
                  // GPU acceleration for video container
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                  contain: 'strict',
                  isolation: 'isolate'
                }}>
                  {isOffline && (
                    <div className="absolute inset-0 z-[999999] flex items-center justify-center bg-black/60">
                      <div className="text-center text-white">
                        <p className="mb-3">You are offline. Playback will resume when connection returns.</p>
                        <button
                          onClick={() => {
                            // Inline recovery logic to avoid circular dependency
                            const recoveryNow = Date.now();
                            if (recoveryNow - lastRecoveryAtRef.current < 45000) {
                              if (process.env.NODE_ENV === 'development') console.log(`⏳ Recovery attempt skipped (too soon): manual`);
                              return;
                            }
                            if (reloadAttemptsRef.current >= 3) {
                              if (process.env.NODE_ENV === 'development') console.log(`🚫 Max recovery attempts reached (${reloadAttemptsRef.current}/3): manual`);
                              return;
                            }
                            if (reconnectingRef.current) {
                              if (process.env.NODE_ENV === 'development') console.log(`⏳ Recovery skipped (already reconnecting): manual`);
                              return;
                            }
                            lastRecoveryAtRef.current = recoveryNow;
                            reloadAttemptsRef.current += 1;
                            if (process.env.NODE_ENV === 'development') console.log(`🔁 Attempting recovery (manual), attempt #${reloadAttemptsRef.current}/3`);
                            
                            // Inline reload logic
                            if (!iframeRef.current || !streamingUrl) {
                              console.warn('⚠️ Cannot reload iframe: missing ref or URL');
                              return;
                            }
                            try {
                              const seconds = totalDuration && currentProgress ? (currentProgress / 100) * totalDuration : 0;
                              // Inline buildResumeUrl logic to avoid circular dependency
                              let resumeUrl = streamingUrl;
                              try {
                                if (!streamingUrl || typeof streamingUrl !== 'string') {
                                  console.warn('⚠️ Invalid streaming URL for resume:', streamingUrl);
                                  return;
                                }
                                const url = new URL(streamingUrl);
                                if (!Number.isNaN(seconds) && seconds > 0 && seconds < 86400) {
                                  url.searchParams.set('t', Math.floor(seconds));
                                  url.searchParams.set('start', Math.floor(seconds));
                                  url.searchParams.set('time', Math.floor(seconds));
                                }
                                url.searchParams.set('embed', '1');
                                resumeUrl = url.toString();
                              } catch (urlError) {
                                console.warn('⚠️ Error building resume URL:', urlError);
                                resumeUrl = streamingUrl;
                              }
                              
                              if (process.env.NODE_ENV === 'development') console.log(`🔄 Reloading iframe with resume URL (${seconds.toFixed(0)}s)`);
                              reconnectingRef.current = true;
                              iframeRef.current.src = resumeUrl;
                              setTimeout(() => {
                                reconnectingRef.current = false;
                              }, 5000);
                            } catch (error) {
                              console.error('❌ Failed to reload iframe:', error);
                              reconnectingRef.current = false;
                            }
                          }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm"
                        >
                          Try Reconnect Now
                        </button>
                      </div>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
                    allowFullScreen
                    loading="eager"
                    importance="high"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    title={`Streaming ${title || 'content'}`}
                    style={{
                      backgroundColor: 'black',
                      minHeight: '100%',
                      minWidth: '100%',
                      // GPU acceleration and hardware decoding optimizations
                      transform: 'translateZ(0)',
                      willChange: 'transform, opacity',
                      backfaceVisibility: 'hidden',
                      WebkitTransform: 'translateZ(0)',
                      WebkitBackfaceVisibility: 'hidden',
                      // CSS containment for better performance
                      contain: 'layout style paint',
                      // Force layer promotion for smoother playback
                      isolation: 'isolate',
                      // Optimize compositing
                      transformStyle: 'preserve-3d',
                      WebkitFontSmoothing: 'subpixel-antialiased',
                      // Reduce repaints and reflows
                      contentVisibility: 'auto'
                    }}
                    // Performance optimizations - removed sandbox to prevent streaming service conflicts
                  />
                  

                </div>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortalContent(overlayContent);
};

// Prop types for better developer ergonomics
StreamingPlayer.propTypes = {
  streamingUrl: PropTypes.string,
  title: PropTypes.string,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onError: PropTypes.func,
  content: PropTypes.object,
  currentService: PropTypes.string,
  onServiceChange: PropTypes.func
};

// NOTE: defaultProps removed for function component; defaults are provided via
// JavaScript default parameters in the function signature above.

// Memoize component to prevent unnecessary re-renders
// Only re-render if essential props change
export default React.memo(StreamingPlayer, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.streamingUrl === nextProps.streamingUrl &&
    prevProps.title === nextProps.title &&
    prevProps.currentService === nextProps.currentService &&
    prevProps.content?.id === nextProps.content?.id &&
    prevProps.content?.season === nextProps.content?.season &&
    prevProps.content?.episode === nextProps.content?.episode
    // Don't compare callbacks (onClose, onError, onServiceChange) as they are stable
  );
}); 