import { useState, useEffect } from 'react';
import axios from '../lib/axios';
import requests from '../lib/requests';
import { Play, Plus, Check } from 'lucide-react';
import useListStore from '../store/useListStore';
import StreamingPlayer from './StreamingPlayer';
import { AnimatePresence } from 'framer-motion';

const Banner = ({ onMovieClick }) => {
    const [movie, setMovie] = useState([]);
    const [showPlayer, setShowPlayer] = useState(false);
    const [logoPath, setLogoPath] = useState(null);
    const { addMovie, removeMovie, isInList } = useListStore();

    useEffect(() => {
        async function fetchData() {
            const request = await axios.get(requests.fetchNetflixOriginals);
            setMovie(
                request.data.results[
                Math.floor(Math.random() * request.data.results.length - 1)
                ]
            );
            return request;
        }
        fetchData();
    }, []);

    useEffect(() => {
        const fetchLogo = async () => {
            if (!movie?.id) return;

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

    const inList = isInList(movie?.id);

    return (
        <>
            <header
                className="relative h-[50vh] md:h-[80vh] object-contain text-white"
                style={{
                    backgroundSize: "cover",
                    backgroundImage: `url("https://image.tmdb.org/t/p/original/${movie?.backdrop_path}")`,
                    backgroundPosition: "center center",
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#141414]" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

                <div className="relative pt-[150px] md:pt-[250px] px-8 md:px-12 h-full flex flex-col justify-center">
                    {logoPath ? (
                        <div className="flex items-center">
                            <img
                                src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                                alt={movie?.title || movie?.name}
                                className="max-w-xs md:max-w-md max-h-24 md:max-h-26 mb-4 drop-shadow-2xl object-contain"
                            />
                        </div>
                    ) : (
                        <h1 className="text-4xl md:text-6xl font-bold pb-4 max-w-2xl drop-shadow-lg">
                            {movie?.title || movie?.name || movie?.original_name}
                        </h1>
                    )}

                    <h1 className="w-full md:max-w-2xl text-sm md:text-lg font-medium drop-shadow-md mb-8 line-clamp-3 md:line-clamp-4 text-gray-200">
                        {truncate(movie?.overview, 150)}
                    </h1>

                    <div className="flex gap-4">
                        <button
                            onClick={() => onMovieClick(movie)}
                            className="flex items-center gap-3 cursor-pointer text-black outline-none border-none font-bold rounded-full px-8 py-4 bg-white transition duration-300 shadow-lg hover:scale-105 active:scale-95"
                        >
                            <Play className="w-6 h-6 fill-white" /> Watch Now
                        </button>
                        <button
                            onClick={handleListToggle}
                            className="flex items-center gap-3 cursor-pointer text-white outline-none border-none font-bold rounded-full px-8 py-4 bg-white/20 hover:bg-white/30 transition duration-300 shadow-lg hover:scale-105 active:scale-95 border border-white/20 backdrop-blur-md"
                        >
                            {inList ? (
                                <>
                                    <Check className="w-6 h-6" /> In My List
                                </>
                            ) : (
                                <>
                                    <Plus className="w-6 h-6" /> Add to List
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
