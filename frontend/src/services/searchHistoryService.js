// Enhanced Search History Service
// Manages search history with localStorage persistence, deduplication, expiry, and advanced analytics

const SEARCH_HISTORY_KEY = 'streamr_search_history';
const MAX_HISTORY_ITEMS = 30; // Increased for more context
const HISTORY_EXPIRY_DAYS = 45; // Longer expiry for better recall

// Utility: Debounce function for batching saves
function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Utility: Normalize query for deduplication
function normalizeQuery(query) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

class SearchHistoryService {
  constructor() {
    this.history = this.loadHistory();
    this.listeners = new Set();
    this.saveHistoryDebounced = debounce(this.saveHistory.bind(this), 150);
    this._lastCleanup = Date.now();
    this._autoCleanupInterval = setInterval(() => this.cleanup(), 1000 * 60 * 10); // every 10 min
  }

  // Load history from localStorage
  loadHistory() {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!stored) return [];
      let history = JSON.parse(stored);

      // Remove duplicates (keep most recent)
      const seen = new Set();
      history = history.filter(item => {
        const norm = normalizeQuery(item.query);
        if (seen.has(norm)) return false;
        seen.add(norm);
        return true;
      });

      // Filter out expired entries
      const now = Date.now();
      const validHistory = history.filter(item => {
        const itemDate = new Date(item.timestamp).getTime();
        return (now - itemDate) < (HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      });

      // Save filtered history back to localStorage if changed
      if (validHistory.length !== history.length) {
        this.saveHistory(validHistory);
      }

      return validHistory;
    } catch (error) {
      console.warn('Failed to load search history:', error);
      return [];
    }
  }

  // Save history to localStorage (debounced for performance)
  saveHistory(history = this.history) {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  // Add a new search query to history (with deduplication and merging)
  addToHistory(query, type = 'general', meta = {}) {
    if (!query || !query.trim()) return;

    const trimmedQuery = query.trim();
    const normQuery = normalizeQuery(trimmedQuery);
    const now = new Date().toISOString();

    // Find existing entry (case-insensitive, normalized)
    const existingIdx = this.history.findIndex(
      item => normalizeQuery(item.query) === normQuery && item.type === type
    );

    if (existingIdx !== -1) {
      // Update count, timestamp, and merge meta
      const item = this.history[existingIdx];
      item.count = (item.count || 1) + 1;
      item.timestamp = now;
      item.meta = { ...item.meta, ...meta };
      // Move to front
      this.history.splice(existingIdx, 1);
      this.history.unshift(item);
    } else {
      // Add new entry at the beginning
      this.history.unshift({
        query: trimmedQuery,
        type,
        timestamp: now,
        count: 1,
        meta: { ...meta }
      });
    }

    // Limit history size
    if (this.history.length > MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(0, MAX_HISTORY_ITEMS);
    }

    this.saveHistoryDebounced(this.history);
    this.notifyListeners();
  }

  // Get all history items (optionally by type)
  getHistory(type = null) {
    if (type) {
      return this.history.filter(item => item.type === type);
    }
    return [...this.history];
  }

  // Get history items by type
  getHistoryByType(type) {
    return this.history.filter(item => item.type === type);
  }

  // Get recent searches (last N, optionally by type)
  getRecentSearches(count = 10, type = null) {
    const filtered = type ? this.getHistoryByType(type) : this.history;
    return filtered.slice(0, count);
  }

  // Get popular searches (by count, optionally by type)
  getPopularSearches(count = 10, type = null) {
    const filtered = type ? this.getHistoryByType(type) : this.history;
    return [...filtered]
      .sort((a, b) => b.count - a.count || new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, count);
  }

  // Remove a specific item from history (by query and optional type)
  removeFromHistory(query, type = null) {
    const normQuery = normalizeQuery(query);
    this.history = this.history.filter(item =>
      normalizeQuery(item.query) !== normQuery ||
      (type && item.type !== type)
    );
    this.saveHistoryDebounced(this.history);
    this.notifyListeners();
  }

  // Clear all history (or by type)
  clearHistory(type = null) {
    if (type) {
      this.history = this.history.filter(item => item.type !== type);
    } else {
      this.history = [];
    }
    this.saveHistoryDebounced(this.history);
    this.notifyListeners();
  }

  // Increment search count for a query (optionally by type)
  incrementSearchCount(query, type = null) {
    const normQuery = normalizeQuery(query);
    const item = this.history.find(item =>
      normalizeQuery(item.query) === normQuery &&
      (type ? item.type === type : true)
    );
    if (item) {
      item.count = (item.count || 1) + 1;
      item.timestamp = new Date().toISOString();
      this.saveHistoryDebounced(this.history);
      this.notifyListeners();
    }
  }

  // Search within history (case-insensitive, partial match, optionally by type)
  searchHistory(searchTerm, type = null) {
    const term = normalizeQuery(searchTerm);
    return this.history.filter(item =>
      normalizeQuery(item.query).includes(term) &&
      (type ? item.type === type : true)
    );
  }

  // Get search suggestions based on history (prioritize exact, then partial, then by count/recency)
  getSuggestions(query, maxSuggestions = 5, type = null) {
    if (!query || !query.trim()) return [];
    const term = normalizeQuery(query);

    const filtered = this.history.filter(item =>
      normalizeQuery(item.query).includes(term) &&
      (type ? item.type === type : true)
    );

    const suggestions = filtered
      .sort((a, b) => {
        // Prioritize exact matches
        if (normalizeQuery(a.query) === term) return -1;
        if (normalizeQuery(b.query) === term) return 1;
        // Then by count and recency
        if (a.count !== b.count) return b.count - a.count;
        return new Date(b.timestamp) - new Date(a.timestamp);
      })
      .slice(0, maxSuggestions)
      .map(item => item.query);

    return [...new Set(suggestions)]; // Remove duplicates
  }

  // Get trending searches (recent, by count, optionally by type)
  getTrendingSearches(count = 5, type = null) {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const recentSearches = this.history.filter(item => {
      const itemDate = new Date(item.timestamp).getTime();
      return itemDate > oneWeekAgo && (type ? item.type === type : true);
    });

    // Group by normalized query and sum counts
    const searchCounts = {};
    recentSearches.forEach(item => {
      const query = normalizeQuery(item.query);
      searchCounts[query] = (searchCounts[query] || 0) + (item.count || 1);
    });

    // Sort by count and return top searches
    return Object.entries(searchCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([query]) => query);
  }

  // Export history data (with versioning)
  exportHistory() {
    return {
      version: 2,
      history: this.history,
      exportDate: new Date().toISOString(),
      totalItems: this.history.length
    };
  }

  // Import history data (merges with existing, deduplicates)
  importHistory(data) {
    try {
      if (data && Array.isArray(data.history)) {
        // Merge and deduplicate
        const combined = [...data.history, ...this.history];
        const seen = new Map();
        for (const item of combined) {
          const key = normalizeQuery(item.query) + '|' + (item.type || 'general');
          if (!seen.has(key)) {
            seen.set(key, { ...item, count: item.count || 1 });
          } else {
            // Merge counts and keep most recent timestamp
            const existing = seen.get(key);
            existing.count += item.count || 1;
            if (new Date(item.timestamp) > new Date(existing.timestamp)) {
              existing.timestamp = item.timestamp;
              existing.meta = { ...existing.meta, ...item.meta };
            }
            seen.set(key, existing);
          }
        }
        this.history = Array.from(seen.values())
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, MAX_HISTORY_ITEMS);
        this.saveHistoryDebounced(this.history);
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to import search history:', error);
      return false;
    }
  }

  // Subscribe to history changes
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately call with current history
    callback([...this.history]);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners (with a copy)
  notifyListeners() {
    for (const callback of this.listeners) {
      try {
        callback([...this.history]);
      } catch (error) {
        console.warn('Error in search history listener:', error);
      }
    }
  }

  // Get statistics (enhanced)
  getStats() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    const searchesToday = this.history.filter(item =>
      new Date(item.timestamp).getTime() > oneDayAgo
    );
    const searchesThisWeek = this.history.filter(item =>
      new Date(item.timestamp).getTime() > oneWeekAgo
    );
    const searchesThisMonth = this.history.filter(item =>
      new Date(item.timestamp).getTime() > oneMonthAgo
    );

    // Most searched (by count)
    const mostSearched = this.getPopularSearches(1)[0]?.query || null;

    // Unique queries
    const uniqueQueries = new Set(this.history.map(item => normalizeQuery(item.query)));

    // Average searches per day (over last 30 days)
    const days = Math.max(
      1,
      (this.history.length > 0
        ? (now - new Date(this.history[this.history.length - 1].timestamp).getTime()) / (24 * 60 * 60 * 1000)
        : 1)
    );
    const avgPerDay = this.history.length / days;

    return {
      totalSearches: this.history.length,
      uniqueQueries: uniqueQueries.size,
      searchesToday: searchesToday.length,
      searchesThisWeek: searchesThisWeek.length,
      searchesThisMonth: searchesThisMonth.length,
      mostSearched,
      averageSearchesPerDay: Number(avgPerDay.toFixed(2))
    };
  }

  // Clean up expired entries (runs automatically every 10 min)
  cleanup() {
    const now = Date.now();
    const expiryTime = HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    const validHistory = this.history.filter(item => {
      const itemDate = new Date(item.timestamp).getTime();
      return (now - itemDate) < expiryTime;
    });

    if (validHistory.length !== this.history.length) {
      this.history = validHistory;
      this.saveHistoryDebounced(this.history);
      this.notifyListeners();
    }
    this._lastCleanup = now;
  }

  // For testing/debug: force clear interval
  _destroy() {
    clearInterval(this._autoCleanupInterval);
  }
}

// Create singleton instance
const searchHistoryService = new SearchHistoryService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    searchHistoryService.cleanup();
    searchHistoryService._destroy && searchHistoryService._destroy();
  });
}

export default searchHistoryService;