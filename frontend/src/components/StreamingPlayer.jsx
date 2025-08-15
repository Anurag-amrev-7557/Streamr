import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Loader } from './Loader';
import StreamingServiceToggler from './StreamingServiceToggler';
import { useViewingProgress } from '../contexts/ViewingProgressContext';

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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [portalContainer, setPortalContainer] = useState(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);
  
  const iframeRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const messageListenerRef = useRef(null);
  const urlCheckIntervalRef = useRef(null);
  const lastTimeUpdateRef = useRef(0);
  const timeUpdateCountRef = useRef(0);
  
  const { startWatchingMovie, startWatchingEpisode, updateProgress } = useViewingProgress();
  const latestContentRef = useRef(null);

  // Keep a ref to the latest content to avoid stale closures in listeners
  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

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
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
      setCurrentProgress(0);
      setTotalDuration(0);
      setIsPlaying(false);
      setLastProgressUpdate(0);
      
      // Start tracking progress when player opens
      startProgressTracking();
    } else {
      // Save final progress when player closes
      saveProgress();
      stopProgressTracking();
    }
  }, [isOpen, streamingUrl]);

  // Progress tracking functions
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
    setupPostMessageListener();

    // Strategy 2: Monitor URL changes for timestamp parameters
    setupUrlMonitoring();

    // Strategy 3: Check localStorage for saved timestamps
    checkLocalStorageForProgress();

    // Strategy 4: Periodic progress updates (fallback)
    startPeriodicProgressCheck();
  }, [content, startWatchingMovie, startWatchingEpisode]);

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

    if (messageListenerRef.current) {
      window.removeEventListener('message', messageListenerRef.current);
      messageListenerRef.current = null;
    }
    
    // Reset counters
    lastTimeUpdateRef.current = 0;
    timeUpdateCountRef.current = 0;
  }, []);

  const setupPostMessageListener = useCallback(() => {
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

    messageListenerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);
  }, []);

  const setupUrlMonitoring = useCallback(() => {
    // Check for timestamp parameters in iframe URL
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

    // Check immediately and then periodically
    checkUrlForTimestamp();
    urlCheckIntervalRef.current = setInterval(checkUrlForTimestamp, 5000); // Check every 5 seconds
  }, []);

  const checkLocalStorageForProgress = useCallback(() => {
    // Some streaming services store progress in localStorage
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
  }, []);

  const startPeriodicProgressCheck = useCallback(() => {
    // Fallback: Periodic progress check every 10 seconds
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
  }, []);

  const updateProgressState = useCallback((progress, duration, currentTime) => {
    const now = Date.now();
    
    // Only update if progress has changed significantly (more than 1%) or if more than 30 seconds have passed
    if (Math.abs(progress - currentProgress) > 1 || now - lastProgressUpdate > 30000) {
      console.log('✅ Updating progress state:', { 
        progress: progress.toFixed(1) + '%', 
        duration, 
        currentTime,
        previousProgress: currentProgress.toFixed(1) + '%'
      });
      
      setCurrentProgress(progress);
      setTotalDuration(duration);
      setLastProgressUpdate(now);
      
      // Update progress in context using latest content ref
      const latestContent = latestContentRef.current;
      if (latestContent) {
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
      } else {
        console.warn('⚠️ No content available for progress update');
      }
    }
  }, [currentProgress, lastProgressUpdate, updateProgress]);

  const saveProgress = useCallback(() => {
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
  }, [currentProgress]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    console.log('🎬 Iframe loaded, starting progress tracking...');
    
    // Start progress tracking after iframe loads
    setTimeout(() => {
      console.log('🎬 Starting progress tracking with content:', content);
      startProgressTracking();
    }, 1000); // Small delay to ensure iframe is fully loaded
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    if (onError) {
      onError('Failed to load streaming content');
    }
  };

  const handleClose = () => {
    // Save progress before closing
    saveProgress();
    stopProgressTracking();
    
    setIsLoading(true);
    setHasError(false);
    onClose();
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      stopProgressTracking();
    };
  }, [isOpen, stopProgressTracking]);

  const handleClickOutside = (e) => {
    if (e.target.classList.contains('streaming-player-overlay')) {
      handleClose();
    }
  };

  // Don't render if portal container is not ready or in SSR
  if (typeof window === 'undefined' || !portalContainer) {
    return null;
  }

  const embedUrl = streamingUrl ? `${streamingUrl}?embed=1` : null;

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