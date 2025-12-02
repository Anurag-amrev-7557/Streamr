import { create } from 'zustand';
import api from '../lib/api';
import useWatchHistoryStore from './useWatchHistoryStore';
import useListStore from './useListStore';

import useNotificationStore from './useNotificationStore';

const useAuthStore = create((set, get) => ({
    user: null,
    isCheckingAuth: true, // Start true to check on mount
    isSyncing: false,
    isLoggingOut: false,
    isAuthenticated: false,
    error: null,

    // Helper function to merge local and backend data
    mergeData: (localData, backendData) => {
        const merged = [...backendData];
        const backendIds = new Set(backendData.map(item => item.id));

        // Add local items that don't exist in backend
        localData.forEach(item => {
            if (!backendIds.has(item.id)) {
                merged.push(item);
            }
        });

        return merged;
    },

    // Sync data after authentication
    syncDataAfterAuth: async () => {
        set({ isSyncing: true });
        const watchHistoryStore = useWatchHistoryStore.getState();
        const listStore = useListStore.getState();

        try {
            // Get local data
            const localWatchHistory = watchHistoryStore.history;
            const localList = listStore.list;

            // Fetch backend data
            // Fetch backend data in parallel
            const [backendWatchHistory, backendList] = await Promise.all([
                watchHistoryStore.fetchFromBackend().catch(err => {
                    console.error('Failed to fetch watch history:', err);
                    return [];
                }),
                listStore.fetchFromBackend().catch(err => {
                    console.error('Failed to fetch list:', err);
                    return [];
                })
            ]);

            // Merge data intelligently
            const mergedWatchHistory = get().mergeData(localWatchHistory, backendWatchHistory);
            const mergedList = get().mergeData(localList, backendList);

            // Update local stores
            watchHistoryStore.setHistory(mergedWatchHistory);
            listStore.setList(mergedList);

            // Sync merged data back to backend
            // Sync merged data back to backend in parallel
            await Promise.all([
                watchHistoryStore.syncWithBackend().catch(console.error),
                listStore.syncWithBackend().catch(console.error)
            ]);
        } catch (error) {
            console.error('Failed to sync data:', error);
        } finally {
            set({ isSyncing: false });
        }
    },

    // Check if user is authenticated on mount
    checkAuth: async (retryCount = 0) => {
        set({ isCheckingAuth: true });
        try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Auth check timeout')), 5000)
            );

            // Race the API call against the timeout
            const response = await Promise.race([
                api.get('/auth/me'),
                timeoutPromise
            ]);

            set({
                user: response.data.user,
                isAuthenticated: true,
                isCheckingAuth: false
            });

            // Sync data in the background
            Promise.resolve().then(() => {
                get().syncDataAfterAuth().catch(error => {
                    console.error('Background sync failed:', error);
                });
            });
        } catch (error) {
            // Don't log error for 401 (Unauthorized) - it just means not logged in
            if (error.response && error.response.status === 401) {
                set({
                    user: null,
                    isAuthenticated: false,
                    isCheckingAuth: false
                });
                return;
            }

            console.error('Auth check failed:', error);

            // Retry logic for network errors or timeouts (max 2 retries)
            if (retryCount < 2 && (error.message === 'Auth check timeout' || !error.response)) {
                console.log(`Retrying auth check (attempt ${retryCount + 1})...`);
                // Delay before retry
                await new Promise(resolve => setTimeout(resolve, 1500));
                return get().checkAuth(retryCount + 1);
            }

            set({ isCheckingAuth: false, isAuthenticated: false });
        }
    },

    // Register user
    signup: async (credentials) => {
        set({ error: null });
        const { addNotification } = useNotificationStore.getState();
        try {
            const response = await api.post('/auth/register', credentials);

            set({ user: response.data.user, isAuthenticated: true, error: null });

            // Sync data after successful signup
            await get().syncDataAfterAuth();

            addNotification({ type: 'success', message: 'Account created successfully!' });
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Signup failed';
            set({ error: message });
            addNotification({ type: 'error', message });
            return { success: false, message };
        }
    },

    // Login user
    login: async (credentials) => {
        set({ error: null });
        const { addNotification } = useNotificationStore.getState();
        try {
            const response = await api.post('/auth/login', credentials);

            set({ user: response.data.user, isAuthenticated: true, error: null });

            // Sync data after successful login
            await get().syncDataAfterAuth();

            addNotification({ type: 'success', message: 'Logged in successfully!' });
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            set({ error: message });
            addNotification({ type: 'error', message });
            return { success: false, message };
        }
    },

    // Logout user
    logout: async () => {
        set({ isLoggingOut: true });
        const { addNotification } = useNotificationStore.getState();
        try {
            await api.post('/auth/logout');

            // Clear local stores
            const watchHistoryStore = useWatchHistoryStore.getState();
            const listStore = useListStore.getState();
            watchHistoryStore.setHistory([]);
            listStore.setList([]);

            set({ user: null, isAuthenticated: false, isLoggingOut: false });
            addNotification({ type: 'success', message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);

            const watchHistoryStore = useWatchHistoryStore.getState();
            const listStore = useListStore.getState();
            watchHistoryStore.setHistory([]);
            listStore.setList([]);

            set({ user: null, isAuthenticated: false, isLoggingOut: false });
            addNotification({ type: 'success', message: 'Logged out successfully' });
        }
    },

    // Handle Google OAuth callback
    handleOAuthCallback: async (user) => {
        set({ user, isAuthenticated: true });

        // Sync data after OAuth login
        await get().syncDataAfterAuth();
    },

    // Update user list
    updateList: (newList) => {
        set(state => ({
            user: { ...state.user, myList: newList }
        }));
    }
}));

export default useAuthStore;

