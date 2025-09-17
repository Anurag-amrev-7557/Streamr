// PWA Configuration
export const PWA_CONFIG = {
  // VAPID keys for push notifications
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY || null,
  
  // PWA settings
  APP_NAME: import.meta.env.VITE_PWA_NAME || 'Streamr',
  APP_SHORT_NAME: import.meta.env.VITE_PWA_SHORT_NAME || 'Streamr',
  APP_DESCRIPTION: import.meta.env.VITE_PWA_DESCRIPTION || 'Your Ultimate Streaming Platform',
  
  // Feature flags
  ENABLE_PUSH_NOTIFICATIONS: !!import.meta.env.VITE_VAPID_PUBLIC_KEY,
  ENABLE_BACKGROUND_SYNC: true,
  ENABLE_PERIODIC_SYNC: true,
  
  // Cache settings
  CACHE_VERSION: 'v3',
  STATIC_CACHE_NAME: 'streamr-static-v3',
  API_CACHE_NAME: 'streamr-api-v3',
  IMAGE_CACHE_NAME: 'streamr-images-v3',
  PREDICTIVE_CACHE_NAME: 'streamr-predictive-v3',
  
  // Service worker settings
  SW_SCOPE: '/',
  SW_UPDATE_VIA_CACHE: 'none',
  
  // Offline settings
  OFFLINE_PAGE: '/offline.html',
  MAX_OFFLINE_QUEUE_SIZE: 100,
  
  // Performance settings
  PREDICTIVE_PREFETCH_DELAY: 1000,
  BACKGROUND_SYNC_DELAY: 1000,
  CACHE_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
};

// Helper function to check if PWA features are supported
export const PWA_SUPPORT = {
  serviceWorker: 'serviceWorker' in navigator,
  pushManager: 'PushManager' in window,
  backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
  periodicSync: 'periodicSync' in navigator.serviceWorker,
  notifications: 'Notification' in window,
  installPrompt: 'onbeforeinstallprompt' in window,
};

// Helper function to get PWA status
export const getPWAStatus = () => {
  return {
    isSupported: PWA_SUPPORT.serviceWorker,
    features: PWA_SUPPORT,
    config: PWA_CONFIG,
    isConfigured: !!PWA_CONFIG.VAPID_PUBLIC_KEY,
  };
};

// Export default config
export default PWA_CONFIG; 