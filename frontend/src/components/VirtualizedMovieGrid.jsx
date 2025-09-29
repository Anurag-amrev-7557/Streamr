import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import { formatRating } from '../utils/ratingUtils';
import { getPosterProps } from '../utils/imageUtils';

// Device/viewport helpers
const getIsLowEndDevice = () => {
  try {
    const cores = navigator.hardwareConcurrency || 8;
    return cores <= 4;
  } catch {
    return false;
  }
};

const getIsMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 640;
};

const VirtualizedMovieGrid = ({
  movies = [],
  itemWidth = 200,
  itemHeight = 300,
  containerWidth = 1200,
  containerHeight = 600,
  onMovieClick,
  className = '',
  showLoading = false,
  loadingCount = 20,
  showIndex = false, // enhancement: show index overlay
  showGenres = false, // enhancement: show genres overlay
  genresMap = {}, // enhancement: pass in genres map for genre names
  emptyState = null, // enhancement: allow custom empty state
  loadingState = null // enhancement: allow custom loading state
}) => {
  const [dimensions, setDimensions] = useState({
    width: containerWidth,
    height: containerHeight
  });
  const gridRef = useRef(null);

  // Responsive: update grid size on resize, but debounce for perf
  useEffect(() => {
    let isCancelled = false;
    let resizeTimeout = null;

    const handleResize = () => {
      if (isCancelled) return;
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, 80);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      isCancelled = true;
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Calculate grid dimensions
  const gridConfig = useMemo(() => {
    // On mobile, use 2 columns, on tablet 3, else auto
    let columns;
    if (getIsMobile()) {
      columns = Math.max(1, Math.floor(dimensions.width / Math.max(140, itemWidth * 0.8)));
      columns = Math.min(columns, 2);
    } else if (dimensions.width < 900) {
      columns = Math.max(2, Math.floor(dimensions.width / Math.max(160, itemWidth * 0.9)));
    } else {
      columns = Math.max(3, Math.floor(dimensions.width / itemWidth));
    }
    columns = Math.max(1, columns);
    const rows = Math.ceil(movies.length / columns);

    return {
      columns,
      rows,
      itemWidth,
      itemHeight,
      totalWidth: columns * itemWidth,
      totalHeight: rows * itemHeight
    };
  }, [movies.length, dimensions.width, itemWidth, itemHeight]);

  // Keyboard navigation: arrow keys to move focus
  const [focusedIndex, setFocusedIndex] = useState(null);
  useEffect(() => {
    if (focusedIndex === null) return;
    const handleKeyDown = (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
      e.preventDefault();
      let idx = focusedIndex;
      if (e.key === 'ArrowLeft') idx = Math.max(0, idx - 1);
      if (e.key === 'ArrowRight') idx = Math.min(movies.length - 1, idx + 1);
      if (e.key === 'ArrowUp') idx = Math.max(0, idx - gridConfig.columns);
      if (e.key === 'ArrowDown') idx = Math.min(movies.length - 1, idx + gridConfig.columns);
      if (e.key === 'Enter' && movies[idx]) onMovieClick?.(movies[idx]);
      setFocusedIndex(idx);
      // Scroll to item if needed
      if (gridRef.current && typeof gridRef.current.scrollToItem === 'function') {
        gridRef.current.scrollToItem({
          rowIndex: Math.floor(idx / gridConfig.columns),
          columnIndex: idx % gridConfig.columns,
          align: 'smart'
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line
  }, [focusedIndex, gridConfig.columns, movies, onMovieClick]);

  // Cell renderer for virtualized grid
  const Cell = useCallback(({ columnIndex, rowIndex, style, isScrolling, data }) => {
    const { movies, gridConfig, onMovieClick } = data || {};
    const index = rowIndex * gridConfig.columns + columnIndex;
    const movie = movies[index];
    const isLowEndDevice = getIsLowEndDevice();
    const isFocused = focusedIndex === index;

    if (!movie) {
      return (
        <div style={style} className="flex items-center justify-center">
          <div className="w-full h-full bg-gray-800 rounded-lg animate-pulse" />
        </div>
      );
    }

    return (
      <motion.div
        style={style}
        className={`p-2 outline-none ${isFocused ? 'ring-2 ring-yellow-400 z-10' : ''}`}
        initial={isLowEndDevice ? false : { opacity: 0, scale: 0.96 }}
        animate={isLowEndDevice ? false : { opacity: 1, scale: 1 }}
        transition={isLowEndDevice ? undefined : { duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
        whileHover={isLowEndDevice ? undefined : { scale: 1.03 }}
        whileTap={isLowEndDevice ? undefined : { scale: 0.97 }}
        tabIndex={0}
        onFocus={() => setFocusedIndex(index)}
        onBlur={() => setFocusedIndex(null)}
        aria-label={movie.title || movie.name}
        role="button"
        onKeyDown={e => {
          if (e.key === 'Enter') onMovieClick?.(movie);
        }}
      >
        <div
          className="group cursor-pointer bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 relative"
          onClick={() => onMovieClick?.(movie)}
        >
          {/* Movie Poster */}
          <div className="relative aspect-[2/3]">
            <OptimizedImage
              src={movie.poster_path ? getPosterProps(movie, 'w500').src : null}
              alt={movie.title || movie.name}
              className="w-full h-full"
              priority={rowIndex < 2}
              sizes={`${Math.max(120, Math.round(itemWidth))}px`}
              draggable={false}
            />

            {/* Index overlay */}
            {showIndex && (
              <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded z-10 pointer-events-none select-none">
                {index + 1}
              </span>
            )}

            {/* Genres overlay */}
            {showGenres && movie.genre_ids && movie.genre_ids.length > 0 && (
              <div className="absolute top-1 right-1 flex flex-wrap gap-1 z-10">
                {movie.genre_ids.slice(0, 2).map(gid =>
                  genresMap[gid] ? (
                    <span
                      key={gid}
                      className="bg-yellow-700/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium pointer-events-none select-none"
                    >
                      {genresMap[gid]}
                    </span>
                  ) : null
                )}
              </div>
            )}

            {/* Hover Overlay - FIXED positioning */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none">
              <div className="absolute bottom-0 left-0 right-0 p-3 overflow-hidden">
                <h3 className="text-white font-semibold text-sm truncate">
                  {movie.title || movie.name}
                </h3>
                <div className="flex items-center gap-2 text-white/80 text-xs mt-1">
                  <span>{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || 'N/A'}</span>
                  {movie.vote_average ? (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                        {formatRating(movie.vote_average)}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }, [focusedIndex, showIndex, showGenres, genresMap, onMovieClick, itemWidth]);

  // Loading cells
  const LoadingCell = useCallback(({ columnIndex, rowIndex, style }) => {
    return (
      <div style={style} className="p-2">
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg animate-pulse">
          <div className="aspect-[2/3] bg-gray-700" />
          <div className="p-3">
            <div className="h-4 bg-gray-700 rounded mb-2" />
            <div className="h-3 bg-gray-700 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }, []);

  // If no movies and not loading, show empty state
  if (movies.length === 0 && !showLoading) {
    if (emptyState) return emptyState;
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
        <div className="text-center text-white/60">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No movies found</h3>
          <p className="text-sm">Try adjusting your search criteria</p>
        </div>
      </div>
    );
  }

  // If loading, show loading grid
  if (showLoading) {
    if (loadingState) return loadingState;
    const loadingConfig = {
      columns: gridConfig.columns,
      rows: Math.ceil(loadingCount / gridConfig.columns),
      itemWidth,
      itemHeight,
      totalWidth: gridConfig.columns * itemWidth
    };

    return (
      <div className={className}>
        <Grid
          columnCount={loadingConfig.columns}
          columnWidth={loadingConfig.itemWidth}
          height={containerHeight}
          rowCount={loadingConfig.rows}
          rowHeight={loadingConfig.itemHeight}
          width={loadingConfig.totalWidth}
        >
          {LoadingCell}
        </Grid>
      </div>
    );
  }

  // Accessibility: focus first cell on mount if grid is focused
  const gridContainerRef = useRef(null);
  useEffect(() => {
    if (!gridContainerRef.current) return;
    const handleFocus = () => {
      setFocusedIndex(0);
    };
    const node = gridContainerRef.current;
    node.addEventListener('focus', handleFocus);
    return () => node.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <div
      ref={gridContainerRef}
      tabIndex={0}
      aria-label="Movie grid"
      className={`${className} ultra-smooth-scroll performance-scroll outline-none`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: `${containerHeight}px ${containerWidth}px`,
        willChange: 'scroll-position',
        transform: 'translateZ(0)',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth'
      }}
    >
      <Grid
        ref={gridRef}
        columnCount={gridConfig.columns}
        columnWidth={gridConfig.itemWidth}
        height={containerHeight}
        rowCount={gridConfig.rows}
        rowHeight={gridConfig.itemHeight}
        width={gridConfig.totalWidth}
        overscanRowCount={getIsLowEndDevice() ? 1 : 3}
        overscanColumnCount={getIsLowEndDevice() ? 0 : 2}
        useIsScrolling={true}
        itemData={{
          movies,
          gridConfig,
          onMovieClick
        }}
        style={{
          scrollBehavior: 'smooth',
          contain: 'layout style paint',
          willChange: 'scroll-position'
        }}
      >
        {Cell}
      </Grid>
    </div>
  );
};

// Optimized movie card for use outside of virtualized grid
export const OptimizedMovieCard = React.memo(
  ({
    movie,
    onClick,
    className = '',
    showIndex = false,
    index = null,
    showGenres = false,
    genresMap = {}
  }) => {
    const handleClick = useCallback(() => {
      onClick?.(movie);
    }, [movie, onClick]);

    return (
      <motion.div
        className={`group cursor-pointer bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        tabIndex={0}
        aria-label={movie.title || movie.name}
        role="button"
        onKeyDown={e => {
          if (e.key === 'Enter') handleClick();
        }}
      >
        {/* Movie Poster */}
        <div className="relative aspect-[2/3]">
          <OptimizedImage
            src={movie.poster_path ? getPosterProps(movie, 'w500').src : null}
            alt={movie.title || movie.name}
            className="w-full h-full"
            draggable={false}
          />

          {/* Index overlay */}
          {showIndex && index !== null && (
            <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded z-10 pointer-events-none select-none">
              {index + 1}
            </span>
          )}

          {/* Genres overlay */}
          {showGenres && movie.genre_ids && movie.genre_ids.length > 0 && (
            <div className="absolute top-1 right-1 flex flex-wrap gap-1 z-10">
              {movie.genre_ids.slice(0, 2).map(gid =>
                genresMap[gid] ? (
                  <span
                    key={gid}
                    className="bg-yellow-700/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium pointer-events-none select-none"
                  >
                    {genresMap[gid]}
                  </span>
                ) : null
              )}
            </div>
          )}

          {/* Hover Overlay - FIXED positioning */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 p-3 overflow-hidden">
              <h3 className="text-white font-semibold text-sm truncate">
                {movie.title || movie.name}
              </h3>
              <div className="flex items-center gap-2 text-white/80 text-xs mt-1">
                <span>{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || 'N/A'}</span>
                {movie.vote_average ? (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                      {formatRating(movie.vote_average)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

OptimizedMovieCard.displayName = 'OptimizedMovieCard';

export default VirtualizedMovieGrid;