/**
 * HomePage Store - Advanced State Management with Zustand
 * 
 * This store replaces 30+ useState hooks with a centralized, optimized state management solution
 * Benefits:
 * - Minimal re-renders (only affected components update)
 * - Better debugging with Redux DevTools
 * - Persistent state across sessions
 * - Type-safe with TypeScript support
 * - Immer for immutable updates
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * State shape definitions (JSDoc for type hints)
 * 
 * @typedef {Object} MovieSection
 * @property {Array} movies - Array of movie objects
 * @property {boolean} loading - Loading state
 * @property {string|null} error - Error message if any
 * @property {number} page - Current page number
 * @property {boolean} hasMore - Whether more items are available
 * @property {number|null} lastFetched - Timestamp of last fetch
 */

/**
 * @typedef {Object} UIState
 * @property {Object|null} selectedMovie - Currently selected movie
 * @property {number} currentFeaturedIndex - Index of featured content
 * @property {string} activeCategory - Active category filter
 * @property {boolean} isMobile - Mobile device detection
 * @property {boolean} isTransitioning - Transition state
 * @property {boolean} showAdBlockerToast - Ad blocker toast visibility
 * @property {Object|null} selectedCastMember - Selected cast member
 * @property {boolean} showCastDetails - Cast details visibility
 */

/**
 * @typedef {Object} PerformanceState
 * @property {Object} metrics - Performance metrics
 * @property {Set} prefetchQueue - Queue of items to prefetch
 * @property {boolean} isPrefetching - Prefetching state
 * @property {Set} visibleSections - Currently visible sections
 */

// Initial section state factory
const createInitialSection = () => ({
  movies: [],
  loading: false,
  error: null,
  page: 1,
  hasMore: true,
  lastFetched: null,
});

// Create the store with middleware
export const useHomePageStore = create(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          sections: {
            trending: createInitialSection(),
            popular: createInitialSection(),
            topRated: createInitialSection(),
            upcoming: createInitialSection(),
            action: createInitialSection(),
            comedy: createInitialSection(),
            drama: createInitialSection(),
            horror: createInitialSection(),
            sciFi: createInitialSection(),
            documentary: createInitialSection(),
            family: createInitialSection(),
            animation: createInitialSection(),
            awardWinning: createInitialSection(),
            latest: createInitialSection(),
            popularTV: createInitialSection(),
            topRatedTV: createInitialSection(),
            airingToday: createInitialSection(),
            nowPlaying: createInitialSection(),
          },
          
          ui: {
            selectedMovie: null,
            currentFeaturedIndex: 0,
            activeCategory: 'all',
            isMobile: false,
            isTransitioning: false,
            showAdBlockerToast: false,
            selectedCastMember: null,
            showCastDetails: false,
          },
          
          performance: {
            metrics: {
              firstContentfulPaint: 0,
              largestContentfulPaint: 0,
              timeToInteractive: 0,
              memoryUsage: 0,
            },
            prefetchQueue: new Set(),
            isPrefetching: false,
            visibleSections: new Set(['all', 'trending', 'popular']),
          },
          
          featuredContent: null,
          
          // Actions with Immer for immutable updates
          setSectionMovies: (section, movies) => set(draft => {
            draft.sections[section].movies = movies;
            draft.sections[section].loading = false;
            draft.sections[section].error = null;
            draft.sections[section].lastFetched = Date.now();
          }),
          
          setSectionLoading: (section, loading) => set(draft => {
            draft.sections[section].loading = loading;
          }),
          
          setSectionError: (section, error) => set(draft => {
            draft.sections[section].error = error;
            draft.sections[section].loading = false;
          }),
          
          appendSectionMovies: (section, movies) => set(draft => {
            // Filter out duplicates
            const existingIds = new Set(draft.sections[section].movies.map(m => m.id));
            const newMovies = movies.filter(m => !existingIds.has(m.id));
            draft.sections[section].movies.push(...newMovies);
            draft.sections[section].loading = false;
            draft.sections[section].hasMore = newMovies.length > 0;
          }),
          
          incrementSectionPage: (section) => set(draft => {
            draft.sections[section].page += 1;
          }),
          
          updateUI: (updates) => set(draft => {
            Object.assign(draft.ui, updates);
          }),
          
          setSelectedMovie: (movie) => set(draft => {
            draft.ui.selectedMovie = movie;
          }),
          
          setFeaturedContent: (content) => set(draft => {
            draft.featuredContent = content;
          }),
          
          addToPrefetchQueue: (movieId) => set(draft => {
            draft.performance.prefetchQueue.add(movieId);
          }),
          
          removeFromPrefetchQueue: (movieId) => set(draft => {
            draft.performance.prefetchQueue.delete(movieId);
          }),
          
          setIsPrefetching: (isPrefetching) => set(draft => {
            draft.performance.isPrefetching = isPrefetching;
          }),
          
          updatePerformanceMetric: (metric, value) => set(draft => {
            draft.performance.metrics[metric] = value;
          }),
          
          addVisibleSection: (section) => set(draft => {
            draft.performance.visibleSections.add(section);
          }),
          
          removeVisibleSection: (section) => set(draft => {
            draft.performance.visibleSections.delete(section);
          }),
          
          resetSection: (section) => set(draft => {
            draft.sections[section] = createInitialSection();
          }),
          
          resetAllSections: () => set(draft => {
            Object.keys(draft.sections).forEach(key => {
              draft.sections[key] = createInitialSection();
            });
          }),
        }))
      ),
      {
        name: 'homepage-storage',
        // Only persist sections data, not UI state
        partialize: (state) => ({
          sections: state.sections,
          featuredContent: state.featuredContent,
        }),
        // Version for cache invalidation
        version: 1,
      }
    ),
    { name: 'HomePage Store' }
  )
);

// Selectors for optimized component subscriptions
export const useSection = (section) =>
  useHomePageStore(state => state.sections[section]);

export const useSectionMovies = (section) =>
  useHomePageStore(state => state.sections[section].movies);

export const useSectionLoading = (section) =>
  useHomePageStore(state => state.sections[section].loading);

export const useUI = () => useHomePageStore(state => state.ui);

export const useSelectedMovie = () => useHomePageStore(state => state.ui.selectedMovie);

export const useFeaturedContent = () => useHomePageStore(state => state.featuredContent);

export const usePerformance = () => useHomePageStore(state => state.performance);

// Action hooks
export const useSectionActions = () => ({
  setSectionMovies: useHomePageStore(state => state.setSectionMovies),
  setSectionLoading: useHomePageStore(state => state.setSectionLoading),
  setSectionError: useHomePageStore(state => state.setSectionError),
  appendSectionMovies: useHomePageStore(state => state.appendSectionMovies),
  incrementSectionPage: useHomePageStore(state => state.incrementSectionPage),
  resetSection: useHomePageStore(state => state.resetSection),
});

export const useUIActions = () => ({
  updateUI: useHomePageStore(state => state.updateUI),
  setSelectedMovie: useHomePageStore(state => state.setSelectedMovie),
  setFeaturedContent: useHomePageStore(state => state.setFeaturedContent),
});

// Performance monitoring hook
export const usePerformanceTracking = () => {
  const updateMetric = useHomePageStore(state => state.updatePerformanceMetric);
  
  return {
    trackMetric: (metric, value) => {
      updateMetric(metric, value);
      
      // Send to analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'performance_metric', {
          metric_name: metric,
          metric_value: value,
        });
      }
    },
  };
};

export default useHomePageStore;
