import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
// Defer non-critical utilities to idle to reduce initial JS
if (typeof window !== 'undefined') {
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1000));
  idle(() => {
    Promise.allSettled([
      import('./utils/backendSwitcher.js'),
      import('./utils/previewModeHelper.js')
    ]).catch(() => {});
  });
}

// Initialize lightweight service worker for minimal network requirements
import './utils/lightweightServiceWorker.js'
import { getApiUrl } from './config/api.js'

// Performance monitoring for development
if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🚀 Development mode - Performance monitoring enabled');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

// Expose API base for proxies used in canvas share
try {
  window.__API_BASE__ = getApiUrl()
} catch {}
