import React, { useState } from 'react';
import { useWishlist } from '../contexts/WishlistContext';

const WishlistTest = () => {
  const {
    wishlist,
    isInitialized,
    isSyncing,
    syncError,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    syncWithBackend,
    getWishlistStats,
    searchWishlist,
    filterWishlist
  } = useWishlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState('');

  // Test movie data
  const testMovies = [
    {
      id: 1,
      title: 'Test Action Movie',
      poster_path: '/test-poster-1.jpg',
      overview: 'A test action movie',
      media_type: 'movie',
      genre_ids: [28, 12],
      vote_average: 8.5,
      release_date: '2024-01-01'
    },
    {
      id: 2,
      title: 'Test Comedy Movie',
      poster_path: '/test-poster-2.jpg',
      overview: 'A test comedy movie',
      media_type: 'movie',
      genre_ids: [35],
      vote_average: 7.8,
      release_date: '2024-02-01'
    },
    {
      id: 3,
      title: 'Test TV Show',
      poster_path: '/test-poster-3.jpg',
      overview: 'A test TV show',
      media_type: 'tv',
      genre_ids: [18, 10751],
      vote_average: 9.0,
      first_air_date: '2024-03-01'
    }
  ];

  const handleAddTestMovie = (movie) => {
    addToWishlist(movie);
  };

  const handleRemoveMovie = (movieId) => {
    removeFromWishlist(movieId);
  };

  const handleClearWishlist = () => {
    if (window.confirm('Are you sure you want to clear the entire wishlist?')) {
      clearWishlist();
    }
  };

  const handleManualSync = async () => {
    const result = await syncWithBackend();
    if (result) {
      alert('Manual sync completed successfully!');
    } else {
      alert('Manual sync failed. Check console for details.');
    }
  };

  const stats = getWishlistStats();
  const searchResults = searchWishlist(searchQuery);
  const filteredResults = filterWishlist({ 
    genre: filterGenre || undefined,
    sortBy: 'title'
  });

  return (
    <div className="p-6 max-w-4xl mx-auto bg-[#1a1d21] text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">🧪 Wishlist Context Test</h1>
      
      {/* Status Section */}
      <div className="bg-[#2a2d31] p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">📊 Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Initialized:</span>
            <span className={`ml-2 ${isInitialized ? 'text-green-400' : 'text-red-400'}`}>
              {isInitialized ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Syncing:</span>
            <span className={`ml-2 ${isSyncing ? 'text-yellow-400' : 'text-green-400'}`}>
              {isSyncing ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Total Items:</span>
            <span className="ml-2 text-blue-400">{wishlist.length}</span>
          </div>
          <div>
            <span className="text-gray-400">Sync Error:</span>
            <span className={`ml-2 ${syncError ? 'text-red-400' : 'text-green-400'}`}>
              {syncError ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        {syncError && (
          <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
            Error: {syncError}
          </div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="bg-[#2a2d31] p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">📈 Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total:</span>
            <span className="ml-2 text-blue-400">{stats.total}</span>
          </div>
          <div>
            <span className="text-gray-400">Movies:</span>
            <span className="ml-2 text-green-400">{stats.movies}</span>
          </div>
          <div>
            <span className="text-gray-400">TV Shows:</span>
            <span className="ml-2 text-purple-400">{stats.tvShows}</span>
          </div>
          <div>
            <span className="text-gray-400">Top Genre:</span>
            <span className="ml-2 text-yellow-400">
              {stats.topGenres[0] ? `${stats.topGenres[0][0]} (${stats.topGenres[0][1]})` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Test Actions Section */}
      <div className="bg-[#2a2d31] p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">🧪 Test Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Add Test Movies:</h3>
            <div className="space-y-2">
              {testMovies.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => handleAddTestMovie(movie)}
                  className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                  disabled={isSyncing}
                >
                  ➕ Add: {movie.title}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Wishlist Actions:</h3>
            <div className="space-y-2">
              <button
                onClick={handleManualSync}
                className="w-full p-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                disabled={isSyncing}
              >
                🔄 Manual Sync
              </button>
              <button
                onClick={handleClearWishlist}
                className="w-full p-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                disabled={isSyncing || wishlist.length === 0}
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-[#2a2d31] p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">🔍 Search & Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in wishlist..."
              className="w-full p-2 bg-[#1a1d21] border border-gray-600 rounded text-white placeholder-gray-400"
            />
            <div className="mt-2 text-sm text-gray-400">
              Found: {searchResults.length} items
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Genre:</label>
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="w-full p-2 bg-[#1a1d21] border border-gray-600 rounded text-white"
            >
              <option value="">All Genres</option>
              <option value="Action">Action</option>
              <option value="Comedy">Comedy</option>
              <option value="Drama">Drama</option>
              <option value="Family">Family</option>
            </select>
            <div className="mt-2 text-sm text-gray-400">
              Filtered: {filteredResults.length} items
            </div>
          </div>
        </div>
      </div>

      {/* Current Wishlist Section */}
      <div className="bg-[#2a2d31] p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">
          📋 Current Wishlist ({wishlist.length} items)
        </h2>
        {wishlist.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No items in wishlist. Add some test movies above!
          </div>
        ) : (
          <div className="space-y-3">
            {wishlist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-[#1a1d21] rounded border border-gray-600"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{item.title}</h3>
                  <div className="text-sm text-gray-400">
                    {item.media_type || item.type} • {item.genres?.map(g => g.name || g).join(', ')}
                  </div>
                  {item.overview && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.overview}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveMovie(item.id)}
                  className="ml-4 p-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                  disabled={isSyncing}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-800 rounded text-xs font-mono">
          <h3 className="font-medium mb-2">🐛 Debug Info:</h3>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify({
              wishlist: wishlist.length,
              isInitialized,
              isSyncing,
              syncError,
              lastBackendSync: stats.lastUpdated
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default WishlistTest;
