import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Film, Tv, Heart, User, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import clsx from 'clsx';
import { useState, useEffect, useRef } from 'react';
import useModalStore from '../store/useModalStore';
import { prefetchOnInteraction } from '../utils/routePrefetch';
import useAuthStore from '../store/useAuthStore';
import { getOptimizedAvatarUrl } from '../utils/imageUtils';

const BottomNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const isModalOpen = useModalStore((state) => state.isModalOpen);
    const modalType = useModalStore((state) => state.modalType);
    const activeTab = useModalStore((state) => state.activeTab);
    const setActiveTab = useModalStore((state) => state.setActiveTab);
    const onCloseHandler = useModalStore((state) => state.onCloseHandler);
    const [hasAnimated, setHasAnimated] = useState(false);
    const { user, logout } = useAuthStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        // Set to true after animation completes (spring animation ~500ms)
        const timer = setTimeout(() => {
            setHasAnimated(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const isHidden = ['/login', '/signup', '/watch'].some(path => currentPath.includes(path));



    const handleLogout = async () => {
        await logout();
        setIsDropdownOpen(false);
        navigate('/login');
    };

    // Standard Navigation Items
    const standardNavItems = [
        {
            name: 'Home',
            icon: Home,
            path: '/',
            active: currentPath === '/'
        },
        {
            name: 'Movies',
            icon: Film,
            path: '/movies',
            active: currentPath === '/movies'
        },
        {
            name: 'Series',
            icon: Tv,
            path: '/series',
            active: currentPath === '/series'
        },
        {
            name: 'My List',
            icon: Heart,
            path: '/my-list',
            active: currentPath === '/my-list'
        },
        {
            name: 'Account',
            icon: User,
            path: '/login',
            active: currentPath === '/login' || currentPath === '/profile',
            isAccount: true
        }
    ];

    const isCastModalOpen = useModalStore((state) => state.isCastModalOpen);
    const activeCastTab = useModalStore((state) => state.activeCastTab);
    const setActiveCastTab = useModalStore((state) => state.setActiveCastTab);

    if (isHidden) return null;

    // Modal Navigation Items
    let modalNavItems = [];

    if (isCastModalOpen) {
        modalNavItems = [
            { name: 'Overview', id: 'overview' },
            { name: 'Known For', id: 'known_for' },
            { name: 'Photos', id: 'photos' }
        ];
    } else {
        modalNavItems = modalType === 'tv'
            ? [
                { name: 'Overview', id: 'overview' },
                { name: 'Seasons', id: 'seasons' },
                { name: 'Similar', id: 'similar' }
            ]
            : [
                { name: 'Overview', id: 'overview' },
                { name: 'Similar', id: 'similar' }
            ];
    }

    const currentActiveTab = isCastModalOpen ? activeCastTab : activeTab;
    const handleTabChange = isCastModalOpen ? setActiveCastTab : setActiveTab;

    const activeModalIndex = Math.max(0, modalNavItems.findIndex(item => item.id === currentActiveTab));
    const modalItemWidth = 100 / modalNavItems.length;

    return (
        <motion.div
            className="md:hidden fixed bottom-6 left-4 right-4 z-[60] flex items-center justify-center pointer-events-none"
            style={{ willChange: 'transform' }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                duration: 0.4
            }}
        >
            <div className="relative flex items-center justify-center w-full">
                {/* Account Dropdown */}
                <AnimatePresence>
                    {isDropdownOpen && (
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-full right-0 mb-4 w-48 bg-[#181818] border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto z-50"
                        >
                            <div className="p-3 border-b border-white/10">
                                <p className="text-white font-medium text-sm truncate">{user?.name || 'User'}</p>
                                <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-white/5 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Glassmorphism Pill Container */}
                <motion.div
                    className={clsx(
                        "pointer-events-auto border border-white/10 rounded-full shadow-2xl p-1 w-full max-w-[320px]",
                        hasAnimated ? "bg-black/30 backdrop-blur-xl" : "bg-black/80"
                    )}
                    style={{ willChange: 'transform' }}
                    animate={{
                        x: (isModalOpen || isCastModalOpen) ? -30 : 0
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 25,
                        mass: 0.6
                    }}
                >
                    <div className="relative flex items-center justify-between h-10">
                        <AnimatePresence mode="wait" initial={false}>
                            {(isModalOpen || isCastModalOpen) ? (
                                <motion.div
                                    key={isCastModalOpen ? "cast-nav" : "modal-nav"}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="w-full h-full flex items-center justify-between relative"
                                >
                                    {/* White Moving Background for Modal */}
                                    <motion.div
                                        className="absolute bg-white rounded-full h-full"
                                        style={{
                                            left: 0,
                                            width: `${modalItemWidth}%`,
                                            willChange: 'transform'
                                        }}
                                        initial={false}
                                        animate={{
                                            x: `${activeModalIndex * 100}%`
                                        }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 35
                                        }}
                                    />
                                    {modalNavItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabChange(item.id)}
                                            className="relative z-10 flex items-center justify-center h-full transition-all duration-300"
                                            style={{ width: `${modalItemWidth}%` }}
                                        >
                                            <span className={clsx(
                                                "text-sm font-semibold transition-colors duration-300",
                                                currentActiveTab === item.id ? "text-black" : "text-gray-200"
                                            )}>
                                                {item.name}
                                            </span>
                                        </button>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="standard-nav"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="w-full h-full flex items-center justify-between relative"
                                >
                                    {/* White Moving Background for Standard Nav */}
                                    <motion.div
                                        className="absolute bg-white rounded-full h-full"
                                        style={{
                                            left: 0,
                                            width: '20%',
                                            willChange: 'transform'
                                        }}
                                        initial={false}
                                        animate={{
                                            x: `${standardNavItems.findIndex(item => item.active) * 100}%`
                                        }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 35
                                        }}
                                    />

                                    {standardNavItems.map((item) => {
                                        const Icon = item.icon;

                                        // Smart prefetch handler with deduplication
                                        const handlePrefetch = () => {
                                            if (item.path === '/movies') {
                                                prefetchOnInteraction('Movies', () => import('../pages/Movies'));
                                            } else if (item.path === '/series') {
                                                prefetchOnInteraction('Series', () => import('../pages/Series'));
                                            } else if (item.path === '/my-list') {
                                                prefetchOnInteraction('MyList', () => import('../pages/MyList'));
                                            }
                                        };

                                        if (item.isAccount && user) {
                                            return (
                                                <button
                                                    key={item.name}
                                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                    className="relative flex items-center justify-center h-full transition-all duration-300 group"
                                                    style={{ width: '20%' }}
                                                >
                                                    <motion.div
                                                        className="relative z-10"
                                                        initial={{ opacity: 0, y: 0 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        {user.avatar ? (
                                                            <img
                                                                src={getOptimizedAvatarUrl(user.avatar)}
                                                                alt={user.name}
                                                                className={clsx(
                                                                    "w-8 h-8 rounded-full object-cover border transition-all duration-300",
                                                                    item.active || isDropdownOpen ? "border-black" : "border-transparent"
                                                                )}
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className={clsx(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                                                                item.active || isDropdownOpen ? "bg-black text-white" : "bg-gray-700 text-gray-300"
                                                            )}>
                                                                {(user.name?.[0] || 'U').toUpperCase()}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                </button>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.path}
                                                className="relative flex items-center justify-center h-full transition-all duration-300 group"
                                                style={{ width: '20%' }}
                                                onMouseEnter={handlePrefetch}
                                                onTouchStart={handlePrefetch}
                                            >
                                                {/* Icon */}
                                                <motion.div
                                                    className="relative z-10"
                                                    initial={{ opacity: 0, y: 0 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                >
                                                    <Icon
                                                        className={clsx(
                                                            'w-5 h-5 transition-all duration-300',
                                                            item.active
                                                                ? 'text-black scale-110'
                                                                : 'text-gray-200 group-hover:text-gray-200'
                                                        )}
                                                        strokeWidth={2}
                                                    />
                                                </motion.div>
                                            </Link>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Close Button - Absolutely positioned to avoid layout shift */}
                <AnimatePresence>
                    {(isModalOpen || isCastModalOpen) && (
                        <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 22,
                                mass: 0.6
                            }}
                            onClick={() => {
                                if (isCastModalOpen) {
                                    useModalStore.getState().closeCastModal();
                                } else {
                                    onCloseHandler?.();
                                }
                            }}
                            className={clsx(
                                "absolute -right-2 pointer-events-auto border border-white/10 rounded-full shadow-2xl w-12.5 h-12.5 flex items-center justify-center",
                                hasAnimated ? "bg-black/30 backdrop-blur-xl" : "bg-black/80"
                            )}
                            style={{ willChange: 'transform, opacity' }}
                        >
                            <X className="w-5 h-5 text-white" strokeWidth={2} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default BottomNavbar;
