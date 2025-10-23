/**
 * useAPIOptimization - Optimized API request handling
 * Features: request deduplication, batching, retry logic, rate limiting
 */
import { useRef, useCallback, useState } from 'react';

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RATE_LIMIT = 10; // requests per second

export const useAPIOptimization = (options = {}) => {
  const {
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
    retryDelay = DEFAULT_RETRY_DELAY,
    timeout = DEFAULT_TIMEOUT,
    rateLimit = DEFAULT_RATE_LIMIT,
  } = options;

  const pendingRequestsRef = useRef(new Map());
  const requestTimestampsRef = useRef([]);
  const [requestStats, setRequestStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    deduplicated: 0,
    rateLimited: 0,
  });

  // Check if rate limit is exceeded
  const isRateLimited = useCallback(() => {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Remove timestamps older than 1 second
    requestTimestampsRef.current = requestTimestampsRef.current.filter(
      timestamp => timestamp > oneSecondAgo
    );
    
    return requestTimestampsRef.current.length >= rateLimit;
  }, [rateLimit]);

  // Add timestamp for rate limiting
  const addRequestTimestamp = useCallback(() => {
    requestTimestampsRef.current.push(Date.now());
  }, []);

  // Wait for rate limit window
  const waitForRateLimit = useCallback(async () => {
    if (!isRateLimited()) return;

    const oldestTimestamp = requestTimestampsRef.current[0];
    const waitTime = 1000 - (Date.now() - oldestTimestamp);
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }, [isRateLimited]);

  // Execute request with timeout
  const executeWithTimeout = useCallback(async (requestFn) => {
    return Promise.race([
      requestFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }, [timeout]);

  // Retry logic with exponential backoff
  const executeWithRetry = useCallback(async (requestFn, attempt = 0) => {
    try {
      return await executeWithTimeout(requestFn);
    } catch (error) {
      if (attempt < retryAttempts) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeWithRetry(requestFn, attempt + 1);
      }
      throw error;
    }
  }, [retryAttempts, retryDelay, executeWithTimeout]);

  // Main optimized fetch function
  const optimizedFetch = useCallback(async (key, requestFn) => {
    // Check for pending request (deduplication)
    if (pendingRequestsRef.current.has(key)) {
      setRequestStats(prev => ({
        ...prev,
        deduplicated: prev.deduplicated + 1,
      }));
      return pendingRequestsRef.current.get(key);
    }

    // Check rate limit
    if (isRateLimited()) {
      setRequestStats(prev => ({
        ...prev,
        rateLimited: prev.rateLimited + 1,
      }));
      await waitForRateLimit();
    }

    // Create request promise
    const requestPromise = (async () => {
      try {
        addRequestTimestamp();
        setRequestStats(prev => ({ ...prev, total: prev.total + 1 }));

        const result = await executeWithRetry(requestFn);
        
        setRequestStats(prev => ({
          ...prev,
          successful: prev.successful + 1,
        }));
        
        return result;
      } catch (error) {
        setRequestStats(prev => ({
          ...prev,
          failed: prev.failed + 1,
        }));
        throw error;
      } finally {
        pendingRequestsRef.current.delete(key);
      }
    })();

    pendingRequestsRef.current.set(key, requestPromise);
    return requestPromise;
  }, [isRateLimited, waitForRateLimit, addRequestTimestamp, executeWithRetry]);

  // Batch multiple requests
  const batchFetch = useCallback(async (requests) => {
    const results = await Promise.allSettled(
      requests.map(({ key, requestFn }) => optimizedFetch(key, requestFn))
    );

    return results.map((result, index) => ({
      key: requests[index].key,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  }, [optimizedFetch]);

  // Get request statistics
  const getStats = useCallback(() => {
    const successRate = requestStats.total > 0
      ? ((requestStats.successful / requestStats.total) * 100).toFixed(2)
      : '0.00';

    return {
      ...requestStats,
      successRate: `${successRate}%`,
      deduplicationRate: requestStats.total > 0
        ? `${((requestStats.deduplicated / (requestStats.total + requestStats.deduplicated)) * 100).toFixed(2)}%`
        : '0.00%',
    };
  }, [requestStats]);

  // Clear pending requests
  const clearPending = useCallback(() => {
    pendingRequestsRef.current.clear();
  }, []);

  return {
    optimizedFetch,
    batchFetch,
    getStats,
    clearPending,
  };
};

export default useAPIOptimization;
