import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
// import { useNavigate } from 'react-router-dom';
import requests from '../lib/requests';
import axios from '../lib/tmdb';
import { useRowData, useMovieImages, usePrefetchModalData } from '../hooks/useTMDB';
import { Play, Plus, Check } from 'lucide-react';
import useListStore from '../store/useListStore';
import useWatchHistoryStore from '../store/useWatchHistoryStore';
// import useAuthStore from '../store/useAuthStore';
import useBannerStore from '../store/useBannerStore';
import { AnimatePresence } from 'framer-motion';

const Banner = ({ onMovieClick, fetchUrl }) => {
    const [movie, setMovie] = useState(null);
    const [movieDetails, setMovieDetails] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [logoPath, setLogoPath] = useState(null);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const { addMovie, removeMovie, isInList } = useListStore();
    const { getHistoryItem } = useWatchHistoryStore();
    // const { user } = useAuthStore();
    const { bannerMovie, setBannerMovie } = useBannerStore();
    const { prefetchModalData } = usePrefetchModalData();
    const hoverTimeoutRef = useRef(null);


    const { data: movies } = useRowData(fetchUrl || requests.fetchNetflixOriginals, 'Banner');

    useEffect(() => {
        if (bannerMovie) {
            setMovie(bannerMovie); // eslint-disable-line react-hooks/set-state-in-effect
            setMovieDetails(null);
            setLogoPath(null);
            setLogoLoaded(false);
        } else if (movies && movies.length > 0) {
            const selectedMovie = movies[Math.floor(Math.random() * movies.length)];
            setMovie(selectedMovie);
            setBannerMovie(selectedMovie);
            setMovieDetails(null);
            setLogoPath(null);
            setLogoLoaded(false);
        }
    }, [movies, bannerMovie, setBannerMovie]);

    const { data: images } = useMovieImages(movie?.id, movie?.first_air_date ? 'tv' : 'movie');

    useEffect(() => {
        if (images?.logos) {
            const logos = images.logos;
            const englishLogo = logos.find(logo => logo.iso_639_1 === 'en');
            const logo = englishLogo || logos[0];
            setLogoPath(logo ? logo.file_path : null); // eslint-disable-line react-hooks/set-state-in-effect
            setLogoLoaded(false);
        } else {
            setLogoPath(null);
        }
    }, [images]);

    useEffect(() => {
        if (!movie?.id) return;

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
    }, [movie]);

    function truncate(str, n) {
        return str?.length > n ? str.substr(0, n - 1) + "..." : str;
    }

    const handleListToggle = () => {
        if (isInList(movie.id)) {
            removeMovie(movie.id);
        } else {
            addMovie(movie);
        }
    };

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

    const inList = isInList(movie?.id);

    // Don't render until we have movie data
    if (!movie?.id) {
        return (
            <header className="relative h-[45vh] md:h-[80vh] bg-gray-900 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
            </header>
        );
    }

    return (
        <>
            <header
                className="relative h-[45vh] md:h-[80vh] text-white overflow-hidden"
            >
                <img
                    src={`https://image.tmdb.org/t/p/w1280${movie?.backdrop_path || movie?.poster_path}`}
                    srcSet={`https://image.tmdb.org/t/p/w1280${movie?.backdrop_path || movie?.poster_path} 1280w, https://image.tmdb.org/t/p/original${movie?.backdrop_path || movie?.poster_path} 1921w`}
                    sizes="100vw"
                    alt="Banner Background"
                    className="absolute inset-0 w-full h-full object-cover object-center md:object-[center_10%]"
                    fetchPriority="high"
                    loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

                <div className="relative pt-[120px] md:pt-[250px] px-4 md:px-12 h-full flex flex-col justify-center">
                    {logoPath && logoLoaded ? (
                        <div className="flex items-end mb-6">
                            <img
                                src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                alt={movie?.title || movie?.name}
                                onLoad={() => setLogoLoaded(true)}
                                loading="eager"
                                decoding="async"
                                width="500"
                                height="200"
                                className="w-auto max-h-32 max-w-md object-contain drop-shadow-2xl origin-left"
                            />
                        </div>
                    ) : logoPath && !logoLoaded ? (
                        // Hidden image to preload
                        <>
                            <img
                                src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                alt={movie?.title || movie?.name}
                                onLoad={() => setLogoLoaded(true)}
                                loading="eager"
                                decoding="async"
                                width="500"
                                height="200"
                                className="hidden"
                            />
                            <h1 className="text-3xl md:text-6xl font-bold pb-3 max-w-2xl drop-shadow-lg">
                                {movie?.title || movie?.name || movie?.original_name || 'Featured Content'}
                            </h1>
                        </>
                    ) : (
                        <h1 className="text-3xl md:text-6xl font-bold pb-3 max-w-2xl drop-shadow-lg">
                            {movie?.title || movie?.name || movie?.original_name || 'Featured Content'}
                        </h1>
                    )}

                    <div className="flex items-center gap-3 text-base md:text-lg text-gray-300 mb-6 font-medium drop-shadow-md flex-wrap">
                        <span className="text-[#46d369] font-bold tracking-wide">{movie.vote_average ? `${(movie.vote_average * 10).toFixed(0)}% Match` : 'New'}</span>
                        <span className="text-gray-500 text-xs">•</span>
                        <span className="text-white">{movie.first_air_date?.substring(0, 4) || movie.release_date?.substring(0, 4)}</span>
                        <span className="text-gray-500 text-xs">•</span>
                        <span className="bg-[#333]/80 px-2 py-0.5 rounded-full text-sm text-white border border-white/40">{movie.adult ? '18+' : '13+'}</span>
                        <span className="text-gray-500 text-xs">•</span>
                        {movieDetails?.number_of_seasons ? (
                            <span className="text-white">{movieDetails.number_of_seasons} {movieDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}</span>
                        ) : movieDetails?.runtime ? (
                            <span className="text-white">{Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m</span>
                        ) : null}
                        {movieDetails?.genres?.[0] && (
                            <>
                                <span className="text-gray-500 text-xs">•</span>
                                <span className="text-white">{movieDetails.genres[0].name}</span>
                            </>
                        )}
                    </div>

                    <h1 className="w-full md:max-w-2xl text-xs md:text-lg font-medium drop-shadow-md mb-4 md:mb-8 line-clamp-2 md:line-clamp-4 text-gray-200">
                        {truncate(movie?.overview || 'Discover amazing content.', window.innerWidth < 768 ? 100 : 150)}
                    </h1>

                    <div className="flex gap-2 md:gap-4">
                        <button
                            onClick={() => onMovieClick(movie)}
                            onMouseEnter={handleButtonHover}
                            onMouseLeave={handleButtonLeave}
                            className="flex items-center gap-2 md:gap-3 cursor-pointer text-black outline-none border-none font-bold rounded-full px-4 md:px-8 py-2.5 md:py-4 text-sm md:text-base bg-white transition duration-300 shadow-lg hover:scale-105 active:scale-95"
                        >
                            <Play className="w-4 h-4 md:w-5 md:h-5 fill-black" />
                            <span className="hidden sm:inline">{getHistoryItem(movie.id) ? 'Resume' : 'Watch Now'}</span>
                            <span className="sm:hidden">{getHistoryItem(movie.id) ? 'Resume' : 'Play'}</span>
                        </button>
                        <button
                            onClick={handleListToggle}
                            className="flex items-center gap-2 md:gap-3 cursor-pointer text-white outline-none border border-white/10 font-bold rounded-full px-4 md:px-8 py-2.5 md:py-4 text-sm md:text-base bg-white/10 hover:bg-white/20 hover:border-white/20 transition duration-300 shadow-lg hover:scale-105 active:scale-95 border border-white/20 backdrop-blur-md"
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
};

Banner.propTypes = {
    onMovieClick: PropTypes.func.isRequired,
    fetchUrl: PropTypes.string
};

export default Banner;
