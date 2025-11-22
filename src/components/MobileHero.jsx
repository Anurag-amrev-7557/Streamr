import { useState, useEffect, useRef } from 'react';
import axios from '../lib/axios';
import requests from '../lib/requests';
import { Play, Plus, Check } from 'lucide-react';
import useListStore from '../store/useListStore';

const MobileHeroCard = ({ movie, onMovieClick }) => {
    const [logoPath, setLogoPath] = useState(null);
    const { addMovie, removeMovie, isInList } = useListStore();

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const endpoint = movie.first_air_date
                    ? `/tv/${movie.id}/images`
                    : `/movie/${movie.id}/images`;

                const response = await axios.get(endpoint);
                const logos = response.data.logos;
                const englishLogo = logos?.find(logo => logo.iso_639_1 === 'en');
                const logo = englishLogo || logos?.[0];

                if (logo) {
                    setLogoPath(logo.file_path);
                }
            } catch (error) {
                console.log('Logo fetch error:', error);
            }
        };

        fetchLogo();
    }, [movie]);

    const handleListToggle = (e) => {
        e.stopPropagation();
        if (isInList(movie.id)) {
            removeMovie(movie.id);
        } else {
            addMovie(movie);
        }
    };

    return (
        <div
            onClick={() => onMovieClick(movie)}
            className="relative flex-shrink-0 w-[calc(100vw-32px)] snap-center rounded-xl overflow-hidden aspect-[6/3] shadow-lg group"
        >
            <img
                src={`https://image.tmdb.org/t/p/w500${movie.backdrop_path || movie.poster_path}`}
                alt={movie.title || movie.name}
                className="w-full h-full object-cover"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end h-full">
                <div className="mt-auto">
                    {logoPath ? (
                        <img
                            src={`https://image.tmdb.org/t/p/w300${logoPath}`}
                            alt={movie.title || movie.name}
                            className="h-12 object-contain self-start"
                        />
                    ) : (
                        <h3 className="text-white text-2xl font-bold line-clamp-2 mb-2">
                            {movie.title || movie.name}
                        </h3>
                    )}
                </div>
            </div>
        </div>
    );
};

const MobileHero = ({ onMovieClick }) => {
    const [movies, setMovies] = useState([]);
    const scrollRef = useRef(null);

    useEffect(() => {
        async function fetchData() {
            const request = await axios.get(requests.fetchTrending);
            setMovies(request.data.results.slice(0, 10));
            return request;
        }
        fetchData();
    }, []);

    if (movies.length === 0) {
        return (
            <div className="md:hidden h-[250px] bg-gray-900 animate-pulse mb-4" />
        );
    }

    return (
        <div className="md:hidden mb-8 pt-20 px-4">
            <h2 className="text-white text-xl font-bold mb-4">Featured Today</h2>

            <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide -mx-4 px-4"
            >
                {movies.map((movie) => (
                    <MobileHeroCard
                        key={movie.id}
                        movie={movie}
                        onMovieClick={onMovieClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default MobileHero;
