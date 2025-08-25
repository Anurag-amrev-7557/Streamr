// Enhanced Network Service optimized for mobile networks
// - Adaptive timeouts and retries based on network conditions (effectiveType, saveData)
// - Concurrency limiting with a fair queue
// - In-flight request de-duplication
// - Cache-first with stale-while-revalidate using enhancedCacheService
// - Simple prefetch API

import enhancedCache from './enhancedCacheService.js';

class EnhancedNetworkService {
  constructor() {
    this.defaults = {
      timeoutFast: 8000, // Increased for better reliability
      timeoutSlow: 15000, // Increased for better reliability
      timeoutVerySlow: 25000, // Increased for better reliability
      retryFast: 2, // Increased retries for better reliability
      retrySlow: 3, // Increased retries for better reliability
      retryVerySlow: 4, // Increased retries for better reliability
      baseBackoffMs: 800, // Increased backoff for better stability
      maxBackoffMs: 8000, // Increased max backoff
      maxConcurrentFast: 8, // Increased for better performance
      maxConcurrentSlow: 4, // Increased for better performance
      maxConcurrentVerySlow: 2
    };

    const profile = this.getNetworkProfile();

    this.state = {
      maxConcurrent: this.computeMaxConcurrent(profile),
      activeCount: 0,
      queue: [],
      inFlight: new Map() // key -> Promise
    };
  }

  // Public: get network info snapshot
  getNetworkProfile() {
    const nav = navigator;
    const conn = nav && nav.connection ? nav.connection : {};
    const effectiveType = conn.effectiveType || '4g';
    const saveData = !!conn.saveData;
    const downlink = typeof conn.downlink === 'number' ? conn.downlink : null;
    const rtt = typeof conn.rtt === 'number' ? conn.rtt : null;

    // Classify into buckets
    const isVerySlow = saveData || effectiveType === '2g' || effectiveType === 'slow-2g';
    const isSlow = effectiveType === '3g' || (downlink !== null && downlink < 1);
    const bucket = isVerySlow ? 'verySlow' : isSlow ? 'slow' : 'fast';

    return { effectiveType, saveData, downlink, rtt, bucket };
  }

  computeMaxConcurrent(profile) {
    switch (profile.bucket) {
      case 'verySlow':
        return this.defaults.maxConcurrentVerySlow;
      case 'slow':
        return this.defaults.maxConcurrentSlow;
      default:
        return this.defaults.maxConcurrentFast;
    }
  }

  computeTimeout(profile) {
    switch (profile.bucket) {
      case 'verySlow':
        return this.defaults.timeoutVerySlow;
      case 'slow':
        return this.defaults.timeoutSlow;
      default:
        return this.defaults.timeoutFast;
    }
  }

  computeRetries(profile) {
    switch (profile.bucket) {
      case 'verySlow':
        return this.defaults.retryVerySlow;
      case 'slow':
        return this.defaults.retrySlow;
      default:
        return this.defaults.retryFast;
    }
  }

  // Simple fair semaphore
  async withConcurrency(fn) {
    if (this.state.activeCount < this.state.maxConcurrent) {
      this.state.activeCount++;
      try {
        return await fn();
      } finally {
        this.state.activeCount--;
        this.drainQueue();
      }
    }

    return new Promise((resolve, reject) => {
      this.state.queue.push({ fn, resolve, reject });
    });
  }

  async drainQueue() {
    while (this.state.activeCount < this.state.maxConcurrent && this.state.queue.length > 0) {
      const item = this.state.queue.shift();
      this.state.activeCount++;
      item.fn()
        .then((v) => item.resolve(v))
        .catch((e) => item.reject(e))
        .finally(() => {
          this.state.activeCount--;
          this.drainQueue();
        });
    }
  }

  // In-flight de-duplication
  getInFlight(key) {
    return this.state.inFlight.get(key) || null;
  }

  setInFlight(key, promise) {
    this.state.inFlight.set(key, promise);
    promise.finally(() => this.state.inFlight.delete(key));
  }

  // Core fetch with adaptive timeout/retry
  async performFetch(url, options, profile) {
    const timeoutMs = this.computeTimeout(profile);
    const maxRetries = this.computeRetries(profile);

    let lastErr;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(to);
        if (!res.ok) {
          // Do not retry for 4xx except 408
          if (res.status >= 400 && res.status < 500 && res.status !== 408) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res;
      } catch (err) {
        clearTimeout(to);
        lastErr = err;
        const isAbort = err && (err.name === 'AbortError' || /timeout/i.test(String(err.message)));
        const isNetwork = err && /network|failed|fetch|connection/i.test(String(err.message));
        const shouldRetry = attempt <= maxRetries && (isAbort || isNetwork);
        if (!shouldRetry) break;
        const backoff = Math.min(this.defaults.baseBackoffMs * Math.pow(2, attempt - 1), this.defaults.maxBackoffMs);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    throw lastErr;
  }

  // Public API: GET JSON with cache-first SWR
  async getJSON(endpoint, {
    params = {},
    headers = {},
    cacheKey = null,
    namespace = 'api',
    ttl = 10 * 60 * 1000,
    swr = true, // stale-while-revalidate
    forceNetwork = false,
    priority = 'normal'
  } = {}) {
    const url = this.buildUrl(endpoint, params);
    const profile = this.getNetworkProfile();
    const key = cacheKey || this.generateCacheKey('GET', url);

    // If not forcing network, return cached immediately and revalidate in background
    if (!forceNetwork) {
      const cached = await enhancedCache.get(key, { namespace });
      if (cached) {
        if (swr) {
          // Background revalidation (low priority)
          this.prefetch(endpoint, { params, headers, cacheKey: key, namespace, ttl, priority });
        }
        return { ok: true, fromCache: true, stale: false, data: cached };
      }
    }

    // In-flight de-duplication
    const inflightKey = `GET:${url}`;
    const existing = this.getInFlight(inflightKey);
    if (existing) {
      try {
        const data = await existing;
        return { ok: true, fromCache: false, stale: false, data };
      } catch (e) {
        // fall through to attempt fresh fetch below
      }
    }

    // Enqueue with concurrency controls
    const exec = async () => {
      const response = await this.performFetch(url, { headers: { 'Content-Type': 'application/json', ...headers } }, profile);
      const json = await response.json();
      await enhancedCache.set(key, json, { namespace, ttl, priority, metadata: { url, method: 'GET' } });
      return json;
    };

    const p = this.withConcurrency(exec);
    this.setInFlight(inflightKey, p);

    try {
      const data = await p;
      return { ok: true, fromCache: false, stale: false, data };
    } catch (error) {
      // Fallback to cache on error
      const cached = await enhancedCache.get(key, { namespace });
      if (cached) {
        return { ok: false, fromCache: true, stale: true, data: cached, error };
      }
      throw error;
    }
  }

  // Fire-and-forget prefetch (low priority)
  async prefetch(endpoint, { params = {}, headers = {}, cacheKey = null, namespace = 'prefetch', ttl = 30 * 60 * 1000, priority = 'low' } = {}) {
    const url = this.buildUrl(endpoint, params);
    const key = cacheKey || this.generateCacheKey('GET', url);
    const inflightKey = `GET:${url}`;
    if (this.state.inFlight.has(inflightKey)) return;
    const exec = async () => {
      try {
        const profile = this.getNetworkProfile();
        const response = await this.performFetch(url, { headers: { 'Content-Type': 'application/json', 'X-Prefetch': '1', ...headers } }, profile);
        const json = await response.json();
        await enhancedCache.set(key, json, { namespace, ttl, priority, metadata: { url, method: 'GET', prefetch: true } });
      } catch (_) {
        // Silent prefetch failure
      }
    };
    this.setInFlight(inflightKey, this.withConcurrency(exec));
  }

  // Utilities
  generateCacheKey(method, url) {
    return btoa(`${method}:${url}`).replace(/[^a-zA-Z0-9]/g, '');
  }

  buildUrl(endpoint, params) {
    // If endpoint looks absolute, use as-is
    const isAbsolute = /^https?:\/\//i.test(endpoint);
    const urlObj = new URL(isAbsolute ? endpoint : endpoint, window.location.origin);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        urlObj.searchParams.set(k, v);
      }
    });
    return urlObj.toString();
  }
}

const enhancedNetworkService = new EnhancedNetworkService();
export default enhancedNetworkService;
