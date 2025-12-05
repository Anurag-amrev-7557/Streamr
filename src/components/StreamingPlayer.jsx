import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect, memo, useDeferredValue } from 'react';
import { X, Settings, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { STREAMING_SERVICES, DEFAULT_STREAMING_SERVICE } from '../lib/constants';
import CustomDropdown from './CustomDropdown';

// ============================================================================
// STATIC COMPUTATIONS (Outside component for maximum performance)
// ============================================================================

/**
 * Pre-computed dropdown options - computed once at module load
 * Eliminates Object.entries() mapping on every render
 */
const DROPDOWN_OPTIONS = Object.freeze(
    Object.entries(STREAMING_SERVICES).map(([key, service]) => ({
        value: key,
        label: service.name,
        description: service.description
    }))
);

/**
 * Pre-computed service domains for connection warmup
 */
const SERVICE_DOMAINS = Object.freeze(
    [...new Set(
        Object.values(STREAMING_SERVICES).map(service => {
            try {
                return new URL(service.baseUrl).origin;
            } catch {
                return null;
            }
        }).filter(Boolean)
    )]
);

/**
 * Builds streaming URL for a service - pure function for memoization
 * @param {Object} service - Streaming service configuration
 * @param {string|number} movieId - Movie/TV show ID
 * @param {string} type - 'movie' or 'tv'
 * @param {number} season - Season number for TV shows
 * @param {number} episode - Episode number for TV shows
 * @returns {string} Complete streaming URL
 */
const buildStreamUrl = (service, movieId, type, season, episode) => {
    if (!service || !movieId) return null;

    let url = service.baseUrl;
    if (type === 'movie') {
        url += service.movieFormat.replace('{id}', movieId);
    } else {
        url += service.tvFormat
            .replace('{id}', movieId)
            .replace('{season}', season)
            .replace('{episode}', episode);
    }
    return url;
};

// ============================================================================
// CONNECTION PRELOADER COMPONENT
// ============================================================================

/**
 * Invisible component that adds preconnect hints for all streaming services
 * Improves initial connection time by ~100-300ms
 */
const ConnectionPreloader = memo(() => (
    <>
        {SERVICE_DOMAINS.map(domain => (
            <link
                key={domain}
                rel="preconnect"
                href={domain}
                crossOrigin="anonymous"
            />
        ))}
    </>
));
ConnectionPreloader.displayName = 'ConnectionPreloader';

// ============================================================================
// ANIMATION VARIANTS (Static - never recreated)
// ============================================================================

const ANIMATION_VARIANTS = Object.freeze({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, pointerEvents: 'none' }
});

// ============================================================================
// MAIN STREAMING PLAYER COMPONENT
// ============================================================================

const StreamingPlayer = memo(({ movie, type = 'movie', season = 1, episode = 1, onClose }) => {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    const [currentService, setCurrentService] = useState(() => {
        return localStorage.getItem('preferredService') || DEFAULT_STREAMING_SERVICE;
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Debounce service changes to prevent rapid iframe reloads
    const deferredService = useDeferredValue(currentService);

    // ========================================================================
    // REFS
    // ========================================================================

    // Store onClose in ref to prevent effect recreation
    const onCloseRef = useRef(onClose);

    // Track container for potential visibility detection
    const containerRef = useRef(null);

    // Track if we've saved to localStorage to avoid redundant writes
    const lastSavedServiceRef = useRef(currentService);

    // ========================================================================
    // MEMOIZED COMPUTATIONS
    // ========================================================================

    /**
     * Compute iframe URL only when dependencies change
     * Uses deferred service to batch rapid changes
     */
    const iframeUrl = useMemo(() => {
        if (!movie?.id) return null;
        const service = STREAMING_SERVICES[deferredService] || STREAMING_SERVICES[DEFAULT_STREAMING_SERVICE];
        return buildStreamUrl(service, movie.id, type, season, episode);
    }, [deferredService, movie?.id, type, season, episode]);

    /**
     * Container style with conditional will-change for animation optimization
     */
    const containerStyle = useMemo(() => ({
        willChange: isLoading ? 'opacity' : 'auto'
    }), [isLoading]);

    // ========================================================================
    // STABLE CALLBACK HANDLERS
    // ========================================================================

    /**
     * Memoized render function for dropdown value display
     */
    const renderDropdownValue = useCallback((val) => (
        <>
            <Settings className="w-4 h-4" />
            <span className="font-medium text-sm inline">
                Server: {STREAMING_SERVICES[val]?.name}
            </span>
        </>
    ), []);

    /**
     * Memoized render function for dropdown options
     */
    const renderDropdownOption = useCallback((option) => (
        <div className="flex items-center justify-between w-full">
            <span>{option.label}</span>
            <span className="text-xs text-gray-500">
                {option.description}
            </span>
        </div>
    ), []);

    /**
     * Handle iframe load completion
     */
    const handleIframeLoad = useCallback(() => {
        setIsLoading(false);
    }, []);

    /**
     * Stop event propagation for overlay clicks
     */
    const handleContainerClick = useCallback((e) => {
        e.stopPropagation();
    }, []);

    /**
     * Handle close button click
     */
    const handleCloseClick = useCallback(() => {
        onCloseRef.current?.();
    }, []);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    /**
     * Keep onClose ref updated
     */
    useLayoutEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    /**
     * Handle loading state and localStorage persistence
     * Only triggers loading when URL actually changes
     */
    useEffect(() => {
        if (!movie?.id) return;

        // Set loading when URL dependencies change
        setIsLoading(true);

        // Persist service preference (debounced via deferred value)
        if (lastSavedServiceRef.current !== deferredService) {
            localStorage.setItem('preferredService', deferredService);
            lastSavedServiceRef.current = deferredService;
        }
    }, [deferredService, movie?.id, type, season, episode]);

    /**
     * Keyboard event handler with stable reference
     */
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCloseRef.current?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // Empty deps - uses ref for onClose

    /**
     * Smart prefetching for next episode (TV shows only)
     * Prefetches the next episode URL to enable instant switching
     */
    useEffect(() => {
        if (type !== 'tv' || !movie?.id) return;

        const service = STREAMING_SERVICES[deferredService] || STREAMING_SERVICES[DEFAULT_STREAMING_SERVICE];
        const nextEpisodeUrl = buildStreamUrl(service, movie.id, type, season, episode + 1);

        if (!nextEpisodeUrl) return;

        // Create prefetch link for next episode
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = nextEpisodeUrl;
        link.as = 'document';
        document.head.appendChild(link);

        return () => {
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }
        };
    }, [deferredService, movie?.id, type, season, episode]);

    // ========================================================================
    // EARLY RETURN
    // ========================================================================

    if (!movie || !movie.id) return null;

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <>
            {/* Connection warmup links (rendered once) */}
            <ConnectionPreloader />

            <motion.div
                ref={containerRef}
                {...ANIMATION_VARIANTS}
                onClick={handleContainerClick}
                className="fixed inset-0 z-[100] bg-black"
                style={containerStyle}
            >
                {/* Loading Spinner */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 flex items-center justify-center z-10"
                        >
                            <Loader2 className="w-10 h-10 text-white animate-spin" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Iframe Container with Priority Hints */}
                <iframe
                    src={iframeUrl}
                    className={`w-full h-full border-none transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Streaming Player"
                    onLoad={handleIframeLoad}
                    loading="eager"
                    // @ts-ignore - fetchpriority is valid but not in types
                    fetchpriority="high"
                />

                {/* Service Toggler - Left */}
                <div
                    className="absolute top-4 left-4 md:left-8 z-20"
                    onClick={handleContainerClick}
                >
                    <CustomDropdown
                        value={currentService}
                        options={DROPDOWN_OPTIONS}
                        onChange={setCurrentService}
                        isOpen={isDropdownOpen}
                        setIsOpen={setIsDropdownOpen}
                        buttonClassName="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full border border-white/20 backdrop-blur-md"
                        menuClassName="w-64"
                        renderValue={renderDropdownValue}
                        renderOption={renderDropdownOption}
                    />
                </div>

                {/* Close Button - Right */}
                <div className="absolute top-4 right-4 md:right-8 z-20">
                    <button
                        onClick={handleCloseClick}
                        className="bg-black/60 hover:bg-black/80 p-2 rounded-full transition text-white border border-white/20 backdrop-blur-md"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </motion.div>
        </>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for React.memo
    // Only re-render when these critical props actually change
    return (
        prevProps.movie?.id === nextProps.movie?.id &&
        prevProps.type === nextProps.type &&
        prevProps.season === nextProps.season &&
        prevProps.episode === nextProps.episode
        // Note: onClose is intentionally NOT compared - we use ref for stability
    );
});

StreamingPlayer.displayName = 'StreamingPlayer';

export default StreamingPlayer;
