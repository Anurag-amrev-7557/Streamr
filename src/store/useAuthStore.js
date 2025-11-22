import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set, get) => ({
    user: null,
    isCheckingAuth: true,
    isAuthenticated: false,
    error: null,

    // Check if user is authenticated on mount
    checkAuth: async () => {
        set({ isCheckingAuth: true });
        try {
            const response = await api.get('/auth/me');
            set({
                user: response.data.user,
                isAuthenticated: true,
                isCheckingAuth: false
            });
        } catch (error) {
            set({
                user: null,
                isAuthenticated: false,
                isCheckingAuth: false
            });
        }
    },

    // Register user
    signup: async (credentials) => {
        set({ error: null });
        try {
            const response = await api.post('/auth/register', credentials);
            set({ user: response.data.user, isAuthenticated: true, error: null });
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Signup failed';
            set({ error: message });
            return { success: false, message };
        }
    },

    // Login user
    login: async (credentials) => {
        set({ error: null });
        try {
            const response = await api.post('/auth/login', credentials);
            set({ user: response.data.user, isAuthenticated: true, error: null });
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            set({ error: message });
            return { success: false, message };
        }
    },

    // Logout user
    logout: async () => {
        try {
            await api.post('/auth/logout');
            set({ user: null, isAuthenticated: false });
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout on client even if server fails
            set({ user: null, isAuthenticated: false });
        }
    },

    // Handle Google OAuth callback
    handleOAuthCallback: (user, token) => {
        set({ user, isAuthenticated: true });
    },

    // Update user list
    updateList: (newList) => {
        set(state => ({
            user: { ...state.user, myList: newList }
        }));
    }
}));

export default useAuthStore;
