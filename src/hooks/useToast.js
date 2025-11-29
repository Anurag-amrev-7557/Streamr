import useNotificationStore from '../store/useNotificationStore';

const useToast = () => {
    const addNotification = useNotificationStore((state) => state.addNotification);

    const toast = {
        success: (message, duration) => addNotification({ type: 'success', message, duration }),
        error: (message, duration) => addNotification({ type: 'error', message, duration }),
        warning: (message, duration) => addNotification({ type: 'warning', message, duration }),
        info: (message, duration) => addNotification({ type: 'info', message, duration }),
    };

    return toast;
};

export default useToast;
