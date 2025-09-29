// Enhanced & Intelligent Search Service
import { searchMovies } from './tmdbService';

// --- Advanced Search Cache ---
const searchCache = new Map();
const SEARCH_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const SEARCH_CACHE_MAX_SIZE = 200;

// --- Search History (with recency and frequency) ---
const searchHistory = new Map(); // query -> { count, lastUsed }
const MAX_HISTORY_SIZE = 75;

// --- Search Analytics ---
const searchAnalytics = {
  totalSearches: 0,
  cacheHits: 0,
  averageResponseTime: 0,
  popularQueries: new Map(),
  lastSearch: null,
  errorCount: 0
};

// --- Helper: Prune cache if over size ---
function pruneCacheIfNeeded() {
  if (searchCache.size > SEARCH_CACHE_MAX_SIZE) {
    // Remove oldest entries
    const sorted = Array.from(searchCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < sorted.length - SEARCH_CACHE_MAX_SIZE; i++) {
      searchCache.delete(sorted[i][0]);
    }
  }
}

// --- Helper: Prune history if over size ---
function pruneHistoryIfNeeded() {
  if (searchHistory.size > MAX_HISTORY_SIZE) {
    // Remove least recently used
    const sorted = Array.from(searchHistory.entries()).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    for (let i = 0; i < sorted.length - MAX_HISTORY_SIZE; i++) {
      searchHistory.delete(sorted[i][0]);
    }
  }
}

// --- Enhanced Search with typo-tolerance, advanced analytics, and context awareness ---
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
    enableAnalytics = true,
    context = null // e.g. { userId, device, sessionId }
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

  // --- Cache Key includes context for more precise caching ---
  const contextKey = context ? JSON.stringify(context) : '';
  const cacheKey = `search_${normalizedQuery}_${page}_${JSON.stringify({ ...options, context: undefined })}_${contextKey}`;
  if (enableCache && searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
      searchAnalytics.cacheHits++;
      searchAnalytics.lastSearch = { query: normalizedQuery, cached: true, time: Date.now() };
      return cached.data;
    }
  }

  // --- Analytics & History ---
  if (enableAnalytics) {
    searchAnalytics.totalSearches++;
    searchAnalytics.popularQueries.set(
      normalizedQuery,
      (searchAnalytics.popularQueries.get(normalizedQuery) || 0) + 1
    );
    searchAnalytics.lastSearch = { query: normalizedQuery, cached: false, time: Date.now() };
  }

  // --- Add to search history (with recency and frequency) ---
  if (normalizedQuery.length > 2) {
    const now = Date.now();
    if (searchHistory.has(normalizedQuery)) {
      const entry = searchHistory.get(normalizedQuery);
      entry.count += 1;
      entry.lastUsed = now;
      searchHistory.set(normalizedQuery, entry);
    } else {
      searchHistory.set(normalizedQuery, { count: 1, lastUsed: now });
    }
    pruneHistoryIfNeeded();
  }

  try {
    const startTime = performance.now();

    // --- Perform search with enhanced options ---
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

    // --- Update analytics ---
    if (enableAnalytics) {
      searchAnalytics.averageResponseTime =
        (searchAnalytics.averageResponseTime * (searchAnalytics.totalSearches - 1) + responseTime) /
        searchAnalytics.totalSearches;
    }

    // --- Enhanced relevance scoring with typo-tolerance and context awareness ---
    const enhancedResults = (searchResults.results || []).map(item => ({
      ...item,
      relevanceScore: calculateRelevanceScore(item, normalizedQuery, options),
      searchMatch: findSearchMatches(item, normalizedQuery)
    }));

    // --- Sort by relevance or other criteria ---
    if (sortBy === 'relevance') {
      enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else if (sortBy === 'popularity') {
      enhancedResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else if (sortBy === 'release_date') {
      enhancedResults.sort((a, b) => new Date(b.release_date || b.first_air_date || 0) - new Date(a.release_date || a.first_air_date || 0));
    }

    const result = {
      results: enhancedResults.slice(0, limit),
      totalResults: searchResults.total_results || 0,
      totalPages: searchResults.total_pages || 0,
      page: searchResults.page || 1,
      query: normalizedQuery,
      responseTime: responseTime.toFixed(2)
    };

    // --- Cache result ---
    if (enableCache) {
      searchCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      pruneCacheIfNeeded();
    }

    return result;
  } catch (error) {
    searchAnalytics.errorCount++;
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

// --- Calculate relevance score for search results (now with fuzzy/typo tolerance and context) ---
const calculateRelevanceScore = (item, query, options = {}) => {
  let score = 0;
  const queryWords = query.split(' ').filter(word => word.length > 0);

  // Title match (highest weight, typo-tolerant)
  const title = (item.title || item.name || '').toLowerCase();
  queryWords.forEach(word => {
    if (title.includes(word)) {
      score += 12;
      if (title === word) score += 25;
    } else if (levenshteinDistance(title, word) <= 2) {
      score += 6; // typo-tolerant match
    }
  });

  // Overview match
  const overview = (item.overview || '').toLowerCase();
  queryWords.forEach(word => {
    if (overview.includes(word)) {
      score += 3;
    } else if (levenshteinDistance(overview, word) <= 2) {
      score += 1;
    }
  });

  // Genre match (if genre filter is used)
  if (options.genre && item.genre_ids && item.genre_ids.includes(options.genre)) {
    score += 3;
  } else if (item.genre_ids && item.genre_ids.length > 0) {
    score += 1;
  }

  // Popularity bonus
  if (item.popularity) {
    score += Math.min(item.popularity / 80, 7);
  }

  // Rating bonus
  if (item.vote_average && item.vote_average >= 7.5) {
    score += 3;
  } else if (item.vote_average && item.vote_average >= 6.5) {
    score += 1;
  }

  // Recent content bonus
  if (item.release_date || item.first_air_date) {
    const year = new Date(item.release_date || item.first_air_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (year >= currentYear - 1) {
      score += 2;
    } else if (year >= currentYear - 3) {
      score += 1;
    }
  }

  // Contextual bonus (e.g. if searching for TV and item is TV)
  if (options.type && item.media_type === options.type) {
    score += 2;
  }

  return score;
};

// --- Levenshtein Distance for typo-tolerance ---
function levenshteinDistance(a, b) {
  if (!a || !b) return Math.max((a || '').length, (b || '').length);
  const matrix = [];
  let i;
  for (i = 0; i <= b.length; i++) matrix[i] = [i];
  let j;
  for (j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// --- Find specific search matches in content (now with fuzzy context) ---
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
    } else if (levenshteinDistance(title.toLowerCase(), word.toLowerCase()) <= 2) {
      matches.push({
        field: 'title',
        word: word,
        context: title,
        fuzzy: true
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
    } else if (levenshteinDistance(overview.toLowerCase(), word.toLowerCase()) <= 2) {
      matches.push({
        field: 'overview',
        word: word,
        context: overview.slice(0, 100),
        fuzzy: true
      });
    }
  });

  return matches;
};

// --- Get search suggestions based on history, popularity, and typo-tolerance ---
export const getSearchSuggestions = (partialQuery, limit = 10) => {
  const suggestions = [];
  const normalizedQuery = partialQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return suggestions;
  }

  // From search history (recency and frequency)
  Array.from(searchHistory.entries()).forEach(([query, meta]) => {
    if (query.startsWith(normalizedQuery) && query !== normalizedQuery) {
      suggestions.push({
        text: query,
        type: 'history',
        relevance: meta.count + Math.floor((Date.now() - meta.lastUsed) / 1000000)
      });
    } else if (levenshteinDistance(query, normalizedQuery) <= 2 && query !== normalizedQuery) {
      suggestions.push({
        text: query,
        type: 'history-fuzzy',
        relevance: meta.count
      });
    }
  });

  // From popular queries
  const sortedPopular = Array.from(searchAnalytics.popularQueries.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  sortedPopular.forEach(([query, count]) => {
    if (query.startsWith(normalizedQuery) && query !== normalizedQuery) {
      suggestions.push({
        text: query,
        type: 'popular',
        relevance: count
      });
    } else if (levenshteinDistance(query, normalizedQuery) <= 2 && query !== normalizedQuery) {
      suggestions.push({
        text: query,
        type: 'popular-fuzzy',
        relevance: count
      });
    }
  });

  // Deduplicate and sort by relevance
  const seen = new Set();
  return suggestions
    .filter(s => {
      if (seen.has(s.text)) return false;
      seen.add(s.text);
      return true;
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map(s => s.text);
};

// --- Get search analytics (now with error count and last search) ---
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
    averageResponseTime: searchAnalytics.averageResponseTime.toFixed(2) + 'ms',
    errorCount: searchAnalytics.errorCount,
    lastSearch: searchAnalytics.lastSearch
  };
};

// --- Get search history (sorted by recency) ---
export const getSearchHistory = () => {
  return Array.from(searchHistory.entries())
    .sort((a, b) => b[1].lastUsed - a[1].lastUsed)
    .map(([query]) => query);
};

// --- Clear search cache ---
export const clearSearchCache = () => {
  searchCache.clear();
};

// --- Clear search history ---
export const clearSearchHistory = () => {
  searchHistory.clear();
};

// --- Batch search for multiple queries (with error reporting) ---
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

// --- Fuzzy search for better matching (now with deduplication and context) ---
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

// --- Generate similar queries for fuzzy search (now with typo and synonym support) ---
const generateSimilarQueries = (query) => {
  const variations = [];
  const words = query.split(' ').filter(Boolean);

  // Remove last/first word
  if (words.length > 1) {
    variations.push(words.slice(0, -1).join(' '));
    variations.push(words.slice(1).join(' '));
  }

  // Add common movie synonyms
  const movieTerms = ['movie', 'film', 'show', 'series', 'tv'];
  movieTerms.forEach(term => {
    if (!query.includes(term)) {
      variations.push(`${query} ${term}`);
    }
  });

  // Add typo-variation (swap two letters)
  if (query.length > 3) {
    const typo = query.slice(0, 1) + query.slice(2, 3) + query.slice(1, 2) + query.slice(3);
    if (typo !== query) variations.push(typo);
  }

  // Remove duplicates and empty
  return Array.from(new Set(variations.filter(Boolean))).slice(0, 5);
};

// --- Merge search results and remove duplicates (now with fuzzy id fallback) ---
const mergeSearchResults = (searchResults) => {
  const seen = new Set();
  const merged = [];

  searchResults.forEach(result => {
    if (result && result.results) {
      result.results.forEach(item => {
        // Use id or fallback to title+year for deduplication
        const key = item.id || (item.title || item.name) + (item.release_date || item.first_air_date || '');
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      });
    }
  });

  return merged.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
};

// --- Export search utilities ---
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