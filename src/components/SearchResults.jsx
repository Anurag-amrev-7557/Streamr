import React from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Search, Calendar, Star, X, TrendingUp, Clock, ThumbsUp, Sparkles } from 'lucide-react';
import clsx from 'clsx';

// Animation variants for container (Window)
const containerVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 30
        }
    },
    exit: { opacity: 0, y: -10, scale: 0.95 }
};

// Animation variants for the list (stagger items)
const listVariants = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

// Animation variants for items
const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.2
        }
    }
};

// Animation variants for suggestions container
const suggestionsContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.03,
            delayChildren: 0.1
        }
    }
};

// Animation variants for suggestion items
const suggestionItemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.15,
            ease: "linear"
        }
    }
};

// Helper to highlight matching text
const highlightText = (text, query) => {
    if (!query || !text) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
            <span key={index} className="font-bold text-white bg-white/20 rounded px-1 shadow-[0_0_10px_rgba(255,255,255,0.2)] ring-1 ring-white/30 transition-all duration-300">{part}</span>
        ) : (
            <span key={index}>{part}</span>
        )
    );
};

// Memoized Result Item Component
const ResultItem = React.memo(({ result, searchQuery, onClick, onHover, onLeave }) => (
    <motion.div
        layout
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={() => onClick(result)}
        onMouseEnter={() => onHover && onHover(result)}
        onMouseLeave={onLeave}
        className="flex items-center gap-3 md:gap-4 p-1 py-2 md:py-3 md:p-3 hover:bg-white/5 rounded-xl cursor-pointer group relative overflow-hidden transition-colors duration-400"
    >
        {/* Hover Highlight Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Landscape Thumbnail */}
        <div className="relative flex-shrink-0 w-32 h-20 md:w-35 md:h-23 bg-gray-800 rounded-lg overflow-hidden shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 z-10">
            {result.backdrop_path || result.poster_path ? (
                <img
                    src={`https://image.tmdb.org/t/p/w300${result.backdrop_path || result.poster_path}`}
                    alt={result.title || result.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 bg-gray-800">
                    <Search className="w-6 h-6 opacity-20" />
                </div>
            )}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col gap-4 md:gap-0 justify-center min-w-0 z-10">
            <h4 className="text-white font-semibold text-sm line-clamp-1 group-hover:text-white transition-colors">
                {highlightText(result.title || result.name, searchQuery)}
            </h4>

            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <span>
                    {result.release_date?.substring(0, 4) || result.first_air_date?.substring(0, 4) || 'N/A'}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-gray-300 uppercase text-[10px] tracking-wider font-medium">
                    {result.media_type === 'movie' ? 'Movie' : 'TV Series'}
                </span>
                {result.vote_average > 0 && (
                    <>
                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                        <span className="text-gray-300">
                            ★ {result.vote_average.toFixed(1)}
                        </span>
                    </>
                )}
            </div>

            <p className="hidden md:line-clamp-2 text-xs text-gray-300 mt-2 leading-relaxed">
                {result.overview || 'No description available.'}
            </p>
        </div>
    </motion.div>
));

ResultItem.displayName = 'ResultItem';

const SearchResults = ({
    results = [],
    suggestions = [],
    searches = [],
    isLoading = false,
    isFetching = false,
    searchQuery = '',
    activeSuggestionIndex = -1,
    sortBy = 'relevance',
    onSortChange,
    responseTime,
    totalResults,
    onResultClick,
    onHistoryClick,
    onClearHistory,
    onRemoveSearch,
    onHover,
    onLeave,
    className,
    layoutId
}) => {
    // Sort options
    const sortOptions = [
        { value: 'relevance', label: 'Relevance', icon: TrendingUp },
        { value: 'recent', label: 'Recent', icon: Clock },
        { value: 'popular', label: 'Popular', icon: ThumbsUp },
        { value: 'rating', label: 'Rating', icon: Star },
    ];

    // Drag-to-scroll logic for suggestions
    const suggestionsRef = React.useRef(null);
    const [isDown, setIsDown] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [scrollLeft, setScrollLeft] = React.useState(0);
    const isDragging = React.useRef(false);
    const velocity = React.useRef(0);
    const lastPageX = React.useRef(0);
    const rAF = React.useRef(null);

    const cancelMomentum = React.useCallback(() => {
        if (rAF.current) {
            cancelAnimationFrame(rAF.current);
            rAF.current = null;
        }
    }, []);

    const beginMomentum = React.useCallback(() => {
        cancelMomentum();
        const momentumLoop = () => {
            if (!suggestionsRef.current) return;
            suggestionsRef.current.scrollLeft -= velocity.current * 2;
            velocity.current *= 0.95;
            if (Math.abs(velocity.current) > 0.5) {
                rAF.current = requestAnimationFrame(momentumLoop);
            } else {
                velocity.current = 0;
            }
        };
        momentumLoop();
    }, [cancelMomentum]);

    const handleMouseDown = React.useCallback((e) => {
        cancelMomentum();
        setIsDown(true);
        if (suggestionsRef.current) {
            setStartX(e.pageX - suggestionsRef.current.offsetLeft);
            setScrollLeft(suggestionsRef.current.scrollLeft);
            lastPageX.current = e.pageX;
            velocity.current = 0;
        }
        isDragging.current = false;
    }, [cancelMomentum]);

    const handleMouseLeave = React.useCallback(() => {
        if (isDown) {
            setIsDown(false);
            beginMomentum();
        }
    }, [isDown, beginMomentum]);

    const handleMouseUp = React.useCallback(() => {
        setIsDown(false);
        beginMomentum();
        setTimeout(() => {
            isDragging.current = false;
        }, 0);
    }, [beginMomentum, isDown]);

    const handleMouseMove = React.useCallback((e) => {
        if (!isDown) return;
        e.preventDefault();
        if (suggestionsRef.current) {
            const x = e.pageX - suggestionsRef.current.offsetLeft;
            const walk = (x - startX) * 2;
            suggestionsRef.current.scrollLeft = scrollLeft - walk;
            const delta = e.pageX - lastPageX.current;
            velocity.current = delta;
            lastPageX.current = e.pageX;
            if (Math.abs(walk) > 5) {
                isDragging.current = true;
            }
        }
    }, [isDown, startX, scrollLeft]);

    const handleSuggestionClick = React.useCallback((suggestion) => {
        if (!isDragging.current) {
            onHistoryClick(suggestion);
        }
    }, [onHistoryClick]);

    React.useEffect(() => {
        return () => cancelMomentum();
    }, [cancelMomentum]);

    // Scroll active suggestion into view
    React.useEffect(() => {
        if (activeSuggestionIndex !== -1 && suggestionsRef.current) {
            const activeElement = suggestionsRef.current.children[activeSuggestionIndex];
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeSuggestionIndex]);

    return (
        <motion.div
            layoutId={layoutId}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            variants={containerVariants}
            initial={layoutId ? "visible" : "hidden"}
            animate="visible"
            exit="exit"
            className={clsx(
                "bg-[#0a0a0a]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col",
                className
            )}
        >
            {isLoading ? (
                <div className="p-2 space-y-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Searching...
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
                </div>
            ) : results.length > 0 ? (
                /* Search Results */
                <div className="flex flex-col max-h-[65vh]">
                    {/* Suggestions Section (if any) */}
                    {suggestions.length > 0 && (
                        <div className="px-4 pt-3 pb-2 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <Sparkles className="w-3 h-3 text-white/70" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    Suggested for you
                                </span>
                            </div>
                            <motion.div
                                ref={suggestionsRef}
                                variants={suggestionsContainerVariants}
                                initial="hidden"
                                animate="visible"
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                className="flex gap-2 my-2 mt-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing select-none"
                            >
                                {suggestions.map((suggestion, index) => (
                                    <motion.button
                                        key={index}
                                        variants={suggestionItemVariants}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className={clsx(
                                            "group flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200 border whitespace-nowrap",
                                            index === activeSuggestionIndex
                                                ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-105"
                                                : "bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 hover:text-white border-white/5 hover:border-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                                        )}
                                    >
                                        <Search className={clsx(
                                            "w-3 h-3 transition-all",
                                            index === activeSuggestionIndex ? "opacity-100 text-black" : "opacity-40 group-hover:opacity-100 group-hover:text-white"
                                        )} />
                                        <span className="font-medium">{suggestion}</span>
                                    </motion.button>
                                ))}
                            </motion.div>
                        </div>
                    )}

                    {/* Header with Stats and Sort */}
                    {(totalResults !== undefined || onSortChange) && (
                        <div className="px-3 py-2 bg-[#181818]/95 backdrop-blur-md sticky top-0 z-10 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                    <span>
                                        {totalResults !== undefined && (
                                            <>
                                                <span className="font-medium text-white">{totalResults}</span>
                                                {' result' + (totalResults !== 1 ? 's' : '')}
                                            </>
                                        )}
                                        {responseTime && (
                                            <span className="ml-2">in {responseTime}ms</span>
                                        )}
                                    </span>
                                    {isFetching && (
                                        <span className="flex items-center gap-1 ml-2 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                            Updating
                                        </span>
                                    )}
                                </div>

                                {onSortChange && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Sort:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => onSortChange(e.target.value)}
                                            className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                        >
                                            {sortOptions.map(option => (
                                                <option key={option.value} value={option.value} className="bg-[#181818] text-white">
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Results List */}
                    <motion.div
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                        className="overflow-y-auto custom-scrollbar p-2"
                    >
                        {results.map((result) => (
                            <ResultItem
                                key={result.id}
                                result={result}
                                searchQuery={searchQuery}
                                onClick={onResultClick}
                                onHover={onHover}
                                onLeave={onLeave}
                            />
                        ))}
                    </motion.div>
                </div>
            ) : searchQuery ? (
                /* No Results Found - Show Suggestions if available */
                <div className="flex flex-col">
                    {suggestions.length > 0 ? (
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                Suggestions
                            </div>
                            <div className="space-y-1">
                                {suggestions.map((suggestion, index) => (
                                    <motion.div
                                        key={index}
                                        variants={itemVariants}
                                        onClick={() => onHistoryClick(suggestion)}
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl cursor-pointer group transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                                            <Search className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                                        </div>
                                        <span className="flex-1 text-sm text-gray-300 group-hover:text-white transition-colors truncate font-medium">
                                            {highlightText(suggestion, searchQuery)}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-base font-medium text-gray-300">No results found for "{searchQuery}"</p>
                            <p className="text-xs text-gray-500 mt-1">Try checking for typos or using different keywords</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Search History */
                <div className="p-2 md:p-4">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                            <Search className="w-3 h-3" />
                            Recent Searches
                        </h4>
                        {searches.length > 0 && (
                            <button
                                onClick={onClearHistory}
                                className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 hover:bg-white/10 rounded"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {searches.length > 0 ? (
                        <motion.div
                            variants={listVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-1"
                        >
                            {searches.map((search, index) => (
                                <motion.div
                                    key={search.timestamp || index}
                                    variants={itemVariants}
                                    className="flex items-center gap-3 px-1 md:px-3 py-2.5 hover:bg-white/5 rounded-xl cursor-pointer group transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                                        <Search className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                                    </div>

                                    <span
                                        onClick={() => onHistoryClick(search.query)}
                                        className="flex-1 text-sm text-gray-300 group-hover:text-white transition-colors truncate font-medium"
                                    >
                                        {search.query}
                                    </span>

                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveSearch(search.query);
                                        }}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                <Search className="w-6 h-6 opacity-30" />
                            </div>
                            <p className="text-sm">No recent searches</p>
                            <p className="text-xs text-gray-600 mt-1">Search for movies, shows, and more</p>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default React.memo(SearchResults);
