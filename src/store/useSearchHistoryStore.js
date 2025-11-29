import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

const useSearchHistoryStore = create(
    persist(
        (set, get) => ({
            searches: [], // Array of { query, timestamp }

            fetchHistory: async () => {
                try {
                    const res = await api.get('/auth/search-history');
                    if (res.data.success) {
                        set({ searches: res.data.searchHistory });
                    }
                } catch (error) {
                    console.error('Failed to fetch search history:', error);
                }
            },

            addSearch: async (query) => {
                const trimmedQuery = query.trim();
                if (!trimmedQuery || trimmedQuery.length < 2) return;

                const { searches } = get();

                // Optimistic update
                const filtered = searches.filter(s => s.query.toLowerCase() !== trimmedQuery.toLowerCase());
                const newSearches = [
                    { query: trimmedQuery, timestamp: Date.now() },
                    ...filtered
                ].slice(0, 10);

                set({ searches: newSearches });

                try {
                    await api.post('/auth/search-history/add', { query: trimmedQuery });
                } catch (error) {
                    console.error('Failed to add search history:', error);
                    // Revert on failure (optional, but good practice)
                }
            },

            clearHistory: async () => {
                set({ searches: [] });
                try {
                    await api.delete('/auth/search-history/clear');
                } catch (error) {
                    console.error('Failed to clear search history:', error);
                }
            },

            removeSearch: async (query) => {
                const { searches } = get();
                set({ searches: searches.filter(s => s.query !== query) });

                try {
                    await api.delete(`/auth/search-history/${encodeURIComponent(query)}`);
                } catch (error) {
                    console.error('Failed to remove search history:', error);
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
