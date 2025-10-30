// Development Service Worker - Handles MIME type issues aggressively
const CACHE_NAME = 'streamr-dev-v1';

// Track MIME type errors
let mimeTypeErrorCount = 0;
const MAX_MIME_TYPE_ERRORS = 5;

// Install event - minimal caching for development
self.addEventListener('install', (event) => {
  console.log('🔧 Development Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Development cache opened');
      return cache;
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔧 Development Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old development cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Development Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with aggressive MIME type handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip service worker requests to prevent infinite loops
  if (url.pathname.includes('sw.js') || url.pathname.includes('dev-sw.js')) {
    return;
  }
  
  // Handle JavaScript files with aggressive MIME type handling
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs') || url.pathname.endsWith('.jsx')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          
          // Check for MIME type issues
          const contentType = response.headers.get('content-type');
          
          if (response.ok && contentType && contentType.includes('text/html')) {
            mimeTypeErrorCount++;
            console.warn(`🚨 MIME type mismatch #${mimeTypeErrorCount} for:`, url.pathname);
            
            // If we're getting too many MIME type errors, bypass the request entirely
            if (mimeTypeErrorCount >= MAX_MIME_TYPE_ERRORS) {
              console.error('🚨 Too many MIME type errors, bypassing JavaScript requests');
              return new Response('console.warn("MIME type error - request bypassed");', {
                status: 200,
                headers: {
                  'Content-Type': 'application/javascript; charset=utf-8',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              });
            }
            
            // Try to fix the MIME type
            return new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
          }
          
          // Reset error count on successful requests
          if (response.ok && contentType && contentType.includes('application/javascript')) {
            mimeTypeErrorCount = 0;
          }
          
          return response;
          
        } catch (error) {
          console.error('Fetch error for JavaScript file:', error);
          mimeTypeErrorCount++;
          
          // Return a fallback response
          return new Response('console.warn("File not available - fetch error");', {
            status: 200,
            headers: {
              'Content-Type': 'application/javascript; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        }
      })()
    );
    return;
  }
  
  // Handle CSS files
  if (url.pathname.endsWith('.css')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const contentType = response.headers.get('content-type');
          
          if (response.ok && contentType && contentType.includes('text/html')) {
            console.warn('🚨 MIME type mismatch detected for CSS:', url.pathname);
            return new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                'Content-Type': 'text/css; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
          }
          
          return response;
          
        } catch (error) {
          console.error('Fetch error for CSS file:', error);
          return new Response('/* CSS not available */', {
            status: 200,
            headers: {
              'Content-Type': 'text/css; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        }
      })()
    );
    return;
  }
  
  // For other requests, use network-first strategy but be cautious
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        
        // Cache successful responses (but be selective)
        if (response.ok && !url.pathname.includes('api')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        
        return response;
        
      } catch (error) {
        console.error('Network request failed:', error);
        
        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return a minimal fallback for critical resources
        if (url.pathname === '/' || url.pathname === '/index.html') {
          return new Response('<!DOCTYPE html><html><body>App loading...</body></html>', {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache'
            }
          });
        }
        
        throw error;
      }
    })()
  );
});

// Message event - handle communication with main app
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (data?.type === 'SET_TMDB_API_KEY') {
    console.log('🔧 Development Service Worker received API key');
    // Store API key for development use
    self.TMDB_API_KEY = data.apiKey;
  }
  
  if (data?.type === 'REQUEST_TMDB_API_KEY') {
    console.log('🔧 Development Service Worker API key requested');
    // Request API key from main app
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'REQUEST_TMDB_API_KEY'
        });
      });
    });
  }
  
  if (data?.type === 'RESET_MIME_TYPE_ERRORS') {
    console.log('🔧 Resetting MIME type error count');
    mimeTypeErrorCount = 0;
  }
  
  if (data?.type === 'GET_MIME_TYPE_ERROR_COUNT') {
    console.log('🔧 MIME type error count:', mimeTypeErrorCount);
    // Send error count back to main app
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'MIME_TYPE_ERROR_COUNT',
          count: mimeTypeErrorCount
        });
      });
    });
  }
});

// Error event - handle service worker errors
self.addEventListener('error', (event) => {
  console.error('🔧 Development Service Worker error:', event.error);
});

// Unhandled rejection event
self.addEventListener('unhandledrejection', (event) => {
  console.error('🔧 Development Service Worker unhandled rejection:', event.reason);
});

// Periodic cleanup of MIME type error count
setInterval(() => {
  if (mimeTypeErrorCount > 0) {
    console.log('🔧 Resetting MIME type error count (periodic cleanup)');
    mimeTypeErrorCount = Math.max(0, mimeTypeErrorCount - 1);
  }
}, 30000); // Reset every 30 seconds 