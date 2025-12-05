import { useMemo, useEffect } from 'react';
import {
    useEpisodes,
    usePrefetchSeasonEpisodes,
    useAggregatedModalData,
    useModalSimilar,
    usePrefetchModalData
} from './useTMDB';

export const useModalData = (movie, modalEnabled, selectedSeason) => {
    const isTv = !!movie?.first_air_date;
    const type = isTv ? 'tv' : 'movie';

    // 1. Aggregated Data (Details, Credits, Images, Videos) - ONE Request
    const {
        data: aggregatedData,
        isLoading: isAggregatedLoading,
        isError: isAggregatedError,
        refetch: refetchAggregated
    } = useAggregatedModalData(movie?.id, type, modalEnabled);

    // 2. Similar Movies/Shows - Separate Request (Heavy computation on backend)
    const {
        data: similarData,
        isLoading: isSimilarLoading,
        isError: isSimilarError,
        refetch: refetchSimilar
    } = useModalSimilar(movie?.id, type, modalEnabled);

    // 3. Episodes - Separate Request (TV Only, potentially large)
    const {
        data: episodes = [],
        isLoading: isEpisodesLoading,
        isError: isEpisodesError,
        refetch: refetchEpisodes
    } = useEpisodes(
        movie?.id,
        selectedSeason,
        isTv && modalEnabled
    );

    // Derived Data from Aggregated Response
    const movieDetails = aggregatedData; // Root object is details
    const imagesData = aggregatedData?.images;
    const creditsData = aggregatedData?.credits;
    const videosData = aggregatedData?.videos;

    // Loading State
    const isHeroLoading = isAggregatedLoading;

    // Error State
    const hasError = isAggregatedError || isSimilarError;

    // Derive computed values
    const logoPath = useMemo(() => {
        if (!imagesData?.logos) return null;
        const englishLogo = imagesData.logos.find(logo => logo.iso_639_1 === 'en');
        const logo = englishLogo || imagesData.logos[0];
        return logo?.file_path || null;
    }, [imagesData]);

    const cast = useMemo(() => {
        return creditsData?.cast?.slice(0, 10) || [];
    }, [creditsData]);

    const similarMovies = useMemo(() => {
        return similarData?.results?.slice(0, 8) || [];
    }, [similarData]);

    const trailerKey = useMemo(() => {
        if (!videosData?.results) return null;
        const videos = videosData.results;
        const trailer = videos.find(video =>
            video.type === 'Trailer' && video.site === 'YouTube'
        ) || videos.find(video => video.site === 'YouTube');
        return trailer?.key || null;
    }, [videosData]);

    const director = useMemo(() => {
        if (!creditsData?.crew) return null;
        return creditsData.crew.find(person => person.job === 'Director');
    }, [creditsData]);

    const creators = useMemo(() => {
        if (!movieDetails?.created_by) return [];
        return movieDetails.created_by;
    }, [movieDetails]);

    // Preload logo image for instant display
    useEffect(() => {
        if (!logoPath) return;
        const img = new Image();
        img.src = `https://image.tmdb.org/t/p/w500${logoPath}`;
    }, [logoPath]);

    // Prefetch hook for next/previous seasons
    const { prefetchSeasonEpisodes } = usePrefetchSeasonEpisodes();

    // Prefetch adjacent seasons AFTER initial modal data is loaded
    useEffect(() => {
        if (!movie?.id || !isTv || !movieDetails?.number_of_seasons) return;
        if (isHeroLoading || isEpisodesLoading) return; // Wait for initial load to complete

        // Skip prefetching on slow connections or data saver
        if (navigator.connection?.saveData || (navigator.connection?.effectiveType && ['slow-2g', '2g'].includes(navigator.connection.effectiveType))) {
            return;
        }

        const totalSeasons = movieDetails.number_of_seasons;

        // Use requestIdleCallback to defer prefetching until after render
        const prefetch = () => {
            // Prefetch next season if it exists
            if (selectedSeason < totalSeasons) {
                prefetchSeasonEpisodes(movie.id, selectedSeason + 1);
            }

            // Prefetch previous season if it exists
            if (selectedSeason > 1) {
                prefetchSeasonEpisodes(movie.id, selectedSeason - 1);
            }
        };

        let idleCallbackId;
        if (window.requestIdleCallback) {
            idleCallbackId = window.requestIdleCallback(prefetch);
        } else {
            idleCallbackId = setTimeout(prefetch, 1000);
        }

        return () => {
            if (window.cancelIdleCallback) {
                window.cancelIdleCallback(idleCallbackId);
            } else {
                clearTimeout(idleCallbackId);
            }
        };
    }, [movie?.id, selectedSeason, movieDetails?.number_of_seasons, isTv, isHeroLoading, isEpisodesLoading, prefetchSeasonEpisodes]);

    // Prefetch details for top similar movies
    const { prefetchModalData } = usePrefetchModalData();

    useEffect(() => {
        if (!similarData?.results || similarData.results.length === 0) return;

        // Skip prefetching on slow connections
        if (navigator.connection?.saveData || (navigator.connection?.effectiveType && ['slow-2g', '2g'].includes(navigator.connection.effectiveType))) {
            return;
        }

        // Prefetch top 3 similar movies for instant navigation
        const topSimilar = similarData.results.slice(0, 3);

        // Use requestIdleCallback to avoid blocking main thread during animation
        const prefetch = () => {
            topSimilar.forEach(movie => {
                prefetchModalData(movie);
            });
        };

        if (window.requestIdleCallback) {
            window.requestIdleCallback(prefetch);
        } else {
            setTimeout(prefetch, 2000); // Increased delay
        }
    }, [similarData, prefetchModalData]);

    return {
        imagesData, // Extracted from aggregated
        movieDetails, // Extracted from aggregated (is the root)
        creditsData, // Extracted from aggregated
        similarData, // Separate
        videosData, // Extracted from aggregated
        episodes, // Separate
        isEpisodesLoading,
        isLoading: isHeroLoading, // Backward compatibility
        isHeroLoading,
        isSimilarLoading,
        isVideosLoading: isAggregatedLoading, // Proxied
        logoPath,
        cast,
        similarMovies,
        trailerKey,
        director,
        creators,
        // Error states
        hasError,
        isImagesError: isAggregatedError,
        isDetailsError: isAggregatedError,
        isCreditsError: isAggregatedError,
        isSimilarError,
        isVideosError: isAggregatedError,
        isEpisodesError,
        // Refetch functions
        refetchAll: () => {
            refetchAggregated();
            refetchSimilar();
            if (isTv) refetchEpisodes();
        },
        refetchSimilar,
        refetchEpisodes
    };
};
