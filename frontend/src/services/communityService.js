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
      if (error.response) {
        console.error('Response error:', error.response.data);
        return Promise.reject(error.response.data);
      } else if (error.request) {
        console.error('Request error:', error.request);
        return Promise.reject({ message: 'No response from server' });
      } else {
        console.error('Error:', error.message);
        return Promise.reject({ message: error.message });
      }
    }
  );
}

// --- Community Service ---
export const communityService = {
  // --- Discussions ---
  async getDiscussions(page = 1, limit = 10, sortBy = 'newest', category = '', tag = '') {
    const { timeout } = getNetworkAwareConfig();
    const params = new URLSearchParams({
      page,
      limit,
      sortBy,
      ...(category && { category }),
      ...(tag && { tag })
    });
    const cacheKey = `discussions_${page}_${limit}_${sortBy}_${category}_${tag}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 Using cached discussions');
      return cached;
    }

    try {
      const result = await fetchWithRetry(() =>
        getApiInstance().get(`/community/discussions?${params}`, { timeout })
          .then(response => response.data)
      );
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('❌ Community Service - Failed to fetch discussions:', error);
      throw error;
    }
  },

  async getDiscussion(id) {
    const cacheKey = `discussion_${id}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().get(`/community/discussions/${id}`, { timeout })
        .then(response => response.data)
    );
    setCachedData(cacheKey, result);
    return result;
  },

  async createDiscussion(discussionData) {
    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().post('/community/discussions', discussionData, { timeout })
        .then(response => response.data)
    );
    clearCache(); // Invalidate all cache on create
    return result;
  },

  async updateDiscussion(id, discussionData) {
    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().put(`/community/discussions/${id}`, discussionData, { timeout })
        .then(response => response.data)
    );
    clearCache();
    return result;
  },

  async deleteDiscussion(id) {
    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().delete(`/community/discussions/${id}`, { timeout })
        .then(response => response.data)
    );
    clearCache();
    return result;
  },

  // --- Replies ---
  async addReply(discussionId, replyData) {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    const result = await fetchWithRetry(() =>
      getApiInstance().post(`/community/discussions/${discussionId}/replies`, {
        content: replyData.content,
        parentReplyId: replyData.parentReplyId
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      }).then(response => response.data)
    );
    clearCache();
    return result;
  },

  async updateReply(discussionId, replyId, replyData) {
    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().put(
        `/community/discussions/${discussionId}/replies/${replyId}`,
        replyData,
        { timeout }
      ).then(response => response.data)
    );
    clearCache();
    return result;
  },

  async deleteReply(discussionId, replyId) {
    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().delete(
        `/community/discussions/${discussionId}/replies/${replyId}`,
        { timeout }
      ).then(response => response.data)
    );
    clearCache();
    return result;
  },

  // --- Likes ---
  async likeDiscussion(discussionId) {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    const result = await fetchWithRetry(() =>
      getApiInstance().post(`/community/discussions/${discussionId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      }).then(response => response.data)
    );
    clearCache();
    return result;
  },

  async likeReply(discussionId, replyId) {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    const result = await fetchWithRetry(() =>
      getApiInstance().post(
        `/community/discussions/${discussionId}/replies/${replyId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout
        }
      ).then(response => response.data)
    );
    clearCache();
    return result;
  },

  // --- Search and Filters ---
  async searchDiscussions(query) {
    const { timeout } = getNetworkAwareConfig();
    const cacheKey = `search_${query}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    const result = await fetchWithRetry(() =>
      getApiInstance().get(`/community/search?q=${encodeURIComponent(query)}`, { timeout })
        .then(response => response.data)
    );
    setCachedData(cacheKey, result);
    return result;
  },

  async getCategories() {
    const cacheKey = 'categories';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 Using cached categories');
      return cached;
    }

    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().get('/community/categories', { timeout })
        .then(response => response.data)
    );
    setCachedData(cacheKey, result);
    return result;
  },

  async getTopTags() {
    const cacheKey = 'tags';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 Using cached tags');
      return cached;
    }

    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().get('/community/tags', { timeout })
        .then(response => response.data)
    );
    setCachedData(cacheKey, result);
    return result;
  },

  // --- Community Stats ---
  async getTrendingTopics() {
    const cacheKey = 'trending';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 Using cached trending topics');
      return cached;
    }

    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().get('/community/trending', { timeout })
        .then(response => response.data)
    );
    setCachedData(cacheKey, result);
    return result;
  },

  async getCommunityStats() {
    const cacheKey = 'stats';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 Using cached community stats');
      return cached;
    }

    const { timeout } = getNetworkAwareConfig();
    const result = await fetchWithRetry(() =>
      getApiInstance().get('/community/stats', { timeout })
        .then(response => response.data)
    );
    setCachedData(cacheKey, result);
    return result;
  },

  // --- Analytics & Cache Management ---
  clearCache,
  getCachedData,
  setCachedData,
  getCacheStats
};