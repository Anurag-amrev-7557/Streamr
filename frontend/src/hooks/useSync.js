import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import syncService from '../services/syncService';

/**
 * Custom hook for managing data synchronization between localStorage and backend
 * @returns {Object} Sync functionality and status
 */
export const useSync = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    queueLength: 0,
    lastSyncTime: null,
    retryCount: 0,
    isOnline: navigator.onLine
  });

  // Update sync status periodically
  useEffect(() => {
    if (!user) return;

    const updateStatus = () => {
      setSyncStatus(syncService.getSyncStatus());
    };

    // Update immediately
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Force immediate sync
  const forceSync = useCallback(async () => {
    if (!user || !navigator.onLine) {
      throw new Error('User not authenticated or offline');
    }

    try {
      await syncService.forceSync();
      setSyncStatus(syncService.getSyncStatus());
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }, [user]);

  // Queue sync for specific data type
  const queueSync = useCallback((dataType) => {
    if (!user) return;
    syncService.queueSync(dataType);
  }, [user]);

  // Get last sync time for specific data type
  const getLastSyncTime = useCallback((dataType) => {
    return syncService.getLastSyncTime(dataType);
  }, []);

  return {
    // Sync status
    isSyncing: syncStatus.isSyncing,
    queueLength: syncStatus.queueLength,
    lastSyncTime: syncStatus.lastSyncTime,
    retryCount: syncStatus.retryCount,
    isOnline: syncStatus.isOnline,
    
    // Sync functions
    forceSync,
    queueSync,
    getLastSyncTime,
    
    // Raw status object
    syncStatus
  };
};

export default useSync;
