// Error Boundary Utility for handling external errors gracefully
import * as React from 'react';

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
    'dh8azcl753e1e.cloudfront.net'
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
                          errorMessage.includes('401 unauthorized') ||
                          errorMessage.includes('api key') ||
                          errorMessage.includes('cors') ||
                          errorMessage.includes('cross-origin');
  
  // Check for Swiper-related errors that we should handle gracefully
  const isSwiperError = errorMessage.includes('onTouchEnd') ||
                       errorMessage.includes('onTouchStart') ||
                       errorMessage.includes('onTouchMove') ||
                       errorMessage.includes('swiper') ||
                       errorMessage.includes('touch') ||
                       errorMessage.includes('cannot read properties of undefined') ||
                       errorMessage.includes('reading \'onTouchEnd\'') ||
                       errorMessage.includes('reading \'onTouchStart\'') ||
                       errorMessage.includes('reading \'onTouchMove\'');
  
  return isExternalDomain || isBlockedRequest || isSwiperError;
};

// React Error Boundary Component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="refresh-button"
            >
              Refresh Page
            </button>
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