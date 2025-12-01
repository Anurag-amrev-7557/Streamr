import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '../lib/api';
import useAuthStore from './useAuthStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const useChatStore = create((set, get) => ({
    socket: null,
    messages: [],
    activeChat: null,
    isChatOpen: false,
    isLoading: false,

    connectSocket: () => {
        const { user } = useAuthStore.getState();
        if (!user || get().socket) return;

        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('Socket connected');
            socket.emit('join_room', user._id);
        });

        socket.on('receive_message', (message) => {
            const { activeChat, isChatOpen } = get();

            // Only add to messages if chat is open with this person
            if (isChatOpen && activeChat && (message.sender === activeChat._id || message.sender._id === activeChat._id)) {
                set(state => ({
                    messages: [...state.messages, message]
                }));
            } else {
                // TODO: Add notification or unread count
            }
        });

        set({ socket });
    },

    disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null });
        }
    },

    openChat: async (friend) => {
        set({ activeChat: friend, isChatOpen: true });
        await get().getMessages(friend._id);
    },

    closeChat: () => {
        set({ isChatOpen: false, activeChat: null, messages: [] });
    },

    getMessages: async (friendId) => {
        set({ isLoading: true });
        try {
            const response = await api.get(`/chat/${friendId}`);
            set({ messages: response.data, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            set({ isLoading: false });
        }
    },

    sendMessage: async (content) => {
        const { socket, activeChat, messages } = get();
        const { user } = useAuthStore.getState();

        if (!socket || !activeChat || !content.trim()) return;

        const messageData = {
            sender: user._id,
            receiver: activeChat._id,
            content: content,
            createdAt: new Date().toISOString(),
            // Optimistic fields
            _id: 'temp-' + Date.now()
        };

        // Optimistic update
        set({ messages: [...messages, messageData] });

        socket.emit('send_message', messageData);

        // Persist to DB (optional if socket handles it, but usually good to have API endpoint too)
        // For now, we rely on socket for real-time, but we should probably save it via API too 
        // or have the socket server save it. 
        // My backend implementation currently doesn't save to DB on socket event.
        // I should probably add an API call here to save it, or update backend to save on socket.
        // Let's stick to the plan: Backend socket just relays. 
        // Wait, if backend just relays, messages aren't saved!
        // I need to update backend to save messages.

        // Let's assume for now I'll add saving to backend later or do it via API call here.
        // Actually, the standard way is: Call API -> API saves -> API emits socket event (or client emits).
        // Or: Socket emits -> Server saves -> Server emits.

        // My backend `chat.js` only has GET. I missed the POST route for saving messages.
        // I will implement the POST route in the next step.
    }
}));

export default useChatStore;
