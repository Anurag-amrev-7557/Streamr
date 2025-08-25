import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import enhancedLoadingService from '../services/enhancedLoadingService';

const EnhancedLoadingIndicator = ({ 
  isLoading, 
  error, 
  retryCount = 0, 
  onRetry, 
  context = 'content',
  showNetworkStatus = true,
  className = '',
  hasContent = false
}) => {
  const [loadingState, setLoadingState] = useState(
    enhancedLoadingService.createLoadingIndicatorState()
  );
  const [networkProfile, setNetworkProfile] = useState('fast');

  useEffect(() => {
    // Monitor network status
    const cleanup = enhancedLoadingService.monitorNetworkStatus((profile) => {
      setNetworkProfile(profile);
    });

    return cleanup;
  }, []);

  useEffect(() => {
    // Update loading indicator state based on retry count and network profile
    const updatedState = enhancedLoadingService.updateLoadingIndicator(
      loadingState,
      retryCount,
      enhancedLoadingService.retryConfig.maxRetries,
      networkProfile
    );
    setLoadingState(updatedState);
  }, [retryCount, networkProfile]);

  const handleRetry = async () => {
    if (onRetry) {
      try {
        await onRetry();
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  };

  // Loading state - only show if we have no content and are actually loading
  if (isLoading && !error && !hasContent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`flex flex-col items-center justify-center py-16 ${className}`}
      >
        {/* Modern minimalist loading spinner */}
        <div className="relative mb-6">
          {/* Outer ring */}
          <div className="w-16 h-16 border-2 border-white/20 rounded-full animate-spin"></div>
          {/* Inner ring with gradient */}
          <div className="absolute inset-2 w-12 h-12 border-2 border-transparent border-t-white rounded-full animate-spin" 
               style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          {/* Center dot */}
          <div className="absolute inset-6 w-4 h-4 bg-white rounded-full animate-pulse"></div>
        </div>
        
        {/* Loading text */}
        <div className="text-center space-y-2">
          <p className="text-white/80 text-lg font-light tracking-wide">
            Loading {context}
          </p>
          {loadingState.showNetworkStatus && (
            <p className="text-white/50 text-sm font-light">
              {loadingState.networkStatusText}
            </p>
          )}
        </div>

        {/* Minimalist progress indicator for slow connections */}
        {networkProfile !== 'fast' && (
          <motion.div 
            className="mt-6 w-32 h-px bg-white/10 overflow-hidden rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="h-full bg-white/60 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`flex flex-col items-center justify-center py-16 text-center ${className}`}
      >
        {/* Minimalist error icon */}
        <div className="relative mb-6">
          <div className="w-16 h-16 border-2 border-white/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Error message */}
        <div className="max-w-md mb-8">
          <h3 className="text-xl font-light text-white/90 mb-3 tracking-wide">
            Unable to Load {context}
          </h3>
          <p className="text-white/60 text-sm leading-relaxed font-light">
            {enhancedLoadingService.getErrorMessage(error, context)}
          </p>
        </div>

        {/* Network status */}
        {showNetworkStatus && loadingState.showNetworkStatus && (
          <motion.div 
            className="mb-6 px-4 py-2 bg-white/5 border border-white/10 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm text-white/50 font-light">
              {loadingState.networkStatusText}
            </p>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {loadingState.showRetryButton && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRetry}
              disabled={!loadingState.canRetry}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white font-light rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-white/20 hover:border-white/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loadingState.retryButtonText}</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white/80 font-light rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 border border-white/10 hover:border-white/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Page</span>
          </motion.button>
        </div>

        {/* Retry count info */}
        {retryCount > 0 && (
          <motion.p 
            className="text-xs text-white/40 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Attempted {retryCount} time{retryCount !== 1 ? 's' : ''} to load {context}
          </motion.p>
        )}
      </motion.div>
    );
  }

  // Skeleton loading state for when there's some content but still loading
  if (isLoading && hasContent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`flex items-center justify-center py-8 ${className}`}
      >
        <div className="flex items-center space-x-3">
          {/* Minimalist loading dots */}
          <div className="flex space-x-1">
            <motion.div
              className="w-2 h-2 bg-white/40 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-white/40 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-white/40 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          <span className="text-white/50 text-sm font-light">Loading more...</span>
        </div>
      </motion.div>
    );
  }

  // No content state
  return null;
};

export default EnhancedLoadingIndicator; 