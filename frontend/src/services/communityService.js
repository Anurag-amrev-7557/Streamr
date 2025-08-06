import axios from 'axios';
import { getNetworkAwareConfig } from './api.js';
import rateLimitService from './rateLimitService.js';

// Cache for community data
const communityCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getApiUrlLazy = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
};

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const createApiInstance = () => {
  const baseURL = getApiUrlLazy();
  return axios.create({
    baseURL,
    timeout: getNetworkAwareConfig().timeout,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });
};

// Create the api instance
const api = createApiInstance();

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', error.response.data);
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request error:', error.request);
      return Promise.reject({ message: 'No response from server' });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
      return Promise.reject({ message: error.message });
    }
  }
);

// Cache management functions
const getCachedData = (key) => {
  const cached = communityCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  communityCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const clearCache = () => {
  communityCache.clear();
};

const communityService = {
  // Discussions
  getDiscussions: async (page = 1, limit = 10, sortBy = 'newest', category = null, tag = null) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy
    });
    
    if (category) params.append('category', category);
    if (tag) params.append('tag', tag);
    
    const cacheKey = `discussions_${params.toString()}`;
    
    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('✅ Community Service - Using cached discussions');
      return cached;
    }
    
    const { timeout } = getNetworkAwareConfig();
    
    try {
      // Use rate limiting service
      const result = await rateLimitService.queueRequest(async () => {
        const response = await api.get(`/community/discussions?${params}`, { timeout });
        return response.data;
      }, 'normal');
      
      // Cache the result
      setCachedData(cacheKey, result);
      
      console.log('✅ Community Service - Discussions fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Community Service - Failed to fetch discussions:', error);
      throw error;
    }
  },

  getDiscussion: async (id) => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.get(`/community/discussions/${id}`, { timeout });
      return response.data;
    });
  },

  createDiscussion: async (discussionData) => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.post('/community/discussions', discussionData, { timeout });
      return response.data;
    }, 'high'); // High priority for user actions
  },

  updateDiscussion: async (id, discussionData) => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.put(`/community/discussions/${id}`, discussionData, { timeout });
      return response.data;
    }, 'high');
  },

  deleteDiscussion: async (id) => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.delete(`/community/discussions/${id}`, { timeout });
      return response.data;
    }, 'high');
  },

  // Replies
  addReply: async (discussionId, replyData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    return rateLimitService.queueRequest(async () => {
      const response = await api.post(`/community/discussions/${discussionId}/replies`, {
        content: replyData.content,
        parentReplyId: replyData.parentReplyId
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      });
      return response.data;
    }, 'high');
  },

  updateReply: async (discussionId, replyId, replyData) => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.put(
        `/community/discussions/${discussionId}/replies/${replyId}`,
        replyData,
        { timeout }
      );
      return response.data;
    }, 'high');
  },

  deleteReply: async (discussionId, replyId) => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.delete(
        `/community/discussions/${discussionId}/replies/${replyId}`,
        { timeout }
      );
      return response.data;
    }, 'high');
  },

  // Likes
  likeDiscussion: async (discussionId) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    return rateLimitService.queueRequest(async () => {
      const response = await api.post(`/community/discussions/${discussionId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      });
      return response.data;
    }, 'high');
  },

  unlikeDiscussion: async (discussionId) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    return rateLimitService.queueRequest(async () => {
      const response = await api.delete(`/community/discussions/${discussionId}/like`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      });
      return response.data;
    }, 'high');
  },

  likeReply: async (discussionId, replyId) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    return rateLimitService.queueRequest(async () => {
      const response = await api.post(
        `/community/discussions/${discussionId}/replies/${replyId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout
        }
      );
      return response.data;
    }, 'high');
  },

  unlikeReply: async (discussionId, replyId) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    return rateLimitService.queueRequest(async () => {
      const response = await api.delete(
        `/community/discussions/${discussionId}/replies/${replyId}/like`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout
        }
      );
      return response.data;
    }, 'high');
  },

  // Search and Discovery
  searchDiscussions: async (query) => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.get(`/community/search?q=${encodeURIComponent(query)}`, { timeout });
      return response.data;
    });
  },

  getCategories: async () => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.get('/community/categories', { timeout });
      return response.data;
    });
  },

  getTopTags: async () => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.get('/community/tags', { timeout });
      return response.data;
    });
  },

  // Community Stats
  getTrendingTopics: async () => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.get('/community/trending', { timeout });
      return response.data;
    });
  },

  getCommunityStats: async () => {
    const { timeout } = getNetworkAwareConfig();
    return rateLimitService.queueRequest(async () => {
      const response = await api.get('/community/stats', { timeout });
      return response.data;
    });
  },

  // Cache management
  clearCache,
  getCacheStats: () => ({
    size: communityCache.size,
    entries: Array.from(communityCache.keys())
  })
};

export default communityService; 