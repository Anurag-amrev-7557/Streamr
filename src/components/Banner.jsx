import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import requests from '../lib/requests';
import axios from '../lib/tmdb';
import { useRowData, useMovieImages, usePrefetchModalData } from '../hooks/useTMDB';
import { Play, Plus, Check } from 'lucide-react';
import useListStore from '../store/useListStore';
import useWatchHistoryStore from '../store/useWatchHistoryStore';
import useBannerStore from '../store/useBannerStore';
import { AnimatePresence } from 'framer-motion';
import StreamingPlayer from './StreamingPlayer';

// --- Sub-components ---

const BannerBackground = memo(({ backdropPath, posterPath }) => {
    if (!backdropPath && !posterPath) return null;

    const imagePath = backdropPath || posterPath;

    return (
        <>
            <img
                src={`https://image.tmdb.org/t/p/w1280${imagePath}`}
                srcSet={`https://image.tmdb.org/t/p/w1280${imagePath} 1280w, https://image.tmdb.org/t/p/original${imagePath} 1921w`}
                sizes="100vw"
                alt="Banner Background"
                className="absolute inset-0 w-full h-full object-cover object-center md:object-[center_10%]"
                fetchPriority="high"
                loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </>
    );
});

BannerBackground.propTypes = {
    backdropPath: PropTypes.string,
    posterPath: PropTypes.string
};

BannerBackground.displayName = 'BannerBackground';

const BannerLogo = memo(({ logoPath, title }) => {
    const [logoLoaded, setLogoLoaded] = useState(false);

    // Reset logo loaded state is handled by key prop on component mount
    // useEffect(() => {
    //    setLogoLoaded(false);
    // }, [logoPath]);

    if (!logoPath) {
        return (
            <h1 className="text-3xl md:text-5xl lg:text-5xl xl:text-5xl 2xl:text-6xl font-bold pb-3 max-w-xl lg:max-w-xl xl:max-w-xl 2xl:max-w-2xl drop-shadow-lg">
                {title || 'Featured Content'}
            </h1>
        );
    }

    return (
        <>
            {/* Always render the image to trigger loading, but hide it until loaded if we want a smooth transition. 
                However, for LCP it's often better to just show it. 
                The original code had a complex swap logic. We'll simplify but keep the fade-in intent if needed.
                For now, we'll just render it and let the browser handle it, 
                but we can use the state to control the fallback title visibility if we want to avoid layout shift.
            */}
            <div className={`flex items-end mb-6 transition-opacity duration-500 ${logoLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}>
                <img
                    src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                    alt={title}
                    onLoad={() => setLogoLoaded(true)}
                    loading="eager"
                    decoding="async"
                    width="500"
                    height="200"
                    className="w-auto max-h-24 lg:max-h-28 xl:max-h-28 2xl:max-h-32 max-w-xs lg:max-w-sm xl:max-w-sm 2xl:max-w-md object-contain drop-shadow-2xl origin-left"
                />
            </div>

            {/* Show title while logo is loading */}
            {!logoLoaded && (
                <h1 className="text-3xl md:text-5xl lg:text-5xl xl:text-5xl 2xl:text-6xl font-bold pb-3 max-w-xl lg:max-w-xl xl:max-w-xl 2xl:max-w-2xl drop-shadow-lg">
                    {title || 'Featured Content'}
                </h1>
            )}
        </>
    );
});

BannerLogo.propTypes = {
    logoPath: PropTypes.string,
    title: PropTypes.string
};

BannerLogo.displayName = 'BannerLogo';

const BannerContent = memo(({ movie, movieDetails, onPlay, onToggleList, inList, isResuming }) => {
    // CSS line-clamp is used instead of JS truncation for performance

    return (
        <div className="relative pt-[120px] md:pt-[200px] lg:pt-[180px] xl:pt-[180px] 2xl:pt-[250px] px-4 md:px-8 lg:px-10 xl:px-10 2xl:px-12 h-full flex flex-col justify-center">
            {/* Logo or Title is passed as children or handled by parent? 
                Actually, let's keep it here or pass it in. 
                To avoid prop drilling too much, let's pass the logo component as a child or just render it here if we pass the props.
                But wait, BannerLogo needs its own state. 
                Let's make BannerContent accept the Logo component slot or just render it.
                We'll render it here.
            */}

            <div className="flex items-center gap-3 text-sm md:text-base lg:text-base xl:text-base 2xl:text-lg text-gray-300 mb-4 lg:mb-5 xl:mb-5 2xl:mb-6 font-medium drop-shadow-md flex-wrap">
                <span className="text-[#46d369] font-bold tracking-wide">
                    {movie.vote_average ? `${(movie.vote_average * 10).toFixed(0)}% Match` : 'New'}
                </span>
                <span className="text-gray-500 text-xs">•</span>
                <span className="text-white">
                    {movie.first_air_date?.substring(0, 4) || movie.release_date?.substring(0, 4)}
                </span>
                <span className="text-gray-500 text-xs">•</span>
                <span className="bg-[#333]/80 px-2 py-0.5 rounded-full text-sm text-white border border-white/40">
                    {movie.adult ? '18+' : '13+'}
                </span>
                <span className="text-gray-500 text-xs">•</span>
                {movieDetails?.number_of_seasons ? (
                    <span className="text-white">
                        {movieDetails.number_of_seasons} {movieDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                    </span>
                ) : movieDetails?.runtime ? (
                    <span className="text-white">
                        {Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m
                    </span>
                ) : null}
                {movieDetails?.genres?.[0] && (
                    <>
                        <span className="text-gray-500 text-xs">•</span>
                        <span className="text-white">{movieDetails.genres[0].name}</span>
                    </>
                )}
            </div>

            <h1 className="w-full md:max-w-xl lg:max-w-xl xl:max-w-xl 2xl:max-w-2xl text-xs md:text-base lg:text-base xl:text-base 2xl:text-lg font-medium drop-shadow-md mb-4 md:mb-6 lg:mb-6 xl:mb-6 2xl:mb-8 line-clamp-2 md:line-clamp-3 lg:line-clamp-2 text-gray-200">
                {movie?.overview || 'Discover amazing content.'}
            </h1>

            <div className="flex gap-2 md:gap-4">
                <button
                    onClick={onPlay}
                    className="flex items-center gap-2 md:gap-2 lg:gap-2 xl:gap-2 2xl:gap-3 cursor-pointer text-black outline-none border-none font-bold rounded-full px-4 md:px-6 lg:px-6 xl:px-6 2xl:px-8 py-2.5 md:py-3 lg:py-3 xl:py-3 2xl:py-4 text-sm md:text-sm lg:text-sm xl:text-sm 2xl:text-base bg-white transition duration-300 shadow-lg hover:scale-105 active:scale-95"
                >
                    <Play className="w-4 h-4 md:w-5 md:h-5 fill-black" />
                    <span className="hidden sm:inline">{isResuming ? 'Resume' : 'Watch Now'}</span>
                    <span className="sm:hidden">{isResuming ? 'Resume' : 'Play'}</span>
                </button>
                <button
                    onClick={onToggleList}
                    className="flex items-center gap-2 md:gap-2 lg:gap-2 xl:gap-2 2xl:gap-3 cursor-pointer text-white outline-none border border-white/10 font-bold rounded-full px-4 md:px-6 lg:px-6 xl:px-6 2xl:px-8 py-2.5 md:py-3 lg:py-3 xl:py-3 2xl:py-4 text-sm md:text-sm lg:text-sm xl:text-sm 2xl:text-base bg-white/10 hover:bg-white/20 hover:border-white/20 transition duration-300 shadow-lg hover:scale-105 active:scale-95 border border-white/20"
                >
                    {inList ? (
                        <>
                            <Check className="w-4 h-4 md:w-6 md:h-6" /> <span className="hidden sm:inline">In My List</span><span className="sm:hidden">Added</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4 md:w-6 md:h-6" /> <span className="hidden sm:inline">Add to List</span><span className="sm:hidden">Add</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
});

BannerContent.propTypes = {
    movie: PropTypes.object.isRequired,
    movieDetails: PropTypes.object,
    onPlay: PropTypes.func.isRequired,
    onToggleList: PropTypes.func.isRequired,
    inList: PropTypes.bool.isRequired,
    isResuming: PropTypes.bool.isRequired
};

BannerContent.displayName = 'BannerContent';


// --- Inner Component (Manages per-movie state) ---

const BannerInner = memo(({ movie, onMovieClick }) => {
    const [movieDetails, setMovieDetails] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);

    // Store actions
    const { addMovie, removeMovie, isInList } = useListStore();
    const { getHistoryItem } = useWatchHistoryStore();
    const { prefetchModalData } = usePrefetchModalData();

    // Refs
    const hoverTimeoutRef = useRef(null);

    // Fetch Images (Logos)
    const { data: images } = useMovieImages(movie.id, movie.first_air_date ? 'tv' : 'movie');

    const logoPath = useMemo(() => {
        if (!images?.logos) return null;
        const logos = images.logos;
        const englishLogo = logos.find(logo => logo.iso_639_1 === 'en');
        return (englishLogo || logos[0])?.file_path || null;
    }, [images]);

    // Fetch Details
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const type = movie.first_air_date ? 'tv' : 'movie';
                const { data } = await axios.get(`/${type}/${movie.id}`);
                setMovieDetails(data);
            } catch (error) {
                console.error('Error fetching details:', error);
            }
        };

        fetchDetails();
    }, [movie.id, movie.first_air_date]);

    // Handlers
    const handleListToggle = useCallback(() => {
        if (isInList(movie.id)) {
            removeMovie(movie.id);
        } else {
            addMovie(movie);
        }
    }, [movie, isInList, removeMovie, addMovie]);

    const handlePlay = useCallback(() => {
        onMovieClick(movie);
    }, [movie, onMovieClick]);

    const handleButtonHover = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => {
            prefetchModalData(movie);
        }, 200);
    }, [movie, prefetchModalData]);

    const handleButtonLeave = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    }, []);

    const inList = useMemo(() => isInList(movie.id), [isInList, movie.id]);
    const isResuming = useMemo(() => !!getHistoryItem(movie.id), [getHistoryItem, movie.id]);

    return (
        <>
            <header className="relative h-[45vh] md:h-[80vh] text-white overflow-hidden">
                <BannerBackground
                    backdropPath={movie.backdrop_path}
                    posterPath={movie.poster_path}
                />

                <div className="relative h-full">
                    <div className="relative pt-[120px] md:pt-[200px] lg:pt-[180px] xl:pt-[180px] 2xl:pt-[250px] px-4 md:px-8 lg:px-10 xl:px-10 2xl:px-12 h-full flex flex-col justify-center">
                        <BannerLogo
                            key={logoPath}
                            logoPath={logoPath}
                            title={movie.title || movie.name || movie.original_name}
                        />

                        <div className="flex items-center gap-3 text-sm md:text-base lg:text-base xl:text-base 2xl:text-lg text-gray-300 mb-4 lg:mb-5 xl:mb-5 2xl:mb-6 font-medium drop-shadow-md flex-wrap">
                            <span className="text-[#46d369] font-bold tracking-wide">
                                {movie.vote_average ? `${(movie.vote_average * 10).toFixed(0)}% Match` : 'New'}
                            </span>
                            <span className="text-gray-500 text-xs">•</span>
                            <span className="text-white">
                                {movie.first_air_date?.substring(0, 4) || movie.release_date?.substring(0, 4)}
                            </span>
                            <span className="text-gray-500 text-xs">•</span>
                            <span className="bg-[#333]/80 px-2 py-0.5 rounded-full text-sm text-white border border-white/40">
                                {movie.adult ? '18+' : '13+'}
                            </span>
                            <span className="text-gray-500 text-xs">•</span>
                            {movieDetails?.number_of_seasons ? (
                                <span className="text-white">
                                    {movieDetails.number_of_seasons} {movieDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                                </span>
                            ) : movieDetails?.runtime ? (
                                <span className="text-white">
                                    {Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m
                                </span>
                            ) : null}
                            {movieDetails?.genres?.[0] && (
                                <>
                                    <span className="text-gray-500 text-xs">•</span>
                                    <span className="text-white">{movieDetails.genres[0].name}</span>
                                </>
                            )}
                        </div>

                        <h1 className="w-full md:max-w-xl lg:max-w-xl xl:max-w-xl 2xl:max-w-2xl text-xs md:text-base lg:text-base xl:text-base 2xl:text-lg font-medium drop-shadow-md mb-4 md:mb-6 lg:mb-6 xl:mb-6 2xl:mb-8 line-clamp-2 md:line-clamp-3 lg:line-clamp-2 text-gray-200">
                            {movie?.overview || 'Discover amazing content.'}
                        </h1>

                        <div className="flex gap-2 md:gap-4">
                            <button
                                onClick={handlePlay}
                                onMouseEnter={handleButtonHover}
                                onMouseLeave={handleButtonLeave}
                                className="flex items-center gap-2 md:gap-2 lg:gap-2 xl:gap-2 2xl:gap-3 cursor-pointer text-black outline-none border-none font-bold rounded-full px-4 md:px-6 lg:px-6 xl:px-6 2xl:px-8 py-2.5 md:py-3 lg:py-3 xl:py-3 2xl:py-4 text-sm md:text-sm lg:text-sm xl:text-sm 2xl:text-base bg-white transition duration-300 shadow-lg hover:scale-105 active:scale-95"
                            >
                                <Play className="w-4 h-4 md:w-5 md:h-5 fill-black" />
                                <span className="hidden sm:inline">{isResuming ? 'Resume' : 'Watch Now'}</span>
                                <span className="sm:hidden">{isResuming ? 'Resume' : 'Play'}</span>
                            </button>
                            <button
                                onClick={handleListToggle}
                                className="flex items-center gap-2 md:gap-2 lg:gap-2 xl:gap-2 2xl:gap-3 cursor-pointer text-white outline-none border border-white/10 font-bold rounded-full px-4 md:px-6 lg:px-6 xl:px-6 2xl:px-8 py-2.5 md:py-3 lg:py-3 xl:py-3 2xl:py-4 text-sm md:text-sm lg:text-sm xl:text-sm 2xl:text-base bg-white/10 hover:bg-white/20 hover:border-white/20 transition duration-300 shadow-lg hover:scale-105 active:scale-95 border border-white/20"
                            >
                                {inList ? (
                                    <>
                                        <Check className="w-4 h-4 md:w-6 md:h-6" /> <span className="hidden sm:inline">In My List</span><span className="sm:hidden">Added</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 md:w-6 md:h-6" /> <span className="hidden sm:inline">Add to List</span><span className="sm:hidden">Add</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {showPlayer && (
                    <StreamingPlayer
                        movie={movie}
                        type={movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie'}
                        onClose={() => setShowPlayer(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
});

BannerInner.propTypes = {
    movie: PropTypes.object.isRequired,
    onMovieClick: PropTypes.func.isRequired
};

BannerInner.displayName = 'BannerInner';

// --- Main Component ---

const Banner = ({ onMovieClick, fetchUrl }) => {
    const { bannerMovie, setBannerMovie } = useBannerStore();
    const { data: movies } = useRowData(fetchUrl || requests.fetchNetflixOriginals, 'Banner');

    // Effect to initialize bannerMovie if it's not set
    useEffect(() => {
        if (!bannerMovie && movies && movies.length > 0) {
            const selectedMovie = movies[Math.floor(Math.random() * movies.length)];
            setBannerMovie(selectedMovie);
        }
    }, [movies, bannerMovie, setBannerMovie]);

    const displayMovie = bannerMovie;

    if (!displayMovie?.id) {
        return (
            <header className="relative h-[45vh] md:h-[80vh] bg-gray-900 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
            </header>
        );
    }

    // Key forces remount when movie changes, resetting all internal state (movieDetails, etc.)
    return (
        <BannerInner
            key={displayMovie.id}
            movie={displayMovie}
            onMovieClick={onMovieClick}
        />
    );
};

Banner.propTypes = {
    onMovieClick: PropTypes.func.isRequired,
    fetchUrl: PropTypes.string
};

export default Banner;
