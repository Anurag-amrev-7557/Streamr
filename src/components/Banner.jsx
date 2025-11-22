import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../lib/axios';
import requests from '../lib/requests';
import { Play, Plus, Check } from 'lucide-react';
import useListStore from '../store/useListStore';
import useAuthStore from '../store/useAuthStore';
import StreamingPlayer from './StreamingPlayer';
import { AnimatePresence } from 'framer-motion';

const Banner = ({ onMovieClick }) => {
    const [movie, setMovie] = useState([]);
    const [showPlayer, setShowPlayer] = useState(false);
    const [logoPath, setLogoPath] = useState(null);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const { addMovie, removeMovie, isInList } = useListStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchData() {
            const request = await axios.get(requests.fetchNetflixOriginals);
            const selectedMovie = request.data.results[
                Math.floor(Math.random() * request.data.results.length - 1)
            ];
            setMovie(selectedMovie);
            // Reset logo when movie changes to prevent mismatch
            setLogoPath(null);
            setLogoLoaded(false);
            return request;
        }
        fetchData();
    }, []);

    useEffect(() => {
        const fetchLogo = async () => {
            if (!movie?.id) return;

            // Reset loaded state when fetching new logo
            setLogoLoaded(false);

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
                } else {
                    setLogoPath(null);
                }
            } catch (error) {
                console.log('Logo not available:', error.message);
                setLogoPath(null);
            }
        };

        fetchLogo();
    }, [movie?.id]); // Only re-fetch when movie ID changes

    function truncate(str, n) {
        return str?.length > n ? str.substr(0, n - 1) + "..." : str;
    }

    const handleListToggle = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (isInList(movie.id)) {
            removeMovie(movie.id);
        } else {
            addMovie(movie);
        }
    };

    const inList = isInList(movie?.id);

    // Don't render until we have movie data
    if (!movie?.id) {
        return (
            <header className="relative h-[45vh] md:h-[80vh] bg-gray-900 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#141414]" />
            </header>
        );
    }

    return (
        <>
            <header
                className="relative h-[45vh] md:h-[80vh] object-contain text-white"
                style={{
                    backgroundSize: "cover",
                    backgroundImage: `url("https://image.tmdb.org/t/p/original/${movie?.backdrop_path || movie?.poster_path}")`,
                    backgroundPosition: "center center",
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#141414]" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

                <div className="relative pt-[120px] md:pt-[250px] px-4 md:px-12 h-full flex flex-col justify-center">
                    {logoPath && logoLoaded ? (
                        <div className="flex items-center">
                            <img
                                src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                alt={movie?.title || movie?.name}
                                onLoad={() => setLogoLoaded(true)}
                                className="max-w-[200px] md:max-w-md max-h-16 md:max-h-26 mb-3 drop-shadow-2xl object-contain"
                            />
                        </div>
                    ) : logoPath && !logoLoaded ? (
                        // Hidden image to preload
                        <>
                            <img
                                src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                alt={movie?.title || movie?.name}
                                onLoad={() => setLogoLoaded(true)}
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

                    <h1 className="w-full md:max-w-2xl text-xs md:text-lg font-medium drop-shadow-md mb-4 md:mb-8 line-clamp-2 md:line-clamp-4 text-gray-200">
                        {truncate(movie?.overview || 'Discover amazing content.', window.innerWidth < 768 ? 100 : 150)}
                    </h1>

                    <div className="flex gap-2 md:gap-4">
                        <button
                            onClick={() => onMovieClick(movie)}
                            className="flex items-center gap-2 md:gap-3 cursor-pointer text-black outline-none border-none font-bold rounded-full px-4 md:px-8 py-2.5 md:py-4 text-sm md:text-base bg-white transition duration-300 shadow-lg hover:scale-105 active:scale-95"
                        >
                            <Play className="w-4 h-4 md:w-6 md:h-6 fill-black" /> <span className="hidden sm:inline">Watch Now</span><span className="sm:hidden">Play</span>
                        </button>
                        <button
                            onClick={handleListToggle}
                            className="flex items-center gap-2 md:gap-3 cursor-pointer text-white outline-none border-none font-bold rounded-full px-4 md:px-8 py-2.5 md:py-4 text-sm md:text-base bg-white/20 hover:bg-white/30 transition duration-300 shadow-lg hover:scale-105 active:scale-95 border border-white/20 backdrop-blur-md"
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

export default Banner;
