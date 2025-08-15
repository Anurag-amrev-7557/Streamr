import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersIcon } from '@heroicons/react/24/outline';
import { socketService } from '../services/socketService';
import { getApiUrl } from '../config/api';

const ActiveUsers = ({ className = '' }) => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
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
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching active users:', err);
        setError(err.message);
        // Don't set random fallback - keep previous value or show error state
        if (activeUsers === 0) {
          setActiveUsers(null); // Indicate error state
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
          setError('WebSocket connection failed');
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

  // Don't show component if there's an error and no active users
  if (error && activeUsers === null) {
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 group cursor-default ${className}`}
    >
      {/* Animated pulse indicator */}
      <div className="relative">
        <motion.div
          className={`w-2 h-2 rounded-full ${
            error ? 'bg-red-400' : 'bg-green-400'
          }`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className={`absolute inset-0 w-2 h-2 rounded-full opacity-30 animate-ping ${
          error ? 'bg-red-400' : 'bg-green-400'
        }`} />
      </div>

      {/* Users icon */}
      <UsersIcon className="w-4 h-4 text-white/70 group-hover:text-white/90 transition-colors duration-200" />

      {/* Active users count */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-8 h-4 bg-white/10 rounded animate-pulse"
          />
        ) : error ? (
          <motion.span
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors duration-200"
            title="Connection error - showing last known count"
          >
            {activeUsers ? activeUsers.toLocaleString() : '--'}
          </motion.span>
        ) : (
          <motion.span
            key="count"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="text-sm font-medium text-white/80 group-hover:text-white transition-colors duration-200"
          >
            {activeUsers ? activeUsers.toLocaleString() : '0'}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {error ? 'Connection error - showing last known count' : `Active users online${lastUpdate ? ` • Updated ${getTimeSinceUpdate()}` : ''}`}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
      </div>
    </motion.div>
  );
};

export default ActiveUsers; 