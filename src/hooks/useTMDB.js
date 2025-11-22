import { useQuery, useQueryClient } from '@tanstack/react-query';
import tmdb from '../lib/tmdb';
import requests from '../lib/requests';
import { useEffect, useRef, useMemo } from 'react';

// Optimized cache times
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes (formerly cacheTime)

export const useTrending = () => {
    return useQuery({
        queryKey: ['trending'],
        queryFn: async () => {
            const { data } = await tmdb.get(requests.fetchTrending);
            return data.results;
        },
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

export const useNetflixOriginals = () => {
    return useQuery({
        queryKey: ['netflixOriginals'],
        queryFn: async () => {
            const { data } = await tmdb.get(requests.fetchNetflixOriginals);
            return data.results;
        },
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

export const useRowData = (fetchUrl, title) => {
    return useQuery({
        queryKey: ['row', title, fetchUrl],
        queryFn: async () => {
            const { data } = await tmdb.get(fetchUrl);
            return data.results;
        },
        enabled: !!fetchUrl,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

export const useMovieImages = (movieId, type = 'movie') => {
    return useQuery({
        queryKey: ['images', type, movieId],
        queryFn: async () => {
            const endpoint = type === 'tv'
                ? `/tv/${movieId}/images`
                : `/movie/${movieId}/images`;
            const { data } = await tmdb.get(endpoint);
            return data;
        },
        enabled: !!movieId,
        retry: false,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

// Prefetch utilities for modal data
export const usePrefetchModalData = () => {
    const queryClient = useQueryClient();

    const prefetchModalData = async (movie) => {
        if (!movie?.id) return;

        const isTv = !!movie.first_air_date;
        const type = isTv ? 'tv' : 'movie';
        const id = movie.id;

        // Build prefetch promises array
        const prefetchPromises = [
            queryClient.prefetchQuery({
                queryKey: ['images', type, id],
                queryFn: async () => {
                    const { data } = await tmdb.get(`/${type}/${id}/images`);
                    return data;
                },
                staleTime: STALE_TIME,
            }),
            queryClient.prefetchQuery({
                queryKey: ['details', type, id],
                queryFn: async () => {
                    const { data } = await tmdb.get(`/${type}/${id}`);
                    return data;
                },
                staleTime: STALE_TIME,
            }),
            queryClient.prefetchQuery({
                queryKey: ['credits', type, id],
                queryFn: async () => {
                    const { data } = await tmdb.get(`/${type}/${id}/credits`);
                    return data;
                },
                staleTime: STALE_TIME,
            }),
            queryClient.prefetchQuery({
                queryKey: ['similar', type, id],
                queryFn: async () => {
                    const { data } = await tmdb.get(`/${type}/${id}/similar`);
                    return data;
                },
                staleTime: STALE_TIME,
            }),
            queryClient.prefetchQuery({
                queryKey: ['videos', type, id],
                queryFn: async () => {
                    const { data } = await tmdb.get(`/${type}/${id}/videos`);
                    return data;
                },
                staleTime: STALE_TIME,
            }),
        ];

        // If it's a TV show, also prefetch first season episodes
        if (isTv) {
            prefetchPromises.push(
                queryClient.prefetchQuery({
                    queryKey: ['episodes', id, 1],
                    queryFn: async () => {
                        const { data } = await tmdb.get(`/tv/${id}/season/1`);
                        return data.episodes || [];
                    },
                    staleTime: STALE_TIME,
                })
            );
        }

        // Prefetch all data concurrently
        await Promise.allSettled(prefetchPromises);
    };

    return { prefetchModalData };
};

// Intersection Observer hook for rows
export const useIntersectionPrefetch = (callback, options = {}) => {
    const elementRef = useRef(null);
    const hasPrefetched = useRef(false);

    // Memoize options to prevent observer recreation
    const observerOptions = useMemo(() => ({
        rootMargin: '200px', // Start prefetching 200px before element enters viewport
        threshold: 0.1,
        ...options,
    }), [options.rootMargin, options.threshold]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasPrefetched.current) {
                        hasPrefetched.current = true;
                        callback();
                    }
                });
            },
            observerOptions
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [callback, observerOptions]);

    return elementRef;
};

// Hook for fetching episodes with caching
export const useEpisodes = (movieId, seasonNumber, enabled = true) => {
    return useQuery({
        queryKey: ['episodes', movieId, seasonNumber],
        queryFn: async () => {
            const { data } = await tmdb.get(`/tv/${movieId}/season/${seasonNumber}`);
            return data.episodes || [];
        },
        enabled: enabled && !!movieId && !!seasonNumber,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

// Utility to prefetch episodes for a specific season
export const usePrefetchSeasonEpisodes = () => {
    const queryClient = useQueryClient();

    const prefetchSeasonEpisodes = async (movieId, seasonNumber) => {
        if (!movieId || !seasonNumber) return;

        await queryClient.prefetchQuery({
            queryKey: ['episodes', movieId, seasonNumber],
            queryFn: async () => {
                const { data } = await tmdb.get(`/tv/${movieId}/season/${seasonNumber}`);
                return data.episodes || [];
            },
            staleTime: STALE_TIME,
        });
    };

    return { prefetchSeasonEpisodes };
};

// Search hook with caching and debounce
export const useSearch = (query, enabled = true) => {
    return useQuery({
        queryKey: ['search', query],
        queryFn: async () => {
            if (!query || !query.trim()) {
                return [];
            }

            // Search for movies and TV shows
            const { data } = await tmdb.get(`/search/multi?query=${encodeURIComponent(query)}`);

            // Filter only movies and tv shows
            const filteredResults = data.results?.filter(
                item => item.media_type === 'movie' || item.media_type === 'tv'
            ).slice(0, 8) || []; // Get top 8 results

            // Fetch details in parallel for runtime/seasons info
            const detailedResults = await Promise.allSettled(
                filteredResults.map(async (item) => {
                    try {
                        const endpoint = item.media_type === 'movie'
                            ? `/movie/${item.id}`
                            : `/tv/${item.id}`;
                        const details = await tmdb.get(endpoint);
                        return { ...item, ...details.data };
                    } catch (e) {
                        return item; // Return basic info if details fail
                    }
                })
            );

            return detailedResults
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value)
                .slice(0, 5); // Return top 5 results
        },
        enabled: enabled && !!query && query.trim().length > 0,
        staleTime: 10 * 60 * 1000, // 10 minutes - search results stay fresh longer
        gcTime: 30 * 60 * 1000, // 30 minutes - keep search cache longer
    });
};


