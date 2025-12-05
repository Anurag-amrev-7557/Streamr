import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Banner from '../components/Banner';
import Row from '../components/Row';
import Modal from '../components/Modal';
import Navbar from '../components/Navbar';
import MobileHero from '../components/MobileHero';
import requests from '../lib/requests';
import useWatchHistoryStore from '../store/useWatchHistoryStore';
import useDynamicCategories from '../hooks/useDynamicCategories';


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

    // Invalidate recommendations when history changes
    useEffect(() => {
        if (history.length > 0) {
            queryClient.invalidateQueries({ queryKey: ['row', 'Recommended for You'] });
        }
    }, [history, queryClient]);

    // Background Prefetching for Top Routes (Movies, Series)
    useEffect(() => {
        const prefetchRoutes = async () => {
            // Wait for main content to load - using requestIdleCallback handles the timing
            // await new Promise(resolve => setTimeout(resolve, 1000));

            const prefetchCategory = async (key, url) => {
                await queryClient.prefetchQuery({
                    queryKey: ['row', key, url],
                    queryFn: async () => {
                        const { data } = await import('../lib/tmdb').then(m => m.default.get(url));
                        return data.results;
                    },
                    staleTime: 30 * 60 * 1000, // 30 mins
                });
            };

            // Prefetch all categories
            await Promise.allSettled([
                prefetchCategory('Top Rated', requests.fetchTopRated),
                prefetchCategory('Action Movies', requests.fetchActionMovies),
                prefetchCategory('Comedy Movies', requests.fetchComedyMovies),
                prefetchCategory('Horror Movies', requests.fetchHorrorMovies),
                prefetchCategory('Romance Movies', requests.fetchRomanceMovies),
                prefetchCategory('Documentaries', requests.fetchDocumentaries),
                prefetchCategory('Trending Series', requests.fetchTrending), // Assuming Series uses trending for now
            ]);

            // Prefetch the first movie in the "Trending Now" row for instant modal
            // This is a high-probability interaction
            queryClient.prefetchQuery({
                queryKey: ['row', 'Trending Now', requests.fetchTrending],
                queryFn: async () => {
                    const { data } = await import('../lib/tmdb').then(m => m.default.get(requests.fetchTrending));
                    // Prefetch modal data for the first item
                    if (data.results && data.results.length > 0) {
                        const firstMovie = data.results[0];
                        // We need to import the prefetch hook logic here or use a direct prefetch
                        // Since we can't easily use the hook inside useEffect, we'll manually prefetch
                        // the critical parts (details and images)
                        const type = firstMovie.first_air_date ? 'tv' : 'movie';
                        const id = firstMovie.id;

                        // Prefetch images (including logo)
                        queryClient.prefetchQuery({
                            queryKey: ['images', type, id],
                            queryFn: async () => {
                                const { data: imgData } = await import('../lib/tmdb').then(m => m.default.get(`/${type}/${id}/images`));
                                return imgData;
                            },
                            staleTime: 30 * 60 * 1000
                        });

                        // Prefetch details
                        queryClient.prefetchQuery({
                            queryKey: ['details', type, id],
                            queryFn: async () => {
                                const { data: detailData } = await import('../lib/tmdb').then(m => m.default.get(`/${type}/${id}`));
                                return detailData;
                            },
                            staleTime: 30 * 60 * 1000
                        });
                    }
                    return data.results;
                },
                staleTime: 30 * 60 * 1000,
            });
        };

        // Use requestIdleCallback if available, else timeout
        const startPrefetch = () => {
            if (window.requestIdleCallback) {
                window.requestIdleCallback(prefetchRoutes);
            } else {
                setTimeout(prefetchRoutes, 1000);
            }
        }

        startPrefetch();
    }, [queryClient]);

    // Memoized event handlers for stable references
    const handleMovieClick = useCallback((movie) => {
        setSelectedMovie(movie);
    }, []);

    const handleModalClose = useCallback(() => {
        setSelectedMovie(null);
    }, []);

    // Dynamic categories
    const dynamicCategories = useDynamicCategories('all', 15);

    // Memoize row configurations to prevent re-creating on every render
    const rowConfigs = useMemo(() => {
        const rows = [...dynamicCategories];

        if (history.length > 0) {
            rows.unshift({ title: 'Recommended for You', fetchUrl: requests.fetchRecommendations });
        }

        return rows;
    }, [history.length, dynamicCategories]);

    // Memoize whether to show continue watching
    const showContinueWatching = useMemo(() => history.length > 0, [history.length]);

    // Deferred rendering state
    const [visibleRows, setVisibleRows] = useState(2);

    useEffect(() => {
        performance.mark('home-mount-start');
        // Load remaining rows after initial render
        const timer = setTimeout(() => {
            setVisibleRows(prev => prev + 10); // Show all remaining rows
            performance.mark('home-rows-visible');
            performance.measure('Home Rows Render', 'home-mount-start', 'home-rows-visible');
        }, 100); // Short delay to allow main thread to breathe
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-[#0a0a0a] min-h-screen pb-10 overflow-x-hidden font-sans scrollbar-hide">
            <Navbar onMovieClick={handleMovieClick} />

            <div className="hidden md:block">
                <Banner onMovieClick={handleMovieClick} />
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
                {rowConfigs.slice(0, visibleRows).map((config) => (
                    <Row
                        key={config.title}
                        title={config.title}
                        fetchUrl={config.fetchUrl}
                        onMovieClick={handleMovieClick}
                    />
                ))}
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
