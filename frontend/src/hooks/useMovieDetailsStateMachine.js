/**
 * 🚀 Advanced State Machine for Movie Details UI Flows
 * 
 * Implements predictable state transitions using XState-inspired patterns:
 * - Trailer modal workflow
 * - Streaming player workflow
 * - Episode selector workflow
 * - Share sheet workflow
 * - Prevents invalid state transitions
 * - Enables time-travel debugging
 */

import { useReducer, useCallback, useMemo } from 'react';

// State machine states
const STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  PLAYING: 'playing',
  PAUSED: 'paused',
  SHARING: 'sharing',
  SELECTING: 'selecting',
};

// State machine events
const EVENTS = {
  OPEN_TRAILER: 'OPEN_TRAILER',
  CLOSE_TRAILER: 'CLOSE_TRAILER',
  PLAY_TRAILER: 'PLAY_TRAILER',
  PAUSE_TRAILER: 'PAUSE_TRAILER',
  TRAILER_ERROR: 'TRAILER_ERROR',
  
  OPEN_STREAMING: 'OPEN_STREAMING',
  CLOSE_STREAMING: 'CLOSE_STREAMING',
  START_STREAMING: 'START_STREAMING',
  PAUSE_STREAMING: 'PAUSE_STREAMING',
  STREAMING_ERROR: 'STREAMING_ERROR',
  
  OPEN_EPISODE_SELECTOR: 'OPEN_EPISODE_SELECTOR',
  CLOSE_EPISODE_SELECTOR: 'CLOSE_EPISODE_SELECTOR',
  SELECT_EPISODE: 'SELECT_EPISODE',
  SELECT_SEASON: 'SELECT_SEASON',
  
  OPEN_SHARE: 'OPEN_SHARE',
  CLOSE_SHARE: 'CLOSE_SHARE',
  START_SHARE_GENERATION: 'START_SHARE_GENERATION',
  SHARE_GENERATION_SUCCESS: 'SHARE_GENERATION_SUCCESS',
  SHARE_GENERATION_ERROR: 'SHARE_GENERATION_ERROR',
  SHARE_COMPLETE: 'SHARE_COMPLETE',
  
  RESET: 'RESET',
};

// Initial state for all workflows
const initialState = {
  trailer: {
    state: STATES.IDLE,
    isOpen: false,
    isPlaying: false,
    error: null,
    videoId: null,
  },
  streaming: {
    state: STATES.IDLE,
    isOpen: false,
    isPlaying: false,
    error: null,
    service: null,
    episode: null,
  },
  episodeSelector: {
    state: STATES.IDLE,
    isOpen: false,
    selectedSeason: null,
    selectedEpisode: null,
    error: null,
  },
  share: {
    state: STATES.IDLE,
    isOpen: false,
    isGenerating: false,
    imageUrl: null,
    error: null,
    config: null,
  },
  history: [],
};

// State machine reducer
function stateReducer(state, action) {
  // Track state history for debugging
  const newHistory = [...state.history, { action: action.type, timestamp: Date.now() }].slice(-20);

  switch (action.type) {
    // Trailer events
    case EVENTS.OPEN_TRAILER:
      if (state.trailer.isOpen) return state; // Prevent duplicate opens
      return {
        ...state,
        trailer: {
          ...state.trailer,
          state: STATES.LOADING,
          isOpen: true,
          videoId: action.videoId,
          error: null,
        },
        history: newHistory,
      };

    case EVENTS.PLAY_TRAILER:
      if (!state.trailer.isOpen) return state; // Can't play if not open
      return {
        ...state,
        trailer: {
          ...state.trailer,
          state: STATES.PLAYING,
          isPlaying: true,
          error: null,
        },
        history: newHistory,
      };

    case EVENTS.PAUSE_TRAILER:
      if (!state.trailer.isOpen || !state.trailer.isPlaying) return state;
      return {
        ...state,
        trailer: {
          ...state.trailer,
          state: STATES.PAUSED,
          isPlaying: false,
        },
        history: newHistory,
      };

    case EVENTS.CLOSE_TRAILER:
      return {
        ...state,
        trailer: {
          ...initialState.trailer,
        },
        history: newHistory,
      };

    case EVENTS.TRAILER_ERROR:
      return {
        ...state,
        trailer: {
          ...state.trailer,
          state: STATES.ERROR,
          isPlaying: false,
          error: action.error,
        },
        history: newHistory,
      };

    // Streaming events
    case EVENTS.OPEN_STREAMING:
      if (state.streaming.isOpen) return state;
      return {
        ...state,
        streaming: {
          ...state.streaming,
          state: STATES.LOADING,
          isOpen: true,
          service: action.service,
          episode: action.episode,
          error: null,
        },
        history: newHistory,
      };

    case EVENTS.START_STREAMING:
      if (!state.streaming.isOpen) return state;
      return {
        ...state,
        streaming: {
          ...state.streaming,
          state: STATES.PLAYING,
          isPlaying: true,
        },
        history: newHistory,
      };

    case EVENTS.PAUSE_STREAMING:
      if (!state.streaming.isOpen || !state.streaming.isPlaying) return state;
      return {
        ...state,
        streaming: {
          ...state.streaming,
          state: STATES.PAUSED,
          isPlaying: false,
        },
        history: newHistory,
      };

    case EVENTS.CLOSE_STREAMING:
      return {
        ...state,
        streaming: {
          ...initialState.streaming,
        },
        history: newHistory,
      };

    case EVENTS.STREAMING_ERROR:
      return {
        ...state,
        streaming: {
          ...state.streaming,
          state: STATES.ERROR,
          isPlaying: false,
          error: action.error,
        },
        history: newHistory,
      };

    // Episode selector events
    case EVENTS.OPEN_EPISODE_SELECTOR:
      if (state.episodeSelector.isOpen) return state;
      return {
        ...state,
        episodeSelector: {
          ...state.episodeSelector,
          state: STATES.SELECTING,
          isOpen: true,
          error: null,
        },
        history: newHistory,
      };

    case EVENTS.SELECT_SEASON:
      if (!state.episodeSelector.isOpen) return state;
      return {
        ...state,
        episodeSelector: {
          ...state.episodeSelector,
          selectedSeason: action.season,
          selectedEpisode: null, // Reset episode when season changes
        },
        history: newHistory,
      };

    case EVENTS.SELECT_EPISODE:
      if (!state.episodeSelector.isOpen) return state;
      return {
        ...state,
        episodeSelector: {
          ...state.episodeSelector,
          selectedEpisode: action.episode,
        },
        history: newHistory,
      };

    case EVENTS.CLOSE_EPISODE_SELECTOR:
      return {
        ...state,
        episodeSelector: {
          ...initialState.episodeSelector,
        },
        history: newHistory,
      };

    // Share events
    case EVENTS.OPEN_SHARE:
      if (state.share.isOpen) return state;
      return {
        ...state,
        share: {
          ...state.share,
          state: STATES.IDLE,
          isOpen: true,
          config: action.config || null,
          error: null,
        },
        history: newHistory,
      };

    case EVENTS.START_SHARE_GENERATION:
      if (!state.share.isOpen) return state;
      return {
        ...state,
        share: {
          ...state.share,
          state: STATES.LOADING,
          isGenerating: true,
          error: null,
        },
        history: newHistory,
      };

    case EVENTS.SHARE_GENERATION_SUCCESS:
      if (!state.share.isOpen || !state.share.isGenerating) return state;
      return {
        ...state,
        share: {
          ...state.share,
          state: STATES.SUCCESS,
          isGenerating: false,
          imageUrl: action.imageUrl,
          error: null,
        },
        history: newHistory,
      };

    case EVENTS.SHARE_GENERATION_ERROR:
      return {
        ...state,
        share: {
          ...state.share,
          state: STATES.ERROR,
          isGenerating: false,
          error: action.error,
        },
        history: newHistory,
      };

    case EVENTS.SHARE_COMPLETE:
      return {
        ...state,
        share: {
          ...initialState.share,
        },
        history: newHistory,
      };

    case EVENTS.CLOSE_SHARE:
      return {
        ...state,
        share: {
          ...initialState.share,
        },
        history: newHistory,
      };

    // Reset all
    case EVENTS.RESET:
      return {
        ...initialState,
        history: newHistory,
      };

    default:
      console.warn(`[MovieDetailsStateMachine] Unknown event: ${action.type}`);
      return state;
  }
}

/**
 * Hook to manage movie details UI state machine
 */
export const useMovieDetailsStateMachine = () => {
  const [state, dispatch] = useReducer(stateReducer, initialState);

  // Trailer actions
  const openTrailer = useCallback((videoId) => {
    dispatch({ type: EVENTS.OPEN_TRAILER, videoId });
  }, []);

  const closeTrailer = useCallback(() => {
    dispatch({ type: EVENTS.CLOSE_TRAILER });
  }, []);

  const playTrailer = useCallback(() => {
    dispatch({ type: EVENTS.PLAY_TRAILER });
  }, []);

  const pauseTrailer = useCallback(() => {
    dispatch({ type: EVENTS.PAUSE_TRAILER });
  }, []);

  const trailerError = useCallback((error) => {
    dispatch({ type: EVENTS.TRAILER_ERROR, error });
  }, []);

  // Streaming actions
  const openStreaming = useCallback((service, episode = null) => {
    dispatch({ type: EVENTS.OPEN_STREAMING, service, episode });
  }, []);

  const closeStreaming = useCallback(() => {
    dispatch({ type: EVENTS.CLOSE_STREAMING });
  }, []);

  const startStreaming = useCallback(() => {
    dispatch({ type: EVENTS.START_STREAMING });
  }, []);

  const pauseStreaming = useCallback(() => {
    dispatch({ type: EVENTS.PAUSE_STREAMING });
  }, []);

  const streamingError = useCallback((error) => {
    dispatch({ type: EVENTS.STREAMING_ERROR, error });
  }, []);

  // Episode selector actions
  const openEpisodeSelector = useCallback(() => {
    dispatch({ type: EVENTS.OPEN_EPISODE_SELECTOR });
  }, []);

  const closeEpisodeSelector = useCallback(() => {
    dispatch({ type: EVENTS.CLOSE_EPISODE_SELECTOR });
  }, []);

  const selectSeason = useCallback((season) => {
    dispatch({ type: EVENTS.SELECT_SEASON, season });
  }, []);

  const selectEpisode = useCallback((episode) => {
    dispatch({ type: EVENTS.SELECT_EPISODE, episode });
  }, []);

  // Share actions
  const openShare = useCallback((config = null) => {
    dispatch({ type: EVENTS.OPEN_SHARE, config });
  }, []);

  const closeShare = useCallback(() => {
    dispatch({ type: EVENTS.CLOSE_SHARE });
  }, []);

  const startShareGeneration = useCallback(() => {
    dispatch({ type: EVENTS.START_SHARE_GENERATION });
  }, []);

  const shareGenerationSuccess = useCallback((imageUrl) => {
    dispatch({ type: EVENTS.SHARE_GENERATION_SUCCESS, imageUrl });
  }, []);

  const shareGenerationError = useCallback((error) => {
    dispatch({ type: EVENTS.SHARE_GENERATION_ERROR, error });
  }, []);

  const shareComplete = useCallback(() => {
    dispatch({ type: EVENTS.SHARE_COMPLETE });
  }, []);

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: EVENTS.RESET });
  }, []);

  // Selectors (memoized)
  const selectors = useMemo(() => ({
    // Trailer selectors
    isTrailerOpen: state.trailer.isOpen,
    isTrailerPlaying: state.trailer.isPlaying,
    trailerState: state.trailer.state,
    trailerError: state.trailer.error,
    trailerVideoId: state.trailer.videoId,

    // Streaming selectors
    isStreamingOpen: state.streaming.isOpen,
    isStreamingPlaying: state.streaming.isPlaying,
    streamingState: state.streaming.state,
    streamingError: state.streaming.error,
    streamingService: state.streaming.service,
    streamingEpisode: state.streaming.episode,

    // Episode selector selectors
    isEpisodeSelectorOpen: state.episodeSelector.isOpen,
    selectedSeason: state.episodeSelector.selectedSeason,
    selectedEpisode: state.episodeSelector.selectedEpisode,
    episodeSelectorError: state.episodeSelector.error,

    // Share selectors
    isShareOpen: state.share.isOpen,
    isShareGenerating: state.share.isGenerating,
    shareState: state.share.state,
    shareImageUrl: state.share.imageUrl,
    shareError: state.share.error,
    shareConfig: state.share.config,

    // Any modal open
    isAnyModalOpen: state.trailer.isOpen || state.streaming.isOpen || 
                    state.episodeSelector.isOpen || state.share.isOpen,

    // History
    stateHistory: state.history,
  }), [state]);

  // Debug helpers (only in development)
  const debug = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return {};

    return {
      getCurrentState: () => state,
      getHistory: () => state.history,
      logState: () => console.log('State Machine:', state),
      logHistory: () => console.table(state.history),
    };
  }, [state]);

  return {
    // State
    state,
    ...selectors,

    // Trailer actions
    openTrailer,
    closeTrailer,
    playTrailer,
    pauseTrailer,
    trailerError,

    // Streaming actions
    openStreaming,
    closeStreaming,
    startStreaming,
    pauseStreaming,
    streamingError,

    // Episode selector actions
    openEpisodeSelector,
    closeEpisodeSelector,
    selectSeason,
    selectEpisode,

    // Share actions
    openShare,
    closeShare,
    startShareGeneration,
    shareGenerationSuccess,
    shareGenerationError,
    shareComplete,

    // Reset
    reset,

    // Debug
    debug,
  };
};

export default useMovieDetailsStateMachine;
