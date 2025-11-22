import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSearchHistoryStore = create(
    persist(
        (set, get) => ({
            searches: [], // Array of { query, timestamp }

            addSearch: (query) => {
                const trimmedQuery = query.trim();
                if (!trimmedQuery || trimmedQuery.length < 2) return;

                const { searches } = get();

                // Remove duplicate if exists
                const filtered = searches.filter(s => s.query.toLowerCase() !== trimmedQuery.toLowerCase());

                // Add new search at the beginning
                const newSearches = [
                    { query: trimmedQuery, timestamp: Date.now() },
                    ...filtered
                ].slice(0, 10); // Keep only last 10 searches

                set({ searches: newSearches });
            },

            clearHistory: () => {
                set({ searches: [] });
            },

            removeSearch: (query) => {
                const { searches } = get();
                set({ searches: searches.filter(s => s.query !== query) });
            },
        }),
        {
            name: 'search-history-storage',
        }
    )
);

export default useSearchHistoryStore;
