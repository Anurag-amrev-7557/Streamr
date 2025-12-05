import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import useNotificationStore from './useNotificationStore';

const useSearchHistoryStore = create(
    persist(
        (set, get) => ({
            searches: [], // Array of { query, timestamp }

            // Set entire search history (used for backend sync)
            setSearches: (searches) => {
                // Validate and normalize timestamps
                const validSearches = (searches || [])
                    .filter(s => s && typeof s.query === 'string' && s.query.trim())
                    .map(s => ({
                        query: s.query.trim(),
                        timestamp: s.timestamp || Date.now()
                    }));
                set({ searches: validSearches });
            },

            // Fetch search history from backend
            fetchFromBackend: async () => {
                try {
                    const response = await api.get('/auth/search-history');
                    if (response.data.success) {
                        const validSearches = (response.data.searchHistory || [])
                            .filter(s => s && typeof s.query === 'string' && s.query.trim())
                            .map(s => ({
                                query: s.query.trim(),
                                timestamp: s.timestamp ? new Date(s.timestamp).getTime() : Date.now()
                            }));
                        set({ searches: validSearches });
                        return validSearches;
                    }
                    return [];
                } catch (error) {
                    console.error('Failed to fetch search history from backend:', error);
                    return null;
                }
            },

            // Sync local search history to backend
            syncWithBackend: async () => {
                try {
                    const { searches } = get();
                    const response = await api.put('/auth/search-history', { searchHistory: searches });
                    if (response.data.success) {
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('Failed to sync search history to backend:', error);
                    return false;
                }
            },

            // Legacy method for compatibility
            fetchHistory: async () => {
                return get().fetchFromBackend();
            },

            addSearch: async (query) => {
                const trimmedQuery = query.trim();
                if (!trimmedQuery || trimmedQuery.length < 2) return;

                const { searches } = get();

                // Optimistic update
                const previousSearches = [...searches];
                const filtered = searches.filter(s => s.query.toLowerCase() !== trimmedQuery.toLowerCase());
                const newSearches = [
                    { query: trimmedQuery, timestamp: Date.now() },
                    ...filtered
                ].slice(0, 10);

                set({ searches: newSearches });

                try {
                    await api.post('/auth/search-history/add', { query: trimmedQuery });
                } catch (error) {
                    // Rollback on failure if it's not just an auth issue
                    if (error.response?.status !== 401) {
                        console.error('Failed to add search history:', error);
                        set({ searches: previousSearches });
                    } else {
                        console.log('Not syncing to backend (user may not be authenticated)');
                    }
                }
            },

            clearHistory: async () => {
                const { searches } = get();
                const previousSearches = [...searches];

                set({ searches: [] });

                try {
                    await api.delete('/auth/search-history/clear');
                } catch (error) {
                    if (error.response?.status !== 401) {
                        console.error('Failed to clear search history:', error);
                        set({ searches: previousSearches });
                        const { addNotification } = useNotificationStore.getState();
                        addNotification({ type: 'error', message: 'Failed to clear search history' });
                    } else {
                        console.log('Not syncing to backend (user may not be authenticated)');
                    }
                }
            },

            removeSearch: async (query) => {
                const { searches } = get();
                const previousSearches = [...searches];
                const itemToRemove = searches.find(s => s.query === query);

                if (!itemToRemove) return;

                set({ searches: searches.filter(s => s.query !== query) });

                try {
                    await api.delete(`/auth/search-history/${encodeURIComponent(query)}`);
                } catch (error) {
                    // Rollback on failure if it's not just an auth issue
                    if (error.response?.status !== 401) {
                        console.error('Failed to remove search history:', error);
                        set({ searches: previousSearches });
                    } else {
                        console.log('Not syncing to backend (user may not be authenticated)');
                    }
                }
            },
        }),
        {
            name: 'search-history-storage',
            partialize: (state) => ({ searches: state.searches }), // Only persist searches locally
        }
    )
);

export default useSearchHistoryStore;
