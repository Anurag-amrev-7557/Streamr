import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

class SocketService {
  // options: { namespace, debug, maxRetries, baseRetryDelay, maxEmitQueueSize, flushDelay, heartbeatInterval }
  constructor(options = {}) {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
    this.retryCount = 0;
    this.maxRetries = Number.isFinite(options.maxRetries) ? options.maxRetries : 8; // robust reconnection
    this.baseRetryDelay = Number.isFinite(options.baseRetryDelay) ? options.baseRetryDelay : 2000; // ms
    this.connectionTimeout = null;
    this.namespace = options.namespace || '/community';
    this.manualDisconnect = false;
    this.debug = !!options.debug; // Set to true for verbose logging
    // Outgoing emit queue to avoid unbounded memory growth when disconnected
    this.emitQueue = [];
    this.maxEmitQueueSize = Number.isFinite(options.maxEmitQueueSize) ? options.maxEmitQueueSize : 100;

    // Incoming event buffering to coalesce/batch high-frequency events
    this.eventBuffers = new Map();
    this.flushTimeout = null;
    this.flushDelay = Number.isFinite(options.flushDelay) ? options.flushDelay : 100; // ms - coalesce events in short batches

    // Heartbeat / app-level ping
    this.heartbeatInterval = Number.isFinite(options.heartbeatInterval) ? options.heartbeatInterval : 30000; // 30s
    this.heartbeatTimer = null;
    this.latency = null;

    // Keep a registry of once-listeners so they can be removed after first call
    this.onceListeners = new Map();
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
        reconnectionDelay: this.baseRetryDelay,
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
        // Start heartbeat when connected
        this._startHeartbeat();
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

        // Stop heartbeat
        this._stopHeartbeat();

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
      // If there's no socket instance, perform manual retries with backoff
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const backoff = Math.min(this.baseRetryDelay * 2 ** (this.retryCount - 1), 10000);
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
    // We remove the handlers we know we added. If socket.io has other
    // app-level listeners they are left intact.
    const known = ['discussion:new', 'discussion:liked', 'discussion:updated', 'reply:new', 'reply:liked', 'user:joined'];
    known.forEach((ev) => this.socket.off(ev));

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

    // Forward unknown events to listeners if they are registered directly
    this.socket.onAny((event, ...args) => {
      // If we have explicit handlers for the events we don't forward again
      if (known.includes(event)) return;
      if (args.length === 1) this.notifyListeners(event, args[0]);
      else this.notifyListeners(event, args);
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

  // Alias methods for convenience
  on(event, callback) { return this.addListener(event, callback); }
  off(event, callback) { return this.removeListener(event, callback); }
  once(event, callback) {
    const wrapper = (data) => {
      try {
        callback(data);
      } finally {
        this.removeListener(event, wrapper);
      }
    };
    this.addListener(event, wrapper);
    return wrapper;
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
      // Snapshot to protect against mutation during iteration
      const cbs = Array.from(this.listeners.get(event));
      cbs.forEach((callback) => {
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
        this._pushToEmitQueue({ event, payload });
      }
      return;
    }

    this.log('Socket not connected, queueing emit for', event);
    this._pushToEmitQueue({ event, payload });
    // Try to establish connection but avoid aggressive reconnects
    if (!this.isConnecting && !this.manualDisconnect) {
      this.connect(this.namespace);
    }
  }

  _pushToEmitQueue(item) {
    if (this.emitQueue.length >= this.maxEmitQueueSize) {
      // Drop oldest to keep memory bounded
      this.emitQueue.shift();
    }
    // item: { event, payload, resolve?, reject?, ackTimeout? }
    this.emitQueue.push(item);
  }

  // Emit with ack support. If disconnected, this will queue and return a promise
  emitWithAck(event, payload, timeout = 5000) {
    if (this.socket?.connected) {
      return new Promise((resolve, reject) => {
        let timer = null;
        try {
          // socket.io supports an ack callback as the last arg
          this.socket.emit(event, payload, (ack) => {
            if (timer) clearTimeout(timer);
            resolve(ack);
          });
          timer = setTimeout(() => {
            reject(new Error('Emit ack timeout'));
          }, timeout);
        } catch (err) {
          if (timer) clearTimeout(timer);
          reject(err);
        }
      });
    }

    // Not connected: queue with promise and establish connection
    return new Promise((resolve, reject) => {
      const ackTimeout = timeout;
      this._pushToEmitQueue({ event, payload, resolve, reject, ackTimeout });
      if (!this.isConnecting && !this.manualDisconnect) this.connect(this.namespace);
    });
  }

  _flushEmitQueue() {
    if (!this.socket?.connected || this.emitQueue.length === 0) return;
    // Flush in small batches to avoid blocking
    const batchSize = 20;
    while (this.emitQueue.length > 0) {
      const batch = this.emitQueue.splice(0, batchSize);
      try {
        batch.forEach((item) => {
          // If the item expects an ack (has resolve), attach ack handler
          if (item && typeof item.resolve === 'function') {
            let timer = null;
            try {
              this.socket.emit(item.event, item.payload, (ack) => {
                if (timer) clearTimeout(timer);
                item.resolve(ack);
              });
              if (item.ackTimeout) {
                timer = setTimeout(() => {
                  item.reject && item.reject(new Error('Emit ack timeout'));
                }, item.ackTimeout);
              }
            } catch (err) {
              item.reject && item.reject(err);
            }
          } else {
            this.socket.emit(item.event, item.payload);
          }
        });
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
    this._stopHeartbeat();
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

  // Wait for socket to be connected; returns a promise that resolves when connected or rejects on timeout
  waitForConnection(timeout = 10000) {
    if (this.isConnected()) return Promise.resolve(this.socket);
    return new Promise((resolve, reject) => {
      let timer = null;
      const onConnect = () => {
        if (timer) clearTimeout(timer);
        this.removeListener('connect', onConnect);
        resolve(this.socket);
      };
      this.addListener('connect', onConnect);
      if (!this.isConnecting && !this.manualDisconnect) this.connect(this.namespace);
      timer = setTimeout(() => {
        this.removeListener('connect', onConnect);
        reject(new Error('waitForConnection timeout'));
      }, timeout);
    });
  }

  // Heartbeat: app-level ping to measure latency and ensure app-level liveness
  _startHeartbeat() {
    this._stopHeartbeat();
    if (!this.socket || !this.socket.connected) return;
    try {
      this.heartbeatTimer = setInterval(() => {
        const start = Date.now();
        try {
          // use a lightweight event for heartbeat; server should ack with timestamp or pong
          this.socket.timeout(5000).emit('client:ping', { t: start }, (_ack) => {
            // ack may be undefined depending on server; compute latency
            this.latency = Date.now() - start;
            this.notifyListeners('latency', this.latency);
          });
        } catch (e) {
          // ignore individual heartbeat errors; they'll surface via disconnect
          this.log('Heartbeat error', e);
        }
      }, this.heartbeatInterval);
    } catch (err) {
      this.log('Failed to start heartbeat', err);
    }
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  setDebug(enabled) { this.debug = !!enabled; }
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