// Optimized Enhanced Search Service
import { searchMovies } from './tmdbService';

// Search cache for better performance
const searchCache = new Map();
const SEARCH_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Search history for better UX
const searchHistory = new Set();
const MAX_HISTORY_SIZE = 50;

// Search analytics
const searchAnalytics = {
  totalSearches: 0,
  cacheHits: 0,
  averageResponseTime: 0,
  popularQueries: new Map()
};

// Optimized search with intelligent caching and relevance scoring
export const enhancedSearch = async (query, options = {}) => {
  const {
    page = 1,
    includeAdult = false,
    language = 'en-US',
    region = 'US',
    year = null,
    genre = null,
    sortBy = 'relevance',
    limit = 20,
    enableCache = true,
    enableAnalytics = true
  } = options;

  // Normalize query
  const normalizedQuery = query.trim().toLowerCase();
  
  if (!normalizedQuery) {
    return {
      results: [],
      totalResults: 0,
      totalPages: 0,
      page: 1,
      query: normalizedQuery
    };
  }

  // Check cache first
  const cacheKey = `search_${normalizedQuery}_${page}_${JSON.stringify(options)}`;
  if (enableCache && searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
      searchAnalytics.cacheHits++;
      return cached.data;
    }
  }

  // Record search analytics
  if (enableAnalytics) {
    searchAnalytics.totalSearches++;
    searchAnalytics.popularQueries.set(
      normalizedQuery, 
      (searchAnalytics.popularQueries.get(normalizedQuery) || 0) + 1
    );
  }

  // Add to search history
  if (normalizedQuery.length > 2) {
    searchHistory.add(normalizedQuery);
    if (searchHistory.size > MAX_HISTORY_SIZE) {
      const firstItem = searchHistory.values().next().value;
      searchHistory.delete(firstItem);
    }
  }

  try {
    const startTime = performance.now();
    
    // Perform search with enhanced options
    const searchResults = await searchMovies(normalizedQuery, page, {
      includeAdult,
      language,
      region,
      year,
      genre,
      sortBy,
      limit
    });

    const responseTime = performance.now() - startTime;
    
    // Update analytics
    if (enableAnalytics) {
      searchAnalytics.averageResponseTime = 
        (searchAnalytics.averageResponseTime * (searchAnalytics.totalSearches - 1) + responseTime) / 
        searchAnalytics.totalSearches;
    }

    // Enhanced relevance scoring
    const enhancedResults = searchResults.results.map(item => ({
      ...item,
      relevanceScore: calculateRelevanceScore(item, normalizedQuery),
      searchMatch: findSearchMatches(item, normalizedQuery)
    }));

    // Sort by relevance if requested
    if (sortBy === 'relevance') {
      enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    const result = {
      results: enhancedResults.slice(0, limit),
      totalResults: searchResults.total_results || 0,
      totalPages: searchResults.total_pages || 0,
      page: searchResults.page || 1,
      query: normalizedQuery,
      responseTime: responseTime.toFixed(2)
    };

    // Cache result
    if (enableCache) {
      searchCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result;
  } catch (error) {
    console.error('Search failed:', error);
    return {
      results: [],
      totalResults: 0,
      totalPages: 0,
      page: 1,
      query: normalizedQuery,
      error: error.message
    };
  }
};

// Calculate relevance score for search results
const calculateRelevanceScore = (item, query) => {
  let score = 0;
  const queryWords = query.split(' ').filter(word => word.length > 0);
  
  // Title match (highest weight)
  const title = (item.title || item.name || '').toLowerCase();
  queryWords.forEach(word => {
    if (title.includes(word)) {
      score += 10;
      // Exact title match gets bonus
      if (title === word) score += 20;
    }
  });

  // Overview match
  const overview = (item.overview || '').toLowerCase();
  queryWords.forEach(word => {
    if (overview.includes(word)) {
      score += 2;
    }
  });

  // Genre match
  if (item.genre_ids && item.genre_ids.length > 0) {
    // This would need genre mapping for better scoring
    score += 1;
  }

  // Popularity bonus
  if (item.popularity) {
    score += Math.min(item.popularity / 100, 5);
  }

  // Rating bonus
  if (item.vote_average && item.vote_average >= 7.0) {
    score += 2;
  }

  // Recent content bonus
  if (item.release_date || item.first_air_date) {
    const year = new Date(item.release_date || item.first_air_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (year >= currentYear - 2) {
      score += 1;
    }
  }

  return score;
};

// Find specific search matches in content
const findSearchMatches = (item, query) => {
  const matches = [];
  const queryWords = query.split(' ').filter(word => word.length > 0);
  
  const title = item.title || item.name || '';
  const overview = item.overview || '';
  
  queryWords.forEach(word => {
    if (title.toLowerCase().includes(word.toLowerCase())) {
      matches.push({
        field: 'title',
        word: word,
        context: title
      });
    }
    
    if (overview.toLowerCase().includes(word.toLowerCase())) {
      const index = overview.toLowerCase().indexOf(word.toLowerCase());
      const context = overview.substring(Math.max(0, index - 50), index + 50);
      matches.push({
        field: 'overview',
        word: word,
        context: context
      });
    }
  });
  
  return matches;
};

// Get search suggestions based on history and popularity
export const getSearchSuggestions = (partialQuery, limit = 10) => {
  const suggestions = [];
  const normalizedQuery = partialQuery.trim().toLowerCase();
  
  if (!normalizedQuery) {
    return suggestions;
  }

  // Add from search history
  searchHistory.forEach(query => {
    if (query.startsWith(normalizedQuery) && query !== normalizedQuery) {
      suggestions.push({
        text: query,
        type: 'history',
        relevance: 1
      });
    }
  });

  // Add from popular queries
  const sortedPopular = Array.from(searchAnalytics.popularQueries.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  sortedPopular.forEach(([query, count]) => {
    if (query.startsWith(normalizedQuery) && query !== normalizedQuery) {
      suggestions.push({
        text: query,
        type: 'popular',
        relevance: count
      });
    }
  });

  // Sort by relevance and limit
  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map(s => s.text);
};

// Get search analytics
export const getSearchAnalytics = () => {
  return {
    ...searchAnalytics,
    popularQueries: Array.from(searchAnalytics.popularQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count })),
    cacheHitRate: searchAnalytics.totalSearches > 0 
      ? (searchAnalytics.cacheHits / searchAnalytics.totalSearches * 100).toFixed(2) + '%'
      : '0%',
    averageResponseTime: searchAnalytics.averageResponseTime.toFixed(2) + 'ms'
  };
};

// Get search history
export const getSearchHistory = () => {
  return Array.from(searchHistory).reverse();
};

// Clear search cache
export const clearSearchCache = () => {
  searchCache.clear();
};

// Clear search history
export const clearSearchHistory = () => {
  searchHistory.clear();
};

// Batch search for multiple queries
export const batchSearch = async (queries, options = {}) => {
  const results = await Promise.allSettled(
    queries.map(query => enhancedSearch(query, options))
  );
  
  return results.map((result, index) => ({
    query: queries[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
};

// Fuzzy search for better matching
export const fuzzySearch = async (query, options = {}) => {
  const results = await enhancedSearch(query, options);
  
  // Add fuzzy matching for similar queries
  const similarQueries = generateSimilarQueries(query);
  const fuzzyResults = await Promise.allSettled(
    similarQueries.map(similarQuery => enhancedSearch(similarQuery, { ...options, limit: 5 }))
  );
  
  // Merge and deduplicate results
  const allResults = [results, ...fuzzyResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
  ];
  
  const mergedResults = mergeSearchResults(allResults);
  
  return {
    ...results,
    results: mergedResults,
    fuzzyQueries: similarQueries
  };
};

// Generate similar queries for fuzzy search
const generateSimilarQueries = (query) => {
  const variations = [];
  const words = query.split(' ');
  
  // Add common variations
  if (words.length > 1) {
    variations.push(words.slice(0, -1).join(' ')); // Remove last word
    variations.push(words.slice(1).join(' ')); // Remove first word
  }
  
  // Add common movie terms
  const movieTerms = ['movie', 'film', 'show', 'series', 'tv'];
  movieTerms.forEach(term => {
    if (!query.includes(term)) {
      variations.push(`${query} ${term}`);
    }
  });
  
  return variations.slice(0, 3); // Limit to 3 variations
};

// Merge search results and remove duplicates
const mergeSearchResults = (searchResults) => {
  const seen = new Set();
  const merged = [];
  
  searchResults.forEach(result => {
    if (result.results) {
      result.results.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      });
    }
  });
  
  return merged.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

// Export search utilities
export const searchUtils = {
  enhancedSearch,
  getSearchSuggestions,
  getSearchAnalytics,
  getSearchHistory,
  clearSearchCache,
  clearSearchHistory,
  batchSearch,
  fuzzySearch
}; 