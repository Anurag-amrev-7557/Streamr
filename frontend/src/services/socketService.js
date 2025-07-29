import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 2000; // 2 seconds
    this.connectionTimeout = null;
  }

  connect() {
    if (this.isConnecting) {
      return this.socket;
    }

    if (!this.socket || !this.socket.connected) {
      this.isConnecting = true;
      
      // Clear any existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      this.socket = io(`http://localhost:3001/community`, {
        withCredentials: true,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000, // 10 second timeout
        forceNew: true
      });

      // Set a connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, 10000);

      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.retryCount = 0; // Reset retry count on successful connection
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
      });

      this.socket.on('connect_error', (error) => {
        this.handleConnectionError(error);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnecting = false;
        
        // Only attempt to reconnect if the disconnect wasn't intentional
        if (reason !== 'io client disconnect') {
          this.connect();
        }
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
      setTimeout(() => {
        this.connect();
      }, this.retryDelay);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.listeners.clear();
      this.retryCount = 0;
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
    }
  }

  setupDefaultListeners() {
    // Discussion events
    this.socket.on('discussion:new', (discussion) => {
      this.notifyListeners('discussion:new', discussion);
    });

    this.socket.on('discussion:liked', (data) => {
      this.notifyListeners('discussion:liked', data);
    });

    this.socket.on('discussion:updated', (data) => {
      this.notifyListeners('discussion:updated', data);
    });

    // Reply events
    this.socket.on('reply:new', (data) => {
      this.notifyListeners('reply:new', data);
    });

    this.socket.on('reply:liked', (data) => {
      this.notifyListeners('reply:liked', data);
    });

    // User events
    this.socket.on('user:joined', (data) => {
      this.notifyListeners('user:joined', data);
    });
  }

  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
      // Clean up empty sets
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          // Silent error handling
        }
      });
    }
  }

  // Emit events
  emitDiscussionCreate(discussion) {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit('discussion:create', discussion);
  }

  emitReplyCreate(data) {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit('reply:create', data);
  }

  emitDiscussionLike(data) {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit('discussion:like', data);
  }

  emitReplyLike(data) {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit('reply:like', data);
  }

  emitUserJoined(data) {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit('user:joined', data);
  }
}

export const socketService = new SocketService(); 