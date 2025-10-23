import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getCollectionDetails } from '../services/tmdbService';
import { getPosterProps, getBackdropProps } from '../utils/imageUtils';
import { XMarkIcon, PlayIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useWatchlist } from '../contexts/WatchlistContext';
import { usePortal } from '../hooks/usePortal';
import { PORTAL_CONFIGS, createPortalEventHandlers } from '../utils/portalUtils';

const CollectionDetailsOverlay = ({ collection, onClose, onMovieSelect }) => {
  const [collectionDetails, setCollectionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [openingMovieId, setOpeningMovieId] = useState(null);
  const { addToWatchlist, removeFromWatchlist, watchlist, isInWatchlist } = useWatchlist();

  // Enhanced portal management
  const portalId = `collection-details-${collection?.id || 'default'}`;
  const {
    container: portalContainer,
    createPortal: createPortalContent,
    isReady: portalReady
  } = usePortal(portalId, {
    ...PORTAL_CONFIGS.MOVIE_DETAILS,
    ...createPortalEventHandlers(portalId, { onClose })
  });

  // Fetch collection details when component mounts
  useEffect(() => {
    const fetchCollectionDetails = async () => {
      if (!collection?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        const details = await getCollectionDetails(collection.id);
        setCollectionDetails(details);
      } catch (err) {
        console.error('Error fetching collection details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionDetails();
  }, [collection?.id]);

  const handleMovieClick = useCallback(async (movie) => {
    setOpeningMovieId(movie.id);
    try {
      setSelectedMovie(movie);
      if (onMovieSelect) {
        const maybePromise = onMovieSelect(movie);
        if (maybePromise && typeof maybePromise.then === 'function') {
          await maybePromise;
        }
      }
    } finally {
      setOpeningMovieId(null);
    }
  }, [onMovieSelect]);

  const handleWatchlistToggle = useCallback((movie) => {
    if (isInWatchlist(movie.id)) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie);
    }
  }, [addToWatchlist, removeFromWatchlist, isInWatchlist]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown]);

  const movies = useMemo(() => {
    return collectionDetails?.parts || [];
  }, [collectionDetails]);

  if (!collection) return null;

  // Don't render if portal container is not ready or in SSR
  if (typeof window === 'undefined' || !portalReady || !portalContainer) {
    return null;
  }

  return createPortalContent(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/95"
        onClick={handleBackdropClick}
        style={{ zIndex: 1, pointerEvents: 'auto' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-6xl h-auto max-h-[calc(100vh-1rem)] sm:max-h-[95vh] mx-4 bg-black/90 rounded-2xl shadow-2xl flex flex-col border border-white/10 overflow-y-auto"
          style={{ zIndex: 2, pointerEvents: 'auto' }}
        >
          {/* Header */}
          <div className="relative">
            {/* Backdrop Image */}
            {collectionDetails?.backdrop_path && (
              <div className="relative h-96 md:h-[30rem] lg:h-[36rem] overflow-hidden">
                <img
                  src={getBackdropProps({ backdrop_path: collectionDetails.backdrop_path }, 'w1280').src}
                  alt={collectionDetails.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>
            )}
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/80 hover:bg-white/10 rounded-full transition-colors border border-white/20"
              style={{ zIndex: 10 }}
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>

            {/* Enhanced Collection Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-2xl">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white flex items-center gap-3">
                      <span className="flex items-center gap-2">
                        {collectionDetails?.name || collection.name}
                        {collectionDetails?.original_name && collectionDetails.original_name !== collectionDetails?.name && (
                          <span className="text-white/60 text-lg font-normal italic ml-1">
                            ({collectionDetails.original_name})
                          </span>
                        )}
                      </span>
                      {collectionDetails?.parts?.length > 1 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-600/80 text-xs font-semibold text-white ml-2">
                          <svg className="w-4 h-4 mr-1 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <rect x="3" y="7" width="18" height="10" rx="2" fill="currentColor" className="text-blue-500" />
                            <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth={2} />
                          </svg>
                          Series
                        </span>
                      )}
                      {collectionDetails?.homepage && (
                        <a
                          href={collectionDetails.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold text-blue-200 transition"
                          title="Official Homepage"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                          </svg>
                          Website
                        </a>
                      )}
                    </h1>
                    {collectionDetails?.tagline && (
                      <span className="block text-blue-200 text-base font-medium italic mt-1 sm:mt-0 sm:ml-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-300 opacity-80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v6a4 4 0 01-4 4H7zm10 0a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v6a4 4 0 01-4 4h-2z" />
                        </svg>
                        <span>
                          <span className="sr-only">Tagline:</span>
                          “{collectionDetails.tagline}”
                        </span>
                      </span>
                    )}
                  </div>
                  {collectionDetails?.overview && (
                    <div className="mb-2 max-w-3xl">
                      <p className="text-white/60 text-md leading-relaxed line-clamp-4 relative group transition-all duration-200">
                        {collectionDetails.overview}
                        {collectionDetails.overview.length > 320 && (
                          <span className="absolute right-0 bottom-0 bg-gradient-to-l from-black/80 via-black/10 to-transparent pl-6 pr-2 py-1 text-blue-200 text-sm font-semibold cursor-pointer group-hover:underline transition">
                            ...more
                          </span>
                        )}
                      </p>
                      {/* Add a fun fact or trivia if available */}
                      {collectionDetails?.trivia && (
                        <div className="mt-2 bg-blue-900/30 rounded px-3 py-2 flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-300 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                          </svg>
                          <span className="text-blue-200 text-base">
                            <span className="font-semibold">Trivia:</span> {collectionDetails.trivia}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <span className="text-white/70 flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {movies.length} {movies.length === 1 ? "movie" : "movies"}
                    </span>
                    {collectionDetails?.release_date && (
                      <span className="text-white/60 flex items-center gap-1">
                        <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(collectionDetails.release_date).getFullYear()}
                      </span>
                    )}
                    {collectionDetails?.parts?.length > 0 && (
                      <span className="text-white/60 flex items-center gap-1">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                        </svg>
                        {collectionDetails.parts.map(p => p.release_date).filter(Boolean).length > 1
                          ? `${collectionDetails.parts
                              .map(p => p.release_date)
                              .filter(Boolean)
                              .map(d => new Date(d).getFullYear())
                              .sort((a, b) => a - b)
                              .slice(0, 1)}–${collectionDetails.parts
                              .map(p => p.release_date)
                              .filter(Boolean)
                              .map(d => new Date(d).getFullYear())
                              .sort((a, b) => a - b)
                              .slice(-1)}`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 min-h-[70vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">Error loading collection details</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Movies in Collection</h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {movies.map((movie, index) => (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group relative cursor-pointer"
                      onClick={() => handleMovieClick(movie)}
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-black shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 border border-white/10">
                        <img
                          src={getPosterProps(movie, 'w500').src}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                              <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="500" height="750" fill="#1a1a1a"/>
                                <path d="M250 300C277.614 300 300 277.614 300 250C300 222.386 277.614 200 250 200C222.386 200 200 222.386 200 250C200 277.614 222.386 300 250 300Z" fill="#333333"/>
                                <path d="M350 450C350 483.137 323.137 510 290 510H210C176.863 510 150 483.137 150 450V350C150 316.863 176.863 290 210 290H290C323.137 290 350 316.863 350 350V450Z" fill="#333333"/>
                                <path d="M250 400C250 400 230 370 210 370C190 370 170 400 170 400" stroke="#666666" stroke-width="4" stroke-linecap="round"/>
                                <text x="250" y="550" font-family="Arial" font-size="24" fill="#666666" text-anchor="middle">No Image Available</text>
                                <text x="250" y="580" font-family="Arial" font-size="16" fill="#666666" text-anchor="middle">${movie.title}</text>
                              </svg>
                            `)}`;
                          }}
                        />
                        
                        {/* Click Loader Overlay */}
                        {openingMovieId === movie.id && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center" style={{ zIndex: 20 }}>
                            <div className="spinner"></div>
                            <style>{`
                              .spinner { --size: 18px; --first-block-clr: rgba(255,255,255, 0.8); --second-block-clr: rgba(255,255,255, 0.8); --clr: #111; width: 48px; height: 48px; position: relative; }
                              .spinner::after,.spinner::before { box-sizing: border-box; position: absolute; content: ""; width: 18px; height: 20px; top: 50%; animation: up 2.4s cubic-bezier(0,0,0.24,1.21) infinite; left: 50%; background: var(--first-block-clr); backdrop-filter: blur(10px); }
                              .spinner::after { background: var(--second-block-clr); top: calc(50% - var(--size)); left: calc(50% - var(--size)); animation: down 2.4s cubic-bezier(0,0,0.24,1.21) infinite; backdrop-filter: blur(10px); }
                              @keyframes down { 0%,100% { transform: none; } 25% { transform: translateX(80%);} 50% { transform: translateX(80%) translateY(80%);} 75% { transform: translateY(80%);} }
                              @keyframes up { 0%,100% { transform: none; } 25% { transform: translateX(-90%);} 50% { transform: translateX(-90%) translateY(-90%);} 75% { transform: translateY(-90%);} }
                            `}</style>
                          </div>
                        )}
                        
                        {/* Overlay with movie info */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          transition={{ duration: 0.1 }}
                          className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end p-3"
                        >
                          <motion.div className="text-white">
                            <h4 className="font-medium text-sm truncate">{movie.title}</h4>
                            <p className="text-xs text-white/70 flex items-center gap-1">
                              {movie.release_date?.split('-')[0] || movie.year || 'N/A'} •
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                                {movie.vote_average?.toFixed(1) || movie.rating || 'N/A'}
                              </span>
                            </p>
                          </motion.div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {movies.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white/60">No movies found in this collection</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CollectionDetailsOverlay;
