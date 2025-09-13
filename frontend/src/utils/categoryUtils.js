/**
 * Category Utilities for Movies and Series Pages
 * Centralized functions for handling category changes, API calls, and data transformation
 */

// Helper function to check if category is a streaming service
export const isStreamingService = (category) => {
  return ['netflix', 'prime', 'hbo', 'hulu', 'disney', 'apple'].includes(category);
};

// Update URL with category for better navigation
export const updateURLWithCategory = (category, selectedGenre = null, selectedYear = null) => {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('category', category);
    
    // Preserve existing filters
    if (selectedGenre) {
      searchParams.set('genre', selectedGenre.name?.toLowerCase() || selectedGenre.toLowerCase());
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

// Enhanced Prime Video fetching with multiple network IDs
export const fetchPrimeContent = async (fetchFunction, pageNum, isSeries = false) => {
  const primeNetworkIds = isSeries ? [1024, 9, 119, 10, 8] : [9, 119, 10, 8];
  
  for (const networkId of primeNetworkIds) {
    try {
      const response = await fetchFunction(networkId, pageNum);
      if (response.results && response.results.length > 0) {
        return response;
      }
    } catch (error) {
      console.warn(`Failed to fetch Prime Video content with network ID ${networkId}:`, error.message);
    }
  }
  
  return null;
};

// Enhanced HBO fetching with multiple network IDs
export const fetchHBOContent = async (fetchFunction, pageNum, isSeries = false) => {
  const hboNetworkIds = isSeries ? [49, 118, 384, 50, 119, 8, 213, 2] : [118, 384, 49, 50, 119, 8, 213, 2];
  
  for (const networkId of hboNetworkIds) {
    try {
      const response = await fetchFunction(networkId, pageNum);
      if (response.results && response.results.length > 0) {
        return response;
      }
    } catch (error) {
      console.warn(`Failed to fetch HBO content with network ID ${networkId}:`, error.message);
    }
  }
  
  return null;
};

// Enhanced Hulu fetching with multiple network IDs
export const fetchHuluContent = async (fetchFunction, pageNum, isSeries = false) => {
  const huluNetworkIds = [453, 15, 122];
  
  for (const networkId of huluNetworkIds) {
    try {
      const response = await fetchFunction(networkId, pageNum);
      if (response.results && response.results.length > 0) {
        return response;
      }
    } catch (error) {
      console.warn(`Failed to fetch Hulu content with network ID ${networkId}:`, error.message);
    }
  }
  
  return null;
};

// Normalize API response format
export const normalizeResponse = (response, pageNum) => {
  let data = [];
  let totalPages = 1;
  let hasMore = false;

  if (response) {
    if (response.movies && Array.isArray(response.movies)) {
      data = response.movies;
      totalPages = response.totalPages || 1;
      hasMore = pageNum < totalPages;
    } else if (response.results && Array.isArray(response.results)) {
      data = response.results;
      totalPages = response.totalPages || 1;
      hasMore = pageNum < totalPages;
    } else if (Array.isArray(response)) {
      data = response;
    }
  }

  return {
    data,
    totalPages,
    hasMore
  };
};

// Create standardized response object
export const createStandardResponse = (success, data = [], error = null, options = {}) => {
  return {
    success,
    data,
    error,
    totalPages: options.totalPages || 1,
    hasMore: options.hasMore || false,
    currentPage: options.currentPage || 1,
    fallback: options.fallback || false
  };
};

// Enhanced error handling with fallback
export const handleFetchError = async (error, category, fallbackFunction, pageNum) => {
  console.error(`Failed to fetch content for category ${category}:`, error);
  
  // Try fallback if it's a streaming service
  if (isStreamingService(category) && fallbackFunction) {
    try {
      console.log(`Trying fallback for ${category}`);
      const fallbackResponse = await fallbackFunction(pageNum);
      if (fallbackResponse && (fallbackResponse.movies || fallbackResponse.results)) {
        const normalized = normalizeResponse(fallbackResponse, pageNum);
        return createStandardResponse(true, normalized.data, null, {
          totalPages: normalized.totalPages,
          hasMore: normalized.hasMore,
          currentPage: pageNum,
          fallback: true
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
  }
  
  return createStandardResponse(false, [], error.message || 'Failed to fetch content');
};

// Category transition state management
export const createCategoryTransitionState = () => {
  return {
    isTransitioning: false,
    startTransition: () => ({ isTransitioning: true }),
    endTransition: () => ({ isTransitioning: false }),
    resetState: () => ({
      isTransitioning: false,
      data: [],
      loading: true,
      error: null,
      page: 1,
      hasMore: true
    })
  };
};

// Enhanced category change handler
export const createCategoryChangeHandler = (options) => {
  const {
    setActiveCategory,
    setData,
    setLoading,
    setError,
    setPage,
    setHasMore,
    fetchFunction,
    fallbackFunction,
    updateURL = true,
    selectedGenre = null,
    selectedYear = null
  } = options;

  return async (category, isTransitioning = false) => {
    // Prevent multiple rapid clicks
    if (isTransitioning) return;
    
    try {
      // Reset states
      setActiveCategory(category);
      setData([]);
      setLoading(true);
      setError(null);
      setPage(1);
      setHasMore(true);
      
      // Fetch data
      const response = await fetchFunction(category, 1);
      
      if (response.success) {
        setData(response.data || []);
        setHasMore(response.hasMore || false);
        setPage(1);
        
        // Update URL if requested
        if (updateURL) {
          updateURLWithCategory(category, selectedGenre, selectedYear);
        }
      } else {
        setError(response.error || 'Failed to load content');
        setData([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Category change error:', error);
      setError('Failed to load content: ' + (error.message || 'Unknown error'));
      setData([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };
};

// Performance optimization: Debounced category change
export const createDebouncedCategoryChange = (handler, delay = 300) => {
  let timeoutId = null;
  
  return (category, ...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      handler(category, ...args);
      timeoutId = null;
    }, delay);
  };
};

// Memory optimization: Cleanup function for category handlers
export const createCleanupFunction = (timeouts = [], refs = []) => {
  return () => {
    // Clear all timeouts
    timeouts.forEach(timeout => {
      if (timeout && typeof timeout === 'function') {
        clearTimeout(timeout);
      }
    });
    
    // Clear all refs
    refs.forEach(ref => {
      if (ref && ref.current) {
        ref.current = null;
      }
    });
  };
}; 