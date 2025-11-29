import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// Advanced cache configuration with intelligent defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Aggressive caching for better performance
      staleTime: 10 * 60 * 1000, // 10 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache retention time

      // Smart refetching strategy
      refetchOnWindowFocus: false, // Disable to prevent excessive requests
      refetchOnReconnect: true, // Refetch on network reconnection
      refetchOnMount: false, // Don't refetch if data is fresh

      // Retry strategy for resilience
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network mode for offline support
      networkMode: 'offlineFirst', // Try cache first, then network
    },
    mutations: {
      // Optimistic updates and retry for mutations
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// Create persister for localStorage caching
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'STREAMR_CACHE',
  serialize: JSON.stringify,
  deserialize: (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('Error parsing cache:', e);
      return undefined;
    }
  },
  // Throttle writes to reduce localStorage operations
  throttleTime: 1000,
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours cache persistence
        buster: __APP_VERSION__, // Automatically invalidate cache on new build
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist queries that are successful and not too old
            return query.state.status === 'success' &&
              query.state.dataUpdatedAt > Date.now() - (60 * 60 * 1000); // 1 hour
          },
        },
      }}
    >
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </PersistQueryClientProvider>
  </StrictMode>,
)

