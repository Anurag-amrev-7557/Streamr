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
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.post('/auth/login', { email, password }, { timeout })
        .then(response => {
          const { accessToken } = response.data.data || response.data;
          if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
          }
          return response.data;
        })
    );
  },

  signup: async (userData) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.post('/auth/register', userData, { timeout })
        .then(response => {
          const { accessToken } = response.data.data || response.data;
          if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
          }
          return response.data;
        })
    );
  },

  logout: async () => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.post('/auth/logout', {}, { timeout })
        .then(response => {
          localStorage.removeItem('accessToken');
          return response.data;
        })
    );
  },

  refreshToken: async () => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.post('/auth/refresh-token', {}, { timeout })
        .then(response => {
          const { accessToken } = response.data.data || response.data;
          if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
          }
          return response.data;
        })
    );
  },

  forgotPassword: async (email) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.post('/auth/forgot-password', { email }, { timeout })
        .then(response => response.data)
    );
  },

  resetPassword: async (token, newPassword) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.post('/auth/reset-password', { token, newPassword }, { timeout })
        .then(response => response.data)
    );
  },

  verifyEmail: async (token) => {
    const { timeout } = getNetworkAwareConfig();
    return fetchWithRetry(() =>
      api.get(`/auth/verify-email/${token}`, { timeout })
        .then(response => response.data)
    );
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

// Network-aware fetch utility
export function getNetworkType() {
  if (typeof navigator !== 'undefined' && navigator.connection) {
    return navigator.connection.effectiveType || navigator.connection.type || 'unknown';
  }
  return 'unknown';
}

export function getNetworkAwareConfig() {
  const type = getNetworkType();
  // Adjust timeout, quality, or other params based on network
  switch (type) {
    case 'slow-2g':
    case '2g':
      return { timeout: 8000, quality: 'low' };
    case '3g':
      return { timeout: 6000, quality: 'medium' };
    case '4g':
    case 'wifi':
    case 'ethernet':
      return { timeout: 4000, quality: 'high' };
    default:
      return { timeout: 5000, quality: 'auto' };
  }
}

// Generic retry with exponential backoff
export async function fetchWithRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      await new Promise(res => setTimeout(res, Math.pow(2, attempt) * baseDelay));
    }
  }
}

export { api }; 