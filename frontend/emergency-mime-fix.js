/**
 * Emergency MIME Type Fix Script
 * Run this immediately in the browser console to fix MIME type issues
 */

console.log('🚨 Emergency MIME type fix script running...');

// Emergency fix function
async function emergencyMimeTypeFix() {
  try {
    console.log('🔄 Starting emergency MIME type fix...');
    
    // Step 1: Force unregister all service workers
    if ('serviceWorker' in navigator) {
      console.log('📋 Step 1: Unregistering all service workers...');
      
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ Unregistered:', registration.scope);
      }
      
      // Clear all caches
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('✅ Cleared cache:', cacheName);
      }
    }
    
    // Step 2: Clear localStorage
    console.log('📋 Step 2: Clearing service worker preferences...');
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('sw') || key && key.includes('service')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('✅ Removed localStorage key:', key);
      });
    }
    
    // Step 3: Force reload the page
    console.log('📋 Step 3: Reloading page to apply fixes...');
    console.log('🔄 Page will reload in 3 seconds...');
    
    setTimeout(() => {
      window.location.reload(true);
    }, 3000);
    
    return true;
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    return false;
  }
}

// Alternative fix: Disable service worker completely
async function disableServiceWorkerCompletely() {
  try {
    console.log('🔄 Completely disabling service worker...');
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    
    // Set flag to prevent future registrations
    if (typeof window !== 'undefined') {
      window.__SERVICE_WORKER_DISABLED__ = true;
      localStorage.setItem('streamr_sw_disabled', 'true');
      localStorage.setItem('streamr_sw_disabled_timestamp', Date.now().toString());
    }
    
    console.log('✅ Service worker completely disabled');
    console.log('💡 The app will work without offline functionality');
    console.log('💡 To re-enable later, clear localStorage and refresh');
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to disable service worker:', error);
    return false;
  }
}

// Quick status check
async function quickStatusCheck() {
  console.log('🔍 Quick Status Check:');
  
  // Check service worker status
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    console.log('Service Worker Registered:', !!registration);
    
    if (registration) {
      console.log('Service Worker Active:', !!registration.active);
      console.log('Service Worker Script:', registration.active?.scriptURL);
    }
  } else {
    console.log('Service Worker Supported: No');
  }
  
  // Check for MIME type errors in console
  const originalError = console.error;
  let mimeErrors = 0;
  
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('MIME type') || message.includes('Expected a JavaScript')) {
      mimeErrors++;
    }
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    console.error = originalError;
    console.log('MIME Type Errors Detected:', mimeErrors);
  }, 2000);
}

// Export functions
window.emergencyMimeFix = {
  fix: emergencyMimeTypeFix,
  disable: disableServiceWorkerCompletely,
  status: quickStatusCheck
};

console.log('🚨 Emergency MIME type fix functions loaded!');
console.log('💡 Run emergencyMimeFix.fix() to apply emergency fix');
console.log('💡 Run emergencyMimeFix.disable() to completely disable service worker');
console.log('💡 Run emergencyMimeFix.status() for quick status check');

// Auto-run status check
setTimeout(() => {
  emergencyMimeFix.status();
}, 1000); 