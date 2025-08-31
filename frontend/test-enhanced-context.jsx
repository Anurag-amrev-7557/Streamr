import React, { useState } from 'react';
import { useEnhancedWatchlist } from './src/contexts/EnhancedWatchlistContext';

const TestEnhancedContext = () => {
  const {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    watchHistory,
    watchStats,
    isBackendEnabled,
    isAuthenticated,
    backendLoading,
    backendError,
    backendInitialized
  } = useEnhancedWatchlist();

  const [testMovie, setTestMovie] = useState({
    id: 550,
    title: 'Fight Club',
    name: 'Fight Club',
    overview: 'A ticking-time-bomb insomniac and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
    poster_path: '/pB8BM7pdM6DU9m0sr0X0FfHKgYo.jpg',
    backdrop_path: '/52AfXWuXCHn3DU9m0sr0X0FfHKgYo.jpg',
    release_date: '1999-10-15',
    vote_average: 8.8,
    genre_ids: [18],
    type: 'movie'
  });

  const [progress, setProgress] = useState(50);

  const handleAddToWatchlist = async () => {
    try {
      const result = await addToWatchlist(testMovie);
      console.log('Add to watchlist result:', result);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const handleRemoveFromWatchlist = async () => {
    try {
      await removeFromWatchlist(testMovie.id);
      console.log('Removed from watchlist');
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const handleUpdateProgress = async () => {
    try {
      const result = await updateWatchHistory(testMovie, progress);
      console.log('Update progress result:', result);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-6">Enhanced Watchlist Context Test</h1>
      
      {/* System Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-3">System Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Authenticated:</span> 
            <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Backend Enabled:</span> 
            <span className={isBackendEnabled ? 'text-green-400' : 'text-red-400'}>
              {isBackendEnabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Backend Initialized:</span> 
            <span className={backendInitialized ? 'text-green-400' : 'text-red-400'}>
              {backendInitialized ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Loading:</span> 
            <span className={backendLoading ? 'text-yellow-400' : 'text-green-400'}>
              {backendLoading ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        {backendError && (
          <div className="mt-3 p-2 bg-red-900/20 border border-red-500/20 rounded text-red-400">
            Error: {backendError}
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-3">Test Controls</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleAddToWatchlist}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Add to Watchlist
          </button>
          <button
            onClick={handleRemoveFromWatchlist}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Remove from Watchlist
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            Progress:
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="w-32"
            />
            <span>{progress}%</span>
          </label>
          <button
            onClick={handleUpdateProgress}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Update Progress
          </button>
        </div>
      </div>

      {/* Watchlist Display */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-3">
          Watchlist ({watchlist.length} items)
        </h2>
        {watchlist.length > 0 ? (
          <div className="space-y-2">
            {watchlist.map((movie, index) => (
              <div key={movie.id || index} className="p-2 bg-gray-700 rounded">
                <div className="font-medium">{movie.title || movie.name}</div>
                <div className="text-sm text-gray-400">
                  Type: {movie.type || 'unknown'} | 
                  ID: {movie.id} | 
                  {movie.tmdbId && `TMDB: ${movie.tmdbId}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No items in watchlist</div>
        )}
      </div>

      {/* Watch History Display */}
      {isBackendEnabled && (
        <div className="mb-6 p-4 bg-gray-800 rounded">
          <h2 className="text-xl font-semibold mb-3">
            Watch History ({watchHistory.length} items)
          </h2>
          {watchHistory.length > 0 ? (
            <div className="space-y-2">
              {watchHistory.map((item, index) => (
                <div key={item._id || index} className="p-2 bg-gray-700 rounded">
                  <div className="font-medium">
                    {item.content.title || item.content.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    Progress: {item.progress}% | 
                    Type: {item.content.type} | 
                    Last Watched: {new Date(item.lastWatched).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400">No watch history</div>
          )}
        </div>
      )}

      {/* Watch Stats Display */}
      {isBackendEnabled && watchStats && (
        <div className="mb-6 p-4 bg-gray-800 rounded">
          <h2 className="text-xl font-semibold mb-3">Watch Statistics</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Watched:</span> {watchStats.totalWatched}
            </div>
            <div>
              <span className="font-medium">Total Watchlist:</span> {watchStats.totalWatchlist}
            </div>
            <div>
              <span className="font-medium">Movies Watched:</span> {watchStats.moviesWatched}
            </div>
            <div>
              <span className="font-medium">TV Shows Watched:</span> {watchStats.tvShowsWatched}
            </div>
            <div>
              <span className="font-medium">Average Rating:</span> {watchStats.averageRating}
            </div>
          </div>
          {watchStats.favoriteGenres && Object.keys(watchStats.favoriteGenres).length > 0 && (
            <div className="mt-3">
              <span className="font-medium">Favorite Genres:</span>
              <div className="flex gap-2 mt-1">
                {Object.entries(watchStats.favoriteGenres).map(([genre, count]) => (
                  <span key={genre} className="px-2 py-1 bg-blue-600 rounded text-xs">
                    {genre}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debug Info */}
      <div className="p-4 bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-3">Debug Information</h2>
        <details className="text-sm">
          <summary className="cursor-pointer">Raw Data</summary>
          <pre className="mt-2 p-2 bg-gray-900 rounded overflow-auto">
            {JSON.stringify({
              watchlist: watchlist,
              watchHistory: watchHistory,
              watchStats: watchStats,
              isBackendEnabled,
              isAuthenticated,
              backendInitialized
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default TestEnhancedContext;
