// Search History Service
// Manages search history with localStorage persistence and advanced features

const SEARCH_HISTORY_KEY = 'streamr_search_history';
const MAX_HISTORY_ITEMS = 20;
const HISTORY_EXPIRY_DAYS = 30;

class SearchHistoryService {
  constructor() {
    this.history = this.loadHistory();
    this.listeners = new Set();
  }

  // Load history from localStorage
  loadHistory() {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!stored) return [];

      const history = JSON.parse(stored);
      
      // Filter out expired entries
      const now = Date.now();
      const validHistory = history.filter(item => {
        const itemDate = new Date(item.timestamp).getTime();
        return (now - itemDate) < (HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      });

      // Save filtered history back to localStorage
      if (validHistory.length !== history.length) {
        this.saveHistory(validHistory);
      }

      return validHistory;
    } catch (error) {
      console.warn('Failed to load search history:', error);
      return [];
    }
  }

  // Save history to localStorage
  saveHistory(history) {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  // Add a new search query to history
  addToHistory(query, type = 'general') {
    if (!query || !query.trim()) return;

    const trimmedQuery = query.trim();
    const now = new Date().toISOString();

    // Remove existing entry if it exists
    this.history = this.history.filter(item => 
      item.query.toLowerCase() !== trimmedQuery.toLowerCase()
    );

    // Add new entry at the beginning
    this.history.unshift({
      query: trimmedQuery,
      type,
      timestamp: now,
      count: 1
    });

    // Limit history size
    if (this.history.length > MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(0, MAX_HISTORY_ITEMS);
    }

    this.saveHistory(this.history);
    this.notifyListeners();
  }

  // Get all history items
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

  // Get recent searches (last 10)
  getRecentSearches(count = 10) {
    return this.history.slice(0, count);
  }

  // Get popular searches (by count)
  getPopularSearches(count = 10) {
    return [...this.history]
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
  }

  // Remove a specific item from history
  removeFromHistory(query) {
    this.history = this.history.filter(item => 
      item.query.toLowerCase() !== query.toLowerCase()
    );
    this.saveHistory(this.history);
    this.notifyListeners();
  }

  // Clear all history
  clearHistory() {
    this.history = [];
    this.saveHistory(this.history);
    this.notifyListeners();
  }

  // Clear history by type
  clearHistoryByType(type) {
    this.history = this.history.filter(item => item.type !== type);
    this.saveHistory(this.history);
    this.notifyListeners();
  }

  // Increment search count for a query
  incrementSearchCount(query) {
    const item = this.history.find(item => 
      item.query.toLowerCase() === query.toLowerCase()
    );
    
    if (item) {
      item.count++;
      item.timestamp = new Date().toISOString();
      this.saveHistory(this.history);
      this.notifyListeners();
    }
  }

  // Search within history
  searchHistory(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.history.filter(item => 
      item.query.toLowerCase().includes(term)
    );
  }

  // Get search suggestions based on history
  getSuggestions(query, maxSuggestions = 5) {
    if (!query || !query.trim()) return [];

    const term = query.toLowerCase();
    const suggestions = this.history
      .filter(item => item.query.toLowerCase().includes(term))
      .sort((a, b) => {
        // Prioritize exact matches
        if (a.query.toLowerCase() === term) return -1;
        if (b.query.toLowerCase() === term) return 1;
        
        // Then by count and recency
        if (a.count !== b.count) return b.count - a.count;
        return new Date(b.timestamp) - new Date(a.timestamp);
      })
      .slice(0, maxSuggestions)
      .map(item => item.query);

    return [...new Set(suggestions)]; // Remove duplicates
  }

  // Get trending searches (based on recent activity)
  getTrendingSearches(count = 5) {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const recentSearches = this.history.filter(item => {
      const itemDate = new Date(item.timestamp).getTime();
      return itemDate > oneWeekAgo;
    });

    // Group by query and sum counts
    const searchCounts = {};
    recentSearches.forEach(item => {
      const query = item.query.toLowerCase();
      searchCounts[query] = (searchCounts[query] || 0) + item.count;
    });

    // Sort by count and return top searches
    return Object.entries(searchCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([query]) => query);
  }

  // Export history data
  exportHistory() {
    return {
      history: this.history,
      exportDate: new Date().toISOString(),
      totalItems: this.history.length
    };
  }

  // Import history data
  importHistory(data) {
    try {
      if (data && Array.isArray(data.history)) {
        this.history = data.history;
        this.saveHistory(this.history);
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
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.history);
      } catch (error) {
        console.warn('Error in search history listener:', error);
      }
    });
  }

  // Get statistics
  getStats() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    return {
      totalSearches: this.history.length,
      searchesToday: this.history.filter(item => 
        new Date(item.timestamp).getTime() > oneDayAgo
      ).length,
      searchesThisWeek: this.history.filter(item => 
        new Date(item.timestamp).getTime() > oneWeekAgo
      ).length,
      searchesThisMonth: this.history.filter(item => 
        new Date(item.timestamp).getTime() > oneMonthAgo
      ).length,
      mostSearched: this.getPopularSearches(1)[0]?.query || null,
      averageSearchesPerDay: this.history.length / 30 // Rough estimate
    };
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    const expiryTime = HISTORY_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    const validHistory = this.history.filter(item => {
      const itemDate = new Date(item.timestamp).getTime();
      return (now - itemDate) < expiryTime;
    });

    if (validHistory.length !== this.history.length) {
      this.history = validHistory;
      this.saveHistory(this.history);
      this.notifyListeners();
    }
  }
}

// Create singleton instance
const searchHistoryService = new SearchHistoryService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    searchHistoryService.cleanup();
  });
}

export default searchHistoryService; 