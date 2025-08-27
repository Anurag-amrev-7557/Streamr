// Service Worker for Streamr - Enhanced caching and offline support
// Bump SW_VERSION to invalidate old caches after deployments
const SW_VERSION = 'v3';
const STATIC_CACHE = `streamr-static-${SW_VERSION}`;
const API_CACHE = `streamr-api-${SW_VERSION}`;
const IMAGE_CACHE = `streamr-images-${SW_VERSION}`;
const PREDICTIVE_CACHE = `streamr-predictive-${SW_VERSION}`;

// Store TMDB API key received from main app
let TMDB_API_KEY = null;

// Cache strategies
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  API: 'network-first',
  IMAGES: 'cache-first',
  PREDICTIVE: 'stale-while-revalidate',
  FALLBACK: 'network-only'
};

// User behavior tracking for predictive prefetching
const USER_BEHAVIOR = {
  viewedMovies: new Set(),
  searchHistory: [],
  genrePreferences: new Map(),
  watchTime: new Map(),
  lastActivity: Date.now()
};

// Predictive prefetching patterns
const PREDICTIVE_PATTERNS = {
  SIMILAR_MOVIES: 'similar',
  GENRE_EXPLORATION: 'genre',
  ACTOR_FILMOGRAPHY: 'actor',
  DIRECTOR_WORKS: 'director',
  SEASONAL_TRENDS: 'seasonal'
};

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      caches.open(PREDICTIVE_CACHE).then(cache => {
        console.log('Predictive cache initialized');
        return cache;
      })
    ])
    .then(() => {
      console.log('Service Worker installed');
      return self.skipWaiting();
    })
    .catch(error => {
      console.error('Service Worker install failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE &&
                cacheName !== PREDICTIVE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle different types of requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/') || url.hostname === 'api.themoviedb.org') {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.hostname === 'image.tmdb.org') {
    // Image requests - cache first
    event.respondWith(handleImageRequest(request));
  } else if (url.origin === self.location.origin) {
    // Static files - cache first
    event.respondWith(handleStaticRequest(request));
  } else {
    // Other requests - network only
    event.respondWith(fetch(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return new Response(
      JSON.stringify({ 
        error: 'No internet connection',
        message: 'Please check your connection and try again'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Image fetch failed:', request.url);
    
    // Return placeholder image or error
    return new Response(
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMzc1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+',
      {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

// Handle static file requests
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const url = new URL(request.url);

  // For HTML documents (shell), always prefer fresh network to avoid stale app
  if (request.destination === 'document' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    try {
      const fresh = await fetch(request, { cache: 'no-store' });
      if (fresh && fresh.ok) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const fallback = await cache.match(request) || await cache.match('/offline.html');
      if (fallback) return fallback;
      throw err;
    }
  }

  // For other static assets, use cache-first (hashed filenames are safe)
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Static file fetch failed:', request.url);
    throw error;
  }
}

// 🎯 INTELLIGENT PREDICTIVE PREFETCHING
async function handlePredictivePrefetching(movieId, type = 'movie') {
  const cache = await caches.open(PREDICTIVE_CACHE);
  
  try {
    // Update user behavior tracking
    USER_BEHAVIOR.viewedMovies.add(movieId);
    USER_BEHAVIOR.lastActivity = Date.now();
    
    // Predict what user might want next
    const predictions = await generatePredictions(movieId, type);
    
    // Prefetch predicted content in background
    for (const prediction of predictions) {
      const cacheKey = `predictive_${prediction.type}_${prediction.id}`;
      const existing = await cache.match(cacheKey);
      
      if (!existing) {
        // Fetch and cache predicted content
        try {
          const response = await fetch(prediction.url);
          if (response.ok) {
            const responseClone = response.clone();
            cache.put(cacheKey, responseClone);
            console.log(`Predictive prefetch: ${prediction.type} ${prediction.id}`);
          }
        } catch (error) {
          console.log(`Predictive prefetch failed: ${prediction.type} ${prediction.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Predictive prefetching failed:', error);
  }
}

// Generate intelligent predictions based on user behavior
async function generatePredictions(movieId, type) {
  const predictions = [];
  
  try {
    // If we have the TMDB API key, we can make live API calls
    if (TMDB_API_KEY && TMDB_API_KEY !== 'undefined' && TMDB_API_KEY !== 'null') {
      // 1. Similar movies (highest priority)
      predictions.push({
        type: 'similar',
        id: movieId,
        url: `https://api.themoviedb.org/3/${type}/${movieId}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`,
        live: true
      });
      
      // 2. Recommendations
      predictions.push({
        type: 'recommendations',
        id: movieId,
        url: `https://api.themoviedb.org/3/${type}/${movieId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`,
        live: true
      });
      
      // 3. Genre exploration (if user shows genre preference)
      if (USER_BEHAVIOR.genrePreferences.size > 0) {
        const topGenre = Array.from(USER_BEHAVIOR.genrePreferences.entries())
          .sort((a, b) => b[1] - a[1])[0];
        
        if (topGenre) {
          predictions.push({
            type: 'genre',
            id: topGenre[0],
            url: `https://api.themoviedb.org/3/discover/${type}?api_key=${TMDB_API_KEY}&with_genres=${topGenre[0]}&sort_by=popularity.desc&page=1`,
            live: true
          });
        }
      }
      
      // 4. Seasonal trends (Christmas movies in December, etc.)
      const month = new Date().getMonth();
      const seasonalGenres = {
        11: 10751, // December - Family
        0: 10751,  // January - Family
        6: 28,     // July - Action
        10: 27     // November - Horror
      };
      
      if (seasonalGenres[month]) {
        predictions.push({
          type: 'seasonal',
          id: seasonalGenres[month],
          url: `https://api.themoviedb.org/3/discover/${type}?api_key=${TMDB_API_KEY}&with_genres=${seasonalGenres[month]}&sort_by=popularity.desc&page=1`,
          live: true
        });
      }
    } else {
      // Fallback to cached data when API key is not available
      console.log('TMDB API key not available, using cached predictions');
      
      // 1. Check if we have cached similar content
      const cache = await caches.open(PREDICTIVE_CACHE);
      const similarKey = `/predictive/similar/${type}/${movieId}`;
      const similarResponse = await cache.match(similarKey);
      
      if (similarResponse) {
        predictions.push({
          type: 'similar',
          id: movieId,
          url: similarKey,
          cached: true
        });
      }
      
      // 2. Check for genre-based predictions from user behavior
      if (USER_BEHAVIOR.genrePreferences.size > 0) {
        const topGenre = Array.from(USER_BEHAVIOR.genrePreferences.entries())
          .sort((a, b) => b[1] - a[1])[0];
        
        if (topGenre) {
          const genreKey = `/predictive/genre/${topGenre[0]}`;
          const genreResponse = await cache.match(genreKey);
          
          if (genreResponse) {
            predictions.push({
              type: 'genre',
              id: topGenre[0],
              url: genreKey,
              cached: true
            });
          }
        }
      }
      
      // 3. Seasonal trends (Christmas movies in December, etc.)
      const month = new Date().getMonth();
      const seasonalGenres = {
        11: 10751, // December - Family
        0: 10751,  // January - Family
        6: 28,     // July - Action
        10: 27     // November - Horror
      };
      
      if (seasonalGenres[month]) {
        const seasonalKey = `/predictive/seasonal/${seasonalGenres[month]}`;
        const seasonalResponse = await cache.match(seasonalKey);
        
        if (seasonalResponse) {
          predictions.push({
            type: 'seasonal',
            id: seasonalGenres[month],
            url: seasonalKey,
            cached: true
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Prediction generation failed:', error);
  }
  
  return predictions;
}

// Update user behavior when movie details are fetched
async function updateUserBehavior(movieId, movieData) {
  try {
    // Track genre preferences
    if (movieData.genres) {
      movieData.genres.forEach(genre => {
        const current = USER_BEHAVIOR.genrePreferences.get(genre.id) || 0;
        USER_BEHAVIOR.genrePreferences.set(genre.id, current + 1);
      });
    }
    
    // Track watch time patterns
    const hour = new Date().getHours();
    const current = USER_BEHAVIOR.watchTime.get(hour) || 0;
    USER_BEHAVIOR.watchTime.set(hour, current + 1);
    
    // Limit history size to prevent memory issues
    if (USER_BEHAVIOR.searchHistory.length > 50) {
      USER_BEHAVIOR.searchHistory = USER_BEHAVIOR.searchHistory.slice(-25);
    }
    
    if (USER_BEHAVIOR.viewedMovies.size > 100) {
      const array = Array.from(USER_BEHAVIOR.viewedMovies);
      USER_BEHAVIOR.viewedMovies = new Set(array.slice(-50));
    }
    
  } catch (error) {
    console.error('User behavior update failed:', error);
  }
}

// 🔄 ENHANCED BACKGROUND SYNC
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(doBackgroundSync());
      break;
      
    case 'watchlist-sync':
      event.waitUntil(syncWatchlist());
      break;
      
    case 'predictive-prefetch':
      event.waitUntil(doPredictivePrefetch());
      break;
      
    case 'cache-cleanup':
      event.waitUntil(doCacheCleanup());
      break;
      
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

// Enhanced background sync with multiple strategies
async function doBackgroundSync() {
  try {
    // 1. Sync API cache
    const apiCache = await caches.open(API_CACHE);
    const apiRequests = await apiCache.keys();
    
    for (const request of apiRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await apiCache.put(request, response);
        }
      } catch (error) {
        console.log('API sync failed for:', request.url);
      }
    }
    
    // 2. Sync predictive cache
    const predictiveCache = await caches.open(PREDICTIVE_CACHE);
    const predictiveRequests = await predictiveCache.keys();
    
    for (const request of predictiveRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await predictiveCache.put(request, response);
        }
      } catch (error) {
        console.log('Predictive sync failed for:', request.url);
      }
    }
    
    // 3. Sync user preferences
    await syncUserPreferences();
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync watchlist changes
async function syncWatchlist() {
  try {
    const db = await openDB('streamr-watchlist', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending')) {
          db.createObjectStore('pending', { keyPath: 'id' });
        }
      }
    });
    
    const transaction = db.transaction(['pending'], 'readwrite');
    const store = transaction.objectStore('pending');
    const pending = await store.getAll();
    
    for (const item of pending) {
      try {
        // Sync with backend
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieId: item.id, action: item.action })
        });
        
        if (response.ok) {
          // Remove from pending
          await store.delete(item.id);
        }
      } catch (error) {
        console.log('Watchlist sync failed for:', item.id);
      }
    }
    
  } catch (error) {
    console.error('Watchlist sync failed:', error);
  }
}

// Predictive prefetch in background
async function doPredictivePrefetch() {
  try {
    // Get user's most viewed movies
    const recentMovies = Array.from(USER_BEHAVIOR.viewedMovies).slice(-5);
    
    for (const movieId of recentMovies) {
      await handlePredictivePrefetching(movieId, 'movie');
    }
    
  } catch (error) {
    console.error('Predictive prefetch failed:', error);
  }
}

// Intelligent cache cleanup
async function doCacheCleanup() {
  try {
    const cacheNames = await caches.keys();
    const now = Date.now();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const date = response.headers.get('date');
          if (date) {
            const age = now - new Date(date).getTime();
            const maxAge = getMaxAgeForCache(cacheName);
            
            if (age > maxAge) {
              await cache.delete(request);
              console.log('Cleaned up old cache entry:', request.url);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}

// Get max age for different cache types
function getMaxAgeForCache(cacheName) {
  const maxAges = {
    [STATIC_CACHE]: 7 * 24 * 60 * 60 * 1000, // 7 days
    [API_CACHE]: 24 * 60 * 60 * 1000, // 24 hours
    [IMAGE_CACHE]: 30 * 24 * 60 * 60 * 1000, // 30 days
    [PREDICTIVE_CACHE]: 12 * 60 * 60 * 1000 // 12 hours
  };
  
  return maxAges[cacheName] || 24 * 60 * 60 * 1000;
}

// Sync user preferences
async function syncUserPreferences() {
  try {
    const preferences = {
      genrePreferences: Object.fromEntries(USER_BEHAVIOR.genrePreferences),
      watchTime: Object.fromEntries(USER_BEHAVIOR.watchTime),
      lastActivity: USER_BEHAVIOR.lastActivity
    };
    
    // Store in IndexedDB for offline access
    const db = await openDB('streamr-preferences', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }
      }
    });
    
    await db.put('preferences', {
      id: 'user-preferences',
      data: preferences,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Preferences sync failed:', error);
  }
}

// 🚀 ADVANCED PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    // Enhanced notification options with rich media
    const options = {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      image: data.image || null,
      data: data.data,
      actions: data.actions || [
        {
          action: 'watch',
          title: 'Watch Now',
          icon: '/icon.svg'
        },
        {
          action: 'add',
          title: 'Add to Watchlist',
          icon: '/icon.svg'
        }
      ],
      requireInteraction: data.requireInteraction || false,
      tag: data.tag || 'streamr-notification',
      renotify: data.renotify || true,
      silent: data.silent || false,
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: data.timestamp || Date.now()
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  switch (action) {
    case 'watch':
      // Open movie/show details page
      event.waitUntil(
        clients.openWindow(`/movie/${data.movieId}`)
      );
      break;
      
    case 'add':
      // Add to watchlist via background sync
      event.waitUntil(
        addToWatchlist(data.movieId)
      );
      break;
      
    default:
      // Default action - open app
      event.waitUntil(
        clients.openWindow('/')
      );
      break;
  }
});

// Add to watchlist via background sync
async function addToWatchlist(movieId) {
  try {
    // Store in IndexedDB for offline sync
    const db = await openDB('streamr-watchlist', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending')) {
          db.createObjectStore('pending', { keyPath: 'id' });
        }
      }
    });
    
    await db.add('pending', {
      id: movieId,
      timestamp: Date.now(),
      action: 'add'
    });
    
    // Trigger background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('watchlist-sync');
    }
    
  } catch (error) {
    console.error('Failed to add to watchlist:', error);
  }
}

// IndexedDB helper
function openDB(name, version, upgradeCallback) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => upgradeCallback(request.result);
  });
}

// 📊 PERFORMANCE MONITORING & ANALYTICS
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_CLEAR':
      event.waitUntil(clearCaches());
      break;
      
    case 'CACHE_STATUS':
      event.waitUntil(getCacheStatus(event.ports[0]));
      break;
      
    case 'TRACK_PERFORMANCE':
      event.waitUntil(trackPerformance(data));
      break;
      
    case 'TRACK_USER_BEHAVIOR':
      event.waitUntil(trackUserBehavior(data));
      break;
      
    case 'PREDICTIVE_PREFETCH':
      event.waitUntil(handlePredictivePrefetching(data.movieId, data.type));
      break;
      
    case 'UPDATE_USER_BEHAVIOR':
      event.waitUntil(updateUserBehavior(data.movieId, data.movieData));
      break;
      
    case 'SCHEDULE_BACKGROUND_SYNC':
      event.waitUntil(scheduleBackgroundSync(data.tag, data.delay));
      break;
      
    case 'TMDB_API_KEY':
      TMDB_API_KEY = data;
      console.log('TMDB API Key received:', TMDB_API_KEY);
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Track performance metrics
async function trackPerformance(metrics) {
  try {
    const db = await openDB('streamr-analytics', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('performance')) {
          db.createObjectStore('performance', { keyPath: 'id', autoIncrement: true });
        }
      }
    });
    
    await db.add('performance', {
      ...metrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    });
    
    // Keep only last 1000 performance records
    const transaction = db.transaction(['performance'], 'readwrite');
    const store = transaction.objectStore('performance');
    const count = await store.count();
    
    if (count > 1000) {
      const allRecords = await store.getAll();
      const toDelete = allRecords.slice(0, count - 1000);
      
      for (const record of toDelete) {
        await store.delete(record.id);
      }
    }
    
  } catch (error) {
    console.error('Performance tracking failed:', error);
  }
}

// Track user behavior patterns
async function trackUserBehavior(behavior) {
  try {
    // Update in-memory behavior tracking
    if (behavior.movieId) {
      USER_BEHAVIOR.viewedMovies.add(behavior.movieId);
    }
    
    if (behavior.searchQuery) {
      USER_BEHAVIOR.searchHistory.push({
        query: behavior.searchQuery,
        timestamp: Date.now()
      });
    }
    
    if (behavior.genreId) {
      const current = USER_BEHAVIOR.genrePreferences.get(behavior.genreId) || 0;
      USER_BEHAVIOR.genrePreferences.set(behavior.genreId, current + 1);
    }
    
    USER_BEHAVIOR.lastActivity = Date.now();
    
    // Store in IndexedDB for analytics
    const db = await openDB('streamr-analytics', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('behavior')) {
          db.createObjectStore('behavior', { keyPath: 'id', autoIncrement: true });
        }
      }
    });
    
    await db.add('behavior', {
      ...behavior,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Behavior tracking failed:', error);
  }
}

// Schedule background sync with delay
async function scheduleBackgroundSync(tag, delay = 0) {
  try {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      
      if (delay > 0) {
        setTimeout(async () => {
          await registration.sync.register(tag);
        }, delay);
      } else {
        await registration.sync.register(tag);
      }
    }
  } catch (error) {
    console.error('Background sync scheduling failed:', error);
  }
}

// Clear all caches
async function clearCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
  console.log('All caches cleared');
}

// Get cache status
async function getCacheStatus(port) {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = keys.length;
  }
  
  port.postMessage(status);
}

// 🔄 PERIODIC BACKGROUND SYNC
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'content-update':
      event.waitUntil(updateContentCache());
      break;
      
    case 'analytics-sync':
      event.waitUntil(syncAnalytics());
      break;
      
    case 'predictive-warming':
      event.waitUntil(warmPredictiveCache());
      break;
      
    default:
      console.log('Unknown periodic sync tag:', event.tag);
  }
});

// 📨 MESSAGE EVENT LISTENER
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SET_TMDB_API_KEY':
      if (data && data.apiKey) {
        TMDB_API_KEY = data.apiKey;
        console.log('TMDB API Key received and stored');
      } else {
        console.log('TMDB API Key not provided or invalid');
        TMDB_API_KEY = null;
      }
      break;
      
    case 'REQUEST_TMDB_API_KEY':
      // Send API key back to main app if requested
      event.ports[0]?.postMessage({ apiKey: TMDB_API_KEY });
      break;
      
    case 'CLEAR_CACHES':
      event.waitUntil(clearCaches());
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(getCacheStatus(event.ports[0]));
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Update content cache periodically
async function updateContentCache() {
  try {
    if (TMDB_API_KEY && TMDB_API_KEY !== 'undefined' && TMDB_API_KEY !== 'null') {
      // If we have the API key, we can make direct TMDB calls
      try {
        // Update trending content
        const trendingResponse = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
        if (trendingResponse.ok) {
          const cache = await caches.open(API_CACHE);
          await cache.put('/api/trending', trendingResponse);
          console.log('Trending content cache updated from TMDB');
        }
      } catch (error) {
        console.log('TMDB trending content update failed:', error.message);
      }
      
      try {
        // Update popular movies
        const popularResponse = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
        if (popularResponse.ok) {
          const cache = await caches.open(API_CACHE);
          await cache.put('/api/popular', popularResponse);
          console.log('Popular movies cache updated from TMDB');
        }
      } catch (error) {
        console.log('TMDB popular movies update failed:', error.message);
      }
    } else {
      // Fallback to our own API endpoints when API key is not available
      console.log('TMDB API key not available, using our own API endpoints');
      
      try {
        const trendingResponse = await fetch('/api/trending');
        if (trendingResponse.ok) {
          const cache = await caches.open(API_CACHE);
          await cache.put('/api/trending', trendingResponse);
          console.log('Trending content cache updated from our API');
        }
      } catch (error) {
        console.log('Trending content update failed:', error.message);
      }
      
      try {
        const popularResponse = await fetch('/api/popular');
        if (popularResponse.ok) {
          const cache = await caches.open(API_CACHE);
          await cache.put('/api/popular', popularResponse);
          console.log('Popular movies cache updated from our API');
        }
      } catch (error) {
        console.log('Popular movies update failed:', error.message);
      }
    }
    
    console.log('Content cache update completed');
    
  } catch (error) {
    console.error('Content update failed:', error);
  }
}

// Sync analytics data
async function syncAnalytics() {
  try {
    const db = await openDB('streamr-analytics', 1);
    
    // Get performance data
    const performanceStore = db.transaction(['performance'], 'readonly').objectStore('performance');
    const performanceData = await performanceStore.getAll();
    
    // Get behavior data
    const behaviorStore = db.transaction(['behavior'], 'readonly').objectStore('behavior');
    const behaviorData = await behaviorStore.getAll();
    
    // Send to analytics endpoint (if available)
    if (performanceData.length > 0 || behaviorData.length > 0) {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performance: performanceData,
          behavior: behaviorData,
          timestamp: Date.now()
        })
      });
      
      // Clear sent data
      const performanceWriteStore = db.transaction(['performance'], 'readwrite').objectStore('performance');
      const behaviorWriteStore = db.transaction(['behavior'], 'readwrite').objectStore('behavior');
      
      for (const record of performanceData) {
        await performanceWriteStore.delete(record.id);
      }
      
      for (const record of behaviorData) {
        await behaviorWriteStore.delete(record.id);
      }
    }
    
  } catch (error) {
    console.error('Analytics sync failed:', error);
  }
}

// Warm predictive cache based on time patterns
async function warmPredictiveCache() {
  try {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Different content for different times
    const timeBasedContent = {
      morning: [28, 12, 16], // Action, Adventure, Animation
      afternoon: [35, 10751, 14], // Comedy, Family, Fantasy
      evening: [27, 53, 80], // Horror, Thriller, Crime
      night: [18, 10749, 10402] // Drama, Romance, Music
    };
    
    let targetGenres = [];
    
    if (hour >= 6 && hour < 12) targetGenres = timeBasedContent.morning;
    else if (hour >= 12 && hour < 17) targetGenres = timeBasedContent.afternoon;
    else if (hour >= 17 && hour < 22) targetGenres = timeBasedContent.evening;
    else targetGenres = timeBasedContent.night;
    
    // Weekend vs weekday content
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      targetGenres = targetGenres.concat([10751, 35]); // Add family and comedy for weekends
    }
    
    // Warm cache for predicted genres
    for (const genreId of targetGenres) {
      try {
        if (TMDB_API_KEY && TMDB_API_KEY !== 'undefined' && TMDB_API_KEY !== 'null') {
          // Use TMDB API directly if we have the key
          const response = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`);
          if (response.ok) {
            const cache = await caches.open(PREDICTIVE_CACHE);
            await cache.put(`/predictive/genre/${genreId}`, response);
            console.log(`Genre cache warmed from TMDB for genre ${genreId}`);
          }
        } else {
          // Fallback to our own API endpoint
          const response = await fetch(`/api/discover?genre=${genreId}&sort=popularity`);
          if (response.ok) {
            const cache = await caches.open(PREDICTIVE_CACHE);
            await cache.put(`/predictive/genre/${genreId}`, response);
            console.log(`Genre cache warmed from our API for genre ${genreId}`);
          }
        }
      } catch (error) {
        console.log('Genre warming failed for:', genreId, error.message);
      }
    }
    
    console.log('Predictive cache warmed successfully');
    
  } catch (error) {
    console.error('Predictive warming failed:', error);
  }
}

// 🎯 INTELLIGENT CACHE WARMING ON APP START
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/') || url.hostname === 'api.themoviedb.org') {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
    
    // Trigger predictive prefetching for movie details
    if (url.pathname.includes('/movie/') && !url.pathname.includes('/similar') && !url.pathname.includes('/recommendations')) {
      const movieId = url.pathname.split('/').pop();
      if (movieId && !isNaN(movieId)) {
        // Schedule predictive prefetch
        setTimeout(() => {
          handlePredictivePrefetching(movieId, 'movie');
        }, 1000);
      }
    }
  } else if (url.hostname === 'image.tmdb.org') {
    // Image requests - cache first
    event.respondWith(handleImageRequest(request));
  } else if (url.origin === self.location.origin) {
    // Static files - cache first
    event.respondWith(handleStaticRequest(request));
  } else {
    // Other requests - network only
    event.respondWith(fetch(request));
  }
});

console.log('🚀 Advanced Service Worker loaded with predictive prefetching, analytics, and intelligent caching!'); 