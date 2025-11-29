import { useState, useEffect } from 'react';

import useRoutePrefetch from '../hooks/useRoutePrefetch';
import useDynamicCategories from '../hooks/useDynamicCategories';
import Banner from '../components/Banner';
import Row from '../components/Row';
import Modal from '../components/Modal';
import Navbar from '../components/Navbar';
import MobileHero from '../components/MobileHero';
import requests from '../lib/requests';
import { AnimatePresence } from 'framer-motion';

const Movies = () => {
    const [selectedMovie, setSelectedMovie] = useState(null);
    const dynamicCategories = useDynamicCategories('movie', 15);


    // SEO
    useEffect(() => {
        document.title = 'Movies - Streamr';
    }, []);

    // Background Prefetching
    const prefetchCategories = [
        { key: 'Trending Movies', url: requests.fetchTrendingMovies },
        { key: 'Top Rated', url: requests.fetchTopRated },
        { key: 'Action', url: requests.fetchActionMovies },
        { key: 'Comedy', url: requests.fetchComedyMovies },
        { key: 'Horror', url: requests.fetchHorrorMovies },
        { key: 'Romance', url: requests.fetchRomanceMovies },
        { key: 'Documentaries', url: requests.fetchDocumentaries },
    ];

    useRoutePrefetch(prefetchCategories);

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
    };

    return (
        <div className="bg-[#0a0a0a] min-h-screen pb-10 overflow-x-hidden font-sans">
            <Navbar onMovieClick={handleMovieClick} />

            <div className="hidden md:block">
                <Banner onMovieClick={handleMovieClick} fetchUrl={requests.fetchTrendingMovies} />
            </div>
            {/* Reusing MobileHero but it might need adjustment if it doesn't support custom fetchUrl. 
                For now, MobileHero seems to use its own logic or props. 
                Let's check MobileHero later if needed, but for now we'll keep it as is or omit if it's strictly for Home.
                Actually, MobileHero in Home.jsx doesn't take fetchUrl, it might just show a random movie.
                Let's keep it for consistency on mobile.
            */}
            <MobileHero onMovieClick={handleMovieClick} />

            <div className="flex flex-col gap-1 md:gap-2 relative z-10 pl-0 md:pl-2 pb-16 md:pb-20 mt-4">
                {dynamicCategories.map((category) => (
                    <Row
                        key={category.id}
                        title={category.title}
                        fetchUrl={category.fetchUrl}
                        onMovieClick={handleMovieClick}
                    />
                ))}
            </div>
            <AnimatePresence>
                {selectedMovie && <Modal movie={selectedMovie} onClose={() => setSelectedMovie(null)} onMovieClick={handleMovieClick} />}
            </AnimatePresence>
        </div>
    );
};

export default Movies;
