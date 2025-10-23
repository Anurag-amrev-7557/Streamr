/**
 * EnhancedErrorBoundary - Comprehensive error boundary with recovery
 * Features: error tracking, recovery mechanisms, user-friendly fallbacks
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';

class EnhancedErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { onError, maxRetries = 3 } = this.props;
    
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Track error in production (e.g., send to error tracking service)
    if (!import.meta.env.DEV) {
      this.trackError(error, errorInfo);
    }
  }

  trackError = (error, errorInfo) => {
    // Implement error tracking here (e.g., Sentry, LogRocket, etc.)
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      console.error('Error tracked:', errorData);
      
      // Send to error tracking service
      // Example: window.Sentry?.captureException(error, { extra: errorData });
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
    }
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { 
      children, 
      fallback, 
      showDetails = import.meta.env.DEV,
      maxRetries = 3,
    } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback({ error, errorInfo, retry: this.handleRetry, reset: this.handleReset })
          : fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-red-500"
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

              {/* Error Title */}
              <h1 className="text-3xl font-bold text-white text-center mb-4">
                Oops! Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-gray-400 text-center mb-6">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                {retryCount < maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Try Again ({retryCount + 1}/{maxRetries})
                  </button>
                )}

                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Go Home
                </button>
              </div>

              {/* Retry limit reached */}
              {retryCount >= maxRetries && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-500 text-sm text-center">
                    Maximum retry attempts reached. Please refresh the page or contact support.
                  </p>
                </div>
              )}

              {/* Error Details (Dev only) */}
              {showDetails && error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors mb-3 font-medium">
                    Technical Details
                  </summary>
                  <div className="bg-black/50 rounded-lg p-4 overflow-auto max-h-64">
                    <div className="mb-4">
                      <h3 className="text-red-400 font-mono text-sm mb-2">Error:</h3>
                      <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                        {error.toString()}
                      </pre>
                    </div>
                    {error.stack && (
                      <div className="mb-4">
                        <h3 className="text-red-400 font-mono text-sm mb-2">Stack Trace:</h3>
                        <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <h3 className="text-red-400 font-mono text-sm mb-2">Component Stack:</h3>
                        <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-gray-500 text-sm text-center">
                  If this problem persists, please{' '}
                  <a
                    href="mailto:support@streamr.com"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    contact support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

EnhancedErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onError: PropTypes.func,
  showDetails: PropTypes.bool,
  maxRetries: PropTypes.number,
};

export default EnhancedErrorBoundary;
