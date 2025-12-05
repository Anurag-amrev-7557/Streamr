import { useState, useRef, useCallback, useEffect, memo, useMemo, useDeferredValue } from 'react';
import PropTypes from 'prop-types';
import { useRowData, usePrefetchModalData } from '../hooks/useTMDB';
import useIsMobile from '../hooks/useIsMobile';
import clsx from 'clsx';
import Skeleton from './Skeleton';
import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';

// CSS for content-visibility optimization
const cardContainerStyle = {
    contentVisibility: 'auto',
    containIntrinsicSize: 'auto 360px 203px',
};

// Static dimensions lookup - avoids layout thrashing from window.innerWidth
const CARD_DIMENSIONS = {
    desktop: { width: 360, height: 203 },
    tablet: { width: 280, height: 158 },
    mobile: { width: 170, height: 255 },
    cast: { width: 170, height: 227 },
};



// Shared IntersectionObserver for all MovieCards (performance optimization)
class SharedIntersectionObserver {
    constructor() {
        this.observer = null;
        this.callbacks = new Map();
    }

    observe(element, callback) {
        if (!this.observer) {
            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const cb = this.callbacks.get(entry.target);
                        if (cb && entry.isIntersecting) {
                            cb();
                            // Auto-cleanup after intersection
                            this.unobserve(entry.target);
                        }
                    });
                },
                {
                    rootMargin: '800px', // Load earlier for smoother experience
                    threshold: 0.01
                }
            );
        }

        this.callbacks.set(element, callback);
        this.observer.observe(element);
    }

    unobserve(element) {
        if (this.observer) {
            this.observer.unobserve(element);
            this.callbacks.delete(element);
        }
    }

    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.callbacks.clear();
        }
    }
}

// Singleton instance
const sharedObserver = new SharedIntersectionObserver();

// Memoized MovieCard component to prevent unnecessary re-renders
const MovieCard = memo(({
    movie,
    isCast,
    alwaysOverlay,
    onRemove,
    onClick,
    onHover,
    onLeave,
    isDraggingRef,
    cardIndex,
    isMobile, // Now passed from parent - no hook call per card!
    dimensions // Pre-computed dimensions from parent
}) => {
    const cardRef = useRef(null);
    const [isInView, setIsInView] = useState(false);

    // Intersection Observer for lazy loading using shared instance
    useEffect(() => {
        const element = cardRef.current;
        if (!element) return;

        const handleIntersection = () => {
            setIsInView(true);
        };

        sharedObserver.observe(element, handleIntersection);

        return () => {
            sharedObserver.unobserve(element);
        };
    }, []);

    // Event handlers - using stable references with movie.id key
    const handleClick = useCallback(() => {
        if (!isDraggingRef.current) {
            onClick(movie);
        }
    }, [movie, onClick, isDraggingRef]);

    const handleMouseEnter = useCallback(() => {
        onHover(movie);
    }, [movie, onHover]);

    const handleRemove = useCallback((e) => {
        e.stopPropagation();
        onRemove(movie.id);
    }, [movie.id, onRemove]);

    // Determine image source based on type and viewport
    const imageSrc = useMemo(() => {
        if (isCast) {
            return `https://image.tmdb.org/t/p/w342${movie.profile_path}`;
        }
        const path = !isMobile
            ? (movie.backdrop_path || movie.poster_path)
            : (movie.poster_path || movie.backdrop_path);
        return `https://image.tmdb.org/t/p/w342${path}`;
    }, [isCast, movie.profile_path, movie.backdrop_path, movie.poster_path, isMobile]);

    const imageSrcSet = useMemo(() => {
        if (isCast) {
            return `https://image.tmdb.org/t/p/w342${movie.profile_path} 342w, https://image.tmdb.org/t/p/w500${movie.profile_path} 500w`;
        }
        const path = !isMobile
            ? (movie.backdrop_path || movie.poster_path)
            : (movie.poster_path || movie.backdrop_path);
        return `https://image.tmdb.org/t/p/w342${path} 342w, https://image.tmdb.org/t/p/w500${path} 500w`;
    }, [isCast, movie.profile_path, movie.backdrop_path, movie.poster_path, isMobile]);

    return (
        <div
            role="listitem"
            ref={cardRef}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onLeave}
            className="relative flex-shrink-0 w-[170px] md:w-[240px] lg:w-[280px] xl:w-[360px] group/item cursor-pointer"
            style={cardContainerStyle}
        >
            <div className={clsx(
                "bg-[#1a1a1a] rounded-lg overflow-hidden shadow-lg relative",
                isCast ? "aspect-[3/4]" : "aspect-[2/3] md:aspect-[16/9]"
            )}>
                {isInView ? (
                    <img
                        className="w-full h-full object-cover rounded-lg pointer-events-none"
                        src={imageSrc}
                        srcSet={imageSrcSet}
                        sizes="(min-width: 1280px) 360px, (min-width: 1024px) 280px, (min-width: 768px) 240px, 170px"
                        alt={movie.title || movie.name}
                        loading={cardIndex < 4 ? "eager" : "lazy"}
                        fetchPriority={cardIndex < 4 ? "high" : "auto"}
                        decoding="async"
                        width={dimensions.width}
                        height={dimensions.height}
                    />
                ) : (
                    // Placeholder while not in view - using CSS background for better perf
                    <div className="w-full h-full bg-gray-800" aria-hidden="true" />
                )}

                {/* Rating Badge - Hide for Cast */}
                {!isCast && (
                    <div className="absolute top-2 left-2 md:top-2 md:left-2 bg-black/60 px-2 md:px-2 py-1 md:py-1 rounded-md flex items-center gap-1 md:gap-1">
                        <span className="text-white font-bold text-xs md:text-xs">★</span>
                        <span className="text-white font-bold text-xs md:text-xs">{(movie.vote_average || 7.5).toFixed(1)}</span>
                    </div>
                )}

                {/* Overlay Info */}
                <div className={
                    `absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent rounded-lg ${alwaysOverlay ? 'opacity-100' : 'opacity-0'} md:opacity-0 md:group-hover/item:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 md:p-4`
                }>
                    <h3 className="text-xs md:text-base font-bold text-white leading-tight mb-0.5 md:mb-1 drop-shadow-md line-clamp-2">
                        {movie.title || movie.name}
                    </h3>
                    <div className="flex items-center justify-between">
                        <p className="text-xs md:text-sm text-gray-300">
                            {isCast ? movie.character : (movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4) || '2023')}
                        </p>
                        {!isCast && movie.season && movie.episode && (
                            <span className="text-xs md:text-xs font-semibold text-[#fff] bg-black/60 px-1.5 py-0.5 rounded">
                                S{movie.season} E{movie.episode}
                            </span>
                        )}
                    </div>
                </div>

                {/* Remove Button */}
                {onRemove && (
                    <button
                        onClick={handleRemove}
                        className={`absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white ${alwaysOverlay ? 'opacity-100' : 'opacity-0'} md:group-hover/item:opacity-100 hover:bg-[#E50914] transition-all duration-200 z-20`}
                        title="Remove from history"
                        aria-label="Remove from history"
                    >
                        <X className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for memo - optimized for stable references
    return (
        prevProps.movie.id === nextProps.movie.id &&
        prevProps.isCast === nextProps.isCast &&
        prevProps.alwaysOverlay === nextProps.alwaysOverlay &&
        prevProps.onRemove === nextProps.onRemove &&
        prevProps.isMobile === nextProps.isMobile &&
        prevProps.cardIndex === nextProps.cardIndex
    );
});

MovieCard.propTypes = {
    movie: PropTypes.object.isRequired,
    isCast: PropTypes.bool,
    alwaysOverlay: PropTypes.bool,
    onRemove: PropTypes.func,
    onClick: PropTypes.func.isRequired,
    onHover: PropTypes.func.isRequired,
    onLeave: PropTypes.func.isRequired,
    isDraggingRef: PropTypes.object.isRequired,
    cardIndex: PropTypes.number.isRequired,
    isMobile: PropTypes.bool.isRequired,
    dimensions: PropTypes.shape({
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired
    }).isRequired
};

MovieCard.displayName = 'MovieCard';

const Row = ({
    title,
    fetchUrl,
    movies: propMovies,
    onMovieClick,
    onRemove,
    onClearAll,
    alwaysOverlay = false,
    isCast = false,
    onTitleClick
}) => {
    const { data: fetchedMovies = [], isLoading: loading, isError, refetch } = useRowData(fetchUrl, title);

    // Use deferred value for non-urgent movie list updates
    const rawMovies = propMovies || fetchedMovies;
    const movies = useDeferredValue(rawMovies);
    const isLocalData = !!propMovies;

    const { prefetchModalData } = usePrefetchModalData();

    // Hoist useIsMobile to Row level - single hook call for all cards
    const isMobile = useIsMobile();

    // Pre-compute dimensions once per render cycle - no layout thrashing
    const cardDimensions = useMemo(() => {
        if (isCast) return CARD_DIMENSIONS.cast;
        return isMobile ? CARD_DIMENSIONS.mobile : CARD_DIMENSIONS.desktop;
    }, [isCast, isMobile]);

    const rowRef = useRef(null);
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const isDragging = useRef(false);
    const hoverTimeoutRef = useRef(null);

    // Simplified scroll state - CSS handles momentum via scroll-snap
    const scrollStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

    // Memoized scroll functions - using CSS scroll-snap for smooth behavior
    const slideLeft = useCallback(() => {
        if (rowRef.current) {
            const cardWidth = isMobile ? 178 : 368; // card width + gap
            rowRef.current.scrollBy({
                left: -cardWidth * 2,
                behavior: 'smooth'
            });
        }
    }, [isMobile]);

    const slideRight = useCallback(() => {
        if (rowRef.current) {
            const cardWidth = isMobile ? 178 : 368; // card width + gap
            rowRef.current.scrollBy({
                left: cardWidth * 2,
                behavior: 'smooth'
            });
        }
    }, [isMobile]);

    // Simplified drag handlers - CSS scroll-snap handles momentum
    const handleMouseDown = useCallback((e) => {
        setIsDown(true);
        if (rowRef.current) {
            setStartX(e.pageX - rowRef.current.offsetLeft);
            setScrollLeft(rowRef.current.scrollLeft);
        }
        isDragging.current = false;
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (isDown) {
            setIsDown(false);
        }
    }, [isDown]);

    const handleMouseUp = useCallback(() => {
        setIsDown(false);
        // Use setTimeout to ensure click event fires before resetting isDragging
        // Click events fire synchronously after mouseup, but we need a small delay
        // to ensure our check in handleClick sees the correct isDragging state
        setTimeout(() => {
            isDragging.current = false;
        }, 50);
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDown) return;
        e.preventDefault();
        if (rowRef.current) {
            const x = e.pageX - rowRef.current.offsetLeft;
            const walk = (x - startX) * 1.5; // Scroll speed multiplier
            rowRef.current.scrollLeft = scrollLeft - walk;

            if (Math.abs(walk) > 5) {
                isDragging.current = true;
            }
        }
    }, [isDown, startX, scrollLeft]);

    const handleMovieHover = useCallback((movie) => {
        // Debounce prefetching - only prefetch if user hovers for 200ms
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            prefetchModalData(movie);
        }, 200);
    }, [prefetchModalData]);

    const handleMovieLeave = useCallback(() => {
        // Clear the prefetch timeout if user moves away quickly
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    }, []);

    // Cleanup effect to prevent memory leaks
    useEffect(() => {
        const timeoutRef = hoverTimeoutRef.current;
        return () => {
            // Clear any pending hover timeouts
            if (timeoutRef) {
                clearTimeout(timeoutRef);
            }
        };
    }, []);

    // Skeleton array memoization - reduced count for better initial render
    const skeletonArray = useMemo(() => Array.from({ length: 6 }), []);

    return (
        <div className="text-white mb-4 md:mb-6 group relative">
            <div className="flex items-center justify-between px-4 md:px-12 mb-2 md:mb-3">
                <h2
                    onClick={onTitleClick}
                    className="text-sm md:text-xl font-bold flex items-center gap-2 text-[#e5e5e5] hover:text-white transition-colors cursor-pointer group/title"
                >
                    {title.toUpperCase()}
                    <span className="text-xs md:text-sm opacity-0 group-hover/title:opacity-100 group-hover/title:translate-x-1 transition-all duration-300 flex items-center text-white/70 font-bold">
                        {isCast ? 'See All' : 'Explore All'} <ChevronRight className="w-4 h-4" />
                    </span>
                </h2>
                {onClearAll && (
                    <button
                        onClick={onClearAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                        title="Clear All"
                    >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden md:inline">Clear All</span>
                    </button>
                )}
            </div>

            <div className="relative group">
                <ChevronLeft
                    onClick={slideLeft}
                    className="hidden md:block absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 text-black cursor-pointer z-30 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg w-10 h-10"
                    aria-label="Scroll left"
                />
                <ChevronRight
                    onClick={slideRight}
                    className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 text-black cursor-pointer z-30 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg w-10 h-10"
                    aria-label="Scroll right"
                />
                <div
                    ref={rowRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="flex gap-2 md:gap-2 overflow-x-scroll scrollbar-hide px-3 md:px-6 py-4 md:py-6 cursor-grab active:cursor-grabbing select-none"
                    style={{
                        overscrollBehaviorX: 'contain',
                        contain: 'layout style paint'
                    }}
                    role="list"
                >
                    {isError && !isLocalData ? (
                        <div role="listitem" className="w-full h-[150px] md:h-[200px] flex flex-col items-center justify-center gap-4 bg-[#1a1a1a] rounded-lg border border-gray-800 mx-4">
                            <p className="text-gray-400 text-sm md:text-base">Failed to load {title}</p>
                            <button
                                onClick={() => refetch()}
                                className="px-4 py-2 bg-[#E50914] text-white rounded hover:bg-[#b20710] transition-colors text-sm font-semibold"
                            >
                                Retry
                            </button>
                        </div>
                    ) : loading && !isLocalData ? (
                        skeletonArray.map((_, i) => (
                            <div
                                key={i}
                                role="listitem"
                                className={clsx(
                                    "flex-shrink-0 w-[170px] md:w-[240px] lg:w-[280px] xl:w-[360px] rounded-lg overflow-hidden",
                                    isCast ? "aspect-[3/4]" : "aspect-[2/3] md:aspect-[16/9]"
                                )}
                            >
                                <Skeleton className="w-full h-full" />
                            </div>
                        ))
                    ) : (
                        movies.map((movie, index) => (
                            <MovieCard
                                key={movie.id}
                                movie={movie}
                                isCast={isCast}
                                alwaysOverlay={alwaysOverlay}
                                onRemove={onRemove}
                                onClick={onMovieClick}
                                onHover={handleMovieHover}
                                onLeave={handleMovieLeave}
                                isDraggingRef={isDragging}
                                cardIndex={index}
                                isMobile={isMobile}
                                dimensions={cardDimensions}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

Row.propTypes = {
    title: PropTypes.string.isRequired,
    fetchUrl: PropTypes.string,
    movies: PropTypes.array,
    onMovieClick: PropTypes.func,
    onRemove: PropTypes.func,
    onClearAll: PropTypes.func,
    alwaysOverlay: PropTypes.bool,
    isCast: PropTypes.bool,
    onTitleClick: PropTypes.func
};

export default memo(Row, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    const prevMovies = prevProps.movies || [];
    const nextMovies = nextProps.movies || [];

    // Deep comparison for movies array
    const moviesEqual = prevMovies.length === nextMovies.length &&
        prevMovies.every((movie, index) => movie.id === nextMovies[index]?.id);

    return (
        prevProps.title === nextProps.title &&
        prevProps.fetchUrl === nextProps.fetchUrl &&
        prevProps.alwaysOverlay === nextProps.alwaysOverlay &&
        prevProps.isCast === nextProps.isCast &&
        prevProps.onMovieClick === nextProps.onMovieClick &&
        prevProps.onRemove === nextProps.onRemove &&
        prevProps.onTitleClick === nextProps.onTitleClick &&
        moviesEqual
    );
});
