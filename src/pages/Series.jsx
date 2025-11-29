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

const Series = () => {
    const [selectedMovie, setSelectedMovie] = useState(null);
    const dynamicCategories = useDynamicCategories('tv', 15);


    // SEO
    useEffect(() => {
        document.title = 'Series - Streamr';
    }, []);

    // Background Prefetching
    const prefetchCategories = [
        { key: 'Trending Series', url: requests.fetchTrendingTV },
        { key: 'Top Rated', url: requests.fetchTopRatedTV },
        { key: 'Action & Adventure', url: requests.fetchActionTV },
        { key: 'Comedy', url: requests.fetchComedyTV },
        { key: 'Crime', url: requests.fetchCrimeTV },
        { key: 'Drama', url: requests.fetchDramaTV },
        { key: 'Mystery', url: requests.fetchMysteryTV },
        { key: 'Sci-Fi & Fantasy', url: requests.fetchSciFiTV },
    ];

    useRoutePrefetch(prefetchCategories);

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
    };

    return (
        <div className="bg-[#0a0a0a] min-h-screen pb-10 overflow-x-hidden font-sans">
            <Navbar onMovieClick={handleMovieClick} />

            <div className="hidden md:block">
                <Banner onMovieClick={handleMovieClick} fetchUrl={requests.fetchTrendingTV} />
            </div>
            {/* MobileHero might need adjustment to show TV shows specifically if desired, 
                but for now we'll reuse it. It might show a movie or TV show depending on its internal logic.
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

export default Series;
