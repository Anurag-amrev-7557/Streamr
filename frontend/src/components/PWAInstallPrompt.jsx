import React, { useState, useEffect } from 'react';
import { DevicePhoneMobileIcon, XMarkIcon, WifiIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkInstallationStatus = async () => {
    try {
      // Check if app is already installed
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      
      setIsInstalled(isStandalone || isIOSStandalone);
      
      if (isStandalone || isIOSStandalone) {
        console.log('App is already installed');
        setShowPrompt(false);
      }
    } catch (error) {
      console.log('Could not check installation status:', error);
    }
  };

  const handleInstall = async () => {
    console.log('handleInstall called, deferredPrompt:', deferredPrompt);
    
    if (deferredPrompt) {
      try {
        console.log('Triggering install prompt...');
        
        // Show the native install prompt
        deferredPrompt.prompt();
        
        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt outcome:', outcome);
        
        if (outcome === 'accepted') {
          console.log('PWA installation accepted!');
          // The appinstalled event will handle the rest
        } else {
          console.log('PWA installation dismissed');
        }
        
        // Clear the deferred prompt
        setDeferredPrompt(null);
        setShowPrompt(false);
        
      } catch (error) {
        console.error('Error during PWA installation:', error);
        // Don't clear the prompt on error, let user try again
      }
    } else {
      console.log('No deferred prompt available');
      // Try to get it from window
      if (window.deferredPrompt) {
        console.log('Found deferredPrompt on window, using that');
        try {
          window.deferredPrompt.prompt();
          const { outcome } = await window.deferredPrompt.userChoice;
          console.log('Window deferredPrompt outcome:', outcome);
          window.deferredPrompt = null;
        } catch (error) {
          console.error('Error with window.deferredPrompt:', error);
        }
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    
    // Show again after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-prompt-dismissed');
      setIsDismissed(false);
    }, 7 * 24 * 60 * 60 * 1000);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  useEffect(() => {
    // Check if already installed
    checkInstallationStatus();
    
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      
      // Store both locally and globally
      setDeferredPrompt(e);
      window.deferredPrompt = e;
      setShowPrompt(true);
      console.log('Deferred prompt stored and prompt shown');
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('App installed successfully');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    };

    // Check if prompt was previously dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // Check if we already have a deferred prompt (e.g., from page refresh)
    if (window.deferredPrompt) {
      console.log('Found existing deferred prompt on window');
      setDeferredPrompt(window.deferredPrompt);
      setShowPrompt(true);
    }

    // Also check if we have one stored in state from a previous render
    if (deferredPrompt) {
      console.log('Found existing deferred prompt in state');
      setShowPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Debug logging
  console.log('PWAInstallPrompt render state:', {
    isInstalled,
    isDismissed,
    hasDeferredPrompt: !!deferredPrompt,
    showPrompt,
    deferredPromptType: deferredPrompt?.constructor?.name,
    windowDeferredPrompt: !!window.deferredPrompt
  });

  // Don't show if already installed, dismissed, or no prompt available
  if (isInstalled || isDismissed || (!deferredPrompt && !window.deferredPrompt) || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Install Streamr</h3>
              <p className="text-sm text-slate-300">Get the full app experience</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <WifiIcon className="w-4 h-4 text-green-400" />
            </div>
            <span>Offline support & faster loading</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <CloudArrowDownIcon className="w-4 h-4 text-blue-400" />
            </div>
            <span>Push notifications for new content</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <DevicePhoneMobileIcon className="w-4 h-4 text-purple-400" />
            </div>
            <span>App-like experience on your device</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleInstall}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
          >
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-3 text-slate-400 hover:text-white font-medium transition-colors"
          >
            Not Now
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-500 text-center mt-4">
          Tap "Install" to add Streamr to your home screen
        </p>
      </div>
    </div>
  );
};

export default PWAInstallPrompt; 