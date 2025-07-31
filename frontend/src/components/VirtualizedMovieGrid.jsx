import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import OptimizedImage from './OptimizedImage';

const VirtualizedMovieGrid = ({
  movies = [],
  itemWidth = 200,
  itemHeight = 300,
  containerWidth = 1200,
  containerHeight = 600,
  onMovieClick,
  className = '',
  showLoading = false,
  loadingCount = 20
}) => {
  const [dimensions, setDimensions] = useState({
    width: containerWidth,
    height: containerHeight
  });

  // Calculate grid dimensions
  const gridConfig = useMemo(() => {
    const columns = Math.floor(dimensions.width / itemWidth);
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cell renderer for virtualized grid
  const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * gridConfig.columns + columnIndex;
    const movie = movies[index];
    
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
        className="p-2"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div
          className="group cursor-pointer bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
          onClick={() => onMovieClick?.(movie)}
        >
          {/* Movie Poster */}
          <div className="relative aspect-[2/3]">
            <OptimizedImage
              src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null}
              alt={movie.title || movie.name}
              className="w-full h-full"
              priority={index < 8} // Priority for first 8 items
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white font-semibold text-sm truncate">
                  {movie.title || movie.name}
                </h3>
                <div className="flex items-center gap-2 text-white/80 text-xs mt-1">
                  <span>{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || 'N/A'}</span>
                  {movie.vote_average && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                        {movie.vote_average.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }, [movies, gridConfig.columns, onMovieClick]);

  // Loading cells
  const LoadingCell = useCallback(({ columnIndex, rowIndex, style }) => {
    return (
      <div style={style} className="p-2">
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          <div className="aspect-[2/3] bg-gray-700 animate-pulse" />
          <div className="p-3">
            <div className="h-4 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-3 bg-gray-700 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }, []);

  // If no movies and not loading, show empty state
  if (movies.length === 0 && !showLoading) {
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
    const loadingConfig = {
      columns: gridConfig.columns,
      rows: Math.ceil(loadingCount / gridConfig.columns),
      itemWidth,
      itemHeight
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

  return (
    <div className={className}>
      <Grid
        columnCount={gridConfig.columns}
        columnWidth={gridConfig.itemWidth}
        height={containerHeight}
        rowCount={gridConfig.rows}
        rowHeight={gridConfig.itemHeight}
        width={gridConfig.totalWidth}
        overscanRowCount={2}
        overscanColumnCount={1}
      >
        {Cell}
      </Grid>
    </div>
  );
};

// Optimized movie card for use outside of virtualized grid
export const OptimizedMovieCard = React.memo(({ movie, onClick, className = '' }) => {
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
    >
      {/* Movie Poster */}
      <div className="relative aspect-[2/3]">
        <OptimizedImage
          src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null}
          alt={movie.title || movie.name}
          className="w-full h-full"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white font-semibold text-sm truncate">
              {movie.title || movie.name}
            </h3>
            <div className="flex items-center gap-2 text-white/80 text-xs mt-1">
              <span>{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || 'N/A'}</span>
              {movie.vote_average && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    {movie.vote_average.toFixed(1)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

OptimizedMovieCard.displayName = 'OptimizedMovieCard';

export default VirtualizedMovieGrid; 