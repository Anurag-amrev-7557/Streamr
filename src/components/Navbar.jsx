import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, X, Calendar, Star } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import clsx from 'clsx';
import axios from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ onMovieClick }) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const notifRef = useRef(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch notifications (upcoming movies & TV) when dropdown opens
    useEffect(() => {
        if (!notifOpen) return;
        const fetchNotifications = async () => {
            try {
                const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
                const [movieRes, tvRes] = await Promise.all([
                    axios.get(`/movie/upcoming?api_key=${API_KEY}`),
                    axios.get(`/tv/on_the_air?api_key=${API_KEY}`)
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
    }, [notifOpen]);

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

    // Search functionality with debounce
    useEffect(() => {
        const searchMovies = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
                const response = await axios.get(`/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}`);

                // Filter only movies and tv shows
                const filteredResults = response.data.results?.filter(
                    item => item.media_type === 'movie' || item.media_type === 'tv'
                ).slice(0, 5) || [];

                // Fetch details for each result to get runtime/seasons
                const detailedResults = await Promise.all(filteredResults.map(async (item) => {
                    try {
                        const detailsEndpoint = item.media_type === 'movie'
                            ? `/movie/${item.id}?api_key=${API_KEY}`
                            : `/tv/${item.id}?api_key=${API_KEY}`;
                        const details = await axios.get(detailsEndpoint);
                        return { ...item, ...details.data };
                    } catch (e) {
                        return item;
                    }
                }));

                setSearchResults(detailedResults);
            } catch (error) {
                console.log('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchMovies, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSearchClose = () => {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleResultClick = (result) => {
        if (onMovieClick) {
            onMovieClick(result);
        } else {
            // Fallback if onMovieClick is not provided (though it should be)
            navigate(`/?movie=${result.id}`);
        }
        handleSearchClose();
    };

    return (
        <>
            {/* Standard Navbar */}
            <div className={clsx(
                "fixed top-0 w-full z-50 px-4 md:px-8 py-4 flex items-center justify-between transition-all duration-500 ease-in-out",
                isScrolled ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100 bg-gradient-to-b from-black/80 to-transparent"
            )}>
                <div className="flex items-center gap-8 md:gap-12">
                    <Link to="/" className="flex items-center gap-2 group">
                        <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z"
                                fill="#fff"
                            />
                        </svg>
                        <span className="text-[1.5rem] font-bold text-white tracking-tighter hidden sm:block">Streamr</span>
                    </Link>
                    <div className="hidden md:flex gap-6 text-sm font-medium text-gray-300">
                        <Link to="/" className="text-white hover:text-gray-300 transition-colors">Home</Link>
                        <Link to="/" className="hover:text-white transition-colors">Movies</Link>
                        <Link to="/" className="hover:text-white transition-colors">Series</Link>
                        <Link to="/" className="hover:text-white transition-colors">Trending</Link>
                        <Link to="/my-list" className="hover:text-white transition-colors">My List</Link>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-white">
                    {/* Search Section */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            {!searchOpen ? (
                                <motion.div
                                    key="search-icon"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Search
                                        className="w-5 h-5 cursor-pointer hover:text-gray-300 transition-colors"
                                        onClick={() => {
                                            setSearchOpen(true);
                                            setTimeout(() => searchInputRef.current?.focus(), 100);
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="search-input"
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 320, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-black/80 border border-white/20 rounded-full px-3 py-2.5 overflow-hidden backdrop-blur-md"
                                >
                                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Titles, people, genres"
                                        className="bg-transparent outline-none text-white placeholder-gray-400 text-sm w-full min-w-0"
                                        autoFocus
                                    />
                                    <X
                                        className="w-4 h-4 cursor-pointer hover:text-gray-300 flex-shrink-0"
                                        onClick={handleSearchClose}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                            {searchOpen && searchResults.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full right-0 mt-8 w-96 md:w-[450px] bg-[#181818] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50"
                                >
                                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                                        {searchResults.map((result) => (
                                            <div
                                                key={result.id}
                                                onClick={() => handleResultClick(result)}
                                                className="flex gap-4 p-3 hover:bg-white/10 cursor-pointer transition border-b border-white/5 last:border-none group"
                                            >
                                                {/* Portrait Thumbnail */}
                                                <div className="flex-shrink-0 w-16 h-24 bg-gray-800 rounded overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-300">
                                                    {result.poster_path ? (
                                                        <img
                                                            src={`https://image.tmdb.org/t/p/w154${result.poster_path}`}
                                                            alt={result.title || result.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                            <Search className="w-6 h-6 opacity-20" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                                    <h4 className="text-white font-semibold text-sm line-clamp-2 mb-1 transition-colors">
                                                        {result.title || result.name}
                                                    </h4>
                                                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {result.release_date?.substring(0, 4) || result.first_air_date?.substring(0, 4) || 'N/A'}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-yellow-500/80">
                                                            <Star className="w-3 h-3 fill-current" />
                                                            {result.vote_average?.toFixed(1) || 'N/A'}
                                                        </span>
                                                        {/* Runtime or Seasons */}
                                                        {result.media_type === 'movie' && result.runtime > 0 && (
                                                            <span className="text-gray-400">
                                                                {Math.floor(result.runtime / 60)}h {result.runtime % 60}m
                                                            </span>
                                                        )}
                                                        {result.media_type === 'tv' && result.number_of_seasons && (
                                                            <span className="text-gray-400">
                                                                {result.number_of_seasons} {result.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                                                        {result.overview || 'No description available.'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-6 text-white">
                        <div className="relative inline-block">
                            <Bell className="w-5 h-5 cursor-pointer hover:text-gray-300 transition-colors" onClick={() => setNotifOpen(prev => !prev)} />
                            {notifications.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-xs text-white rounded-full w-4 h-4 flex items-center justify-center">
                                    {notifications.length}
                                </span>
                            )}
                        </div>
                        <div className="group relative flex items-center gap-2 cursor-pointer" ref={notifRef}>
                            {/* Notification Dropdown */}
                            {notifOpen && (
                                <div className="absolute top-full right-0 mt-2 w-80 max-h-96 bg-[#181818] border border-white/10 rounded-xl shadow-xl overflow-y-auto z-50">
                                    <div className="p-2">
                                        <h4 className="text-white font-semibold mb-2">New Releases</h4>
                                        {notifications.length === 0 && (
                                            <p className="text-gray-400 text-sm">No new notifications</p>
                                        )}
                                        {notifications.map((n) => (
                                            <div key={`${n.type}-${n.id}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-md">
                                                {n.poster_path ? (
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w92${n.poster_path}`}
                                                        alt={n.title}
                                                        className="w-12 h-16 object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-16 bg-gray-700 flex items-center justify-center text-xs text-gray-400">N/A</div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-white text-sm font-medium truncate">{n.title}</p>
                                                    <p className="text-gray-400 text-xs">{new Date(n.release_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {n.type.toUpperCase()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-white/20">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                                )}
                            </div>
                            <div className="absolute top-full right-0 mt-2 w-32 bg-black/90 border border-white/10 rounded-full shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                <button
                                    onClick={() => { logout(); navigate('/login'); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/70 hover:text-black transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrolled "Pill" Navbar */}
            <div className={clsx(
                "fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out w-full max-w-xl px-4",
                isScrolled ? "translate-y-0 opacity-100" : "-translate-y-[200%] opacity-0 pointer-events-none"
            )}>
                <div className="relative">
                    <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2.5 flex items-center gap-3 shadow-2xl ring-1 ring-white/5">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!searchOpen) setSearchOpen(true);
                            }}
                            placeholder="Search movies, shows..."
                            className="bg-transparent border-none outline-none text-white placeholder-gray-400 text-sm flex-1 min-w-0"
                        />
                        {searchQuery && (
                            <X
                                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white"
                                onClick={() => setSearchQuery('')}
                            />
                        )}
                        <div className="w-px h-5 bg-white/10 mx-1"></div>
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-105 transition-transform overflow-hidden border border-white/20"
                            onClick={() => { logout(); navigate('/login'); }}
                            title="Sign Out"
                        >
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                            )}
                        </div>
                    </div>

                    {/* Scrolled Search Results */}
                    <AnimatePresence>
                        {isScrolled && searchQuery.trim() && searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-3 bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                            >
                                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                                    {searchResults.map((result) => (
                                        <div
                                            key={result.id}
                                            onClick={() => handleResultClick(result)}
                                            className="flex gap-4 p-4 hover:bg-white/10 rounded-xl cursor-pointer transition group"
                                        >
                                            <div className="flex-shrink-0 w-20 h-28 bg-gray-800 rounded-lg overflow-hidden">
                                                {result.poster_path ? (
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w154${result.poster_path}`}
                                                        alt={result.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                        <Search className="w-6 h-6 opacity-20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                                <h4 className="text-white font-semibold text-base line-clamp-1 transition-colors">
                                                    {result.title || result.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1.5 flex-wrap">
                                                    <span>{result.release_date?.substring(0, 4) || 'N/A'}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 text-yellow-500">
                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                        {result.vote_average?.toFixed(1)}
                                                    </span>
                                                    {/* Runtime or Seasons */}
                                                    {result.media_type === 'movie' && result.runtime > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{Math.floor(result.runtime / 60)}h {result.runtime % 60}m</span>
                                                        </>
                                                    )}
                                                    {result.media_type === 'tv' && result.number_of_seasons && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{result.number_of_seasons} {result.number_of_seasons === 1 ? 'Season' : 'Seasons'}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                                    {result.overview || 'No description available.'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
};

export default Navbar;
