import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { HelmetProvider } from 'react-helmet-async'
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

// Initialize enhanced service worker registration for PWA features
import './utils/enhancedServiceWorkerRegistration.js'
import { getApiUrl } from './config/api.js'

// ✅ Google Analytics setup
const measurementId = import.meta.env.VITE_MEASUREMENT_ID
if (measurementId && typeof window !== "undefined") {
  // Inject GA script
  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  // Initialize GA
  window.dataLayer = window.dataLayer || []
  function gtag(){ window.dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', measurementId, { send_page_view: false }) // avoid duplicate pageviews
}

// Performance monitoring for development
if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🚀 Development mode - Performance monitoring enabled');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
)

// Expose API base for proxies used in canvas share
try {
  window.__API_BASE__ = getApiUrl()
} catch {}
