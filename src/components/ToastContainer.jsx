import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useNotificationStore from '../store/useNotificationStore';
import Toast from './Toast';
import useIsMobile from '../hooks/useIsMobile';

const ToastContainer = () => {
    const notifications = useNotificationStore((state) => state.notifications);
    const isMobile = useIsMobile();
    const MAX_TOASTS = 3;
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={`
            fixed z-[100] flex flex-col gap-2 pointer-events-none p-4 transition-all duration-300
            ${isMobile
                ? (isScrolled ? 'top-17 left-0 w-full items-center' : 'top-0 left-0 w-full items-center')
                : 'bottom-4 right-4 items-end'}
        `}>
            <AnimatePresence mode="popLayout">
                {notifications.slice(0, MAX_TOASTS).map((notification) => (
                    <Toast key={notification.id} {...notification} isMobile={isMobile} />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
