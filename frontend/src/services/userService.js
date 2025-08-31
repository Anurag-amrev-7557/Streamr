import { getApiUrl } from '../config/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Watchlist Management
export const addToWatchlist = async (contentData) => {
  try {
    console.log('📝 Adding to watchlist:', contentData);
    
    const response = await fetch(`${getApiUrl()}/user/watchlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(contentData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ API Error:', error);
      throw new Error(error.message || 'Failed to add to watchlist');
    }

    const result = await response.json();
    console.log('✅ Successfully added to watchlist:', result);
    return result;
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    throw error;
  }
};

export const removeFromWatchlist = async (contentId) => {
  try {
    console.log('🗑️ Removing from watchlist, contentId:', contentId);
    
    const response = await fetch(`${getApiUrl()}/user/watchlist/${contentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Remove from watchlist error:', error);
      throw new Error(error.message || 'Failed to remove from watchlist');
    }

    console.log('✅ Successfully removed from watchlist');
    return await response.json();
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw error;
  }
};

export const getWatchlist = async () => {
  try {
    console.log('📋 Fetching watchlist...');
    
    const response = await fetch(`${getApiUrl()}/user/watchlist`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Get watchlist error:', error);
      throw new Error(error.message || 'Failed to fetch watchlist');
    }

    const result = await response.json();
    console.log('✅ Watchlist fetched:', result.data.count, 'items');
    return result;
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw error;
  }
};

// Watch History Management
export const updateWatchHistory = async (contentData) => {
  try {
    console.log('📺 Updating watch history:', contentData);
    
    const response = await fetch(`${getApiUrl()}/user/watch-history`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(contentData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Update watch history error:', error);
      throw new Error(error.message || 'Failed to update watch history');
    }

    const result = await response.json();
    console.log('✅ Watch history updated successfully');
    return result;
  } catch (error) {
    console.error('Error updating watch history:', error);
    throw error;
  }
};

export const getWatchHistory = async () => {
  try {
    console.log('📚 Fetching watch history...');
    
    const response = await fetch(`${getApiUrl()}/user/watch-history`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Get watch history error:', error);
      throw new Error(error.message || 'Failed to fetch watch history');
    }

    const result = await response.json();
    console.log('✅ Watch history fetched:', result.data.count, 'items');
    return result;
  } catch (error) {
    console.error('Error fetching watch history:', error);
    throw error;
  }
};

export const removeFromWatchHistory = async (contentId) => {
  try {
    console.log('🗑️ Removing from watch history, contentId:', contentId);
    
    const response = await fetch(`${getApiUrl()}/user/watch-history/${contentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Remove from watch history error:', error);
      throw new Error(error.message || 'Failed to remove from watch history');
    }

    console.log('✅ Successfully removed from watch history');
    return await response.json();
  } catch (error) {
    console.error('Error removing from watch history:', error);
    throw error;
  }
};

export const clearWatchHistory = async () => {
  try {
    console.log('🧹 Clearing watch history...');
    
    const response = await fetch(`${getApiUrl()}/user/watch-history`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Clear watch history error:', error);
      throw new Error(error.message || 'Failed to clear watch history');
    }

    console.log('✅ Watch history cleared successfully');
    return await response.json();
  } catch (error) {
    console.error('Error clearing watch history:', error);
    throw error;
  }
};

// Watch Statistics
export const getWatchStats = async () => {
  try {
    console.log('📊 Fetching watch statistics...');
    
    const response = await fetch(`${getApiUrl()}/user/watch-stats`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Get watch stats error:', error);
      throw new Error(error.message || 'Failed to fetch watch statistics');
    }

    const result = await response.json();
    console.log('✅ Watch statistics fetched successfully');
    return result;
  } catch (error) {
    console.error('Error fetching watch statistics:', error);
    throw error;
  }
};

// Helper function to prepare content data for API calls
export const prepareContentData = (movie) => {
  if (!movie) return null;

  const contentData = {
    tmdbId: movie.id,
    type: movie.type || movie.media_type || 'movie',
    contentData: {
      title: movie.title || movie.name,
      name: movie.name || movie.title,
      overview: movie.overview || '',
      posterPath: movie.poster_path || movie.poster,
      backdropPath: movie.backdrop_path || movie.backdrop,
      releaseDate: movie.release_date || null,
      firstAirDate: movie.first_air_date || null,
      rating: movie.vote_average || movie.rating || 0,
      voteCount: movie.vote_count || 0,
      popularity: movie.popularity || 0,
      runtime: movie.runtime || null,
      episodeRuntime: movie.episode_runtime || null,
      genres: movie.genres || [],
      genreIds: movie.genre_ids || [],
      originalLanguage: movie.original_language || 'en',
      originalTitle: movie.original_title || null,
      originalName: movie.original_name || null,
      adult: movie.adult || false,
      status: movie.status || 'Released',
      numberOfSeasons: movie.number_of_seasons || null,
      numberOfEpisodes: movie.number_of_episodes || null,
      tagline: movie.tagline || '',
      budget: movie.budget || 0,
      revenue: movie.revenue || 0
    }
  };

  console.log('🔧 Prepared content data:', contentData);
  return contentData;
};

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const isAuth = !!token;
  console.log('🔑 Authentication check:', isAuth ? 'Authenticated' : 'Not authenticated');
  return isAuth;
};
