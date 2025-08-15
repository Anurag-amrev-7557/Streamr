import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersIcon } from '@heroicons/react/24/outline';
import { socketService } from '../services/socketService';
import { getApiUrl } from '../config/api';

const ActiveUsers = ({ className = '' }) => {
  const [activeUsers, setActiveUsers] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [connectionStats, setConnectionStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  // Enhanced fetch function with better error handling and retry logic
  const fetchActiveUsers = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setIsLoading(true);
      }
      setError(null);
      
      const response = await fetch(`${getApiUrl()}/active-users`, {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (typeof data.count === 'number') {
        setActiveUsers(data.count);
        setLastUpdate(new Date());
        setConnectionStats(data.stats || null);
        setAnalytics(data.analytics || null);
        setError(null);
        setHasInitialized(true);
        retryCountRef.current = 0; // Reset retry count on success
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching active users:', err);
      
      // Implement exponential backoff for retries
      if (retryCountRef.current < maxRetries && !isRetry) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        console.log(`Retrying fetch in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        
        setTimeout(() => {
          fetchActiveUsers(true);
        }, delay);
        return;
      }
      
      // Only set error if this isn't the initial load or if we've been loading for a while
      if (activeUsers !== 0 || !isLoading) {
        setError(err.message);
        if (activeUsers === 0) {
          setActiveUsers(null);
        }
      }
    } finally {
      if (!isRetry) {
        setIsLoading(false);
      }
    }
  }, [activeUsers, isLoading]);

  // Enhanced socket setup with heartbeat mechanism
  const setupSocket = useCallback(() => {
    try {
      socketRef.current = socketService.connect('/');
      
      const handleActiveUsersUpdate = (data) => {
        if (typeof data.count === 'number') {
          setActiveUsers(data.count);
          setLastUpdate(new Date());
          setConnectionStats(data.stats || null);
          setError(null);
        }
      };

      const handleSocketError = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection failed');
        
        // Attempt to reconnect with exponential backoff
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        const delay = Math.min(3000 * Math.pow(2, retryCountRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          setupSocket();
        }, delay);
      };

      const handleSocketConnect = () => {
        console.log('WebSocket connected for active users');
        setError(null);
        retryCountRef.current = 0;
        
        // Start heartbeat mechanism
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('heartbeat');
          }
        }, 55000); // Send heartbeat every 55 seconds (slightly before server timeout)
        
        // Fetch fresh data immediately after connection
        fetchActiveUsers();
      };

      const handleSocketDisconnect = (reason) => {
        console.log('WebSocket disconnected for active users:', reason);
        setError('WebSocket disconnected');
        
        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // Attempt to reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket after disconnect...');
          setupSocket();
        }, 2000);
      };

      // Listen for active users updates and connection events
      socketRef.current.on('activeUsers:update', handleActiveUsersUpdate);
      socketRef.current.on('connect', handleSocketConnect);
      socketRef.current.on('disconnect', handleSocketDisconnect);
      socketRef.current.on('connect_error', handleSocketError);

      // Store cleanup function
      socketRef.current.cleanup = () => {
        socketRef.current.off('activeUsers:update', handleActiveUsersUpdate);
        socketRef.current.off('connect', handleSocketConnect);
        socketRef.current.off('disconnect', handleSocketDisconnect);
        socketRef.current.off('connect_error', handleSocketError);
      };
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
      setError('Failed to setup WebSocket connection');
    }
  }, [fetchActiveUsers]);

  useEffect(() => {
    // Fetch initial data
    fetchActiveUsers();

    // Set up socket connection for real-time updates
    setupSocket();

    // Set up interval to refresh data every 10 seconds as fallback (reduced from 15)
    const interval = setInterval(fetchActiveUsers, 10000);

    // Set up heartbeat to check connection every 8 seconds (reduced from 10)
    const heartbeat = setInterval(() => {
      if (socketRef.current && !socketRef.current.connected) {
        console.log('WebSocket not connected, attempting to reconnect...');
        setupSocket();
      }
    }, 8000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeat);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (socketRef.current && socketRef.current.cleanup) {
        socketRef.current.cleanup();
      }
    };
  }, [fetchActiveUsers, setupSocket]);

  // Don't show component if there's an error and no active users, but allow initial loading
  if (error && activeUsers === null && !isLoading) {
    return null;
  }

  // Calculate time since last update with enhanced precision
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return null;
    const now = new Date();
    const diffMs = now - lastUpdate;
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  // Enhanced tooltip content with analytics
  const getTooltipContent = () => {
    if (error) {
      return 'Connection error - showing last known count';
    }
    
    let content = `Active users online`;
    
    if (analytics) {
      const authCount = analytics.authenticatedUsers;
      const anonCount = analytics.anonymousUsers;
      if (authCount > 0 || anonCount > 0) {
        content += ` (${authCount} logged in, ${anonCount} anonymous)`;
      }
    }
    
    if (connectionStats) {
      content += ` • Peak: ${connectionStats.peak}`;
    }
    
    if (lastUpdate) {
      content += ` • Updated ${getTimeSinceUpdate()}`;
    }
    
    return content;
  };

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-300 cursor-default hover:scale-105 hover:shadow-lg hover:shadow-white/5 relative ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Enhanced animated pulse indicator with connection status */}
      <div className="relative">
        <motion.div
          className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
            error ? 'bg-gradient-to-r from-red-400 to-red-500' : 
            socketRef.current?.connected ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-yellow-400 to-orange-500'
          } shadow-lg`}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className={`absolute inset-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full opacity-40 ${
            error ? 'bg-red-400' : 
            socketRef.current?.connected ? 'bg-green-400' : 'bg-yellow-400'
          }`}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.4, 0, 0.4]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Enhanced Users icon */}
      <motion.div
        whileHover={{ rotate: 5 }}
        transition={{ duration: 0.2 }}
      >
        <UsersIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80 transition-colors duration-200 drop-shadow-sm ${showTooltip ? 'text-white' : ''}`} />
      </motion.div>

      {/* Enhanced Active users count with better formatting */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-8 sm:w-10 h-3 sm:h-4 bg-gradient-to-r from-white/10 to-white/5 rounded-lg animate-pulse"
          />
        ) : error && hasInitialized ? (
          <motion.span
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`text-xs sm:text-sm font-semibold text-red-400 transition-colors duration-200 drop-shadow-sm ${showTooltip ? 'text-red-300' : ''}`}
            title="Connection error - showing last known count"
          >
            {activeUsers ? activeUsers.toLocaleString() : '--'}
          </motion.span>
        ) : activeUsers !== null ? (
          <motion.span
            key="count"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`text-xs sm:text-sm font-semibold text-white/90 transition-colors duration-200 drop-shadow-sm ${showTooltip ? 'text-white' : ''}`}
          >
            {activeUsers.toLocaleString()}
          </motion.span>
        ) : (
          <motion.span
            key="initial"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`text-xs sm:text-sm font-semibold text-white/60 transition-colors duration-200 drop-shadow-sm ${showTooltip ? 'text-white/80' : ''}`}
          >
            --
          </motion.span>
        )}
      </AnimatePresence>

      {/* Enhanced Tooltip with detailed information */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div 
            className="absolute top-full left-0 mt-2 sm:mt-3 px-3 py-2 bg-black/95 backdrop-blur-sm text-white text-xs rounded-lg border border-white/20 shadow-2xl pointer-events-none whitespace-nowrap z-50 max-w-xs"
            initial={{ opacity: 0, y: -5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${
                error ? 'bg-red-400' : 
                socketRef.current?.connected ? 'bg-green-400' : 'bg-yellow-400'
              }`} />
              <span className="font-medium">
                {getTooltipContent()}
              </span>
            </div>
            
            {/* Additional analytics if available */}
            {analytics && !error && (
              <div className="text-white/70 text-xs mt-1">
                {analytics.averageSessionDuration > 0 && (
                  <div>Avg session: {Math.floor(analytics.averageSessionDuration / 60)}m {analytics.averageSessionDuration % 60}s</div>
                )}
                {connectionStats && (
                  <div>Total connections: {connectionStats.totalConnections.toLocaleString()}</div>
                )}
              </div>
            )}
            
            <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ActiveUsers; 