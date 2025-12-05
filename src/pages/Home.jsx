import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import Banner from '../components/Banner';
import Row from '../components/Row';
import Modal from '../components/Modal';
import Navbar from '../components/Navbar';
import MobileHero from '../components/MobileHero';
import RowSkeleton from '../components/RowSkeleton';
import requests from '../lib/requests';
import tmdb from '../lib/tmdb';
import useWatchHistoryStore from '../store/useWatchHistoryStore';
import { AnimatePresence } from 'framer-motion';
import { performance } from '../utils/performance';

const Home = () => {
    const [selectedMovie, setSelectedMovie] = useState(null);
    const { history, removeFromHistory, clearHistory } = useWatchHistoryStore();
    const queryClient = useQueryClient();

    // SEO
    useEffect(() => {
        document.title = 'Home - Streamr';
    }, []);

    // Fetch the aggregated Home Feed
    const { data: feed = [], isLoading, isError } = useQuery({
        queryKey: ['homeFeed'],
        queryFn: async () => {
            const { data } = await tmdb.get(requests.fetchHomeFeed);
            return data;
        },
        staleTime: 0, // Always refetch to ensure random categories are fresh
        gcTime: 5 * 60 * 1000, // Keep in memory briefly for back navigation speed
    });

    // Invalidate if history changes (to update recommendations in feed if we were to refetch)
    // Actually, backend recommendations are baked into the feed.
    // If we want instant updates, we might need to invalidate 'homeFeed' on history change,
    // but that's expensive. For now, let's rely on the feed cache.
    // Ideally, we'd augment the feed with client-side history knowledge, but backend handles it.

    // Prefetch modal data for the first item in the first row (likely Trending or Recs)
    useEffect(() => {
        if (feed.length > 0 && feed[0].data && feed[0].data.length > 0) {
            const firstMovie = feed[0].data[0];
            const type = firstMovie.first_air_date ? 'tv' : 'movie';
            const id = firstMovie.id;

            // Simplified prefetch of just the aggregated modal endpoint
            queryClient.prefetchQuery({
                queryKey: ['modal', type, id],
                queryFn: async () => {
                    const { data } = await tmdb.get(`/modal/${type}/${id}`);
                    return data;
                },
                staleTime: 30 * 60 * 1000
            });
        }
    }, [feed, queryClient]);

    // Memoized event handlers
    const handleMovieClick = useCallback((movie) => {
        setSelectedMovie(movie);
    }, []);

    const handleModalClose = useCallback(() => {
        setSelectedMovie(null);
    }, []);

    // Memoize whether to show continue watching
    const showContinueWatching = useMemo(() => history.length > 0, [history.length]);

    // Extract Trending for Banner (usually the "Trending Now" section)
    const trendingMovies = useMemo(() => {
        const trendingSection = feed.find(s => s.title === 'Trending Now');
        return trendingSection ? trendingSection.data : [];
    }, [feed]);

    // Deferred rendering state (progressive loading)
    const [visibleRows, setVisibleRows] = useState(2);

    useEffect(() => {
        if (!isLoading) {
            performance.mark('home-mount-start');
            const timer = setTimeout(() => {
                setVisibleRows(prev => prev + 10);
                performance.mark('home-rows-visible');
                performance.measure('Home Rows Render', 'home-mount-start', 'home-rows-visible');
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    return (
        <div className="bg-[#0a0a0a] min-h-screen pb-10 overflow-x-hidden font-sans scrollbar-hide">
            <Navbar onMovieClick={handleMovieClick} />

            <div className="hidden md:block">
                {/* Pass feed data to Banner to avoid extra request */}
                <Banner
                    onMovieClick={handleMovieClick}
                    movies={trendingMovies.length > 0 ? trendingMovies : null}
                    fetchUrl={requests.fetchTrending} // Fallback
                />
            </div>
            <MobileHero onMovieClick={handleMovieClick} />

            <div className="flex flex-col gap-1 md:gap-2 relative z-10 pl-0 md:pl-2 pb-16 md:pb-20 mt-4">
                {showContinueWatching && (
                    <Row
                        title="Continue Watching"
                        movies={history}
                        onMovieClick={handleMovieClick}
                        onRemove={removeFromHistory}
                        onClearAll={clearHistory}
                        alwaysOverlay={true}
                    />
                )}

                {isLoading ? (
                    <RowSkeleton count={4} />
                ) : (
                    feed.slice(0, visibleRows).map((section) => (
                        <Row
                            key={section.title}
                            title={section.title}
                            movies={section.data}
                            onMovieClick={handleMovieClick}
                        />
                    ))
                )}

                {isError && (
                    <div className="text-center text-red-500 py-10">
                        Failed to load content. Please try again.
                    </div>
                )}
            </div>
            <AnimatePresence>
                {selectedMovie && (
                    <Modal
                        movie={selectedMovie}
                        onClose={handleModalClose}
                        onMovieClick={handleMovieClick}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(Home);
