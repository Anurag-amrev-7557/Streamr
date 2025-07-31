import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// Authentication API functions
const authAPI = {
  refreshToken: async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  },
  
  login: async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
  forgotPassword: async (email) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('Forgot password request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },
  
  resetPassword: async (token, newPassword) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      
      if (!response.ok) {
        throw new Error('Password reset failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },
  
  verifyEmail: async (token) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        throw new Error('Email verification failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }
};

const userAPI = {
  getProfile: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token');
      }
      
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get user profile');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },
  
  updateProfile: async (userData) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token');
      }
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
  
  signup: async (userData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Signup failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }
};

const AuthContext = createContext(null);

// Token refresh interval (4 minutes)
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;
// Session timeout (2 days)
const SESSION_TIMEOUT = 2 * 24 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [rememberMe, setRememberMe] = useState(false);
  const [refreshTokenTimeout, setRefreshTokenTimeout] = useState(null);
  const [sessionWarning, setSessionWarning] = useState(false);

  // Use refs to track timeouts and intervals for proper cleanup
  const refreshTokenTimeoutRef = useRef(null);
  const sessionCheckIntervalRef = useRef(null);
  const activityListenersRef = useRef([]);
  const isMountedRef = useRef(true);

  // Update last activity time
  const updateActivity = useCallback(() => {
    if (isMountedRef.current) {
      setLastActivity(Date.now());
      setSessionWarning(false);
    }
  }, []);

  // Check session timeout
  useEffect(() => {
    const checkSessionTimeout = () => {
      if (!isMountedRef.current) return;
      
      const timeLeft = SESSION_TIMEOUT - (Date.now() - lastActivity);
      
      // Show warning 1 hour before timeout
      if (timeLeft <= 60 * 60 * 1000 && !sessionWarning) {
        setSessionWarning(true);
      }
      
      // Logout if session expired
      if (!rememberMe && timeLeft <= 0) {
        console.log('Session timed out');
        logout();
      }
    };

    sessionCheckIntervalRef.current = setInterval(checkSessionTimeout, 60000); // Check every minute
    
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [lastActivity, rememberMe, sessionWarning]);

  // Add activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const listeners = [];
    
    events.forEach(event => {
      const listener = () => updateActivity();
      window.addEventListener(event, listener);
      listeners.push({ event, listener });
    });

    activityListenersRef.current = listeners;

    return () => {
      listeners.forEach(({ event, listener }) => {
        window.removeEventListener(event, listener);
      });
      activityListenersRef.current = [];
    };
  }, [updateActivity]);

  // Function to refresh token and update user data
  const refreshTokenAndUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found');
        return false;
      }

      const response = await authAPI.refreshToken();
      const { accessToken } = response.data || response;
      
      if (!accessToken) {
        console.error('No access token received from refresh');
        return false;
      }

      localStorage.setItem('accessToken', accessToken);
      
      // Get fresh user data
      const profileResponse = await userAPI.getProfile();
      if (!profileResponse.data) {
        console.error('No user data received after refresh');
        return false;
      }

      if (isMountedRef.current) {
        setUser(profileResponse.data);
        setLastActivity(Date.now());
        setSessionWarning(false);
      }
      return true;
    } catch (err) {
      console.error('Token refresh failed:', err);
      localStorage.removeItem('accessToken');
      if (isMountedRef.current) {
        setUser(null);
      }
      return false;
    }
  }, []);

  // Automatic token refresh
  useEffect(() => {
    let refreshTimeout = null;

    const scheduleRefresh = async () => {
      if (!isMountedRef.current) return;

      // Clear any existing timeout
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }

      // Set new timeout - refresh 1 minute before token expires
      refreshTimeout = setTimeout(async () => {
        if (!isMountedRef.current) return;
        
        const success = await refreshTokenAndUserData();
        if (success && isMountedRef.current) {
          scheduleRefresh(); // Schedule next refresh only if successful
        } else if (isMountedRef.current) {
          // If refresh failed, try again in 30 seconds
          refreshTimeout = setTimeout(scheduleRefresh, 30000);
        }
      }, TOKEN_REFRESH_INTERVAL - 60000); // Refresh 1 minute before expiration

      refreshTokenTimeoutRef.current = refreshTimeout;
    };

    if (user) {
      scheduleRefresh();
    }

    return () => {
      if (refreshTokenTimeoutRef.current) {
        clearTimeout(refreshTokenTimeoutRef.current);
        refreshTokenTimeoutRef.current = null;
      }
    };
  }, [user, refreshTokenAndUserData]);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          if (isMountedRef.current) {
            setLoading(false);
            setUser(null);
          }
          return;
        }

        // Add a loading check here to prevent race conditions during OAuth login
        // if (loading) return;

        try {
          // Get user profile first
          const profileResponse = await userAPI.getProfile();
          if (!isMountedRef.current) return;

          if (profileResponse.data) {
            setUser(profileResponse.data);
          } else {
            // If profile is empty, logout
            throw new Error('No user data found');
          }
        } catch (profileError) {
          console.error('Profile fetch failed, attempting to refresh token:', profileError);
          if (!isMountedRef.current) return;
          
          // If profile fetch fails, try to refresh token once
          const refreshSuccess = await refreshTokenAndUserData();
          if (!refreshSuccess && isMountedRef.current) {
            // If refresh also fails, logout
            throw new Error('Token refresh failed');
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        if (isMountedRef.current) {
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMountedRef.current = false;
    };
  }, [refreshTokenAndUserData]);

  const reloadUser = async () => {
    try {
      const profileResponse = await userAPI.getProfile();
      if (profileResponse.data) {
        setUser(profileResponse.data);
      } else {
        throw new Error('No user data found');
      }
    } catch (error) {
      console.error('Failed to reload user:', error);
    }
  };

  const login = useCallback(async (emailOrUser, password, remember = false) => {
    try {
      setLoading(true);
      setError(null);
      setRememberMe(remember);
      
      // If only one argument is provided and it's an object, it's an OAuth login
      if (!password && typeof emailOrUser === 'object') {
        const { user, accessToken } = emailOrUser;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }
        setUser(user);
        setLastActivity(Date.now());
        setSessionWarning(false);
        setLoading(false);
        return { success: true };
      }
      
      // Regular email/password login
      const response = await authAPI.login(emailOrUser, password);
      
      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }
      
      // Set user data and token
      const { user, accessToken } = response.data;
      if (!accessToken) {
        throw new Error('No access token received from login');
      }
      
      localStorage.setItem('accessToken', accessToken);
      setUser(user);
      setLastActivity(Date.now());
      setSessionWarning(false);
      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to login';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.signup(userData);
      
      // Set user data and token
      const { accessToken, user } = response.data.data;
      if (!accessToken) {
        throw new Error('No access token received from signup');
      }
      
      localStorage.setItem('accessToken', accessToken);
      setUser(user);
      setLastActivity(Date.now());
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create account';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      // Clear all timeouts and intervals
      if (refreshTokenTimeoutRef.current) {
        clearTimeout(refreshTokenTimeoutRef.current);
        refreshTokenTimeoutRef.current = null;
      }
      
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
      
      setUser(null);
      setRememberMe(false);
      localStorage.removeItem('accessToken');
    }
  }, []);

  const forgotPassword = async (email) => {
    try {
      setError(null);
      await authAPI.forgotPassword(email);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send reset email';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      await authAPI.resetPassword(token, newPassword);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await authAPI.verifyEmail(token);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear all timeouts and intervals
      if (refreshTokenTimeoutRef.current) {
        clearTimeout(refreshTokenTimeoutRef.current);
        refreshTokenTimeoutRef.current = null;
      }
      
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
      
      // Remove activity listeners
      activityListenersRef.current.forEach(({ event, listener }) => {
        window.removeEventListener(event, listener);
      });
      activityListenersRef.current = [];
    };
  }, []);

  const value = {
    user,
    loading,
    error,
    rememberMe,
    sessionWarning,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    updateActivity,
    reloadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 