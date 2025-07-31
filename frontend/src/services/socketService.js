import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 2000; // 2 seconds
    this.connectionTimeout = null;
    this.isBackendAvailable = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.eventListeners = new Map(); // Track event listeners for cleanup
    this.retryTimeout = null; // Track retry timeout
  }

  connect() {
    if (this.isConnecting) {
      return this.socket;
    }

    if (!this.socket || !this.socket.connected) {
      this.isConnecting = true;
      this.connectionAttempts++;
      
      // Clear any existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      // Check if we should attempt connection
      if (this.connectionAttempts > this.maxConnectionAttempts) {
        console.warn('Max connection attempts reached. Backend appears to be unavailable.');
        this.isConnecting = false;
        this.isBackendAvailable = false;
        return null;
      }

      try {
        this.socket = io(getSocketUrl(), {
          withCredentials: true,
          transports: ['websocket', 'polling'], // Allow fallback to polling
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          timeout: 8000, // Reduced timeout for faster failure detection
          forceNew: true,
          autoConnect: true
        });

        // Set a connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.handleConnectionError(new Error('Connection timeout'));
          }
        }, 8000);

        // Store event listeners for cleanup
        const connectHandler = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnecting = false;
          this.isBackendAvailable = true;
          this.retryCount = 0;
          this.connectionAttempts = 0;
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
        };

        const connectErrorHandler = (error) => {
          console.warn('❌ WebSocket connection error:', error.message);
          this.handleConnectionError(error);
        };

        const disconnectHandler = (reason) => {
          console.log('🔌 WebSocket disconnected:', reason);
          this.isConnecting = false;
          this.isBackendAvailable = false;
          
          // Only attempt to reconnect if the disconnect wasn't intentional
          if (reason !== 'io client disconnect') {
            this.retryTimeout = setTimeout(() => {
              this.connect();
            }, 2000);
          }
        };

        // Add event listeners and store them for cleanup
        this.socket.on('connect', connectHandler);
        this.socket.on('connect_error', connectErrorHandler);
        this.socket.on('disconnect', disconnectHandler);

        this.eventListeners.set('connect', connectHandler);
        this.eventListeners.set('connect_error', connectErrorHandler);
        this.eventListeners.set('disconnect', disconnectHandler);

        this.setupDefaultListeners();
      } catch (error) {
        console.error('❌ Failed to initialize WebSocket connection:', error);
        this.handleConnectionError(error);
      }
    }
    return this.socket;
  }

  handleConnectionError(error) {
    this.isConnecting = false;
    this.isBackendAvailable = false;
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    console.warn(`WebSocket connection failed (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts}):`, error.message);
    
    // Implement retry logic with exponential backoff
    if (this.retryCount < this.maxRetries && this.connectionAttempts <= this.maxConnectionAttempts) {
      this.retryCount++;
      const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff
      
      console.log(`Retrying connection in ${delay}ms...`);
      
      this.retryTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max retry attempts reached. Backend appears to be unavailable.');
      // Removed backend unavailable notification to prevent connection issue modals
      // this.notifyListeners('backend:unavailable', { error: error.message });
    }
  }

  disconnect() {
    // Clear all timeouts
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Remove all event listeners
    if (this.socket) {
      this.eventListeners.forEach((handler, event) => {
        this.socket.off(event, handler);
      });
      this.eventListeners.clear();

      // Remove default listeners
      this.removeDefaultListeners();

      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = false;
    this.isBackendAvailable = false;
    this.listeners.clear();
    this.retryCount = 0;
    this.connectionAttempts = 0;
  }

  // Check if backend is available
  isBackendOnline() {
    return this.isBackendAvailable && this.socket?.connected;
  }

  // Force reconnect
  reconnect() {
    this.disconnect();
    this.connectionAttempts = 0;
    this.retryCount = 0;
    return this.connect();
  }

  setupDefaultListeners() {
    // Discussion events
    const discussionNewHandler = (discussion) => {
      this.notifyListeners('discussion:new', discussion);
    };

    const discussionLikedHandler = (data) => {
      this.notifyListeners('discussion:liked', data);
    };

    const discussionUpdatedHandler = (data) => {
      this.notifyListeners('discussion:updated', data);
    };

    // Reply events
    const replyNewHandler = (data) => {
      this.notifyListeners('reply:new', data);
    };

    const replyLikedHandler = (data) => {
      this.notifyListeners('reply:liked', data);
    };

    // User events
    const userJoinedHandler = (data) => {
      this.notifyListeners('user:joined', data);
    };

    // Add event listeners and store them
    this.socket.on('discussion:new', discussionNewHandler);
    this.socket.on('discussion:liked', discussionLikedHandler);
    this.socket.on('discussion:updated', discussionUpdatedHandler);
    this.socket.on('reply:new', replyNewHandler);
    this.socket.on('reply:liked', replyLikedHandler);
    this.socket.on('user:joined', userJoinedHandler);

    // Store default listeners for cleanup
    this.eventListeners.set('discussion:new', discussionNewHandler);
    this.eventListeners.set('discussion:liked', discussionLikedHandler);
    this.eventListeners.set('discussion:updated', discussionUpdatedHandler);
    this.eventListeners.set('reply:new', replyNewHandler);
    this.eventListeners.set('reply:liked', replyLikedHandler);
    this.eventListeners.set('user:joined', userJoinedHandler);

    // Backend status events (removed to prevent connection issue modals)
    // this.socket.on('backend:status', (status) => {
    //   this.notifyListeners('backend:status', status);
    // });
  }

  removeDefaultListeners() {
    if (!this.socket) return;

    // Remove all default listeners
    this.eventListeners.forEach((handler, event) => {
      this.socket.off(event, handler);
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
          console.error('Error in socket listener:', error);
        }
      });
    }
  }

  // Safe emit with connection check
  safeEmit(event, data) {
    if (!this.socket?.connected) {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
      return false;
    }
    
    try {
      this.socket.emit(event, data);
      return true;
    } catch (error) {
      console.error(`Error emitting ${event}:`, error);
      return false;
    }
  }

  // Emit events with enhanced error handling
  emitDiscussionCreate(discussion) {
    if (!this.isBackendOnline()) {
      console.warn('Backend unavailable, discussion will be saved locally');
      // Store locally for later sync
      this.storeLocalDiscussion(discussion);
      return false;
    }
    return this.safeEmit('discussion:create', discussion);
  }

  emitReplyCreate(data) {
    if (!this.isBackendOnline()) {
      console.warn('Backend unavailable, reply will be saved locally');
      this.storeLocalReply(data);
      return false;
    }
    return this.safeEmit('reply:create', data);
  }

  emitDiscussionLike(data) {
    if (!this.isBackendOnline()) {
      console.warn('Backend unavailable, like will be saved locally');
      this.storeLocalLike(data);
      return false;
    }
    return this.safeEmit('discussion:like', data);
  }

  emitReplyLike(data) {
    if (!this.isBackendOnline()) {
      console.warn('Backend unavailable, like will be saved locally');
      this.storeLocalLike(data);
      return false;
    }
    return this.safeEmit('reply:like', data);
  }

  emitUserJoined(data) {
    if (!this.isBackendOnline()) {
      console.warn('Backend unavailable, user join event skipped');
      return false;
    }
    return this.safeEmit('user:joined', data);
  }

  // Local storage for offline functionality
  storeLocalDiscussion(discussion) {
    try {
      const localDiscussions = JSON.parse(localStorage.getItem('localDiscussions') || '[]');
      localDiscussions.push({ ...discussion, timestamp: Date.now() });
      localStorage.setItem('localDiscussions', JSON.stringify(localDiscussions));
    } catch (error) {
      console.error('Error storing local discussion:', error);
    }
  }

  storeLocalReply(reply) {
    try {
      const localReplies = JSON.parse(localStorage.getItem('localReplies') || '[]');
      localReplies.push({ ...reply, timestamp: Date.now() });
      localStorage.setItem('localReplies', JSON.stringify(localReplies));
    } catch (error) {
      console.error('Error storing local reply:', error);
    }
  }

  storeLocalLike(like) {
    try {
      const localLikes = JSON.parse(localStorage.getItem('localLikes') || '[]');
      localLikes.push({ ...like, timestamp: Date.now() });
      localStorage.setItem('localLikes', JSON.stringify(localLikes));
    } catch (error) {
      console.error('Error storing local like:', error);
    }
  }

  // Sync local data when backend comes back online
  syncLocalData() {
    if (!this.isBackendOnline()) return;

    try {
      // Sync local discussions
      const localDiscussions = JSON.parse(localStorage.getItem('localDiscussions') || '[]');
      localDiscussions.forEach(discussion => {
        this.safeEmit('discussion:create', discussion);
      });
      localStorage.removeItem('localDiscussions');

      // Sync local replies
      const localReplies = JSON.parse(localStorage.getItem('localReplies') || '[]');
      localReplies.forEach(reply => {
        this.safeEmit('reply:create', reply);
      });
      localStorage.removeItem('localReplies');

      // Sync local likes
      const localLikes = JSON.parse(localStorage.getItem('localLikes') || '[]');
      localLikes.forEach(like => {
        this.safeEmit('discussion:like', like);
      });
      localStorage.removeItem('localLikes');

      console.log('✅ Local data synced successfully');
    } catch (error) {
      console.error('Error syncing local data:', error);
    }
  }
}

export const socketService = new SocketService(); 