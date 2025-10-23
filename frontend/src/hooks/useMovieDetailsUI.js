/**
 * 🚀 Advanced Movie Details UI State Management Hook
 * 
 * This hook manages all UI-related state for the movie details overlay:
 * - Modal states (trailer, share sheet, episode selector, etc.)
 * - Scroll behavior
 * - Keyboard navigation
 * - Focus management
 * - Accessibility features
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export const useMovieDetailsUI = ({ onClose, movieDetails } = {}) => {
  // Modal states
  const [modals, setModals] = useState({
    trailer: false,
    shareSheet: false,
    episodeSelector: false,
    streamingPlayer: false,
    castDetails: false,
  });

  // UI states
  const [uiState, setUIState] = useState({
    showAllCast: false,
    sharePanelExpanded: false,
    showShareEditor: false,
    scrollY: 0,
    isAtBottom: false,
    isAtTop: true,
  });

  // Selected items
  const [selectedItems, setSelectedItems] = useState({
    castMember: null,
    episode: null,
    season: null,
  });

  // Refs
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const previousFocusRef = useRef(null);

  /**
   * Update modal state
   */
  const toggleModal = useCallback((modalName, isOpen) => {
    setModals(prev => {
      if (prev[modalName] === isOpen) return prev;
      return { ...prev, [modalName]: isOpen };
    });

    // Handle focus management
    if (isOpen) {
      // Save current focus
      previousFocusRef.current = document.activeElement;
    } else {
      // Restore previous focus
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    }
  }, []);

  /**
   * Open/close specific modals
   */
  const openTrailer = useCallback(() => toggleModal('trailer', true), [toggleModal]);
  const closeTrailer = useCallback(() => toggleModal('trailer', false), [toggleModal]);
  
  const openShareSheet = useCallback(() => toggleModal('shareSheet', true), [toggleModal]);
  const closeShareSheet = useCallback(() => toggleModal('shareSheet', false), [toggleModal]);
  
  const openEpisodeSelector = useCallback(() => toggleModal('episodeSelector', true), [toggleModal]);
  const closeEpisodeSelector = useCallback(() => toggleModal('episodeSelector', false), [toggleModal]);
  
  const openStreamingPlayer = useCallback(() => toggleModal('streamingPlayer', true), [toggleModal]);
  const closeStreamingPlayer = useCallback(() => toggleModal('streamingPlayer', false), [toggleModal]);
  
  const openCastDetails = useCallback((castMember) => {
    setSelectedItems(prev => ({ ...prev, castMember }));
    toggleModal('castDetails', true);
  }, [toggleModal]);
  
  const closeCastDetails = useCallback(() => {
    setSelectedItems(prev => ({ ...prev, castMember: null }));
    toggleModal('castDetails', false);
  }, [toggleModal]);

  /**
   * Update UI state
   */
  const updateUIState = useCallback((updates) => {
    setUIState(prev => {
      const newState = { ...prev, ...updates };
      if (JSON.stringify(prev) === JSON.stringify(newState)) return prev;
      return newState;
    });
  }, []);

  /**
   * Toggle UI elements
   */
  const toggleShowAllCast = useCallback(() => {
    updateUIState({ showAllCast: !uiState.showAllCast });
  }, [uiState.showAllCast, updateUIState]);

  const toggleSharePanelExpanded = useCallback(() => {
    updateUIState({ sharePanelExpanded: !uiState.sharePanelExpanded });
  }, [uiState.sharePanelExpanded, updateUIState]);

  const toggleShareEditor = useCallback(() => {
    updateUIState({ showShareEditor: !uiState.showShareEditor });
  }, [uiState.showShareEditor, updateUIState]);

  /**
   * Scroll handling
   */
  const handleScroll = useCallback((e) => {
    if (!e.target) return;

    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const scrollY = scrollTop;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    const isAtTop = scrollTop <= 10;

    updateUIState({ scrollY, isAtBottom, isAtTop });
  }, [updateUIState]);

  /**
   * Scroll to top
   */
  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  /**
   * Scroll to section
   */
  const scrollToSection = useCallback((sectionId) => {
    if (!scrollContainerRef.current) return;

    const section = scrollContainerRef.current.querySelector(`#${sectionId}`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  /**
   * Close all modals
   */
  const closeAllModals = useCallback(() => {
    setModals({
      trailer: false,
      shareSheet: false,
      episodeSelector: false,
      streamingPlayer: false,
      castDetails: false,
    });
  }, []);

  /**
   * Setup keyboard shortcuts
   */
  const keyboardShortcuts = useMemo(() => ({
    'Escape': () => {
      // Close modals in order of priority
      if (modals.trailer) {
        closeTrailer();
      } else if (modals.shareSheet) {
        closeShareSheet();
      } else if (modals.episodeSelector) {
        closeEpisodeSelector();
      } else if (modals.streamingPlayer) {
        closeStreamingPlayer();
      } else if (modals.castDetails) {
        closeCastDetails();
      } else if (onClose) {
        onClose();
      }
    },
    't': () => {
      if (!modals.trailer && movieDetails) {
        openTrailer();
      }
    },
    's': () => {
      if (!modals.shareSheet && movieDetails) {
        openShareSheet();
      }
    },
    'c': () => {
      if (movieDetails) {
        toggleShowAllCast();
      }
    },
    'Home': () => {
      scrollToTop();
    },
    'ArrowUp': (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        scrollToTop();
      }
    },
  }), [
    modals,
    movieDetails,
    onClose,
    closeTrailer,
    closeShareSheet,
    closeEpisodeSelector,
    closeStreamingPlayer,
    closeCastDetails,
    openTrailer,
    openShareSheet,
    toggleShowAllCast,
    scrollToTop,
  ]);

  // Register keyboard shortcuts (if hook exists)
  useEffect(() => {
    if (!movieDetails) return;

    const handleKeyDown = (e) => {
      const handler = keyboardShortcuts[e.key];
      if (handler && !e.target.matches('input, textarea, select')) {
        handler(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcuts, movieDetails]);

  /**
   * Focus trap for modals
   */
  useEffect(() => {
    if (!overlayRef.current) return;

    const anyModalOpen = Object.values(modals).some(Boolean);
    if (!anyModalOpen) return;

    const focusableElements = overlayRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [modals]);

  /**
   * Prevent body scroll when overlay is open
   */
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    if (movieDetails) {
      // Prevent scroll
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [movieDetails]);

  /**
   * Reset scroll position when movie changes
   */
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    updateUIState({ scrollY: 0, isAtBottom: false, isAtTop: true });
  }, [movieDetails?.id, updateUIState]);

  /**
   * Announce modal changes to screen readers
   */
  useEffect(() => {
    const announceModal = (modalName, isOpen) => {
      const message = isOpen
        ? `${modalName} modal opened`
        : `${modalName} modal closed`;

      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      document.body.appendChild(announcement);

      setTimeout(() => announcement.remove(), 1000);
    };

    Object.entries(modals).forEach(([name, isOpen]) => {
      if (isOpen) {
        announceModal(name, true);
      }
    });
  }, [modals]);

  return {
    // Modal states
    modals,
    toggleModal,
    openTrailer,
    closeTrailer,
    openShareSheet,
    closeShareSheet,
    openEpisodeSelector,
    closeEpisodeSelector,
    openStreamingPlayer,
    closeStreamingPlayer,
    openCastDetails,
    closeCastDetails,
    closeAllModals,

    // UI states
    uiState,
    updateUIState,
    toggleShowAllCast,
    toggleSharePanelExpanded,
    toggleShareEditor,

    // Selected items
    selectedItems,
    setSelectedItems,

    // Scroll
    handleScroll,
    scrollToTop,
    scrollToSection,

    // Refs
    overlayRef,
    contentRef,
    scrollContainerRef,

    // Keyboard shortcuts info (for help display)
    keyboardShortcuts: Object.entries(keyboardShortcuts).map(([key, _]) => ({
      key,
      description: getShortcutDescription(key),
    })),
  };
};

/**
 * Get human-readable description for keyboard shortcuts
 */
function getShortcutDescription(key) {
  const descriptions = {
    'Escape': 'Close current modal or overlay',
    't': 'Open trailer',
    's': 'Open share sheet',
    'c': 'Toggle show all cast',
    'Home': 'Scroll to top',
    'ArrowUp': 'Scroll to top (with Ctrl/Cmd)',
  };

  return descriptions[key] || '';
}

export default useMovieDetailsUI;
