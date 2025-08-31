import React, { useState } from 'react';
import { useEnhancedWatchlist } from '../contexts/EnhancedWatchlistContext';

const EnhancedWatchlistTestPage = () => {
  const {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    watchHistory,
    watchStats,
    updateWatchHistory,
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
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const handleAddToWatchlist = async () => {
    try {
      addTestResult('🔄 Adding movie to watchlist...', 'info');
      const result = await addToWatchlist(testMovie);
      addTestResult(`✅ Successfully added to watchlist: ${result ? 'Success' : 'Failed'}`, 'success');
      console.log('Add to watchlist result:', result);
    } catch (error) {
      addTestResult(`❌ Error adding to watchlist: ${error.message}`, 'error');
      console.error('Error adding to watchlist:', error);
    }
  };

  const handleRemoveFromWatchlist = async () => {
    try {
      addTestResult('🔄 Removing movie from watchlist...', 'info');
      await removeFromWatchlist(testMovie.id);
      addTestResult('✅ Successfully removed from watchlist', 'success');
    } catch (error) {
      addTestResult(`❌ Error removing from watchlist: ${error.message}`, 'error');
      console.error('Error removing from watchlist:', error);
    }
  };

  const handleUpdateProgress = async () => {
    try {
      addTestResult(`🔄 Updating watch progress to ${progress}%...`, 'info');
      const result = await updateWatchHistory(testMovie, progress);
      addTestResult(`✅ Watch progress updated: ${result ? 'Success' : 'Failed'}`, 'success');
    } catch (error) {
      addTestResult(`❌ Error updating progress: ${error.message}`, 'error');
      console.error('Error updating progress:', error);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🧪 Enhanced Watchlist Test Page
        </h1>
        
        {/* System Status */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-700 rounded">
              <div className="font-medium text-gray-300">Authentication</div>
              <div className={`text-lg font-bold ${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
              </div>
            </div>
            
            <div className="p-4 bg-gray-700 rounded">
              <div className="font-medium text-gray-300">Backend Status</div>
              <div className={`text-lg font-bold ${isBackendEnabled ? 'text-green-400' : 'text-yellow-400'}`}>
                {isBackendEnabled ? '✅ Enabled' : '⚠️ Local Only'}
              </div>
            </div>
            
            <div className="p-4 bg-gray-700 rounded">
              <div className="font-medium text-gray-300">Initialization</div>
              <div className={`text-lg font-bold ${backendInitialized ? 'text-green-400' : 'text-yellow-400'}`}>
                {backendInitialized ? '✅ Ready' : '🔄 Initializing'}
              </div>
            </div>
            
            <div className="p-4 bg-gray-700 rounded">
              <div className="font-medium text-gray-300">Loading</div>
              <div className={`text-lg font-bold ${backendLoading ? 'text-yellow-400' : 'text-green-400'}`}>
                {backendLoading ? '🔄 Loading' : '✅ Ready'}
              </div>
            </div>
          </div>
          
          {backendError && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/20 rounded text-red-400">
              <strong>Backend Error:</strong> {backendError}
            </div>
          )}
        </div>

        {/* Test Controls */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Test Controls</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Test Movie Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Movie ID</label>
                <input
                  type="number"
                  value={testMovie.id}
                  onChange={(e) => setTestMovie(prev => ({ ...prev, id: parseInt(e.target.value) }))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={testMovie.title}
                  onChange={(e) => setTestMovie(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={handleAddToWatchlist}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              ➕ Add to Watchlist
            </button>
            
            <button
              onClick={handleRemoveFromWatchlist}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
            >
              🗑️ Remove from Watchlist
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3">
              <span className="font-medium">Watch Progress:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value))}
                className="w-32"
              />
              <span className="text-lg font-bold">{progress}%</span>
            </label>
            
            <button
              onClick={handleUpdateProgress}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              📺 Update Progress
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Test Results</h2>
            <button
              onClick={clearTestResults}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
            >
              🗑️ Clear Results
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No test results yet. Start testing to see results here.</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className={`p-3 rounded ${
                  result.type === 'success' ? 'bg-green-900/20 border border-green-500/20' :
                  result.type === 'error' ? 'bg-red-900/20 border border-red-500/20' :
                  'bg-blue-900/20 border border-blue-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">[{result.timestamp}]</span>
                    <span>{result.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Watchlist Display */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">
            📋 Current Watchlist ({watchlist.length} items)
          </h2>
          
          {watchlist.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No items in watchlist</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((movie, index) => (
                <div key={movie.id || index} className="p-4 bg-gray-700 rounded-lg">
                  <div className="font-medium text-lg mb-2">{movie.title || movie.name}</div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Type: {movie.type || 'unknown'}</div>
                    <div>ID: {movie.id}</div>
                    {movie.tmdbId && <div>TMDB: {movie.tmdbId}</div>}
                    {movie.overview && (
                      <div className="mt-2 text-xs line-clamp-3">{movie.overview}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watch History Display */}
        {isBackendEnabled && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">
              📺 Watch History ({watchHistory.length} items)
            </h2>
            
            {watchHistory.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No watch history yet</div>
            ) : (
              <div className="space-y-3">
                {watchHistory.map((item, index) => (
                  <div key={item._id || index} className="p-4 bg-gray-700 rounded-lg">
                    <div className="font-medium text-lg mb-2">
                      {item.content.title || item.content.name}
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>Progress: {item.progress}%</div>
                      <div>Type: {item.content.type}</div>
                      <div>Last Watched: {new Date(item.lastWatched).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Watch Statistics Display */}
        {isBackendEnabled && watchStats && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">📊 Watch Statistics</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-700 rounded text-center">
                <div className="text-2xl font-bold text-blue-400">{watchStats.totalWatched}</div>
                <div className="text-sm text-gray-400">Total Watched</div>
              </div>
              
              <div className="p-4 bg-gray-700 rounded text-center">
                <div className="text-2xl font-bold text-green-400">{watchStats.totalWatchlist}</div>
                <div className="text-sm text-gray-400">In Watchlist</div>
              </div>
              
              <div className="p-4 bg-gray-700 rounded text-center">
                <div className="text-2xl font-bold text-purple-400">{watchStats.moviesWatched}</div>
                <div className="text-sm text-gray-400">Movies</div>
              </div>
              
              <div className="p-4 bg-gray-700 rounded text-center">
                <div className="text-2xl font-bold text-orange-400">{watchStats.tvShowsWatched}</div>
                <div className="text-sm text-gray-400">TV Shows</div>
              </div>
            </div>
            
            {watchStats.averageRating > 0 && (
              <div className="mt-4 p-4 bg-gray-700 rounded text-center">
                <div className="text-2xl font-bold text-yellow-400">{watchStats.averageRating}</div>
                <div className="text-sm text-gray-400">Average Rating</div>
              </div>
            )}
            
            {watchStats.favoriteGenres && Object.keys(watchStats.favoriteGenres).length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-3">Favorite Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(watchStats.favoriteGenres).map(([genre, count]) => (
                    <span key={genre} className="px-3 py-1 bg-blue-600 rounded-full text-sm">
                      {genre}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Debug Information */}
        <div className="p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">🔧 Debug Information</h2>
          
          <details className="text-sm">
            <summary className="cursor-pointer text-lg font-medium mb-2">Raw Data</summary>
            <pre className="mt-2 p-4 bg-gray-900 rounded overflow-auto text-xs">
              {JSON.stringify({
                watchlist: watchlist,
                watchHistory: watchHistory,
                watchStats: watchStats,
                isBackendEnabled,
                isAuthenticated,
                backendInitialized,
                backendLoading,
                backendError
              }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWatchlistTestPage;
