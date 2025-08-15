import React, { useState, useEffect, useRef } from 'react';
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
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${getApiUrl()}/active-users`, {
          credentials: 'include',
          cache: 'no-cache' // Prevent caching for real-time data
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (typeof data.count === 'number') {
          setActiveUsers(data.count);
          setLastUpdate(new Date());
          setError(null); // Clear any previous errors
          setHasInitialized(true);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching active users:', err);
        // Only set error if this isn't the initial load or if we've been loading for a while
        if (activeUsers !== 0 || !isLoading) {
          setError(err.message);
          if (activeUsers === 0) {
            setActiveUsers(null); // Indicate error state
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch initial data
    fetchActiveUsers();

    // Set up socket connection for real-time updates
    const setupSocket = () => {
      try {
        socketRef.current = socketService.connect('/');
        
        const handleActiveUsersUpdate = (data) => {
          if (typeof data.count === 'number') {
            setActiveUsers(data.count);
            setLastUpdate(new Date());
            setError(null); // Clear any previous errors
          }
        };

        const handleSocketError = (error) => {
          console.error('WebSocket error:', error);
          // Only set error if we've been loading for more than 2 seconds
          setTimeout(() => {
            if (isLoading) {
              setError('WebSocket connection failed');
            }
          }, 2000);
          // Attempt to reconnect after a short delay
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            setupSocket();
          }, 3000); // Reconnect after 3 seconds
        };

        const handleSocketConnect = () => {
          console.log('WebSocket connected for active users');
          setError(null); // Clear errors on successful connection
          // Fetch fresh data immediately after connection
          fetchActiveUsers();
        };

        const handleSocketDisconnect = () => {
          console.log('WebSocket disconnected for active users');
          setError('WebSocket disconnected');
          // Attempt to reconnect
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket after disconnect...');
            setupSocket();
          }, 2000); // Reconnect after 2 seconds
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
    };

    setupSocket();

    // Set up interval to refresh data every 15 seconds as fallback (reduced from 60)
    const interval = setInterval(fetchActiveUsers, 15000);

    // Set up heartbeat to check connection every 10 seconds
    const heartbeat = setInterval(() => {
      if (socketRef.current && !socketRef.current.connected) {
        console.log('WebSocket not connected, attempting to reconnect...');
        setupSocket();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeat);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current && socketRef.current.cleanup) {
        socketRef.current.cleanup();
      }
    };
  }, []);

  // Don't show component if there's an error and no active users, but allow initial loading
  if (error && activeUsers === null && !isLoading) {
    return null;
  }

  // Calculate time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return null;
    const now = new Date();
    const diffMs = now - lastUpdate;
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    return `${diffMinutes}m ago`;
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
      {/* Enhanced animated pulse indicator */}
      <div className="relative">
        <motion.div
          className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
            error ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'
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
            error ? 'bg-red-400' : 'bg-green-400'
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

      {/* Enhanced Active users count */}
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

      {/* Enhanced Tooltip on hover - positioned at bottom */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div 
            className="absolute top-full left-0 mt-2 sm:mt-3 px-2 sm:px-3 py-1.5 sm:py-2 bg-black/95 backdrop-blur-sm text-white text-xs rounded-lg border border-white/20 shadow-2xl pointer-events-none whitespace-nowrap z-50"
            initial={{ opacity: 0, y: -5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-400' : 'bg-green-400'}`} />
          <span className="font-medium">
            {error ? 'Connection error - showing last known count' : `Active users online${lastUpdate ? ` • Updated ${getTimeSinceUpdate()}` : ''}`}
          </span>
        </div>
        <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
  };
  
  export default ActiveUsers; 