/**
 * 🚀 Advanced Error Boundary for Movie Details
 * 
 * Provides comprehensive error handling with:
 * - Automatic error recovery
 * - Fallback UI
 * - Error telemetry
 * - Retry logic
 * - Error categorization
 * - User-friendly error messages
 */

import React, { Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

class MovieDetailsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      retryCount: 0,
      isRecovering: false,
    };

    this.maxRetries = props.maxRetries || 3;
    this.resetTimeout = null;
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log error to analytics/monitoring service
    this.logError(error, errorInfo);

    // Attempt automatic recovery for certain error types
    if (this.shouldAutoRecover(error)) {
      this.attemptRecovery();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
  }

  /**
   * Determine if error should trigger automatic recovery
   */
  shouldAutoRecover(error) {
    const recoverableErrors = [
      'ChunkLoadError',
      'NetworkError',
      'TimeoutError',
    ];

    return recoverableErrors.some(errorType =>
      error.name === errorType || error.message.includes(errorType)
    );
  }

  /**
   * Attempt to recover from error
   */
  attemptRecovery = () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.error('[ErrorBoundary] Max retries reached');
      return;
    }

    this.setState({ isRecovering: true });

    // Wait before retry (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);

    this.resetTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        retryCount: prevState.retryCount + 1,
      }));
    }, delay);
  };

  /**
   * Manual retry by user
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });

    // Call onRetry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  /**
   * Close error and return to previous state
   */
  handleClose = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call onClose callback if provided
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  /**
   * Log error to analytics service
   */
  logError(error, errorInfo) {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      errorCount: this.state.errorCount,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Data:', errorData);
      console.groupEnd();
    }

    // Send to analytics service (implement based on your analytics provider)
    if (this.props.onError) {
      this.props.onError(errorData);
    }
  }

  /**
   * Get user-friendly error message based on error type
   */
  getUserFriendlyMessage(error) {
    if (!error) return 'An unexpected error occurred';

    const errorMessages = {
      'ChunkLoadError': 'Failed to load content. Please refresh the page.',
      'NetworkError': 'Network connection issue. Please check your internet connection.',
      'TimeoutError': 'Request timed out. Please try again.',
      'TypeError': 'Something went wrong. Please refresh the page.',
    };

    for (const [errorType, message] of Object.entries(errorMessages)) {
      if (error.name === errorType || error.message.includes(errorType)) {
        return message;
      }
    }

    return 'Something went wrong. Please try again.';
  }

  /**
   * Render fallback UI
   */
  renderFallback() {
    const { error, isRecovering, retryCount } = this.state;
    const { fallback } = this.props;

    // Use custom fallback if provided
    if (fallback) {
      return fallback({
        error,
        retry: this.handleRetry,
        close: this.handleClose,
      });
    }

    // Default fallback UI
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-gradient-to-br from-gray-900 to-black border border-red-500/20 rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <h2 className="text-2xl font-bold text-white text-center mb-3">
              Oops! Something went wrong
            </h2>
            
            <p className="text-gray-400 text-center mb-6">
              {this.getUserFriendlyMessage(error)}
            </p>

            {/* Recovery Status */}
            {isRecovering && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                  <span className="text-blue-400 text-sm">
                    Attempting to recover... ({retryCount + 1}/{this.maxRetries})
                  </span>
                </div>
              </div>
            )}

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-6 p-4 bg-gray-800/50 rounded-lg text-xs">
                <summary className="cursor-pointer text-gray-400 font-medium mb-2">
                  Technical Details
                </summary>
                <pre className="text-red-400 overflow-auto max-h-40 whitespace-pre-wrap">
                  {error.toString()}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                disabled={isRecovering}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isRecovering ? 'Recovering...' : 'Try Again'}
              </button>
              
              <button
                onClick={this.handleClose}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Close
              </button>
            </div>

            {/* Retry Counter */}
            {retryCount > 0 && (
              <p className="text-center text-gray-500 text-xs mt-4">
                Retry attempt {retryCount} of {this.maxRetries}
              </p>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

export default MovieDetailsErrorBoundary;
