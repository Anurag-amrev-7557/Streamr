import { useSyncExternalStore, useCallback, useMemo } from 'react';

// Shared MediaQueryList cache to prevent duplicate subscriptions
const mediaQueryCache = new Map();

/**
 * Get or create a cached MediaQueryList for a breakpoint
 * @param {number} breakpoint - The pixel breakpoint
 * @returns {MediaQueryList|null}
 */
const getMediaQuery = (breakpoint) => {
    if (typeof window === 'undefined') return null;

    const key = breakpoint;
    if (!mediaQueryCache.has(key)) {
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        mediaQueryCache.set(key, mql);
    }
    return mediaQueryCache.get(key);
};

/**
 * Server-side snapshot - always return false for SSR
 */
const getServerSnapshot = () => false;

/**
 * Optimized useIsMobile hook using useSyncExternalStore
 * - Proper React 18 concurrent mode support
 * - Shared MediaQueryList subscriptions across components
 * - SSR-safe with consistent hydration
 * 
 * @param {number} breakpoint - The pixel breakpoint (default: 768)
 * @returns {boolean} - Whether the viewport is mobile-sized
 */
const useIsMobile = (breakpoint = 768) => {
    // Subscribe to MediaQueryList changes
    const subscribe = useCallback((onStoreChange) => {
        const mql = getMediaQuery(breakpoint);
        if (!mql) return () => { };

        // Modern API (most browsers)
        if (mql.addEventListener) {
            mql.addEventListener('change', onStoreChange);
            return () => mql.removeEventListener('change', onStoreChange);
        }

        // Legacy API (Safari < 14)
        mql.addListener(onStoreChange);
        return () => mql.removeListener(onStoreChange);
    }, [breakpoint]);

    // Get the current snapshot of the media query state
    const getSnapshot = useCallback(() => {
        const mql = getMediaQuery(breakpoint);
        return mql ? mql.matches : false;
    }, [breakpoint]);

    // Use useSyncExternalStore for tear-free reads in concurrent mode
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export default useIsMobile;
