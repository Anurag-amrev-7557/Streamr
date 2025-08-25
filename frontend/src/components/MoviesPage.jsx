import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  getTrendingMovies, 
  getPopularMovies, 
  getTopRatedMovies, 
  getGenres, 
  getMovieDetails,
  searchMovies,
  getMoviesByGenre,
  getMoviesByYear,
  fetchWithCache,
  TMDB_BASE_URL,
  TMDB_API_KEY,
  transformMovieData,
  getUpcomingMovies,
  getMoviesByCategory,
  discoverMovies,
  getSimilarMovies,
  getNowPlayingMovies,
  getMoviesByNetwork
} from '../services/tmdbService';
import { useLoading } from '../contexts/LoadingContext';
const MovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'));
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { debounce } from 'lodash';
import { useWatchlist } from '../contexts/WatchlistContext';
const EnhancedSearchBar = lazy(() => import('./EnhancedSearchBar'));
import searchHistoryService from '../services/searchHistoryService';
import { getPosterProps, getBackdropProps, getTmdbImageUrl } from '../utils/imageUtils';
import RatingBadge from './RatingBadge';
import enhancedLoadingService from '../services/enhancedLoadingService';
import EnhancedLoadingIndicator from './EnhancedLoadingIndicator';
import NetworkStatusBadge from './NetworkStatusBadge';

// Streaming service icons
const StreamingIcons = {
  popular: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  top_rated: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  ),
  upcoming: () => (
    // Calendar with a clock for "Upcoming"
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="16" cy="16" r="3" />
      <path d="M16 16v-1.5M16 16l1.2 1.2" />
    </svg>
  ),
  now_playing: () => (
    // Play button with sound waves for "Now Playing"
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10,8 16,12 10,16 10,8" fill="currentColor" stroke="none"/>
      <path d="M18 12c0-3.31-2.69-6-6-6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M18 12c0 3.31-2.69 6-6 6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  airing_today: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  netflix: () => (
    <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 16 16" className="w-4 h-4">
      <path d="M10 0v8L7 0H4v16h3V8l3 8h3V0z" fill="currentColor"/>
    </svg>
  ),
  prime: () => (
    <svg
      viewBox="0 0 92 89"
      xmlns="http://www.w3.org/2000/svg"
      className="w-8 h-8"
      aria-label="Prime Video"
      fill="none"
    >
      <title>Prime Video</title>
      <g>
        <path
          d="M6.93 48.53c-.22.01-.43-.06-.59-.2-.14-.17-.2-.38-.18-.6v-20.4c-.03-.22.04-.43.18-.6.17-.13.37-.19.58-.17h2.22c.42-.04.8.25.86.67l.22.8c.64-.62 1.39-1.1 2.22-1.43.85-.34 1.75-.52 2.66-.52 1.82-.06 3.56.75 4.68 2.18 1.24 1.71 1.85 3.78 1.74 5.89.03 1.53-.26 3.05-.86 4.45-.5 1.17-1.3 2.18-2.33 2.93-.99.68-2.18 1.03-3.38 1-.82 0-1.63-.13-2.4-.4-.71-.24-1.36-.61-1.93-1.1v6.72c.02.21-.04.43-.17.6-.17.13-.39.19-.6.17l-2.22-.01zm6.73-9.36c.99.07 1.94-.37 2.53-1.17.62-1.12.9-2.39.81-3.67.1-1.29-.18-2.58-.8-3.71-.59-.81-1.55-1.25-2.55-1.17-1.06 0-2.09.29-3 .83v8.05c.9.56 1.94.85 3 .85z"
          fill="currentColor"
        />
        <path
          d="M25.32 42.21c-.36.07-.7-.17-.77-.53-.02-.08-.02-.16 0-.24V27.33c-.03-.22.04-.43.18-.6.17-.13.37-.19.58-.17h2.21c.42-.04.8.25.86.67l.4 1.64c.66-.77 1.44-1.42 2.32-1.92.72-.38 1.51-.57 2.32-.57h.43c.22-.02.43.04.61.17.14.17.2.38.18.6v2.58c.02.21-.04.41-.17.58-.17.14-.38.21-.6.18h-.7c-.23 0-.51 0-.86 0-.58.01-1.15.08-1.72.2-.59.11-1.17.28-1.72.51v10.25c.02.21-.04.41-.17.58-.17.14-.38.21-.6.18h-2.21z"
          fill="currentColor"
        />
        <path
          d="M39.07 24.12c-.68.03-1.35-.2-1.87-.64-.48-.45-.74-1.09-.71-1.75-.03-.66.23-1.31.71-1.76 1.1-.88 2.65-.88 3.75 0 .48.45.74 1.09.71 1.75.03.66-.23 1.3-.71 1.75-.67.56-1.34.79-2.18.65zm-1.47 18.1c-.36.07-.7-.17-.77-.53-.02-.08-.02-.16 0-.24V27.33c-.03-.22.04-.43.18-.6.17-.13.37-.19.58-.17h2.95c.21-.02.43.04.6.17.13.17.19.39.17.6v14.12c.02.21-.04.41-.17.58-.17.14-.38.21-.6.18l-2.94-.01z"
          fill="currentColor"
        />
        <path
          d="M45.88 42.21c-.36.07-.7-.17-.77-.53-.02-.08-.02-.16 0-.24V27.33c-.03-.22.04-.43.18-.6.17-.13.37-.19.58-.17h2.21c.42-.04.8.25.86.67l.25.83c.91-.63 1.89-1.14 2.93-1.52.86-.3 1.75-.45 2.66-.46 1.58-.13 3.09.64 3.9 2 .91-.63 1.9-1.13 2.95-1.5.92-.31 1.89-.46 2.86-.46 1.23-.07 2.43.36 3.33 1.2.83.91 1.25 2.11 1.18 3.34v10.79c.02.21-.04.41-.17.58-.17.14-.38.21-.6.18h-2.21c-.36.07-.7-.17-.77-.53-.02-.08-.02-.16 0-.24v-9.84c0-1.39-.62-2.09-1.87-2.09-1.16.01-2.31.29-3.35.8v11.14c.02.21-.04.41-.17.58-.17.14-.38.21-.6.18h-2.21c-.36.07-.7-.17-.77-.53-.02-.08-.02-.16 0-.24v-9.84c0-1.39-.62-2.09-1.87-2.09-1.18.01-2.33.29-3.38.83v11.1c.02.21-.04.41-.17.58-.17.14-.38.21-.6.18l-2.21-.01z"
          fill="currentColor"
        />
        <path
          d="M79.7 42.67c-2.15.14-4.27-.61-5.85-2.09-1.44-1.65-2.16-3.81-2-6-.14-2.27.59-4.5 2.04-6.25 1.51-1.56 3.64-2.39 5.81-2.27 1.61-.1 3.2.39 4.47 1.38 1.08.92 1.67 2.29 1.61 3.7.07 1.38-.59 2.71-1.74 3.48-1.55.89-3.33 1.3-5.11 1.18-1.01.01-2.02-.1-3-.34.01 1.11.45 2.16 1.24 2.94.93.66 2.07.98 3.21.89.56 0 1.12-.04 1.67-.11.76-.12 1.52-.28 2.26-.48h.18c.1 0 .15 0 .15 0 .35 0 .52.24.52.71v1.41c.02.24-.03.48-.14.69-.14.17-.33.29-.54.35-1.23.34-2.85.61-4.48.58zm-1-9.63c.79.06 1.57-.11 2.27-.48.48-.33.75-.88.71-1.46 0-1.29-.77-1.93-2.3-1.93-1.97 0-3.1 1.21-3.41 3.62.89.17 1.8.25 2.71.25z"
          fill="currentColor"
        />
        <path
          d="M78.09 59.44c-8.76 6.46-21.46 9.89-32.39 9.89-14.61.08-28.72-5.29-39.57-15.07-.82-.74-.09-1.75.9-1.18 12.06 6.89 25.71 10.5 39.59 10.49 10.36-.06 20.61-2.15 30.16-6.17 1.12-.47 2.36 1.09.81 2.04z"
          fill="currentColor"
        />
        <path
          d="M81.78 55.33c-1.12-1.43-7.4-.68-10.23-.34-.86.1-1-.64-.22-1.18 5-3.52 13.23-2.5 14.18-1.32.95 1.18-.25 9.41-5 13.34-.72.6-1.41.28-1.09-.52.99-2.16 3.36-8.06 2.36-9.28z"
          fill="currentColor"
        />
      </g>
    </svg>
  ),
  hbo: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="w-8 h-8">
      <path d="M13 12.07v13.78H9.2v-5.08H6.79v5.08H3V12.07h3.79v5.24H9.2v-5.24Zm17 4.11A2.82 2.82 0 1 0 32.81 19 2.82 2.82 0 0 0 30 16.18Zm0 0A2.82 2.82 0 1 0 32.81 19 2.82 2.82 0 0 0 30 16.18Zm0 0A2.82 2.82 0 1 0 32.81 19 2.82 2.82 0 0 0 30 16.18Zm0 0A2.82 2.82 0 1 0 32.81 19 2.82 2.82 0 0 0 30 16.18ZM30 12a7 7 0 0 0-6.41 4.17 3.83 3.83 0 0 0-1.08-3 4.63 4.63 0 0 0-3.37-1H13.8v13.71h5.33a4 4 0 0 0 3.05-.88 4.38 4.38 0 0 0 1.28-3.46A7 7 0 1 0 30 12ZM19.66 22.36a1.24 1.24 0 0 1-.82.29h-1.69v-2.1h1.69A1 1 0 0 1 20 21.62a.94.94 0 0 1-.34.74Zm0-5.07a1.16 1.16 0 0 1-.82.31h-1.7v-2.18h1.67a1.36 1.36 0 0 1 .92.24 1.13 1.13 0 0 1 .27.86 1 1 0 0 1-.33.77Zm1.94 1.63c.29-.18 1-.44 1.42-.72a7 7 0 0 0-.02.8 5.33 5.33 0 0 0 .08 1 9 9 0 0 0-1.47-1.08Zm8.4 3.54A3.46 3.46 0 1 1 33.45 19 3.46 3.46 0 0 1 30 22.46Zm0-6.28A2.82 2.82 0 1 0 32.81 19 2.82 2.82 0 0 0 30 16.18Z" fill="currentColor"/>
    </svg>
  ),
  hulu: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="5.348 31.697 89.762 29.228" className="w-8 h-8">
      <path d="M95.109 40.81h-7.148v11.781c0 .532-.207.984-.539 1.354-.334.329-.791.493-1.329.533h-4.155c-.582-.041-1.039-.205-1.372-.533-.333-.369-.54-.82-.54-1.354V40.81h-7.147v12.397c.042 1.643.333 3.078 1.04 4.227.705 1.15 1.619 2.012 2.824 2.586 1.248.574 2.66.904 4.279.904h6.941v-.082c1.496 0 2.783-.328 3.864-.944a6.405 6.405 0 0 0 2.411-2.71c.58-1.149.871-2.505.871-3.982V40.81zm-71.518.739c-1.247-.533-2.618-.78-4.114-.739h-4.613l-1.787.206c-.416.123-.624.205-.624.205v-9.524H5.348v29.228h7.106V49.102c.042-.493.208-.985.582-1.313.374-.328.79-.533 1.371-.533h4.156c.499 0 .956.207 1.33.533.374.329.54.821.582 1.313v11.823h7.106V48.199c0-1.766-.374-3.202-1.08-4.311-.749-1.067-1.705-1.846-2.91-2.339zm24.185 11.043c-.042.532-.208.983-.54 1.354-.374.328-.831.492-1.371.532h-4.156c-.54-.041-.997-.205-1.33-.532-.374-.37-.54-.821-.582-1.354V40.81h-7.106v12.397c0 1.643.333 3.078.998 4.227.665 1.15 1.62 2.012 2.826 2.586 1.247.574 2.618.904 4.28.904h6.981v-.082c1.496 0 2.785-.328 3.824-.944a6.778 6.778 0 0 0 2.451-2.71c.54-1.149.832-2.505.873-3.982V40.81h-7.148v11.782zm12.55 8.333h7.106V31.697h-7.106v29.228z" fill="currentColor"/>
    </svg>
  ),
  disney: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192.756 192.756" className="w-9 h-9">
      <path d="M96.954 66.126a5.674 5.674 0 0 1 3.451 1.38c1.312 1.242 1.656 3.313 1.035 4.97-2.414 4.969-8.155 8.288-12.078 9.386-2.347.552-5.314.552-7.454-.276-1.036.621-1.91 2.628-3.175 1.794-1.831-1.43-.246-3.668-1.303-5.256-.218-.327-.767-.351-1.043-.886-1.45-3.175.345-6.212 2.346-8.627 3.336-3.722 12.907-7.869 18.221-2.485zM85.842 68.61c-1.864.345-3.969 1.156-5.107 2.485-1.139 1.328-1.863 2.623-1.173 4.003 2.416-1.794 3.589-4.279 6.281-5.797-.001-.277.413-.484-.001-.691zm11.251.691c-4.763-.415-8.352 3.175-11.734 6.625-.207.552-1.449 1.173-.483 1.794 4.556.414 8.904-.896 12.217-3.934.967-.897 1.655-2.07 1.174-3.313-.207-.482-.694-.965-1.174-1.172zM138.364 89.868c2.209 5.384 4.072 13.872 0 19.049-1.104 1.242-3.036 2.387-4.278 1.449-4.556-3.657-6.487-8.903-9.317-13.597-.414-.207-.414.346-.621.553-1.035 4.762.897 10.974-2.346 14.7-1.242.207-2.404-.432-2.83-1.656-1.588-4.9.067-10.008.481-14.908.967-2.485 1.381-5.383 3.521-7.247 3.451 1.38 5.107 5.246 7.107 8.076 1.451 2.139 2.623 4.555 4.279 6.487 1.449-.621.736-2.515.691-3.658-.554-4.486-1.796-8.627-2.97-12.906-.067-1.104-.688-2.968.483-3.658 3.11 1.381 4.419 4.624 5.8 7.316zM117.521 88.211c0 1.036-.828 2.33-1.52 2.485-6.625 1.035-14.01.414-20.221 2.484-.207.759.69.897 1.173 1.104 5.313.828 10.905 1.035 16.082 2.347 2.737.695 3.728 3.935 3.935 6.626.127 2.122-.689 4.693-2.761 6.143-5.106 3.244-12.905 3.105-18.083.139-1.979-1.11-3.865-2.898-4.003-5.107.012-1.754.76-3.135 2.002-3.796 4.97-2.002 11.112-.896 15.392 1.656.274 1.381-1.22 1.306-1.935 1.795-4.763 2.761-8.351-3.104-12.768-.967-.621.414-1.07 1.569-.345 1.933 5.452 2.416 11.526.69 16.909-.828.621-.207 1.381-.828 1.449-1.449-.207-2.209-2.691-2.691-4.279-3.312-4.693-1.173-9.869-1.173-14.908-1.656-.966-.207-2.197-.88-2.484-1.656-.552-1.656-.552-3.934.69-5.314 6.418-5.66 16.149-5.176 24.293-3.658.553.203 1.174.41 1.382 1.031zM87.361 90.834c.621 6.625.966 12.769.828 19.739-.138.896-1.173 1.104-1.863 1.449-1.104.207-2.531-.028-2.968-.621-1.587-2.555-1.035-6.004-1.173-9.11.207-4.899.138-10.214 1.519-14.77.264-.662 1.035-1.242 1.656-.829 1.656.829 1.932 2.486 2.001 4.142zM164.041 89.868c.332.558.679 1.42 0 1.794-3.106 1.38-7.315.759-10.905 1.173-.966.828-1.726 2.208-1.382 3.451.347.207.656.522 1.037.482 2.207.139 5.521-1.035 6.972 1.035.354.616-.048 2.916-1.035 2.968-2.693.347-7.121-.338-8.422.347-1.656 1.104-1.519 3.243-2.14 4.97 1.174.759 2.403-.018 3.795-.208 2.556-.414 5.386-1.173 7.938-.621.483.897 1.174 1.864.69 2.968-4.351 3.451-9.963 6.988-15.942 4.486-2.244-1.006-3.244-4.417-2.484-7.314.482-2.071 2.621-4.072 1.311-6.281-.207-.967.346-1.794 1.174-2.001 2.277 0 1.793-2.83 2.967-4.142-1.311-1.449-4.623-1.38-4.278-4.279 1.588-.828 3.521-.552 5.313-.828 4.072-.829 8.627-1.312 12.771-.829.825.166 1.93 1.794 2.62 2.829zM65.482 74.132c6.369 5.206 14.632 14.08 13.597 24.294-1.243 8.076-9.801 14.149-17.048 16.082-7.04 2.07-15.874 1.863-23.053.207-.483 1.312-.966 2.898-2.484 3.451-.966.345-2.209.138-2.968-.483-2.139-2.002-.414-5.867-3.52-7.108-6.074-2.554-12.631-7.593-15.736-13.804-.414-1.242.069-2.484.828-3.45 4.763-3.796 10.767-5.314 16.772-6.488.345.138.207-.345.483-.483.345-4.141.483-8.352 1.794-12.079.299-.523 1.035-.69 1.519-.345 3.796 2.898 2.001 8.352 3.658 12.285 7.247.345 14.494.69 20.222 4.763 1.933 1.587 2.404 4.618 1.794 6.35-.609 1.729-2.622 2.968-4.486 3.104-1.243 0-3.589.121-3.451-.827.138-.949 4.222-2.502 2.968-3.797-1.803-1.861-10.824-2.968-16.415-3.658-.69-.138-1.323.069-1.323.828-.138 5.245-.552 11.042.345 16.082.069.346.483.76.829.827 9.869 1.588 20.291.69 28.021-4.969 3.589-2.897 4.763-6.972 4.141-11.457-3.106-12.492-16.15-20.016-26.848-24.847-10.421-4.555-21.948-6.902-34.302-6.28-1.967.144-5.084.823-5.107 1.519-.023.696 3.531.477 3.105 1.794-.425 1.316-4.037.535-5.107.207-1.07-.328-.966-1.864-.69-2.83 2.692-4.762 10.204-5.147 13.597-5.314 18.772-.484 36.925 6.665 48.865 16.426zM31.663 92.629c-4.763.069-9.801.552-14.218 2.208-.897.345-2.002 1.311-1.312 2.485 1.794 2.415 4.36 4.398 6.764 5.797 2.404 1.397 5.591 3.175 8.49 3.59.69-4.487.69-8.904.621-13.528-.277-.138-.001-.414-.345-.552zM174.323 86.348c-.207 6.004-5.799 9.732-5.799 15.736.207.207.347.483.621.347 4.488-4.901 8.904-11.872 15.461-13.942 1.728-.138 3.289 1.363 3.935 2.485 2.278 4.555 1.728 10.974-1.448 15.115-3.277 4.065-8.974 8.144-15.459 7.453-2.691 6.626-4.558 13.597-5.593 20.844-.552 1.449-1.862.138-2.69-.138-5.59-4.417-1-16.11-.621-17.602.379-1.488 1.875-4.998 2.969-7.937-2.623-4.692-.967-10.353 1.172-14.701 1.656-2.899 3.936-5.798 6.627-8.006.342.001.618.07.825.346zm11.114 7.454c-.828-.138-1.174.967-1.863 1.174-3.174 3.589-6.35 7.178-7.938 11.457 2.141.276 3.934-1.104 5.799-1.863 3.174-2.002 5.176-5.313 4.969-9.11-.139-.623-.691-1.106-.967-1.658z" fill="currentColor"/>
    </svg>
  ),
  apple: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" className="w-8 h-8">
      <path d="M46.55 58.84a9.81 9.81 0 0 1 4.69-8.25 10.14 10.14 0 0 0-7.93-4.3c-3.37-.34-6.59 2-8.3 2s-4.35-1.94-7.15-1.88a10.58 10.58 0 0 0-9 5.43c-3.82 6.63-1 16.46 2.75 21.84 1.82 2.62 4 5.59 6.84 5.48s3.78-1.77 7.1-1.77 4.25 1.77 7.16 1.71 4.82-2.68 6.63-5.32a23.62 23.62 0 0 0 3-6.17 9.53 9.53 0 0 1-5.79-8.77zm-5.45-16.1a9.54 9.54 0 0 0 2.25-6.93A9.72 9.72 0 0 0 37 39.1a9 9 0 0 0-2.3 6.7 8 8 0 0 0 6.4-3.06z" fill="currentColor"/>
      <path d="M72 52.85v-5h-6.09v-7H60.5v7h-4.72v5h4.72V71a8.13 8.13 0 0 0 8.12 8.12h2.71v-5.38h-2.71A2.72 2.72 0 0 1 65.91 71V52.85zm25.3-6.4-8.12 24.38-8.13-24.38h-5.42L86.47 79h5.42l10.83-32.51z" fill="currentColor"/>
    </svg>
  )
};

const fadeInAnimation = {
  '@keyframes fadeIn': {
    '0%': {
      opacity: '0',
      transform: 'translateY(10px)'
    },
    '100%': {
      opacity: '1',
      transform: 'translateY(0)'
    }
  }
};

const styles = {
  ...fadeInAnimation,
  '.animate-fadeIn': {
    animation: 'fadeIn 0.5s ease-out forwards'
  },
  '.ultra-smooth-scroll': {
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    scrollSnapType: 'x proximity',
    scrollPadding: '1rem',
    willChange: 'scroll-position, transform',
    transform: 'translate3d(0, 0, 0)',
    contain: 'layout style paint'
  }
};

const gridVariants = {
  hidden: { 
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.02,
      delayChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0,
    y: 10,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 25,
      mass: 0.6
    }
  }
};

const loadingVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.2
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

const MovieCard = memo(({ movie, index, onClick, onPrefetch, onImageLoad, onImageError, isImageLoaded }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const isBookmarked = watchlist.some(item => item.id === movie.id);
  const [imageLoaded, setImageLoaded] = useState(isImageLoaded || false);
  const [imageError, setImageError] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchComplete, setPrefetchComplete] = useState(false);
  const imgRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);
  
  // Touch event handling for mobile
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const isTouchDevice = useRef(false);

  // Detect touch device
  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    
    if (isBookmarked) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist({ ...movie, type: 'movie' });
    }
  };

  // Enhanced click handler for mobile
  const handleCardClick = useCallback((e) => {
    // Prevent double clicks
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    // Set a timeout to prevent rapid successive clicks
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
    }, 300);

    // Call the original onClick handler
    onClick(movie);
  }, [onClick, movie]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;

    touchEndRef.current = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };

    const start = touchStartRef.current;
    const end = touchEndRef.current;
    
    // Calculate touch distance and duration
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const duration = end.time - start.time;

    // Only trigger click if it's a proper tap (not a swipe or long press)
    if (distance < 10 && duration < 300) {
      handleCardClick(e);
    }

    // Reset touch references
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [handleCardClick]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    // Notify parent component about image load
    if (onImageLoad) {
      onImageLoad(movie.id);
    }
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
    // Notify parent component about image error
    if (onImageError) {
      onImageError(movie.id);
    }
  };

  const getImageUrl = () => {
    if (imageError) return null;
    const posterPath = movie.poster_path || movie.poster;
    if (!posterPath) return null;
    if (posterPath.startsWith('http')) return posterPath;
    return getPosterProps(movie, 'w500').src;
  };

  // Enhanced prefetching function
  const handlePrefetch = useCallback(async () => {
    if (prefetchComplete || isPrefetching) return;
    
    setIsPrefetching(true);
    
    try {
      // Prefetch movie details, similar movies, and higher resolution images
      const prefetchPromises = [];
      
      // Prefetch movie details if not already available
      if (!movie.runtime && !movie.budget && !movie.revenue) {
        prefetchPromises.push(
          getMovieDetails(movie.id, 'movie').catch(err => {
            console.warn(`Failed to prefetch details for movie ${movie.id}:`, err);
            return null;
          })
        );
      }
      
      // Prefetch similar movies
      prefetchPromises.push(
        getSimilarMovies(movie.id, 'movie', 1).catch(err => {
          console.warn(`Failed to prefetch similar movies for ${movie.id}:`, err);
          return null;
        })
      );
      
      // Prefetch higher resolution poster image
      const posterPath = movie.poster_path || movie.poster;
      if (posterPath && !posterPath.startsWith('http')) {
        const highResUrl = getTmdbImageUrl(posterPath, 'w780');
        prefetchPromises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(highResUrl);
            img.onerror = () => resolve(null);
            img.src = highResUrl;
          })
        );
      }
      
      // Prefetch backdrop image
      const backdropPath = movie.backdrop_path;
      if (backdropPath) {
        const backdropUrl = getTmdbImageUrl(backdropPath, 'w1280');
        prefetchPromises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(backdropUrl);
            img.onerror = () => resolve(null);
            img.src = backdropUrl;
          })
        );
      }
      
      // Execute all prefetch operations
      await Promise.allSettled(prefetchPromises);
      setPrefetchComplete(true);
      
      // Notify parent component about successful prefetch
      if (onPrefetch) {
        onPrefetch(movie.id);
      }
      
    } catch (error) {
      console.warn(`Prefetch failed for movie ${movie.id}:`, error);
    } finally {
      setIsPrefetching(false);
    }
  }, [movie.id, movie.runtime, movie.budget, movie.revenue, movie.poster_path, movie.poster, movie.backdrop_path, prefetchComplete, isPrefetching, onPrefetch]);

  // Handle mouse enter with debouncing - MEMORY LEAK FIX
  const handleMouseEnter = useCallback(() => {
    // FIXED: Add throttling to prevent rapid hover events
    const now = Date.now();
    const lastHoverTime = handleMouseEnter.lastCallTime || 0;
    const HOVER_THROTTLE = 1000; // FIXED: Increased from 500ms to 1000ms throttle
    
    if (now - lastHoverTime < HOVER_THROTTLE) {
      return; // Skip if hovered too recently
    }
    handleMouseEnter.lastCallTime = now;
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // FIXED: Start prefetching after a short delay to avoid unnecessary requests
    hoverTimeoutRef.current = setTimeout(() => {
      handlePrefetch();
    }, 1000); // FIXED: Increased from 500ms to 1000ms delay
  }, [handlePrefetch, movie.id]);

  // Handle mouse leave - MEMORY LEAK FIX
  const handleMouseLeave = useCallback(() => {
    // Clear the hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Clear any prefetch timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
    
    // FIXED: Reset hover time to allow immediate re-hover
    handleMouseEnter.lastCallTime = 0;
  }, []);

  // Sync local image state with global state
  useEffect(() => {
    if (isImageLoaded && !imageLoaded) {
      setImageLoaded(true);
    }
  }, [isImageLoaded, imageLoaded]);

  // Cleanup on unmount - MEMORY LEAK FIX
  useEffect(() => {
    return () => {
      // FIXED: Clear all timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      
      // FIXED: Clear any pending prefetch operations
      if (imgRef.current) {
        imgRef.current = null;
      }
      
      // FIXED: Clear any pending image loads
      if (imgRef.current && imgRef.current.src) {
        imgRef.current.src = '';
      }
      
      // FIXED: Reset hover time
      handleMouseEnter.lastCallTime = 0;
      
      // FIXED: Clear any pending state updates
      setIsPrefetching(false);
      
      // Clear touch references
      touchStartRef.current = null;
      touchEndRef.current = null;
      
      // FIXED: Clear any pending image state updates
      setImageLoaded(false);
      setImageError(false);
      setPrefetchComplete(false);
    };
  }, []);

  return (
    <motion.div
      key={`${movie.id}-${index}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      layoutId={`movie-${movie.id}`}
      className="group cursor-pointer transform relative touch-manipulation select-none"
      data-movie-id={movie.id}
      whileHover={{ 
        scale: 1.02, // FIXED: Reduced scale to reduce memory usage
        transition: {
          type: "tween", // FIXED: Changed from spring to tween for better performance
          duration: 0.2
        }
      }}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      transition={{
        type: "tween", // FIXED: Changed from spring to tween for better performance
        duration: 0.2
      }}
    >
      {/* Prefetch indicator (subtle) - Removed to avoid visual distraction */}
      {/* {isPrefetching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-1 left-1 z-20 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
          title="Prefetching..."
        />
      )} */}
      
      <motion.div 
        layout
        className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative w-full"
      >
        {/* Rating Badge - top left */}
        <RatingBadge 
          rating={movie.vote_average || movie.rating} 
          position="top-left"
          size="default"
        />
        
        <AnimatePresence>
          <motion.button
            onClick={handleBookmarkClick}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full transition-colors transition-opacity duration-300 hover:bg-black/70 opacity-0 group-hover:opacity-100"
            aria-label={isBookmarked ? "Remove from watchlist" : "Add to watchlist"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isBookmarked ? (
              <motion.svg
                key="bookmarked"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21L12 17.5 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
              </motion.svg>
            ) : (
              <motion.svg
                key="not-bookmarked"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </motion.svg>
            )}
          </motion.button>
        </AnimatePresence>
        {!imageLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-gray-800 flex items-center justify-center"
          >
            <div className="w-8 h-8 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
          </motion.div>
        )}
        
        <motion.img
          ref={imgRef}
          src={getImageUrl() || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="500" height="750" fill="#1a1a1a"/>
              <path d="M250 300C277.614 300 300 277.614 300 250C300 222.386 277.614 200 250 200C222.386 200 200 222.386 200 250C200 277.614 222.386 300 250 300Z" fill="#333333"/>
              <path d="M350 450C350 483.137 323.137 510 290 510H210C176.863 510 150 483.137 150 450V350C150 316.863 176.863 290 210 290H290C323.137 290 350 316.863 350 350V450Z" fill="#333333"/>
              <path d="M250 400C250 400 230 370 210 370C190 370 170 400 170 400" stroke="#666666" stroke-width="4" stroke-linecap="round"/>
              <path d="M330 400C330 400 310 370 290 370C270 370 250 400 250 400" stroke="#666666" stroke-width="4" stroke-linecap="round"/>
              <text x="250" y="550" font-family="Arial" font-size="24" fill="#666666" text-anchor="middle">No Image Available</text>
              <text x="250" y="580" font-family="Arial" font-size="16" fill="#666666" text-anchor="middle">${movie.title}</text>
            </svg>
          `)}`}
          alt={movie.title}
          className={`w-full h-full object-cover ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 16vw, 12vw"
          fetchpriority={index < 12 ? 'high' : 'auto'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          layout
          transition={{ duration: 0.1 }}
        />
        
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3"
          layout
        >
          <motion.div className="text-white" layout>
            <h4 className="font-medium text-sm truncate">{movie.title}</h4>
            <p className="text-xs text-gray-300 flex items-center gap-1">
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
      </motion.div>
    </motion.div>
  );
});

const MoviesPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [sortBy, setSortBy] = useState('popularity');
  const [movies, setMovies] = useState([]);
  const [tempMovies, setTempMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { setLoadingState } = useLoading();
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadedSections, setLoadedSections] = useState({
    header: false,
    filters: false,
    movies: false
  });
  const observerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [scrollRootEl, setScrollRootEl] = useState(null);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    root: null,
    rootMargin: '0px 0px 200px 0px',
    triggerOnce: false,
    delay: 100
  });
  
    const prevInViewRef = useRef(false);
  const currentScrollTopRef = useRef(0);
  const lastTriggerScrollTopRef = useRef(0);
  const MIN_SCROLL_DELTA_PX = 60;
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [activeCategory, setActiveCategory] = useState('popular');
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [yearDropdownRef, setYearDropdownRef] = useState(null);
  const [genreDropdownRef, setGenreDropdownRef] = useState(null);
  const [searchHistoryItems, setSearchHistoryItems] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  
  // 🚀 DEBUG: Log intersection observer state changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('👁️ Intersection observer state changed:', { inView, hasMore, loading, isLoadingMore, activeCategory });
    }
  }, [inView, hasMore, loading, isLoadingMore, activeCategory]);
  
  // Enhanced prefetch state management with memory optimization
  const [prefetchedMovies, setPrefetchedMovies] = useState(new Set());
  const [prefetchCache, setPrefetchCache] = useState(new Map());
  const [prefetchStats, setPrefetchStats] = useState({
    totalPrefetched: 0,
    successfulPrefetches: 0,
    failedPrefetches: 0,
    cacheHits: 0
  });
  const prefetchQueueRef = useRef([]);
  const isProcessingPrefetchRef = useRef(false);
  const prefetchTimeoutRef = useRef(null);

  // Predictive prefetching based on viewport visibility
  const [visibleMovies, setVisibleMovies] = useState(new Set());
  const visibilityObserverRef = useRef(null);
  
  // Memory optimization: Limit cache size to prevent memory leaks
  const MAX_CACHE_SIZE = 100;
  const MAX_VISIBLE_MOVIES = 50;

  // FIXED: Add cleanup for visibility observer
  useEffect(() => {
    return () => {
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
        visibilityObserverRef.current = null;
      }
      // Clear visible movies set to prevent memory leaks
      setVisibleMovies(new Set());
    };
  }, []);

  // Add back missing state variables
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);
  const previousMovies = useRef([]);
  const moviesRef = useRef([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);
  const [nextPageMovies, setNextPageMovies] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  // Define fetchMovies function before useEffect hooks
  const fetchMovies = useCallback(async (category, pageNum = 1) => {
    if (fetchInProgress.current) {
      return;
    }
    fetchInProgress.current = true;
    
    // 🚀 ENHANCED: Use enhanced loading service instead of timeout
    if (pageNum === 1) {
      setLoading(true);
      setError(null);
    } else {
      setIsLoadingNextPage(true);
    }
    
    try {

      let response;
      let results = [];
      let totalPages = 1;

      // Check if we have filters applied (year or genre)
      if (selectedYear || selectedGenre) {
        
        // Use discoverMovies for filtered results with category-specific sorting
        const discoverParams = {
          page: pageNum,
          vote_count_gte: 10,
          include_adult: false
        };

        // Apply category-specific sorting and constraints
        switch (category) {
          case 'popular':
            discoverParams.sort_by = 'popularity.desc';
            break;
          case 'top_rated':
            discoverParams.sort_by = 'vote_average.desc';
            discoverParams.vote_count_gte = 50; // Higher threshold for top rated
            break;
          case 'upcoming':
            discoverParams.sort_by = 'release_date.asc';
            // Don't override year filter if user selected one
            if (!selectedYear) {
              const today = new Date();
              discoverParams.primary_release_date_gte = today.toISOString().split('T')[0];
            }
            break;
          case 'now_playing':
            discoverParams.sort_by = 'popularity.desc';
            // Don't override year filter if user selected one
            if (!selectedYear) {
              const today = new Date();
              const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
              discoverParams.primary_release_date_gte = thirtyDaysAgo.toISOString().split('T')[0];
              discoverParams.primary_release_date_lte = today.toISOString().split('T')[0];
            }
            break;
          default:
            discoverParams.sort_by = 'popularity.desc';
        }

        if (selectedYear) {
          discoverParams.primary_release_year = selectedYear;
        }

        if (selectedGenre && selectedGenre.id) {
          discoverParams.with_genres = selectedGenre.id;
        }

        response = await discoverMovies(discoverParams);
        results = response.movies || [];
        totalPages = response.totalPages || 1;
        
      } else {
        // Use category-based service functions for unfiltered results
        switch (category) {
          case 'popular':
            response = await getPopularMovies(pageNum);
            break;
          case 'top_rated':
            response = await getTopRatedMovies(pageNum);
            break;
          case 'upcoming':
            if (import.meta.env.DEV) {
              console.log(`🎬 Fetching upcoming movies for page:`, pageNum);
            }
            response = await getUpcomingMovies(pageNum);
            if (import.meta.env.DEV) {
              console.log(`🎬 Upcoming movies response:`, {
                page: pageNum,
                moviesCount: response.movies?.length || response.results?.length || 0,
                totalPages: response.totalPages || response.total_pages || 1,
                hasMore: response.hasMore,
                totalResults: response.totalResults,
                response
              });
            }
            break;
          case 'now_playing':
            response = await getNowPlayingMovies(pageNum);
            break;
          case 'netflix':
            response = await getMoviesByNetwork(8, pageNum);
            break;
                      case 'prime':
              // Try multiple Prime Video network IDs to find content
              const primeNetworkIds = [9, 119, 10, 8]; // Amazon, Amazon Prime Video, Amazon Studios, Netflix
              let primeResponse = null;
              
              for (const networkId of primeNetworkIds) {
                if (import.meta.env.DEV) {
                  console.log(`🎬 Trying Prime Video network ID ${networkId}...`);
                }
                
                try {
                  const tempResponse = await getMoviesByNetwork(networkId, pageNum);
                  if (tempResponse.results && tempResponse.results.length > 0) {
                    if (import.meta.env.DEV) {
                      console.log(`✅ Found ${tempResponse.results.length} movies with Prime Video network ID ${networkId}`);
                    }
                    primeResponse = tempResponse;
                    break;
                  }
                } catch (error) {
                  if (import.meta.env.DEV) {
                    console.warn(`⚠️ Failed to fetch with Prime Video network ID ${networkId}:`, error.message);
                  }
                }
              }
              
              if (primeResponse) {
                response = primeResponse;
              } else {
                if (import.meta.env.DEV) {
                  console.warn(`⚠️ No Prime Video movies found with any network ID, using fallback`);
                }
                // Fallback to popular movies if no Prime Video content found
                response = await getPopularMovies(pageNum);
              }
              break;
                      case 'hbo':
              // Try multiple HBO network IDs to find content
              const hboNetworkIds = [118, 384, 49, 50, 119, 8, 213, 2]; // HBO, HBO Max, HBO Films, Amazon, Netflix, Netflix Originals, Disney
              let hboResponse = null;
              
              for (const networkId of hboNetworkIds) {
                if (import.meta.env.DEV) {
                  console.log(`🎬 Trying HBO network ID ${networkId}...`);
                }
                
                try {
                  const tempResponse = await getMoviesByNetwork(networkId, pageNum);
                  if (tempResponse.results && tempResponse.results.length > 0) {
                    if (import.meta.env.DEV) {
                      console.log(`✅ Found ${tempResponse.results.length} movies with HBO network ID ${networkId}`);
                    }
                    hboResponse = tempResponse;
                    break;
                  }
                } catch (error) {
                  if (import.meta.env.DEV) {
                    console.warn(`⚠️ Failed to fetch with HBO network ID ${networkId}:`, error.message);
                  }
                }
              }
              
              if (hboResponse) {
                response = hboResponse;
              } else {
                if (import.meta.env.DEV) {
                  console.warn(`⚠️ No HBO movies found with any network ID, using fallback`);
                }
                // Fallback to popular movies if no HBO content found
                response = await getPopularMovies(pageNum);
              }
              break;
          case 'hulu':
            // Try SeriesPage's Hulu ID first (453), then fallback to others if no results
            response = await getMoviesByNetwork(453, pageNum);
            if (!response.results || response.results.length === 0) {
              if (import.meta.env.DEV) {
                console.log(`🎬 No movies found with Hulu ID 453, trying Hulu ID 15...`);
              }
              const huluResponse = await getMoviesByNetwork(15, pageNum);
              if (huluResponse.results && huluResponse.results.length > 0) {
                if (import.meta.env.DEV) {
                  console.log(`✅ Found ${huluResponse.results.length} movies with Hulu ID 15`);
                }
                response = huluResponse;
              } else {
                // Try Hulu Originals as last resort
                if (import.meta.env.DEV) {
                  console.log(`🎬 No movies found with Hulu ID 15, trying Hulu Originals ID 122...`);
                }
                const huluOriginalsResponse = await getMoviesByNetwork(122, pageNum);
                if (huluOriginalsResponse.results && huluOriginalsResponse.results.length > 0) {
                  if (import.meta.env.DEV) {
                    console.log(`✅ Found ${huluOriginalsResponse.results.length} movies with Hulu Originals ID 122`);
                  }
                  response = huluOriginalsResponse;
                }
              }
            }
            break;
          case 'disney':
            response = await getMoviesByNetwork(2, pageNum);
            break;
          case 'apple':
            response = await getMoviesByNetwork(284, pageNum);
            break;
          default:
            response = await getPopularMovies(pageNum);
        }
        results = response.movies || response.results || [];
        totalPages = response.totalPages || response.total_pages || 1;
      }

      if (pageNum === 1) {
        setMovies(results);
      } else {
        setMovies(prevMovies => {
          // Proper deduplication to prevent duplicate content
          const existingIds = new Set(prevMovies.map(movie => movie.id));
          const uniqueNewMovies = results.filter(movie => !existingIds.has(movie.id));
          
          if (uniqueNewMovies.length === 0) {
            return prevMovies;
          }
          
          const updatedMovies = [...prevMovies, ...uniqueNewMovies];
          return updatedMovies;
        });
      }
      // 🚀 FIXED: Enhanced hasMore logic with debugging
      const hasMorePages = pageNum < totalPages;
      setHasMore(hasMorePages);
      setCurrentPage(pageNum);
      setTotalPages(totalPages);
      setLoadedSections(prev => ({ ...prev, [category]: true }));
      
      if (import.meta.env.DEV) {
        console.log(`🎬 Fetch movies for ${category}:`, {
          page: pageNum,
          totalPages,
          hasMore: hasMorePages,
          moviesCount: results.length,
          category
        });
      }
    } catch (err) {
      setError('Failed to load movies: ' + (err.message || 'Unknown error'));
    } finally {
      if (pageNum === 1) {
        setLoading(false);
      } else {
        setIsLoadingNextPage(false);
      }
      fetchInProgress.current = false;
    }
  }, [selectedYear, selectedGenre, activeCategory]);
  
  // Memory optimization: Clear fetchMovies callback on unmount
  useEffect(() => {
    return () => {
      // Reset fetch states on cleanup
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
      setLoading(false);
      setIsLoadingNextPage(false);
      
      // Clear any pending fetch operations
      if (isMounted.current) {
        isMounted.current = false;
      }
    };
  }, []);

  // 🚀 FIXED: Initial fetch on component mount
  useEffect(() => {
    // Only fetch if we don't have movies and we're not already loading
    if (movies.length === 0 && !loading && !fetchInProgress.current) {
      if (import.meta.env.DEV) {
        console.log(`🎬 Initial fetch for category: ${activeCategory}`);
      }
      fetchMovies(activeCategory, 1);
    }
    
    // 🚀 ENHANCED: Use enhanced loading service instead of timeout
    const initializeLoading = async () => {
      try {
        const result = await enhancedLoadingService.retryWithBackoff(
          async () => {
            // This will be called by fetchMovies below
            return true;
          },
          'initial movies load'
        );
        
        if (!result.success) {
          console.warn('🎬 Initial loading failed after retries:', result.error);
          setError(enhancedLoadingService.getErrorMessage(result.error, 'movies'));
        }
      } catch (error) {
        console.error('🎬 Initial loading error:', error);
        setError(enhancedLoadingService.getErrorMessage(error, 'movies'));
      }
    };
    
    initializeLoading();
  }, []); // Empty dependency array - only run once on mount

  // Enhanced retry handler for loading failures
  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    
    try {
      await fetchMovies(activeCategory, 1);
    } catch (error) {
      console.error('Retry failed:', error);
      setError(enhancedLoadingService.getErrorMessage(error, 'movies'));
    }
  }, [activeCategory]);

  // Enhanced category change handler with better error handling and performance
  const handleCategoryChange = useCallback(async (category) => {
    // Prevent multiple rapid clicks
    if (activeCategory === category || isTransitioning) return;
    
    // Set transition state for smooth animations
    setIsTransitioning(true);
    
    // Reset all states when changing category
    setActiveCategory(category);
    setMovies([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    setLoading(true);
    setIsLoadingNextPage(false);
    setNextPageMovies([]);
    
    // Clear any existing fetch operations
    if (fetchInProgress.current) {
      fetchInProgress.current = false;
    }
    
    try {
      // Use a more robust fetch approach with better error handling
      const response = await fetchMoviesWithFallback(category, 1);
      
      if (response.success) {
        setMovies(response.movies || []);
        setHasMore(response.hasMore || false);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(1);
        
        // Update URL for better navigation
        updateURLWithCategory(category);
      } else {
        setError(response.error || 'Failed to load movies');
        setMovies([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Category change error:', error);
      setError('Failed to load movies: ' + (error.message || 'Unknown error'));
      setMovies([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      // Clear transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }
  }, [activeCategory, isTransitioning]);

  // Enhanced fetch function with fallback mechanisms
  const fetchMoviesWithFallback = async (category, pageNum = 1) => {
    try {
      let response;
      let results = [];
      let totalPages = 1;
      let hasMore = false;

      // Check if we have filters applied (year or genre)
      if (selectedYear || selectedGenre) {
        response = await fetchFilteredMovies(category, pageNum);
      } else {
        response = await fetchCategoryMovies(category, pageNum);
      }

      // Normalize response format
      if (response) {
        results = response.movies || response.results || [];
        totalPages = response.totalPages || response.total_pages || 1;
        hasMore = pageNum < totalPages;
      }

      return {
        success: true,
        movies: results,
        totalPages,
        hasMore,
        currentPage: pageNum
      };
    } catch (error) {
      console.error(`Failed to fetch movies for category ${category}:`, error);
      
      // Try fallback to popular movies if streaming service fails
      if (isStreamingService(category)) {
        try {
          console.log(`Trying fallback to popular movies for ${category}`);
          const fallbackResponse = await getPopularMovies(pageNum);
          return {
            success: true,
            movies: fallbackResponse.movies || fallbackResponse.results || [],
            totalPages: fallbackResponse.totalPages || fallbackResponse.total_pages || 1,
            hasMore: pageNum < (fallbackResponse.totalPages || fallbackResponse.total_pages || 1),
            currentPage: pageNum,
            fallback: true
          };
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      
      return {
        success: false,
        error: error.message || 'Failed to fetch movies',
        movies: [],
        totalPages: 1,
        hasMore: false
      };
    }
  };

  // Helper function to check if category is a streaming service
  const isStreamingService = (category) => {
    return ['netflix', 'prime', 'hbo', 'hulu', 'disney', 'apple'].includes(category);
  };

  // Enhanced fetch for filtered movies
  const fetchFilteredMovies = async (category, pageNum) => {
    const discoverParams = {
      page: pageNum,
      vote_count_gte: 10,
      include_adult: false
    };

    // Apply category-specific sorting and constraints
    switch (category) {
      case 'popular':
        discoverParams.sort_by = 'popularity.desc';
        break;
      case 'top_rated':
        discoverParams.sort_by = 'vote_average.desc';
        discoverParams.vote_count_gte = 50;
        break;
      case 'upcoming':
        discoverParams.sort_by = 'release_date.asc';
        if (!selectedYear) {
          const today = new Date();
          discoverParams.primary_release_date_gte = today.toISOString().split('T')[0];
        }
        break;
      case 'now_playing':
        discoverParams.sort_by = 'popularity.desc';
        if (!selectedYear) {
          const today = new Date();
          const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
          discoverParams.primary_release_date_gte = thirtyDaysAgo.toISOString().split('T')[0];
          discoverParams.primary_release_date_lte = today.toISOString().split('T')[0];
        }
        break;
      default:
        discoverParams.sort_by = 'popularity.desc';
    }

    if (selectedYear) {
      discoverParams.primary_release_year = selectedYear;
    }

    if (selectedGenre && selectedGenre.id) {
      discoverParams.with_genres = selectedGenre.id;
    }

    return await discoverMovies(discoverParams);
  };

  // Enhanced fetch for category movies
  const fetchCategoryMovies = async (category, pageNum) => {
    switch (category) {
      case 'popular':
        return await getPopularMovies(pageNum);
      case 'top_rated':
        return await getTopRatedMovies(pageNum);
      case 'upcoming':
        return await getUpcomingMovies(pageNum);
      case 'now_playing':
        return await getNowPlayingMovies(pageNum);
      case 'netflix':
        return await getMoviesByNetwork(8, pageNum);
      case 'prime':
        return await fetchPrimeMovies(pageNum);
      case 'hbo':
        return await fetchHBOMovies(pageNum);
      case 'hulu':
        return await fetchHuluMovies(pageNum);
      case 'disney':
        return await getMoviesByNetwork(2, pageNum);
      case 'apple':
        return await getMoviesByNetwork(284, pageNum);
      default:
        return await getPopularMovies(pageNum);
    }
  };

  // Enhanced Prime Video fetching with multiple network IDs
  const fetchPrimeMovies = async (pageNum) => {
    const primeNetworkIds = [9, 119, 10, 8];
    
    for (const networkId of primeNetworkIds) {
      try {
        const response = await getMoviesByNetwork(networkId, pageNum);
        if (response.results && response.results.length > 0) {
          return response;
        }
      } catch (error) {
        console.warn(`Failed to fetch Prime Video with network ID ${networkId}:`, error.message);
      }
    }
    
    // Fallback to popular movies
    return await getPopularMovies(pageNum);
  };

  // Enhanced HBO fetching with multiple network IDs
  const fetchHBOMovies = async (pageNum) => {
    const hboNetworkIds = [118, 384, 49, 50, 119, 8, 213, 2];
    
    for (const networkId of hboNetworkIds) {
      try {
        const response = await getMoviesByNetwork(networkId, pageNum);
        if (response.results && response.results.length > 0) {
          return response;
        }
      } catch (error) {
        console.warn(`Failed to fetch HBO with network ID ${networkId}:`, error.message);
      }
    }
    
    // Fallback to popular movies
    return await getPopularMovies(pageNum);
  };

  // Enhanced Hulu fetching with multiple network IDs
  const fetchHuluMovies = async (pageNum) => {
    const huluNetworkIds = [453, 15, 122];
    
    for (const networkId of huluNetworkIds) {
      try {
        const response = await getMoviesByNetwork(networkId, pageNum);
        if (response.results && response.results.length > 0) {
          return response;
        }
      } catch (error) {
        console.warn(`Failed to fetch Hulu with network ID ${networkId}:`, error.message);
      }
    }
    
    // Fallback to popular movies
    return await getPopularMovies(pageNum);
  };

  // Update URL with category for better navigation
  const updateURLWithCategory = (category) => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('category', category);
      
      // Preserve existing filters
      if (selectedGenre) {
        searchParams.set('genre', selectedGenre.name.toLowerCase());
      }
      if (selectedYear) {
        searchParams.set('year', selectedYear.toString());
      }
      
      const newURL = `${window.location.pathname}?${searchParams.toString()}`;
      window.history.replaceState({}, '', newURL);
    } catch (error) {
      console.warn('Failed to update URL:', error);
    }
  };

  // Memory optimization: Clear handleCategoryChange callback on unmount
  useEffect(() => {
    return () => {
      // Reset transition state on cleanup
      setIsTransitioning(false);
      
      // Clear any pending category changes
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  const handleGenreSelect = useCallback(async (genre) => {
    setSelectedGenre(genre);
    setGenreDropdownOpen(false);
    
    // Update URL with the new genre
    const searchParams = new URLSearchParams(window.location.search);
    if (genre) {
      searchParams.set('genre', genre.name.toLowerCase());
    } else {
      searchParams.delete('genre');
    }
    navigate(`?${searchParams.toString()}`, { replace: true });
  }, [navigate]);
  
  // Memory optimization: Clear handleGenreSelect callback on unmount
  useEffect(() => {
    return () => {
      // Reset genre state on cleanup
      setSelectedGenre(null);
      setGenreDropdownOpen(false);
      
      // Clear any pending genre operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  // Add URL parameter handling
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const category = searchParams.get('category');
    const genreParam = searchParams.get('genre');
    const yearParam = searchParams.get('year');
    
    if (category && category !== activeCategory) {
      handleCategoryChange(category);
    }

    // Only restore filters if they exist in URL and we don't have them set locally
    if (genreParam && genres.length > 0 && !selectedGenre) {
      // Map genre names to their IDs
      const genreIdMap = {
        'action': 28,
        'adventure': 12,
        'animation': 16,
        'comedy': 35,
        'crime': 80,
        'documentary': 99,
        'drama': 18,
        'family': 10751,
        'fantasy': 14,
        'history': 36,
        'horror': 27,
        'music': 10402,
        'mystery': 9648,
        'romance': 10749,
        'sci-fi': 878,
        'tv movie': 10770,
        'thriller': 53,
        'war': 10752,
        'western': 37
      };

      const genreId = genreIdMap[genreParam.toLowerCase()];
      if (genreId) {
        const genreObj = genres.find(g => g.id === genreId);
        if (genreObj) {
          setSelectedGenre(genreObj);
        }
      }
    }

    if (yearParam && !selectedYear) {
      const year = parseInt(yearParam);
      if (year && year >= 1900 && year <= new Date().getFullYear()) {
        setSelectedYear(year);
      }
    }
    
    return () => {
      // Cleanup function for URL parameter handling
      // Clear any pending URL operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, [window.location.search, genres, activeCategory, selectedGenre, selectedYear]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      
      // Comprehensive cleanup on component unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
        visibilityObserverRef.current = null;
      }
      
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      // Clear all refs
      moviesRef.current = [];
      previousMovies.current = [];
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
      fetchInProgress.current = false;
      
      // Clear prefetch timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
      
      // Clear large state objects
      setMovies([]);
      setSearchResults([]);
      setPrefetchedMovies(new Set());
      setPrefetchCache(new Map());
      setVisibleMovies(new Set());
      
      // Clear any remaining timeouts
      // Note: hoverTimeoutRef is handled by MovieCard components, prefetchTimeoutRef is handled here
      
      // Clear all state to prevent memory leaks
      setSearchQuery('');
      setSelectedGenre(null);
      setSelectedYear(null);
      setSortBy('popularity');
      setTempMovies([]);
      setSelectedMovie(null);
      setPage(1);
      setTotalPages(1);
      setIsLoadingMore(false);
      setShowGenreDropdown(false);
      setShowSortDropdown(false);
      setShowYearDropdown(false);
      // Don't clear loaded images immediately - let them persist for better UX
      // setLoadedImages({});
      // Clear loaded images after a delay to prevent memory accumulation
      setTimeout(() => {
        setLoadedImages({});
      }, 30000); // Clear after 30 seconds
      setLoading(true);
      setLoadedSections({
        header: false,
        filters: false,
        movies: false
      });
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      setSearchPage(1);
      setHasMoreSearchResults(false);
      setActiveCategory('popular');
      setHasMore(true);
      setError(null);
      setYearDropdownOpen(false);
      setGenreDropdownOpen(false);
      setSearchHistoryItems([]);
      setTrendingSearches([]);
      setPrefetchStats({
        totalPrefetched: 0,
        successfulPrefetches: 0,
        failedPrefetches: 0,
        cacheHits: 0
      });
      setIsTransitioning(false);
      setIsUpdating(false);
      setCurrentPage(1);
      setIsLoadingNextPage(false);
      setNextPageMovies([]);
      
    };
  }, []);

  // Add animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  // Define categories with exact TMDB API category IDs - Memoized for performance
  const categories = useMemo(() => [
    { id: 'popular', name: 'Popular' },
    { id: 'top_rated', name: 'Top Rated' },
    { id: 'upcoming', name: 'Upcoming' },
    { id: 'now_playing', name: 'Now Playing' },
    { id: 'netflix', name: 'Netflix', networkId: 8 },
    { id: 'prime', name: 'Prime Video', networkId: 9 },
    { id: 'hbo', name: 'HBO', networkId: 118 },
    { id: 'hulu', name: 'Hulu', networkId: 453 },
    { id: 'disney', name: 'Disney+', networkId: 2 },
    { id: 'apple', name: 'Apple TV+', networkId: 284 }
  ], []);

  const getImageUrl = (path) => {
    if (!path) return null;
    return getPosterProps({ poster_path: path }, 'w500').src;
  };

  const handleImageLoad = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: true
    }));
  };

  const handleImageError = (movieId) => {
    setLoadedImages(prev => ({
      ...prev,
      [movieId]: 'error'
    }));
  };







  const handleMovieClick = useCallback((movie) => {
    // If we have prefetched data, use it immediately
    const cachedData = prefetchCache.get(movie.id);
    if (cachedData?.details) {
      setSelectedMovie({
        ...movie,
        ...cachedData.details,
        similar: cachedData.similar?.results || []
      });
    } else {
      setSelectedMovie(movie);
    }
  }, [prefetchCache]);
  
  // Memory optimization: Clear handleMovieClick callback on unmount
  useEffect(() => {
    return () => {
      // Reset selected movie on cleanup
      setSelectedMovie(null);
      
      // Clear any cached movie data to free memory
      setPrefetchCache(new Map());
    };
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setSelectedMovie(null);
  }, []);
  
  // Memory optimization: Clear handleCloseOverlay callback on unmount
  useEffect(() => {
    return () => {
      // Reset overlay state on cleanup
      setSelectedMovie(null);
      
      // Clear any pending overlay operations
      setIsTransitioning(false);
    };
  }, []);

  const handleSimilarMovieClick = useCallback((similarMovie) => {
    setSelectedMovie(similarMovie);
  }, []);
  
  // Memory optimization: Clear handleSimilarMovieClick callback on unmount
  useEffect(() => {
    return () => {
      // Reset similar movie state on cleanup
      setSelectedMovie(null);
      
      // Clear any cached similar movies data
      setPrefetchCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev.entries()) {
          if (value.similar) {
            newCache.set(key, { ...value, similar: null });
          } else {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    };
  }, []);

  // Fetch genres on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchGenres = async () => {
      try {
        const response = await getGenres();
        if (isMounted) {
          setGenres(response.genres || []);
        }
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };
    
    fetchGenres();
    
    return () => {
      isMounted = false;
      
      // Clear genres on cleanup to prevent memory leaks
      setGenres([]);
      
      // Clear any pending genre fetch operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  // Reset fetchInProgress on component mount
  useEffect(() => {
    fetchInProgress.current = false;
    
    return () => {
      // Cleanup on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
      
      // Clear any pending search operations
      setIsSearching(false);
      setSearchError(null);
      
      // Clear any pending fetch operations
      setLoading(false);
      setIsLoadingNextPage(false);
    };
  }, []);



  // Load more movies
  const handleLoadMore = async () => {
    if (loading || currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    await fetchMovies(activeCategory, nextPage);
  };

  // Handle genre click
  const handleGenreChange = (genreId) => {
    setSelectedGenre(genreId);
    setShowGenreDropdown(false);
  };

  // Handle genre navigation from MovieDetailsOverlay
  const handleGenreNavigation = (genre) => {
    if (genre && genre.id) {
      setSelectedGenre(genre); // Set the full genre object, not just the ID
      setShowGenreDropdown(false);
      // Close the overlay
      setSelectedMovie(null);
    }
  };

  // Handle year click
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setShowYearDropdown(false);
  };

  // Handle sort change
  const handleSortChange = (sort) => {
    setSortBy(sort);
    setPage(1);
  };

  const performSearch = async (query, pageNum = 1) => {
    
    if (!query.trim()) {
      setSearchResults([]);
      setHasMoreSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      setError(null); // Clear any previous errors
      
      const response = await searchMovies(query, pageNum);
      
      
      
      if (pageNum === 1) {
        setSearchResults(response.results || []);
        
      } else {
        const newResults = (response.results || []).filter(newMovie => 
          !searchResults.some(existingMovie => existingMovie.id === newMovie.id)
        );
        setSearchResults(prev => [...prev, ...newResults]);
        
      }

      setHasMoreSearchResults(response.page < response.total_pages);
      
    } catch (err) {
      console.error('Error searching movies:', err);
      setError('Failed to search movies');
      setSearchResults([]);
      setHasMoreSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Memory optimization: Clear performSearch function on unmount
  useEffect(() => {
    return () => {
      // Reset search states on cleanup
      setIsSearching(false);
      setSearchError(null);
      setSearchResults([]);
      setHasMoreSearchResults(false);
      
      // Clear search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Debounced search function - removed duplicate implementation
  // The EnhancedSearchBar now handles the search logic

  // Update the load more search results with memory optimization
  const loadMoreSearchResults = useCallback(async () => {
    if (!searchQuery.trim() || !hasMoreSearchResults || isSearching) return;

    try {
      setIsSearching(true);
      const nextPage = searchPage + 1;
      const response = await searchMovies(searchQuery, nextPage);

      if (response.results) {
        setSearchResults(prev => {
          const newResults = response.results.filter(newMovie => 
            !prev.some(existingMovie => existingMovie.id === newMovie.id)
          );
          const updatedResults = [...prev, ...newResults];
          
          // Memory optimization: Limit search results array size
          const MAX_SEARCH_RESULTS = 200;
          if (updatedResults.length > MAX_SEARCH_RESULTS) {
            return updatedResults.slice(-MAX_SEARCH_RESULTS);
          }
          
          return updatedResults;
        });
        setHasMoreSearchResults(response.page < response.total_pages);
        setSearchPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more search results:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, hasMoreSearchResults, isSearching, searchPage]);
  
  // Memory optimization: Clear loadMoreSearchResults callback on unmount
  useEffect(() => {
    return () => {
      // Reset search pagination states on cleanup
      setSearchPage(1);
      setHasMoreSearchResults(false);
      
      // FIXED: Clear any pending search operations and timeouts
      setIsSearching(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      // Clear search results to prevent memory leaks
      setSearchResults([]);
      setSearchError(null);
    };
  }, []);

  // FIXED: Intersection observer effect for search results without infinite loops
  useEffect(() => {
    if (inView && hasMoreSearchResults && !isSearching && searchQuery.trim()) {
      // Call loadMoreSearchResults directly to avoid function dependency
      loadMoreSearchResults();
    }
    
    return () => {
      // Cleanup for search results intersection observer
      // No specific cleanup needed as the observer is managed by useInView
    };
  }, [inView, hasMoreSearchResults, isSearching, searchQuery]); // Removed loadMoreSearchResults dependency

  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Get selected genre name
  const getSelectedGenreName = () => {
    if (!selectedGenre) return 'Genre';
    const genre = genres.find(g => g.id === selectedGenre);
    return genre ? genre.name : 'Genre';
  };

  // Get selected sort name
  const getSelectedSortName = () => {
    switch (sortBy) {
      case 'popularity':
        return 'Popularity';
      case 'top_rated':
        return 'Top Rated';
      case 'trending':
        return 'Trending';
      default:
        return 'Sort by';
    }
  };

  // Progressive loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, header: true }));
    }, 100);

    const filtersTimer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, filters: true }));
    }, 300);

    const moviesTimer = setTimeout(() => {
      setLoadedSections(prev => ({ ...prev, movies: true }));
    }, 500);

    return () => {
      clearTimeout(timer);
      clearTimeout(filtersTimer);
      clearTimeout(moviesTimer);
      
      // Reset loaded sections on cleanup
      setLoadedSections({
        header: false,
        filters: false,
        movies: false
      });
      
      // Clear any pending loading operations
      setIsTransitioning(false);
    };
  }, []);

  // Load search history and trending searches
  useEffect(() => {
    const loadSearchData = () => {
      const history = searchHistoryService.getHistoryByType('movie');
      const trending = searchHistoryService.getTrendingSearches(5);
      
      setSearchHistoryItems(history.map(item => item.query));
      setTrendingSearches(trending);
    };

    loadSearchData();
    
    // Subscribe to history changes
    const unsubscribe = searchHistoryService.subscribe(() => {
      loadSearchData();
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      
      // Clear search data on cleanup
      setSearchHistoryItems([]);
      setTrendingSearches([]);
      
      // Clear any pending search operations
      setIsSearching(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Add click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowGenreDropdown(false);
        setShowYearDropdown(false);
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      
      // Close all dropdowns on cleanup
      setShowGenreDropdown(false);
      setShowYearDropdown(false);
      setShowSortDropdown(false);
      setGenreDropdownOpen(false);
      setYearDropdownOpen(false);
    };
  }, []);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowGenreDropdown(false);
        setShowYearDropdown(false);
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      
      // Close all dropdowns on cleanup
      setShowGenreDropdown(false);
      setShowYearDropdown(false);
      setShowSortDropdown(false);
      setGenreDropdownOpen(false);
      setYearDropdownOpen(false);
    };
  }, []);

  // Update the filterMovies function to handle both regular movies and search results
  const filterMovies = useCallback((moviesToFilter) => {
    try {
      if (!moviesToFilter || !Array.isArray(moviesToFilter)) {
        return [];
      }
      
      // If we have year or genre filters applied, the API should have already filtered them
      // This function is now mainly used for search results
      return moviesToFilter.filter(movie => {
        if (!movie) return false;
        
        // For search results, we might still need to apply filters
        let matchesGenre = true;
        if (selectedGenre && selectedGenre.id) {
          matchesGenre = movie.genre_ids && Array.isArray(movie.genre_ids) && movie.genre_ids.includes(selectedGenre.id);
        }
        
        let matchesYear = true;
        if (selectedYear) {
          const movieYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
          matchesYear = movieYear && movieYear === parseInt(selectedYear);
        }
        
        return matchesGenre && matchesYear;
      });
    } catch (error) {
      console.error('Error in filterMovies:', error);
      return moviesToFilter || [];
    }
  }, [selectedGenre, selectedYear]);
  
  // Memory optimization: Clear filterMovies callback on unmount
  useEffect(() => {
    return () => {
      // Reset filter states on cleanup
      setSelectedGenre(null);
      setSelectedYear(null);
      
      // Clear any pending filter operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  // Get the current list of movies to display
  const getDisplayMovies = useCallback(() => {
    try {
      if (searchQuery.trim() && searchResults.length > 0) {
        // For search results, apply filters
        return filterMovies(searchResults);
      } else {
        // For regular movies, return them as-is since they're already filtered by the API
        return movies;
      }
    } catch (error){
      console.error('Error in getDisplayMovies:', error);
      return [];
    }
  }, [searchQuery, searchResults, movies, filterMovies]);
  
  // Memory optimization: Clear getDisplayMovies callback on unmount
  useEffect(() => {
    return () => {
      // Reset display states on cleanup
      setSearchQuery('');
      setSearchResults([]);
      setMovies([]);
      
      // Clear any pending display operations
      setIsTransitioning(false);
    };
  }, []);

  const handleYearSelect = useCallback(async (year) => {
    setSelectedYear(year);
    setYearDropdownOpen(false);
    
    // Update URL with the new year
    const searchParams = new URLSearchParams(window.location.search);
    if (year) {
      searchParams.set('year', year.toString());
    } else {
      searchParams.delete('year');
    }
    navigate(`?${searchParams.toString()}`, { replace: true });
  }, [navigate]);
  
  // Memory optimization: Clear handleYearSelect callback on unmount
  useEffect(() => {
    return () => {
      // Reset year state on cleanup
      setSelectedYear(null);
      setYearDropdownOpen(false);
      
      // Clear any pending year operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, []);

  // Update the useEffect that tracks movies state changes
  useEffect(() => {
    if (movies.length > 0) {
      moviesRef.current = movies;
    }
    
    return () => {
      // Cleanup movies reference on unmount
      moviesRef.current = [];
      previousMovies.current = [];
      
      // Clear any pending movie operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, [movies]);

  // FIXED: Effect to refetch movies when filters change without infinite loops
  useEffect(() => {
    // Only refetch if we're not in a search state
    if (!searchQuery.trim()) {
      setMovies([]);
      setPage(1);
      setHasMore(true);
      setError(null);
      setLoading(true);
      setIsLoadingNextPage(false);
      setNextPageMovies([]);
      
      // Call fetchMovies directly to avoid function dependency
      if (activeCategory && !fetchInProgress.current) {
        fetchMovies(activeCategory, 1);
      }
    }
    
    return () => {
      // Cleanup on filter change
      setNextPageMovies([]);
      setIsLoadingNextPage(false);
      
      // Clear any pending filter operations
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
    };
  }, [selectedYear, selectedGenre, activeCategory, searchQuery]); // Removed fetchMovies dependency

  // FIXED: Initial load effect without infinite loops
  useEffect(() => {
    if (!searchQuery.trim() && movies.length === 0) {
      // Call fetchMovies directly to avoid function dependency
      if (activeCategory && !fetchInProgress.current) {
        fetchMovies(activeCategory, 1);
      }
    }
    
    return () => {
      // Cleanup on initial load effect unmount
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
      
      // Clear any pending initial load operations
      setLoading(false);
      setIsLoadingNextPage(false);
    };
  }, [activeCategory, searchQuery, movies.length]); // Removed fetchMovies dependency

  // Update the loadMoreMovies function with memory optimization
  const loadMoreMovies = useCallback(async () => {
    
    if (loading || !hasMore || fetchInProgress.current) {
      if (import.meta.env.DEV) {
        console.log(`🚫 Load more blocked:`, { loading, hasMore, fetchInProgress: fetchInProgress.current, activeCategory });
      }
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log(`🚀 Starting load more for ${activeCategory}:`, { currentPage, hasMore, loading, isLoadingMore });
    }
    
    fetchInProgress.current = true;
    // Keep both flags in sync: one gates requests, the other drives UI spinner
    setIsLoadingMore(true);
    setIsLoadingNextPage(true);
    
    try {
      const nextPage = currentPage + 1;
      let newMovies = [];
      
      // Use the same logic as fetchMovies for consistency
      if (selectedYear || selectedGenre) {
        // Use discoverMovies for filtered results with category-specific sorting
        const discoverParams = {
          page: nextPage,
          vote_count_gte: 10,
          include_adult: false
        };

        // Apply category-specific sorting and constraints
        switch (activeCategory) {
          case 'popular':
            discoverParams.sort_by = 'popularity.desc';
            break;
          case 'top_rated':
            discoverParams.sort_by = 'vote_average.desc';
            discoverParams.vote_count_gte = 50; // Higher threshold for top rated
            break;
          case 'upcoming':
            discoverParams.sort_by = 'release_date.asc';
            // Don't override year filter if user selected one
            if (!selectedYear) {
              const today = new Date();
              discoverParams.primary_release_date_gte = today.toISOString().split('T')[0];
            }
            break;
          case 'now_playing':
            discoverParams.sort_by = 'popularity.desc';
            // Don't override year filter if user selected one
            if (!selectedYear) {
              const today = new Date();
              const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
              discoverParams.primary_release_date_gte = thirtyDaysAgo.toISOString().split('T')[0];
              discoverParams.primary_release_date_lte = today.toISOString().split('T')[0];
            }
            break;
          default:
            discoverParams.sort_by = 'popularity.desc';
        }

        if (selectedYear) {
          discoverParams.primary_release_year = selectedYear;
        }

        if (selectedGenre && selectedGenre.id) {
          discoverParams.with_genres = selectedGenre.id;
        }

        if (import.meta.env.DEV) {
          console.log(`🎬 Using discoverMovies for ${activeCategory} at page:`, nextPage);
        }

        const response = await discoverMovies(discoverParams);
        newMovies = response.movies || [];
        setHasMore(nextPage < response.totalPages);
        if (response.totalPages) {
          setTotalPages(response.totalPages);
        }
      } else {
        // Load more movies for current category
        if (import.meta.env.DEV) {
          console.log(`🎬 Loading more movies for ${activeCategory} at page:`, nextPage);
        }
        
        let response;
        // Use the same logic as fetchMovies for streaming service categories
        switch (activeCategory) {
          case 'netflix':
            response = await getMoviesByNetwork(8, nextPage);
            break;
                     case 'prime':
             // Try multiple Prime Video network IDs to find content
             const primeLoadMoreNetworkIds = [9, 119, 10, 8]; // Amazon, Amazon Prime Video, Amazon Studios, Netflix
             let primeLoadMoreResponse = null;
             
             for (const networkId of primeLoadMoreNetworkIds) {
               if (import.meta.env.DEV) {
                 console.log(`🎬 Load more: Trying Prime Video network ID ${networkId}...`);
               }
               
               try {
                 const tempResponse = await getMoviesByNetwork(networkId, nextPage);
                 if (tempResponse.results && tempResponse.results.length > 0) {
                   if (import.meta.env.DEV) {
                     console.log(`✅ Load more: Found ${tempResponse.results.length} movies with Prime Video network ID ${networkId}`);
                   }
                   primeLoadMoreResponse = tempResponse;
                   break;
                 }
               } catch (error) {
                 if (import.meta.env.DEV) {
                   console.warn(`⚠️ Load more: Failed to fetch with Prime Video network ID ${networkId}:`, error.message);
                 }
               }
             }
             
             if (primeLoadMoreResponse) {
               response = primeLoadMoreResponse;
             } else {
               if (import.meta.env.DEV) {
                 console.warn(`⚠️ Load more: No Prime Video movies found with any network ID, using fallback`);
               }
               // Fallback to popular movies if no Prime Video content found
               response = await getPopularMovies(nextPage);
             }
             break;
                                                                                            case 'hbo':
                // Try multiple HBO network IDs to find content
                const hboLoadMoreNetworkIds = [118, 384, 49, 50, 119, 8, 213, 2]; // HBO, HBO Max, HBO Films, Amazon, Netflix, Netflix Originals, Disney
                let hboLoadMoreResponse = null;
                
                for (const networkId of hboLoadMoreNetworkIds) {
                  if (import.meta.env.DEV) {
                    console.log(`🎬 Load more: Trying HBO network ID ${networkId}...`);
                  }
                  
                  try {
                    const tempResponse = await getMoviesByNetwork(networkId, nextPage);
                    if (tempResponse.results && tempResponse.results.length > 0) {
                      if (import.meta.env.DEV) {
                        console.log(`✅ Load more: Found ${tempResponse.results.length} movies with HBO network ID ${networkId}`);
                      }
                      hboLoadMoreResponse = tempResponse;
                      break;
                    }
                  } catch (error) {
                    if (import.meta.env.DEV) {
                      console.warn(`⚠️ Load more: Failed to fetch with HBO network ID ${networkId}:`, error.message);
                    }
                  }
                }
                
                if (hboLoadMoreResponse) {
                  response = hboLoadMoreResponse;
                } else {
                  if (import.meta.env.DEV) {
                    console.warn(`⚠️ Load more: No HBO movies found with any network ID, using fallback`);
                  }
                  // Fallback to popular movies if no HBO content found
                  response = await getPopularMovies(nextPage);
                }
                break;
                      case 'hulu':
              // Try SeriesPage's Hulu ID first (453), then fallback to others if no results
              response = await getMoviesByNetwork(453, nextPage);
              if (!response.results || response.results.length === 0) {
                if (import.meta.env.DEV) {
                  console.log(`🎬 No movies found with Hulu ID 453, trying Hulu ID 15...`);
                }
                const huluResponse = await getMoviesByNetwork(15, nextPage);
                if (huluResponse.results && huluResponse.results.length > 0) {
                  if (import.meta.env.DEV) {
                    console.log(`✅ Found ${huluResponse.results.length} movies with Hulu ID 15`);
                  }
                  response = huluResponse;
                } else {
                  // Try Hulu Originals as last resort
                  if (import.meta.env.DEV) {
                    console.log(`🎬 No movies found with Hulu ID 15, trying Hulu Originals ID 122...`);
                  }
                  const huluOriginalsResponse = await getMoviesByNetwork(122, nextPage);
                  if (huluOriginalsResponse.results && huluOriginalsResponse.results.length > 0) {
                    if (import.meta.env.DEV) {
                      console.log(`✅ Found ${huluOriginalsResponse.results.length} movies with Hulu Originals ID 122`);
                    }
                    response = huluOriginalsResponse;
                  }
                }
              }
              break;
          case 'disney':
            response = await getMoviesByNetwork(2, nextPage);
            break;
          case 'apple':
            response = await getMoviesByNetwork(284, nextPage);
            break;
          default:
            response = await getMoviesByCategory(activeCategory, nextPage);
        }
        
        newMovies = response.movies || response.results || [];
        
        // 🚀 FIXED: Enhanced hasMore logic with better debugging
        const totalPages = response.totalPages || response.total_pages || 1;
        const hasMorePages = nextPage < totalPages;
        
        if (import.meta.env.DEV) {
          console.log(`🎬 Load more for ${activeCategory}:`, {
            nextPage,
            totalPages,
            hasMorePages,
            newMoviesCount: newMovies.length,
            response
          });
        }
        
        setHasMore(hasMorePages);
        if (totalPages) {
          setTotalPages(totalPages);
        }
      }
      
      if (newMovies.length > 0) {
        setMovies(prevMovies => {
          // Proper deduplication to prevent duplicate content
          const existingIds = new Set(prevMovies.map(movie => movie.id));
          const uniqueNewMovies = newMovies.filter(movie => !existingIds.has(movie.id));
          
          if (uniqueNewMovies.length === 0) {
            setHasMore(false);
            if (import.meta.env.DEV) {
              console.log(`🚫 No unique movies found, setting hasMore to false`);
            }
            return prevMovies;
          }
          
          const updatedMovies = [...prevMovies, ...uniqueNewMovies];
          
          // Memory optimization: Limit movies array size to prevent memory leaks
          const MAX_MOVIES = 500;
          if (updatedMovies.length > MAX_MOVIES) {
            // Keep only the most recent movies
            return updatedMovies.slice(-MAX_MOVIES);
          }
          
          if (import.meta.env.DEV) {
            console.log(`✅ Load more successful:`, {
              category: activeCategory,
              prevCount: prevMovies.length,
              newCount: uniqueNewMovies.length,
              totalCount: updatedMovies.length,
              nextPage
            });
          }
          
          return updatedMovies;
        });
        // Advance page after successfully appending unique movies
        setCurrentPage(nextPage);
      } else {
        setHasMore(false);
        if (import.meta.env.DEV) {
          console.log(`🚫 No new movies returned, setting hasMore to false for ${activeCategory}`);
        }
      }
    } catch (error) {
      console.error('🎬 Error loading more movies:', error);
      setError('Failed to load more movies: ' + (error.message || 'Unknown error'));
      
      if (import.meta.env.DEV) {
        console.log(`❌ Load more error for ${activeCategory}:`, {
          error: error.message,
          currentPage,
          hasMore
        });
      }
    } finally {
      setIsLoadingMore(false);
      setIsLoadingNextPage(false);
      fetchInProgress.current = false;
      
      if (import.meta.env.DEV) {
        console.log(`🏁 Load more completed for ${activeCategory}:`, {
          loading: false,
          isLoadingMore: false,
          fetchInProgress: false
        });
      }
      // No special guard reset needed; conditions gate firing
    }
  }, [loading, hasMore, currentPage, selectedYear, selectedGenre, activeCategory]);
  
  // Memory optimization: Clear loadMoreMovies callback on unmount
  useEffect(() => {
    return () => {
      // Reset loading states on cleanup
      setIsLoadingMore(false);
      setIsLoadingNextPage(false);
      if (fetchInProgress.current) {
        fetchInProgress.current = false;
      }
      
      // Clear any pending load more operations
      setHasMore(false);
    };
  }, []);

  // FIXED: Intersection observer effect without infinite loops
  // 🚀 FIXED: Infinite scrolling intersection observer with proper debouncing and error handling
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Intersection observer effect triggered:', { inView, hasMore, loading, isLoadingMore });
    }
    
    let timeoutId = null;
    
    // 🚀 FIXED: Only trigger load more if we actually have more content to load
    if (
      inView &&
      hasMore &&
      !loading &&
      !isLoadingMore &&
      !fetchInProgress.current
    ) {
      // 🚀 FIXED: Add debouncing to prevent rapid successive calls
      timeoutId = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.log('🚀 Triggering load more for category:', activeCategory);
        }
        
        // Call loadMoreMovies directly to avoid function dependency
        loadMoreMovies();
      }, 100); // 100ms debounce delay
    } else if (inView && !hasMore) {
      // 🚀 FIXED: Log when intersection observer triggers but no more content
      if (import.meta.env.DEV) {
        console.log('ℹ️ Intersection observer triggered but no more content to load for:', activeCategory);
      }
    }
    
    return () => {
      // Cleanup for load more movies intersection observer
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Clear any pending load more operations
      setIsLoadingMore(false);
      setIsLoadingNextPage(false);
    };
  }, [inView, hasMore, loading, isLoadingMore, activeCategory]); // Added activeCategory dependency

  // Update the movies grid section to use getDisplayMovies
  const displayMovies = useMemo(() => {
    return getDisplayMovies();
  }, [getDisplayMovies]);
  
  // Memory optimization: Clear displayMovies when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending display operations
      setIsTransitioning(false);
      
      // Don't clear loaded images immediately - let them persist for better UX
      // setLoadedImages({});
      // Clear loaded images after a delay to prevent memory accumulation
      setTimeout(() => {
        setLoadedImages({});
      }, 30000); // Clear after 30 seconds
    };
  }, []);



  // Clear loaded images when category changes significantly
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadedImages({});
    }, 60000); // Clear after 1 minute of category change
    
    return () => clearTimeout(timer);
  }, [activeCategory]);

  // Enhanced prefetch handling - MEMORY LEAK FIX
  const handlePrefetch = useCallback((movieId) => {
    // FIXED: Only update stats if not already prefetched to prevent rapid increases
    setPrefetchedMovies(prev => {
      if (prev.has(movieId)) {
        return prev; // Already prefetched, don't update stats
      }
      return new Set([...prev, movieId]);
    });
    
    // FIXED: Only increment stats if this is a new prefetch
    setPrefetchedMovies(prev => {
      if (!prev.has(movieId)) {
        setPrefetchStats(prevStats => ({
          ...prevStats,
          totalPrefetched: prevStats.totalPrefetched + 1,
          successfulPrefetches: prevStats.successfulPrefetches + 1
        }));
      }
      return prev;
    });
  }, []);
  
  // Memory optimization: Clear handlePrefetch callback on unmount
  useEffect(() => {
    return () => {
      // Reset prefetch states on cleanup
      setPrefetchedMovies(new Set());
      setPrefetchStats({
        totalPrefetched: 0,
        successfulPrefetches: 0,
        failedPrefetches: 0,
        cacheHits: 0
      });
      
      // FIXED: Clear prefetch queue and timeout
      if (prefetchQueueRef.current) {
        prefetchQueueRef.current.length = 0;
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
      isProcessingPrefetchRef.current = false;
      
      // Clear prefetch cache
      setPrefetchCache(new Map());
    };
  }, []);

  // Intelligent prefetch queue processing with memory optimization
  const processPrefetchQueue = useCallback(async () => {
    if (isProcessingPrefetchRef.current || prefetchQueueRef.current.length === 0) {
      return;
    }

    isProcessingPrefetchRef.current = true;

    try {
      // Process up to 3 prefetch requests at a time
      const batchSize = 3;
      const batch = prefetchQueueRef.current.splice(0, batchSize);

      await Promise.allSettled(
        batch.map(async (queueItem) => {
          const { movieId } = queueItem;
          
          try {
            // Check if already in cache
            if (prefetchCache.has(movieId)) {
              setPrefetchStats(prev => ({
                ...prev,
                cacheHits: prev.cacheHits + 1
              }));
              return;
            }

            // Prefetch movie details and similar movies
            const [details, similar] = await Promise.allSettled([
              getMovieDetails(movieId, 'movie'),
              getSimilarMovies(movieId, 'movie', 1)
            ]);

            // Only cache if we have valid data
            const detailsValue = details.status === 'fulfilled' ? details.value : null;
            const similarValue = similar.status === 'fulfilled' ? similar.value : null;
            
            // Only cache if we have at least some data or if the movie is confirmed to not exist
            if (detailsValue || similarValue || (detailsValue === null && similarValue === null)) {
              setPrefetchCache(prev => {
                const newCache = new Map(prev);
                
                // Memory optimization: Limit cache size
                if (newCache.size >= MAX_CACHE_SIZE) {
                  // Remove oldest entries
                  const entries = Array.from(newCache.entries());
                  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                  const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2)); // Remove 20% of oldest entries
                  toRemove.forEach(([key]) => newCache.delete(key));
                }
                
                newCache.set(movieId, {
                  details: detailsValue,
                  similar: similarValue,
                  timestamp: Date.now()
                });
                
                return newCache;
              });
            }

            handlePrefetch(movieId);
          } catch (error) {
            console.warn(`Failed to prefetch movie ${movieId}:`, error);
            setPrefetchStats(prev => ({
              ...prev,
              failedPrefetches: prev.failedPrefetches + 1
            }));
          }
        })
      );
    } finally {
      isProcessingPrefetchRef.current = false;
      
      // Process next batch if queue is not empty
      if (prefetchQueueRef.current.length > 0) {
        const timeoutId = setTimeout(processPrefetchQueue, 100);
        
        // Store timeout ID for cleanup
        prefetchTimeoutRef.current = timeoutId;
      }
    }
  }, [prefetchCache]); // Removed handlePrefetch dependency to prevent infinite loops
  
  // Memory optimization: Clear processPrefetchQueue callback on unmount
  useEffect(() => {
    return () => {
      // Reset prefetch processing states on cleanup
      isProcessingPrefetchRef.current = false;
      prefetchQueueRef.current = [];
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
      
      // Clear any pending prefetch operations
      setPrefetchCache(new Map());
    };
  }, []);

  // Enhanced prefetch queue with priority based on visibility and memory optimization - MEMORY LEAK FIX
  const queuePrefetchWithPriority = useCallback((movieId, priority = 'normal') => {
    // FIXED: Add throttling to prevent rapid prefetch calls
    const now = Date.now();
    const lastPrefetchTime = queuePrefetchWithPriority.lastCallTime || 0;
    const THROTTLE_DELAY = 1000; // 1 second throttle
    
    if (now - lastPrefetchTime < THROTTLE_DELAY) {
      return; // Skip if called too recently
    }
    queuePrefetchWithPriority.lastCallTime = now;
    
    if (prefetchedMovies.has(movieId) || prefetchCache.has(movieId)) {
      return;
    }
    
    // Skip prefetching if we've already determined this movie doesn't exist
    const cachedData = prefetchCache.get(movieId);
    if (cachedData && cachedData.details === null && cachedData.similar === null) {
      return;
    }

    const queueItem = { movieId, priority, timestamp: Date.now() };
    
    // FIXED: Reduce queue size to prevent memory leaks
    const MAX_QUEUE_SIZE = 20; // Reduced from 50 to 20
    if (prefetchQueueRef.current.length >= MAX_QUEUE_SIZE) {
      // Remove oldest low priority items
      prefetchQueueRef.current = prefetchQueueRef.current.filter(item => 
        item.priority === 'high' || 
        (Date.now() - item.timestamp) < 15000 // Reduced from 30 seconds to 15 seconds
      );
    }
    
    // FIXED: Check if item is already in queue to prevent duplicates
    const isAlreadyQueued = prefetchQueueRef.current.some(item => item.movieId === movieId);
    if (isAlreadyQueued) {
      return;
    }
    
    // Add to queue with priority
    if (priority === 'high') {
      prefetchQueueRef.current.unshift(queueItem);
    } else {
      prefetchQueueRef.current.push(queueItem);
    }
    
    // Start processing if not already running
    if (!isProcessingPrefetchRef.current) {
      processPrefetchQueue();
    }
  }, [prefetchedMovies, prefetchCache]); // Removed processPrefetchQueue dependency to prevent infinite loops
  
  // Memory optimization: Clear queuePrefetchWithPriority callback on unmount
  useEffect(() => {
    return () => {
      // Reset queue states on cleanup
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
      
      // Clear any pending prefetch operations
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Memory optimization: Clear prefetch queue on component unmount
  useEffect(() => {
    return () => {
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
      
      // Clear prefetch timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, []);

  // Add movie to prefetch queue (updated to use priority)
  const queuePrefetch = useCallback((movieId) => {
    // Check if movie is visible for priority
    const priority = visibleMovies.has(movieId) ? 'high' : 'normal';
    queuePrefetchWithPriority(movieId, priority);
  }, [visibleMovies, queuePrefetchWithPriority]);
  
  // Memory optimization: Clear queuePrefetch callback on unmount
  useEffect(() => {
    return () => {
      // Reset queue states on cleanup
      setVisibleMovies(new Set());
      
      // Clear any pending prefetch operations
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
    };
  }, []);

  // Store the latest queuePrefetch function in a ref to avoid stale closures - MEMORY LEAK FIX
  const queuePrefetchRef = useRef(queuePrefetch);
  
  // Update the ref whenever queuePrefetch changes - MEMORY LEAK FIX
  useEffect(() => {
    queuePrefetchRef.current = queuePrefetch;
    
    return () => {
      // Clear the ref on cleanup
      queuePrefetchRef.current = null;
      
      // Clear any pending prefetch operations
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
    };
  }, [queuePrefetch]);

  // FIXED: Add throttling to queuePrefetch to prevent excessive calls
  const throttledQueuePrefetch = useCallback((movieId) => {
    const now = Date.now();
    const lastCallTime = throttledQueuePrefetch.lastCallTime || 0;
    const THROTTLE_DELAY = 2000; // 2 seconds throttle
    
    if (now - lastCallTime < THROTTLE_DELAY) {
      return; // Skip if called too recently
    }
    throttledQueuePrefetch.lastCallTime = now;
    
    queuePrefetchRef.current(movieId);
  }, []);

  // Enhanced visibility tracking for predictive prefetching with memory optimization - MEMORY LEAK FIX
  useEffect(() => {
    // FIXED: Only create observer if not already exists to prevent recreation
    if (visibilityObserverRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const newVisibleMovies = new Set(visibleMovies);
        
        entries.forEach(entry => {
          const movieId = entry.target.dataset.movieId;
          if (movieId) {
            if (entry.isIntersecting) {
              newVisibleMovies.add(parseInt(movieId));
              // FIXED: Reduce prefetch frequency - only prefetch when more visible
              if (entry.intersectionRatio > 0.5) { // Increased threshold from 0.1 to 0.5
                throttledQueuePrefetch(parseInt(movieId));
              }
            } else {
              newVisibleMovies.delete(parseInt(movieId));
            }
          }
        });
        
        // Memory optimization: Limit visible movies set size
        if (newVisibleMovies.size > MAX_VISIBLE_MOVIES) {
          const visibleArray = Array.from(newVisibleMovies);
          const trimmedSet = new Set(visibleArray.slice(-MAX_VISIBLE_MOVIES));
          setVisibleMovies(trimmedSet);
        } else {
          setVisibleMovies(newVisibleMovies);
        }
      },
      {
        rootMargin: '100px 0px', // FIXED: Reduced from 200px to 100px to reduce prefetch area
        threshold: [0, 0.5, 1.0] // FIXED: Simplified thresholds to reduce call frequency
      }
    );

    visibilityObserverRef.current = observer;

    // FIXED: Use setTimeout to ensure DOM is ready and prevent immediate observation
    const observeTimeout = setTimeout(() => {
      const movieCards = document.querySelectorAll('[data-movie-id]');
      movieCards.forEach(card => observer.observe(card));
    }, 100);

    return () => {
      clearTimeout(observeTimeout);
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
        visibilityObserverRef.current = null;
      }
      
      // Clear visible movies on cleanup to prevent memory leaks
      setVisibleMovies(new Set());
      
      // Clear any pending visibility operations
      prefetchQueueRef.current = [];
      isProcessingPrefetchRef.current = false;
    };
  }, []); // FIXED: Removed dependencies to prevent recreation

  // FIXED: Separate effect to observe new movie cards when movies change
  useEffect(() => {
    if (visibilityObserverRef.current) {
      // Observe new movie cards that might have been added
      const movieCards = document.querySelectorAll('[data-movie-id]');
      movieCards.forEach(card => {
        if (!card.dataset.observed) {
          visibilityObserverRef.current.observe(card);
          card.dataset.observed = 'true';
        }
      });
    }
  }, [movies, searchResults]);

  // Clean up old cache entries (older than 10 minutes) - MEMORY LEAK FIX
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      setPrefetchCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev.entries()) {
          if (now - value.timestamp < tenMinutes) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
      
      // Also clean up prefetched movies set to prevent memory leaks
      setPrefetchedMovies(prev => {
        const newSet = new Set();
        // Keep only recent entries (last 100)
        const recentEntries = Array.from(prev).slice(-100);
        recentEntries.forEach(id => newSet.add(id));
        return newSet;
      });
      
      // FIXED: Reset prefetch stats periodically to prevent counter overflow
      setPrefetchStats(prev => ({
        totalPrefetched: Math.min(prev.totalPrefetched, 1000), // Cap at 1000
        successfulPrefetches: Math.min(prev.successfulPrefetches, 1000),
        failedPrefetches: Math.min(prev.failedPrefetches, 100),
        cacheHits: Math.min(prev.cacheHits, 1000)
      }));
    }, 5 * 60 * 1000); // Clean up every 5 minutes (only when tab visible)

    return () => {
      clearInterval(cleanupInterval);
      
      // Clear any pending cache operations
      setPrefetchCache(new Map());
      setPrefetchedMovies(new Set());
    };
  }, []);

  // Enhanced clear filters function that properly clears URL parameters
  const clearAllFilters = useCallback(() => {
    try {
      // Clear local state
      setSelectedYear(null);
      setSelectedGenre(null);
      
      // Clear URL parameters completely
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('genre');
      searchParams.delete('year');
      
      // Keep only the category parameter
      const category = searchParams.get('category');
      if (category) {
        searchParams.set('category', category);
      }
      
      // Update URL without the filter parameters
      navigate(`?${searchParams.toString()}`, { replace: true });
      
      // Force refetch movies without filters
      if (activeCategory) {
        setMovies([]);
        setPage(1);
        setHasMore(true);
        setError(null);
        setLoading(true);
        setIsLoadingNextPage(false);
        setNextPageMovies([]);
        
        // Clear any existing fetch operations
        if (fetchInProgress.current) {
          fetchInProgress.current = false;
        }
        
        // Refetch movies without filters
        fetchMovies(activeCategory, 1);
      }
    } catch (error) {
      console.error('Error clearing filters:', error);
    }
  }, [navigate, activeCategory]);

  return (
    <motion.div 
      ref={(el) => { scrollContainerRef.current = el; setScrollRootEl(el); }}
              className="min-h-screen bg-[#0F0F0F] text-white overflow-y-auto scrollbar-gutter-stable ultra-smooth-scroll momentum-scroll"
      exit={{ opacity: 0 }}
    >
      <div className="w-full px-4 py-8">
        {/* Search and Filters Section */}
        <div className="flex flex-col items-center gap-6">
                  {/* Enhanced Search Bar */}
        <div className="relative w-full">
          <div className="relative max-w-xl mx-auto">
            <Suspense fallback={
              <div className="w-full h-12 bg-gray-800 rounded-lg animate-pulse"></div>
            }>
              <EnhancedSearchBar
                placeholder="Search movies..."
                initialValue={searchQuery}
                onSearch={(query) => {
                  setSearchQuery(query);
                  if (query.trim()) {
                    performSearch(query, 1);
                  } else {
                    setSearchResults([]);
                    setHasMoreSearchResults(false);
                  }
                }}
                onSearchSubmit={(query) => {
                  // Only add to history when search is actually submitted
                  searchHistoryService.addToHistory(query, 'movie');
                }}
                onClear={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasMoreSearchResults(false);
                }}
                isLoading={isSearching}
                showLoadingSpinner={true}
                theme="dark"
                variant="floating"
                size="md"
                showSuggestions={true}
                suggestions={searchResults.slice(0, 5).map(movie => ({
                  title: movie.title,
                  name: movie.title,
                  id: movie.id,
                  poster_path: movie.poster_path,
                  year: movie.release_date ? new Date(movie.release_date).getFullYear() : null
                }))}
                onSuggestionSelect={(suggestion) => {
                  const movie = searchResults.find(m => m.id === suggestion.id);
                  if (movie) {
                    handleMovieClick(movie);
                  }
                }}
                searchHistory={searchHistoryItems}
                showHistory={true}
                onHistorySelect={(historyItem) => {
                  setSearchQuery(historyItem);
                  performSearch(historyItem, 1);
                  searchHistoryService.incrementSearchCount(historyItem);
                }}
                clearHistory={() => searchHistoryService.clearHistoryByType('movie')}
                showTrendingSearches={true}
                trendingSearches={trendingSearches}
                onTrendingSelect={(trending) => {
                  setSearchQuery(trending);
                  performSearch(trending, 1);
                  searchHistoryService.addToHistory(trending, 'movie');
                }}
              />
            </Suspense>
          </div>
        </div>

          {/* Category Selector */}
          {!searchQuery && (
                            <div className="relative inline-flex rounded-full bg-[#1a1a1a] p-1 overflow-x-auto max-w-full horizontal-scroll-container">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`relative px-4 py-0.5 rounded-full text-sm font-medium transition-colors duration-300 whitespace-nowrap focus:outline-none flex items-center gap-2 ${
                    activeCategory === category.id
                      ? 'text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >

                                    {/* Show streaming service icon if available */}
                                    {StreamingIcons[category.id] && (
                    <span className="relative z-10 flex-shrink-0">
                      {(() => {
                        try {
                          return StreamingIcons[category.id]();
                        } catch (error) {
                          console.error(`Error rendering icon for ${category.id}:`, error);
                          return null;
                        }
                      })()}
                    </span>
                  )}
                  <span className="relative z-10">{category.name}</span>
                  {activeCategory === category.id && (
                    <motion.div
                      layoutId="activeCategoryBackground"
                      className="absolute inset-0 bg-white rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-4 justify-center w-full">
            {/* Year Filter */}
            <div className="relative" ref={yearDropdownRef}>
              <button
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedYear 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {selectedYear ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    {selectedYear}
                  </span>
                ) : (
                  'Year'
                )}
                <svg
                  className={`w-4 h-4 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {yearDropdownOpen && (
                <div className="absolute z-50 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg py-1">
                  <button
                    onClick={() => handleYearSelect(null)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#2b3036]"
                  >
                    All Years
                  </button>
                  {yearOptions.map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearSelect(year)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2b3036] ${
                        selectedYear === year ? 'text-white bg-[#2b3036]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Genre Filter */}
            <div className="relative" ref={genreDropdownRef}>
              <button
                onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedGenre 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {selectedGenre ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    {selectedGenre.name}
                  </span>
                ) : (
                  'Genre'
                )}
                <svg
                  className={`w-4 h-4 transition-transform ${genreDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {genreDropdownOpen && (
                <div className="absolute z-50 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleGenreSelect(null)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#2b3036]"
                  >
                    All Genres
                  </button>
                  {genres.map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreSelect(genre)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2b3036] ${
                        selectedGenre?.id === genre.id ? 'text-white bg-[#2b3036]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedYear || selectedGenre) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center items-center gap-2 mt-4"
          >
            <span className="text-sm text-gray-400">Showing:</span>
            <div className="flex gap-2">
              {selectedGenre && (
                <span className="px-3 py-1 bg-white text-black text-sm rounded-full font-medium">
                  {selectedGenre.name}
                </span>
              )}
              {selectedYear && (
                <span className="px-3 py-1 bg-white text-black text-sm rounded-full font-medium">
                  {selectedYear}
                </span>
              )}
                              <button
                  onClick={() => clearAllFilters()}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded-full hover:bg-gray-500 transition-colors"
                >
                  Clear All
                </button>
            </div>
          </motion.div>
        )}

        {/* Movies grid with smooth category transitions */}
        <motion.div 
          className="w-full mt-8"
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
                    {error ? (
            <EnhancedLoadingIndicator
              isLoading={false}
              error={error}
              retryCount={retryCount}
              onRetry={handleRetry}
              context={`${activeCategory} movies`}
              className="col-span-full"
            />
          ) : (loading && movies.length === 0) ? (
            <EnhancedLoadingIndicator
              isLoading={true}
              error={null}
              retryCount={retryCount}
              onRetry={handleRetry}
              context={`${activeCategory} movies`}
              className="col-span-full"
              hasContent={movies.length > 0}
            />
          ) : (
            <motion.div
                key={`movies-grid-${activeCategory}-${selectedGenre?.id || 'all'}-${selectedYear || 'all'}`}
                variants={gridVariants}
                initial="hidden"
                animate="visible"
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  staggerChildren: 0.02,
                  delayChildren: 0.05
                }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4"
              >
                {displayMovies.map((movie, index) => {
                  if (!movie || !movie.id) {
                    return null;
                  }
                  return (
                    <MovieCard
                      key={`movie-${movie.id}`}
                      movie={movie}
                      index={index}
                      onClick={handleMovieClick}
                      onPrefetch={queuePrefetch}
                      onImageLoad={handleImageLoad}
                      onImageError={handleImageError}
                      isImageLoaded={loadedImages[movie.id] === true}
                    />
                  );
                })}
                {/* Show loading placeholders for next page */}
                {isLoadingNextPage && (
                  <>
                    {Array.from({ length: 20 }, (_, index) => (
                      <motion.div
                        key={`loading-placeholder-${index}`}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800"
                      >
                        <motion.div 
                          className="w-full h-full bg-gray-800"
                          animate={{
                            opacity: [0.5, 0.8, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </motion.div>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          
          {/* Load more trigger */}
          {hasMore ? (
            <motion.div 
              ref={loadMoreRef} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="h-20 flex items-center justify-center"
              style={{ minHeight: '100px' }}
            >
              {isLoadingNextPage && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center space-x-3"
                >
                  <div className="flex space-x-1">
                    <motion.div
                      className="w-2 h-2 bg-white/40 rounded-full"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-white/40 rounded-full"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-white/40 rounded-full"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                  <span className="text-white/50 text-sm font-light">Loading more...</span>
                </motion.div>
              )}
            </motion.div>
          ) : (
            // 🚀 NEW: Show message when no more movies available
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="h-20 flex items-center justify-center text-white/60 text-sm"
            >
              {movies.length > 0 && (
                <div className="text-center">
                  <p>🎬 You've reached the end of {activeCategory === 'upcoming' ? 'upcoming' : activeCategory} movies</p>
                  <p className="text-xs text-white/40 mt-1">Check back later for more content!</p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Prefetch Performance Monitor (Development Only) - MEMORY LEAK FIX */}
        {import.meta.env.DEV && import.meta.env.VITE_DEBUG_MEMORY === 'true' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50 max-w-xs"
          >
            <div className="font-semibold mb-2">Prefetch Stats</div>
            <div className="space-y-1">
              <div>Total: {prefetchStats.totalPrefetched}</div>
              <div>Success: {prefetchStats.successfulPrefetches}</div>
              <div>Failed: {prefetchStats.failedPrefetches}</div>
              <div>Cache Hits: {prefetchStats.cacheHits}</div>
              <div>Queue: {prefetchQueueRef.current.length}</div>
              <div>Visible: {visibleMovies.size}</div>
            </div>
          </motion.div>
        )}

        {/* Movie Details Overlay */}
        <AnimatePresence>
          {selectedMovie && (
            <Suspense fallback={null}>
              <MovieDetailsOverlay
                movie={selectedMovie}
                onClose={handleCloseOverlay}
                onMovieSelect={handleSimilarMovieClick}
                onGenreClick={handleGenreNavigation}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
        ${styles}
      `}</style>

      {/* Network Status Badge */}
      <NetworkStatusBadge />
    </motion.div>
  );
};

export default MoviesPage;