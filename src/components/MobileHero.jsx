import { useState, useEffect, useCallback, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
import { useNetflixOriginals, useMovieImages, usePrefetchModalData } from '../hooks/useTMDB';
import axios from '../lib/tmdb';
import { Play, Plus, Check } from 'lucide-react';
import useListStore from '../store/useListStore';
import useWatchHistoryStore from '../store/useWatchHistoryStore';
// import useAuthStore from '../store/useAuthStore';
import StreamingPlayer from './StreamingPlayer';
import { AnimatePresence } from 'framer-motion';
import useBannerStore from '../store/useBannerStore';

const MobileHero = ({ onMovieClick }) => {
    const [movie, setMovie] = useState(null);
    const [movieDetails, setMovieDetails] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [logoPath, setLogoPath] = useState(null);
    const [posterPath, setPosterPath] = useState(null); // eslint-disable-line no-unused-vars
    const [logoLoaded, setLogoLoaded] = useState(false);
    const { addMovie, removeMovie, isInList } = useListStore();
    // const { user } = useAuthStore();
    const { getHistoryItem } = useWatchHistoryStore();
    const { bannerMovie, setBannerMovie } = useBannerStore();
    const { prefetchModalData } = usePrefetchModalData();
    const hoverTimeoutRef = useRef(null);


    const { data: movies } = useNetflixOriginals();

    useEffect(() => {
        if (bannerMovie) {
            setMovie(bannerMovie); // eslint-disable-line react-hooks/set-state-in-effect
            setMovieDetails(null);
            setLogoPath(null);
            setPosterPath(null);
            setLogoLoaded(false);
        } else if (movies && movies.length > 0) {
            const selectedMovie = movies[Math.floor(Math.random() * movies.length)];
            setMovie(selectedMovie);
            setBannerMovie(selectedMovie);
            setMovieDetails(null);
            setLogoPath(null);
            setPosterPath(null);
            setLogoLoaded(false);
        }
    }, [movies, bannerMovie, setBannerMovie]);

    const { data: images } = useMovieImages(movie?.id, movie?.first_air_date ? 'tv' : 'movie');

    useEffect(() => {
        if (images) {
            // Handle Logo
            if (images.logos) {
                const logos = images.logos;
                const englishLogo = logos.find(logo => logo.iso_639_1 === 'en');
                const logo = englishLogo || logos[0];
                setLogoPath(logo ? logo.file_path : null); // eslint-disable-line react-hooks/set-state-in-effect
            } else {
                setLogoPath(null);
            }

            // Handle Textless Poster
            if (images.posters) {
                const textlessPoster = images.posters.find(
                    poster => poster.iso_639_1 === null || poster.iso_639_1 === 'xx' || poster.iso_639_1 === 'en'
                );
                // Prefer textless, then English, then first available, then fallback to movie object
                setPosterPath(textlessPoster ? textlessPoster.file_path : images.posters[0]?.file_path);
            }

            setLogoLoaded(false);
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

    const handleListToggle = () => {
        if (isInList(movie.id)) {
            removeMovie(movie.id);
        } else {
            addMovie(movie);
        }
    };

    /* eslint-disable no-unused-vars */
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
    /* eslint-enable no-unused-vars */

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    const inList = isInList(movie?.id);

    // Don't render until we have movie data
    if (!movie?.id) {
        return (
            <div className="md:hidden relative h-[70vh] bg-gray-900 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
            </div>
        );
    }

    return (
        <>
            <div
                className="md:hidden relative h-[70vh] text-white overflow-hidden"
            >
                <img
                    src={`https://image.tmdb.org/t/p/w780${movie?.backdrop_path || movie?.poster_path}`}
                    srcSet={`https://image.tmdb.org/t/p/w780${movie?.backdrop_path || movie?.poster_path} 780w, https://image.tmdb.org/t/p/w1280${movie?.backdrop_path || movie?.poster_path} 1280w`}
                    sizes="100vw"
                    alt={movie?.title || movie?.name}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    fetchPriority="high"
                    loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

                <div className="relative h-full flex flex-col justify-end pb-8 px-4 items-center bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent">
                    {logoPath && (
                        <div className={`flex items-center justify-center w-full mb-4 transition-opacity duration-700 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}>
                            <img
                                src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                alt={movie?.title || movie?.name}
                                onLoad={() => setLogoLoaded(true)}
                                className="max-w-[280px] max-h-32 drop-shadow-2xl object-contain"
                                loading="lazy"
                                decoding="async"
                                width="280"
                                height="128"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-3 text-sm text-gray-300 mb-6 font-medium drop-shadow-md flex-wrap">
                        <span className="text-[#46d369] font-bold tracking-wide">{movie.vote_average ? `${(movie.vote_average * 10).toFixed(0)}% Match` : 'New'}</span>
                        <span className="text-gray-500 text-[10px]">•</span>
                        <span className="text-white">{movie.first_air_date?.substring(0, 4) || movie.release_date?.substring(0, 4)}</span>
                        <span className="text-gray-500 text-[10px]">•</span>
                        <span className="bg-[#333]/80 px-1.5 py-0.5 rounded-full text-xs text-white border border-white/40">{movie.adult ? '18+' : '13+'}</span>
                        <span className="text-gray-500 text-[10px]">•</span>
                        {movieDetails?.number_of_seasons ? (
                            <span className="text-white">{movieDetails.number_of_seasons} {movieDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}</span>
                        ) : movieDetails?.runtime ? (
                            <span className="text-white">{Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m</span>
                        ) : null}
                        {movieDetails?.genres?.[0] && (
                            <>
                                <span className="text-gray-500 text-[10px]">•</span>
                                <span className="text-white">{movieDetails.genres[0].name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex gap-3 w-full max-w-md">
                        <button
                            onClick={() => onMovieClick(movie)}
                            className="flex-1 bg-white text-black py-3 rounded-full flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-transform"
                        >
                            <Play className="w-4 h-4 fill-black" />
                            {getHistoryItem(movie.id) ? 'Resume' : 'Play'}
                        </button>
                        <button
                            onClick={handleListToggle}
                            className="flex-1 flex items-center justify-center gap-2 cursor-pointer text-white outline-none border-none font-bold rounded-full py-3 text-sm bg-white/10 hover:bg-white/20 transition duration-300 shadow-lg hover:bg-white/25 active:scale-95 border border-white/20 backdrop-blur-md"
                        >
                            {inList ? (
                                <>
                                    <Check className="w-5 h-5" /> <span>My List</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" /> <span>My List</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

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

export default MobileHero;
