import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Loader } from './Loader';
import StreamingServiceToggler from './StreamingServiceToggler';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { initializeEnhancedStreaming } from '../services/enhancedStreamingService';

const StreamingPlayer = ({ 
  streamingUrl, 
  title, 
  isOpen, 
  onClose, 
  onError,
  content,
  currentService,
  onServiceChange
}) => {
  // 🚀 FIXED: Add mounted ref to prevent state updates on unmounted components
  const isMountedRef = useRef(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [portalContainer, setPortalContainer] = useState(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);
  const initialOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  const [isOffline, setIsOffline] = useState(initialOffline);
  
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
  
  const { startWatchingMovie, startWatchingEpisode, updateProgress } = useViewingProgress();
  const latestContentRef = useRef(null);

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
  }, [content]);
  
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

  // Create portal container for the modal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let container = document.getElementById('streaming-player-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'streaming-player-portal';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      if (container && container.parentNode) {
        try {
          if (container.parentNode.contains(container)) {
            const attemptRemoval = () => {
              try {
                if (container.parentNode && container.parentNode.contains(container)) {
                  container.parentNode.removeChild(container);
                }
              } catch (removeError) {
                console.warn('[StreamingPlayer] Failed to remove portal container:', removeError);
              }
            };

            if (container.childElementCount === 0) {
              attemptRemoval();
            } else {
              const observer = new MutationObserver(() => {
                if (container.childElementCount === 0) {
                  observer.disconnect();
                  attemptRemoval();
                }
              });
              observer.observe(container, { childList: true });

              const timeoutId = window.setTimeout(() => {
                if (container.childElementCount === 0) {
                  observer.disconnect();
                  attemptRemoval();
                } else {
                  observer.disconnect();
                }
              }, 1000);

              const clearOnUnload = () => window.clearTimeout(timeoutId);
              window.addEventListener('beforeunload', clearOnUnload, { once: true });
            }
          }
        } catch (error) {
          console.warn('[StreamingPlayer] Cleanup error during portal removal:', error);
        }
      }
    };
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
      setCurrentProgress(0);
      setTotalDuration(0);
      setIsPlaying(false);
      setLastProgressUpdate(0);
    } else {
      // Save final progress when player closes
      saveProgress();
      stopProgressTracking();
    }
  }, [isOpen]); // Removed streamingUrl dependency to prevent unnecessary re-renders

  // Start progress tracking after modal opens and all functions are defined
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (isOpen && content) {
      // Start tracking progress when player opens
      startProgressTracking();
    }
  }, [isOpen, content]); // Removed startProgressTracking dependency to break circular dependency

  // Performance-optimized progress update with throttling
  const updateProgressState = useCallback((progress, duration, currentTime) => {
    const now = Date.now();
    
    // Enhanced throttling: only update if progress changed significantly OR time threshold reached
    const progressThreshold = 1; // 1% change threshold
    const timeThreshold = 30000; // 30 seconds
    const hasSignificantProgressChange = Math.abs(progress - currentProgress) > progressThreshold;
    const hasTimeThresholdReached = now - lastProgressUpdate > timeThreshold;
    
    if (hasSignificantProgressChange || hasTimeThresholdReached) {
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setCurrentProgress(progress);
          setTotalDuration(duration);
          setLastProgressUpdate(now);
        }
      });
      
      // Log progress updates (throttled to reduce console spam)
      if (hasSignificantProgressChange || timeUpdateCountRef.current % 10 === 0) {
        console.log('✅ Updating progress state:', { 
          progress: progress.toFixed(1) + '%', 
          duration, 
          currentTime,
          previousProgress: currentProgress.toFixed(1) + '%',
          reason: hasSignificantProgressChange ? 'progress_change' : 'time_threshold'
        });
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
      } else {
        console.warn('⚠️ No content available for progress update');
      }
    }
  }, []); // Removed dependencies to prevent re-renders during playback

  // Progress tracking functions - moved here after all dependencies are defined
  const startProgressTracking = useCallback(() => {
    if (!content) return;

    console.log('🎬 Starting progress tracking for:', content);

    // Start watching the content
    if (content.type === 'movie') {
      startWatchingMovie(content);
    } else if (content.type === 'tv' && content.season && content.episode) {
      startWatchingEpisode(content, content.season, content.episode);
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
            
            // Throttle timeupdate events to reduce spam and improve performance
            const now = Date.now();
            timeUpdateCountRef.current++;
            
            // Only process timeupdate events every 2 seconds to reduce excessive updates
            if (now - lastTimeUpdateRef.current > 2000) {
              // Only log every 20th processed timeupdate event to reduce console spam
              if (timeUpdateCountRef.current % 20 === 0) {
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
            console.log('📊 Parsed direct data format:', progressData);
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

    // Strategy 2: Monitor URL changes for timestamp parameters
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
              console.log(`⏰ Found timestamp in URL parameter '${param}':`, timestamp);
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
    urlCheckIntervalRef.current = setInterval(checkUrlForTimestamp, 5000);

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

      console.log('🔍 Checking localStorage for progress keys:', progressKeys);

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
              
              console.log(`📦 Found progress in localStorage key '${key}':`, { timestamp, duration, progress });
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
            console.log(`📦 Found timestamp in localStorage key '${key}':`, { timestamp, progress });
            updateProgressState(progress, duration, timestamp);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('Error checking localStorage for progress:', error);
    }

    // Strategy 4: Periodic progress updates (fallback)
    // Create periodic checking inline
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    progressIntervalRef.current = setInterval(() => {
      // Try to get progress from iframe using postMessage
      if (iframeRef.current) {
        try {
          // Send message to iframe requesting progress
          iframeRef.current.contentWindow?.postMessage({
            type: 'GET_PROGRESS',
            action: 'getProgress'
          }, '*');
        } catch (error) {
          console.warn('Error requesting progress from iframe:', error);
        }
      }
    }, 10000);
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

  // Stall detection and auto-recovery
  const startStallDetection = useCallback(() => {
    // Clear existing interval if any
    if (stallCheckIntervalRef.current) {
      clearInterval(stallCheckIntervalRef.current);
      stallCheckIntervalRef.current = null;
    }

    stallCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceUpdate = now - lastProgressUpdate;
      const isHidden = typeof document !== 'undefined' ? document.hidden : false;
      // If no updates for > 120s while visible and online, attempt recovery
      if (!isHidden && !isOffline && isOpen && !isLoading && timeSinceUpdate > 120000) {
        // Inline recovery logic to avoid circular dependency
        const recoveryNow = Date.now();
        if (recoveryNow - lastRecoveryAtRef.current < 45000) {
          console.log(`⏳ Recovery attempt skipped (too soon): stall`);
          return;
        }
        if (reloadAttemptsRef.current >= 3) {
          console.log(`🚫 Max recovery attempts reached (${reloadAttemptsRef.current}/3): stall`);
          return;
        }
        if (reconnectingRef.current) {
          console.log(`⏳ Recovery skipped (already reconnecting): stall`);
          return;
        }
        lastRecoveryAtRef.current = recoveryNow;
        reloadAttemptsRef.current += 1;
        console.log(`🔁 Attempting recovery (stall), attempt #${reloadAttemptsRef.current}/3`);
        
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
          
          console.log(`🔄 Reloading iframe with resume URL (${seconds.toFixed(0)}s)`);
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
    }, 30000);
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

  // Online/Offline handlers
  const handleOnline = useCallback(() => {
    console.log('🌐 Network connection restored');
    setIsOffline(false);
    
    // Give network a moment to stabilize before attempting recovery
    if (isOpen && !reconnectingRef.current) {
      setTimeout(() => {
        if (isOpen && !reconnectingRef.current) {
          // Inline recovery logic to avoid circular dependency
          const recoveryNow = Date.now();
          if (recoveryNow - lastRecoveryAtRef.current < 45000) {
            console.log(`⏳ Recovery attempt skipped (too soon): online`);
            return;
          }
          if (reloadAttemptsRef.current >= 3) {
            console.log(`🚫 Max recovery attempts reached (${reloadAttemptsRef.current}/3): online`);
            return;
          }
          if (reconnectingRef.current) {
            console.log(`⏳ Recovery skipped (already reconnecting): online`);
            return;
          }
          lastRecoveryAtRef.current = recoveryNow;
          reloadAttemptsRef.current += 1;
          console.log(`🔁 Attempting recovery (online), attempt #${reloadAttemptsRef.current}/3`);
          
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
            
            console.log(`🔄 Reloading iframe with resume URL (${seconds.toFixed(0)}s)`);
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
      }, 2000);
    }
  }, []); // Removed dependencies to prevent re-renders during playback

  const handleOffline = useCallback(() => {
    console.log('📡 Network connection lost');
    setIsOffline(true);
  }, []);

  // Visibility throttling
  const handleVisibilityChange = useCallback(() => {
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
        // Create a simple periodic check when visible
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
        }, 10000);
      }
      if (!urlCheckIntervalRef.current) {
        // Create a simple URL check when visible
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
        urlCheckIntervalRef.current = setInterval(checkUrlForTimestamp, 5000);
      }
      // If we were offline recently, try a gentle recovery
      if (!isOffline && !reconnectingRef.current) {
        // Inline recovery logic to avoid circular dependency
        const recoveryNow = Date.now();
        if (recoveryNow - lastRecoveryAtRef.current < 45000) {
          console.log(`⏳ Recovery attempt skipped (too soon): visible`);
          return;
        }
        if (reloadAttemptsRef.current >= 3) {
          console.log(`🚫 Max recovery attempts reached (${reloadAttemptsRef.current}/3): visible`);
          return;
        }
        if (reconnectingRef.current) {
          console.log(`⏳ Recovery skipped (already reconnecting): visible`);
          return;
        }
        lastRecoveryAtRef.current = recoveryNow;
        reloadAttemptsRef.current += 1;
        console.log(`🔁 Attempting recovery (visible), attempt #${reloadAttemptsRef.current}/3`);
        
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
          
          console.log(`🔄 Reloading iframe with resume URL (${seconds.toFixed(0)}s)`);
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
    }
  }, []); // Removed dependencies to prevent re-renders during playback

  const saveProgress = useCallback(() => {
    try {
      const latestContent = latestContentRef.current;
      if (currentProgress > 0 && latestContent) {
        console.log('💾 Saving final progress:', { 
          content: latestContent.title || latestContent.name, 
          progress: currentProgress.toFixed(1) + '%',
          totalTimeUpdates: timeUpdateCountRef.current
        });
        
        // Progress is already being saved by updateProgressState
        // This is just for logging the final save
      }
    } catch (error) {
      console.warn('⚠️ Error saving progress:', error);
    }
  }, []); // Removed dependencies to prevent re-renders during playback

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    console.log('🎬 Iframe loaded, starting progress tracking...');
    
    // Reset recovery state
    reconnectingRef.current = false;
    reloadAttemptsRef.current = 0;
    
    // Start progress tracking after iframe loads with a small delay to ensure iframe is fully loaded
    const initTimeout = setTimeout(() => {
      if (isOpen && content) { // Only start if still open and has content
        console.log('🎬 Starting progress tracking with content:', content);
        startProgressTracking();
      }
    }, 1000);
    
    // Cleanup timeout if component unmounts
    return () => clearTimeout(initTimeout);
  }, [isOpen, content]); // Removed startProgressTracking dependency

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    if (onError) {
      onError('Failed to load streaming content');
    }
  }, [onError]);

  const handleClose = useCallback(() => {
    // Save progress before closing
    saveProgress();
    stopProgressTracking();
    
    setIsLoading(true);
    setHasError(false);
    onClose();
  }, [onClose]); // Removed function dependencies to prevent re-renders during playback

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  }, [isOpen, handleClose]); // Keep essential dependencies

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Initialize enhanced streaming (network/perf monitoring)
      try { initializeEnhancedStreaming(); } catch (e) {}
      
      // Performance monitoring
      if (typeof window !== 'undefined' && window.performance) {
        const perfObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name.includes('streaming')) {
              console.log('📊 Performance measure:', entry.name, entry.duration);
            }
          }
        });
        
        try {
          perfObserver.observe({ entryTypes: ['measure'] });
        } catch (e) {
          console.warn('Performance observer not supported:', e);
        }
      }
      
      // Attach network and visibility listeners
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Save progress on page unload
      const beforeUnloadHandler = () => {
        try { saveProgress(); } catch (e) {}
      };
      window.addEventListener('beforeunload', beforeUnloadHandler);
      
      // Start stall detection
      startStallDetection();
      
      return () => {
        // Clean up all listeners when component unmounts or modal closes
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        stopProgressTracking();
        
        // Clean up performance observer
        if (typeof window !== 'undefined' && window.performance) {
          try {
            const perfObserver = new PerformanceObserver(() => {});
            perfObserver.disconnect();
          } catch (e) {
            // Performance observer cleanup failed
          }
        }
      };
    }

    return () => {
      // Clean up when component unmounts
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopProgressTracking();
    };
  }, [isOpen]); // Removed function dependencies to prevent re-renders during playback

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
    };
  }, []);

  const handleClickOutside = useCallback((e) => {
    if (e.target.classList.contains('streaming-player-overlay')) {
      handleClose();
    }
  }, [handleClose]); // Keep essential dependency

  // Optimize embedUrl generation to prevent unnecessary re-renders
  const embedUrl = useMemo(() => {
    return streamingUrl ? `${streamingUrl}?embed=1` : null;
  }, [streamingUrl]);

  // Don't render if portal container is not ready or in SSR
  if (typeof window === 'undefined' || !portalContainer) {
    return null;
  }

  const overlayContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="streaming-player-overlay fixed inset-0 bg-black/95 flex items-center justify-center z-[99999999999] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={handleClickOutside}
        >
          <motion.div
            className="relative w-full max-w-7xl h-[90vh] bg-black rounded-2xl shadow-2xl overflow-hidden z-[99999999999]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Moved to top of modal */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-[99999999999] p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200"
              aria-label="Close streaming player"
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
            <div className="absolute top-4 left-4 z-[99999999999] flex items-center justify-start">
              {/* Service Toggler */}
              <StreamingServiceToggler
                content={content}
                currentService={currentService}
                onServiceChange={onServiceChange}
                className="flex-shrink-0"
              />
            </div>

            {/* Player Container */}
            <div className="relative w-full h-full">

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
                <div className="relative w-full h-full">
                  {isOffline && (
                    <div className="absolute inset-0 z-[999999] flex items-center justify-center bg-black/60">
                      <div className="text-center text-white">
                        <p className="mb-3">You are offline. Playback will resume when connection returns.</p>
                        <button
                          onClick={() => {
                            // Inline recovery logic to avoid circular dependency
                            const recoveryNow = Date.now();
                            if (recoveryNow - lastRecoveryAtRef.current < 45000) {
                              console.log(`⏳ Recovery attempt skipped (too soon): manual`);
                              return;
                            }
                            if (reloadAttemptsRef.current >= 3) {
                              console.log(`🚫 Max recovery attempts reached (${reloadAttemptsRef.current}/3): manual`);
                              return;
                            }
                            if (reconnectingRef.current) {
                              console.log(`⏳ Recovery skipped (already reconnecting): manual`);
                              return;
                            }
                            lastRecoveryAtRef.current = recoveryNow;
                            reloadAttemptsRef.current += 1;
                            console.log(`🔁 Attempting recovery (manual), attempt #${reloadAttemptsRef.current}/3`);
                            
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
                              
                              console.log(`🔄 Reloading iframe with resume URL (${seconds.toFixed(0)}s)`);
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
                    src={embedUrl}
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
                      minWidth: '100%'
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

  return createPortal(overlayContent, portalContainer);
};

export default StreamingPlayer; 