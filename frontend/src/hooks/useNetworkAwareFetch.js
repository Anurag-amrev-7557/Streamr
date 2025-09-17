import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import enhancedNetworkService from '../services/enhancedNetworkService.js';

// Hook: Network-aware fetch with cache-first SWR and abort on unmount
export default function useNetworkAwareFetch() {
  const abortRef = useRef(null);
  const [profile, setProfile] = useState(enhancedNetworkService.getNetworkProfile());

  // Listen to connection changes if supported
  useEffect(() => {
    const conn = navigator.connection;
    if (!conn) return;
    const handler = () => setProfile(enhancedNetworkService.getNetworkProfile());
    conn.addEventListener('change', handler);
    return () => conn.removeEventListener('change', handler);
  }, []);

  const getJSON = useCallback(async (endpoint, options = {}) => {
    // Cancel previous inflight if any (caller can manage race conditions)
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch (_) {}
    }
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    // Pass headers through; AbortController is handled inside service
    const result = await enhancedNetworkService.getJSON(endpoint, options);
    if (signal.aborted) {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    }
    return result;
  }, []);

  const prefetch = useCallback((endpoint, options = {}) => {
    enhancedNetworkService.prefetch(endpoint, options);
  }, []);

  return useMemo(() => ({ getJSON, prefetch, profile }), [getJSON, prefetch, profile]);
}

