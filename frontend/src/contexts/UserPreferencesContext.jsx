import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { userAPI } from '../services/api';
import { getApiUrl } from '../config/api';

const PreferencesContext = createContext();

export const useUserPreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used within PreferencesProvider');
  return ctx;
};

const PREFERENCES_STORAGE_KEY = 'streamr_user_preferences';
const PREFERENCES_OFFLINE_QUEUE = 'streamr_user_preferences_offline_queue';

function getLocalPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalPreferences(prefs) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs || {}));
  } catch {}
}

function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(PREFERENCES_OFFLINE_QUEUE);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function setOfflineQueue(ops) {
  try {
    localStorage.setItem(PREFERENCES_OFFLINE_QUEUE, JSON.stringify(ops || []));
  } catch {}
}

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(() => getLocalPreferences());
  const [isSyncing, setIsSyncing] = useState(false);
  const isUpdatingFromBackend = useRef(false);

  const mergePreferences = useCallback((local, remote) => {
    // Shallow merge, remote wins unless local has keys not present remotely
    return { ...local, ...remote };
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
      // Get full profile to read server preferences
      const profile = await userAPI.getProfile();
      const remotePrefs = profile?.data?.preferences || {};
      const localPrefs = getLocalPreferences();
      const merged = mergePreferences(localPrefs, remotePrefs);

      // If merged differs from remote, upload immediately
      const shouldUpload = JSON.stringify(merged) !== JSON.stringify(remotePrefs);
      if (shouldUpload) {
        try {
          await userAPI.updatePreferences(merged);
          window.dispatchEvent(new Event('preferences-synced'));
          window.dispatchEvent(new Event('achievements-refresh'));
        } catch (e) {
          // queue if offline
          if (!navigator.onLine) {
            const q = getOfflineQueue();
            q.push({ type: 'update', data: merged, at: new Date().toISOString() });
            setOfflineQueue(q);
          }
        }
      }

      isUpdatingFromBackend.current = true;
      setPreferences(merged);
      setLocalPreferences(merged);
    } catch (e) {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  }, [mergePreferences]);

  // On mount and on login events, load/merge
  useEffect(() => {
    let authTimeoutId = null;
    loadFromBackend();
    const handleAuthChange = () => {
      authTimeoutId = setTimeout(() => {
        loadFromBackend();
      }, 100);
    };
    window.addEventListener('auth-changed', handleAuthChange);
    return () => {
      if (authTimeoutId) clearTimeout(authTimeoutId);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, [loadFromBackend]);

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === PREFERENCES_STORAGE_KEY) {
        try {
          const local = getLocalPreferences();
          isUpdatingFromBackend.current = true;
          setPreferences(local);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Auto-upload on change
  useEffect(() => {
    if (isUpdatingFromBackend.current) {
      isUpdatingFromBackend.current = false;
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLocalPreferences(preferences);
      return;
    }
    const t = setTimeout(async () => {
      try {
        if (!navigator.onLine) {
          const q = getOfflineQueue();
          q.push({ type: 'update', data: preferences, at: new Date().toISOString() });
          setOfflineQueue(q);
          setLocalPreferences(preferences);
          return;
        }
        setIsSyncing(true);
        await userAPI.updatePreferences(preferences);
        setLocalPreferences(preferences);
        window.dispatchEvent(new Event('preferences-synced'));
        window.dispatchEvent(new Event('achievements-refresh'));
      } catch (e) {
        // queue on failure if offline
        if (!navigator.onLine) {
          const q = getOfflineQueue();
          q.push({ type: 'update', data: preferences, at: new Date().toISOString() });
          setOfflineQueue(q);
        }
      } finally {
        setIsSyncing(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [preferences]);

  // Process offline queue when back online
  useEffect(() => {
    const onOnline = async () => {
      const q = getOfflineQueue();
      if (q.length === 0) return;
      setIsSyncing(true);
      try {
        const latest = q[q.length - 1];
        if (latest?.data) {
          await userAPI.updatePreferences(latest.data);
          setLocalPreferences(latest.data);
          setPreferences(latest.data);
          window.dispatchEvent(new Event('preferences-synced'));
          window.dispatchEvent(new Event('achievements-refresh'));
        }
        setOfflineQueue([]);
      } catch {
      } finally {
        setIsSyncing(false);
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const updatePreferencesLocal = useCallback((partial) => {
    setPreferences((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo(() => ({
    preferences,
    isSyncing,
    setPreferences: updatePreferencesLocal,
  }), [preferences, isSyncing, updatePreferencesLocal]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};


