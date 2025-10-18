import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getApiUrl } from '../config/api';

// Minimal collections sync using generic endpoints if available in future; currently stored locally
const CollectionsContext = createContext();

export const useCollections = () => {
  const ctx = useContext(CollectionsContext);
  if (!ctx) throw new Error('useCollections must be used within CollectionsProvider');
  return ctx;
};

const COLLECTIONS_STORAGE_KEY = 'streamr_user_collections';
const COLLECTIONS_OFFLINE_QUEUE = 'streamr_user_collections_offline_queue';

function getLocalCollections() {
  try {
    const raw = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCollections(collections) {
  try {
    localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections || []));
  } catch {}
}

function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(COLLECTIONS_OFFLINE_QUEUE);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function setOfflineQueue(ops) {
  try {
    localStorage.setItem(COLLECTIONS_OFFLINE_QUEUE, JSON.stringify(ops || []));
  } catch {}
}

export const CollectionsProvider = ({ children }) => {
  const [collections, setCollections] = useState(() => getLocalCollections());
  const isUpdatingFromBackend = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const mergeCollections = useCallback((local, remote) => {
    const map = new Map();
    local.forEach(c => map.set(c.id, { ...c, source: 'local' }));
    remote.forEach(c => {
      const existing = map.get(c.id);
      if (!existing) map.set(c.id, c);
      else map.set(c.id, { ...existing, ...c });
    });
    return Array.from(map.values()).map(({ source, ...c }) => c);
  }, []);

  const loadFromBackend = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const authCheck = await fetch(`${getApiUrl()}/user/profile`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!authCheck.ok) {
        localStorage.removeItem('accessToken');
        return;
      }
    } catch {
      return;
    }

    setIsSyncing(true);
    try {
      // Placeholder: if backend adds collections endpoint, replace with fetch and sync
      const remote = [];
      const local = getLocalCollections();
      const merged = mergeCollections(local, remote);
      isUpdatingFromBackend.current = true;
      setCollections(merged);
      setLocalCollections(merged);
    } finally {
      setIsSyncing(false);
    }
  }, [mergeCollections]);

  useEffect(() => {
    let authTimeoutId = null;
    loadFromBackend();
    const handleAuthChange = () => {
      authTimeoutId = setTimeout(() => loadFromBackend(), 100);
    };
    window.addEventListener('auth-changed', handleAuthChange);
    return () => {
      if (authTimeoutId) clearTimeout(authTimeoutId);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, [loadFromBackend]);

  useEffect(() => {
    if (isUpdatingFromBackend.current) {
      isUpdatingFromBackend.current = false;
      return;
    }
    const t = setTimeout(() => setLocalCollections(collections), 100);
    return () => clearTimeout(t);
  }, [collections]);

  useEffect(() => {
    const onOnline = async () => {
      const q = getOfflineQueue();
      if (q.length === 0) return;
      setOfflineQueue([]);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const addToCollections = useCallback((item) => {
    setCollections(prev => {
      if (prev.find(x => x.id === item.id)) return prev;
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFromCollections = useCallback((id) => {
    setCollections(prev => prev.filter(x => x.id !== id));
  }, []);

  const value = useMemo(() => ({
    collections,
    isSyncing,
    addToCollections,
    removeFromCollections,
  }), [collections, isSyncing, addToCollections, removeFromCollections]);

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
};


