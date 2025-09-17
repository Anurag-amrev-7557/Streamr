import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
} from 'react';
import { socketService } from '../services/socketService';

// --- Enhanced Socket Context with Reconnection, Status, and Debugging ---

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
  const isMountedRef = useRef(true);

  // --- Enhanced: Track connection status and errors ---
  const [isConnected, setIsConnected] = useState(socketService.socket?.connected || false);
  const [lastError, setLastError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // --- Enhanced: Debug logging toggle ---
  const [debug, setDebug] = useState(() => !!import.meta.env.VITE_SOCKET_DEBUG);

  // --- Enhanced: Expose socket id for diagnostics ---
  const [socketId, setSocketId] = useState(socketService.socket?.id || null);

  // --- Enhanced: Setup event listeners for connection status ---
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socketService.socket?.id || null);
      setLastError(null);
      if (debug) console.info('[Socket] Connected:', socketService.socket?.id);
    };
    const handleDisconnect = (reason) => {
      setIsConnected(false);
      setSocketId(null);
      if (debug) console.warn('[Socket] Disconnected:', reason);
    };
    const handleError = (err) => {
      setLastError(err);
      if (debug) console.error('[Socket] Error:', err);
    };
    const handleReconnectAttempt = (attempt) => {
      setReconnectAttempts(attempt);
      if (debug) console.info('[Socket] Reconnect attempt:', attempt);
    };

    socketService.addListener('connect', handleConnect);
    socketService.addListener('disconnect', handleDisconnect);
    socketService.addListener('error', handleError);
    socketService.addListener('reconnect_attempt', handleReconnectAttempt);

    // Initial state sync
    setIsConnected(socketService.socket?.connected || false);
    setSocketId(socketService.socket?.id || null);

    return () => {
      socketService.removeListener('connect', handleConnect);
      socketService.removeListener('disconnect', handleDisconnect);
      socketService.removeListener('error', handleError);
      socketService.removeListener('reconnect_attempt', handleReconnectAttempt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug]);

  // --- Enhanced: Mounted ref for cleanup ---
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // --- Enhanced: Socket connection lifecycle with reconnection support ---
  useEffect(() => {
    if (!isInitialized.current && isMountedRef.current) {
      if (debug) console.log('[SocketProvider] Initializing socket connection...');
      socketService.connect();
      isInitialized.current = true;
    }

    return () => {
      cleanupTimeout.current = setTimeout(() => {
        if (isInitialized.current && isMountedRef.current) {
          if (debug) console.log('[SocketProvider] Cleaning up socket connection...');
          socketService.disconnect();
          isInitialized.current = false;
        }
      }, 100);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug]);

  // --- Enhanced: Timeout cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (cleanupTimeout.current) {
        clearTimeout(cleanupTimeout.current);
        cleanupTimeout.current = null;
      }
    };
  }, []);

  // --- Enhanced: Add listener with auto-reconnect support ---
  const addListener = useCallback((event, callback) => {
    // Always add listener, even if not connected yet (socket.io queues them)
    socketService.addListener(event, callback);
    return () => socketService.removeListener(event, callback);
  }, []);

  // --- Enhanced: Manual reconnect and debug controls ---
  const reconnect = useCallback(() => {
    if (debug) console.info('[SocketProvider] Manual reconnect triggered');
    socketService.disconnect();
    setTimeout(() => {
      socketService.connect();
    }, 200);
  }, [debug]);

  const toggleDebug = useCallback(() => setDebug((d) => !d), []);

  // --- Enhanced: Memoize context value for performance ---
  const value = useMemo(
    () => ({
      socket: socketService.socket,
      addListener,
      isConnected,
      lastError,
      reconnectAttempts,
      socketId,
      debug,
      setDebug: toggleDebug,
      reconnect,
      emitDiscussionCreate: socketService.emitDiscussionCreate.bind(socketService),
      emitReplyCreate: socketService.emitReplyCreate.bind(socketService),
      emitDiscussionLike: socketService.emitDiscussionLike.bind(socketService),
      emitReplyLike: socketService.emitReplyLike.bind(socketService),
    }),
    [
      addListener,
      isConnected,
      lastError,
      reconnectAttempts,
      socketId,
      debug,
      toggleDebug,
      reconnect,
    ]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};