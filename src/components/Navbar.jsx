import { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, X, Calendar, Star } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import clsx from 'clsx';
import axios from '../lib/tmdb';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useSearch, usePrefetchModalData, useSearchSuggestions } from '../hooks/useTMDB';
import { useDebounce } from '../hooks/useDebounce';
import useSearchHistoryStore from '../store/useSearchHistoryStore';
import { prefetchOnInteraction } from '../utils/routePrefetch';
import { getOptimizedAvatarUrl } from '../utils/imageUtils';

const SearchResults = lazy(() => import('./SearchResults'));

// Throttle function for scroll optimization
const throttle = (func, delay) => {
    let timeoutId;
    let lastRan;
    return function (...args) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (Date.now() - lastRan >= delay) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, delay - (Date.now() - lastRan));
        }
    };
};

import Logo from './Logo';
import LogoutModal from './LogoutModal';

// Throttle function for scroll optimization

// Memoized Notification Item
const NotificationItem = memo(({ notification }) => {
    const formattedDate = useMemo(() => {
        return new Date(notification.release_date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }, [notification.release_date]);

    return (
        <div className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors">
            {notification.poster_path ? (
                <img
                    src={`https://image.tmdb.org/t/p/w92${notification.poster_path}`}
                    alt={notification.title}
                    className="w-12 h-16 object-cover rounded-lg"
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <div className="w-12 h-16 bg-gray-700 flex items-center justify-center text-xs text-gray-400 rounded-lg">N/A</div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{notification.title}</p>
                <p className="text-gray-400 text-xs">{formattedDate} • {notification.type.toUpperCase()}</p>
            </div>
        </div>
    );
}, (prevProps, nextProps) => prevProps.notification.id === nextProps.notification.id);

NotificationItem.propTypes = {
    notification: PropTypes.shape({
        id: PropTypes.number.isRequired,
        title: PropTypes.string.isRequired,
        release_date: PropTypes.string,
        type: PropTypes.string.isRequired,
        poster_path: PropTypes.string
    }).isRequired
};

NotificationItem.displayName = 'NotificationItem';

// Memoized Navigation Links
const NavigationLinks = memo(({ className = "" }) => {
    const handleMoviesHover = useCallback(() => {
        prefetchOnInteraction('Movies', () => import('../pages/Movies'));
    }, []);

    const handleSeriesHover = useCallback(() => {
        prefetchOnInteraction('Series', () => import('../pages/Series'));
    }, []);

    const handleMyListHover = useCallback(() => {
        prefetchOnInteraction('MyList', () => import('../pages/MyList'));
    }, []);

    return (
        <div className={className}>
            <Link
                to="/movies"
                className="hover:text-white transition-colors"
                onMouseEnter={handleMoviesHover}
                onTouchStart={handleMoviesHover}
            >
                Movies
            </Link>
            <Link
                to="/series"
                className="hover:text-white transition-colors"
                onMouseEnter={handleSeriesHover}
                onTouchStart={handleSeriesHover}
            >
                Series
            </Link>
            <Link to="/" className="hover:text-white transition-colors">Trending</Link>
            <Link
                to="/my-list"
                className="hover:text-white transition-colors"
                onMouseEnter={handleMyListHover}
                onTouchStart={handleMyListHover}
            >
                My List
            </Link>
        </div>
    );
});

NavigationLinks.propTypes = {
    className: PropTypes.string
};

NavigationLinks.displayName = 'NavigationLinks';

// Memoized Pill Navigation Links
const PillNavigationLinks = memo(() => {
    const handleMoviesHover = useCallback(() => {
        prefetchOnInteraction('Movies', () => import('../pages/Movies'));
    }, []);

    const handleSeriesHover = useCallback(() => {
        prefetchOnInteraction('Series', () => import('../pages/Series'));
    }, []);

    const handleMyListHover = useCallback(() => {
        prefetchOnInteraction('MyList', () => import('../pages/MyList'));
    }, []);

    return (
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            <Link
                to="/movies"
                className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                onMouseEnter={handleMoviesHover}
                onTouchStart={handleMoviesHover}
            >
                Movies
            </Link>
            <Link
                to="/series"
                className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                onMouseEnter={handleSeriesHover}
                onTouchStart={handleSeriesHover}
            >
                Series
            </Link>
            <Link
                to="/my-list"
                className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                onMouseEnter={handleMyListHover}
                onTouchStart={handleMyListHover}
            >
                My List
            </Link>
        </div>
    );
});

PillNavigationLinks.displayName = 'PillNavigationLinks';

// Memoized Notification Dropdown
const NotificationDropdown = memo(({ notifications, isOpen, isPill = false }) => {
    if (!isOpen) return null;

    const dropdownClass = isPill
        ? "absolute top-full right-0 mt-4 w-80 max-h-96 bg-[#181818] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto z-50"
        : "absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] md:w-80 max-w-sm max-h-96 bg-[#181818] border border-white/10 rounded-xl shadow-xl overflow-y-auto z-50";

    return (
        <div className={dropdownClass}>
            <div className={isPill ? "p-3" : "p-2"}>
                <h4 className={`text-white font-semibold ${isPill ? 'mb-3 px-2' : 'mb-2'}`}>New Releases</h4>
                {notifications.length === 0 ? (
                    <p className={`text-gray-400 text-sm ${isPill ? 'text-center py-6' : ''}`}>No new notifications</p>
                ) : (
                    notifications.map((n) => (
                        <NotificationItem key={`${n.type}-${n.id}`} notification={n} />
                    ))
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.isOpen === nextProps.isOpen &&
        prevProps.notifications.length === nextProps.notifications.length &&
        prevProps.isPill === nextProps.isPill;
});

NotificationDropdown.propTypes = {
    notifications: PropTypes.array.isRequired,
    isOpen: PropTypes.bool.isRequired,
    isPill: PropTypes.bool
};

NotificationDropdown.displayName = 'NotificationDropdown';

const Navbar = ({ onMovieClick }) => {
    const { user, logout, isLoggingOut } = useAuthStore();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const notifRef = useRef(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);
    const pillSearchInputRef = useRef(null);
    const hoverTimeoutRef = useRef(null);
    const blurTimeoutRef = useRef(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

    // Debounce search query
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Use Search Suggestions
    const { data: suggestionsData } = useSearchSuggestions(debouncedSearchQuery);
    const suggestions = suggestionsData?.suggestions || [];

    // Reset active suggestion when query changes
    useEffect(() => {
        setActiveSuggestionIndex(-1); // eslint-disable-line react-hooks/set-state-in-effect
    }, [debouncedSearchQuery]);

    const handleKeyDown = (e) => {
        if (!suggestions.length) return;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter' && activeSuggestionIndex !== -1) {
            e.preventDefault();
            handleHistoryClick(suggestions[activeSuggestionIndex]);
            setActiveSuggestionIndex(-1);
        }
    };

    // Use React Query for search with caching (enhanced with filters/pagination)
    const { data: searchData, isLoading: isSearching } = useSearch(debouncedSearchQuery);
    const searchResults = useMemo(() => searchData?.results || [], [searchData]);

    // Prefetch hook for result hover
    const { prefetchModalData } = usePrefetchModalData();

    // Automatically prefetch top result when search results change
    useEffect(() => {
        if (searchResults.length > 0) {
            const topResult = searchResults[0];
            prefetchModalData(topResult);
        }
    }, [searchResults, prefetchModalData]);

    // Search history
    const { searches, addSearch, clearHistory, removeSearch, fetchHistory } = useSearchHistoryStore();

    // Fetch history on mount/auth
    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user, fetchHistory]);

    // Memoized throttled scroll handler
    const handleScroll = useMemo(() => {
        const scrollHandler = () => {
            setIsScrolled(window.scrollY > 100);
        };
        return throttle(scrollHandler, 100);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Fetch notifications (upcoming movies & TV) when dropdown opens
    useEffect(() => {
        if (!notifOpen || notifications.length > 0) return;

        const fetchNotifications = async () => {
            try {
                const [movieRes, tvRes] = await Promise.all([
                    axios.get(`/movie/upcoming`),
                    axios.get(`/tv/on_the_air`)
                ]);
                const movies = (movieRes.data.results || []).map(item => ({
                    id: item.id,
                    title: item.title,
                    release_date: item.release_date,
                    type: 'movie',
                    poster_path: item.poster_path
                }));
                const tvShows = (tvRes.data.results || []).map(item => ({
                    id: item.id,
                    title: item.name,
                    release_date: item.first_air_date,
                    type: 'tv',
                    poster_path: item.poster_path
                }));
                const combined = [...movies, ...tvShows]
                    .filter(n => n.release_date)
                    .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
                setNotifications(combined);
            } catch (e) {
                console.error('Failed to fetch notifications', e);
            }
        };
        fetchNotifications();
    }, [notifOpen, notifications.length]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        };
        if (notifOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [notifOpen]);

    // Hover prefetching for search results
    const handleResultHover = useCallback((result) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            prefetchModalData(result);
        }, 200);
    }, [prefetchModalData]);

    const handleResultLeave = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    }, []);

    // Cleanup effect to prevent memory leaks
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    const handleSearchClose = useCallback(() => {
        setSearchOpen(false);
        setSearchQuery('');
    }, []);

    const handleResultClick = useCallback((result) => {
        // Save to search history
        addSearch(result.title || result.name);

        if (onMovieClick) {
            onMovieClick(result);
        } else {
            navigate(`/?movie=${result.id}`);
        }
        handleSearchClose();
    }, [addSearch, onMovieClick, navigate, handleSearchClose]);

    const handleHistoryClick = useCallback((query) => {
        setSearchQuery(query);
    }, []);

    const handleSearchIconClick = useCallback(() => {
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }, []);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const handlePillSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
        if (!searchOpen) setSearchOpen(true);
    }, [searchOpen]);

    const handleSearchFocus = useCallback(() => {
        setIsSearchFocused(true);
    }, []);

    const handleSearchBlur = useCallback(() => {
        blurTimeoutRef.current = setTimeout(() => setIsSearchFocused(false), 200);
    }, []);

    const handleClearQuery = useCallback(() => {
        setSearchQuery('');
    }, []);

    const toggleNotifications = useCallback(() => {
        setNotifOpen(prev => !prev);
    }, []);

    const handleLogoutClick = useCallback(() => {
        setIsLogoutModalOpen(true);
        setNotifOpen(false); // Close notification dropdown if open
    }, []);

    const handleConfirmLogout = useCallback(async () => {
        await logout();
        setIsLogoutModalOpen(false);
        navigate('/login');
    }, [logout, navigate]);

    // Memoize animation width for search input
    const searchInputWidth = useMemo(() => {
        return typeof window !== 'undefined' && window.innerWidth < 768 ? 240 : 320;
    }, []);

    // Memoize search results visibility condition
    const shouldShowSearchResults = useMemo(() => {
        return searchOpen && (
            isSearching ||
            searchResults.length > 0 ||
            (!debouncedSearchQuery && isSearchFocused) ||
            (debouncedSearchQuery && searchResults.length === 0)
        );
    }, [searchOpen, isSearching, searchResults.length, debouncedSearchQuery, isSearchFocused]);

    const shouldShowScrolledSearchResults = useMemo(() => {
        return isScrolled && (
            isSearching ||
            searchResults.length > 0 ||
            (!debouncedSearchQuery.trim() && isSearchFocused) ||
            (debouncedSearchQuery && searchResults.length === 0)
        );
    }, [isScrolled, isSearching, searchResults.length, debouncedSearchQuery, isSearchFocused]);

    return (
        <>
            {/* Standard Navbar */}
            <div className={clsx(
                "fixed top-0 w-full z-50 px-3 md:px-8 py-3 md:py-4 flex items-center justify-between transition-all duration-500 ease-in-out",
                isScrolled ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
            )}>
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent -z-10 pointer-events-none transition-all duration-500" />
                <div className="flex items-center justify-center w-full md:w-auto md:justify-start gap-4 md:gap-12">
                    <Logo />
                    <NavigationLinks className="hidden md:flex gap-6 text-sm font-medium text-gray-300" />
                </div>

                <div className="hidden md:flex items-center gap-4 md:gap-6 text-white">
                    {/* Search Section */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            {!searchOpen ? (
                                <motion.div
                                    key="search-icon"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{
                                        duration: 0.15,
                                        ease: [0.4, 0, 0.2, 1]
                                    }}
                                >
                                    <Search
                                        className="w-5 h-5 cursor-pointer hover:text-gray-300 transition-colors"
                                        onClick={handleSearchIconClick}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open search"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchIconClick()}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="search-input"
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{
                                        width: searchInputWidth,
                                        opacity: 1
                                    }}
                                    exit={{
                                        width: 0,
                                        opacity: 0
                                    }}
                                    transition={{
                                        width: {
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30
                                        },
                                        opacity: {
                                            duration: 0.2,
                                            ease: "easeOut"
                                        }
                                    }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-black/80 border border-white/20 rounded-full px-3 py-2 md:py-3 overflow-hidden backdrop-blur-md"
                                >
                                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        onFocus={handleSearchFocus}
                                        onBlur={handleSearchBlur}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Titles, people, genres"
                                        className="bg-transparent outline-none text-white placeholder-gray-400 text-sm w-full min-w-0 md:w-[450px]"
                                        autoFocus
                                    />
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        <X
                                            className="w-[22px] h-[22px] p-1 bg-white text-black rounded-full cursor-pointer hover:bg-gray-200 flex-shrink-0 transition-colors"
                                            onClick={handleSearchClose}
                                            role="button"
                                            tabIndex={0}
                                            aria-label="Close search"
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClose()}
                                        />
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Search Results / History Dropdown */}
                        <AnimatePresence>
                            {shouldShowSearchResults && (
                                <Suspense fallback={
                                    <motion.div
                                        layoutId="searchResultsWindow"
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        className="absolute top-full right-0 mt-8 w-[calc(100vw-2rem)] md:w-[450px] max-w-md bg-[#0a0a0a]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col p-2 space-y-2"
                                    >
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            Loading...
                                        </div>
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
                                                <div className="w-32 h-20 bg-white/5 rounded-lg flex-shrink-0" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-white/5 rounded w-3/4" />
                                                    <div className="flex gap-2">
                                                        <div className="h-3 bg-white/5 rounded w-12" />
                                                        <div className="h-3 bg-white/5 rounded w-16" />
                                                    </div>
                                                    <div className="h-3 bg-white/5 rounded w-full" />
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                }>
                                    <SearchResults
                                        results={searchResults}
                                        suggestions={suggestions}
                                        searches={searches}
                                        isLoading={isSearching}
                                        searchQuery={debouncedSearchQuery}
                                        activeSuggestionIndex={activeSuggestionIndex}
                                        onResultClick={handleResultClick}
                                        onHistoryClick={handleHistoryClick}
                                        onClearHistory={clearHistory}
                                        onRemoveSearch={removeSearch}
                                        onHover={handleResultHover}
                                        onLeave={handleResultLeave}
                                        className="absolute top-full right-0 mt-8 w-[calc(100vw-2rem)] md:w-[450px] max-w-md"
                                        layoutId="searchResultsWindow"
                                    />
                                </Suspense>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6 text-white">
                        {user ? (
                            <>
                                <div className="relative inline-block">
                                    <Bell
                                        className="w-5 h-5 cursor-pointer hover:text-gray-300 transition-colors"
                                        onClick={toggleNotifications}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Toggle notifications"
                                        onKeyDown={(e) => e.key === 'Enter' && toggleNotifications()}
                                    />
                                    {notifications.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-600 text-xs text-white rounded-full w-4 h-4 flex items-center justify-center">
                                            {notifications.length}
                                        </span>
                                    )}
                                </div>
                                <div className="group relative flex items-center gap-2 cursor-pointer" ref={notifRef}>
                                    <NotificationDropdown notifications={notifications} isOpen={notifOpen} />
                                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm overflow-hidden border border-white/20">
                                        {user?.avatar ? (
                                            <img
                                                src={getOptimizedAvatarUrl(user.avatar)}
                                                alt={user.name}
                                                className="w-full h-full object-cover"
                                                referrerPolicy="no-referrer"
                                                loading="lazy"
                                            />
                                        ) : (
                                            (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                                        )}
                                    </div>
                                    <div className="absolute top-full right-0 mt-2 w-32 bg-black/90 border border-white/10 rounded-full shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                        <button
                                            onClick={handleLogoutClick}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/70 hover:text-black transition-colors"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <Link to="/login" className="bg-white hover:bg-white/90 text-black px-4 py-1.5 rounded-full font-medium text-sm transition-colors">
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrolled "Pill" Navbar */}
            <motion.div
                className={clsx(
                    "fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4",
                    isScrolled ? "pointer-events-auto" : "pointer-events-none"
                )}
                initial={{ y: -100, opacity: 0 }}
                animate={{
                    y: isScrolled ? 0 : -100,
                    opacity: isScrolled ? 1 : 0
                }}
                transition={{
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1.0], // Cubic bezier for smooth ease-out
                }}
            >
                <div className="relative">
                    {/* Main Pill Container */}
                    <div
                        className="bg-black/40 backdrop-blur-xl backdrop-saturate-150 border border-white/10 rounded-full px-5 py-3 flex items-center gap-4 shadow-2xl ring-1 ring-white/5 hover:border-white/20"
                        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
                    >
                        {/* Logo */}
                        <Logo className="flex-shrink-0" isSmall={true} showText={true} textClassName="hidden md:block" />

                        {/* Divider */}
                        <div className="hidden md:block w-px h-5 bg-white/10"></div>

                        {/* Navigation Links */}
                        <PillNavigationLinks />

                        {/* Divider */}
                        <div className="hidden md:block w-px h-5 bg-white/10"></div>

                        {/* Search Input */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <input
                                ref={pillSearchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={handlePillSearchChange}
                                onFocus={handleSearchFocus}
                                onBlur={handleSearchBlur}
                                placeholder="Search..."
                                className="bg-transparent border-none outline-none text-white placeholder-gray-400 text-base flex-1 min-w-0"
                            />
                            <AnimatePresence>
                                {searchQuery && (
                                    <motion.div
                                        key="clear-button"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <X
                                            className="w-[22px] h-[22px] p-1 bg-white text-black rounded-full cursor-pointer hover:bg-gray-200 transition-colors flex-shrink-0"
                                            onClick={handleClearQuery}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block w-px h-5 bg-white/10"></div>

                        {/* User Section */}
                        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                            {user ? (
                                <>
                                    <div className="relative">
                                        <Bell
                                            className="w-5 h-5 cursor-pointer text-white/80 hover:text-white hover:scale-110 transition-all"
                                            onClick={toggleNotifications}
                                            role="button"
                                            tabIndex={0}
                                            aria-label="Toggle notifications"
                                            onKeyDown={(e) => e.key === 'Enter' && toggleNotifications()}
                                        />
                                        {notifications.length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                                                {notifications.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="group relative -mr-1" ref={notifRef}>
                                        <NotificationDropdown notifications={notifications} isOpen={notifOpen} isPill={true} />
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 hover:ring-2 hover:ring-white/30 transition-all overflow-hidden border border-white/20"
                                            onClick={handleLogoutClick}
                                            title="Sign Out"
                                        >
                                            {user?.avatar ? (
                                                <img
                                                    src={getOptimizedAvatarUrl(user.avatar)}
                                                    alt={user.name}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Link
                                    to="/login"
                                    className="bg-white hover:bg-white/90 -mr-1 text-black px-4 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105 whitespace-nowrap"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Scrolled Search Results / History */}
                    <AnimatePresence>
                        {shouldShowScrolledSearchResults && (
                            <Suspense fallback={<div className="absolute flex justify-center items-center top-full min-h-[25vh] left-0 right-0 mt-4 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center text-gray-400">Loading...</div>}>
                                <SearchResults
                                    results={searchResults}
                                    suggestions={suggestions}
                                    searches={searches}
                                    isLoading={isSearching}
                                    searchQuery={debouncedSearchQuery}
                                    onResultClick={handleResultClick}
                                    onHistoryClick={handleHistoryClick}
                                    onClearHistory={clearHistory}
                                    onRemoveSearch={removeSearch}
                                    onHover={handleResultHover}
                                    onLeave={handleResultLeave}
                                    className="absolute top-full left-0 right-0 mt-4"
                                />
                            </Suspense>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                isLoggingOut={isLoggingOut}
            />
        </>
    );
};

Navbar.propTypes = {
    onMovieClick: PropTypes.func
};

export default memo(Navbar, (prevProps, nextProps) => {
    // Only re-render if onMovieClick function reference changes
    return prevProps.onMovieClick === nextProps.onMovieClick;
});
