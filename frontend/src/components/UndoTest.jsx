import React from 'react';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { useWatchlist } from '../contexts/EnhancedWatchlistContext';
import { useUndo } from '../contexts/UndoContext';

const UndoTest = () => {
  const { addToContinueWatching, removeFromContinueWatching, continueWatching } = useViewingProgress();
  const { addToWatchlist, removeFromWatchlist, watchlist } = useWatchlist();
  const { deletedItems, undoDelete } = useUndo();

  const testMovie = {
    id: 12345,
    title: 'Test Movie',
    type: 'movie',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    lastWatched: new Date().toISOString(),
    progress: 50
  };

  const testTVShow = {
    id: 67890,
    title: 'Test TV Show',
    type: 'tv',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    lastWatched: new Date().toISOString(),
    season: 1,
    episode: 5,
    episodeTitle: 'Test Episode',
    progress: 30
  };

  const handleAddToContinueWatching = () => {
    addToContinueWatching(testMovie);
  };

  const handleAddToWatchlist = () => {
    addToWatchlist(testMovie);
  };

  const handleRemoveFromContinueWatching = () => {
    removeFromContinueWatching(testMovie.id, testMovie.type);
  };

  const handleRemoveFromWatchlist = () => {
    removeFromWatchlist(testMovie.id);
  };

  const handleUndoContinueWatching = () => {
    if (deletedItems.continueWatching.length > 0) {
      const item = deletedItems.continueWatching[0];
      undoDelete('continueWatching', item);
    }
  };

  const handleUndoWatchlist = () => {
    if (deletedItems.watchlist.length > 0) {
      const item = deletedItems.watchlist[0];
      undoDelete('watchlist', item);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-6">Undo Functionality Test</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Continue Watching Section */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Continue Watching</h3>
          <div className="space-y-3">
            <div className="text-sm">
              <p>Current items: {continueWatching.length}</p>
              <p>Deleted items: {deletedItems.continueWatching.length}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddToContinueWatching}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Add Test Movie
              </button>
              <button
                onClick={handleRemoveFromContinueWatching}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                disabled={continueWatching.length === 0}
              >
                Remove
              </button>
              <button
                onClick={handleUndoContinueWatching}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                disabled={deletedItems.continueWatching.length === 0}
              >
                Undo
              </button>
            </div>
          </div>
        </div>

        {/* Watchlist Section */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Watchlist</h3>
          <div className="space-y-3">
            <div className="text-sm">
              <p>Current items: {watchlist.length}</p>
              <p>Deleted items: {deletedItems.watchlist.length}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddToWatchlist}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Add Test Movie
              </button>
              <button
                onClick={handleRemoveFromWatchlist}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                disabled={watchlist.length === 0}
              >
                Remove
              </button>
              <button
                onClick={handleUndoWatchlist}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                disabled={deletedItems.watchlist.length === 0}
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current State Display */}
      <div className="mt-6 bg-gray-800 p-4 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Current State</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Continue Watching Items:</h4>
            <pre className="text-xs bg-gray-700 p-2 rounded overflow-auto">
              {JSON.stringify(continueWatching, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-2">Watchlist Items:</h4>
            <pre className="text-xs bg-gray-700 p-2 rounded overflow-auto">
              {JSON.stringify(watchlist, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Deleted Items Display */}
      <div className="mt-6 bg-gray-800 p-4 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Deleted Items (Available for Undo)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Deleted Continue Watching:</h4>
            <pre className="text-xs bg-gray-700 p-2 rounded overflow-auto">
              {JSON.stringify(deletedItems.continueWatching, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-2">Deleted Watchlist:</h4>
            <pre className="text-xs bg-gray-700 p-2 rounded overflow-auto">
              {JSON.stringify(deletedItems.watchlist, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UndoTest; 