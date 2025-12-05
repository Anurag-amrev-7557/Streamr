import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Film, Tv, Heart, User, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import useModalStore from '../store/useModalStore';
import { prefetchOnInteraction } from '../utils/routePrefetch';
import useAuthStore from '../store/useAuthStore';
import { getOptimizedAvatarUrl } from '../utils/imageUtils';

// --- Static Data & Variants ---

const STANDARD_NAV_ITEMS = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Movies', icon: Film, path: '/movies' },
    { name: 'Series', icon: Tv, path: '/series' },
    { name: 'My List', icon: Heart, path: '/my-list' },
    { name: 'Account', icon: User, path: '/login', isAccount: true }
];

const MODAL_NAV_ITEMS_TV = [
    { name: 'Overview', id: 'overview' },
    { name: 'Seasons', id: 'seasons' },
    { name: 'Similar', id: 'similar' }
];

const MODAL_NAV_ITEMS_DEFAULT = [
    { name: 'Overview', id: 'overview' },
    { name: 'Similar', id: 'similar' }
];

const CAST_MODAL_NAV_ITEMS = [
    { name: 'Overview', id: 'overview' },
    { name: 'Known For', id: 'known_for' },
    { name: 'Photos', id: 'photos' }
];

const CONTAINER_VARIANTS = {
    hidden: { scale: 0.85, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
    exit: { scale: 0.85, opacity: 0 }
};

const DROPDOWN_VARIANTS = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.95 }
};

const NAV_CONTENT_VARIANTS = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
};

const ICON_VARIANTS = {
    hidden: { opacity: 0, y: 0 },
    visible: { opacity: 1, y: 0 }
};

// --- Sub-Components ---

const StandardNavItem = memo(({ item, isActive, isDropdownOpen, user, onPrefetch, onDropdownToggle }) => {
    const Icon = item.icon;
    const isAccount = item.isAccount;

    if (isAccount && user) {
        return (
            <button
                onClick={onDropdownToggle}
                className="relative flex items-center justify-center h-full transition-all duration-300 group"
                style={{ width: '20%' }}
            >
                <motion.div
                    className="relative z-10"
                    variants={ICON_VARIANTS}
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.15 }}
                >
                    {user.avatar ? (
                        <img
                            src={getOptimizedAvatarUrl(user.avatar)}
                            alt={user.name}
                            className={clsx(
                                "w-8 h-8 rounded-full object-cover border transition-all duration-300",
                                isActive || isDropdownOpen ? "border-black" : "border-transparent"
                            )}
                            loading="lazy"
                        />
                    ) : (
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                            isActive || isDropdownOpen ? "bg-black text-white" : "bg-gray-700 text-gray-300"
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
            to={item.path}
            className="relative flex items-center justify-center h-full transition-all duration-300 group"
            style={{ width: '20%' }}
            onMouseEnter={() => onPrefetch(item.path)}
            onTouchStart={() => onPrefetch(item.path)}
        >
            <motion.div
                className="relative z-10"
                variants={ICON_VARIANTS}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.15 }}
            >
                <Icon
                    className={clsx(
                        'w-5 h-5 transition-all duration-300',
                        isActive
                            ? 'text-black scale-110'
                            : 'text-gray-200 group-hover:text-gray-200'
                    )}
                    strokeWidth={2}
                />
            </motion.div>
        </Link>
    );
}, (prev, next) => {
    return (
        prev.isActive === next.isActive &&
        prev.isDropdownOpen === next.isDropdownOpen &&
        prev.user === next.user &&
        prev.item === next.item
    );
});

const ModalNavItem = memo(({ item, isActive, onClick, width }) => {
    return (
        <button
            onClick={() => onClick(item.id)}
            className="relative z-10 flex items-center justify-center h-full transition-all duration-300"
            style={{ width: `${width}%` }}
        >
            <span className={clsx(
                "text-sm font-semibold transition-colors duration-300",
                isActive ? "text-black" : "text-gray-200"
            )}>
                {item.name}
            </span>
        </button>
    );
});

// --- Main Component ---

const BottomNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    // Store selectors - selecting specific values to minimize re-renders
    const isModalOpen = useModalStore((state) => state.isModalOpen);
    const modalType = useModalStore((state) => state.modalType);
    const activeTab = useModalStore((state) => state.activeTab);
    const setActiveTab = useModalStore((state) => state.setActiveTab);
    const onCloseHandler = useModalStore((state) => state.onCloseHandler);
    const isCastModalOpen = useModalStore((state) => state.isCastModalOpen);
    const activeCastTab = useModalStore((state) => state.activeCastTab);
    const setActiveCastTab = useModalStore((state) => state.setActiveCastTab);
    const closeCastModal = useModalStore((state) => state.closeCastModal);

    const { user, logout } = useAuthStore();

    const [hasAnimated, setHasAnimated] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Memoize isHidden check
    const isHidden = useMemo(() =>
        ['/login', '/signup', '/watch'].some(path => currentPath.includes(path)),
        [currentPath]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasAnimated(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

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

    const handleLogout = useCallback(async () => {
        await logout();
        setIsDropdownOpen(false);
        navigate('/login');
    }, [logout, navigate]);

    const handleDropdownToggle = useCallback(() => {
        setIsDropdownOpen(prev => !prev);
    }, []);

    const handlePrefetch = useCallback((path) => {
        if (path === '/movies') {
            prefetchOnInteraction('Movies', () => import('../pages/Movies'));
        } else if (path === '/series') {
            prefetchOnInteraction('Series', () => import('../pages/Series'));
        } else if (path === '/my-list') {
            prefetchOnInteraction('MyList', () => import('../pages/MyList'));
        }
    }, []);

    const handleTabChange = useCallback((id) => {
        if (isCastModalOpen) {
            setActiveCastTab(id);
        } else {
            setActiveTab(id);
        }
    }, [isCastModalOpen, setActiveCastTab, setActiveTab]);

    const handleClose = useCallback(() => {
        if (isCastModalOpen) {
            closeCastModal();
        } else {
            onCloseHandler?.();
        }
    }, [isCastModalOpen, closeCastModal, onCloseHandler]);

    // Memoize modal nav items
    const modalNavItems = useMemo(() => {
        if (isCastModalOpen) return CAST_MODAL_NAV_ITEMS;
        return modalType === 'tv' ? MODAL_NAV_ITEMS_TV : MODAL_NAV_ITEMS_DEFAULT;
    }, [isCastModalOpen, modalType]);

    const currentActiveTab = isCastModalOpen ? activeCastTab : activeTab;
    const activeModalIndex = useMemo(() =>
        Math.max(0, modalNavItems.findIndex(item => item.id === currentActiveTab)),
        [modalNavItems, currentActiveTab]);

    const modalItemWidth = 100 / modalNavItems.length;
    const activeStandardIndex = useMemo(() =>
        STANDARD_NAV_ITEMS.findIndex(item =>
            item.path === '/' ? currentPath === '/' :
                item.isAccount ? (currentPath === '/login' || currentPath === '/profile') :
                    currentPath.startsWith(item.path)
        ),
        [currentPath]);

    if (isHidden) return null;

    const isAnyModalOpen = isModalOpen || isCastModalOpen;

    return (
        <motion.div
            className="md:hidden fixed bottom-6 left-4 right-4 z-[60] flex items-center justify-center pointer-events-none"
            style={{ willChange: 'transform' }}
            variants={CONTAINER_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
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
                            variants={DROPDOWN_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
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
                        x: isAnyModalOpen ? -30 : 0
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
                            {isAnyModalOpen ? (
                                <motion.div
                                    key={isCastModalOpen ? "cast-nav" : "modal-nav"}
                                    variants={NAV_CONTENT_VARIANTS}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
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
                                        <ModalNavItem
                                            key={item.id}
                                            item={item}
                                            isActive={currentActiveTab === item.id}
                                            onClick={handleTabChange}
                                            width={modalItemWidth}
                                        />
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="standard-nav"
                                    variants={NAV_CONTENT_VARIANTS}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
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
                                            x: `${Math.max(0, activeStandardIndex) * 100}%`,
                                            opacity: activeStandardIndex === -1 ? 0 : 1
                                        }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 35
                                        }}
                                    />

                                    {STANDARD_NAV_ITEMS.map((item) => {
                                        const isActive = item.path === '/'
                                            ? currentPath === '/'
                                            : item.isAccount
                                                ? (currentPath === '/login' || currentPath === '/profile')
                                                : currentPath.startsWith(item.path);

                                        return (
                                            <StandardNavItem
                                                key={item.name}
                                                item={item}
                                                isActive={isActive}
                                                isDropdownOpen={isDropdownOpen}
                                                user={user}
                                                onPrefetch={handlePrefetch}
                                                onDropdownToggle={handleDropdownToggle}
                                            />
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Close Button */}
                <AnimatePresence>
                    {isAnyModalOpen && (
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
                            onClick={handleClose}
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

export default memo(BottomNavbar);
