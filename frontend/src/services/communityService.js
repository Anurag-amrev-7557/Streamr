import axios from 'axios';
import { getNetworkAwareConfig, fetchWithRetry } from './api.js';
import { getApiUrl } from '../config/api.js';

// --- Enhanced In-Memory Cache with Expiry, Stats, and LRU Eviction ---
const MAX_CACHE_ITEMS = 50;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const communityCache = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  sets: 0,
  clears: 0
};

function getCachedData(key) {
  const cached = communityCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // Move to end for LRU
    communityCache.delete(key);
    communityCache.set(key, cached);
    cacheStats.hits++;
    return cached.data;
  }
  if (cached) {
    // Expired, remove
    communityCache.delete(key);
    cacheStats.evictions++;
  }
  cacheStats.misses++;
  return null;
}

function setCachedData(key, data) {
  if (communityCache.size >= MAX_CACHE_ITEMS) {
    // LRU eviction: remove oldest
    const oldestKey = communityCache.keys().next().value;
    communityCache.delete(oldestKey);
    cacheStats.evictions++;
  }
  communityCache.set(key, {
    data,
    timestamp: Date.now()
  });
  cacheStats.sets++;
}

// Support getting raw cache entry (for SWR logic)
function _getCacheEntry(key) {
  return communityCache.get(key) || null;
}

function clearCache() {
  communityCache.clear();
  cacheStats.clears++;
}

function getCacheStats() {
  return { ...cacheStats, size: communityCache.size };
}

// --- Lazy API URL and Instance ---
let API_URL = null;
const getApiUrlLazy = () => {
  if (!API_URL) {
    API_URL = getApiUrl();
  }
  return API_URL;
};

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- Axios Instance with Interceptors, Retry, and Logging ---
let apiInstance = null;
function createApiInstance() {
  const instance = axios.create({
    baseURL: getApiUrlLazy(),
    headers: { 'Content-Type': 'application/json' }
  });
  addInterceptors(instance);
  return instance;
}

function getApiInstance() {
  if (!apiInstance) {
    apiInstance = createApiInstance();
  }
  return apiInstance;
}

function addInterceptors(api) {
  // Request: Add auth, log
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      config.metadata = { startTime: Date.now() };
      // Optionally log requests
      // console.debug('[API] Request:', config.method, config.url, config.params || config.data);
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response: Log, error handling
  api.interceptors.response.use(
    (response) => {
      const ms = Date.now() - (response.config.metadata?.startTime || Date.now());
      if (ms > 1000) {
        console.warn(`[API] Slow response (${ms}ms):`, response.config.url);
      }
      return response;
    },
    (error) => {
      // Normalize error shape but keep original error attached for debugging
      const normalized = {
        message: error.message || 'API request failed',
        status: error.response?.status || null,
        data: error.response?.data || null
      };

      // Attach raw error for callers that need full axios info
      normalized._raw = error;

      if (error.response) {
        console.error('Response error:', error.response.data);
        return Promise.reject(normalized);
      } else if (error.request) {
        console.error('Request error (no response):', error.request);
        return Promise.reject({ ...normalized, message: 'No response from server' });
      } else {
        console.error('Error:', error.message);
        return Promise.reject(normalized);
      }
    }
  );
}

// --- Request utilities: in-flight dedupe, abort support, and SWR ---

// Map<cacheKey, Promise>
const inFlightRequests = new Map();

function buildCacheKey(parts) {
  try {
    if (typeof parts === 'string') return parts;
    return JSON.stringify(parts);
  } catch (e) {
    return String(parts);
  }
}

/**
 * Wrapper to perform HTTP requests with abort support, in-flight dedupe and caching.
 * Options:
 * - method, url, data, params
 * - cacheKey: string
 * - forceRefresh: boolean
 * - staleWhileRevalidate: boolean
 * - signal: AbortSignal
 */
async function makeRequest({ method = 'get', url, data, params, cacheKey = null, forceRefresh = false, staleWhileRevalidate = true, signal = null, timeoutOverride = null }) {
  const { timeout } = getNetworkAwareConfig();
  const effectiveTimeout = timeoutOverride || timeout;

  const key = cacheKey ? buildCacheKey(cacheKey) : null;

  // SWR: return cached immediately and revalidate in background
  if (key && !forceRefresh) {
    const entry = _getCacheEntry(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      cacheStats.hits++;
      if (staleWhileRevalidate) {
        // Kick off background update but don't await it
        _revalidateInBackground({ method, url, data, params, key, signal, effectiveTimeout });
      }
      return entry.data;
    }
  }

  // Dedupe in-flight identical requests
  const inFlightKey = key || `${method.toUpperCase()}::${url}::${JSON.stringify(params || {})}::${JSON.stringify(data || {})}`;
  if (inFlightRequests.has(inFlightKey)) {
    return inFlightRequests.get(inFlightKey);
  }

  const promise = (async () => {
    try {
      const config = { timeout: effectiveTimeout };
      if (signal) config.signal = signal;
      if (params) config.params = params;

      const instance = getApiInstance();

      const requestFn = () => instance.request({ method, url, data, ...config }).then(r => r.data);

      const result = await fetchWithRetry(requestFn);

      if (key) setCachedData(key, result);
      return result;
    } finally {
      inFlightRequests.delete(inFlightKey);
    }
  })();

  inFlightRequests.set(inFlightKey, promise);
  return promise;
}

function _revalidateInBackground({ method, url, data, params, key, signal, effectiveTimeout }) {
  // fire-and-forget; errors are logged but not thrown
  (async () => {
    try {
      const cfg = { method, url, data, params, cacheKey: key, forceRefresh: true, staleWhileRevalidate: false, signal, timeoutOverride: effectiveTimeout };
      await makeRequest(cfg);
    } catch (err) {
      console.debug('Background revalidation failed for', key, err.message || err);
    }
  })();
}

// --- Community Service ---
export const communityService = {
  // --- Discussions ---
  /**
   * Fetch paginated discussions. Optional `opts` supports { signal, forceRefresh, staleWhileRevalidate, timeoutOverride }.
   */
  async getDiscussions(page = 1, limit = 10, sortBy = 'newest', category = '', tag = '', opts = {}) {
    const params = { page, limit, sortBy };
    if (category) params.category = category;
    if (tag) params.tag = tag;
    const cacheKey = `discussions_${page}_${limit}_${sortBy}_${category}_${tag}`;

    try {
      const result = await makeRequest({
        method: 'get',
        url: '/community/discussions',
        params,
        cacheKey,
        staleWhileRevalidate: true,
        signal: opts.signal || null,
        forceRefresh: !!opts.forceRefresh,
        timeoutOverride: opts.timeoutOverride || null
      });
      return result;
    } catch (error) {
      console.error('❌ Community Service - Failed to fetch discussions:', error);
      throw error;
    }
  },

  async getDiscussion(id, opts = {}) {
    const cacheKey = `discussion_${id}`;
    try {
      const result = await makeRequest({
        method: 'get',
        url: `/community/discussions/${id}`,
        cacheKey,
        staleWhileRevalidate: true,
        signal: opts.signal || null,
        forceRefresh: !!opts.forceRefresh,
        timeoutOverride: opts.timeoutOverride || null
      });
      return result;
    } catch (error) {
      throw error;
    }
  },

  async createDiscussion(discussionData, opts = {}) {
    const token = localStorage.getItem('accessToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const result = await makeRequest({
      method: 'post',
      url: '/community/discussions',
      data: discussionData,
      cacheKey: null,
      signal: opts.signal || null,
      timeoutOverride: opts.timeoutOverride || null,
      // include headers in config
      headers
    });
    clearCache(); // Invalidate all cache on create
    return result;
  },

  async updateDiscussion(id, discussionData, opts = {}) {
    const token = localStorage.getItem('accessToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const result = await makeRequest({
      method: 'put',
      url: `/community/discussions/${id}`,
      data: discussionData,
      headers,
      signal: opts.signal || null,
      timeoutOverride: opts.timeoutOverride || null
    });
    clearCache();
    return result;
  },

  async deleteDiscussion(id, opts = {}) {
    const token = localStorage.getItem('accessToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const result = await makeRequest({
      method: 'delete',
      url: `/community/discussions/${id}`,
      headers,
      signal: opts.signal || null,
      timeoutOverride: opts.timeoutOverride || null
    });
    clearCache();
    return result;
  },

  // --- Replies ---
  async addReply(discussionId, replyData, opts = {}) {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    const result = await makeRequest({
      method: 'post',
      url: `/community/discussions/${discussionId}/replies`,
      data: { content: replyData.content, parentReplyId: replyData.parentReplyId },
      headers: { Authorization: `Bearer ${token}` },
      signal: opts.signal || null,
      timeoutOverride: opts.timeoutOverride || null
    });
    clearCache();
    return result;
  },

  async updateReply(discussionId, replyId, replyData, opts = {}) {
    const result = await makeRequest({
      method: 'put',
      url: `/community/discussions/${discussionId}/replies/${replyId}`,
      data: replyData,
      signal: opts.signal || null,
      timeoutOverride: opts.timeoutOverride || null
    });
    clearCache();
    return result;
  },

  async deleteReply(discussionId, replyId, opts = {}) {
    const result = await makeRequest({
      method: 'delete',
      url: `/community/discussions/${discussionId}/replies/${replyId}`,
      signal: opts.signal || null,
      timeoutOverride: opts.timeoutOverride || null
    });
    clearCache();
    return result;
  },

  // --- Likes ---
  async likeDiscussion(discussionId, opts = {}) {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    const result = await makeRequest({
      method: 'post',
      url: `/community/discussions/${discussionId}/like`,
      data: {},
      headers: { Authorization: `Bearer ${token}` },
      signal: opts.signal || null,
      timeoutOverride: opts.timeoutOverride || null
    });
    clearCache();
    return result;
  },

  async likeReply(discussionId, replyId, opts = {}) {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    const result = await makeRequest({
      method: 'post',
      url: `/community/discussions/${discussionId}/replies/${replyId}/like`,
      data: {},
      headers: { Authorization: `Bearer ${token}` },
      signal: opts.signal || null,
      timeoutOverride: opts.timeoutOverride || null
    });
    clearCache();
    return result;
  },

  // --- Search and Filters ---
  async searchDiscussions(query, opts = {}) {
    const cacheKey = `search_${query}`;
    const result = await makeRequest({
      method: 'get',
      url: '/community/search',
      params: { q: query },
      cacheKey,
      staleWhileRevalidate: true,
      signal: opts.signal || null,
      forceRefresh: !!opts.forceRefresh,
      timeoutOverride: opts.timeoutOverride || null
    });
    return result;
  },

  async getCategories(opts = {}) {
    const cacheKey = 'categories';
    const result = await makeRequest({
      method: 'get',
      url: '/community/categories',
      cacheKey,
      staleWhileRevalidate: true,
      signal: opts.signal || null,
      forceRefresh: !!opts.forceRefresh,
      timeoutOverride: opts.timeoutOverride || null
    });
    return result;
  },

  async getTopTags(opts = {}) {
    const cacheKey = 'tags';
    const result = await makeRequest({
      method: 'get',
      url: '/community/tags',
      cacheKey,
      staleWhileRevalidate: true,
      signal: opts.signal || null,
      forceRefresh: !!opts.forceRefresh,
      timeoutOverride: opts.timeoutOverride || null
    });
    return result;
  },

  // --- Community Stats ---
  async getTrendingTopics(opts = {}) {
    const cacheKey = 'trending';
    const result = await makeRequest({
      method: 'get',
      url: '/community/trending',
      cacheKey,
      staleWhileRevalidate: true,
      signal: opts.signal || null,
      forceRefresh: !!opts.forceRefresh,
      timeoutOverride: opts.timeoutOverride || null
    });
    return result;
  },

  async getCommunityStats(opts = {}) {
    const cacheKey = 'stats';
    const result = await makeRequest({
      method: 'get',
      url: '/community/stats',
      cacheKey,
      staleWhileRevalidate: true,
      signal: opts.signal || null,
      forceRefresh: !!opts.forceRefresh,
      timeoutOverride: opts.timeoutOverride || null
    });
    return result;
  },

  // --- Analytics & Cache Management ---
  clearCache,
  getCachedData,
  setCachedData,
  getCacheStats
};