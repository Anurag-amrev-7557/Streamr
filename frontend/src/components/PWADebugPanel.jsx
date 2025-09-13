import React, { useState, useEffect } from 'react';

const PWADebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    updateDebugInfo();
    
    // Update debug info periodically
    const interval = setInterval(updateDebugInfo, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const updateDebugInfo = () => {
    const info = {
      // PWA Support
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notifications: 'Notification' in window,
      beforeInstallPrompt: 'onbeforeinstallprompt' in window,
      
      // Current State
      deferredPrompt: !!window.deferredPrompt,
      deferredPromptType: window.deferredPrompt?.constructor?.name,
      notificationPermission: Notification.permission,
      
      // Service Worker
      swRegistered: !!navigator.serviceWorker.controller,
      swReady: !!navigator.serviceWorker.ready,
      
      // Installation Status
      isInstalled: window.matchMedia('(display-mode: standalone)').matches || 
                   window.navigator.standalone === true,
      
      // Manifest
      manifest: !!document.querySelector('link[rel="manifest"]'),
      manifestHref: document.querySelector('link[rel="manifest"]')?.href,
      
      // Icons
      icons: document.querySelectorAll('link[rel*="icon"]').length,
      
      // Environment
      isLocalhost: window.location.hostname === 'localhost',
      isHTTPS: window.location.protocol === 'https:',
      userAgent: navigator.userAgent.substring(0, 50) + '...',
    };
    
    setDebugInfo(info);
  };

  const testInstallPrompt = () => {
    if (window.deferredPrompt) {
      console.log('Testing install prompt...');
      window.deferredPrompt.prompt();
    } else {
      console.log('No deferred prompt available');
    }
  };

  const clearDeferredPrompt = () => {
    window.deferredPrompt = null;
    updateDebugInfo();
  };

  const triggerBeforeInstallPrompt = () => {
    // Simulate the beforeinstallprompt event
    const event = new Event('beforeinstallprompt');
    event.preventDefault = () => {};
    event.prompt = () => console.log('Prompt called');
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    
    window.deferredPrompt = event;
    updateDebugInfo();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium"
      >
        🐛 PWA Debug
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md bg-slate-900 border border-slate-600 rounded-lg shadow-2xl p-4 text-white text-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">🐛 PWA Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <div>
          <h4 className="font-medium text-blue-400 mb-2">🔧 PWA Support</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Service Worker:</span>
              <span className={debugInfo.serviceWorker ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.serviceWorker ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Push Manager:</span>
              <span className={debugInfo.pushManager ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.pushManager ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Notifications:</span>
              <span className={debugInfo.notifications ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.notifications ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Install Prompt:</span>
              <span className={debugInfo.beforeInstallPrompt ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.beforeInstallPrompt ? '✅' : '❌'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-green-400 mb-2">📱 Current State</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Deferred Prompt:</span>
              <span className={debugInfo.deferredPrompt ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.deferredPrompt ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Prompt Type:</span>
              <span className="text-slate-300">{debugInfo.deferredPromptType || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span>Notification Permission:</span>
              <span className="text-slate-300">{debugInfo.notificationPermission}</span>
            </div>
            <div className="flex justify-between">
              <span>Is Installed:</span>
              <span className={debugInfo.isInstalled ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.isInstalled ? '✅' : '❌'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-yellow-400 mb-2">🌐 Environment</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>HTTPS:</span>
              <span className={debugInfo.isHTTPS ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.isHTTPS ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Localhost:</span>
              <span className={debugInfo.isLocalhost ? 'text-yellow-400' : 'text-blue-400'}>
                {debugInfo.isLocalhost ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Manifest:</span>
              <span className={debugInfo.manifest ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.manifest ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Icons:</span>
              <span className="text-slate-300">{debugInfo.icons}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-purple-400 mb-2">🧪 Actions</h4>
          <div className="space-y-2">
            <button
              onClick={testInstallPrompt}
              disabled={!debugInfo.deferredPrompt}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-xs"
            >
              Test Install Prompt
            </button>
            <button
              onClick={clearDeferredPrompt}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-xs"
            >
              Clear Deferred Prompt
            </button>
            <button
              onClick={triggerBeforeInstallPrompt}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-xs"
            >
              Simulate Install Prompt
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400 pt-2 border-t border-slate-600">
          <p>User Agent: {debugInfo.userAgent}</p>
          <p>Manifest: {debugInfo.manifestHref || 'Not found'}</p>
        </div>
      </div>

      <button
        onClick={updateDebugInfo}
        className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs"
      >
        🔄 Refresh Debug Info
      </button>
    </div>
  );
};

export default PWADebugPanel; 