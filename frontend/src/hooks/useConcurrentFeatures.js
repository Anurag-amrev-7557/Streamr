/**
 * 🚀 React 18 Concurrent Features Hook
 * 
 * Leverages React 18's concurrent rendering capabilities:
 * - useTransition for non-blocking updates
 * - useDeferredValue for deprioritizing updates
 * - Priority-based rendering
 * - Automatic Suspense boundaries
 * - Smart batching
 */

import { 
  useTransition, 
  useDeferredValue, 
  useState, 
  useCallback, 
  useMemo,
  startTransition 
} from 'react';

export const useConcurrentFeatures = () => {
  const [isPending, startTransition] = useTransition();

  /**
   * Execute low-priority update
   */
  const deferredUpdate = useCallback((updateFn) => {
    startTransition(() => {
      updateFn();
    });
  }, []);

  /**
   * Execute high-priority update immediately
   */
  const urgentUpdate = useCallback((updateFn) => {
    updateFn();
  }, []);

  /**
   * Batch multiple updates together
   */
  const batchUpdates = useCallback((updateFns) => {
    startTransition(() => {
      updateFns.forEach(fn => fn());
    });
  }, []);

  return {
    isPending,
    deferredUpdate,
    urgentUpdate,
    batchUpdates,
  };
};

/**
 * Hook for deferred values
 */
export const useDeferredState = (initialValue) => {
  const [value, setValue] = useState(initialValue);
  const deferredValue = useDeferredValue(value);

  const setDeferredValue = useCallback((newValue) => {
    startTransition(() => {
      setValue(newValue);
    });
  }, []);

  return [deferredValue, setDeferredValue, value];
};

/**
 * Hook for priority-based state updates
 */
export const usePriorityState = (initialValue) => {
  const [state, setState] = useState(initialValue);
  const [isPending, startPriorityTransition] = useTransition();

  const setHighPriority = useCallback((value) => {
    setState(value);
  }, []);

  const setLowPriority = useCallback((value) => {
    startPriorityTransition(() => {
      setState(value);
    });
  }, []);

  return {
    state,
    setHighPriority,
    setLowPriority,
    isPending,
  };
};

/**
 * Hook for concurrent data fetching
 */
export const useConcurrentFetch = (fetchFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startFetchTransition] = useTransition();

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      
      startFetchTransition(() => {
        setData(result);
        setIsLoading(false);
      });
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  }, dependencies);

  const refetch = useCallback(() => {
    fetch();
  }, [fetch]);

  return {
    data,
    error,
    isLoading,
    isPending,
    refetch,
  };
};

export default useConcurrentFeatures;
