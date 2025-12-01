import { create } from 'zustand';
import api from '../lib/api';
import useNotificationStore from './useNotificationStore';
import useAuthStore from './useAuthStore';

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
        const { user } = useAuthStore.getState();

        // Optimistic update
        const tempId = 'temp-' + Date.now();
        const optimisticRequest = {
            _id: tempId,
            sender: { _id: user._id },
            receiver: userId,
            status: 'pending'
        };

        set(state => ({
            requests: [...state.requests, optimisticRequest]
        }));

        try {
            const response = await api.post(`/friends/request/${userId}`);

            // Replace optimistic request with real one
            set(state => ({
                requests: state.requests.map(req =>
                    req._id === tempId ? response.data.request : req
                )
            }));

            addNotification({ type: 'success', message: 'Friend request sent!' });
            return true;
        } catch (error) {
            // Revert optimistic update
            set(state => ({
                requests: state.requests.filter(req => req._id !== tempId)
            }));

            const message = error.response?.data?.message || 'Failed to send request';
            addNotification({ type: 'error', message });
            return false;
        }
    },

    // Accept friend request
    acceptRequest: async (requestId) => {
        const { addNotification } = useNotificationStore.getState();

        // Optimistic update
        const requestToAccept = get().requests.find(req => req._id === requestId);
        if (!requestToAccept) return;

        const newFriend = requestToAccept.sender;

        set(state => ({
            requests: state.requests.filter(req => req._id !== requestId),
            friends: [...state.friends, newFriend]
        }));

        try {
            await api.put(`/friends/request/${requestId}/accept`);
            addNotification({ type: 'success', message: 'Friend request accepted!' });
        } catch (error) {
            // Revert optimistic update
            set(state => ({
                requests: [...state.requests, requestToAccept],
                friends: state.friends.filter(f => f._id !== newFriend._id)
            }));

            const message = error.response?.data?.message || 'Failed to accept request';
            addNotification({ type: 'error', message });
        }
    },

    // Reject friend request
    rejectRequest: async (requestId) => {
        const { addNotification } = useNotificationStore.getState();

        // Optimistic update
        const requestToReject = get().requests.find(req => req._id === requestId);

        set(state => ({
            requests: state.requests.filter(req => req._id !== requestId)
        }));

        try {
            await api.put(`/friends/request/${requestId}/reject`);
            addNotification({ type: 'success', message: 'Friend request rejected' });
        } catch (error) {
            // Revert optimistic update
            if (requestToReject) {
                set(state => ({
                    requests: [...state.requests, requestToReject]
                }));
            }

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
