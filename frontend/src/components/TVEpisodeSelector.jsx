import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getTVSeason } from '../services/tmdbService';

// Virtualized episode list component for performance
const VirtualizedEpisodeList = React.memo(({ 
  episodes, 
  selectedEpisode, 
  onEpisodeSelect, 
  containerHeight = 300,
  itemHeight = 50 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  
  // Calculate visible range
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, episodes.length);
  
  // Get visible episodes
  const visibleEpisodes = episodes.slice(startIndex, endIndex);
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className="overflow-y-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: episodes.length * itemHeight, position: 'relative' }}>
        {visibleEpisodes.map((episode, index) => {
          const actualIndex = startIndex + index;
          const episodeData = episodes[actualIndex];
          
          return (
            <div
              key={episodeData.id || actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                height: itemHeight,
                width: '100%'
              }}
            >
              <button
                onClick={() => onEpisodeSelect(episodeData)}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                  selectedEpisode === episodeData.episode_number
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Episode {episodeData.episode_number}</span>
                  {episodeData.name && (
                    <span className="text-xs opacity-70 truncate ml-2">
                      {episodeData.name}
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Enhanced TV Episode Selector with large episode handling
const TVEpisodeSelector = ({ 
  show, 
  isOpen, 
  onClose, 
  onEpisodeSelect,
  seasons = [],
  currentSeason = null,
  onSeasonChange = null
}) => {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [portalContainer, setPortalContainer] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [episodesPerPage, setEpisodesPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  


  // Create portal container for the modal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let container = document.getElementById('tv-episode-selector-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tv-episode-selector-portal';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      if (container && container.parentNode && container.children.length === 0) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSeason(currentSeason?.season_number || 1);
      setSelectedEpisode(1);
      setSearchTerm('');
      setCurrentPage(1);
      setViewMode('grid');
    }
  }, [isOpen, currentSeason]);

  // Fetch episodes for selected season
  const fetchEpisodes = useCallback(async (seasonNumber) => {
    if (!show?.id || !seasonNumber) return;
    
    setIsLoadingEpisodes(true);
    try {
      const seasonData = await getTVSeason(show.id, seasonNumber);
      const allEpisodes = seasonData.episodes || [];
      setEpisodes(allEpisodes);
      setTotalEpisodes(allEpisodes.length);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
      setEpisodes([]);
      setTotalEpisodes(0);
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [show?.id]);

  // Fetch episodes when season changes
  useEffect(() => {
    if (isOpen && selectedSeason) {
      fetchEpisodes(selectedSeason);
    }
  }, [isOpen, selectedSeason, fetchEpisodes]);

  // Filter episodes based on search term
  const filteredEpisodes = useMemo(() => {
    if (!searchTerm.trim()) return episodes;
    
    const term = searchTerm.toLowerCase();
    return episodes.filter(episode => 
      episode.name?.toLowerCase().includes(term) ||
      episode.overview?.toLowerCase().includes(term) ||
      episode.episode_number.toString().includes(term)
    );
  }, [episodes, searchTerm]);

  // Paginate episodes
  const paginatedEpisodes = useMemo(() => {
    const startIndex = (currentPage - 1) * episodesPerPage;
    const endIndex = startIndex + episodesPerPage;
    return filteredEpisodes.slice(startIndex, endIndex);
  }, [filteredEpisodes, currentPage, episodesPerPage]);

  const totalPages = Math.ceil(filteredEpisodes.length / episodesPerPage);

  const handleClose = () => {
    onClose();
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClickOutside = (e) => {
    if (e.target.classList.contains('tv-episode-selector-overlay')) {
      handleClose();
    }
  };

  const handleSeasonChange = (season) => {
    setSelectedSeason(season.season_number || season);
    setSelectedEpisode(1);
    setSearchTerm('');
    setCurrentPage(1);
    if (onSeasonChange) {
      onSeasonChange(season);
    }
  };

  const handleEpisodeSelect = (episode) => {
    setSelectedEpisode(episode.episode_number);
    onEpisodeSelect(selectedSeason, episode.episode_number);
    handleClose();
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Generate seasons if not provided
  const availableSeasons = useMemo(() => {
    if (seasons.length > 0) {
      return seasons;
    }
    // Fallback: generate seasons based on show data
    const maxSeasons = show?.number_of_seasons || 10;
    return Array.from({ length: maxSeasons }, (_, i) => ({
      season_number: i + 1,
      name: `Season ${i + 1}`,
      episode_count: show?.seasons?.[i]?.episode_count || 20
    }));
  }, [seasons, show]);

  // Don't render if portal container is not ready or in SSR
  if (typeof window === 'undefined' || !portalContainer) {
    return null;
  }

  const overlayContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="tv-episode-selector-overlay fixed inset-0 bg-black/80 flex items-center justify-center z-[9999999999] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={handleClickOutside}
        >
          <motion.div
            className="relative w-full max-w-4xl bg-gradient-to-br from-[#1a1d24] to-[#121417] rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-xl font-semibold">
                  Select Episode
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors duration-200"
                  aria-label="Close episode selector"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              {show && (
                <p className="text-white/60 text-sm mt-2">
                  {show.title || show.name}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Season Selection */}
                <div className="lg:col-span-1">
                  <label className="block text-white/80 text-sm font-medium mb-3">
                    Season
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {availableSeasons.map((season) => (
                      <button
                        key={season.season_number}
                        onClick={() => handleSeasonChange(season)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedSeason === season.season_number
                            ? 'bg-red-600 text-white shadow-lg'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        <div className="text-center">
                          <div>Season {season.season_number}</div>
                          {season.episode_count && (
                            <div className="text-xs opacity-70">
                              {season.episode_count} episodes
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Episode Selection */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-white/80 text-sm font-medium">
                      Episodes ({filteredEpisodes.length} total)
                    </label>
                    <div className="flex items-center gap-2">
                      {/* View Mode Toggle */}
                      <div className="flex bg-white/10 rounded-lg p-1">
                        <button
                          onClick={() => handleViewModeChange('grid')}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                            viewMode === 'grid'
                              ? 'bg-red-600 text-white'
                              : 'text-white/80 hover:bg-white/20'
                          }`}
                        >
                          Grid
                        </button>
                        <button
                          onClick={() => handleViewModeChange('list')}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                            viewMode === 'list'
                              ? 'bg-red-600 text-white'
                              : 'text-white/80 hover:bg-white/20'
                          }`}
                        >
                          List
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search episodes..."
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  {/* Episodes Content */}
                  {isLoadingEpisodes ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-white/60">Loading episodes...</div>
                    </div>
                  ) : filteredEpisodes.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-white/60">
                        {searchTerm ? 'No episodes found matching your search.' : 'No episodes available.'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {viewMode === 'grid' ? (
                        // Grid View
                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                          {paginatedEpisodes.map((episode) => (
                            <button
                              key={episode.id}
                              onClick={() => handleEpisodeSelect(episode)}
                              className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                                selectedEpisode === episode.episode_number
                                  ? 'bg-red-600 text-white shadow-lg'
                                  : 'bg-white/10 text-white/80 hover:bg-white/20'
                              }`}
                            >
                              <div className="text-center">
                                <div className="font-semibold">Episode {episode.episode_number}</div>
                                {episode.name && (
                                  <div className="text-xs opacity-70 truncate mt-1">
                                    {episode.name}
                                  </div>
                                )}
                                {episode.runtime && (
                                  <div className="text-xs opacity-50 mt-1">
                                    {Math.floor(episode.runtime / 60)}m
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        // List View with Virtualization
                        <div className="max-h-96">
                          <VirtualizedEpisodeList
                            episodes={paginatedEpisodes}
                            selectedEpisode={selectedEpisode}
                            onEpisodeSelect={handleEpisodeSelect}
                            containerHeight={384}
                            itemHeight={60}
                          />
                        </div>
                      )}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                          <div className="text-white/60 text-sm">
                            Page {currentPage} of {totalPages}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="px-3 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="px-3 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-white/10">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const episode = episodes.find(e => e.episode_number === selectedEpisode);
                    if (episode) {
                      handleEpisodeSelect(episode);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg transition-all duration-200 text-white font-semibold shadow-lg hover:shadow-red-500/25"
                >
                  Watch Episode {selectedEpisode}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlayContent, portalContainer);
};

export default TVEpisodeSelector; 