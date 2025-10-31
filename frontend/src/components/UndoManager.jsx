import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndo } from '../contexts/UndoContext';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import UndoToast from './UndoToast';

const MOBILE_NAV_HEIGHT_PX = 64; // approximate BottomNav height including padding

const EXIT_ANIM_MS = 300; // keep in sync with motion transition duration

const exitVariants = {
  exit: (custom) => {
    const dir = (custom && custom.direction) || 'down';
    if (dir === 'left') return { opacity: 0, x: -64, scale: 0.96 };
    if (dir === 'right') return { opacity: 0, x: 64, scale: 0.96 };
    // Enhanced slide down animation for timer completion
    return { 
      opacity: 0, 
      y: 100, 
      scale: 0.96,
      transition: { duration: 0.3, ease: 'easeInOut' }
    };
  }
};

const UndoManager = () => {
  const { deletedItems, undoDelete } = useUndo();
  const { restoreToContinueWatching } = useViewingProgress();
  const { restoreToWatchlist } = useWatchlist();
  const [activeToasts, setActiveToasts] = useState([]);
  const dismissalTimersRef = useRef(new Map());
  const mountedRef = useRef(true);

  // Compute only the latest item per section to prevent stale toasts on rapid triggers
  // Build a stable key per toast to allow merges and safe removal
  const latestToasts = useMemo(() => {
    const latest = [];
    const makeEntry = (cur, section) => {
      if (!cur) return null;
      const idPart = cur.id || cur.tmdb_id || 'x';
      const ts = cur.deletedAt || '0';
      const key = `${section}-${idPart}-${ts}`;
      return { ...cur, section, __key: key };
    };

    if (deletedItems?.continueWatching?.length) {
      const cw = deletedItems.continueWatching.reduce((acc, cur) => {
        if (!acc) return cur;
        return (cur.deletedAt || 0) > (acc.deletedAt || 0) ? cur : acc;
      }, null);
      const entry = makeEntry(cw, 'continueWatching');
      if (entry) latest.push(entry);
    }
    if (deletedItems?.watchlist?.length) {
      const wl = deletedItems.watchlist.reduce((acc, cur) => {
        if (!acc) return cur;
        return (cur.deletedAt || 0) > (acc.deletedAt || 0) ? cur : acc;
      }, null);
      const entry = makeEntry(wl, 'watchlist');
      if (entry) latest.push(entry);
    }
    return latest;
  }, [deletedItems]);

  // Merge latest toasts into activeToasts while preserving exiting state
  useEffect(() => {
    setActiveToasts(prev => {
      // Keep existing toasts (unless replaced) to preserve __isExiting and __exitDirection
      const byKey = new Map(prev.map(t => [t.__key || `${t.section}-${t.deletedAt || '0'}`, t]));
      // Add or replace with latest entries
      latestToasts.forEach(item => {
        const existing = byKey.get(item.__key);
        if (existing) {
          // merge fields but keep exit flags
          byKey.set(item.__key, { ...item, __isExiting: existing.__isExiting, __exitDirection: existing.__exitDirection });
        } else {
          byKey.set(item.__key, item);
        }
      });
      // Return as array preserving insertion order of latestToasts first, then any remaining older ones
      const ordered = [];
      latestToasts.forEach(item => {
        const v = byKey.get(item.__key);
        if (v) ordered.push(v);
        byKey.delete(item.__key);
      });
      // append others (unlikely)
      for (const v of byKey.values()) ordered.push(v);
      return ordered;
    });
  }, [latestToasts]);

  const removeToastByKey = useCallback((key) => {
    // clear any pending timer
    const t = dismissalTimersRef.current.get(key);
    if (t) {
      clearTimeout(t);
      dismissalTimersRef.current.delete(key);
    }
    setActiveToasts(prev => prev.filter(toast => toast.__key !== key));
  }, []);

  const handleUndo = useCallback(async (section, item) => {
    const key = item.__key;
    // clear any pending removal
    const timer = dismissalTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      dismissalTimersRef.current.delete(key);
    }
    try {
      const maybe = undoDelete(section, item);
      const restoredItem = await Promise.resolve(maybe);
      if (section === 'continueWatching') {
        restoreToContinueWatching(restoredItem);
      } else if (section === 'watchlist') {
        restoreToWatchlist(restoredItem);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Undo failed', err);
    } finally {
      removeToastByKey(key);
    }
  }, [undoDelete, restoreToContinueWatching, restoreToWatchlist, removeToastByKey]);

  const handleToastDismiss = useCallback((section, item, direction = 'down') => {
    const key = item.__key;
    setActiveToasts(prev => prev.map(toast => toast.__key === key ? { ...toast, __exitDirection: direction, __isExiting: true } : toast));

    // schedule removal after exit animation
    const t = setTimeout(() => {
      // avoid setState if unmounted
      if (!mountedRef.current) return;
      setActiveToasts(prev => prev.filter(toast => toast.__key !== key));
      dismissalTimersRef.current.delete(key);
    }, EXIT_ANIM_MS);
    // store timer so it can be cleared if undo happens
    dismissalTimersRef.current.set(key, t);
  }, []);

  // cleanup timers on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const t of dismissalTimersRef.current.values()) {
        clearTimeout(t);
      }
      dismissalTimersRef.current.clear();
    };
  }, []);

  if (activeToasts.length === 0) return null;

  return (
    <>
      {/* Mobile container: centered above BottomNav with safe-area */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-stretch w-[calc(100%-1rem)] pointer-events-none md:hidden"
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_NAV_HEIGHT_PX + 12}px)` }}
      >
        <AnimatePresence>
          {activeToasts.map((item, index) => (
            <motion.div
              key={`${item.section}-${item.deletedAt || '0'}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              variants={exitVariants}
              exit="exit"
              custom={{ direction: item.__exitDirection }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="pointer-events-auto"
            >
              <UndoToast
                section={item.section}
                item={item}
                onUndo={() => handleUndo(item.section, item)}
                onDismiss={(direction) => handleToastDismiss(item.section, item, direction)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Desktop container: bottom-right */}
      <div
        className="fixed bottom-4 right-4 z-50 hidden md:flex md:flex-col md:gap-3 md:items-end pointer-events-none"
      >
        <AnimatePresence>
          {activeToasts.map((item, index) => (
            <motion.div
              key={`${item.section}-${item.deletedAt || '0'}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              variants={exitVariants}
              exit="exit"
              custom={{ direction: item.__exitDirection }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="pointer-events-auto"
            >
              <UndoToast
                section={item.section}
                item={item}
                onUndo={() => handleUndo(item.section, item)}
                onDismiss={(direction) => handleToastDismiss(item.section, item, direction)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default UndoManager; 