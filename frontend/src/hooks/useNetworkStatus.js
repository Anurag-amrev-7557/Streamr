import { useState, useEffect } from 'react';

/**
 * Hook to monitor network status
 * Returns online status and connection type
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [effectiveType, setEffectiveType] = useState('4g');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection && connection.effectiveType) {
        setEffectiveType(connection.effectiveType);
        
        const handleConnectionChange = () => {
          if (connection.effectiveType) {
            setEffectiveType(connection.effectiveType);
          }
        };
        
        connection.addEventListener('change', handleConnectionChange);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          connection.removeEventListener('change', handleConnectionChange);
        };
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, effectiveType };
};
