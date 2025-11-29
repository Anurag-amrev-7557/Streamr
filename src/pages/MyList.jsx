import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import useListStore from '../store/useListStore';
import Navbar from '../components/Navbar';
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import Modal from '../components/Modal';
import StreamingPlayer from '../components/StreamingPlayer';
import ConfirmModal from '../components/ConfirmModal';
import { X, Play, Info, Search } from 'lucide-react';
import watchlistImage from '../assets/watchlist.webp';

// Memoized ListCard component to prevent unnecessary re-renders
const ListCard = memo(({ item, onMovieClick, onPlayClick, onRemoveClick }) => {
    const handleCardClick = useCallback(() => {
        onMovieClick(item);
    }, [item, onMovieClick]);

    const handlePlayClick = useCallback((e) => {
        e.stopPropagation();
        onPlayClick(item);
    }, [item, onPlayClick]);

    const handleRemoveClick = useCallback((e) => {
        e.stopPropagation();
        onRemoveClick(item.id);
    }, [item.id, onRemoveClick]);

    return (
        <motion.div
            className="relative group w-full aspect-[2/3] bg-white/5 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-white/30 transition-all shadow-lg hover:shadow-2xl hover:shadow-white/10"
            onClick={handleCardClick}
        >
            {item.poster_path ? (
                <img
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={item.title || item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Info className="w-12 h-12 opacity-20" />
                </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Hover Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col justify-end p-3 md:p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <motion.h3
                    initial={{ y: 10 }}
                    whileHover={{ y: 0 }}
                    className="font-bold text-white text-xs md:text-sm line-clamp-2 mb-2 md:mb-3 drop-shadow-lg">
                    {item.title || item.name}
                </motion.h3>
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handlePlayClick}
                        className="p-1.5 md:p-2 bg-white text-black rounded-full hover:bg-white/90 transition shadow-lg"
                        title="Watch Now"
                        aria-label="Watch Now"
                    >
                        <Play className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleRemoveClick}
                        className="p-1.5 md:p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600 transition border border-red-500/50 shadow-lg"
                        title="Remove from List"
                        aria-label="Remove from List"
                    >
                        <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return prevProps.item.id === nextProps.item.id &&
        prevProps.index === nextProps.index;
});

ListCard.displayName = 'ListCard';

// Memoized Filter Button
const FilterButton = memo(({ filterType, currentFilter, onClick, buttonRef }) => {
    const label = useMemo(() => {
        if (filterType === 'all') return 'All';
        if (filterType === 'movies') return 'Movies';
        return 'TV Shows';
    }, [filterType]);

    const isActive = currentFilter === filterType;

    return (
        <button
            ref={buttonRef}
            onClick={() => onClick(filterType)}
            className={`relative z-10 px-5 md:px-5 py-2 md:py-2.5 rounded-full text-sm md:text-sm font-semibold transition-colors whitespace-nowrap ${isActive ? 'text-black' : 'text-gray-400 hover:text-white'
                }`}
        >
            {label}
        </button>
    );
}, (prevProps, nextProps) => {
    return prevProps.filterType === nextProps.filterType &&
        prevProps.currentFilter === nextProps.currentFilter;
});

FilterButton.displayName = 'FilterButton';

const MyList = () => {
    const { list, removeMovie, clearList } = useListStore();
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [playerState, setPlayerState] = useState({ isOpen: false, movie: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sortBy] = useState('added');
    const [showClearModal, setShowClearModal] = useState(false);

    // Refs for filter buttons to measure their widths
    const filterRefs = useRef({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    // Memoized event handlers
    const handleMovieClick = useCallback((movie) => {
        setSelectedMovie(movie);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedMovie(null);
    }, []);

    const handleClearAll = useCallback(() => {
        setShowClearModal(true);
    }, []);

    const confirmClearAll = useCallback(() => {
        clearList();
    }, [clearList]);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleFilterChange = useCallback((filterType) => {
        setFilter(filterType);
    }, []);

    const handlePlayClick = useCallback((movie) => {
        setPlayerState({ isOpen: true, movie });
    }, []);

    const handleRemoveClick = useCallback((movieId) => {
        removeMovie(movieId);
    }, [removeMovie]);

    const handlePlayerClose = useCallback(() => {
        setPlayerState({ isOpen: false, movie: null });
    }, []);

    const handleCloseClearModal = useCallback(() => {
        setShowClearModal(false);
    }, []);

    // Update indicator position when filter changes
    useEffect(() => {
        const activeButton = filterRefs.current[filter];
        if (activeButton) {
            const { offsetLeft, offsetWidth } = activeButton;
            setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
        }
    }, [filter]);

    // Memoized filtered and sorted list
    const filteredList = useMemo(() => {
        let filtered = [...list];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                (item.title || item.name)?.toLowerCase().includes(query)
            );
        }

        if (filter === 'movies') {
            filtered = filtered.filter(item => item.media_type === 'movie' || !item.first_air_date);
        } else if (filter === 'tv') {
            filtered = filtered.filter(item => item.media_type === 'tv' || item.first_air_date);
        }

        if (sortBy === 'title') {
            filtered.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
        } else if (sortBy === 'year') {
            filtered.sort((a, b) => {
                const yearA = (a.release_date || a.first_air_date || '').substring(0, 4);
                const yearB = (b.release_date || b.first_air_date || '').substring(0, 4);
                return yearB - yearA;
            });
        }

        return filtered;
    }, [list, searchQuery, filter, sortBy]);

    // Memoized empty state message
    const emptyStateMessage = useMemo(() => {
        if (searchQuery || filter !== 'all') {
            return {
                title: 'No results found',
                subtitle: 'Try adjusting your search or filters'
            };
        }
        return {
            title: 'Your list is empty',
            subtitle: 'Add movies and shows to keep track of what you want to watch.'
        };
    }, [searchQuery, filter]);

    // Memoized filter types
    const filterTypes = useMemo(() => ['all', 'movies', 'tv'], []);

    return (
        <div className="bg-black min-h-screen font-sans text-white overflow-x-hidden">
            <Navbar />

            <div className="pt-16 md:pt-20 px-3 md:px-8 pb-10">
                {/* Header with Controls - Single Line on Desktop */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-6 md:mb-10"
                >
                    {/* Left: Title */}
                    <h1 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-2 md:gap-3">
                        <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            My List
                        </span>
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className="text-gray-500 text-base md:text-xl font-normal"
                        >
                            ({list.length})
                        </motion.span>
                    </h1>

                    {/* Right: Controls (only show when list has items on desktop) */}
                    {list.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="flex flex-col md:flex-row items-stretch items-center justify-center md:items-center gap-3 md:gap-4"
                        >
                            {/* Search Bar - Full width on mobile, fixed width on desktop */}
                            <motion.div
                                whileFocus={{ scale: 1.02 }}
                                className="relative w-full md:w-64 sm:mt-3"
                            >
                                <Search className="absolute z-2 left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder="Search..."
                                    className="w-full bg-white/5 border border-white/30 rounded-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all backdrop-blur-sm hover:bg-white/10"
                                />
                            </motion.div>

                            {/* Filter Toggler and Clear All - One line on mobile */}
                            <div className="flex items-center justify-between md:justify-start gap-3 md:gap-4 mt-2.5">
                                {/* Filter Buttons - Premium Toggler */}
                                <div className="relative flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                                    {/* Sliding Background */}
                                    <motion.div
                                        className="absolute top-1 bottom-1 bg-white rounded-full"
                                        initial={false}
                                        animate={{
                                            left: indicatorStyle.left,
                                            width: indicatorStyle.width
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />

                                    {filterTypes.map((filterType) => (
                                        <FilterButton
                                            key={filterType}
                                            filterType={filterType}
                                            currentFilter={filter}
                                            onClick={handleFilterChange}
                                            buttonRef={(el) => (filterRefs.current[filterType] = el)}
                                        />
                                    ))}
                                </div>

                                {/* Clear All Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleClearAll}
                                    className="px-5 md:px-5 py-2.5 md:py-2.5 bg-white/10 hover:bg-white/90 text-white/80 hover:text-black border border-white/10 hover:border-white/30 rounded-full text-sm md:text-sm font-semibold transition-all hover:bg-white/20 whitespace-nowrap"
                                >
                                    <span className="hidden md:inline">Clear All</span>
                                    <span className="md:hidden">Clear</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                {/* Content */}
                {filteredList.length > 0 ? (
                    <motion.div
                        className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-8 gap-3 md:gap-5 pb-6"
                    >
                        {filteredList.map((item, index) => (
                            <ListCard
                                key={item.id}
                                item={item}
                                index={index}
                                onMovieClick={handleMovieClick}
                                onPlayClick={handlePlayClick}
                                onRemoveClick={handleRemoveClick}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col items-center justify-center h-[60vh] text-gray-400"
                    >
                        <motion.img
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            src={watchlistImage}
                            alt="Watchlist Logo"
                            className="w-32 h-32 md:w-48 md:h-48 mb-4 md:mb-6 opacity-30 drop-shadow-2xl"
                        />
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-xl md:text-2xl font-semibold mb-2 text-white"
                        >
                            {emptyStateMessage.title}
                        </motion.p>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-base text-gray-500 text-center"
                        >
                            {emptyStateMessage.subtitle}
                        </motion.p>
                    </motion.div>
                )
                }
            </div >

            {selectedMovie && (
                <Modal movie={selectedMovie} onClose={handleCloseModal} onMovieClick={handleMovieClick} />
            )}

            <AnimatePresence>
                {playerState.isOpen && (
                    <StreamingPlayer
                        movie={playerState.movie}
                        type={playerState.movie?.media_type === 'tv' || playerState.movie?.first_air_date ? 'tv' : 'movie'}
                        onClose={handlePlayerClose}
                    />
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={showClearModal}
                onClose={handleCloseClearModal}
                onConfirm={confirmClearAll}
                title="Clear Entire List?"
                message="This will permanently remove all items from your watchlist. This action cannot be undone."
                confirmText="Clear All"
                cancelText="Cancel"
            />
        </div >
    );
};

export default memo(MyList);