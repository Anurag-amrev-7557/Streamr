import React, { useState } from 'react';
import { useWatchData } from '../hooks/useWatchData';

const WatchlistManager = ({ movie, onClose }) => {
  const { 
    isInWatchlist, 
    getContentIdFromWatchlist,
    addToWatchlist, 
    removeFromWatchlist, 
    loading, 
    error 
  } = useWatchData();
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleWatchlist = async () => {
    if (!movie) return;
    
    setIsProcessing(true);
    try {
      const movieType = movie.type || movie.media_type || 'movie';
      
      if (isInWatchlist(movie.id, movieType)) {
        // Get the content ID from the watchlist
        const contentId = getContentIdFromWatchlist(movie.id, movieType);
        
        if (!contentId) {
          console.error('❌ Content ID not found in watchlist for:', movie.id, movieType);
          throw new Error('Content not found in watchlist');
        }
        
        console.log('🗑️ Removing from watchlist with contentId:', contentId);
        await removeFromWatchlist(contentId);
      } else {
        console.log('➕ Adding to watchlist:', movie.title || movie.name);
        await addToWatchlist(movie);
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!movie) return null;

  const movieType = movie.type || movie.media_type || 'movie';
  const inWatchlist = isInWatchlist(movie.id, movieType);
  const buttonText = inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
  const buttonClass = inWatchlist 
    ? 'bg-red-600 hover:bg-red-700' 
    : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center space-x-3">
            {movie.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                alt={movie.title || movie.name}
                className="w-16 h-24 object-cover rounded"
              />
            )}
            <div>
              <h4 className="text-white font-medium">
                {movie.title || movie.name}
              </h4>
              <p className="text-gray-400 text-sm">
                {movieType === 'tv' ? 'TV Series' : 'Movie'}
              </p>
              {movie.release_date && (
                <p className="text-gray-400 text-sm">
                  {new Date(movie.release_date).getFullYear()}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleToggleWatchlist}
            disabled={loading || isProcessing}
            className={`flex-1 px-4 py-2 rounded font-medium text-white transition-colors ${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isProcessing ? 'Processing...' : buttonText}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded font-medium text-gray-300 hover:text-white transition-colors border border-gray-600 hover:border-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default WatchlistManager;
