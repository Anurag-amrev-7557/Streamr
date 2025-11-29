import { create } from 'zustand';

const useNotificationStore = create((set) => ({
    notifications: [],
    addNotification: (notification) =>
        set((state) => {
            // Prevent duplicates: Remove any existing notification with the same message
            const filtered = state.notifications.filter((n) => n.message !== notification.message);
            return {
                notifications: [
                    ...filtered,
                    {
                        id: Date.now().toString() + Math.random().toString(36).substring(2),
                        duration: 5000, // Default duration
                        ...notification,
                    },
                ],
            };
        }),
    removeNotification: (id) =>
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        })),
}));

export default useNotificationStore;
