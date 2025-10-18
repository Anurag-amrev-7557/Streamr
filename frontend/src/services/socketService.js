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
    // Outgoing emit queue to avoid unbounded memory growth when disconnected
    this.emitQueue = [];
    this.maxEmitQueueSize = 100; // protect memory

    // Incoming event buffering to coalesce/batch high-frequency events
    this.eventBuffers = new Map();
    this.flushTimeout = null;
    this.flushDelay = 100; // ms - coalesce events in short batches
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
        // Use jittered/exponential reconnection behavior provided by socket.io
        reconnectionDelay: this.retryDelay,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
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
        // Flush any queued emits now that we're connected. Do this in a
        // next task to avoid blocking the connect handler.
        setTimeout(() => this._flushEmitQueue(), 0);
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

        // Do not force new socket creation on every disconnect; rely on socket.io's
        // built-in reconnection to avoid creating multiple socket instances
        // and causing memory/GPU spikes. If the disconnect was manual, we don't
        // want reconnection.
        if (this.manualDisconnect) {
          this.log('Manual disconnect requested; not reconnecting');
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

    // Prefer socket.io's automatic reconnection. Only if we don't have a socket
    // (or reconnection disabled) fall back to manual retry with exponential
    // backoff and jitter.
    if (!this.socket) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const backoff = Math.min(this.retryDelay * 2 ** (this.retryCount - 1), 10000);
        const jitter = Math.floor(Math.random() * backoff * 0.5);
        const delay = backoff + jitter;
        this.log(`Manual retry (${this.retryCount}/${this.maxRetries}) in ${delay}ms`);
        setTimeout(() => this.connect(this.namespace), delay);
      } else {
        this.log('Max retries reached. Giving up.');
        this.notifyListeners('connection_failed', error);
      }
    } else {
      // Let the socket.io client handle reconnection attempts. Still notify
      // listeners about the error so UI can react (e.g., show offline state).
      this.notifyListeners('connect_error', error);
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
      // Keep registered listeners so reconnects can reuse them without
      // re-registering from the app layer. This avoids losing listeners and
      // also prevents growing memory by removing/adding listeners repeatedly.
      // Only clear the emit queue to avoid replaying stale actions.
      this.retryCount = 0;
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      this.emitQueue = [];
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
      this.bufferEvent('discussion:new', discussion);
    });

    this.socket.on('discussion:liked', (data) => {
      this.log('Received discussion:liked', data);
      this.bufferEvent('discussion:liked', data);
    });

    this.socket.on('discussion:updated', (data) => {
      this.log('Received discussion:updated', data);
      this.bufferEvent('discussion:updated', data);
    });

    // Reply events
    this.socket.on('reply:new', (data) => {
      this.log('Received reply:new', data);
      this.bufferEvent('reply:new', data);
    });

    this.socket.on('reply:liked', (data) => {
      this.log('Received reply:liked', data);
      this.bufferEvent('reply:liked', data);
    });

    // User events
    this.socket.on('user:joined', (data) => {
      this.log('Received user:joined', data);
      this.bufferEvent('user:joined', data);
    });
  }

  // Buffer incoming events to coalesce high-frequency updates and reduce
  // main-thread and GPU spikes when many events arrive at once.
  bufferEvent(event, data) {
    if (!this.eventBuffers.has(event)) {
      this.eventBuffers.set(event, []);
    }
    const buf = this.eventBuffers.get(event);
    buf.push(data);

    // Cap buffer size per event to avoid unbounded memory growth
    if (buf.length > 500) {
      buf.splice(0, buf.length - 500);
    }

    // Schedule a flush using requestIdleCallback when available, otherwise setTimeout
    if (!this.flushTimeout) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        this.flushTimeout = window.requestIdleCallback(() => {
          this.flushTimeout = null;
          this.flushEventBuffers();
        }, { timeout: 200 });
      } else {
        this.flushTimeout = setTimeout(() => {
          this.flushTimeout = null;
          this.flushEventBuffers();
        }, this.flushDelay);
      }
    }
  }

  // Flush buffered events in small chunks to avoid long main-thread blocks.
  flushEventBuffers() {
    // Process each event type separately
    this.eventBuffers.forEach((arr, event) => {
      if (!arr || arr.length === 0) return;

      // Process in small batches
      const batchSize = 50;
      while (arr.length > 0) {
        const batch = arr.splice(0, batchSize);
        // Notify listeners in a setTimeout to yield to the browser between batches
        setTimeout(() => {
          batch.forEach((item) => this.notifyListeners(event, item));
        }, 0);
      }
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
    this._queueEmit('discussion:create', discussion);
  }

  emitReplyCreate(data) {
    this._queueEmit('reply:create', data);
  }

  emitDiscussionLike(data) {
    this._queueEmit('discussion:like', data);
  }

  emitReplyLike(data) {
    this._queueEmit('reply:like', data);
  }

  emitUserJoined(data) {
    this._queueEmit('user:joined', data);
  }

  // Internal: enqueue emits when disconnected, cap queue size to avoid memory blowup
  _queueEmit(event, payload) {
    if (this.socket?.connected) {
      try {
        this.socket.emit(event, payload);
        this.log('Emitted', event, payload);
      } catch (err) {
        // Fall back to queue on error
        this.log('Emit error, queueing', event, err);
        this._pushToEmitQueue(event, payload);
      }
      return;
    }

    this.log('Socket not connected, queueing emit for', event);
    this._pushToEmitQueue(event, payload);
    // Try to establish connection but avoid aggressive reconnects
    if (!this.isConnecting && !this.manualDisconnect) {
      this.connect(this.namespace);
    }
  }

  _pushToEmitQueue(event, payload) {
    if (this.emitQueue.length >= this.maxEmitQueueSize) {
      // Drop oldest to keep memory bounded
      this.emitQueue.shift();
    }
    this.emitQueue.push({ event, payload });
  }

  _flushEmitQueue() {
    if (!this.socket?.connected || this.emitQueue.length === 0) return;
    // Flush in small batches to avoid blocking
    const batchSize = 20;
    while (this.emitQueue.length > 0) {
      const batch = this.emitQueue.splice(0, batchSize);
      try {
        batch.forEach((item) => this.socket.emit(item.event, item.payload));
      } catch (err) {
        // If an error happens, re-queue remaining items and break
        this.emitQueue = batch.concat(this.emitQueue);
        this.log('Error flushing emit queue, will retry later', err);
        break;
      }
    }
  }

  // Fully destroy the service (clear buffers and timers). Useful for tests or
  // when unloading large parts of the app to free memory.
  destroy() {
    if (this.flushTimeout) {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof this.flushTimeout === 'number') {
        window.cancelIdleCallback(this.flushTimeout);
      } else {
        clearTimeout(this.flushTimeout);
      }
      this.flushTimeout = null;
    }
    this.disconnect();
    this.eventBuffers.clear();
    this.emitQueue = [];
    this.listeners.clear();
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