// Enhanced Service Worker with AI-Powered Caching
const CACHE_VERSION = 'v2.0';
const CACHE_NAMES = {
  STATIC: `streamr-static-${CACHE_VERSION}`,
  API: `streamr-api-${CACHE_VERSION}`,
  IMAGES: `streamr-images-${CACHE_VERSION}`,
  PREDICTIVE: `streamr-predictive-${CACHE_VERSION}`,
  OFFLINE: `streamr-offline-${CACHE_VERSION}`
};

// Cache strategies
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  API: 'network-first',
  IMAGES: 'cache-first',
  PREDICTIVE: 'stale-while-revalidate',
  OFFLINE: 'cache-only'
};

// AI-powered user behavior tracking
const USER_BEHAVIOR = {
  viewedMovies: new Set(),
  searchHistory: [],
  genrePreferences: new Map(),
  watchTime: new Map(),
  lastActivity: Date.now(),
  navigationPatterns: [],
  scrollDepth: new Map(),
  timeSpent: new Map()
};

// ML prediction model
const ML_MODEL = {
  accessPredictions: new Map(),
  contentRecommendations: new Map(),
  userSegments: new Map(),
  seasonalTrends: new Map()
};

// Performance metrics
const PERFORMANCE_METRICS = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  offlineRequests: 0,
  averageResponseTime: 0,
  totalRequests: 0
};

// Critical files to cache immediately
const CRITICAL_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache critical files and initialize
self.addEventListener('install', (event) => {
  console.log('🚀 Enhanced Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache critical static files
      caches.open(CACHE_NAMES.STATIC).then(cache => {
        console.log('Caching critical static files');
        return cache.addAll(CRITICAL_FILES);
      }),
      
      // Initialize predictive cache
      caches.open(CACHE_NAMES.PREDICTIVE).then(cache => {
        console.log('Predictive cache initialized');
        return cache;
      }),
      
      // Initialize offline cache
      caches.open(CACHE_NAMES.OFFLINE).then(cache => {
        console.log('Offline cache initialized');
        return cache;
      })
    ])
    .then(() => {
      console.log('Enhanced Service Worker installed successfully');
      return self.skipWaiting();
    })
    .catch(error => {
      console.error('Enhanced Service Worker install failed:', error);
    })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('Enhanced Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients
      self.clients.claim(),
      
      // Initialize background processes
      initializeBackgroundProcesses()
    ])
    .then(() => {
      console.log('Enhanced Service Worker activated successfully');
    })
  );
});

// Fetch event - intelligent request handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests with intelligent strategies
  if (url.pathname.startsWith('/api/') || url.hostname === 'api.themoviedb.org') {
    // API requests - intelligent caching with ML predictions
    event.respondWith(handleApiRequest(request));
  } else if (url.hostname === 'image.tmdb.org') {
    // Image requests - optimized caching with compression
    event.respondWith(handleImageRequest(request));
  } else if (url.origin === self.location.origin) {
    // Static files - cache-first with versioning
    event.respondWith(handleStaticRequest(request));
  } else {
    // Other requests - network-first with fallback
    event.respondWith(handleExternalRequest(request));
  }
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = generateCacheKey(request);
  const cache = await caches.open(CACHE_NAMES.API);
  
  // Update user behavior tracking
  updateUserBehavior(url.pathname);
  
  // Check ML predictions for prefetching
  const predictions = await getMLPredictions(url.pathname);
  if (predictions.length > 0) {
    schedulePrefetch(predictions);
  }
  
  try {
    // Try network first with intelligent timeout
    const networkResponse = await fetchWithTimeout(request, 8000);
    
    if (networkResponse.ok) {
      // Cache successful responses with intelligent TTL
      const ttl = calculateIntelligentTTL(url.pathname);
      const responseClone = networkResponse.clone();
      
      // Store with metadata for intelligent management
      const cacheEntry = {
        response: responseClone,
        timestamp: Date.now(),
        ttl: ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        priority: calculatePriority(url.pathname),
        metadata: {
          url: url.pathname,
          method: request.method,
          size: responseClone.headers.get('content-length') || 0
        }
      };
      
      await cache.put(cacheKey, cacheEntry);
      PERFORMANCE_METRICS.networkRequests++;
      
      return networkResponse;
    }
    
    throw new Error(`HTTP ${networkResponse.status}`);
    
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Try cache with intelligent fallback
    const cachedEntry = await cache.match(cacheKey);
    if (cachedEntry) {
      // Update access statistics
      cachedEntry.accessCount++;
      cachedEntry.lastAccessed = Date.now();
      
      PERFORMANCE_METRICS.cacheHits++;
      return cachedEntry.response;
    }
    
    // Return intelligent offline response
    return getOfflineResponse(url.pathname);
  }
}

// Handle image requests with optimization
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAMES.IMAGES);
  const cacheKey = generateCacheKey(request);
  
  // Try cache first for images
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    PERFORMANCE_METRICS.cacheHits++;
    return cachedResponse;
  }
  
  try {
    // Try network with image optimization
    const response = await fetch(request);
    
    if (response.ok) {
      // Optimize and cache image
      const optimizedResponse = await optimizeImage(response);
      const responseClone = optimizedResponse.clone();
      
      await cache.put(cacheKey, responseClone);
      PERFORMANCE_METRICS.networkRequests++;
      
      return optimizedResponse;
    }
    
    throw new Error(`Image fetch failed: ${response.status}`);
    
  } catch (error) {
    console.log('Image fetch failed:', request.url);
    
    // Return optimized placeholder
    return getImagePlaceholder(request.url);
  }
}

// Handle static file requests
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAMES.STATIC);
  
  // Try cache first for static files
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    PERFORMANCE_METRICS.cacheHits++;
    return cachedResponse;
  }
  
  try {
    // Try network
    const response = await fetch(request);
    
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
      PERFORMANCE_METRICS.networkRequests++;
    }
    
    return response;
    
  } catch (error) {
    console.log('Static file fetch failed:', request.url);
    
    // Return offline page for document requests
    if (request.destination === 'document') {
      return cache.match('/offline.html');
    }
    
    throw error;
  }
}

// Handle external requests
async function handleExternalRequest(request) {
  try {
    const response = await fetch(request);
    PERFORMANCE_METRICS.networkRequests++;
    return response;
  } catch (error) {
    PERFORMANCE_METRICS.offlineRequests++;
    throw error;
  }
}

// AI-powered prefetching based on user behavior
async function schedulePrefetch(predictions) {
  const cache = await caches.open(CACHE_NAMES.PREDICTIVE);
  
  for (const prediction of predictions) {
    try {
      const response = await fetch(prediction.url);
      if (response.ok) {
        const responseClone = response.clone();
        await cache.put(prediction.url, responseClone);
        console.log(`AI prefetch: ${prediction.type} - ${prediction.url}`);
      }
    } catch (error) {
      console.debug(`AI prefetch failed: ${prediction.url}`);
    }
  }
}

// Get ML predictions for content
async function getMLPredictions(pathname) {
  const predictions = [];
  
  // Extract movie ID from pathname
  const movieMatch = pathname.match(/\/movie\/(\d+)/);
  if (movieMatch) {
    const movieId = movieMatch[1];
    
    // Predict similar movies
    predictions.push({
      type: 'similar',
      url: `/api/movie/${movieId}/similar`,
      priority: 'medium',
      confidence: 0.8
    });
    
    // Predict recommendations
    predictions.push({
      type: 'recommendations',
      url: `/api/movie/${movieId}/recommendations`,
      priority: 'medium',
      confidence: 0.7
    });
  }
  
  // Predict based on user behavior
  const userPredictions = getUserBasedPredictions();
  predictions.push(...userPredictions);
  
  // Predict seasonal content
  const seasonalPredictions = getSeasonalPredictions();
  predictions.push(...seasonalPredictions);
  
  return predictions;
}

// Get predictions based on user behavior
function getUserBasedPredictions() {
  const predictions = [];
  
  // Predict based on genre preferences
  const topGenres = Array.from(USER_BEHAVIOR.genrePreferences.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  topGenres.forEach(([genreId, count]) => {
    if (count > 2) {
      predictions.push({
        type: 'genre',
        url: `/api/discover/movie?with_genres=${genreId}`,
        priority: 'low',
        confidence: Math.min(0.9, count / 10)
      });
    }
  });
  
  return predictions;
}

// Get seasonal predictions
function getSeasonalPredictions() {
  const predictions = [];
  const month = new Date().getMonth();
  const hour = new Date().getHours();
  
  // Seasonal genre preferences
  const seasonalGenres = {
    11: 10751, // December - Family
    0: 10751,  // January - Family
    6: 28,     // July - Action
    10: 27     // November - Horror
  };
  
  if (seasonalGenres[month]) {
    predictions.push({
      type: 'seasonal',
      url: `/api/discover/movie?with_genres=${seasonalGenres[month]}`,
      priority: 'low',
      confidence: 0.6
    });
  }
  
  // Time-based predictions
  if (hour >= 18 && hour <= 22) {
    // Evening - drama/romance
    predictions.push({
      type: 'time_based',
      url: '/api/discover/movie?with_genres=18,10749',
      priority: 'low',
      confidence: 0.5
    });
  }
  
  return predictions;
}

// Update user behavior tracking
function updateUserBehavior(pathname) {
  USER_BEHAVIOR.lastActivity = Date.now();
  
  // Track movie views
  const movieMatch = pathname.match(/\/movie\/(\d+)/);
  if (movieMatch) {
    USER_BEHAVIOR.viewedMovies.add(movieMatch[1]);
  }
  
  // Track navigation patterns
  USER_BEHAVIOR.navigationPatterns.push({
    path: pathname,
    timestamp: Date.now()
  });
  
  // Keep only recent patterns
  if (USER_BEHAVIOR.navigationPatterns.length > 50) {
    USER_BEHAVIOR.navigationPatterns = USER_BEHAVIOR.navigationPatterns.slice(-25);
  }
}

// Calculate intelligent TTL based on content type and user behavior
function calculateIntelligentTTL(pathname) {
  let baseTTL = 15 * 60 * 1000; // 15 minutes
  
  // Adjust based on content type
  if (pathname.includes('/trending')) {
    baseTTL = 5 * 60 * 1000; // 5 minutes for trending
  } else if (pathname.includes('/movie/') && pathname.includes('/similar')) {
    baseTTL = 30 * 60 * 1000; // 30 minutes for similar movies
  } else if (pathname.includes('/discover')) {
    baseTTL = 20 * 60 * 1000; // 20 minutes for discover
  }
  
  // Adjust based on user behavior
  const accessCount = getAccessCount(pathname);
  if (accessCount > 10) {
    baseTTL *= 1.5; // Longer TTL for frequently accessed content
  }
  
  return Math.min(baseTTL, 60 * 60 * 1000); // Max 1 hour
}

// Calculate priority based on content type
function calculatePriority(pathname) {
  if (pathname.includes('/trending') || pathname.includes('/popular')) {
    return 'high';
  } else if (pathname.includes('/movie/') && !pathname.includes('/similar')) {
    return 'medium';
  } else {
    return 'low';
  }
}

// Get access count for pathname
function getAccessCount(pathname) {
  // This would be implemented with actual access tracking
  return 1;
}

// Generate cache key
function generateCacheKey(request) {
  const url = new URL(request.url);
  return `${request.method}:${url.pathname}:${url.search}`;
}

// Fetch with timeout
async function fetchWithTimeout(request, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Optimize image response
async function optimizeImage(response) {
  // In a real implementation, this would compress/resize images
  // For now, just return the original response
  return response;
}

// Get image placeholder
function getImagePlaceholder(originalUrl) {
  const placeholderSvg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="750" fill="#333333"/>
      <text x="250" y="375" font-family="Arial" font-size="24" fill="white" text-anchor="middle">Image Unavailable</text>
    </svg>
  `;
  
  return new Response(placeholderSvg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

// Get offline response
function getOfflineResponse(pathname) {
  if (pathname.includes('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'No internet connection',
        message: 'Please check your connection and try again',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return caches.match('/offline.html');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(performBackgroundSync());
      break;
      
    case 'cache-warmup':
      event.waitUntil(performCacheWarmup());
      break;
      
    case 'analytics-sync':
      event.waitUntil(syncAnalytics());
      break;
      
    case 'ml-training':
      event.waitUntil(trainMLModel());
      break;
      
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

// Perform background sync
async function performBackgroundSync() {
  try {
    // Sync API cache
    const apiCache = await caches.open(CACHE_NAMES.API);
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
    
    // Sync predictive cache
    const predictiveCache = await caches.open(CACHE_NAMES.PREDICTIVE);
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
    
    console.log('Background sync completed');
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Perform cache warmup
async function performCacheWarmup() {
  try {
    const warmupEndpoints = [
      '/api/trending',
      '/api/popular',
      '/api/top-rated'
    ];
    
    for (const endpoint of warmupEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAMES.API);
          await cache.put(endpoint, response);
        }
      } catch (error) {
        console.log('Warmup failed for:', endpoint);
      }
    }
    
    console.log('Cache warmup completed');
    
  } catch (error) {
    console.error('Cache warmup failed:', error);
  }
}

// Sync analytics data
async function syncAnalytics() {
  try {
    const analyticsData = {
      performance: PERFORMANCE_METRICS,
      userBehavior: USER_BEHAVIOR,
      mlModel: ML_MODEL,
      timestamp: Date.now()
    };
    
    // Store analytics in IndexedDB
    const db = await openDB('streamr-analytics', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('analytics')) {
          db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
        }
      }
    });
    
    await db.add('analytics', analyticsData);
    
    console.log('Analytics synced');
    
  } catch (error) {
    console.error('Analytics sync failed:', error);
  }
}

// Train ML model
async function trainMLModel() {
  try {
    // Simple ML training based on user behavior
    for (const [pathname, accessCount] of USER_BEHAVIOR.viewedMovies.entries()) {
      const prediction = ML_MODEL.accessPredictions.get(pathname) || {
        probability: 0.5,
        confidence: 0.5
      };
      
      // Update prediction based on access frequency
      prediction.probability = Math.min(1, prediction.probability + 0.1);
      prediction.confidence = Math.min(1, prediction.confidence + 0.05);
      
      ML_MODEL.accessPredictions.set(pathname, prediction);
    }
    
    console.log('ML model trained');
    
  } catch (error) {
    console.error('ML training failed:', error);
  }
}

// Initialize background processes
async function initializeBackgroundProcesses() {
  // Schedule periodic background syncs
  setInterval(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('background-sync');
      });
    }
  }, 30 * 60 * 1000); // Every 30 minutes
  
  // Schedule cache warmup
  setInterval(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('cache-warmup');
      });
    }
  }, 60 * 60 * 1000); // Every hour
  
  // Schedule analytics sync
  setInterval(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('analytics-sync');
      });
    }
  }, 5 * 60 * 1000); // Every 5 minutes
  
  // Schedule ML training
  setInterval(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('ml-training');
      });
    }
  }, 15 * 60 * 1000); // Every 15 minutes
}

// Message event handler
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'GET_PERFORMANCE_METRICS':
      event.ports[0]?.postMessage(PERFORMANCE_METRICS);
      break;
      
    case 'GET_USER_BEHAVIOR':
      event.ports[0]?.postMessage(USER_BEHAVIOR);
      break;
      
    case 'UPDATE_USER_BEHAVIOR':
      Object.assign(USER_BEHAVIOR, data);
      break;
      
    case 'CLEAR_CACHES':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(getCacheStatus(event.ports[0]));
      break;
      
    case 'TRIGGER_PREFETCH':
      event.waitUntil(triggerPrefetch(data));
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Clear all caches
async function clearAllCaches() {
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

// Trigger prefetch
async function triggerPrefetch(data) {
  const predictions = await getMLPredictions(data.pathname);
  await schedulePrefetch(predictions);
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

console.log('🚀 Enhanced Service Worker loaded with AI-powered caching, intelligent prefetching, and advanced analytics!'); 