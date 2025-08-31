import React, { useState } from 'react';
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  WifiIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';
import { useSync } from '../hooks/useSync';
import { useAuth } from '../contexts/AuthContext';

/**
 * Sync Indicator Component
 * Shows the current synchronization status between localStorage and backend
 */
const SyncIndicator = ({ className = '' }) => {
  const { user } = useAuth();
  const { 
    isSyncing, 
    queueLength, 
    lastSyncTime, 
    retryCount, 
    isOnline,
    forceSync 
  } = useSync();
  
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diff = now - new Date(lastSyncTime);
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Get status color and icon
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        icon: NoSymbolIcon,
        text: 'Offline'
      };
    }
    
    if (isSyncing) {
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        icon: ArrowPathIcon,
        text: 'Syncing...'
      };
    }
    
    if (retryCount > 0) {
      return {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        icon: ExclamationTriangleIcon,
        text: `Retry ${retryCount}`
      };
    }
    
    if (lastSyncTime) {
      return {
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        icon: CheckCircleIcon,
        text: 'Synced'
      };
    }
    
    return {
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      icon: WifiIcon,
      text: 'Ready'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Handle force sync
  const handleForceSync = async () => {
    try {
      await forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main sync indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
          ${statusInfo.bgColor} hover:bg-opacity-80 cursor-pointer
          ${isSyncing ? 'animate-pulse' : ''}
        `}
        disabled={isSyncing}
        title="Click to view sync details"
      >
        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
        
        {/* Queue indicator */}
        {queueLength > 0 && (
          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
            {queueLength}
          </span>
        )}
      </button>

      {/* Sync details dropdown */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Sync Status</h3>
              <button
                onClick={handleForceSync}
                disabled={isSyncing || !isOnline}
                className={`
                  flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium
                  ${isSyncing || !isOnline 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  }
                  transition-colors duration-200
                `}
              >
                <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>

            {/* Status details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${statusInfo.color}`}>
                  {statusInfo.text}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Sync:</span>
                <span className="font-medium text-gray-900">
                  {formatLastSync()}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Queue:</span>
                <span className="font-medium text-gray-900">
                  {queueLength} items
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Network:</span>
                <span className={`font-medium ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {retryCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Retry Count:</span>
                  <span className="font-medium text-yellow-600">
                    {retryCount} attempts
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar for syncing */}
            {isSyncing && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            )}

            {/* Help text */}
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
              Data automatically syncs every 5 minutes when online. 
              Click "Sync Now" to sync immediately.
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};

export default SyncIndicator;
