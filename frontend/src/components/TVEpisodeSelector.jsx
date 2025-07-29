import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const TVEpisodeSelector = ({ 
  show, 
  isOpen, 
  onClose, 
  onEpisodeSelect 
}) => {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [portalContainer, setPortalContainer] = useState(null);

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
      setSelectedSeason(1);
      setSelectedEpisode(1);
    }
  }, [isOpen]);

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
    setSelectedSeason(season);
    setSelectedEpisode(1); // Reset to first episode when season changes
  };

  const handleEpisodeSelect = () => {
    onEpisodeSelect(selectedSeason, selectedEpisode);
    handleClose();
  };

  // Generate seasons (assuming max 10 seasons for now)
  const seasons = Array.from({ length: 10 }, (_, i) => i + 1);
  
  // Generate episodes (assuming max 20 episodes per season for now)
  const episodes = Array.from({ length: 20 }, (_, i) => i + 1);

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
            className="relative w-full max-w-md bg-gradient-to-br from-[#1a1d24] to-[#121417] rounded-2xl shadow-2xl overflow-hidden"
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
            <div className="p-6 space-y-6">
              {/* Season Selection */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-3">
                  Season
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {seasons.map((season) => (
                    <button
                      key={season}
                      onClick={() => handleSeasonChange(season)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedSeason === season
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {season}
                    </button>
                  ))}
                </div>
              </div>

              {/* Episode Selection */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-3">
                  Episode
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                  {episodes.map((episode) => (
                    <button
                      key={episode}
                      onClick={() => setSelectedEpisode(episode)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedEpisode === episode
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {episode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEpisodeSelect}
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