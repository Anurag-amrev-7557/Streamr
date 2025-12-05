import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import useNotificationStore from './useNotificationStore';

const useWatchHistoryStore = create(
    persist(
        (set, get) => ({
            history: [],

            // Set entire history (used for backend sync)
            setHistory: (history) => {
                // Filter out invalid entries
                const validHistory = history.filter(item =>
                    item && typeof item.id === 'number' && item.id > 0
                );
                set({ history: validHistory });
            },

            // Fetch watch history from backend
            fetchFromBackend: async () => {
                try {
                    const response = await api.get('/auth/watch-history');
                    if (response.data.success) {
                        // Filter out invalid entries
                        const validHistory = (response.data.watchHistory || []).filter(item =>
                            item && typeof item.id === 'number' && item.id > 0
                        );
                        console.log('[Sync] fetchFromBackend success. Items:', validHistory.length, 'First:', validHistory[0]?.title);
                        set({ history: validHistory });
                        return validHistory;
                    }
                    console.log('[Sync] fetchFromBackend failed: success=false');
                } catch (error) {
                    console.error('Failed to fetch watch history from backend:', error);
                    return null;
                }
            },

            // Sync local history to backend
            syncWithBackend: async () => {
                try {
                    const { history } = get();
                    const response = await api.put('/auth/watch-history', { watchHistory: history });
                    if (response.data.success) {
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('Failed to sync watch history to backend:', error);
                    return false;
                }
            },

            addToHistory: async (movie, metadata = {}) => {
                // Validate that movie has a valid ID
                if (!movie || !movie.id || typeof movie.id !== 'number') {
                    console.error('Invalid movie object - missing or invalid ID:', movie);
                    return;
                }

                const { history } = get();

                // Optimistic update
                const previousHistory = [...history];
                // Remove existing entry if present to move it to the top
                const filteredHistory = history.filter((item) => item.id !== movie.id);

                // Ensure media_type is present
                const mediaType = metadata.media_type || movie.media_type || (movie.first_air_date ? 'tv' : 'movie');

                const newItem = {
                    ...movie,
                    media_type: mediaType,
                    ...metadata,
                    lastWatched: new Date().toISOString()
                };

                // Update local state
                set({
                    history: [newItem, ...filteredHistory]
                });

                // Sync with backend if available
                try {
                    await api.post('/auth/watch-history/add', { item: newItem });
                } catch (error) {
                    // Rollback on failure if it's not just an auth issue
                    if (error.response?.status !== 401) {
                        console.error('Failed to sync add to history:', error);
                        // We don't rollback local state for sync errors to prevent UI flickering
                        // The next sync will handle it, or it will remain local
                    } else {
                        console.log('Not syncing to backend (user may not be authenticated)');
                    }
                }
            },

            removeFromHistory: async (movieId) => {
                const { history } = get();
                const { addNotification } = useNotificationStore.getState();
                const itemToRemove = history.find((item) => item.id === movieId);

                if (!itemToRemove) return;

                // Optimistic update
                const previousHistory = [...history];
                const newHistory = history.filter((item) => item.id !== movieId);
                set({ history: newHistory });

                addNotification({
                    type: 'info',
                    message: 'Removed from Continue Watching',
                    action: itemToRemove ? {
                        label: 'Undo',
                        onClick: () => get().addToHistory(itemToRemove)
                    } : undefined
                });

                // Sync with backend if available
                try {
                    await api.delete(`/auth/watch-history/${movieId}`);
                } catch (error) {
                    // Rollback on failure if it's not just an auth issue
                    if (error.response?.status !== 401) {
                        console.error('Failed to sync remove from history:', error);
                        set({ history: previousHistory });
                        addNotification({ type: 'error', message: 'Failed to remove from history' });
                    } else {
                        console.log('Not syncing to backend (user may not be authenticated)');
                    }
                }
            },

            clearHistory: async () => {
                set({ history: [] });

                // Sync with backend if available
                try {
                    await api.put('/auth/watch-history', { watchHistory: [] });
                } catch {
                    console.log('Not syncing to backend (user may not be authenticated)');
                }
            },

            getHistoryItem: (movieId) => {
                const { history } = get();
                return history.find((item) => item.id === movieId);
            },
        }),
        {
            name: 'watch-history-storage',
            onRehydrateStorage: () => (state) => {
                // Clean up invalid entries on rehydration
                if (state && state.history) {
                    const validHistory = state.history.filter(item =>
                        item && typeof item.id === 'number' && item.id > 0
                    );
                    if (validHistory.length !== state.history.length) {
                        console.log('Cleaned up invalid watch history entries');
                        state.history = validHistory;
                    }
                }
            },
        }
    )
);

export default useWatchHistoryStore;

