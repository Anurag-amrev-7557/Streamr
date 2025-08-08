// Error Boundary Utility for handling external errors gracefully
import React from 'react';

// Global error handler for external resources
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const { reason } = event;
    
    // Check if it's an external resource error that we should ignore
    if (isExternalResourceError(reason)) {
      console.debug('Ignoring external resource error:', reason);
      event.preventDefault();
      return;
    }
    
    // Log other errors but don't crash the app
    console.warn('Unhandled promise rejection:', reason);
    event.preventDefault();
  });

  // Handle general errors
  window.addEventListener('error', (event) => {
    const { error, filename, lineno, colno } = event;
    
    // Check if it's an external resource error
    if (isExternalResourceError(error)) {
      console.debug('Ignoring external resource error:', error);
      event.preventDefault();
      return;
    }
    
    // Log other errors but don't crash the app
    console.warn('Global error caught:', { error, filename, lineno, colno });
    event.preventDefault();
  });

  // Handle YouTube-specific errors (if not already handled)
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMessage = args.join(' ').toLowerCase();
    
    // Check if it's a YouTube-related error that should be suppressed
    if (errorMessage.includes('youtube') || 
        errorMessage.includes('generate_204') || 
        errorMessage.includes('log_event') || 
        errorMessage.includes('stats/qoe') ||
        errorMessage.includes('err_blocked_by_client')) {
      console.debug('Suppressing YouTube-related error:', ...args);
      return;
    }
    
    // Call the original console.error for other errors
    originalConsoleError.apply(console, args);
  };
};

// Check if an error is from an external resource that we should ignore
const isExternalResourceError = (error) => {
  if (!error) return false;
  
  const errorMessage = error.toString().toLowerCase();
  const errorUrl = error.url || error.src || '';
  
  // List of external domains that commonly cause blocked requests
  const externalDomains = [
    '111movies.com',
    'cloudfront.net',
    'cloudflareinsights.com',
    'valiw.hakunaymatata.com',
    'qj.asokapygmoid.com',
    'dh8azcl753e1e.cloudfront.net',
    'youtube.com',
    'youtu.be',
    'googlevideo.com',
    'google.com',
    'play.google.com'
  ];
  
  // Check if the error is from an external domain
  const isExternalDomain = externalDomains.some(domain => 
    errorUrl.includes(domain) || errorMessage.includes(domain)
  );
  
  // Check for common blocked request patterns
  const isBlockedRequest = errorMessage.includes('err_blocked_by_client') ||
                          errorMessage.includes('net::err_blocked_by_client') ||
                          errorMessage.includes('403 forbidden') ||
                          errorMessage.includes('404 not found') ||
                          errorMessage.includes('cors') ||
                          errorMessage.includes('cross-origin') ||
                          errorMessage.includes('generate_204') ||
                          errorMessage.includes('log_event') ||
                          errorMessage.includes('stats/qoe') ||
                          errorMessage.includes('youtubei/v1/log_event');
  
  return isExternalDomain || isBlockedRequest;
};

// React Error Boundary Component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isRefreshing: false };
  }

  static getDerivedStateFromError(error) {
    // Check if this is an external resource error
    if (isExternalResourceError(error)) {
      console.debug('Ignoring external resource error in error boundary:', error);
      return { hasError: false };
    }
    
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Check if this is an external resource error
    if (isExternalResourceError(error)) {
      console.debug('Ignoring external resource error in error boundary:', error);
      return;
    }
    
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRefresh = () => {
    this.setState({ isRefreshing: true });
    // Add a small delay to show the loading state
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <div className="error-content-modern">
            {/* Modern Icon */}
            <div className="error-icon-container">
              <svg
                className="error-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  fill="currentColor"
                />
              </svg>
            </div>
            
            {/* Content */}
            <div className="error-text-content">
              <h2 className="error-title">Something went wrong</h2>
              <p className="error-description">
                We encountered an unexpected issue. Please refresh the page to continue.
              </p>
            </div>
            
            {/* Action Button */}
            <div className="error-actions">
              <button 
                onClick={this.handleRefresh}
                className={`refresh-button-modern ${this.state.isRefreshing ? 'refreshing' : ''}`}
                disabled={this.state.isRefreshing}
              >
                <svg
                  className={`refresh-icon ${this.state.isRefreshing ? 'spinning' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                    fill="currentColor"
                  />
                </svg>
                <span>{this.state.isRefreshing ? 'Refreshing...' : 'Refresh Page'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling async errors
export const useAsyncErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const handleAsyncError = React.useCallback((error) => {
    if (isExternalResourceError(error)) {
      console.debug('Ignoring external resource error:', error);
      return;
    }
    
    console.error('Async error caught:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleAsyncError, clearError };
};

// Utility for wrapping async functions with error handling
export const withErrorHandling = (asyncFn) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      if (isExternalResourceError(error)) {
        console.debug('Ignoring external resource error in wrapped function:', error);
        return null;
      }
      throw error;
    }
  };
};

// Initialize global error handling
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling();
} 