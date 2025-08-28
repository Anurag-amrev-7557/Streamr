import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getPopularTVShows, 
  getTopRatedTVShows, 
  getAiringTodayTVShows,
  getTVSeriesByNetwork,
  getMovieDetails,
  getGenres,
  searchMovies
} from '../services/tmdbService';
import { useInView } from 'react-intersection-observer';
const MovieDetailsOverlay = lazy(() => import('./MovieDetailsOverlay'));
const EnhancedEpisodeList = lazy(() => import('./EnhancedEpisodeList'));
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';
import { useWatchlist } from '../contexts/WatchlistContext';
const EnhancedSearchBar = lazy(() => import('./EnhancedSearchBar'));
import searchHistoryService from '../services/searchHistoryService';
import { formatRating } from '../utils/ratingUtils';
import enhancedEpisodeService from '../services/enhancedEpisodeService';
import RatingBadge from './RatingBadge';
import { getTmdbImageUrl } from '../utils/imageUtils.js';
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

// Animation variants for smooth transitions
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

// Ultra-smooth scrolling styles
const scrollStyles = `
  .ultra-smooth-scroll {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    scroll-snap-type: x proximity;
    scroll-padding: 1rem;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    perspective: 1000px;
    will-change: scroll-position, transform;
    contain: layout style paint;
    isolation: isolate;
  }
`;

// Inject scroll styles
if (typeof document !== 'undefined') {
  const existing = document.getElementById('series-page-scroll-styles');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'series-page-scroll-styles';
    style.textContent = scrollStyles;
    document.head.appendChild(style);
  }
}

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
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  }
};

const SeriesCard = ({ series, onSeriesClick, onShowEpisodes, index = 0 }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [loadedImages, setLoadedImages] = useState({});
  
  // Touch event handling for mobile
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const isTouchDevice = useRef(false);

  // Detect touch device
  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Cleanup effect for timeouts
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      touchStartRef.current = null;
      touchEndRef.current = null;
    };
  }, []);
  
  // Validate the series object
  if (!series || typeof series !== 'object') {
    console.warn('Invalid series object passed to SeriesCard:', series);
    return null;
  }
  
  const isBookmarked = watchlist.some(item => item.id === series.id);

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    if (isBookmarked) {
      removeFromWatchlist(series.id);
    } else {
      addToWatchlist({ ...series, title: series.name || series.title, type: 'tv' });
    }
  };

  const handleEpisodesClick = (e) => {
    e.stopPropagation();
    onShowEpisodes?.(series);
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

    // Call the original onSeriesClick handler
    onSeriesClick(series);
  }, [onSeriesClick, series]);

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

  const handleImageLoad = (id) => {
    setLoadedImages(prev => ({ ...prev, [id]: true }));
  };

  const getImageUrl = (path) => {
    if (!path) return '/placeholder-image.jpg';
    return getTmdbImageUrl(path, 'w500');
  };

  const seriesName = series.name || series.title || 'Unknown Title';
  const seriesYear = series.first_air_date ? new Date(series.first_air_date).getFullYear() : 
                    series.release_date ? new Date(series.release_date).getFullYear() : null;
  const seriesRating = series.vote_average || series.rating || 0;

  return (
    <motion.div
      className="group cursor-pointer transform transition-all duration-300 hover:scale-105 touch-manipulation select-none"
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      <div className="group aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative">
        {/* Rating Badge - top left */}
        <RatingBadge 
          rating={seriesRating} 
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

        {series.poster_path ? (
          <>
            <img
              src={getImageUrl(series.poster_path)}
              alt={seriesName}
              loading={index < 12 ? 'eager' : 'lazy'}
              decoding="async"
              fetchpriority={index < 12 ? 'high' : 'auto'}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
                loadedImages[series.id] ? 'opacity-100' : 'opacity-0'
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 16vw, 12vw"
              onLoad={() => handleImageLoad(series.id)}
            />
            {!loadedImages[series.id] && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white/60"></div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-white/60 text-center p-2">{seriesName}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="text-white">
            <h4 className="font-medium text-sm truncate">{seriesName}</h4>
            <p className="text-xs text-gray-300 flex items-center gap-1">
              {seriesYear} •
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                {formatRating(seriesRating)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SeriesPage = () => {
  // 🚀 FIXED: Add mounted ref to prevent state updates on unmounted components
  const isMountedRef = useRef(true);
  
  const navigate = useNavigate();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [activeCategory, setActiveCategory] = useState('popular');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [genres, setGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(true);
  const [loadedSections, setLoadedSections] = useState({
    popular: false,
    topRated: false,
    airingToday: false
  });
  const observerRef = useRef(null);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [searchHistoryItems, setSearchHistoryItems] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [selectedSeriesForEpisodes, setSelectedSeriesForEpisodes] = useState(null);
  const [episodeListLoading, setEpisodeListLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [isMobile, setIsMobile] = useState(false);

  const categories = [
    { id: 'popular', label: 'Popular', networkId: null },
    { id: 'top_rated', label: 'Top Rated', networkId: null },
    { id: 'airing_today', label: 'Airing Today', networkId: null },
    { id: 'netflix', label: 'Netflix', networkId: 213 },
    { id: 'prime', label: 'Prime Video', networkId: 1024 },
    { id: 'hbo', label: 'HBO', networkId: 49 },
    { id: 'hulu', label: 'Hulu', networkId: 453 },
    { id: 'disney', label: 'Disney+', networkId: 2739 },
    { id: 'apple', label: 'Apple TV+', networkId: 2552 }
  ];

  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // 🚀 FIXED: Enhanced cleanup on unmount with proper mounted ref management
  useEffect(() => {
    isMountedRef.current = true;
    
    fetchGenres();
    fetchInitialSeries();
    
    return () => {
      // Mark as unmounted first to prevent any new operations
      isMountedRef.current = false;
      
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Load search history and trending searches
  useEffect(() => {
    const loadSearchData = () => {
      const history = searchHistoryService.getHistoryByType('tv');
      const trending = searchHistoryService.getTrendingSearches(5);
      
      setSearchHistoryItems(history.map(item => item.query));
      setTrendingSearches(trending);
    };

    loadSearchData();
    
    // Subscribe to history changes
    const unsubscribe = searchHistoryService.subscribe(() => {
      loadSearchData();
    });

    return unsubscribe;
  }, []);

  // FIXED: Intersection observer effect without infinite loops
  useEffect(() => {
    if (inView && hasMore && !loading && !isLoadingMore) {
      // FIXED: Use a timeout to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          loadMoreSeries();
        }
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [inView, hasMore, loading, isLoadingMore]); // FIXED: Removed loadMoreSeries dependency to prevent infinite loop

  // 🎬 MOBILE OPTIMIZED: Mobile detection for responsive loading states
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || 
                           (window.navigator && window.navigator.userAgent && 
                            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent));
      setIsMobile(isMobileDevice);
    };
    
    // Check immediately
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const fetchGenres = async () => {
    try {
      const response = await getGenres();
      const allGenres = response.genres || [];
      // Show only TV-applicable genres to avoid non-matching filters
      const tvGenres = allGenres.filter(g => !g.type || g.type === 'tv' || g.type === 'both');
      setGenres(tvGenres);
    } catch (err) {
      console.error('Error fetching genres:', err);
    }
  };

  // Enhanced retry handler for loading failures
  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    
    try {
      await fetchInitialSeries(activeCategory);
    } catch (error) {
      console.error('Retry failed:', error);
      setError(enhancedLoadingService.getErrorMessage(error, 'TV series'));
    }
  }, [activeCategory]);

  const fetchInitialSeries = async (category = activeCategory) => {
    try {
      setLoading(true);
      const networkId = categories.find(c => c.id === category)?.networkId;
      
      let response;
      if (networkId) {
        // Fetch series by network/streaming service
        response = await getTVSeriesByNetwork(networkId, 1);
      } else {
        // Fetch based on category
        switch (category) {
          case 'popular':
            response = await getPopularTVShows(1);
            break;
          case 'top_rated':
            response = await getTopRatedTVShows(1);
            break;
          case 'airing_today':
            response = await getAiringTodayTVShows(1);
            break;
          default:
            response = await getPopularTVShows(1);
        }
      }
      
      // Handle different response formats
      let seriesData = [];
      let totalPages = 1;
      let currentPage = 1;
      
      if (response) {
        // getPopularTVShows returns { movies: [...], totalPages: ..., currentPage: ... }
        if (response.movies && Array.isArray(response.movies)) {
          seriesData = response.movies;
          totalPages = response.totalPages || 1;
          currentPage = response.currentPage || 1;
        }
        // getTVSeriesByNetwork returns { results: [...], page: ..., totalPages: ... }
        else if (response.results && Array.isArray(response.results)) {
          seriesData = response.results;
          totalPages = response.totalPages || 1;
          currentPage = response.page || 1;
        }
        // Fallback for other formats
        else if (Array.isArray(response)) {
          seriesData = response;
        }
      }
      
      if (seriesData.length > 0) {
        const transformedSeries = seriesData.map(series => {
          // Check if data is already transformed (from getPopularTVShows)
          const isAlreadyTransformed = series.title && series.poster && !series.name;
          
          if (isAlreadyTransformed) {
            // Data is already transformed, just ensure it has the required properties
            return {
              ...series,
              type: 'tv',
              name: series.title, // Map title back to name for consistency
              poster_path: series.poster, // Map poster back to poster_path
              backdrop_path: series.backdrop, // Map backdrop back to backdrop_path
              first_air_date: series.year ? `${series.year}-01-01` : null,
              vote_average: parseFloat(series.rating) || 0,
              number_of_seasons: series.seasons || 0,
              overview: series.overview || '',
              genre_ids: series.genre_ids || [],
              networks: series.networks || []
            };
          } else {
            // Raw data from getTVSeriesByNetwork, apply standard transformation
            return {
              ...series,
              type: 'tv',
              title: series.name || series.title,
              year: series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A',
              rating: series.vote_average,
              duration: `${series.number_of_seasons || 0} Season${(series.number_of_seasons || 0) !== 1 ? 's' : ''}`,
              backdrop: series.backdrop_path,
              image: series.poster_path,
              overview: series.overview,
              genre_ids: Array.isArray(series.genre_ids)
                ? series.genre_ids
                : (Array.isArray(series.genres)
                  ? series.genres.map(g => (typeof g === 'object' ? g.id : g))
                  : []),
              networks: series.networks
            };
          }
        });

        setSeries(transformedSeries);
        setHasMore(currentPage < totalPages);
        setPage(currentPage);
      } else {
        console.error('No series data found in response:', response);
        setError('No series available');
      }
    } catch (err) {
      console.error('Error fetching series:', err);
      setError(enhancedLoadingService.getErrorMessage(err, 'TV series'));
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSeries = useCallback(async () => {
    if (loading || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const networkId = categories.find(c => c.id === activeCategory)?.networkId;
      
      let response;
      if (networkId) {
        // Fetch more series by network/streaming service
        response = await getTVSeriesByNetwork(networkId, nextPage);
      } else {
        // Fetch more based on category
        switch (activeCategory) {
          case 'popular':
            response = await getPopularTVShows(nextPage);
            break;
          case 'top_rated':
            response = await getTopRatedTVShows(nextPage);
            break;
          case 'airing_today':
            response = await getAiringTodayTVShows(nextPage);
            break;
          default:
            response = await getPopularTVShows(nextPage);
        }
      }
      
      // Handle different response formats
      let seriesData = [];
      let totalPages = 1;
      let currentPage = nextPage;
      
      if (response) {
        // getPopularTVShows returns { movies: [...], totalPages: ..., currentPage: ... }
        if (response.movies && Array.isArray(response.movies)) {
          seriesData = response.movies;
          totalPages = response.totalPages || 1;
          currentPage = response.currentPage || nextPage;
        }
        // getTVSeriesByNetwork returns { results: [...], page: ..., totalPages: ... }
        else if (response.results && Array.isArray(response.results)) {
          seriesData = response.results;
          totalPages = response.totalPages || 1;
          currentPage = response.page || nextPage;
        }
        // Fallback for other formats
        else if (Array.isArray(response)) {
          seriesData = response;
        }
      }
      
      if (seriesData.length > 0) {
        const transformedSeries = seriesData.map(series => {
          // Check if data is already transformed (from getPopularTVShows)
          const isAlreadyTransformed = series.title && series.poster && !series.name;
          
          if (isAlreadyTransformed) {
            // Data is already transformed, just ensure it has the required properties
            return {
              ...series,
              type: 'tv',
              name: series.title, // Map title back to name for consistency
              poster_path: series.poster, // Map poster back to poster_path
              backdrop_path: series.backdrop, // Map backdrop back to backdrop_path
              first_air_date: series.year ? `${series.year}-01-01` : null,
              vote_average: parseFloat(series.rating) || 0,
              number_of_seasons: series.seasons || 0,
              overview: series.overview || '',
              genre_ids: series.genre_ids || [],
              networks: series.networks || []
            };
          } else {
            // Raw data from getTVSeriesByNetwork, apply standard transformation
            return {
              ...series,
              type: 'tv',
              title: series.name || series.title,
              year: series.first_air_date ? series.first_air_date.split('-')[0] : 'N/A',
              rating: series.vote_average,
              duration: `${series.number_of_seasons || 0} Season${(series.number_of_seasons || 0) !== 1 ? 's' : ''}`,
              backdrop: series.backdrop_path,
              image: series.poster_path,
              overview: series.overview,
              genre_ids: Array.isArray(series.genre_ids)
                ? series.genre_ids
                : (Array.isArray(series.genres)
                  ? series.genres.map(g => (typeof g === 'object' ? g.id : g))
                  : []),
              networks: series.networks
            };
          }
        });

        setSeries(prev => {
          // Create a Set of existing series IDs for efficient lookup
          const existingIds = new Set(prev.map(series => series.id));
          
          // Filter out duplicates from new series
          const uniqueNewSeries = transformedSeries.filter(series => !existingIds.has(series.id));
          
          // Return combined list with only unique entries
          return [...prev, ...uniqueNewSeries];
        });
        setHasMore(currentPage < totalPages);
        setPage(currentPage);
      } else {
        console.error('No series data found in response:', response);
        setError('No more series available');
      }
    } catch (err) {
      console.error('Error loading more series:', err);
      setError(enhancedLoadingService.getErrorMessage(err, 'more TV series'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [loading, isLoadingMore, page, activeCategory, categories]); // Added dependency array to prevent infinite loops

  // Add URL parameter handling
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const category = searchParams.get('category');
    const genreParam = searchParams.get('genre');
    const yearParam = searchParams.get('year');
    
    if (category && category !== activeCategory) {
      handleCategoryClick(category);
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
        setSelectedGenre(genreId);
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
      // Clear any pending operations
      if (isTransitioning) {
        setIsTransitioning(false);
      }
    };
  }, [window.location.search, genres, activeCategory, selectedGenre, selectedYear]);

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
      
      // Force refetch series without filters
      if (activeCategory) {
        setSeries([]);
        setPage(1);
        setHasMore(true);
        setError(null);
        setLoading(true);
        setIsLoadingMore(false);
        
        // Refetch series without filters
        fetchInitialSeries(activeCategory);
      }
    } catch (error) {
      console.error('Error clearing filters:', error);
    }
  }, [navigate, activeCategory]);

  // Enhanced category change handler that preserves existing filters
  const handleCategoryClick = useCallback(async (category) => {
    if (activeCategory === category || isTransitioning) return;
    
    // Set transition state for smooth animations
    setIsTransitioning(true);
    
    // Reset all states when changing category
    setActiveCategory(category);
    setSeries([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setLoading(true);
    setIsLoadingMore(false);
    
    // Update URL with new category and preserve existing filters
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('category', category);
    
    // Only preserve filters if they exist locally (not cleared)
    if (selectedGenre) {
      const genreName = genres.find(g => g.id === selectedGenre)?.name;
      if (genreName) {
        searchParams.set('genre', genreName.toLowerCase());
      }
    } else {
      searchParams.delete('genre');
    }
    
    if (selectedYear) {
      searchParams.set('year', selectedYear.toString());
    } else {
      searchParams.delete('year');
    }
    
    navigate(`?${searchParams.toString()}`, { replace: true });
    
    try {
      // Fetch series for the new category
      await fetchInitialSeries(category);
    } catch (error) {
      console.error('Category change error:', error);
      setError('Failed to load series: ' + (error.message || 'Unknown error'));
      setSeries([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      // Clear transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }
  }, [activeCategory, isTransitioning, navigate, selectedGenre, selectedYear, genres]);

  const handleSeriesClick = async (series) => {
    try {
      console.log(`Fetching series details for ID: ${series.id}`);
      const seriesDetails = await getMovieDetails(series.id, 'tv');

      // Check if seriesDetails is null or undefined
      if (!seriesDetails) {
        console.warn(`Series with ID ${series.id} not found or returned null`);
        setError('Series not found or unavailable');
        return;
      }

      console.log('Series details received:', seriesDetails);

      // Transform the series data to match the expected format
      const transformedSeries = {
        ...seriesDetails,
        type: 'tv',
        title: seriesDetails.name || 'Unknown Title',
        release_date: seriesDetails.first_air_date || null,
        runtime: seriesDetails.episode_run_time?.[0] || null,
        networks: seriesDetails.networks?.map(network => network.name).join(', ') || 'N/A',
        number_of_seasons: seriesDetails.number_of_seasons || 0,
        number_of_episodes: seriesDetails.number_of_episodes || 0,
        status: seriesDetails.status || 'Unknown',
        similar: seriesDetails.similar?.results || [],
        videos: seriesDetails.videos?.results || [],
        credits: {
          cast: seriesDetails.credits?.cast || [],
          crew: seriesDetails.credits?.crew || []
        }
      };

      setSelectedSeries(transformedSeries);
    } catch (err) {
      console.error('Error fetching series details:', err);
      setError('Failed to load series details');
    }
  };

  const handleCloseOverlay = () => {
    setSelectedSeries(null);
  };

  // Handle genre navigation from MovieDetailsOverlay
  const handleGenreNavigation = (genre) => {
    if (genre && genre.id) {
      setSelectedGenre(genre.id);
      // Close the overlay
      setSelectedSeries(null);
    }
  };

  const handleSimilarSeriesClick = async (similarSeries) => {
    try {
      console.log(`Fetching similar series details for ID: ${similarSeries.id}`);
      const seriesDetails = await getMovieDetails(similarSeries.id, 'tv');

      // Check if seriesDetails is null or undefined
      if (!seriesDetails) {
        console.warn(`Similar series with ID ${similarSeries.id} not found or returned null`);
        setError('Series not found or unavailable');
        return;
      }

      console.log('Similar series details received:', seriesDetails);

      // Transform the series data to match the expected format
      const transformedSeries = {
        ...seriesDetails,
        type: 'tv',
        title: seriesDetails.name || 'Unknown Title',
        release_date: seriesDetails.first_air_date || null,
        runtime: seriesDetails.episode_run_time?.[0] || null,
        networks: seriesDetails.networks?.map(network => network.name).join(', ') || 'N/A',
        number_of_seasons: seriesDetails.number_of_seasons || 0,
        number_of_episodes: seriesDetails.number_of_episodes || 0,
        status: seriesDetails.status || 'Unknown',
        similar: seriesDetails.similar?.results || [],
        videos: seriesDetails.videos?.results || [],
        credits: {
          cast: seriesDetails.credits?.cast || [],
          crew: seriesDetails.credits?.crew || []
        }
      };

      setSelectedSeries(transformedSeries);
    } catch (err) {
      console.error('Error fetching similar series details:', err);
      setError('Failed to load series details');
    }
  };

  // Enhanced episode fetching functions
  const handleShowEpisodes = async (series) => {
    try {
      setEpisodeListLoading(true);
      setSelectedSeriesForEpisodes(series);
      setShowEpisodeList(true);
      
      // Pre-fetch seasons metadata for better performance
      await enhancedEpisodeService.getAllSeasons(series.id);
    } catch (err) {
      console.error('Error preparing episode list:', err);
      setError('Failed to load episode information');
    } finally {
      setEpisodeListLoading(false);
    }
  };

  const handleEpisodeSelect = (episode, season) => {
    if (!selectedSeriesForEpisodes) return;
    
    // Create enhanced episode object with full context
    const enhancedEpisode = {
      ...episode,
      series: selectedSeriesForEpisodes,
      season: season,
      fullTitle: `${selectedSeriesForEpisodes.name} - ${season.name} - Episode ${episode.episode_number}`,
      streamingUrl: `/tv/${selectedSeriesForEpisodes.id}/${season.season_number}/${episode.episode_number}`
    };
    
    console.log('Selected episode:', enhancedEpisode);
    
    // You can add streaming logic here or pass to parent component
    // For now, we'll just log the selection
    setShowEpisodeList(false);
  };

  const handleSeasonChange = (season) => {
    console.log('Season changed to:', season);
  };

  const handleCloseEpisodeList = () => {
    setShowEpisodeList(false);
    setSelectedSeriesForEpisodes(null);
  };

  const handleImageLoad = (id) => {
    setLoadedImages(prev => ({ ...prev, [id]: true }));
  };

  const handleImageError = (id) => {
    setLoadedImages(prev => ({ ...prev, [id]: true }));
  };

  const getImageUrl = (path) => {
    return path
      ? getTmdbImageUrl(path, 'w500')
      : 'https://via.placeholder.com/500x750?text=No+Image';
  };

  const searchSeries = useCallback(async (query, pageNum = 1) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasMoreSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const data = await searchMovies(query, pageNum, { searchType: 'tv' });

      // Validate and transform search results to ensure they have the correct structure
      const validatedResults = (data.results || [])
        .filter(result => {
          // Keep only TV results when media_type is present
          return !result?.media_type || result.media_type === 'tv';
        })
        .map(result => {
        // Ensure the result is a valid object with required properties
        if (!result || typeof result !== 'object') {
          console.warn('Invalid search result:', result);
          return null;
        }

        // Transform the result to ensure it has the expected structure
        const transformedResult = {
          id: result.id || result.movie_id || result.tv_id,
          name: result.name || result.title || 'Unknown Title',
          title: result.title || result.name || 'Unknown Title',
          poster_path: result.poster_path || result.poster || '',
          backdrop_path: result.backdrop_path || result.backdrop || '',
          overview: result.overview || result.description || '',
          first_air_date: result.first_air_date || result.release_date || '',
          release_date: result.release_date || result.first_air_date || '',
          vote_average: result.vote_average || result.rating || 0,
          vote_count: result.vote_count || 0,
          popularity: result.popularity || 0,
          genre_ids: result.genre_ids || result.genres || [],
          media_type: result.media_type || 'tv',
          original_language: result.original_language || 'en',
          original_name: result.original_name || result.original_title || '',
          original_title: result.original_title || result.original_name || '',
          adult: result.adult || false,
          video: result.video || false,
          known_for_department: result.known_for_department || '',
          profile_path: result.profile_path || '',
          known_for: result.known_for || []
        };

        // Additional validation to ensure we have at least an id and name/title
        if (!transformedResult.id || (!transformedResult.name && !transformedResult.title)) {
          console.warn('Invalid transformed result - missing required fields:', transformedResult);
          return null;
        }

        return transformedResult;
      }).filter(Boolean); // Remove any null results

      if (pageNum === 1) {
        setSearchResults(validatedResults);
      } else {
        // Use Set for efficient deduplication (O(n) instead of O(n²))
        const existingIds = new Set(searchResults.map(series => series.id));
        const uniqueNewResults = validatedResults.filter(newSeries => !existingIds.has(newSeries.id));
        setSearchResults(prev => [...prev, ...uniqueNewResults]);
      }

      setHasMoreSearchResults(data.page < data.total_pages);
    } catch (err) {
      console.error('Error searching series:', err);
      setError('Failed to search series');
    } finally {
      setIsSearching(false);
    }
  }, [searchResults]); // Added dependency array to prevent infinite loops

  const debouncedSearch = React.useMemo(() => debounce((query) => {
    setSearchPage(1);
    searchSeries(query, 1);
  }, 500), []);

  useEffect(() => {
    return () => {
      if (debouncedSearch && typeof debouncedSearch.cancel === 'function') {
        debouncedSearch.cancel();
      }
    };
  }, [debouncedSearch]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // FIXED: Search intersection observer effect without infinite loops
  useEffect(() => {
    if (inView && hasMoreSearchResults && !isSearching && searchQuery) {
      // FIXED: Use a timeout to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          const nextPage = searchPage + 1;
          setSearchPage(nextPage);
          searchSeries(searchQuery, nextPage);
        }
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [inView, hasMoreSearchResults, isSearching, searchQuery, searchPage]); // FIXED: Removed searchSeries dependency to prevent infinite loop

  const filterSeries = (seriesToFilter) => {
    return seriesToFilter.filter(series => {
      // Ensure we're working with a valid series object
      if (!series || typeof series !== 'object') {
        console.warn('Invalid series object in filter:', series);
        return false;
      }

      const matchesGenre = !selectedGenre || 
        (series.genre_ids && Array.isArray(series.genre_ids) && series.genre_ids.includes(selectedGenre));
      
      const seriesYear = series.first_air_date ? new Date(series.first_air_date).getFullYear() : 
                        series.release_date ? new Date(series.release_date).getFullYear() : null;
      const matchesYear = !selectedYear || seriesYear === selectedYear;
      
      return matchesGenre && matchesYear;
    });
  };

  const getDisplaySeries = () => {
    const seriesToFilter = searchQuery ? searchResults : series;
    
    // Ensure we have valid arrays to work with
    if (!Array.isArray(seriesToFilter)) {
      console.warn('Invalid series data:', seriesToFilter);
      return [];
    }
    
    return filterSeries(seriesToFilter);
  };

  // Update the initial category
  useEffect(() => {
    setActiveCategory('popular');
  }, []);

  // Trigger re-render when selectedGenre changes to apply filtering
  useEffect(() => {
    // This effect ensures that when selectedGenre changes, the component re-renders
    // and the filterSeries function is called with the new genre filter
    // FIXED: No state updates needed, just re-render trigger
  }, [selectedGenre]);

  // Add click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showGenreDropdown && !event.target.closest('.genre-dropdown')) {
        setShowGenreDropdown(false);
      }
      if (showYearDropdown && !event.target.closest('.year-dropdown')) {
        setShowYearDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // FIXED: Empty dependency array to prevent infinite loops

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="w-full px-4 py-8">


        <div className="flex flex-col items-center gap-6 mb-8">

                  {/* Enhanced Search Bar */}
        <div className='w-full relative'>
          <div className="relative max-w-xl mx-auto">
            <Suspense fallback={
              <div className="w-full h-12 bg-gray-800 rounded-lg animate-pulse"></div>
            }>
              <EnhancedSearchBar
                placeholder="Search TV series..."
                initialValue={searchQuery}
                onSearch={(query) => {
                  setSearchQuery(query);
                  searchSeries(query, 1);
                }}
                onSearchSubmit={(query) => {
                  // Only add to history when search is actually submitted
                  searchHistoryService.addToHistory(query, 'tv');
                }}
                onClear={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasMoreSearchResults(false);
                }}
                isLoading={isSearching}
                theme="dark"
                variant="floating"
                size="md"
                showSuggestions={true}
                suggestions={searchResults.slice(0, 5).map(series => {
                  // Ensure we're working with a valid series object
                  if (!series || typeof series !== 'object') {
                    return null;
                  }
                  
                  return {
                    title: series.name || series.title || 'Unknown Title',
                    name: series.name || series.title || 'Unknown Title',
                    id: series.id || series.movie_id || series.tv_id,
                    poster_path: series.poster_path || series.poster || '',
                    year: series.first_air_date ? new Date(series.first_air_date).getFullYear() : 
                           series.release_date ? new Date(series.release_date).getFullYear() : null
                  };
                }).filter(Boolean)} // Remove any null suggestions
                onSuggestionSelect={(suggestion) => {
                  const series = searchResults.find(s => s.id === suggestion.id);
                  if (series) {
                    handleSeriesClick(series);
                  }
                }}
                searchHistory={searchHistoryItems}
                showHistory={true}
                onHistorySelect={(historyItem) => {
                  setSearchQuery(historyItem);
                  searchSeries(historyItem, 1);
                  searchHistoryService.incrementSearchCount(historyItem);
                }}
                clearHistory={() => searchHistoryService.clearHistoryByType('tv')}
                showTrendingSearches={true}
                trendingSearches={trendingSearches}
                onTrendingSelect={(trending) => {
                  setSearchQuery(trending);
                  searchSeries(trending, 1);
                  searchHistoryService.addToHistory(trending, 'tv');
                }}
              />
            </Suspense>
          </div>
        </div>
          {!searchQuery && (
            <div className="relative inline-flex rounded-full bg-[#1a1a1a] p-1 overflow-x-auto max-w-full horizontal-scroll-container">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
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
                  <span className="relative z-10">{category.label}</span>
                  {activeCategory === category.id && (
                    <motion.div
                      layoutId="activeSeriesCategoryBackground"
                      className="absolute inset-0 bg-white rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-4">


            {/* Year Dropdown */}
            <div className="relative year-dropdown">
              <button
                onClick={() => setShowYearDropdown(!showYearDropdown)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showYearDropdown && (
                <div className="absolute z-50 mt-2 w-48 rounded-lg bg-[#1a1a1a] shadow-lg max-h-[60vh] overflow-y-auto">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSelectedYear(null);
                        setShowYearDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-[#2b3036] hover:text-white sticky top-0 bg-[#1a1a1a]"
                    >
                      All Years
                    </button>
                    {yearOptions.map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setSelectedYear(year);
                          setShowYearDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2b3036] ${
                          selectedYear === year ? 'text-white bg-[#2b3036]' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

                        {/* Genre Dropdown */}
                        <div className="relative genre-dropdown">
              <button
                onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  selectedGenre 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {selectedGenre ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    {genres.find(g => g.id === selectedGenre)?.name}
                  </span>
                ) : (
                  'Genre'
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showGenreDropdown && (
                <div className="absolute z-50 mt-2 w-48 rounded-lg bg-[#1a1a1a] shadow-lg max-h-[60vh] overflow-y-auto">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSelectedGenre(null);
                        setShowGenreDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-[#2b3036] hover:text-white sticky top-0 bg-[#1a1a1a]"
                    >
                      All Genres
                    </button>
                    {genres.map(genre => (
                      <button
                        key={genre.id}
                        onClick={() => {
                          setSelectedGenre(genre.id);
                          setShowGenreDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2b3036] ${
                          selectedGenre === genre.id ? 'text-white bg-[#2b3036]' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {genre.name}
                      </button>
                    ))}
                  </div>
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
                  {genres.find(g => g.id === selectedGenre)?.name}
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

        {error ? (
          <EnhancedLoadingIndicator
            isLoading={false}
            error={error}
            retryCount={retryCount}
            onRetry={handleRetry}
            context={`${activeCategory} TV series`}
            className="mt-8"
          />
        ) : (loading && series.length === 0 && !searchQuery && searchResults.length === 0) ? (
          <EnhancedLoadingIndicator
            isLoading={true}
            error={null}
            retryCount={retryCount}
            onRetry={handleRetry}
            context={`${activeCategory} TV series`}
            className="mt-8"
            hasContent={series.length > 0 || searchResults.length > 0}
          />
        ) : (
          <motion.div 
            className="mt-8"
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            {(() => {
              const displaySeries = getDisplaySeries();

              return (
                <motion.div
                  key={`${activeCategory}-${searchQuery.trim() ? 'search' : 'series'}`}
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
                  {displaySeries.map((s, index) => {
                    if (!s || typeof s !== 'object') {
                      console.warn('Invalid series object in render:', s);
                      return null;
                    }
                    
                    return (
                      <motion.div
                        key={`${s.id || index}-${index}`}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <SeriesCard 
                          series={s} 
                          onSeriesClick={handleSeriesClick} 
                          onShowEpisodes={handleShowEpisodes}
                          index={index}
                        />
                      </motion.div>
                    );
                  }).filter(Boolean)}
                </motion.div>
              );
            })()}
          </motion.div>
        )}

        {/* Show loading spinner only when loading more content (not initial load) */}
        {isLoadingMore && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center py-8"
          >
            <div className="flex items-center space-x-3">
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
            </div>
          </motion.div>
        )}

        {/* Show loading spinner for search */}
        {isSearching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center py-8"
          >
            <div className="flex items-center space-x-3">
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
              <span className="text-white/50 text-sm font-light">Searching...</span>
            </div>
          </motion.div>
        )}

        {!loading && !isSearching && ((searchQuery && hasMoreSearchResults) || (!searchQuery && hasMore)) && (
          <div ref={loadMoreRef} className="h-10" />
        )}

        {selectedSeries && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-7xl max-h-[90vh] bg-[#141414] rounded-xl overflow-hidden">
              <Suspense fallback={null}>
                <MovieDetailsOverlay
                  movie={selectedSeries}
                  onClose={handleCloseOverlay}
                  onMovieSelect={handleSimilarSeriesClick}
                  onGenreClick={handleGenreNavigation}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* Enhanced Episode List Modal */}
        {showEpisodeList && selectedSeriesForEpisodes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-6xl max-h-[90vh] bg-[#141414] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedSeriesForEpisodes.name}
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Browse Episodes
                  </p>
                </div>
                <button
                  onClick={handleCloseEpisodeList}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close episode list"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <Suspense fallback={
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                }>
                  <EnhancedEpisodeList
                    tvId={selectedSeriesForEpisodes.id}
                    onEpisodeSelect={handleEpisodeSelect}
                    onSeasonChange={handleSeasonChange}
                    showSearch={true}
                    showStats={true}
                    maxEpisodesPerPage={15}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {/* Network Status Badge */}
        <NetworkStatusBadge />
      </div>
    </div>
  );
};

export default SeriesPage; 