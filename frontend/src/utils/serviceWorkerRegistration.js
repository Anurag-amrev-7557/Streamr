/**
 * Robust Service Worker Registration Utility
 * Handles MIME type errors and provides fallback behavior
 */

class ServiceWorkerManager {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
    this.registration = null;
    this.isRegistered = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.forceUnregister = false;
    this.isDisabled = false; // New flag for disabling
  }

  /**
   * Force unregister all existing service workers to resolve MIME type issues
   */
  async forceUnregisterAll() {
    if (!this.isSupported) return;
    
    try {
      console.log('🔄 Force unregistering all existing service workers...');
      
      // Get all registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      // Unregister all
      for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ Unregistered service worker:', registration.scope);
      }
      
      // Clear all caches
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('✅ Cleared cache:', cacheName);
      }
      
      console.log('✅ All service workers unregistered and caches cleared');
      this.forceUnregister = true;
      
      // Wait a bit before proceeding
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ Error during force unregister:', error);
    }
  }

  /**
   * Register service worker with error handling
   */
  async register() {
    if (!this.isSupported) {
      console.log('Service Worker not supported in this browser');
      return false;
    }

    // Check if service worker is disabled
    if (this.isServiceWorkerDisabled()) {
      console.log('⚠️ Service worker is disabled due to previous MIME type errors');
      console.log('💡 To re-enable, call serviceWorkerManager.enableServiceWorker()');
      return false;
    }

    try {
      // Force unregister if we've had MIME type issues
      if (this.forceUnregister) {
        await this.forceUnregisterAll();
      }
      
      // Wait for the app to be fully loaded
      await this.waitForAppReady();
      
      // Choose service worker based on environment
      const swPath = this.getServiceWorkerPath();
      console.log(`Registering service worker: ${swPath}`);
      
      // Attempt registration
      this.registration = await navigator.serviceWorker.register(swPath, {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('🚀 Service Worker registered successfully:', this.registration);
      this.isRegistered = true;
      
      // Set up event listeners
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      
      // Handle specific error types
      if (this.isMimeTypeError(error)) {
        console.warn('🚨 MIME type error detected. Attempting force unregister...');
        
        // Force unregister all service workers and try again
        await this.forceUnregisterAll();
        
        // Wait a bit and try one more time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const swPath = this.getServiceWorkerPath();
          this.registration = await navigator.serviceWorker.register(swPath, {
            scope: '/',
            updateViaCache: 'none'
          });
          
          console.log('🚀 Service Worker registered successfully after force unregister');
          this.isRegistered = true;
          this.setupEventListeners();
          return true;
          
        } catch (retryError) {
          console.error('🚨 Service Worker registration failed after force unregister:', retryError);
          
          // If we're still getting MIME type errors, disable the service worker
          if (this.isMimeTypeError(retryError)) {
            console.error('🚨 Multiple MIME type errors detected. Disabling service worker...');
            await this.disableServiceWorker();
            
            // Show helpful message to user
            console.error(`
🚨 Service Worker Disabled Due to MIME Type Errors

The service worker has been automatically disabled to prevent further MIME type errors.
This means you won't have offline functionality or advanced caching, but the app should work normally.

To re-enable the service worker:
1. Call: serviceWorkerManager.enableServiceWorker()
2. Refresh the page
3. The service worker will attempt to register again

If the issue persists, the service worker will remain disabled.
            `);
          }
          
          return false;
        }
      }
      
      // Retry logic for other errors
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying service worker registration (${this.retryCount}/${this.maxRetries})...`);
        
        setTimeout(() => {
          this.register();
        }, this.retryDelay * this.retryCount);
        
        return false;
      }
      
      console.error('Service Worker registration failed after all retries');
      return false;
    }
  }

  /**
   * Wait for the app to be fully loaded before registering
   */
  waitForAppReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve, { once: true });
      }
    });
  }

  /**
   * Check if error is related to MIME type
   */
  isMimeTypeError(error) {
    const errorMessage = error.message || error.toString();
    return errorMessage.includes('MIME type') || 
           errorMessage.includes('text/html') ||
           errorMessage.includes('Expected a JavaScript') ||
           errorMessage.includes('module script');
  }

  /**
   * Completely disable service worker functionality
   */
  async disableServiceWorker() {
    try {
      console.log('🔄 Disabling service worker functionality...');
      
      // Unregister all service workers
      await this.forceUnregisterAll();
      
      // Set a flag to prevent future registrations
      this.isDisabled = true;
      
      // Store preference in localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('streamr_sw_disabled', 'true');
        localStorage.setItem('streamr_sw_disabled_reason', 'MIME type errors');
        localStorage.setItem('streamr_sw_disabled_timestamp', Date.now().toString());
      }
      
      console.log('✅ Service worker functionality disabled');
      return true;
      
    } catch (error) {
      console.error('❌ Error disabling service worker:', error);
      return false;
    }
  }

  /**
   * Check if service worker is disabled
   */
  isServiceWorkerDisabled() {
    if (this.isDisabled) return true;
    
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('streamr_sw_disabled') === 'true';
    }
    
    return false;
  }

  /**
   * Re-enable service worker functionality
   */
  async enableServiceWorker() {
    try {
      console.log('🔄 Re-enabling service worker functionality...');
      
      this.isDisabled = false;
      
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('streamr_sw_disabled');
        localStorage.removeItem('streamr_sw_disabled_reason');
        localStorage.removeItem('streamr_sw_disabled_timestamp');
      }
      
      console.log('✅ Service worker functionality re-enabled');
      return true;
      
    } catch (error) {
      console.error('❌ Error re-enabling service worker:', error);
      return false;
    }
  }

  /**
   * Set up service worker event listeners
   */
  setupEventListeners() {
    if (!this.registration) return;

    // Handle service worker updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;
      console.log('Service Worker update found');
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New service worker installed. Activating immediately...');
          try {
            // Ask waiting SW to skip waiting
            if (this.registration.waiting) {
              this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            // Reload once controller changes
            const onControllerChange = () => {
              navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
              // Ensure fresh HTML is fetched
              window.location.reload();
            };
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
          } catch (_) {}
        }
      });
    });

    // Handle service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });

    // Handle service worker errors
    navigator.serviceWorker.addEventListener('error', (error) => {
      console.error('Service Worker error:', error);
    });
  }

  /**
   * Handle messages from service worker
   */
  handleServiceWorkerMessage(event) {
    const { data } = event;
    
    if (data?.type === 'REQUEST_TMDB_API_KEY') {
      console.log('Service worker requested API key, sending...');
      this.sendApiKeyToServiceWorker();
    }
  }

  /**
   * Send API key to service worker
   */
  sendApiKeyToServiceWorker() {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: 'SET_TMDB_API_KEY',
        apiKey: apiKey
      });
    } else if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_TMDB_API_KEY',
        apiKey: apiKey
      });
    }
  }

  /**
   * Unregister service worker
   */
  async unregister() {
    if (this.registration) {
      await this.registration.unregister();
      this.isRegistered = false;
      this.registration = null;
      console.log('Service Worker unregistered');
    }
  }

  /**
   * Check if service worker is active
   */
  isActive() {
    return this.isRegistered && this.registration?.active;
  }

  /**
   * Get service worker registration
   */
  getRegistration() {
    return this.registration;
  }

  /**
   * Get the appropriate service worker path based on environment
   */
  getServiceWorkerPath() {
    // Check if we're in development mode
    const isDev = import.meta.env.DEV || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.port === '5173';
    
    if (isDev) {
      console.log('🔧 Using development service worker');
      return '/dev-sw.js';
    } else {
      console.log('🚀 Using production service worker');
      return '/sw.js';
    }
  }
}

// Create singleton instance
const serviceWorkerManager = new ServiceWorkerManager();

export default serviceWorkerManager; 