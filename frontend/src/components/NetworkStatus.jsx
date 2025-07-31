import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isModalHidden, setIsModalHidden] = useState(true); // Hide modal by default

  // Enhanced network status detection with multiple fallback methods
  const checkNetworkStatus = useCallback(async () => {
    // First, check if we're online using the browser's built-in detection
    if (!navigator.onLine) {
      return false;
    }

    // Try multiple connectivity check methods
    const connectivityChecks = [
      // Method 1: Check if we can reach our own API (most reliable)
      async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch('/api/health', {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache'
          });
          
          clearTimeout(timeoutId);
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      
      // Method 2: Check if we can reach a CORS-friendly service
      async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache'
          });
          
          clearTimeout(timeoutId);
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      
      // Method 3: Check if we can reach a simple JSON endpoint
      async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache'
          });
          
          clearTimeout(timeoutId);
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    ];

    // Try each method until one succeeds
    for (const check of connectivityChecks) {
      try {
        const isConnected = await check();
        if (isConnected) {
          return true;
        }
      } catch (error) {
        // Continue to next method
        continue;
      }
    }

    // If all methods fail, assume we're offline
    console.warn('Network connectivity check failed: All methods failed');
    return false;
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      setLastError(null);
      setRetryCount(0);
      console.log('🌐 Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      console.warn('🌐 Network connection lost');
    };

    // Enhanced network error detection with CORS handling
    const handleNetworkError = (error) => {
      // Don't show errors for CORS issues or expected network failures
      const isCorsError = error.message.includes('CORS') || 
                         error.message.includes('Access-Control-Allow-Origin') ||
                         error.message.includes('favicon.ico');
      
      if (isCorsError) {
        // Silently ignore CORS errors - they don't indicate network issues
        return;
      }
      
      if (error.message.includes('connection reset') || 
          error.message.includes('fetch failed') ||
          error.message.includes('network error') ||
          error.message.includes('ERR_FAILED')) {
        setLastError({
          type: 'CONNECTION_RESET',
          message: 'Connection was reset. Please check your internet connection.',
          timestamp: Date.now()
        });
        setShowOfflineMessage(true);
      }
    };

    // Listen for network events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error) {
        handleNetworkError(error);
        throw error;
      }
    };

    // Periodic network check (reduced frequency for better performance)
    const networkCheckInterval = setInterval(async () => {
      // Only check if we're currently online to reduce unnecessary requests
      if (navigator.onLine) {
        const isConnected = await checkNetworkStatus();
        if (!isConnected && isOnline) {
          setIsOnline(false);
          setShowOfflineMessage(true);
        } else if (isConnected && !isOnline) {
          setIsOnline(true);
          setShowOfflineMessage(false);
        }
      }
    }, 120000); // Check every 2 minutes (reduced from 60s)

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.fetch = originalFetch;
      clearInterval(networkCheckInterval);
    };
  }, [isOnline, checkNetworkStatus]);

  // Auto-hide offline message after 10 seconds
  useEffect(() => {
    if (showOfflineMessage && !isOnline) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showOfflineMessage, isOnline]);

  // Manual retry function
  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    const isConnected = await checkNetworkStatus();
    if (isConnected) {
      setIsOnline(true);
      setShowOfflineMessage(false);
      setLastError(null);
    }
  }, [checkNetworkStatus]);

  // Hide modal if explicitly hidden or if online and no error
  if (isModalHidden || (!showOfflineMessage && isOnline)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[999999999] max-w-md w-full mx-4"
      >
        <div className="bg-red-500/95 backdrop-blur-sm border border-red-400/50 rounded-lg shadow-2xl p-4">
          <div className="flex items-start gap-3">
            {/* Status Icon */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-1">
                {isOnline ? 'Connection Restored' : 'Network Issue Detected'}
              </h3>
              <p className="text-red-100 text-sm mb-3">
                {lastError?.message || 'Please check your internet connection and try again.'}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetry}
                  disabled={retryCount >= 3}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md transition-colors duration-200"
                >
                  {retryCount >= 3 ? 'Max Retries' : `Retry (${retryCount}/3)`}
                </button>
                <button
                  onClick={() => {
                    setShowOfflineMessage(false);
                    setIsModalHidden(true);
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium rounded-md transition-colors duration-200"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowOfflineMessage(false);
                setIsModalHidden(true);
              }}
              className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar for Auto-hide */}
          {showOfflineMessage && !isOnline && (
            <div className="mt-3 w-full bg-white/20 rounded-full h-1 overflow-hidden">
              <motion.div
                className="bg-white/60 h-full rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 10, ease: 'linear' }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NetworkStatus; 