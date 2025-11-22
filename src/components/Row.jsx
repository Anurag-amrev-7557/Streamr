import { useState, useRef, useCallback, useEffect } from 'react';
import { useRowData, usePrefetchModalData } from '../hooks/useTMDB';
import clsx from 'clsx';
import Skeleton from './Skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';



import { memo } from 'react';

const Row = ({ title, fetchUrl, isLargeRow, onMovieClick }) => {
    const { data: movies = [], isLoading: loading } = useRowData(fetchUrl, title);
    const { prefetchModalData } = usePrefetchModalData();

    const rowRef = useRef(null);
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const isDragging = useRef(false);
    const hoverTimeoutRef = useRef(null);

    // Momentum refs
    const velocity = useRef(0);
    const lastPageX = useRef(0);
    const rAF = useRef(null);

    const slideLeft = () => {
        if (rowRef.current) {
            rowRef.current.scrollTo({
                left: rowRef.current.scrollLeft - 500,
                behavior: 'smooth'
            });
        }
    };

    const slideRight = () => {
        if (rowRef.current) {
            rowRef.current.scrollTo({
                left: rowRef.current.scrollLeft + 500,
                behavior: 'smooth'
            });
        }
    };

    const cancelMomentum = () => {
        if (rAF.current) {
            cancelAnimationFrame(rAF.current);
            rAF.current = null;
        }
    };

    const handleMouseDown = (e) => {
        cancelMomentum();
        setIsDown(true);
        if (rowRef.current) {
            setStartX(e.pageX - rowRef.current.offsetLeft);
            setScrollLeft(rowRef.current.scrollLeft);
            lastPageX.current = e.pageX;
            velocity.current = 0;
        }
        isDragging.current = false;
    };

    const handleMouseLeave = () => {
        if (isDown) {
            setIsDown(false);
            beginMomentum();
        }
    };

    const handleMouseUp = () => {
        setIsDown(false);
        beginMomentum();
        // Small delay to reset dragging status to allow click to fire if it wasn't a drag
        setTimeout(() => {
            isDragging.current = false;
        }, 0);
    };

    const handleMouseMove = (e) => {
        if (!isDown) return;
        e.preventDefault();
        if (rowRef.current) {
            const x = e.pageX - rowRef.current.offsetLeft;
            const walk = (x - startX) * 2; // Scroll-fast
            rowRef.current.scrollLeft = scrollLeft - walk;

            // Calculate velocity
            const delta = e.pageX - lastPageX.current;
            velocity.current = delta;
            lastPageX.current = e.pageX;

            if (Math.abs(walk) > 5) {
                isDragging.current = true;
            }
        }
    };

    const beginMomentum = () => {
        cancelMomentum();
        const momentumLoop = () => {
            if (!rowRef.current) return;

            // Apply velocity
            rowRef.current.scrollLeft -= velocity.current * 2;

            // Decay
            velocity.current *= 0.95;

            // Stop if slow enough
            if (Math.abs(velocity.current) > 0.5) {
                rAF.current = requestAnimationFrame(momentumLoop);
            } else {
                velocity.current = 0;
            }
        };
        momentumLoop();
    };

    const handleMovieHover = useCallback((movie) => {
        // Debounce prefetching - only prefetch if user hovers for 300ms
        hoverTimeoutRef.current = setTimeout(() => {
            prefetchModalData(movie);
        }, 300);
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
        return () => {
            // Cancel any ongoing animation frames
            cancelMomentum();
            // Clear any pending hover timeouts
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    const handleMovieClick = (movie) => {
        if (isDragging.current) return;
        onMovieClick(movie);
    };

    return (
        <div className="text-white mb-4 md:mb-6 group relative">
            <h2 className="text-sm md:text-xl font-bold mb-2 md:mb-3 px-4 md:px-12 flex items-center gap-2 text-[#e5e5e5] hover:text-white transition-colors cursor-pointer group/title">
                {title.toUpperCase()}
                <span className="text-xs md:text-sm opacity-0 group-hover/title:opacity-100 group-hover/title:translate-x-1 transition-all duration-300 flex items-center text-[#54b9c5] font-bold">
                    Explore All <ChevronRight className="w-4 h-4" />
                </span>
            </h2>

            <div className="relative group">
                <ChevronLeft
                    onClick={slideLeft}
                    className="hidden md:block absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 text-black cursor-pointer z-30 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg w-10 h-10"
                />
                <ChevronRight
                    onClick={slideRight}
                    className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 text-black cursor-pointer z-30 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg w-10 h-10"
                />
                <div
                    ref={rowRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="flex gap-2 md:gap-2 overflow-x-scroll scrollbar-hide px-3 md:px-6 py-4 md:py-6 cursor-grab active:cursor-grabbing select-none"
                >
                    {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton key={i} />
                        ))
                    ) : (
                        movies.map((movie) => (
                            <div
                                key={movie.id}
                                onClick={() => handleMovieClick(movie)}
                                onMouseEnter={() => handleMovieHover(movie)}
                                onMouseLeave={handleMovieLeave}
                                className="relative flex-shrink-0 w-[170px] md:w-[360px] group/item cursor-pointer"
                            >
                                {/* Mobile: Portrait (2:3), Desktop: Landscape (16:9) */}
                                <div className="aspect-[2/3] md:aspect-[16/9] bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                                    <img
                                        className="w-full h-full object-cover rounded-lg pointer-events-none"
                                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path || movie.backdrop_path}`}
                                        srcSet={`https://image.tmdb.org/t/p/w500${window.innerWidth >= 768 ? (movie.backdrop_path || movie.poster_path) : (movie.poster_path || movie.backdrop_path)}`}
                                        alt={movie.title || movie.name}
                                        loading="lazy"
                                    />

                                    {/* Rating Badge */}
                                    <div className="absolute top-2 left-2 md:top-2 md:left-2 bg-black/60 px-2 md:px-2 py-1 md:py-1 rounded-md flex items-center gap-1 md:gap-1">
                                        <span className="text-white font-bold text-xs md:text-xs">★</span>
                                        <span className="text-white font-bold text-xs md:text-xs">{(movie.vote_average || 7.5).toFixed(1)}</span>
                                    </div>

                                    {/* Overlay Info */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 md:p-4">
                                        <h3 className="text-xs md:text-base font-bold text-white leading-tight mb-0.5 md:mb-1 drop-shadow-md line-clamp-2">{movie.title || movie.name}</h3>
                                        <p className="text-[10px] md:text-sm text-gray-300">{movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4) || '2023'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(Row);
