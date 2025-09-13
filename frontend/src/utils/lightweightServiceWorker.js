// Lightweight Service Worker Registration for Minimal Network Requirements

class LightweightServiceWorker {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
    this.registration = null;
    this.isRegistered = false;
  }

  // Register the service worker
  async register() {
    if (!this.isSupported) {
      console.log('Service Worker not supported');
      return false;
    }

    try {
      // Respect global/explicit disable flags to avoid conflicts
      if (typeof window !== 'undefined' && (window.__SERVICE_WORKER_DISABLED__ || (window.localStorage && localStorage.getItem('streamr_sw_disabled') === 'true'))) {
        console.log('⚠️ Lightweight SW registration skipped - disabled by flag');
        return false;
      }

      // If any service worker is already registered/active, skip to prevent double registration
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations && registrations.length > 0) {
          const hasActive = registrations.some(r => r.active || r.waiting || r.installing);
          if (hasActive) {
            console.log('⚠️ Another Service Worker is already registered. Skipping lightweight SW.');
            return false;
          }
        }
      } catch (_) {
        // Non-fatal; continue with normal flow
      }

      // Check if already registered
      if (this.isRegistered) {
        console.log('Service Worker already registered');
        return true;
      }

      // Register with minimal network strategy
      this.registration = await navigator.serviceWorker.register('/lightweight-sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      console.log('Service Worker registered successfully:', this.registration);

      // Handle updates
      this.handleUpdates();
      
      // Handle installation
      this.handleInstallation();
      
      this.isRegistered = true;
      return true;

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Handle service worker updates
  handleUpdates() {
    if (!this.registration) return;

    // Check for updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available - removed toast notification
          console.log('New service worker installed');
        }
      });
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New Service Worker activated');
      // Optionally reload the page to use new SW
      // window.location.reload();
    });
  }

  // Handle service worker installation
  handleInstallation() {
    if (!this.registration) return;

    this.registration.addEventListener('installing', (event) => {
      console.log('Service Worker installing...');
    });

    this.registration.addEventListener('installed', (event) => {
      console.log('Service Worker installed');
    });

    this.registration.addEventListener('activating', (event) => {
      console.log('Service Worker activating...');
    });

    this.registration.addEventListener('activated', (event) => {
      console.log('Service Worker activated');
    });
  }

  // Unregister service worker
  async unregister() {
    if (!this.registration) return false;

    try {
      const unregistered = await this.registration.unregister();
      if (unregistered) {
        this.isRegistered = false;
        this.registration = null;
        console.log('Service Worker unregistered');
      }
      return unregistered;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  // Check if service worker is controlling the page
  isControlling() {
    return !!navigator.serviceWorker.controller;
  }

  // Get service worker state
  getState() {
    if (!this.registration) return 'not-registered';
    
    if (this.registration.installing) return 'installing';
    if (this.registration.waiting) return 'waiting';
    if (this.registration.active) return 'active';
    
    return 'unknown';
  }

  // Send message to service worker
  async postMessage(message) {
    if (!this.isControlling()) {
      console.warn('Service Worker not controlling the page');
      return false;
    }

    try {
      navigator.serviceWorker.controller.postMessage(message);
      return true;
    } catch (error) {
      console.error('Failed to post message to Service Worker:', error);
      return false;
    }
  }

  // Check cache status
  async getCacheStatus() {
    if (!('caches' in window)) return null;

    try {
      const cacheNames = await caches.keys();
      const cacheStatus = {};

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        cacheStatus[name] = keys.length;
      }

      return cacheStatus;
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return null;
    }
  }

  // Clear all caches
  async clearCaches() {
    if (!('caches' in window)) return false;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    }
  }
}

// Create global instance and export without auto-registering
const lightweightSW = new LightweightServiceWorker();
export default lightweightSW;

// Also make available globally for debugging
if (typeof window !== 'undefined') {
  window.lightweightSW = lightweightSW;
}