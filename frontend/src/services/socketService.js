import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
    this.retryCount = 0;
    this.maxRetries = 8; // Increased for more robust reconnection
    this.retryDelay = 2000; // 2 seconds
    this.connectionTimeout = null;
    this.namespace = '/community';
    this.manualDisconnect = false;
    this.debug = false; // Set to true for verbose logging
  }

  log(...args) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[SocketService]', ...args);
    }
  }

  connect(namespace = this.namespace) {
    if (this.isConnecting) {
      this.log('Already connecting...');
      return this.socket;
    }

    if (!this.socket || !this.socket.connected || this.namespace !== namespace) {
      this.isConnecting = true;
      this.namespace = namespace;
      this.manualDisconnect = false;

      // Clear any existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      const socketUrl =
        namespace === '/' ? getSocketUrl().replace('/community', '') : getSocketUrl();

      // If switching namespace, disconnect previous socket
      if (this.socket && this.socket.connected) {
        this.log('Switching namespace, disconnecting previous socket');
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      this.socket = io(socketUrl + namespace, {
        withCredentials: true,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxRetries,
        reconnectionDelay: this.retryDelay,
        timeout: 10000, // 10 second timeout
        forceNew: true,
        autoConnect: true,
      });

      // Set a connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          this.log('Connection timeout');
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, 10000);

      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.retryCount = 0; // Reset retry count on successful connection
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
        this.log('Connected to socket:', namespace);
        this.notifyListeners('connect');
      });

      this.socket.on('connect_error', (error) => {
        this.log('Connect error:', error);
        this.handleConnectionError(error);
        this.notifyListeners('connect_error', error);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnecting = false;
        this.log('Disconnected:', reason);
        this.notifyListeners('disconnect', reason);

        // Only attempt to reconnect if the disconnect wasn't intentional
        if (!this.manualDisconnect && reason !== 'io client disconnect') {
          this.connect(this.namespace);
        }
      });

      this.socket.on('reconnect_attempt', (attempt) => {
        this.log('Reconnect attempt:', attempt);
        this.notifyListeners('reconnect_attempt', attempt);
      });

      this.socket.on('reconnect_failed', () => {
        this.log('Reconnect failed');
        this.notifyListeners('reconnect_failed');
      });

      this.setupDefaultListeners();
    }
    return this.socket;
  }

  handleConnectionError(error) {
    this.isConnecting = false;
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    // Implement retry logic
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.log(`Retrying connection (${this.retryCount}/${this.maxRetries})...`);
      setTimeout(() => {
        this.connect(this.namespace);
      }, this.retryDelay);
    } else {
      this.log('Max retries reached. Giving up.');
      this.notifyListeners('connection_failed', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.log('Disconnecting socket and cleaning up...');
      this.manualDisconnect = true;
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.listeners.clear();
      this.retryCount = 0;
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
    }
  }

  setupDefaultListeners() {
    if (!this.socket) return;

    // Remove previous listeners to avoid duplicates
    this.socket.off('discussion:new');
    this.socket.off('discussion:liked');
    this.socket.off('discussion:updated');
    this.socket.off('reply:new');
    this.socket.off('reply:liked');
    this.socket.off('user:joined');

    // Discussion events
    this.socket.on('discussion:new', (discussion) => {
      this.log('Received discussion:new', discussion);
      this.notifyListeners('discussion:new', discussion);
    });

    this.socket.on('discussion:liked', (data) => {
      this.log('Received discussion:liked', data);
      this.notifyListeners('discussion:liked', data);
    });

    this.socket.on('discussion:updated', (data) => {
      this.log('Received discussion:updated', data);
      this.notifyListeners('discussion:updated', data);
    });

    // Reply events
    this.socket.on('reply:new', (data) => {
      this.log('Received reply:new', data);
      this.notifyListeners('reply:new', data);
    });

    this.socket.on('reply:liked', (data) => {
      this.log('Received reply:liked', data);
      this.notifyListeners('reply:liked', data);
    });

    // User events
    this.socket.on('user:joined', (data) => {
      this.log('Received user:joined', data);
      this.notifyListeners('user:joined', data);
    });
  }

  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    this.log(`Listener added for event: ${event}`);
  }

  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
      this.log(`Listener removed for event: ${event}`);
      // Clean up empty sets
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this.log(`Error in listener for event "${event}":`, error);
        }
      });
    }
  }

  // Emit events
  emitDiscussionCreate(discussion) {
    if (!this.socket?.connected) {
      this.log('Socket not connected, attempting to connect before emitting discussion:create');
      this.connect(this.namespace);
    }
    this.socket?.emit('discussion:create', discussion);
    this.log('Emitted discussion:create', discussion);
  }

  emitReplyCreate(data) {
    if (!this.socket?.connected) {
      this.log('Socket not connected, attempting to connect before emitting reply:create');
      this.connect(this.namespace);
    }
    this.socket?.emit('reply:create', data);
    this.log('Emitted reply:create', data);
  }

  emitDiscussionLike(data) {
    if (!this.socket?.connected) {
      this.log('Socket not connected, attempting to connect before emitting discussion:like');
      this.connect(this.namespace);
    }
    this.socket?.emit('discussion:like', data);
    this.log('Emitted discussion:like', data);
  }

  emitReplyLike(data) {
    if (!this.socket?.connected) {
      this.log('Socket not connected, attempting to connect before emitting reply:like');
      this.connect(this.namespace);
    }
    this.socket?.emit('reply:like', data);
    this.log('Emitted reply:like', data);
  }

  emitUserJoined(data) {
    if (!this.socket?.connected) {
      this.log('Socket not connected, attempting to connect before emitting user:joined');
      this.connect(this.namespace);
    }
    this.socket?.emit('user:joined', data);
    this.log('Emitted user:joined', data);
  }

  // Utility: Check connection status
  isConnected() {
    return !!(this.socket && this.socket.connected);
  }

  // Utility: Change namespace at runtime
  changeNamespace(newNamespace) {
    if (newNamespace !== this.namespace) {
      this.log(`Changing namespace from ${this.namespace} to ${newNamespace}`);
      this.disconnect();
      this.connect(newNamespace);
    }
  }
}

// Lazy initialization to prevent hoisting issues
let _socketService = null;
const getSocketService = () => {
  if (!_socketService) {
    _socketService = new SocketService();
  }
  return _socketService;
};

// Export singleton instance with lazy initialization
export const socketService = getSocketService();