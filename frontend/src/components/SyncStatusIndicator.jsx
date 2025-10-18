import React, { useState, useEffect } from 'react';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';
import { userAPI } from '../services/api';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const SyncStatusIndicator = () => {
  const { 
    isSyncing: watchlistSyncing, 
    syncError: watchlistError, 
    lastBackendSync: watchlistLastSync,
    forceSync: forceWatchlistSync,
    forceLoad: forceWatchlistLoad,
    refreshFromBackend: refreshWatchlistFromBackend
  } = useWatchlist();
  
  const { 
    isSyncing: historySyncing, 
    syncError: historyError, 
    lastBackendSync: historyLastSync,
    forceSync: forceHistorySync,
    forceLoad: forceHistoryLoad,
    refreshFromBackend: refreshHistoryFromBackend
  } = useWatchHistory();
  
  const [syncStatus, setSyncStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Check sync status from backend
  const checkSyncStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const response = await userAPI.getSyncStatus();
      if (response.success) {
        setSyncStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Refresh all data from backend
  const refreshAllFromBackend = async () => {
    try {
      setIsCheckingStatus(true);
      console.log('Refreshing all data from backend...');
      
      // Refresh watchlist
      if (refreshWatchlistFromBackend) {
        await refreshWatchlistFromBackend();
      }
      
      // Refresh watch history
      if (refreshHistoryFromBackend) {
        await refreshHistoryFromBackend();
      }
      
      console.log('All data refreshed from backend');
    } catch (error) {
      console.error('Failed to refresh all data:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Check status on mount and when sync operations complete
  useEffect(() => {
    checkSyncStatus();
  }, [watchlistLastSync, historyLastSync]);

  // Determine overall sync status
  const getOverallStatus = () => {
    if (watchlistSyncing || historySyncing || isCheckingStatus) {
      return 'syncing';
    }
    
    if (watchlistError || historyError) {
      return 'error';
    }
    
    if (watchlistLastSync && historyLastSync) {
      return 'synced';
    }
    
    return 'unknown';
  };

  const overallStatus = getOverallStatus();

  // Format last sync time
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (overallStatus) {
      case 'syncing':
        return <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />;
      case 'synced':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (overallStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'error':
        return 'Sync Error';
      default:
        return 'Unknown Status';
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (overallStatus) {
      case 'syncing':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'synced':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  // Handle force sync for watchlist
  const handleForceWatchlistSync = async () => {
    try {
      await forceWatchlistSync();
      await checkSyncStatus();
    } catch (error) {
      console.error('Force watchlist sync failed:', error);
    }
  };

  // Handle force load for watchlist
  const handleForceWatchlistLoad = async () => {
    try {
      await forceWatchlistLoad();
      await checkSyncStatus();
    } catch (error) {
      console.error('Force watchlist load failed:', error);
    }
  };

  // Handle force sync for watch history
  const handleForceHistorySync = async () => {
    try {
      await forceHistorySync();
      await checkSyncStatus();
    } catch (error) {
      console.error('Force history sync failed:', error);
    }
  };

  // Handle force load for watch history
  const handleForceHistoryLoad = async () => {
    try {
      await forceHistoryLoad();
      await checkSyncStatus();
    } catch (error) {
      console.error('Force history load failed:', error);
    }
  };

  return (
    <div className="relative">
      {/* Main sync status indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${getStatusColor()} hover:opacity-80`}
        title="Click to view sync details"
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {overallStatus === 'syncing' && (
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
        )}
      </button>

      {/* Detailed sync status panel */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Watchlist Status */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Watchlist</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Status:</span>
                  <span className={`inline-flex items-center gap-1 ${
                    watchlistSyncing ? 'text-blue-600' : 
                    watchlistError ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {watchlistSyncing ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Syncing...
                      </>
                    ) : watchlistError ? (
                      <>
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Error
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        Synced
                      </>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Last Sync:</span>
                  <span className="text-gray-600">
                    {formatLastSync(watchlistLastSync)}
                  </span>
                </div>

                {watchlistError && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {watchlistError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleForceWatchlistSync}
                    disabled={watchlistSyncing}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    Force Sync
                  </button>
                  <button
                    onClick={handleForceWatchlistLoad}
                    disabled={watchlistSyncing}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    Force Load
                  </button>
                </div>
              </div>
            </div>

            {/* Watch History Status */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Watch History</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Status:</span>
                  <span className={`inline-flex items-center gap-1 ${
                    historySyncing ? 'text-blue-600' : 
                    historyError ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {historySyncing ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Syncing...
                      </>
                    ) : historyError ? (
                      <>
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Error
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        Synced
                      </>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Last Sync:</span>
                  <span className="text-gray-600">
                    {formatLastSync(historyLastSync)}
                  </span>
                </div>

                {historyError && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {historyError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleForceHistorySync}
                    disabled={historySyncing}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    Force Sync
                  </button>
                  <button
                    onClick={handleForceHistoryLoad}
                    disabled={historySyncing}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    Force Load
                  </button>
                </div>
              </div>
            </div>

            {/* Backend Status */}
            {syncStatus && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Backend Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Watchlist Items:</span>
                    <span className="text-gray-600">{syncStatus.watchlist.count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>History Items:</span>
                    <span className="text-gray-600">{syncStatus.watchHistory.count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Backend Update:</span>
                    <span className="text-gray-600">
                      {formatLastSync(syncStatus.lastSync)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Refresh All Button */}
            <div className="flex justify-center mb-3">
              <button
                onClick={refreshAllFromBackend}
                disabled={isCheckingStatus}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 flex items-center gap-2"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                Refresh All Data
              </button>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-center">
              <button
                onClick={checkSyncStatus}
                disabled={isCheckingStatus}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
