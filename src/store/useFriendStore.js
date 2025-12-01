import { create } from 'zustand';
import api from '../lib/api';
import useNotificationStore from './useNotificationStore';

const useFriendStore = create((set, get) => ({
    friends: [],
    requests: [],
    searchResults: [],
    isLoading: false,
    error: null,

    // Search users
    searchUsers: async (query) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get(`/friends/search?query=${query}`);
            set({ searchResults: response.data, isLoading: false });
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Failed to search users',
                isLoading: false
            });
        }
    },

    // Clear search results
    clearSearch: () => {
        set({ searchResults: [] });
    },

    // Get friend requests
    getRequests: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/friends/requests');
            set({ requests: response.data, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch friend requests:', error);
            set({ isLoading: false });
        }
    },

    // Get friend list
    getFriends: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/friends/list');
            set({ friends: response.data, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch friends:', error);
            set({ isLoading: false });
        }
    },

    // Send friend request
    sendRequest: async (userId) => {
        const { addNotification } = useNotificationStore.getState();
        try {
            await api.post(`/friends/request/${userId}`);
            addNotification({ type: 'success', message: 'Friend request sent!' });
            return true;
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to send request';
            addNotification({ type: 'error', message });
            return false;
        }
    },

    // Accept friend request
    acceptRequest: async (requestId) => {
        const { addNotification } = useNotificationStore.getState();
        try {
            await api.put(`/friends/request/${requestId}/accept`);

            // Update local state
            set(state => ({
                requests: state.requests.filter(req => req._id !== requestId)
            }));

            // Refresh friends list
            get().getFriends();

            addNotification({ type: 'success', message: 'Friend request accepted!' });
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to accept request';
            addNotification({ type: 'error', message });
        }
    },

    // Reject friend request
    rejectRequest: async (requestId) => {
        const { addNotification } = useNotificationStore.getState();
        try {
            await api.put(`/friends/request/${requestId}/reject`);

            // Update local state
            set(state => ({
                requests: state.requests.filter(req => req._id !== requestId)
            }));

            addNotification({ type: 'success', message: 'Friend request rejected' });
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to reject request';
            addNotification({ type: 'error', message });
        }
    },

    // Remove friend
    removeFriend: async (friendId) => {
        const { addNotification } = useNotificationStore.getState();
        try {
            await api.delete(`/friends/${friendId}`);

            // Update local state
            set(state => ({
                friends: state.friends.filter(friend => friend._id !== friendId)
            }));

            addNotification({ type: 'success', message: 'Friend removed' });
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to remove friend';
            addNotification({ type: 'error', message });
        }
    }
}));

export default useFriendStore;
