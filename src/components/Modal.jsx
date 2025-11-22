import { X, Play, Plus, Check, Calendar, Clock, Tv, Grid, List, Image as ImageIcon, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import axios from '../lib/axios';
import useListStore from '../store/useListStore';
import useAuthStore from '../store/useAuthStore';
import StreamingPlayer from './StreamingPlayer';
import CustomDropdown from './CustomDropdown';
import clsx from 'clsx';

const Modal = ({ movie, onClose }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('more');
    const [logoPath, setLogoPath] = useState(null);
    const [movieDetails, setMovieDetails] = useState(null);
    const [cast, setCast] = useState([]);
    const [similarMovies, setSimilarMovies] = useState([]);
    const [episodes, setEpisodes] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [trailerKey, setTrailerKey] = useState(null);
    const [showTrailer, setShowTrailer] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const dropdownRef = useRef(null);
    const hasOpenedRef = useRef(false);
    const { addMovie, removeMovie, isInList } = useListStore();
    const { user } = useAuthStore();
    const [playerState, setPlayerState] = useState({ isOpen: false, type: 'movie', season: 1, episode: 1 });
    const [displayedCount, setDisplayedCount] = useState(10);

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleListToggle = useCallback(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (isInList(movie.id)) {
            removeMovie(movie.id);
        } else {
            addMovie(movie);
        }
    }, [isInList, movie, removeMovie, addMovie, user, navigate]);

    const inList = useMemo(() => isInList(movie?.id), [isInList, movie?.id]);

    // Mark modal as opened (using ref to avoid re-renders)
    if (movie && !hasOpenedRef.current) {
        hasOpenedRef.current = true;
    }

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

    // Only fetch data when modal has been opened
    useEffect(() => {
        if (!hasOpenedRef.current || !movie?.id) return;

        const fetchLogo = async () => {
            try {
                const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
                const endpoint = movie.first_air_date
                    ? `/tv/${movie.id}/images?api_key=${API_KEY}`
                    : `/movie/${movie.id}/images?api_key=${API_KEY}`;

                const response = await axios.get(endpoint);
                const logos = response.data.logos;
                const englishLogo = logos?.find(logo => logo.iso_639_1 === 'en');
                const logo = englishLogo || logos?.[0];

                if (logo) {
                    setLogoPath(logo.file_path);
                }
            } catch (error) {
                console.log('Logo not available:', error.message);
            }
        };

        const fetchMovieDetails = async () => {
            try {
                const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
                const endpoint = movie.first_air_date
                    ? `/tv/${movie.id}?api_key=${API_KEY}`
                    : `/movie/${movie.id}?api_key=${API_KEY}`;

                const response = await axios.get(endpoint);
                setMovieDetails(response.data);
            } catch (error) {
                console.log('Details not available:', error.message);
            }
        };

        const fetchCast = async () => {
            try {
                const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
                const endpoint = movie.first_air_date
                    ? `/tv/${movie.id}/credits?api_key=${API_KEY}`
                    : `/movie/${movie.id}/credits?api_key=${API_KEY}`;

                const response = await axios.get(endpoint);
                setCast(response.data.cast?.slice(0, 4) || []);
            } catch (error) {
                console.log('Cast not available:', error.message);
            }
        };

        const fetchSimilarMovies = async () => {
            try {
                const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
                const endpoint = movie.first_air_date
                    ? `/tv/${movie.id}/similar?api_key=${API_KEY}`
                    : `/movie/${movie.id}/similar?api_key=${API_KEY}`;

                const response = await axios.get(endpoint);
                setSimilarMovies(response.data.results?.slice(0, 8) || []);
            } catch (error) {
                console.log('Similar content not available:', error.message);
            }
        };

        const fetchTrailer = async () => {
            try {
                const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
                const endpoint = movie.first_air_date
                    ? `/tv/${movie.id}/videos?api_key=${API_KEY}`
                    : `/movie/${movie.id}/videos?api_key=${API_KEY}`;

                const response = await axios.get(endpoint);
                const videos = response.data.results;

                const trailer = videos.find(video =>
                    video.type === 'Trailer' && video.site === 'YouTube'
                ) || videos.find(video => video.site === 'YouTube');

                if (trailer) {
                    setTrailerKey(trailer.key);
                }
            } catch (error) {
                console.log('Trailer not available:', error.message);
            }
        };

        fetchLogo();
        fetchMovieDetails();
        fetchCast();
        fetchSimilarMovies();
        fetchTrailer();
    }, [movie]);

    // Fetch episodes when season changes (only for TV shows)
    useEffect(() => {
        if (!hasOpenedRef.current) return;

        const fetchEpisodes = async () => {
            if (!movie?.id || !movie.first_air_date) return;

            try {
                const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
                const response = await axios.get(`/tv/${movie.id}/season/${selectedSeason}?api_key=${API_KEY}`);
                setEpisodes(response.data.episodes || []);
            } catch (error) {
                console.log('Episodes not available:', error.message);
                setEpisodes([]);
            }
        };

        fetchEpisodes();
    }, [movie, selectedSeason]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleTrailerOpen = useCallback(() => {
        setShowTrailer(true);
    }, []);

    const handleTrailerClose = useCallback(() => {
        setShowTrailer(false);
    }, []);

    if (!movie) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 md:p-4"
            style={{ willChange: 'opacity' }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 300,
                    duration: 0.4
                }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-7xl bg-[#181818] rounded-none md:rounded-4xl overflow-hidden shadow-2xl max-h-[100vh] md:max-h-[93vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ willChange: 'transform, opacity' }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 md:top-4 md:right-4 z-[100] bg-[#181818]/80 rounded-full p-2 md:p-2 hover:bg-[#2a2a2a] transition ring-1 ring-white/20"
                >
                    <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </button>

                <div className="relative h-[400px] md:h-[700px]">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#181818] via-transparent to-transparent z-10" />
                    <img
                        src={`https://image.tmdb.org/t/p/original/${movie.backdrop_path || movie.poster_path}`}
                        alt={movie.title || movie.name}
                        className="w-full h-full object-cover"
                    />

                    {/* Content Grid */}
                    <div className="absolute inset-0 z-20 p-4 md:p-12 flex flex-col justify-end">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:gap-6 items-end">
                            {/* Left Side - Title, Metadata, Buttons, Description */}
                            <div className="space-y-3 md:space-y-8">
                                <AnimatePresence mode="wait">
                                    {logoPath ? (
                                        <motion.img
                                            key="logo"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                            alt={movie.title || movie.name}
                                            className="max-w-[180px] md:max-w-sm max-h-16 md:max-h-24 object-contain drop-shadow-2xl"
                                        />
                                    ) : (
                                        <motion.h2
                                            key="title"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-2xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-2xl leading-tight"
                                        >
                                            {movie.title || movie.name}
                                        </motion.h2>
                                    )}
                                </AnimatePresence>

                                {/* Metadata Row */}
                                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-base flex-wrap">
                                    {movieDetails?.number_of_seasons && (
                                        <>
                                            <span className="flex items-center gap-1 text-gray-300">
                                                <span className="text-white font-semibold">
                                                    {movieDetails.number_of_seasons} {movieDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                                                </span>
                                            </span>
                                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                        </>
                                    )}
                                    {movieDetails?.status && (
                                        <>
                                            <span className="text-gray-300">{movieDetails.status}</span>
                                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                        </>
                                    )}
                                    {movieDetails?.runtime && (
                                        <>
                                            <span className="text-gray-300">
                                                {Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m
                                            </span>
                                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                        </>
                                    )}
                                    <span className="flex items-center gap-1 text-yellow-400">
                                        <span>★</span>
                                        <span className="font-semibold">{movie.vote_average?.toFixed(1) || '8.0'}</span>
                                    </span>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-2 md:gap-3 flex-wrap">
                                    {/* Watch Now button - Only for movies */}
                                    {!movie.first_air_date && (
                                        <button
                                            onClick={() => setPlayerState({ isOpen: true, type: 'movie', season: 1, episode: 1 })}
                                            className="flex items-center gap-1.5 md:gap-2 bg-white text-black px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base rounded-full hover:bg-white/90 transition"
                                        >
                                            <Play className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} /> <span className="hidden sm:inline">Watch Now</span><span className="sm:hidden">Play</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={handleTrailerOpen}
                                        disabled={!trailerKey}
                                        className="flex items-center gap-1.5 md:gap-2 bg-white/10 backdrop-blur-md text-white px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base rounded-full hover:bg-white/20 transition border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Play className="w-4 h-4 md:w-5 md:h-5" strokeWidth={1.5} /> <span className="hidden sm:inline">Trailer</span><span className="sm:hidden">Trailer</span>
                                    </button>
                                    <button
                                        onClick={handleListToggle}
                                        className="flex items-center gap-1.5 md:gap-2 bg-white/10 backdrop-blur-md text-white px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base rounded-full hover:bg-white/20 transition border border-white/20"
                                    >
                                        {inList ? (
                                            <>
                                                <Check className="w-4 h-4 md:w-5 md:h-5" strokeWidth={1.5} /> <span className="hidden sm:inline">In My List</span><span className="sm:hidden">Added</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">Add to List</span><span className="sm:hidden">Add</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Description */}
                                <p className="text-xs md:text-base text-gray-300 leading-relaxed max-w-3xl line-clamp-2 md:line-clamp-3">
                                    {movie.overview}
                                </p>
                            </div>

                            {/* Right Side - Genre Tags and Cast */}
                            <div className="hidden md:flex flex-col items-end gap-4">
                                {/* Genre Tags */}
                                {movieDetails?.genres && movieDetails.genres.length > 0 && (
                                    <div className="flex gap-2 flex-wrap justify-end">
                                        {movieDetails.genres.slice(0, 3).map((genre) => (
                                            <span
                                                key={genre.id}
                                                className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm text-white"
                                            >
                                                {genre.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Cast Avatars */}
                                {cast.length > 0 && (
                                    <div className="flex space-x-2">
                                        {cast.map((person) => (
                                            <div
                                                key={person.id}
                                                className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 border-2 border-[#181818] overflow-hidden"
                                                title={person.name}
                                            >
                                                {person.profile_path ? (
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                                                        alt={person.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                                                        {person.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Episodes Section - Between Hero and Tabs (TV Shows Only) */}
                {movie.first_air_date && (
                    <div className="px-4 md:px-12 py-4 md:py-8 bg-[#181818] border-b border-white/10">
                        {/* Season Selector & View Toggler */}
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                                <Tv className="w-4 h-4 md:w-5 md:h-5" /> Episodes
                            </h3>

                            <div className="flex items-center gap-2 md:gap-4">
                                {/* View Toggler */}
                                <div className="relative flex items-center bg-[#2a2a2a] rounded-full p-1 border border-white/10">
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

                                {movieDetails?.number_of_seasons && movieDetails.number_of_seasons > 1 && (
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
                                )}
                            </div>
                        </div>

                        {/* Episodes list with animation on season change */}
                        <motion.div
                            key={selectedSeason + viewMode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className={clsx(
                                viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4" : "space-y-3 md:space-y-4"
                            )}
                        >
                            {episodes.length > 0 ? (
                                episodes.slice(0, displayedCount).map((episode, index) => (
                                    viewMode === 'list' ? (
                                        // List View Item
                                        <div
                                            key={episode.id}
                                            onClick={() => setPlayerState({ isOpen: true, type: 'tv', season: selectedSeason, episode: episode.episode_number })}
                                            className={`flex gap-2 md:gap-4 p-3 md:p-4 py-4 md:py-6 mb-0 rounded-lg hover:bg-[#2a2a2a] transition cursor-pointer group ${index !== episodes.length - 1 ? 'border-b border-white/10' : ''}`}
                                        >
                                            {/* Episode Number */}
                                            <div className="hidden md:flex items-center justify-center flex-shrink-0 w-10 text-xl font-bold text-gray-500 group-hover:text-white transition">
                                                {index + 1}
                                            </div>

                                            {/* Episode Thumbnail */}
                                            <div className="flex-shrink-0 w-24 md:w-40 mr-2 md:mr-3 h-16 md:h-24 bg-gradient-to-br from-gray-700 to-gray-900 rounded overflow-hidden">
                                                {episode.still_path ? (
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                                                        alt={episode.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                        <ImageIcon className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Episode Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm md:text-base text-white font-semibold mb-1 md:mb-2 line-clamp-1">{episode.name}</h4>
                                                <p className="text-xs md:text-sm text-gray-400 line-clamp-2 mb-1 md:mb-2">{episode.overview || 'No description available.'}</p>
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
                                    ) : (
                                        // Grid View Item
                                        <div
                                            key={episode.id}
                                            onClick={() => setPlayerState({ isOpen: true, type: 'tv', season: selectedSeason, episode: episode.episode_number })}
                                            className="bg-black/20 rounded-xl overflow-hidden hover:ring-2 hover:ring-white/20 transition group cursor-pointer flex flex-col"
                                        >
                                            {/* Thumbnail */}
                                            <div className="relative aspect-video bg-gray-800">
                                                {episode.still_path ? (
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w500${episode.still_path}`}
                                                        alt={episode.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                        <ImageIcon className="w-10 h-10" />
                                                    </div>
                                                )}
                                                <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white font-medium">
                                                    {episode.runtime ? `${episode.runtime}m` : 'N/A'}
                                                </div>
                                                <div className="absolute top-2 left-2 bg-black/60 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold text-white border border-white/10">
                                                    {index + 1}
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="p-4 flex-1 flex flex-col">
                                                <h4 className="text-white font-semibold mb-2 line-clamp-1 transition-colors">
                                                    {episode.name}
                                                </h4>
                                                <p className="text-xs text-gray-400 line-clamp-3 mb-4 flex-1">
                                                    {episode.overview || 'No description available.'}
                                                </p>
                                                <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-white/5">
                                                    {episode.air_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(episode.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ))
                            ) : (
                                <div className="col-span-full text-center text-gray-400 py-8">
                                    No episodes available for this season
                                </div>
                            )}
                        </motion.div>
                        {displayedCount < episodes.length && (
                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={() => setDisplayedCount(prev => Math.min(prev + 10, episodes.length))}
                                    className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition"
                                >
                                    Show More ({episodes.length - displayedCount}/{episodes.length})
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Bottom Section - Tabbed Interface */}
                <div className="px-4 md:px-12 py-4 md:py-8 bg-[#181818]">
                    {/* Tab Buttons */}
                    <div className="flex gap-4 md:gap-6 border-b border-white/10 mb-4 md:mb-6">
                        <button
                            onClick={() => setActiveTab('more')}
                            className={`pb-2 md:pb-3 px-1 md:px-2 text-sm md:text-base font-semibold transition-colors relative ${activeTab === 'more'
                                ? 'text-white'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            More Like This
                            {activeTab === 'more' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E50914]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('about')}
                            className={`pb-2 md:pb-3 px-1 md:px-2 text-sm md:text-base font-semibold transition-colors relative ${activeTab === 'about'
                                ? 'text-white'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            About
                            {activeTab === 'about' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E50914]"></div>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                        {activeTab === 'about' ? (
                            /* About Section */
                            <div className="space-y-6 max-w-2xl">
                                {/* Cast & Crew */}
                                {cast.length > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">Cast</p>
                                        <p className="text-sm text-gray-300">
                                            {cast.map(person => person.name).join(', ')}
                                        </p>
                                    </div>
                                )}

                                {/* Genres */}
                                {movieDetails?.genres && movieDetails.genres.length > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">Genres</p>
                                        <p className="text-sm text-gray-300">
                                            {movieDetails.genres.map(genre => genre.name).join(', ')}
                                        </p>
                                    </div>
                                )}

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Maturity Rating</p>
                                        <p className="text-sm text-white font-semibold">
                                            {movie.adult ? '18+' : '13+'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Language</p>
                                        <p className="text-sm text-white font-semibold">
                                            {movie.original_language?.toUpperCase() || 'EN'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Release Year</p>
                                        <p className="text-sm text-white font-semibold">
                                            {movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4) || '2023'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Rating</p>
                                        <p className="text-sm text-white font-semibold flex items-center gap-1">
                                            <span className="text-yellow-400">★</span>
                                            {movie.vote_average?.toFixed(1) || '8.0'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* More Like This Section */
                            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                                {similarMovies.length > 0 ? (
                                    similarMovies.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                setActiveTab('about');
                                            }}
                                            className="group relative aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/50 transition"
                                        >
                                            {item.poster_path ? (
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                                                    alt={item.title || item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                                                    No Image
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="absolute bottom-3 left-3 right-3">
                                                    <p className="text-xs font-semibold text-white line-clamp-2">
                                                        {item.title || item.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-yellow-400">
                                                            ★ {item.vote_average?.toFixed(1) || 'N/A'}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4) || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center text-gray-400 py-8">
                                        No similar content available
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Trailer Modal */}
            <AnimatePresence>
                {showTrailer && trailerKey && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, pointerEvents: 'none' }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                        onClick={handleTrailerClose}
                        style={{ willChange: 'opacity' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-5xl aspect-video"
                            onClick={(e) => e.stopPropagation()}
                            style={{ willChange: 'transform, opacity' }}
                        >
                            {/* Close Button */}
                            <button
                                onClick={handleTrailerClose}
                                className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition z-10"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>

                            {/* YouTube Iframe */}
                            <iframe
                                className="w-full h-full rounded-lg"
                                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                                title="Trailer"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Streaming Player */}
            <AnimatePresence>
                {playerState.isOpen && (
                    <StreamingPlayer
                        movie={movie}
                        type={playerState.type}
                        season={playerState.season}
                        episode={playerState.episode}
                        onClose={() => setPlayerState({ ...playerState, isOpen: false })}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default memo(Modal);