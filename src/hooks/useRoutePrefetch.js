import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom hook to prefetch route data in the background.
 * @param {Array<{key: string, url: string}>} categories - Array of categories to prefetch.
 */
const useRoutePrefetch = (categories) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const prefetchRoutes = async () => {
            // Check for Save-Data preference
            if (navigator.connection?.saveData) {
                console.log('Skipping prefetch due to Save-Data preference');
                return;
            }

            // Check for slow connection (2g or 3g)
            if (navigator.connection?.effectiveType && ['slow-2g', '2g', '3g'].includes(navigator.connection.effectiveType)) {
                console.log(`Skipping prefetch due to slow connection: ${navigator.connection.effectiveType}`);
                return;
            }

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

            await Promise.allSettled(
                categories.map(category => prefetchCategory(category.key, category.url))
            );
        };

        const startPrefetch = () => {
            // Defer prefetching significantly to avoid critical path contention
            // Wait for 4 seconds to ensure LCP and other critical resources are loaded
            setTimeout(() => {
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(prefetchRoutes);
                } else {
                    setTimeout(prefetchRoutes, 100);
                }
            }, 4000);
        }

        startPrefetch();
    }, [queryClient, categories]); // categories should be stable (memoized or constant)
};

export default useRoutePrefetch;
