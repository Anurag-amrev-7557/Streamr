import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkBasicConnectivity, checkApiConnectivity, getNetworkStatus } from '../utils/networkUtils';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [networkStats, setNetworkStats] = useState(null);

  useEffect(() => {
    const isMountedRef = useRef(true);
    let timeoutId = null;
    
    // Check if we're in preview mode
    const isPreview = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.port === '4173'; // Vite preview port
    setIsPreviewMode(isPreview);

    const handleOnline = () => {
      if (!isMountedRef.current) return;
      
      setIsOnline(true);
      setShowStatus(true);
      timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          setShowStatus(false);
        }
      }, 3000);
    };

    const handleOffline = () => {
      if (!isMountedRef.current) return;
      
      setIsOnline(false);
      setShowStatus(true);
    };

    // Test network connectivity more thoroughly
    const testNetwork = async () => {
      if (!isMountedRef.current) return;
      
      try {
        // First check basic connectivity
        const basicOnline = checkBasicConnectivity();
        if (!basicOnline) {
          if (isMountedRef.current) {
            setIsOnline(false);
          }
          return;
        }
        
        // Then check API connectivity
        const apiOnline = await checkApiConnectivity();
        if (isMountedRef.current) {
          setIsOnline(apiOnline);
        }
      } catch (error) {
        console.log('Network test failed:', error);
        if (isMountedRef.current) {
          setIsOnline(false);
        }
      }
    };

    // Initial network test
    testNetwork();

    // Set up event listeners
    const onlineHandler = handleOnline;
    const offlineHandler = handleOffline;
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    // Test network periodically
    const interval = setInterval(testNetwork, 10000);
    
    // Update network stats periodically
    const statsInterval = setInterval(() => {
      if (isMountedRef.current) {
        setNetworkStats(getNetworkStatus());
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, []);

  // Don't show offline status in preview mode unless we're actually offline
  if (isPreviewMode && isOnline) {
    return null;
  }

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
            isOnline 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-200' : 'bg-red-200'
            }`} />
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {networkStats && (
              <span className="text-xs opacity-75">
                {networkStats.connectionType !== 'unknown' && `(${networkStats.connectionType})`}
                {networkStats.rtt && `(${networkStats.rtt}ms)`}
              </span>
            )}
            {isPreviewMode && (
              <span className="text-xs opacity-75">(Preview Mode)</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatus; 