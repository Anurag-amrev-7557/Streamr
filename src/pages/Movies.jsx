import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Banner from '../components/Banner';
import Row from '../components/Row';
import Modal from '../components/Modal';
import Navbar from '../components/Navbar';
import MobileHero from '../components/MobileHero';
import RowSkeleton from '../components/RowSkeleton';
import requests from '../lib/requests';
import tmdb from '../lib/tmdb';
import { AnimatePresence } from 'framer-motion';

const Movies = () => {
    const [selectedMovie, setSelectedMovie] = useState(null);

    // SEO
    useEffect(() => {
        document.title = 'Movies - Streamr';
    }, []);

    // Fetch Movies Feed
    const { data: feed = [], isLoading, isError } = useQuery({
        queryKey: ['moviesFeed'],
        queryFn: async () => {
            const { data } = await tmdb.get(requests.fetchMoviesFeed);
            return data;
        },
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
    });

    const trendingMovies = feed.find(s => s.title === 'Trending Movies')?.data || [];

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
    };

    return (
        <div className="bg-[#0a0a0a] min-h-screen pb-10 overflow-x-hidden font-sans">
            <Navbar onMovieClick={handleMovieClick} />

            <div className="hidden md:block">
                <Banner
                    onMovieClick={handleMovieClick}
                    movies={trendingMovies.length > 0 ? trendingMovies : null}
                    fetchUrl={requests.fetchTrendingMovies}
                />
            </div>

            <MobileHero onMovieClick={handleMovieClick} />

            <div className="flex flex-col gap-1 md:gap-2 relative z-10 pl-0 md:pl-2 pb-16 md:pb-20 mt-4">
                {isLoading ? (
                    <RowSkeleton count={4} />
                ) : (
                    feed.map((category) => (
                        <Row
                            key={category.title}
                            title={category.title}
                            movies={category.data}
                            onMovieClick={handleMovieClick}
                        />
                    ))
                )}

                {isError && (
                    <div className="text-center text-red-500 py-10">
                        Failed to load movies.
                    </div>
                )}
            </div>
            <AnimatePresence>
                {selectedMovie && <Modal movie={selectedMovie} onClose={() => setSelectedMovie(null)} onMovieClick={handleMovieClick} />}
            </AnimatePresence>
        </div>
    );
};

export default Movies;
