import React, { useState, useEffect } from 'react';
import { 
  DevicePhoneMobileIcon, 
  WifiIcon, 
  WifiIcon as WifiOffIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const PWAStatus = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [cacheStatus, setCacheStatus] = useState({});

  useEffect(() => {
    checkInstallationStatus();
    checkOfflineQueue();
    checkCacheStatus();
    
    // Listen for network changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for custom network status events
    const handleNetworkStatusChange = (event) => {
      setIsOnline(event.detail.isOnline);
    };
    
    window.addEventListener('networkStatusChanged', handleNetworkStatusChange);
    
    // Check status periodically
    const interval = setInterval(() => {
      checkOfflineQueue();
      checkCacheStatus();
    }, 30000); // Every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('networkStatusChanged', handleNetworkStatusChange);
      clearInterval(interval);
    };
  }, []);

  const checkInstallationStatus = async () => {
    try {
      if ('getInstalledRelatedApps' in navigator) {
        const relatedApps = await navigator.getInstalledRelatedApps();
        setIsInstalled(relatedApps.length > 0);
      }
    } catch (error) {
      console.log('Could not check installation status:', error);
    }
  };

  const checkOfflineQueue = () => {
    try {
      const queue = JSON.parse(localStorage.getItem('streamr-offline-queue') || '[]');
      setOfflineQueueCount(queue.length);
    } catch (error) {
      console.log('Could not check offline queue:', error);
    }
  };

  const checkCacheStatus = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const status = {};
        
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          status[name] = keys.length;
        }
        
        setCacheStatus(status);
      }
    } catch (error) {
      console.log('Could not check cache status:', error);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-400';
    if (offlineQueueCount > 0) return 'text-yellow-400';
    if (isInstalled) return 'text-green-400';
    return 'text-blue-400';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOffIcon className="w-5 h-5" />;
    if (offlineQueueCount > 0) return <ExclamationTriangleIcon className="w-5 h-5" />;
    if (isInstalled) return <CheckCircleIcon className="w-5 h-5" />;
    return <InformationCircleIcon className="w-5 h-5" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (offlineQueueCount > 0) return `${offlineQueueCount} pending`;
    if (isInstalled) return 'Installed';
    return 'Ready to install';
  };

  const handleSyncOfflineQueue = async () => {
    if (window.pwaRegistration && typeof window.pwaRegistration.processOfflineQueue === 'function') {
      await window.pwaRegistration.processOfflineQueue();
      checkOfflineQueue();
    }
  };

  const handleClearCache = async () => {
    if (window.pwaRegistration && typeof window.pwaRegistration.clearOfflineQueue === 'function') {
      window.pwaRegistration.clearOfflineQueue();
      checkOfflineQueue();
      checkCacheStatus();
    }
  };

  const getCacheSummary = () => {
    const total = Object.values(cacheStatus).reduce((sum, count) => sum + count, 0);
    return total > 0 ? `${total} items` : 'No cached items';
  };

  return (
    <div className="relative">
      {/* Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors ${getStatusColor()}`}
        title="PWA Status"
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </button>

      {/* Details Panel */}
      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">PWA Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            {/* Installation Status */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DevicePhoneMobileIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-slate-300">Installation</span>
                </div>
                <span className={`text-sm font-medium ${isInstalled ? 'text-green-400' : 'text-blue-400'}`}>
                  {isInstalled ? 'Installed' : 'Not Installed'}
                </span>
              </div>

              {/* Network Status */}
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <WifiIcon className="w-5 h-5 text-green-400" />
                  ) : (
                    <WifiOffIcon className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-sm text-slate-300">Network</span>
                </div>
                <span className={`text-sm font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Offline Queue */}
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CloudArrowDownIcon className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-slate-300">Offline Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${offlineQueueCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {offlineQueueCount} items
                  </span>
                  {offlineQueueCount > 0 && (
                    <button
                      onClick={handleSyncOfflineQueue}
                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                    >
                      Sync
                    </button>
                  )}
                </div>
              </div>

              {/* Cache Status */}
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CloudArrowDownIcon className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-slate-300">Cache</span>
                </div>
                <span className="text-sm text-slate-300">{getCacheSummary()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-600">
              <button
                onClick={handleClearCache}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm py-2 px-3 rounded-lg transition-colors"
              >
                Clear Cache
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm py-2 px-3 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-600">
              <p className="text-xs text-slate-500 text-center">
                {isInstalled 
                  ? 'Streamr is installed as a PWA'
                  : 'Install Streamr for the best experience'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAStatus; 