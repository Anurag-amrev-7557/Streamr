import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import './utils/backendSwitcher.js'
import './utils/previewModeHelper.js'

// Initialize lightweight service worker for minimal network requirements
import './utils/lightweightServiceWorker.js'

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
