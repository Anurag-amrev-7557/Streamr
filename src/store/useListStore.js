import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

import useNotificationStore from './useNotificationStore';

const useListStore = create(
    persist(
        (set, get) => ({
            list: [],

            // Set entire list (used for backend sync)
            setList: (list) => {
                set({ list });
            },

            // Fetch list from backend
            fetchFromBackend: async () => {
                try {
                    const response = await api.get('/auth/mylist');
                    if (response.data.success) {
                        set({ list: response.data.myList || [] });
                        return response.data.myList || [];
                    }
                } catch (error) {
                    console.error('Failed to fetch list from backend:', error);
                    return null;
                }
            },

            // Sync local list to backend
            syncWithBackend: async () => {
                try {
                    const { list } = get();
                    const response = await api.put('/auth/mylist', { myList: list });
                    if (response.data.success) {
                        return true;
                    }
                } catch (error) {
                    console.error('Failed to sync list to backend:', error);
                    return false;
                }
            },

            addMovie: async (movie) => {
                const { list } = get();
                const { addNotification } = useNotificationStore.getState();
                if (!list.some((item) => item.id === movie.id)) {
                    // Optimistic update
                    const previousList = [...list];
                    const newList = [...list, movie];
                    set({ list: newList });
                    addNotification({ type: 'success', message: 'Added to My List' });

                    // Sync with backend if available
                    try {
                        await api.post('/auth/mylist/add', { item: movie });
                    } catch (error) {
                        console.error('Failed to sync add to backend:', error);
                        // Rollback on failure if it's not just an auth issue
                        if (error.response?.status !== 401) {
                            set({ list: previousList });
                            addNotification({ type: 'error', message: 'Failed to add to list' });
                        } else {
                            console.log('Not syncing to backend (user may not be authenticated)');
                        }
                    }
                }
            },

            removeMovie: async (movieId) => {
                const { list } = get();
                const { addNotification } = useNotificationStore.getState();
                const itemToRemove = list.find((item) => item.id === movieId);

                if (!itemToRemove) return;

                // Optimistic update
                const previousList = [...list];
                const newList = list.filter((item) => item.id !== movieId);
                set({ list: newList });

                addNotification({
                    type: 'info',
                    message: 'Removed from My List',
                    action: itemToRemove ? {
                        label: 'Undo',
                        onClick: () => get().addMovie(itemToRemove)
                    } : undefined
                });

                // Sync with backend if available
                try {
                    await api.delete(`/auth/mylist/${movieId}`);
                } catch (error) {
                    console.error('Failed to sync remove to backend:', error);
                    // Rollback on failure if it's not just an auth issue
                    if (error.response?.status !== 401) {
                        set({ list: previousList });
                        addNotification({ type: 'error', message: 'Failed to remove from list' });
                    } else {
                        console.log('Not syncing to backend (user may not be authenticated)');
                    }
                }
            },

            clearList: async () => {
                set({ list: [] });

                // Sync with backend if available
                try {
                    await api.delete('/auth/mylist/clear');
                } catch {
                    console.log('Not syncing to backend (user may not be authenticated)');
                }
            },

            isInList: (movieId) => {
                const { list } = get();
                return list.some((item) => item.id === movieId);
            },
        }),
        {
            name: 'my-list-storage',
        }
    )
);

export default useListStore;

