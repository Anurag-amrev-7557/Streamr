import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import useNotificationStore from '../store/useNotificationStore';

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const colors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
};

const Toast = ({ id, type = 'info', message, duration, action, isMobile }) => {
    const removeNotification = useNotificationStore((state) => state.removeNotification);
    const Icon = icons[type];

    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                removeNotification(id);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, id, removeNotification]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: isMobile ? -20 : 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`
        flex items-center gap-3 px-4 py-3 rounded-full border border-white/10 
        bg-black/30 backdrop-blur-xl shadow-2xl
        min-w-[300px] max-w-md pointer-events-auto
      `}
        >
            <Icon size={20} className={`shrink-0 ${colors[type]}`} />
            <p className="text-sm font-medium flex-1 text-white/90">{message}</p>
            {action && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                        removeNotification(id);
                    }}
                    className="px-3 py-1 text-xs font-bold bg-white text-black rounded-full hover:bg-gray-200 transition-colors shrink-0"
                >
                    {action.label}
                </button>
            )}
            <button
                onClick={() => removeNotification(id)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors shrink-0 text-gray-400 hover:text-white"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
};

export default Toast;
