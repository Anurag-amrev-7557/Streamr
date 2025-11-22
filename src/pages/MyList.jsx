import { motion, AnimatePresence } from 'framer-motion';
import useListStore from '../store/useListStore';
import Navbar from '../components/Navbar';
import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import StreamingPlayer from '../components/StreamingPlayer';
import CustomDropdown from '../components/CustomDropdown';
import ConfirmModal from '../components/ConfirmModal';
import { X, Play, Info, Search, ChevronDown } from 'lucide-react';
import watchlistImage from '../assets/watchlist.webp';

const MyList = () => {
    const { list, removeMovie } = useListStore();
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [playerState, setPlayerState] = useState({ isOpen: false, movie: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('added');
    const [showClearModal, setShowClearModal] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
    };

    const handleCloseModal = () => {
        setSelectedMovie(null);
    };

    const handleClearAll = () => {
        setShowClearModal(true);
    };

    const confirmClearAll = () => {
        list.forEach(item => removeMovie(item.id));
    };

    const filteredList = useMemo(() => {
        let filtered = [...list];

        if (searchQuery) {
            filtered = filtered.filter(item =>
                (item.title || item.name)?.toLowerCase().includes(searchQuery.toLowerCase())
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

    return (
        <div className="bg-black min-h-screen font-sans text-white">
            <Navbar />

            <div className="pt-20 px-4 md:px-8 pb-10">
                {/* Header with animation */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex items-center justify-between mb-8"
                >
                    <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                        <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            My List
                        </span>
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className="text-gray-500 text-xl font-normal"
                        >
                            ({list.length})
                        </motion.span>
                    </h1>
                </motion.div>

                {/* Controls Bar with stagger animation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-10"
                >
                    {/* Search Bar */}
                    <motion.div
                        whileFocus={{ scale: 1.02 }}
                        className="relative flex-1 max-w-md w-full"
                    >
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search watchlist..."
                            className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all backdrop-blur-sm hover:bg-white/10"
                        />
                    </motion.div>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-3">
                        {['all', 'movies', 'tv'].map((filterType, idx) => (
                            <motion.button
                                key={filterType}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 + idx * 0.1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setFilter(filterType)}
                                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${filter === filterType
                                    ? 'bg-white text-black shadow-lg shadow-white/20'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                                    }`}
                            >
                                {filterType === 'all' ? 'All' : filterType === 'movies' ? 'Movies' : 'TV Shows'}
                            </motion.button>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <CustomDropdown
                            value={sortBy}
                            options={[
                                { value: 'added', label: 'Sort: Added' },
                                { value: 'title', label: 'Sort: Title' },
                                { value: 'year', label: 'Sort: Year' }
                            ]}
                            onChange={setSortBy}
                            isOpen={isSortDropdownOpen}
                            setIsOpen={setIsSortDropdownOpen}
                            buttonClassName="bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-sm text-white hover:bg-white/10 backdrop-blur-sm"
                            menuClassName="min-w-[160px]"
                        />
                    </motion.div>

                    {/* Clear All Button */}
                    {list.length > 0 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.7 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleClearAll}
                            className="px-5 py-2.5 bg-red-600/10 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-full text-sm font-semibold transition-all hover:bg-red-600/20"
                        >
                            Clear All
                        </motion.button>
                    )}
                </motion.div>

                {/* Content */}
                {filteredList.length > 0 ? (
                    <motion.div
                        className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide scroll-smooth"
                        style={{ scrollbarWidth: 'none' }}
                    >
                        {filteredList.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                                transition={{
                                    duration: 0.5,
                                    delay: index * 0.05,
                                    ease: [0.25, 0.46, 0.45, 0.94]
                                }}
                                className="relative group flex-shrink-0 w-[200px] aspect-[2/3] bg-white/5 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-white/30 transition-all shadow-lg hover:shadow-2xl hover:shadow-white/10"
                                onClick={() => handleMovieClick(item)}
                            >
                                {item.poster_path ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                                        alt={item.title || item.name}
                                        className="w-full h-full object-cover"
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
                                    className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                >
                                    <motion.h3
                                        initial={{ y: 10 }}
                                        whileHover={{ y: 0 }}
                                        className="font-bold text-white text-sm line-clamp-2 mb-3 drop-shadow-lg"
                                    >
                                        {item.title || item.name}
                                    </motion.h3>
                                    <div className="flex items-center gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPlayerState({ isOpen: true, movie: item });
                                            }}
                                            className="p-2 bg-white text-black rounded-full hover:bg-white/90 transition shadow-lg"
                                            title="Watch Now"
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeMovie(item.id);
                                            }}
                                            className="p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600 transition border border-red-500/50 shadow-lg"
                                            title="Remove from List"
                                        >
                                            <X className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </motion.div>
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
                            className="w-48 h-48 mb-6 opacity-30 drop-shadow-2xl"
                        />
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-2xl font-semibold mb-2 text-white"
                        >
                            {searchQuery || filter !== 'all' ? 'No results found' : 'Your list is empty'}
                        </motion.p>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-sm text-gray-500"
                        >
                            {searchQuery || filter !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Add movies and shows to keep track of what you want to watch.'}
                        </motion.p>
                    </motion.div>
                )}
            </div>

            {selectedMovie && (
                <Modal movie={selectedMovie} onClose={handleCloseModal} />
            )}

            <AnimatePresence>
                {playerState.isOpen && (
                    <StreamingPlayer
                        movie={playerState.movie}
                        type={playerState.movie?.media_type === 'tv' || playerState.movie?.first_air_date ? 'tv' : 'movie'}
                        onClose={() => setPlayerState({ isOpen: false, movie: null })}
                    />
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={confirmClearAll}
                title="Clear Entire List?"
                message="This will permanently remove all items from your watchlist. This action cannot be undone."
                confirmText="Clear All"
                cancelText="Cancel"
            />
        </div>
    );
};

export default MyList;