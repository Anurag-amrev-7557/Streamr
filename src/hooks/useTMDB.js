import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import tmdb from '../lib/tmdb';
import requests from '../lib/requests';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { performance } from '../utils/performance';

// Optimized cache times
const STALE_TIME = 30 * 60 * 1000; // 30 minutes - increased for better caching
const GC_TIME = 45 * 60 * 1000; // 45 minutes - increased to retain prefetched data longer

/**
 * Query Key Factory Pattern
 * Provides type-safe, consistent query keys with easy invalidation
 */
export const queryKeys = {
    // Row data keys
    row: {
        all: ['row'],
        list: (title) => [...queryKeys.row.all, title],
        detail: (title, url) => [...queryKeys.row.all, title, url],
    },
    // Modal data keys
    images: {
        all: ['images'],
        byType: (type) => [...queryKeys.images.all, type],
        detail: (type, id) => [...queryKeys.images.all, type, id],
    },
    details: {
        all: ['details'],
        byType: (type) => [...queryKeys.details.all, type],
        detail: (type, id) => [...queryKeys.details.all, type, id],
    },
    credits: {
        all: ['credits'],
        byType: (type) => [...queryKeys.credits.all, type],
        detail: (type, id) => [...queryKeys.credits.all, type, id],
    },
    similar: {
        all: ['similar'],
        byType: (type) => [...queryKeys.similar.all, type],
        detail: (type, id) => [...queryKeys.similar.all, type, id],
    },
    videos: {
        all: ['videos'],
        byType: (type) => [...queryKeys.videos.all, type],
        detail: (type, id) => [...queryKeys.videos.all, type, id],
    },
    episodes: {
        all: ['episodes'],
        byShow: (showId) => [...queryKeys.episodes.all, showId],
        bySeason: (showId, season) => [...queryKeys.episodes.all, showId, season],
    },
    search: {
        all: ['search'],
        suggestions: (query) => ['searchSuggestions', query],
        results: (query, filters, page, sortBy) => ['search', query, filters, page, sortBy],
        infinite: (query, filters, sortBy) => ['infiniteSearch', query, filters, sortBy],
        trending: ['trendingSearches'],
    },
    person: {
        all: ['person'],
        detail: (id) => [...queryKeys.person.all, id],
    },
    notifications: {
        all: ['notifications'],
    },
    modal: {
        all: ['modal'],
        detail: (type, id) => [...queryKeys.modal.all, type, id],
    }
};

export const useNotifications = () => {
    return useQuery({
        queryKey: queryKeys.notifications.all,
        queryFn: async () => {
            const [movieRes, tvRes] = await Promise.all([
                tmdb.get('/movie/upcoming'),
                tmdb.get('/tv/on_the_air')
            ]);

            const movies = (movieRes.data.results || []).map(item => ({
                id: item.id,
                title: item.title,
                release_date: item.release_date,
                type: 'movie',
                poster_path: item.poster_path
            }));

            const tvShows = (tvRes.data.results || []).map(item => ({
                id: item.id,
                title: item.name,
                release_date: item.first_air_date,
                type: 'tv',
                poster_path: item.poster_path
            }));

            const combined = [...movies, ...tvShows]
                .filter(n => n.release_date)
                .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

            return combined;
        },
        staleTime: 24 * 60 * 60 * 1000, // 24 hours - highly static data
        gcTime: 24 * 60 * 60 * 1000,
        retry: 2,
    });
};
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
            const markName = `fetch-row-${title}`;
            performance.mark(`${markName}-start`);
            const { data } = await tmdb.get(fetchUrl);
            performance.mark(`${markName}-end`);
            performance.measure(`Fetch Row: ${title}`, `${markName}-start`, `${markName}-end`);
            return data.results;
        },
        enabled: !!fetchUrl,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
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

// Modal data hooks - these use the cached data from prefetching
export const useModalImages = (movieId, type, enabled = true) => {
    return useQuery({
        queryKey: ['images', type, movieId],
        queryFn: async () => {
            const { data } = await tmdb.get(`/${type}/${movieId}/images`);
            return data;
        },
        enabled: enabled && !!movieId && !!type,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnReconnect: true,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

export const useModalDetails = (movieId, type, enabled = true) => {
    return useQuery({
        queryKey: ['details', type, movieId],
        queryFn: async () => {
            const { data } = await tmdb.get(`/${type}/${movieId}`);
            return data;
        },
        enabled: enabled && !!movieId && !!type,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnReconnect: true,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

export const useModalCredits = (movieId, type, enabled = true) => {
    return useQuery({
        queryKey: ['credits', type, movieId],
        queryFn: async () => {
            const { data } = await tmdb.get(`/${type}/${movieId}/credits`);
            return data;
        },
        enabled: enabled && !!movieId && !!type,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnReconnect: true,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

export const useModalSimilar = (movieId, type, enabled = true) => {
    return useQuery({
        queryKey: ['similar', type, movieId],
        queryFn: async () => {
            // Use our advanced backend endpoint instead of direct TMDB proxy
            const { data } = await tmdb.get(`/recommendations/${type}/${movieId}`);
            return data;
        },
        enabled: enabled && !!movieId && !!type,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnReconnect: true,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

export const useModalVideos = (movieId, type, enabled = true) => {
    return useQuery({
        queryKey: ['videos', type, movieId],
        queryFn: async () => {
            const { data } = await tmdb.get(`/${type}/${movieId}/videos`);
            return data;
        },
        enabled: enabled && !!movieId && !!type,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnReconnect: true,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

// Aggregated Modal Data Hook
export const useAggregatedModalData = (movieId, type, enabled = true) => {
    return useQuery({
        queryKey: queryKeys.modal.detail(type, movieId),
        queryFn: async () => {
            // Fetch everything in one go from our new optimized endpoint
            const { data } = await tmdb.get(`/modal/${type}/${movieId}`);
            return data;
        },
        enabled: enabled && !!movieId && !!type,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnReconnect: true,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

export const usePersonDetails = (personId, enabled = true) => {
    return useQuery({
        queryKey: ['person', personId],
        queryFn: async () => {
            const [details, credits, externalIds, images] = await Promise.all([
                tmdb.get(`/person/${personId}`),
                tmdb.get(`/person/${personId}/combined_credits`),
                tmdb.get(`/person/${personId}/external_ids`),
                tmdb.get(`/person/${personId}/images`)
            ]);

            return {
                ...details.data,
                credits: credits.data,
                external_ids: externalIds.data,
                images: images.data
            };
        },
        enabled: enabled && !!personId,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

// Prefetch utilities for modal data
export const usePrefetchModalData = () => {
    const queryClient = useQueryClient();

    const prefetchModalData = useCallback(async (movie) => {
        if (!movie?.id) return;

        const isTv = !!movie.first_air_date;
        const type = isTv ? 'tv' : 'movie';
        const id = movie.id;

        // Optimized prefetch: Grab everything in one request
        const prefetchPromises = [
            queryClient.prefetchQuery({
                queryKey: queryKeys.modal.detail(type, id),
                queryFn: async () => {
                    const { data } = await tmdb.get(`/modal/${type}/${id}`);
                    return data;
                },
                staleTime: STALE_TIME,
            }).then(() => {
                // Preload the logo image file from the aggregated data
                const data = queryClient.getQueryData(queryKeys.modal.detail(type, id));
                if (data?.images?.logos) {
                    const englishLogo = data.images.logos.find(logo => logo.iso_639_1 === 'en');
                    const logo = englishLogo || data.images.logos[0];
                    if (logo?.file_path) {
                        const img = new Image();
                        img.src = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
                    }
                }
            }),
            // Keep prefetching recommendations (Similar) as it is still a separate heavyweight request
            queryClient.prefetchQuery({
                queryKey: ['similar', type, id],
                queryFn: async () => {
                    const { data } = await tmdb.get(`/recommendations/${type}/${id}`);
                    return data;
                },
                staleTime: STALE_TIME,
            })
        ];

        // If it's a TV show, also prefetch first season episodes (remains separate)
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
    }, [queryClient]);

    return { prefetchModalData };
};

// Intersection Observer hook for rows
export const useIntersectionPrefetch = (callback, options = {}) => {
    const elementRef = useRef(null);
    const hasPrefetched = useRef(false);

    // Memoize options to prevent observer recreation
    const observerOptions = useMemo(() => ({ // eslint-disable-line react-hooks/preserve-manual-memoization
        rootMargin: '400px', // Start prefetching 400px before element enters viewport (increased from 200px)
        threshold: 0.1,
        ...options,
    }), [options.rootMargin, options.threshold]); // eslint-disable-line react-hooks/exhaustive-deps

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
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnReconnect: true,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
    });
};

// Utility to prefetch episodes for a specific season
// Utility to prefetch episodes for a specific season
export const usePrefetchSeasonEpisodes = () => {
    const queryClient = useQueryClient();

    const prefetchSeasonEpisodes = useCallback(async (movieId, seasonNumber) => {
        if (!movieId || !seasonNumber) return;

        await queryClient.prefetchQuery({
            queryKey: ['episodes', movieId, seasonNumber],
            queryFn: async () => {
                const { data } = await tmdb.get(`/tv/${movieId}/season/${seasonNumber}`);
                return data.episodes || [];
            },
            staleTime: STALE_TIME,
        });
    }, [queryClient]);

    return { prefetchSeasonEpisodes };
};

// Helper to build search parameters
const buildSearchParams = (query, page, limit, sortBy, filters) => {
    const params = new URLSearchParams({
        query: query.trim(),
        page: page.toString(),
        limit: limit.toString(),
        sortBy
    });

    if (filters.mediaType && filters.mediaType !== 'all') {
        params.append('mediaType', filters.mediaType);
    }
    if (filters.yearStart) {
        params.append('yearStart', filters.yearStart.toString());
    }
    if (filters.yearEnd) {
        params.append('yearEnd', filters.yearEnd.toString());
    }
    if (filters.minRating) {
        params.append('minRating', filters.minRating.toString());
    }
    if (filters.genres && filters.genres.length > 0) {
        params.append('genres', filters.genres.join(','));
    }

    return params;
};

// Enhanced Search hook with filters, pagination, and sorting
export const useSearch = (query, filters = {}, options = {}) => {
    const {
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        enabled = true
    } = options;

    return useQuery({
        queryKey: ['search', query, filters, page, sortBy],
        queryFn: async () => {
            if (!query || !query.trim()) {
                return {
                    results: [],
                    pagination: {
                        page: 1,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    }
                };
            }

            const params = buildSearchParams(query, page, limit, sortBy, filters);
            const { data } = await tmdb.get(`/search/multi?${params.toString()}`);
            return data;
        },
        enabled: enabled && !!query && query.trim().length > 0,
        staleTime: 15 * 60 * 1000, // 15 minutes - search results stay fresh longer
        gcTime: 30 * 60 * 1000, // 30 minutes - keep search cache longer
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
        placeholderData: (previousData) => previousData, // Keep previous results while fetching new ones
    });
};

// Search Suggestions Hook (for autocomplete)
export const useSearchSuggestions = (query, enabled = true) => {
    return useQuery({
        queryKey: ['searchSuggestions', query],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (query && query.trim()) {
                params.append('query', query.trim());
            }

            const { data } = await tmdb.get(`/search/suggestions?${params.toString()}`);
            return data;
        },
        enabled: enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes - suggestions change more frequently
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: false, // Don't retry suggestions, fail fast
        placeholderData: (previousData) => previousData, // Keep previous suggestions while typing
    });
};

// Trending Searches Hook
export const useTrendingSearches = () => {
    return useQuery({
        queryKey: ['trendingSearches'],
        queryFn: async () => {
            const { data } = await tmdb.get('/search/trending');
            return data;
        },
        staleTime: 60 * 60 * 1000, // 1 hour - trending changes slowly
        gcTime: 2 * 60 * 60 * 1000, // 2 hours
        retry: 1,
    });
};

// Infinite scroll search hook using useInfiniteQuery
export const useInfiniteSearch = (query, filters = {}, sortBy = 'relevance', enabled = true) => {


    return useInfiniteQuery({
        queryKey: ['infiniteSearch', query, filters, sortBy],
        queryFn: async ({ pageParam = 1 }) => {
            if (!query || !query.trim()) {
                return {
                    results: [],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    }
                };
            }

            const params = buildSearchParams(query, pageParam, 20, sortBy, filters);
            const { data } = await tmdb.get(`/search/multi?${params.toString()}`);
            return data;
        },
        getNextPageParam: (lastPage) => {
            if (lastPage?.pagination?.hasMore) {
                return lastPage.pagination.page + 1;
            }
            return undefined;
        },
        enabled: enabled && !!query && query.trim().length > 0,
        staleTime: 15 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        placeholderData: (previousData) => previousData, // Keep previous infinite data while refetching
    });
};



