import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// default to null so hooks can detect missing provider
const UndoContext = createContext(null);

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
  const [history, setHistory] = useState([]); // Enhancement: keep a history of actions for redo
  const [redoStack, setRedoStack] = useState([]); // Enhancement: redo support

  // For performance, keep refs to latest state for timeouts
  const deletedItemsRef = useRef(deletedItems);
  const undoTimeoutsRef = useRef(undoTimeouts);
  useEffect(() => { deletedItemsRef.current = deletedItems; }, [deletedItems]);
  useEffect(() => { undoTimeoutsRef.current = undoTimeouts; }, [undoTimeouts]);

  // Helper: build unique key per item
  const buildItemKey = useCallback((section, item) => {
    // Defensive: ensure item exists and id is a stable string
    if (!item) return 'unknown';
    const idStr = String(item.id ?? item._id ?? 'unknown');
    if (section === 'continueWatching') {
      const type = String(item.type ?? 'unknown');
      const season = String(item.season ?? 'movie');
      const episode = String(item.episode ?? 'movie');
      // encode components to avoid accidental pipe/sep collisions
      return `${encodeURIComponent(idStr)}-${encodeURIComponent(type)}-${encodeURIComponent(season)}-${encodeURIComponent(episode)}`;
    }
    return encodeURIComponent(idStr);
  }, []);

  // Cleanup expired items and timeouts (low-frequency + on visibility change)
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const expiredTimeouts = [];

      undoTimeoutsRef.current.forEach((timeout, key) => {
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

        expiredTimeouts.forEach(key => { undoTimeoutsRef.current.delete(key); });
        setUndoTimeouts(new Map(undoTimeoutsRef.current));
      }
    };

    const interval = setInterval(cleanup, 1000);
    const onVisibility = () => { if (document.visibilityState === 'visible') cleanup(); };
    document.addEventListener('visibilitychange', onVisibility, { passive: true });
    window.addEventListener('focus', cleanup, { passive: true });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', cleanup);
      // Clear any pending timeouts to avoid callbacks after unmount
      try {
        undoTimeoutsRef.current.forEach((t) => {
          if (t?.timeoutId) clearTimeout(t.timeoutId);
        });
      } catch (e) {
        // defensive: if map mutated during iteration just ignore
      }
    };
  }, [buildItemKey]);

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

    // Add to history for undo/redo
    setHistory(prev => [...prev, { type: 'delete', section, item, timestamp: now }]);
    setRedoStack([]); // Clear redo stack on new action

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

    const timeout = undoTimeoutsRef.current.get(timeoutKey);
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

    // Add to history for undo/redo
    setHistory(prev => [...prev, { type: 'undo', section, item, timestamp: Date.now() }]);
    setRedoStack([]); // Clear redo stack on new action

    return item;
  }, [buildItemKey]);

  // Redo last undone delete
  const redoDelete = useCallback(() => {
    if (redoStack.length === 0) return;
    const lastRedo = redoStack[redoStack.length - 1];
    if (lastRedo.type === 'delete') {
      addDeletedItem(lastRedo.section, lastRedo.item);
      setRedoStack(prev => prev.slice(0, -1));
    }
  }, [redoStack, addDeletedItem]);

  // Undo last action (delete or undo)
  const undoLast = useCallback(() => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    if (lastAction.type === 'delete') {
      // Undo the delete
      undoDelete(lastAction.section, lastAction.item);
      setRedoStack(prev => [...prev, lastAction]);
    } else if (lastAction.type === 'undo') {
      // Redo the delete
      addDeletedItem(lastAction.section, lastAction.item);
      setRedoStack(prev => [...prev, lastAction]);
    }
    setHistory(prev => prev.slice(0, -1));
  }, [history, undoDelete, addDeletedItem]);

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
    undoTimeoutsRef.current.forEach((_, key) => { if (key.startsWith(`${section}|`)) keysToRemove.push(key); });

    keysToRemove.forEach(key => { const t = undoTimeoutsRef.current.get(key); if (t?.timeoutId) clearTimeout(t.timeoutId); });

    setUndoTimeouts(prev => {
      const newTimeouts = new Map(prev);
      keysToRemove.forEach(key => newTimeouts.delete(key));
      return newTimeouts;
    });

    setDeletedItems(prev => ({ ...prev, [section]: [] }));
  }, []);

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

  // Enhancement: expose history and redo/undo
  const value = {
    deletedItems,
    addDeletedItem,
    undoDelete,
    isItemDeleted,
    getDeletedItems,
    clearDeletedItems,
    getRemainingTime,
    getCountdown,
    // Enhanced features:
    history,
    redoStack,
    undoLast,
    redoDelete,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
};