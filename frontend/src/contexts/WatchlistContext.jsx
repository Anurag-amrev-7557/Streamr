import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toNumericRating } from '../utils/ratingUtils';
import { useUndoSafe } from './UndoContext';

// Genre mapping for converting TMDB genre IDs to names
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure', 
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics'
};

const WatchlistContext = createContext();

// Helper function to format genres consistently
const formatGenres = (genreData) => {
  if (!genreData) return [];
  
  // If it's already an array of objects with name property, return as is
  if (Array.isArray(genreData) && genreData.length > 0 && typeof genreData[0] === 'object' && genreData[0].name) {
    return genreData;
  }
  
  // If it's an array of genre IDs (numbers), convert to objects
  if (Array.isArray(genreData) && genreData.length > 0 && typeof genreData[0] === 'number') {
    return genreData
      .map(id => ({
        id: id,
        name: GENRE_MAP[id] || `Unknown Genre (${id})`
      }))
      .filter(Boolean);
  }
  
  // If it's an array of strings, convert to objects
  if (Array.isArray(genreData) && genreData.length > 0 && typeof genreData[0] === 'string') {
    return genreData.map((name, index) => ({
      id: index + 1, // Fallback ID
      name: name
    }));
  }
  
  return [];
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing during initialization
export const useWatchlistSafe = () => {
  const context = useContext(WatchlistContext);
  return context;
};

export const WatchlistProvider = ({ children }) => {
  const [watchlist, setWatchlist] = useState(() => {
    // Initialize from localStorage on mount
    try {
      const savedWatchlist = localStorage.getItem('watchlist');
      if (savedWatchlist) {
        const parsedWatchlist = JSON.parse(savedWatchlist);
        // Migrate old data that might have genre IDs instead of formatted genres
        return parsedWatchlist.map(movie => ({
          ...movie,
          genres: formatGenres(movie.genres || movie.genre_ids || [])
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading watchlist from localStorage:', error);
      return [];
    }
  });

  // Get undo context safely
  const undoContext = useUndoSafe();

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
    } catch (error) {
      console.error('Error saving watchlist to localStorage:', error);
    }
  }, [watchlist]);

  const validateMovieData = (movie) => {
    // Ensure all required fields are present
    const requiredFields = ['id', 'title'];
    const missingFields = requiredFields.filter(field => !movie[field]);
    
    if (missingFields.length > 0) {
      console.warn('Missing required fields in movie data:', missingFields);
      return false;
    }
    
    // Check if we have at least one image field (poster_path, poster, or backdrop_path, backdrop)
    const hasImage = movie.poster_path || movie.poster || movie.backdrop_path || movie.backdrop;
    if (!hasImage) {
      console.warn('Movie has no image data');
      return false;
    }
    
    return true;
  };

  const addToWatchlist = (movie) => {
    console.log('Attempting to add movie to watchlist:', movie);
    
    // Validate movie data
    if (!validateMovieData(movie)) {
      console.error('Invalid movie data, cannot add to watchlist');
      return;
    }

    setWatchlist(prev => {
      // Check if movie is already in watchlist
      if (prev.some(item => item.id === movie.id)) {
        console.log('Movie already in watchlist:', movie.title);
        return prev;
      }
      
      // Format movie data to ensure all necessary fields are present
      const formattedMovie = {
        id: movie.id,
        title: movie.title || movie.name,
        poster_path: movie.poster_path || movie.poster,
        backdrop_path: movie.backdrop_path || movie.backdrop,
        overview: movie.overview || '',
        type: movie.media_type || movie.type || 'movie',
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : 
              movie.first_air_date ? new Date(movie.first_air_date).getFullYear() : 
              movie.year || 'N/A',
        rating: toNumericRating(movie.vote_average || movie.rating, 0),
        genres: formatGenres(movie.genre_ids || movie.genres),
        release_date: movie.release_date || movie.first_air_date,
        duration: movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 
                 movie.episode_run_time ? `${Math.floor(movie.episode_run_time[0] / 60)}h ${movie.episode_run_time[0] % 60}m` : 
                 movie.duration || 'N/A',
        director: movie.director,
        cast: movie.cast || [],
        addedAt: new Date().toISOString()
      };
      
      console.log('Formatted movie data:', formattedMovie);
      
      // Add the new movie at the beginning of the list
      const newWatchlist = [formattedMovie, ...prev];
      console.log('Added movie to watchlist:', formattedMovie.title);
      console.log('New watchlist length:', newWatchlist.length);
      return newWatchlist;
    });
  };

  const removeFromWatchlist = useCallback((movieId) => {
    console.log('Removing movie from watchlist:', movieId);
    
    // Find the movie to be removed for undo functionality
    const movieToRemove = watchlist.find(movie => movie.id === movieId);
    
    setWatchlist(prev => {
      const newWatchlist = prev.filter(movie => movie.id !== movieId);
      console.log('Updated watchlist length:', newWatchlist.length);
      return newWatchlist;
    });

    // Add to undo context if undo is available
    if (undoContext && movieToRemove) {
      undoContext.addDeletedItem('watchlist', movieToRemove);
    }
  }, [watchlist, undoContext]);

  // Clear all items from the watchlist
  const clearWatchlist = () => {
    setWatchlist([]);
    try {
      localStorage.setItem('watchlist', JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing watchlist from localStorage:', error);
    }
  };

  // Restore item to watchlist (for undo functionality)
  const restoreToWatchlist = useCallback((movie) => {
    console.log('Restoring movie to watchlist:', movie.title);
    
    // Check if movie is already in watchlist
    if (watchlist.some(item => item.id === movie.id)) {
      console.log('Movie already in watchlist:', movie.title);
      return;
    }
    
    // Add the movie back to the watchlist
    setWatchlist(prev => [movie, ...prev]);
  }, [watchlist]);

  const isInWatchlist = (movieId) => {
    return watchlist.some(movie => movie.id === movieId);
  };

  const value = {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    restoreToWatchlist,
    clearWatchlist,
    isInWatchlist
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}; 