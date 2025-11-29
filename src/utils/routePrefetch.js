/**
 * Smart Route Prefetching Utility
 * Handles intelligent prefetching with deduplication, idle callback, and network awareness
 */

// Track prefetched routes to avoid duplicates
const prefetchedRoutes = new Set();
const prefetchPromises = new Map();

/**
 * Check if connection is fast enough for prefetching
 */
const isFastConnection = () => {
    if (!navigator.connection) return true; // Assume fast if not supported

    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;

    // Only prefetch on 4g or faster
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return false;
    }

    // Don't prefetch if user has data saver enabled
    if (connection.saveData) {
        return false;
    }

    return true;
};

/**
 * Prefetch a route using dynamic import with smart timing
 * @param {string} routeName - Name of the route (e.g., 'Movies', 'Series', 'MyList')
 * @param {Function} importFn - Import function for the route
 * @param {Object} options - Prefetch options
 */
export const prefetchRoute = (routeName, importFn, options = {}) => {
    const {
        useIdleCallback = true,
        priority = 'low',
        force = false
    } = options;

    // Skip if already prefetched
    if (prefetchedRoutes.has(routeName) && !force) {
        return prefetchPromises.get(routeName);
    }

    // Check network conditions
    if (!isFastConnection() && !force) {
        return Promise.resolve();
    }

    // Mark as prefetched immediately to prevent duplicates
    prefetchedRoutes.add(routeName);

    const doPrefetch = () => {
        const promise = importFn()
            .then(() => {
            })
            .catch((err) => {
                console.error(`[Prefetch] ✗ ${routeName} failed:`, err);
                // Remove from cache on failure so it can retry
                prefetchedRoutes.delete(routeName);
                prefetchPromises.delete(routeName);
            });

        prefetchPromises.set(routeName, promise);
        return promise;
    };

    // Use requestIdleCallback for low priority prefetching
    if (useIdleCallback && priority === 'low' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => doPrefetch(), { timeout: 2000 });
    } else {
        // High priority - prefetch immediately
        return doPrefetch();
    }
};

/**
 * Prefetch all critical routes after initial load
 */
export const prefetchCriticalRoutes = () => {
    const routes = [
        { name: 'Movies', import: () => import('../pages/Movies') },
        { name: 'Series', import: () => import('../pages/Series') },
        { name: 'MyList', import: () => import('../pages/MyList') }
    ];

    routes.forEach(({ name, import: importFn }) => {
        prefetchRoute(name, importFn, { useIdleCallback: true, priority: 'low' });
    });
};

/**
 * Prefetch route on user interaction (hover/touch)
 * Higher priority, immediate execution
 */
export const prefetchOnInteraction = (routeName, importFn) => {
    prefetchRoute(routeName, importFn, { useIdleCallback: false, priority: 'high' });
};

/**
 * Reset prefetch cache (useful for development)
 */
export const resetPrefetchCache = () => {
    prefetchedRoutes.clear();
    prefetchPromises.clear();
};
