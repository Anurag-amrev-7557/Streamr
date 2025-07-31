import axios from 'axios';
import { getNetworkAwareConfig, fetchWithRetry } from './api';
import { getApiUrl } from '../config/api';

const API_URL = getApiUrl();

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

export const communityService = {
  // Discussions
  getDiscussions: async (page = 1, limit = 10, sortBy = 'newest', category = '', tag = '') => {
    const { timeout } = getNetworkAwareConfig();
    const params = new URLSearchParams({
      page,
      limit,
      sortBy,
      ...(category && { category }),
      ...(tag && { tag })
    });
    return fetchWithRetry(() =>
      api.get(`/community/discussions?${params}`, { timeout })
        .then(response => response.data)
    );
  },

  getDiscussion: async (id) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.get(`/community/discussions/${id}`, { timeout })
        .then(response => response.data)
    );
  },

  createDiscussion: async (discussionData) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.post('/community/discussions', discussionData, { timeout })
        .then(response => response.data)
    );
  },

  updateDiscussion: async (id, discussionData) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.put(`/community/discussions/${id}`, discussionData, { timeout })
        .then(response => response.data)
    );
  },

  deleteDiscussion: async (id) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.delete(`/community/discussions/${id}`, { timeout })
        .then(response => response.data)
    );
  },

  // Replies
  addReply: async (discussionId, replyData) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    return fetchWithRetry(() =>
      api.post(`/community/discussions/${discussionId}/replies`, {
        content: replyData.content,
        parentReplyId: replyData.parentReplyId
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      }).then(response => response.data)
    );
  },

  updateReply: async (discussionId, replyId, replyData) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.put(
        `/community/discussions/${discussionId}/replies/${replyId}`,
        replyData,
        { timeout }
      ).then(response => response.data)
    );
  },

  deleteReply: async (discussionId, replyId) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.delete(
        `/community/discussions/${discussionId}/replies/${replyId}`,
        { timeout }
      ).then(response => response.data)
    );
  },

  // Likes
  likeDiscussion: async (discussionId) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    return fetchWithRetry(() =>
      api.post(`/community/discussions/${discussionId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      }).then(response => response.data)
    );
  },

  likeReply: async (discussionId, replyId) => {
    const { timeout } = getNetworkAwareConfig();
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Authentication required');
    return fetchWithRetry(() =>
      api.post(
        `/community/discussions/${discussionId}/replies/${replyId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout
        }
      ).then(response => response.data)
    );
  },

  // Search and Filters
  searchDiscussions: async (query) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.get(`/community/search?q=${encodeURIComponent(query)}`, { timeout })
        .then(response => response.data)
    );
  },

  getCategories: async () => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.get('/community/categories', { timeout })
        .then(response => response.data)
    );
  },

  getTopTags: async () => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.get('/community/tags', { timeout })
        .then(response => response.data)
    );
  },

  // Community Stats
  getTrendingTopics: async () => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.get('/community/trending', { timeout })
        .then(response => response.data)
    );
  },

  getCommunityStats: async () => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.get('/community/stats', { timeout })
        .then(response => response.data)
    );
  }
}; 