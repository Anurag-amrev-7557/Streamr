import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socketService';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const isInitialized = useRef(false);
  const cleanupTimeout = useRef(null);
  const isMountedRef = useRef(true); // FIXED: Add mounted ref for cleanup

  // FIXED: Enhanced cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Only initialize the socket connection once
    if (!isInitialized.current && isMountedRef.current) {
      console.log('Initializing socket connection...');
      socketService.connect();
      isInitialized.current = true;
    }

    // FIXED: Enhanced cleanup on unmount
    return () => {
      // Use a timeout to prevent cleanup during React's strict mode double-mounting
      cleanupTimeout.current = setTimeout(() => {
        if (isInitialized.current && isMountedRef.current) {
          console.log('Cleaning up socket connection...');
          socketService.disconnect();
          isInitialized.current = false;
        }
      }, 100); // Small delay to allow for strict mode remounting
    };
  }, []);

  // FIXED: Enhanced timeout cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimeout.current) {
        clearTimeout(cleanupTimeout.current);
        cleanupTimeout.current = null;
      }
    };
  }, []);

  const addListener = useCallback((event, callback) => {
    // Only add listener if socket is connected
    if (socketService.socket?.connected) {
      socketService.addListener(event, callback);
      return () => socketService.removeListener(event, callback);
    }
    return () => {}; // Return empty cleanup function if socket isn't connected
  }, []);

  const value = {
    socket: socketService.socket,
    addListener,
    isConnected: socketService.socket?.connected || false,
    emitDiscussionCreate: socketService.emitDiscussionCreate.bind(socketService),
    emitReplyCreate: socketService.emitReplyCreate.bind(socketService),
    emitDiscussionLike: socketService.emitDiscussionLike.bind(socketService),
    emitReplyLike: socketService.emitReplyLike.bind(socketService),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 