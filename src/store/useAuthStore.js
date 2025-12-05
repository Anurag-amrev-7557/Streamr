import { create } from 'zustand';
import api from '../lib/api';
import useWatchHistoryStore from './useWatchHistoryStore';
import useListStore from './useListStore';
import useSearchHistoryStore from './useSearchHistoryStore';

import useNotificationStore from './useNotificationStore';

const useAuthStore = create((set, get) => ({
    user: null,
    isCheckingAuth: true, // Start true to check on mount
    isSyncing: false,
    isLoggingOut: false,
    isAuthenticated: false,
    error: null,

    // Helper function to merge local and backend data with timestamp awareness
    mergeData: (localData, backendData, idKey = 'id', timestampKey = null) => {
        const merged = [];
        const seenIds = new Set();

        // Create lookup maps for efficient access
        const localMap = new Map(localData.map(item => [item[idKey], item]));
        const backendMap = new Map(backendData.map(item => [item[idKey], item]));

        // Process all unique IDs
        const allIds = new Set([
            ...localData.map(item => item[idKey]),
            ...backendData.map(item => item[idKey])
        ]);

        allIds.forEach(id => {
            if (seenIds.has(id)) return;
            seenIds.add(id);

            const localItem = localMap.get(id);
            const backendItem = backendMap.get(id);

            if (localItem && backendItem) {
                // Both exist - use timestamp to decide which is newer
                let winner;
                if (timestampKey) {
                    const localTime = localItem[timestampKey] ? new Date(localItem[timestampKey]).getTime() : 0;
                    const backendTime = backendItem[timestampKey] ? new Date(backendItem[timestampKey]).getTime() : 0;
                    winner = localTime >= backendTime ? localItem : backendItem;
                } else {
                    // No timestamp, prefer backend (as it's the source of truth)
                    winner = backendItem;
                }

                // Backfill missing properties from the loser to the winner
                // This ensures that if we have richer metadata in one, we don't lose it
                const loser = winner === localItem ? backendItem : localItem;
                merged.push({
                    ...loser,   // Base with loser's data
                    ...winner,  // Overwrite with winner's data (so winner's values take precedence)
                });
            } else if (localItem) {
                merged.push(localItem);
            } else if (backendItem) {
                merged.push(backendItem);
            }
        });

        // Sort by timestamp if provided
        if (timestampKey) {
            merged.sort((a, b) => {
                const timeA = a[timestampKey] ? new Date(a[timestampKey]).getTime() : 0;
                const timeB = b[timestampKey] ? new Date(b[timestampKey]).getTime() : 0;
                return timeB - timeA;
            });
        }

        return merged;
    },

    // Helper function to merge search history with query-based deduplication
    mergeSearchHistory: (localSearches, backendSearches) => {
        const merged = [];
        const seenQueries = new Set();

        // Combine and sort by timestamp (newest first)
        const allSearches = [...localSearches, ...backendSearches]
            .filter(s => s && s.query)
            .sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return timeB - timeA;
            });

        // Keep only the most recent occurrence of each query
        allSearches.forEach(search => {
            const queryLower = search.query.toLowerCase();
            if (!seenQueries.has(queryLower)) {
                seenQueries.add(queryLower);
                merged.push(search);
            }
        });

        // Limit to 10 most recent
        return merged.slice(0, 10);
    },

    // Sync data after authentication
    syncDataAfterAuth: async () => {
        set({ isSyncing: true });
        const watchHistoryStore = useWatchHistoryStore.getState();
        const listStore = useListStore.getState();
        const searchHistoryStore = useSearchHistoryStore.getState();

        try {
            // Get local data
            const localWatchHistory = watchHistoryStore.history;
            console.log('[Sync] Captured local history:', localWatchHistory.length, 'First:', localWatchHistory[0]?.title);
            const localList = listStore.list;
            const localSearchHistory = searchHistoryStore.searches;

            // Fetch backend data in parallel
            const [backendWatchHistory, backendList, backendSearchHistory] = await Promise.all([
                watchHistoryStore.fetchFromBackend().catch(err => {
                    console.error('Failed to fetch watch history:', err);
                    return [];
                }),
                listStore.fetchFromBackend().catch(err => {
                    console.error('Failed to fetch list:', err);
                    return [];
                }),
                searchHistoryStore.fetchFromBackend().catch(err => {
                    console.error('Failed to fetch search history:', err);
                    return [];
                })
            ]);

            console.log('[Sync] Fetched backend history:', backendWatchHistory?.length, 'First:', backendWatchHistory?.[0]?.title);

            // Merge data intelligently with timestamp awareness
            const mergedWatchHistory = get().mergeData(
                localWatchHistory,
                backendWatchHistory || [],
                'id',
                'lastWatched'
            );
            console.log('[Sync] Merged history:', mergedWatchHistory.length, 'First:', mergedWatchHistory[0]?.title);

            const mergedList = get().mergeData(
                localList,
                backendList || [],
                'id',
                'addedAt'
            );
            const mergedSearchHistory = get().mergeSearchHistory(
                localSearchHistory,
                backendSearchHistory || []
            );

            // Update local stores
            watchHistoryStore.setHistory(mergedWatchHistory);
            listStore.setList(mergedList);
            searchHistoryStore.setSearches(mergedSearchHistory);

            // Sync merged data back to backend in parallel
            await Promise.all([
                watchHistoryStore.syncWithBackend().catch(console.error),
                listStore.syncWithBackend().catch(console.error),
                searchHistoryStore.syncWithBackend().catch(console.error)
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

            // Clear auth token from localStorage
            localStorage.removeItem('auth_token');

            // Clear all local stores
            const watchHistoryStore = useWatchHistoryStore.getState();
            const listStore = useListStore.getState();
            const searchHistoryStore = useSearchHistoryStore.getState();

            watchHistoryStore.setHistory([]);
            listStore.setList([]);
            searchHistoryStore.setSearches([]);

            set({ user: null, isAuthenticated: false, isLoggingOut: false });
            addNotification({ type: 'success', message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);

            // Clear auth token from localStorage even on error
            localStorage.removeItem('auth_token');

            // Still clear local stores even on error
            const watchHistoryStore = useWatchHistoryStore.getState();
            const listStore = useListStore.getState();
            const searchHistoryStore = useSearchHistoryStore.getState();

            watchHistoryStore.setHistory([]);
            listStore.setList([]);
            searchHistoryStore.setSearches([]);

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

