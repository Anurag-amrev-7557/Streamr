import axios from 'axios';

const API_URL = 'http://localhost:3001/api/community';

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
    try {
      const params = new URLSearchParams({
        page,
        limit,
        sortBy,
        ...(category && { category }),
        ...(tag && { tag })
      });
      const response = await api.get(`/discussions?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching discussions:', error);
      throw error;
    }
  },

  getDiscussion: async (id) => {
    try {
      const response = await api.get(`/discussions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching discussion:', error);
      throw error;
    }
  },

  createDiscussion: async (discussionData) => {
    try {
      const response = await api.post('/discussions', discussionData);
      return response.data;
    } catch (error) {
      console.error('Error creating discussion:', error);
      throw error;
    }
  },

  updateDiscussion: async (id, discussionData) => {
    try {
      const response = await api.put(`/discussions/${id}`, discussionData);
      return response.data;
    } catch (error) {
      console.error('Error updating discussion:', error);
      throw error;
    }
  },

  deleteDiscussion: async (id) => {
    try {
      const response = await api.delete(`/discussions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting discussion:', error);
      throw error;
    }
  },

  // Replies
  addReply: async (discussionId, replyData) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Add the reply
      const response = await api.post(`/discussions/${discussionId}/replies`, {
        content: replyData.content,
        parentReplyId: replyData.parentReplyId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  },

  updateReply: async (discussionId, replyId, replyData) => {
    try {
      const response = await api.put(
        `/discussions/${discussionId}/replies/${replyId}`,
        replyData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating reply:', error);
      throw error;
    }
  },

  deleteReply: async (discussionId, replyId) => {
    try {
      const response = await api.delete(
        `/discussions/${discussionId}/replies/${replyId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }
  },

  // Likes
  likeDiscussion: async (discussionId) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await api.post(`/discussions/${discussionId}/like`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      console.error('Error liking discussion:', error);
      throw error;
    }
  },

  likeReply: async (discussionId, replyId) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await api.post(
        `/discussions/${discussionId}/replies/${replyId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      console.error('Error liking reply:', error);
      throw error;
    }
  },

  // Search and Filters
  searchDiscussions: async (query) => {
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching discussions:', error);
      throw error;
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get('/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  getTopTags: async () => {
    try {
      const response = await api.get('/tags');
      return response.data;
    } catch (error) {
      console.error('Error fetching top tags:', error);
      throw error;
    }
  },

  // Community Stats
  getTrendingTopics: async () => {
    try {
      const response = await api.get('/trending');
      return response.data;
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      throw error;
    }
  },

  getCommunityStats: async () => {
    try {
      const response = await api.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching community stats:', error);
      throw error;
    }
  }
}; 