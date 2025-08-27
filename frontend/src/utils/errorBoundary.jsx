// Error Boundary Utility for handling external errors gracefully
import React from 'react';

// --- Global error handler for external resources ---
export const setupGlobalErrorHandling = () => {
  window.addEventListener('unhandledrejection', (event) => {
    const { reason } = event;
    if (isExternalResourceError(reason)) {
      console.debug('Ignoring external resource error:', reason);
      event.preventDefault();
      return;
    }
    console.warn('Unhandled promise rejection:', reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    const { error, filename, lineno, colno } = event;
    if (isExternalResourceError(error)) {
      console.debug('Ignoring external resource error:', error);
      event.preventDefault();
      return;
    }
    console.warn('Global error caught:', { error, filename, lineno, colno });
    event.preventDefault();
  });

  // Suppress noisy YouTube/analytics errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    try {
      const errorMessage = args.join(' ').toLowerCase();
      if (
        errorMessage.includes('youtube') ||
        errorMessage.includes('generate_204') ||
        errorMessage.includes('log_event') ||
        errorMessage.includes('stats/qoe') ||
        errorMessage.includes('err_blocked_by_client')
      ) {
        console.debug('Suppressing YouTube-related error:', ...args);
        return;
      }
      originalConsoleError.apply(console, args);
    } catch (err) {
      originalConsoleError.apply(console, args);
    }
  };
};

const isExternalResourceError = (error) => {
  if (!error) return false;
  let errorMessage = '';
  try {
    errorMessage = error.toString().toLowerCase();
  } catch (err) {
    try {
      errorMessage = (error.message || error.name || 'unknown error').toLowerCase();
    } catch (fallbackErr) {
      errorMessage = 'unknown error';
    }
  }
  const errorUrl = error.url || error.src || '';
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
  const isExternalDomain = externalDomains.some(domain =>
    errorUrl.includes(domain) || errorMessage.includes(domain)
  );
  const isBlockedRequest =
    errorMessage.includes('err_blocked_by_client') ||
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

// --- Modern, Minimalist, Ultra Smooth Error Boundary ---
// THEME UPDATE: Black & White Dark Modern Theme
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isRefreshing: false };
  }

  static getDerivedStateFromError(error) {
    if (isExternalResourceError(error)) {
      console.debug('Ignoring external resource error in error boundary:', error);
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (isExternalResourceError(error)) {
      console.debug('Ignoring external resource error in error boundary:', error);
      return;
    }
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRefresh = () => {
    this.setState({ isRefreshing: true });
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRefreshing: false
      });
    }, 400);
  };

  render() {
    if (this.state.hasError) {
      // THEME: Black & White, deep dark, modern, minimalist
      const containerStyle = {
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(120deg, #000 0%, #181818 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        transition: 'background 0.6s cubic-bezier(.4,0,.2,1)'
      };
      const cardStyle = {
        background: 'rgba(20,20,20,0.96)',
        borderRadius: '1.5rem',
        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.32), 0 1.5px 8px 0 #fff1',
        padding: '2.7rem 2.7rem 2.1rem 2.7rem',
        maxWidth: 400,
        width: '92vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'fadeInScale 0.7s cubic-bezier(.22,1,.36,1)',
        backdropFilter: 'blur(12px) saturate(1.1)',
        border: '1.5px solid rgba(255,255,255,0.08)'
      };
      const iconContainerStyle = {
        marginBottom: '1.7rem',
        background: 'linear-gradient(135deg, #111 60%, #222 100%)',
        borderRadius: '50%',
        width: 70,
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 16px 0 rgba(255,255,255,0.04), 0 1.5px 8px 0 #fff1',
        animation: 'popIn 0.7s cubic-bezier(.22,1,.36,1)',
        border: '2.5px solid #fff'
      };
      const iconStyle = {
        width: 40,
        height: 40,
        color: '#fff',
        opacity: 0.96,
        filter: 'drop-shadow(0 2px 8px #fff3)'
      };
      const titleStyle = {
        fontSize: '1.45rem',
        fontWeight: 700,
        color: '#fff',
        marginBottom: 10,
        letterSpacing: '-0.01em',
        textAlign: 'center',
        lineHeight: 1.2,
        animation: 'fadeInUp 0.7s 0.1s both cubic-bezier(.22,1,.36,1)',
        textShadow: '0 1px 4px #fff2'
      };
      const descStyle = {
        color: '#e0e0e0',
        fontSize: '1.05rem',
        marginBottom: 28,
        textAlign: 'center',
        lineHeight: 1.5,
        animation: 'fadeInUp 0.7s 0.18s both cubic-bezier(.22,1,.36,1)',
        textShadow: '0 1px 2px #0008'
      };
      const buttonStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'linear-gradient(90deg, #fff 0%, #222 100%)',
        color: '#000',
        border: 'none',
        borderRadius: '999px',
        padding: '0.8rem 1.8rem',
        fontWeight: 600,
        fontSize: '1.05rem',
        cursor: this.state.isRefreshing ? 'not-allowed' : 'pointer',
        boxShadow: '0 2px 12px 0 rgba(255,255,255,0.10)',
        outline: 'none',
        transition: 'background 0.25s, box-shadow 0.25s, transform 0.18s cubic-bezier(.22,1,.36,1)',
        opacity: this.state.isRefreshing ? 0.7 : 1,
        pointerEvents: this.state.isRefreshing ? 'none' : 'auto',
        animation: 'fadeInUp 0.7s 0.25s both cubic-bezier(.22,1,.36,1)',
        boxSizing: 'border-box',
        borderBottom: '2.5px solid #fff1'
      };
      const refreshIconStyle = {
        width: 24,
        height: 24,
        marginRight: 0,
        color: '#000',
        opacity: 0.96,
        transform: this.state.isRefreshing ? 'rotate(360deg)' : 'none',
        transition: 'transform 0.7s cubic-bezier(.22,1,.36,1)'
      };

      // Keyframes for smooth animation
      const keyframes = `
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.96);}
          100% { opacity: 1; transform: scale(1);}
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.7);}
          100% { opacity: 1; transform: scale(1);}
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(18px);}
          100% { opacity: 1; transform: translateY(0);}
        }
        @keyframes spin {
          100% { transform: rotate(360deg);}
        }
      `;

      return (
        <div style={containerStyle}>
          <style>{keyframes}</style>
          <div style={cardStyle}>
            <div style={iconContainerStyle}>
              <svg
                style={iconStyle}
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="24" cy="24" r="22" fill="#181818" />
                <path
                  d="M24 13v11"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 1px 2px #fff3)' }}
                />
                <circle cx="24" cy="32" r="1.7" fill="#fff" />
              </svg>
            </div>
            <div>
              <div style={titleStyle}>Something went wrong</div>
              <div style={descStyle}>
                We encountered an unexpected issue.<br />
                Please try refreshing the page.
              </div>
            </div>
            <button
              onClick={this.handleRefresh}
              style={buttonStyle}
              disabled={this.state.isRefreshing}
              aria-busy={this.state.isRefreshing}
            >
              <svg
                style={{
                  ...refreshIconStyle,
                  animation: this.state.isRefreshing
                    ? 'spin 0.8s linear infinite'
                    : undefined
                }}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                  fill="currentColor"
                />
              </svg>
              <span>
                {this.state.isRefreshing ? 'Refreshing...' : 'Refresh Page'}
              </span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Hook for handling async errors ---
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

// --- Utility for wrapping async functions with error handling ---
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

// --- Initialize global error handling ---
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling();
} 