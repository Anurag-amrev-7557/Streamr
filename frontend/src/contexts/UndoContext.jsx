import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UndoContext = createContext();

export const useUndo = () => {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing during initialization
export const useUndoSafe = () => {
  const context = useContext(UndoContext);
  return context;
};

export const UndoProvider = ({ children }) => {
  const [deletedItems, setDeletedItems] = useState({
    continueWatching: [],
    watchlist: []
  });
  const [undoTimeouts, setUndoTimeouts] = useState(new Map());

  // Helper: build unique key per item
  const buildItemKey = useCallback((section, item) => {
    if (section === 'continueWatching') {
      return `${item.id}-${item.type}-${item.season || 'movie'}-${item.episode || 'movie'}`;
    }
    return item.id.toString();
  }, []);

  // Cleanup expired items and timeouts
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const expiredTimeouts = [];
      
      undoTimeouts.forEach((timeout, key) => {
        if (timeout.expiresAt <= now) {
          expiredTimeouts.push(key);
        }
      });
      
      if (expiredTimeouts.length > 0) {
        setDeletedItems(prev => {
          const newState = { ...prev };
          expiredTimeouts.forEach(key => {
            const [section, id] = key.split('|');
            if (section === 'continueWatching') {
              newState.continueWatching = newState.continueWatching.filter(item => buildItemKey('continueWatching', item) !== id);
            } else if (section === 'watchlist') {
              newState.watchlist = newState.watchlist.filter(item => buildItemKey('watchlist', item) !== id);
            }
          });
          return newState;
        });
        
        expiredTimeouts.forEach(key => { undoTimeouts.delete(key); });
        setUndoTimeouts(new Map(undoTimeouts));
      }
    };

    const interval = setInterval(cleanup, 200);
    return () => clearInterval(interval);
  }, [undoTimeouts, buildItemKey]);

  // Add item to deleted items with undo timeout (replace if exists)
  const addDeletedItem = useCallback((section, item, undoTimeoutMs = 5000) => {
    const now = Date.now();
    const expiresAt = now + undoTimeoutMs;

    const itemKey = buildItemKey(section, item);
    const timeoutKey = `${section}|${itemKey}`;

    // Replace existing entry for the same item
    setDeletedItems(prev => {
      const updatedSection = (prev[section] || []).filter(existing => buildItemKey(section, existing) !== itemKey);
      return {
        ...prev,
        [section]: [...updatedSection, { ...item, deletedAt: now, expiresAt }]
      };
    });

    // Clear previous timeout if any and set a new one
    setUndoTimeouts(prev => {
      const newTimeouts = new Map(prev);
      const existing = newTimeouts.get(timeoutKey);
      if (existing?.timeoutId) clearTimeout(existing.timeoutId);
      newTimeouts.set(timeoutKey, { expiresAt, timeoutId: setTimeout(() => {
        setDeletedItems(prevState => ({
          ...prevState,
          [section]: prevState[section].filter(deletedItem => buildItemKey(section, deletedItem) !== itemKey)
        }));
        setUndoTimeouts(prevTimeouts => {
          const updatedTimeouts = new Map(prevTimeouts);
          updatedTimeouts.delete(timeoutKey);
          return updatedTimeouts;
        });
      }, undoTimeoutMs) });
      return newTimeouts;
    });

    return itemKey;
  }, [buildItemKey]);

  // Undo deletion for a specific item
  const undoDelete = useCallback((section, item) => {
    const itemKey = buildItemKey(section, item);
    const timeoutKey = `${section}|${itemKey}`;

    const timeout = undoTimeouts.get(timeoutKey);
    if (timeout?.timeoutId) clearTimeout(timeout.timeoutId);

    setDeletedItems(prev => ({
      ...prev,
      [section]: prev[section].filter(deletedItem => buildItemKey(section, deletedItem) !== itemKey)
    }));

    setUndoTimeouts(prev => {
      const newTimeouts = new Map(prev);
      newTimeouts.delete(timeoutKey);
      return newTimeouts;
    });

    return item;
  }, [undoTimeouts, buildItemKey]);

  const isItemDeleted = useCallback((section, item) => {
    const key = buildItemKey(section, item);
    if (section === 'continueWatching') {
      return deletedItems.continueWatching.some(d => buildItemKey('continueWatching', d) === key);
    }
    return deletedItems.watchlist.some(d => buildItemKey('watchlist', d) === key);
  }, [deletedItems, buildItemKey]);

  const getDeletedItems = useCallback((section) => deletedItems[section] || [], [deletedItems]);

  const clearDeletedItems = useCallback((section) => {
    const keysToRemove = [];
    undoTimeouts.forEach((_, key) => { if (key.startsWith(`${section}|`)) keysToRemove.push(key); });

    keysToRemove.forEach(key => { const t = undoTimeouts.get(key); if (t?.timeoutId) clearTimeout(t.timeoutId); });

    setUndoTimeouts(prev => {
      const newTimeouts = new Map(prev);
      keysToRemove.forEach(key => newTimeouts.delete(key));
      return newTimeouts;
    });

    setDeletedItems(prev => ({ ...prev, [section]: [] }));
  }, [undoTimeouts]);

  const getRemainingTime = useCallback((section, item) => {
    const key = buildItemKey(section, item);
    let deletedItem;
    if (section === 'continueWatching') {
      deletedItem = deletedItems.continueWatching.find(d => buildItemKey('continueWatching', d) === key);
    } else {
      deletedItem = deletedItems.watchlist.find(d => buildItemKey('watchlist', d) === key);
    }
    if (deletedItem) {
      return Math.max(0, Math.ceil((deletedItem.expiresAt - Date.now()) / 1000));
    }
    return 0;
  }, [deletedItems, buildItemKey]);

  const getCountdown = useCallback((section, item) => {
    const key = buildItemKey(section, item);
    let deletedItem;
    if (section === 'continueWatching') {
      deletedItem = deletedItems.continueWatching.find(d => buildItemKey('continueWatching', d) === key);
    } else {
      deletedItem = deletedItems.watchlist.find(d => buildItemKey('watchlist', d) === key);
    }
    if (!deletedItem) return { remainingMs: 0, totalMs: 0 };
    const remainingMs = Math.max(0, deletedItem.expiresAt - Date.now());
    const totalMs = Math.max(0, deletedItem.expiresAt - (deletedItem.deletedAt || Date.now()));
    return { remainingMs, totalMs };
  }, [deletedItems, buildItemKey]);

  const value = {
    deletedItems,
    addDeletedItem,
    undoDelete,
    isItemDeleted,
    getDeletedItems,
    clearDeletedItems,
    getRemainingTime,
    getCountdown
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
}; 