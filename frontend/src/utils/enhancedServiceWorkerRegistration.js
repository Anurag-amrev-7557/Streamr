import { PWA_CONFIG, PWA_SUPPORT } from '../config/pwa.js';

// Enhanced Service Worker Registration with PWA Features
class EnhancedServiceWorkerRegistration {
  constructor() {
    this.registration = null;
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    this.offlineQueue = [];
    
    this.init();
  }

  async init() {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return;
      }

      // Register service worker
      await this.registerServiceWorker();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Check installation status
      this.checkInstallationStatus();
      
      // Initialize offline queue
      this.initOfflineQueue();
      
      console.log('🚀 Enhanced Service Worker Registration initialized');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async registerServiceWorker() {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: PWA_CONFIG.SW_SCOPE,
        updateViaCache: PWA_CONFIG.SW_UPDATE_VIA_CACHE
      });

      console.log('Service Worker registered successfully:', this.registration);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        console.log('Service Worker update found');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
        window.location.reload();
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      // Don't automatically show install prompt
      // this.showInstallPrompt();
      console.log('PWA install prompt available but not showing automatically');
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', (e) => {
      this.isInstalled = true;
      this.hideInstallPrompt();
      this.trackInstallation();
      console.log('App installed successfully');
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
      this.updateNetworkStatus(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateNetworkStatus(false);
    });

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });

    // Listen for push events (only after registration is complete)
    if (PWA_SUPPORT.pushManager && this.registration && PWA_CONFIG.ENABLE_PUSH_NOTIFICATIONS) {
      // Delay push notification setup to ensure registration is ready
      setTimeout(() => {
        this.setupPushNotifications();
      }, PWA_CONFIG.PREDICTIVE_PREFETCH_DELAY);
    }

    // Listen for background sync events
    if (PWA_SUPPORT.backgroundSync && PWA_CONFIG.ENABLE_BACKGROUND_SYNC) {
      this.setupBackgroundSync();
    }
  }

  async checkInstallationStatus() {
    try {
      if ('getInstalledRelatedApps' in navigator) {
        const relatedApps = await navigator.getInstalledRelatedApps();
        this.isInstalled = relatedApps.length > 0;
      }
    } catch (error) {
      console.log('Could not check installation status:', error);
    }
  }

  showInstallPrompt() {
    if (this.deferredPrompt && !this.isInstalled) {
      // Create install prompt UI - DISABLED
      // this.createInstallPrompt();
      console.log('PWA install prompt creation disabled');
    }
  }

  createInstallPrompt() {
    // PWA Install Prompt Creation COMPLETELY DISABLED
    console.log('PWA install prompt creation completely disabled');
    return;
    
    /*
    // Remove existing prompt if any
    const existingPrompt = document.getElementById('pwa-install-prompt');
    if (existingPrompt) {
      existingPrompt.remove();
    }

    const prompt = document.createElement('div');
    prompt.id = 'pwa-install-prompt';
    prompt.innerHTML = `
      <div class="pwa-install-prompt">
        <div class="pwa-install-content">
          <div class="pwa-install-icon">📱</div>
          <div class="pwa-install-text">
            <h3>Install Streamr</h3>
            <p>Get the full app experience with offline support and faster loading</p>
          </div>
          <div class="pwa-install-actions">
            <button class="pwa-install-btn" onclick="window.pwaRegistration.installApp()">
              Install
            </button>
            <button class="pwa-dismiss-btn" onclick="window.pwaRegistration.hideInstallPrompt()">
              Not Now
            </button>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .pwa-install-prompt {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border: 1px solid #475569;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideUp 0.3s ease-out;
        max-width: 400px;
        margin: 0 auto;
      }
      
      .pwa-install-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
      }
      
      .pwa-install-icon {
        font-size: 48px;
        margin-bottom: 8px;
      }
      
      .pwa-install-text h3 {
        margin: 0;
        color: white;
        font-size: 18px;
        font-weight: 600;
      }
      
      .pwa-install-text p {
        margin: 0;
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .pwa-install-actions {
        display: flex;
        gap: 12px;
        width: 100%;
      }
      
      .pwa-install-btn {
        flex: 1;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 20px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .pwa-install-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      }
      
      .pwa-dismiss-btn {
        flex: 1;
        background: transparent;
        color: #94a3b8;
        border: 1px solid #475569;
        border-radius: 8px;
        padding: 12px 20px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .pwa-dismiss-btn:hover {
        background: #475569;
        color: white;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @media (max-width: 480px) {
        .pwa-install-prompt {
          left: 16px;
          right: 16px;
          bottom: 16px;
        }
        
        .pwa-install-actions {
          flex-direction: column;
        }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(prompt);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideInstallPrompt();
    }, 10000);
    */
  }

  hideInstallPrompt() {
    const prompt = document.getElementById('pwa-install-prompt');
    if (prompt) {
      prompt.style.animation = 'slideDown 0.3s ease-in';
      setTimeout(() => prompt.remove(), 300);
    }
  }

  async installApp() {
    // PWA Install App Method COMPLETELY DISABLED
    console.log('PWA install app method completely disabled');
    return;
  }

  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="pwa-update-notification">
        <div class="pwa-update-content">
          <div class="pwa-update-icon">🔄</div>
          <div class="pwa-update-text">
            <h3>Update Available</h3>
            <p>A new version of Streamr is available</p>
          </div>
          <button class="pwa-update-btn" onclick="window.pwaRegistration.updateApp()">
            Update Now
          </button>
        </div>
      </div>
    `;

    // Add update notification styles
    const styles = document.createElement('style');
    styles.textContent = `
      .pwa-update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        border: 1px solid #10b981;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
      }
      
      .pwa-update-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .pwa-update-icon {
        font-size: 24px;
      }
      
      .pwa-update-text h3 {
        margin: 0;
        color: white;
        font-size: 16px;
        font-weight: 600;
      }
      
      .pwa-update-text p {
        margin: 0;
        color: #d1fae5;
        font-size: 12px;
      }
      
      .pwa-update-btn {
        background: white;
        color: #059669;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font-weight: 600;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      
      .pwa-update-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(notification);

    // Auto-hide after 15 seconds
    setTimeout(() => {
      this.hideUpdateNotification();
    }, 15000);
  }

  hideUpdateNotification() {
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }
  }

  updateApp() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  setupPushNotifications() {
    try {
      // Check if PushManager is supported
      if (!this.registration || !this.registration.pushManager) {
        console.log('PushManager not supported, skipping push notification setup');
        return;
      }

      // Request notification permission
      if (Notification.permission === 'default') {
        this.requestNotificationPermission();
      }

      // Subscribe to push notifications (only if permission is granted)
      if (Notification.permission === 'granted') {
        this.subscribeToPushNotifications();
      }
    } catch (error) {
      console.log('Push notification setup failed:', error);
      // Don't break the PWA setup if push notifications fail
    }
  }

  async requestNotificationPermission() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted');
        this.subscribeToPushNotifications();
      }
    } catch (error) {
      console.error('Notification permission request failed:', error);
    }
  }

  async subscribeToPushNotifications() {
    try {
      if (Notification.permission !== 'granted') return;

      // Check if VAPID key is available
      const vapidKey = PWA_CONFIG.VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.log('VAPID public key not configured, skipping push notification subscription');
        return;
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
      });

      console.log('Push notification subscription:', subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error('Push notification subscription failed:', error);
      // Don't throw the error, just log it to prevent breaking the PWA setup
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async sendSubscriptionToServer(subscription) {
    try {
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  setupBackgroundSync() {
    // Register background sync tags
    if (this.registration && this.registration.sync) {
      this.registerBackgroundSyncTags();
    }
  }

  async registerBackgroundSyncTags() {
    try {
      // Register periodic background sync
      if ('periodicSync' in navigator.serviceWorker) {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync'
        });

        if (status.state === 'granted') {
          await navigator.serviceWorker.ready;
          await navigator.serviceWorker.periodicSync.register('content-update', {
            minInterval: 24 * 60 * 60 * 1000 // 24 hours
          });
        }
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  initOfflineQueue() {
    // Initialize offline queue for actions that need to be synced
    this.offlineQueue = JSON.parse(localStorage.getItem('streamr-offline-queue') || '[]');
  }

  addToOfflineQueue(action) {
    this.offlineQueue.push({
      ...action,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });

    localStorage.setItem('streamr-offline-queue', JSON.stringify(this.offlineQueue));
  }

  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log('Processing offline queue:', this.offlineQueue.length, 'items');

    for (const item of this.offlineQueue) {
      try {
        await this.processOfflineItem(item);
        this.removeFromOfflineQueue(item.id);
      } catch (error) {
        console.error('Failed to process offline item:', item, error);
      }
    }
  }

  async processOfflineItem(item) {
    switch (item.type) {
      case 'watchlist':
        await this.syncWatchlistItem(item);
        break;
      case 'rating':
        await this.syncRating(item);
        break;
      case 'search':
        await this.syncSearchHistory(item);
        break;
      default:
        console.log('Unknown offline item type:', item.type);
    }
  }

  async syncWatchlistItem(item) {
    // Sync watchlist changes with server
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });
  }

  async syncRating(item) {
    // Sync rating changes with server
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });
  }

  async syncSearchHistory(item) {
    // Sync search history with server
    await fetch('/api/search-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });
  }

  removeFromOfflineQueue(id) {
    this.offlineQueue = this.offlineQueue.filter(item => item.id !== id);
    localStorage.setItem('streamr-offline-queue', JSON.stringify(this.offlineQueue));
  }

  updateNetworkStatus(isOnline) {
    // Update UI to show network status
    const event = new CustomEvent('networkStatusChanged', {
      detail: { isOnline }
    });
    window.dispatchEvent(event);
  }

  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data);
        break;
      case 'OFFLINE_QUEUE_PROCESSED':
        console.log('Offline queue processed:', data);
        break;
      case 'PUSH_NOTIFICATION_RECEIVED':
        this.handlePushNotification(data);
        break;
      default:
        console.log('Unknown service worker message:', type);
    }
  }

  handlePushNotification(data) {
    // Handle push notification data
    console.log('Push notification received:', data);
    
    // You can customize how to handle different types of notifications
    if (data.type === 'new_content') {
      this.showContentNotification(data);
    } else if (data.type === 'reminder') {
      this.showReminderNotification(data);
    }
  }

  showContentNotification(data) {
    // Show custom notification for new content
    const notification = new Notification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'content-notification',
      data: data
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      // Navigate to the content
      if (data.url) {
        window.location.href = data.url;
      }
    };
  }

  showReminderNotification(data) {
    // Show custom notification for reminders
    const notification = new Notification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'reminder-notification',
      data: data
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      // Navigate to the reminder content
      if (data.url) {
        window.location.href = data.url;
      }
    };
  }

  trackInstallation() {
    // Track installation analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'App Installation'
      });
    }

    // Send to your analytics endpoint
    fetch('/api/analytics/pwa-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      })
    }).catch(console.error);
  }

  // Public methods for external use
  async addToWatchlist(movieId, action = 'add') {
    const item = {
      type: 'watchlist',
      data: { movieId, action }
    };

    if (this.isOnline) {
      try {
        await this.syncWatchlistItem(item);
      } catch (error) {
        this.addToOfflineQueue(item);
      }
    } else {
      this.addToOfflineQueue(item);
    }
  }

  async addRating(movieId, rating) {
    const item = {
      type: 'rating',
      data: { movieId, rating }
    };

    if (this.isOnline) {
      try {
        await this.syncRating(item);
      } catch (error) {
        this.addToOfflineQueue(item);
      }
    } else {
      this.addToOfflineQueue(item);
    }
  }

  async addSearchHistory(query) {
    const item = {
      type: 'search',
      data: { query }
    };

    if (this.isOnline) {
      try {
        await this.syncSearchHistory(item);
      } catch (error) {
        this.addToOfflineQueue(item);
      }
    } else {
      this.addToOfflineQueue(item);
    }
  }

  getOfflineQueue() {
    return this.offlineQueue;
  }

  clearOfflineQueue() {
    this.offlineQueue = [];
    localStorage.removeItem('streamr-offline-queue');
  }

  isAppInstalled() {
    return this.isInstalled;
  }

  isNetworkOnline() {
    return this.isOnline;
  }

  // Manual method to setup push notifications when needed
  async setupPushNotificationsManually() {
    try {
      if (this.registration && this.registration.pushManager) {
        await this.setupPushNotifications();
      }
    } catch (error) {
      console.log('Manual push notification setup failed:', error);
    }
  }
}

// Create global instance
const pwaRegistration = new EnhancedServiceWorkerRegistration();

// Expose globally for external use
window.pwaRegistration = pwaRegistration;

export default pwaRegistration; 