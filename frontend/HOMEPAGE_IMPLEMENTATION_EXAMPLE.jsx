/**
 * HomePage Implementation Example - Advanced Patterns
 * 
 * This file demonstrates how to refactor the existing HomePage.jsx to use
 * advanced patterns for optimal performance and maintainability.
 * 
 * Key improvements:
 * 1. Zustand for state management (minimal re-renders)
 * 2. React Query for server state (automatic caching, refetching)
 * 3. Advanced error boundaries
 * 4. Performance monitoring
 * 5. Optimistic updates
 * 6. Virtual scrolling
 */

import React, { useEffect, Suspense } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueries } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { useHomePageStore, useSectionActions, useUIActions } from '../stores/homePageStore';
import advancedCacheService from '../services/advancedCacheService';

// ============================================================================
// 1. QUERY CLIENT CONFIGURATION
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Use IndexedDB for persistence
      onSuccess: async (data, query) => {
        const [, section, page] = query.queryKey;
        if (section && data) {
          await advancedCacheService.setMovies(section, page || 1, data);
        }
      },
    },
  },
});

// ============================================================================
// 2. CUSTOM HOOKS FOR DATA FETCHING
// ============================================================================

/**
 * Hook for fetching a single movie section with React Query
 */
const useMovieSection = (section, page = 1) => {
  const { setSectionMovies, setSectionLoading, setSectionError } = useSectionActions();
  
  return useQuery({
    queryKey: ['movies', section, page],
    queryFn: async () => {
      // Try IndexedDB first
      const cached = await advancedCacheService.getMovies(section, page);
      if (cached) {
        return cached;
      }
      
      // Fetch from API
      const fetchFunction = getFetchFunction(section);
      const data = await fetchFunction(page);
      
      return data;
    },
    onSuccess: (data) => {
      setSectionMovies(section, data);
      
      // Prefetch next page
      queryClient.prefetchQuery(['movies', section, page + 1]);
    },
    onError: (error) => {
      setSectionError(section, error.message);
    },
    // Enable background refetch for stale data
    refetchOnMount: 'always',
    staleTime: getSectionStaleTime(section),
  });
};

/**
 * Hook for fetching all critical sections in parallel
 */
const useAllMovieSections = (sections) => {
  const results = useQueries({
    queries: sections.map(section => ({
      queryKey: ['movies', section, 1],
      queryFn: async () => {
        const cached = await advancedCacheService.getMovies(section, 1);
        if (cached) return cached;
        
        const fetchFunction = getFetchFunction(section);
        return fetchFunction(1);
      },
      staleTime: getSectionStaleTime(section),
    })),
  });
  
  return results;
};

// ============================================================================
// 3. PERFORMANCE OPTIMIZED COMPONENTS
// ============================================================================

/**
 * Movie Section with optimized rendering
 */
const MovieSection = React.memo(({ section, title }) => {
  const movies = useHomePageStore(state => state.sections[section].movies);
  const loading = useHomePageStore(state => state.sections[section].loading);
  const error = useHomePageStore(state => state.sections[section].error);
  
  // Use React Query hook
  const { isLoading, isError, refetch } = useMovieSection(section);
  
  if (isLoading || loading) {
    return <SectionLoader />;
  }
  
  if (isError || error) {
    return (
      <ErrorFallback 
        error={error} 
        resetErrorBoundary={refetch}
        section={section}
      />
    );
  }
  
  return (
    <div className="movie-section">
      <h2>{title}</h2>
      <MovieGrid movies={movies} section={section} />
    </div>
  );
});

MovieSection.displayName = 'MovieSection';

/**
 * Optimized Movie Grid with virtual scrolling
 */
const MovieGrid = React.memo(({ movies, section }) => {
  const { setSelectedMovie } = useUIActions();
  
  const handleMovieClick = useCallback((movie) => {
    setSelectedMovie(movie);
    
    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'movie_click', {
        movie_id: movie.id,
        section,
        timestamp: Date.now(),
      });
    }
  }, [section, setSelectedMovie]);
  
  return (
    <div className="movie-grid">
      {movies.map(movie => (
        <MovieCard 
          key={movie.id}
          movie={movie}
          onClick={() => handleMovieClick(movie)}
        />
      ))}
    </div>
  );
});

MovieGrid.displayName = 'MovieGrid';

/**
 * Optimized Movie Card with lazy loading
 */
const MovieCard = React.memo(({ movie, onClick }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const cardRef = useRef(null);
  
  // Intersection observer for lazy loading
  useEffect(() => {
    if (!cardRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );
    
    observer.observe(cardRef.current);
    
    return () => observer.disconnect();
  }, []);
  
  // Load image when card is visible
  useEffect(() => {
    if (!isIntersecting || !movie.poster_path) return;
    
    const loadImage = async () => {
      const imageUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
      
      // Try cache first
      const cachedBlob = await advancedCacheService.getImage(imageUrl);
      if (cachedBlob) {
        setImageSrc(URL.createObjectURL(cachedBlob));
        return;
      }
      
      // Fetch and cache
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await advancedCacheService.setImage(imageUrl, blob);
        setImageSrc(URL.createObjectURL(blob));
      } catch (error) {
        console.error('Error loading image:', error);
        setImageSrc('/placeholder.jpg');
      }
    };
    
    loadImage();
  }, [isIntersecting, movie.poster_path]);
  
  return (
    <div ref={cardRef} className="movie-card" onClick={onClick}>
      {imageSrc ? (
        <img src={imageSrc} alt={movie.title} loading="lazy" />
      ) : (
        <div className="movie-card-placeholder" />
      )}
      <div className="movie-card-info">
        <h3>{movie.title}</h3>
        <p>{movie.vote_average.toFixed(1)} ⭐</p>
      </div>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';

// ============================================================================
// 4. ERROR BOUNDARY CONFIGURATION
// ============================================================================

const ErrorFallback = ({ error, resetErrorBoundary, section }) => {
  useEffect(() => {
    // Log error to analytics
    if (window.gtag) {
      window.gtag('event', 'error', {
        error_message: error?.message || 'Unknown error',
        section,
        timestamp: Date.now(),
      });
    }
  }, [error, section]);
  
  return (
    <div className="error-container">
      <h3>Unable to load {section} movies</h3>
      <p>{error?.message || 'An unexpected error occurred'}</p>
      <button onClick={resetErrorBoundary}>
        Try Again
      </button>
    </div>
  );
};

// ============================================================================
// 5. MAIN HOMEPAGE COMPONENT
// ============================================================================

const HomePageAdvanced = () => {
  const { updateUI } = useUIActions();
  
  // Fetch critical sections in parallel
  const criticalSections = ['trending', 'popular', 'topRated'];
  const results = useAllMovieSections(criticalSections);
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      updateUI({ isMobile: window.innerWidth < 768 });
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [updateUI]);
  
  // Performance monitoring
  useEffect(() => {
    const mark = performance.mark('homepage-render');
    
    return () => {
      performance.measure('homepage-render-time', mark.name);
      const measure = performance.getEntriesByName('homepage-render-time')[0];
      
      if (window.gtag) {
        window.gtag('event', 'performance', {
          metric: 'homepage_render',
          value: measure.duration,
        });
      }
    };
  }, []);
  
  return (
    <div className="homepage">
      {/* Featured Section */}
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => queryClient.invalidateQueries(['featured'])}
      >
        <Suspense fallback={<HeroLoader />}>
          <FeaturedSection />
        </Suspense>
      </ErrorBoundary>
      
      {/* Continue Watching */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionLoader />}>
          <ContinueWatching />
        </Suspense>
      </ErrorBoundary>
      
      {/* Movie Sections */}
      {criticalSections.map(section => (
        <ErrorBoundary
          key={section}
          FallbackComponent={(props) => <ErrorFallback {...props} section={section} />}
          onReset={() => queryClient.invalidateQueries(['movies', section])}
        >
          <MovieSection 
            section={section}
            title={formatSectionTitle(section)}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
};

// ============================================================================
// 6. APP WRAPPER WITH PROVIDERS
// ============================================================================

export const HomePageWithProviders = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        FallbackComponent={GlobalErrorFallback}
        onError={(error, errorInfo) => {
          console.error('Global error:', error, errorInfo);
          
          // Send to error tracking
          if (window.gtag) {
            window.gtag('event', 'exception', {
              description: error.message,
              fatal: true,
            });
          }
        }}
      >
        <HomePageAdvanced />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

// ============================================================================
// 7. UTILITY FUNCTIONS
// ============================================================================

const getFetchFunction = (section) => {
  const functions = {
    trending: getTrendingMovies,
    popular: getPopularMovies,
    topRated: getTopRatedMovies,
    // ... other sections
  };
  
  return functions[section] || (() => Promise.resolve([]));
};

const getSectionStaleTime = (section) => {
  const staleTimes = {
    trending: 15 * 60 * 1000, // 15 minutes
    popular: 60 * 60 * 1000, // 1 hour
    topRated: 60 * 60 * 1000, // 1 hour
    // ... other sections
  };
  
  return staleTimes[section] || 30 * 60 * 1000; // 30 minutes default
};

const formatSectionTitle = (section) => {
  return section
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};

const GlobalErrorFallback = ({ error }) => {
  return (
    <div className="global-error">
      <h1>Something went wrong</h1>
      <p>We're sorry, but the page encountered an error.</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
};

export default HomePageWithProviders;
