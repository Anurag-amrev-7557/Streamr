import { useState } from 'react';
import Banner from '../components/Banner';
import Row from '../components/Row';
import Modal from '../components/Modal';
import Navbar from '../components/Navbar';
import MobileHero from '../components/MobileHero';
import requests from '../lib/requests';

import { AnimatePresence } from 'framer-motion';

const Home = () => {
    const [selectedMovie, setSelectedMovie] = useState(null);

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
    };

    return (
        <div className="bg-[#141414] min-h-screen pb-10 overflow-x-hidden font-sans">
            <Navbar onMovieClick={handleMovieClick} />

            <div className="hidden md:block">
                <Banner onMovieClick={handleMovieClick} />
            </div>
            <MobileHero onMovieClick={handleMovieClick} />

            <div className="flex flex-col gap-1 md:gap-2 relative z-10 pl-0 md:pl-2 pb-16 md:pb-20 mt-0 md:-mt-20">
                <Row title="Trending Now" fetchUrl={requests.fetchTrending} isLargeRow onMovieClick={handleMovieClick} />
                <Row title="Top Rated Movies" fetchUrl={requests.fetchTopRated} onMovieClick={handleMovieClick} />
                <Row title="Top Rated" fetchUrl={requests.fetchTopRated} onMovieClick={handleMovieClick} />
                <Row title="Action Movies" fetchUrl={requests.fetchActionMovies} onMovieClick={handleMovieClick} />
                <Row title="Comedy Movies" fetchUrl={requests.fetchComedyMovies} onMovieClick={handleMovieClick} />
                <Row title="Horror Movies" fetchUrl={requests.fetchHorrorMovies} onMovieClick={handleMovieClick} />
                <Row title="Romance Movies" fetchUrl={requests.fetchRomanceMovies} onMovieClick={handleMovieClick} />
                <Row title="Documentaries" fetchUrl={requests.fetchDocumentaries} onMovieClick={handleMovieClick} />
            </div>
            <AnimatePresence>
                {selectedMovie && <Modal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
            </AnimatePresence>
        </div>
    );
};

export default Home;
