import React, { createContext, useContext, useState, useEffect } from 'react';

const WatchlistContext = createContext();

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};

export const WatchlistProvider = ({ children }) => {
  const [watchlist, setWatchlist] = useState(() => {
    // Initialize from localStorage on mount
    try {
      const savedWatchlist = localStorage.getItem('watchlist');
      return savedWatchlist ? JSON.parse(savedWatchlist) : [];
    } catch (error) {
      console.error('Error loading watchlist from localStorage:', error);
      return [];
    }
  });

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
    const requiredFields = ['id', 'title', 'poster_path', 'type'];
    const missingFields = requiredFields.filter(field => !movie[field]);
    
    if (missingFields.length > 0) {
      console.warn('Missing required fields in movie data:', missingFields);
      return false;
    }
    
    return true;
  };

  const addToWatchlist = (movie) => {
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
        overview: movie.overview,
        type: movie.media_type || movie.type || 'movie',
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : 
              movie.first_air_date ? new Date(movie.first_air_date).getFullYear() : 'N/A',
        rating: movie.vote_average || 0,
        genres: movie.genre_ids || movie.genres || [],
        release_date: movie.release_date || movie.first_air_date,
        duration: movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 
                 movie.episode_run_time ? `${Math.floor(movie.episode_run_time[0] / 60)}h ${movie.episode_run_time[0] % 60}m` : 'N/A',
        director: movie.director,
        cast: movie.cast || [],
        addedAt: new Date().toISOString()
      };
      
      // Add the new movie at the beginning of the list
      const newWatchlist = [formattedMovie, ...prev];
      return newWatchlist;
    });
  };

  const removeFromWatchlist = (movieId) => {
    setWatchlist(prev => prev.filter(movie => movie.id !== movieId));
  };

  // Clear all items from the watchlist
  const clearWatchlist = () => {
    setWatchlist([]);
    try {
      localStorage.setItem('watchlist', JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing watchlist from localStorage:', error);
    }
  };

  const isInWatchlist = (movieId) => {
    return watchlist.some(movie => movie.id === movieId);
  };

  const value = {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    clearWatchlist,
    isInWatchlist
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}; 