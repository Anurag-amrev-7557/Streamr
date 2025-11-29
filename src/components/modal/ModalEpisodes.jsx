import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Tv, List, Grid, Calendar, Clock, Image as ImageIcon, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import clsx from 'clsx';
import CustomDropdown from '../CustomDropdown';
import ImageWithPlaceholder from '../ImageWithPlaceholder';

// --- Sub-Components ---

const EpisodeListItem = memo(({ episode, index, onPlay, isLast }) => (
    <div
        onClick={() => onPlay(episode)}
        className={clsx(
            "flex gap-2 md:gap-4 px-0 py-4 md:p-4 md:py-6 mb-0 hover:bg-white/7 transition duration-500 ease-out cursor-pointer group",
            !isLast && "border-b border-white/10"
        )}
    >
        {/* Episode Number */}
        <div className="hidden md:flex items-center justify-center flex-shrink-0 w-10 text-xl font-bold text-gray-500 transition">
            {index + 1}
        </div>

        {/* Episode Thumbnail */}
        <div className="flex-shrink-0 w-32 md:w-40 mr-2 md:mr-3 h-20 md:h-24 bg-gradient-to-br from-gray-700 to-gray-900 rounded overflow-hidden relative">
            {episode.still_path ? (
                <ImageWithPlaceholder
                    src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                    placeholderSrc={`https://image.tmdb.org/t/p/w92${episode.still_path}`}
                    alt={episode.name}
                    className="w-full h-full"
                    imgClassName="object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <ImageIcon className="w-8 h-8" />
                </div>
            )}
        </div>

        {/* Episode Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <h4 className="text-sm md:text-base text-white font-semibold line-clamp-1">{episode.name}</h4>
            <p className="text-xs md:text-sm text-gray-400 line-clamp-1 md:line-clamp-2">{episode.overview || 'No description available.'}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
                {episode.air_date && (
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(episode.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                )}
                {episode.runtime && (
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {episode.runtime}m
                    </span>
                )}
            </div>
        </div>
    </div>
));

const EpisodeGridItem = memo(({ episode, index, onPlay }) => (
    <div
        onClick={() => onPlay(episode)}
        className="w-full bg-[#1a1a1a] rounded-xl overflow-hidden hover:ring-2 hover:ring-white/20 transition group cursor-pointer flex flex-col"
    >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-800">
            {episode.still_path ? (
                <ImageWithPlaceholder
                    src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                    placeholderSrc={`https://image.tmdb.org/t/p/w92${episode.still_path}`}
                    alt={episode.name}
                    className="w-full h-full"
                    imgClassName="object-cover object-center"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <ImageIcon className="w-10 h-10" />
                </div>
            )}

            {/* Episode Number Badge */}
            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-white border border-white/20">
                EP {index + 1}
            </div>

            {/* Runtime Badge */}
            {episode.runtime && (
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white font-medium">
                    {episode.runtime}m
                </div>
            )}
        </div>

        {/* Episode Info Below Image */}
        <div className="p-3 flex-1 flex flex-col gap-1">
            <h4 className="text-white font-semibold text-sm line-clamp-2 leading-tight">
                {episode.name}
            </h4>
            {episode.overview && (
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {episode.overview}
                </p>
            )}
        </div>
    </div>
));

const EpisodeSkeleton = ({ viewMode }) => (
    <div className={clsx(
        viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 pb-4" : "space-y-3 md:space-y-4"
    )}>
        {Array.from({ length: 6 }).map((_, i) => (
            viewMode === 'list' ? (
                <div key={i} className="flex gap-2 md:gap-4 px-0 py-4 md:p-4 md:py-6 mb-0 rounded-lg animate-pulse border-b border-white/5">
                    <div className="hidden md:flex items-center justify-center flex-shrink-0 w-10">
                        <div className="w-6 h-6 bg-white/10 rounded-full"></div>
                    </div>
                    <div className="flex-shrink-0 w-32 md:w-40 mr-2 md:mr-3 h-20 md:h-24 bg-white/10 rounded"></div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                        <div className="h-5 bg-white/10 rounded w-1/3"></div>
                        <div className="h-3 bg-white/10 rounded w-full"></div>
                        <div className="hidden md:block h-3 bg-white/10 rounded w-2/3"></div>
                        <div className="flex gap-3">
                            <div className="h-3 bg-white/10 rounded w-20"></div>
                            <div className="h-3 bg-white/10 rounded w-16"></div>
                        </div>
                    </div>
                </div>
            ) : (
                <div key={i} className="w-full bg-[#1a1a1a] rounded-xl overflow-hidden animate-pulse flex flex-col">
                    <div className="relative aspect-video bg-white/5">
                        <div className="absolute top-2 left-2 w-12 h-6 bg-white/10 rounded-md"></div>
                        <div className="absolute top-2 right-2 w-10 h-6 bg-white/10 rounded-md"></div>
                    </div>
                    <div className="p-3 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-3/4"></div>
                        <div className="h-3 bg-white/10 rounded w-full"></div>
                        <div className="h-3 bg-white/10 rounded w-5/6"></div>
                    </div>
                </div>
            )
        ))}
    </div>
);

const ViewToggler = ({ viewMode, setViewMode }) => (
    <div className="relative flex items-center bg-white/5 rounded-full p-1 border border-white/10">
        <div
            className={clsx(
                "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-all duration-300 ease-in-out",
                viewMode === 'list' ? "left-1" : "left-[calc(50%+1px)]"
            )}
        ></div>
        <button
            onClick={() => setViewMode('list')}
            className={clsx(
                "relative z-10 p-1.5 rounded-md w-8 h-8 flex items-center justify-center transition-colors",
                viewMode === 'list' ? "text-black" : "text-gray-400 hover:text-white"
            )}
            title="List View"
        >
            <List className="w-4 h-4" />
        </button>
        <button
            onClick={() => setViewMode('grid')}
            className={clsx(
                "relative z-10 p-1.5 rounded-md w-8 h-8 flex items-center justify-center transition-colors",
                viewMode === 'grid' ? "text-black" : "text-gray-400 hover:text-white"
            )}
            title="Grid View"
        >
            <Grid className="w-4 h-4" />
        </button>
    </div>
);

const SeasonSelector = ({ movieDetails, selectedSeason, setSelectedSeason, isDropdownOpen, setIsDropdownOpen, dropdownRef }) => {
    if (!movieDetails?.number_of_seasons || movieDetails.number_of_seasons <= 1) return null;

    return (
        <div ref={dropdownRef}>
            <CustomDropdown
                value={selectedSeason}
                options={Array.from({ length: movieDetails.number_of_seasons }, (_, i) => ({
                    value: i + 1,
                    label: `Season ${i + 1}`
                }))}
                onChange={setSelectedSeason}
                isOpen={isDropdownOpen}
                setIsOpen={setIsDropdownOpen}
                buttonClassName="bg-[#2a2a2a] text-white px-4 py-2 rounded-full border border-white/20 hover:border-white/40"
                menuClassName="min-w-[140px]"
                renderValue={(val) => `Season ${val}`}
            />
        </div>
    );
};

const LoadMore = ({ displayedCount, totalEpisodes, onLoadMore }) => {
    if (displayedCount >= totalEpisodes) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex flex-col items-center gap-3 mt-6"
        >
            {/* Progress Indicator */}
            <div className="w-full max-w-xs">
                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs text-gray-400">
                        Showing {displayedCount} of {totalEpisodes} episodes
                    </span>
                    <span className="text-xs text-gray-400">
                        {Math.round((displayedCount / totalEpisodes) * 100)}%
                    </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(displayedCount / totalEpisodes) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#fff] to-[#2a2a2a] rounded-full"
                    />
                </div>
            </div>

            {/* Show More Button */}
            <motion.button
                onClick={onLoadMore}
                whileTap={{ scale: 0.95 }}
                className="group relative px-8 py-3 bg-gradient-to-r from-white/10 to-white/5 text-white rounded-full hover:from-white/20 hover:to-white/10 transition-all duration-300 border border-white/20 hover:border-white/20 shadow-lg hover:shadow-xl overflow-hidden"
            >
                <div className="relative flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    <span className="font-semibold text-sm">
                        Load More Episodes
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        +{Math.min(10, totalEpisodes - displayedCount)}
                    </span>
                </div>
            </motion.button>
        </motion.div>
    );
};

// --- Main Component ---

const ModalEpisodes = ({
    movie,
    isMobile,
    activeTab,
    movieDetails,
    selectedSeason,
    setSelectedSeason,
    episodes,
    isEpisodesLoading,
    isEpisodesError,
    onRetryEpisodes,
    addToHistory,
    setPlayerState
}) => {
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [displayedCount, setDisplayedCount] = useState(6);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Reset displayed count when season changes
    useEffect(() => {
        setDisplayedCount(6); // eslint-disable-line react-hooks/set-state-in-effect
    }, [selectedSeason]);

    const handlePlay = useCallback((episode) => {
        addToHistory(movie, { season: selectedSeason, episode: episode.episode_number });
        setPlayerState({ isOpen: true, type: 'tv', season: selectedSeason, episode: episode.episode_number });
    }, [addToHistory, movie, selectedSeason, setPlayerState]);

    if (!movie.first_air_date) return null;

    return (
        <div className={clsx(
            "px-4 md:px-12 py-4 md:py-8 bg-[#101010] border-b border-white/10",
            isMobile ? (activeTab === 'seasons' ? "min-h-[100vh]" : "hidden") : ""
        )}>
            {/* Season Selector & View Toggler */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-4 md:gap-0">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <Tv className="w-4 h-4 md:w-5 md:h-5" /> Episodes
                </h3>

                <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 md:gap-4">
                    <ViewToggler viewMode={viewMode} setViewMode={setViewMode} />

                    <SeasonSelector
                        movieDetails={movieDetails}
                        selectedSeason={selectedSeason}
                        setSelectedSeason={setSelectedSeason}
                        isDropdownOpen={isDropdownOpen}
                        setIsDropdownOpen={setIsDropdownOpen}
                        dropdownRef={dropdownRef}
                    />
                </div>
            </div>

            {/* Episodes list with animation on season change */}
            <div className="relative pb-20 md:pb-0">
                {isEpisodesLoading ? (
                    <EpisodeSkeleton viewMode={viewMode} />
                ) : isEpisodesError ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <AlertCircle className="w-12 h-12 text-red-400" />
                        <div className="text-center">
                            <p className="text-gray-300 font-semibold mb-1">Failed to load episodes</p>
                            <p className="text-sm text-gray-500">Please check your connection and try again</p>
                        </div>
                        {onRetryEpisodes && (
                            <button
                                onClick={onRetryEpisodes}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition border border-white/20 hover:border-white/30"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retry
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        key={selectedSeason}
                        className={clsx(
                            viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 pb-4" : "space-y-3 md:space-y-4"
                        )}
                    >
                        {episodes.length > 0 ? (
                            episodes.slice(0, displayedCount).map((episode, index) => (
                                viewMode === 'list' ? (
                                    <EpisodeListItem
                                        key={`${episode.id}-${index}`}
                                        episode={episode}
                                        index={index}
                                        isLast={index === Math.min(episodes.length, displayedCount) - 1}
                                        onPlay={handlePlay}
                                    />
                                ) : (
                                    <EpisodeGridItem
                                        key={`${episode.id}-${index}`}
                                        episode={episode}
                                        index={index}
                                        onPlay={handlePlay}
                                    />
                                )
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <Tv className="w-8 h-8 text-gray-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-1">No Episodes Found</h3>
                                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                                    We couldn't find any episodes for this season. Please check back later.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <LoadMore
                    displayedCount={displayedCount}
                    totalEpisodes={episodes.length}
                    onLoadMore={() => setDisplayedCount(prev => Math.min(prev + 10, episodes.length))}
                />
            </div>
        </div>
    );
};

export default ModalEpisodes;
