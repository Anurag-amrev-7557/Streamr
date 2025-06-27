import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true, // Enable sending cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
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

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call refresh token endpoint
        const response = await api.post('/auth/refresh-token');
        const { accessToken } = response.data.data || response.data;

        if (!accessToken) {
          throw new Error('No access token received from refresh');
        }

        // Update access token in localStorage
        localStorage.setItem('accessToken', accessToken);

        // Update the failed request's authorization header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, clear token and redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken } = response.data.data || response.data;
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    return response.data;
  },

  signup: async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { accessToken } = response.data.data || response.data;
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh-token');
    const { accessToken } = response.data.data || response.data;
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.get(`/auth/verify-email/${token}`);
    return response.data;
  }
};

// User API calls
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/user/profile', userData);
    return response.data;
  },

  uploadProfilePicture: async (formData) => {
    const response = await api.post('/user/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const response = await api.put('/user/change-password', { oldPassword, newPassword });
    return response.data;
  },

  updatePreferences: async (data) => {
    const response = await api.put('/user/preferences', data);
    return response.data;
  }
};

export { api }; 