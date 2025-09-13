// PWA Installation Test Script
// Run this in the browser console to debug PWA installation

console.log('🔍 PWA Installation Debug Script Started');

// Check PWA support
const pwaSupport = {
  serviceWorker: 'serviceWorker' in navigator,
  pushManager: 'PushManager' in window,
  notifications: 'Notification' in window,
  beforeInstallPrompt: 'onbeforeinstallprompt' in window,
  getInstalledRelatedApps: 'getInstalledRelatedApps' in navigator,
  standalone: window.navigator.standalone,
  displayMode: window.matchMedia('(display-mode: standalone)').matches
};

console.log('📱 PWA Support:', pwaSupport);

// Check current state
const currentState = {
  deferredPrompt: !!window.deferredPrompt,
  deferredPromptType: window.deferredPrompt?.constructor?.name,
  swController: !!navigator.serviceWorker.controller,
  swReady: !!navigator.serviceWorker.ready,
  notificationPermission: Notification.permission,
  isInstalled: pwaSupport.displayMode || pwaSupport.standalone
};

console.log('🔧 Current State:', currentState);

// Check manifest
const manifest = {
  link: !!document.querySelector('link[rel="manifest"]'),
  href: document.querySelector('link[rel="manifest"]')?.href,
  icons: document.querySelectorAll('link[rel*="icon"]').length
};

console.log('📄 Manifest:', manifest);

// Check environment
const environment = {
  protocol: window.location.protocol,
  hostname: window.location.hostname,
  isHTTPS: window.location.protocol === 'https:',
  isLocalhost: window.location.hostname === 'localhost',
  userAgent: navigator.userAgent.substring(0, 100) + '...'
};

console.log('🌐 Environment:', environment);

// Test functions
window.testPWAInstall = {
  // Check if deferredPrompt exists
  checkDeferredPrompt: () => {
    console.log('🔍 Checking deferredPrompt...');
    if (window.deferredPrompt) {
      console.log('✅ Found deferredPrompt:', window.deferredPrompt);
      return true;
    } else {
      console.log('❌ No deferredPrompt found');
      return false;
    }
  },

  // Try to trigger install prompt
  triggerInstall: async () => {
    console.log('🚀 Attempting to trigger install prompt...');
    if (window.deferredPrompt) {
      try {
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        console.log('📱 Install prompt outcome:', outcome);
        return outcome;
      } catch (error) {
        console.error('❌ Error triggering install:', error);
        return 'error';
      }
    } else {
      console.log('❌ No deferredPrompt available');
      return 'no-prompt';
    }
  },

  // Clear deferredPrompt
  clearPrompt: () => {
    console.log('🧹 Clearing deferredPrompt...');
    window.deferredPrompt = null;
    console.log('✅ deferredPrompt cleared');
  },

  // Check service worker
  checkServiceWorker: async () => {
    console.log('🔧 Checking service worker...');
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service worker ready:', registration);
        return registration;
      } catch (error) {
        console.error('❌ Service worker error:', error);
        return null;
      }
    } else {
      console.log('❌ Service worker not supported');
      return null;
    }
  },

  // Simulate beforeinstallprompt event
  simulateBeforeInstallPrompt: () => {
    console.log('🎭 Simulating beforeinstallprompt event...');
    const event = new Event('beforeinstallprompt');
    event.preventDefault = () => {};
    event.prompt = () => console.log('Prompt called');
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    
    window.deferredPrompt = event;
    console.log('✅ Simulated event stored');
    return event;
  },

  // Get all debug info
  getDebugInfo: () => {
    return {
      pwaSupport,
      currentState,
      manifest,
      environment,
      timestamp: new Date().toISOString()
    };
  }
};

console.log('🧪 Test functions available on window.testPWAInstall');
console.log('📋 Use testPWAInstall.getDebugInfo() to see all info');
console.log('🚀 Use testPWAInstall.triggerInstall() to test installation');

// Listen for beforeinstallprompt event
if (pwaSupport.beforeInstallPrompt) {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('🎯 beforeinstallprompt event fired!');
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('✅ Deferred prompt stored globally');
  });
}

// Listen for appinstalled event
window.addEventListener('appinstalled', () => {
  console.log('🎉 App installed successfully!');
});

console.log('🎯 Listening for PWA events...');
console.log('🔍 Debug script ready! Check console for details.'); 