import { useState, useEffect } from 'react';

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < breakpoint;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

        const handleChange = (e) => {
            setIsMobile(e.matches);
        };

        // Update state only if it differs from current
        if (mediaQuery.matches !== isMobile) {
            setIsMobile(mediaQuery.matches); // eslint-disable-line react-hooks/set-state-in-effect
        }

        // Add listener
        // Modern browsers support addEventListener on MediaQueryList, but older ones use addListener
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            mediaQuery.addListener(handleChange);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, [breakpoint, isMobile]); // Added isMobile to dependency array to ensure the `if (mediaQuery.matches !== isMobile)` check is always based on the latest state.

    return isMobile;
};

export default useIsMobile;
