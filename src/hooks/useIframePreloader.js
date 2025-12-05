import { useEffect, useRef } from 'react';

/**
 * Custom hook for intelligent iframe connection preloading
 * 
 * Features:
 * - Preconnects to all streaming service domains on mount
 * - DNS prefetches the current service for faster resolution
 * - Cleans up link elements on unmount
 * 
 * @param {Object} services - Map of streaming service configurations
 * @param {string} currentService - Key of the currently selected service
 * 
 * @example
 * useIframePreloader(STREAMING_SERVICES, 'MOVIES111');
 */
export const useIframePreloader = (services, currentService) => {
    const linksRef = useRef([]);
    const dnsPrefetchRef = useRef(null);

    // Preconnect to all services on mount
    useEffect(() => {
        if (!services || typeof services !== 'object') return;

        const domains = new Set();

        Object.values(services).forEach(service => {
            try {
                const domain = new URL(service.baseUrl).origin;
                domains.add(domain);
            } catch {
                // Invalid URL, skip
            }
        });

        const links = [];
        domains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
            links.push(link);
        });

        linksRef.current = links;

        return () => {
            linksRef.current.forEach(link => {
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
            });
            linksRef.current = [];
        };
    }, [services]);

    // DNS prefetch for current service (changes with service selection)
    useEffect(() => {
        if (!services || !currentService) return;

        const service = services[currentService];
        if (!service?.baseUrl) return;

        try {
            const domain = new URL(service.baseUrl).origin;

            // Remove previous DNS prefetch
            if (dnsPrefetchRef.current?.parentNode) {
                dnsPrefetchRef.current.parentNode.removeChild(dnsPrefetchRef.current);
            }

            // Create new DNS prefetch for current service
            const dnsPrefetch = document.createElement('link');
            dnsPrefetch.rel = 'dns-prefetch';
            dnsPrefetch.href = domain;
            document.head.appendChild(dnsPrefetch);
            dnsPrefetchRef.current = dnsPrefetch;
        } catch {
            // Invalid URL, skip
        }

        return () => {
            if (dnsPrefetchRef.current?.parentNode) {
                dnsPrefetchRef.current.parentNode.removeChild(dnsPrefetchRef.current);
                dnsPrefetchRef.current = null;
            }
        };
    }, [services, currentService]);
};

/**
 * Hook to prefetch the next episode URL for TV shows
 * 
 * @param {Object} params - Configuration object
 * @param {string} params.type - Content type ('movie' or 'tv')
 * @param {string|number} params.movieId - Movie/TV show ID
 * @param {number} params.season - Current season number
 * @param {number} params.episode - Current episode number
 * @param {Object} params.service - Current streaming service config
 * @param {Function} params.buildUrl - Function to build streaming URL
 */
export const useNextEpisodePrefetch = ({
    type,
    movieId,
    season,
    episode,
    service,
    buildUrl
}) => {
    const linkRef = useRef(null);

    useEffect(() => {
        // Only prefetch for TV shows
        if (type !== 'tv' || !movieId || !service || !buildUrl) return;

        try {
            const nextEpisodeUrl = buildUrl(service, movieId, type, season, episode + 1);

            if (!nextEpisodeUrl) return;

            // Remove previous prefetch link
            if (linkRef.current?.parentNode) {
                linkRef.current.parentNode.removeChild(linkRef.current);
            }

            // Create prefetch link for next episode
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = nextEpisodeUrl;
            link.as = 'document';
            document.head.appendChild(link);
            linkRef.current = link;
        } catch {
            // Error building URL, skip
        }

        return () => {
            if (linkRef.current?.parentNode) {
                linkRef.current.parentNode.removeChild(linkRef.current);
                linkRef.current = null;
            }
        };
    }, [type, movieId, season, episode, service, buildUrl]);
};

export default useIframePreloader;
