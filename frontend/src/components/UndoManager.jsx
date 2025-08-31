import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndo } from '../contexts/UndoContext';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { useWatchlist } from '../contexts/EnhancedWatchlistContext';
import UndoToast from './UndoToast';

const MOBILE_NAV_HEIGHT_PX = 64; // approximate BottomNav height including padding

const exitVariants = {
  exit: (custom) => {
    const dir = (custom && custom.direction) || 'down';
    if (dir === 'left') return { opacity: 0, x: -64, scale: 0.96 };
    if (dir === 'right') return { opacity: 0, x: 64, scale: 0.96 };
    return { opacity: 0, y: 96, scale: 0.96 };
  }
};

const UndoManager = () => {
  const { deletedItems, undoDelete } = useUndo();
  const { restoreToContinueWatching } = useViewingProgress();
  const { restoreToWatchlist } = useWatchlist();
  const [activeToasts, setActiveToasts] = useState([]);

  // Compute only the latest item per section to prevent stale toasts on rapid triggers
  const latestToasts = useMemo(() => {
    const latest = [];
    if (deletedItems?.continueWatching?.length) {
      const cw = deletedItems.continueWatching.reduce((acc, cur) => {
        if (!acc) return cur;
        return (cur.deletedAt || 0) > (acc.deletedAt || 0) ? cur : acc;
      }, null);
      if (cw) latest.push({ ...cw, section: 'continueWatching' });
    }
    if (deletedItems?.watchlist?.length) {
      const wl = deletedItems.watchlist.reduce((acc, cur) => {
        if (!acc) return cur;
        return (cur.deletedAt || 0) > (acc.deletedAt || 0) ? cur : acc;
      }, null);
      if (wl) latest.push({ ...wl, section: 'watchlist' });
    }
    return latest;
  }, [deletedItems]);

  // Update active toasts from computed latest
  useEffect(() => {
    setActiveToasts(latestToasts);
  }, [latestToasts]);

  const handleUndo = (section, item) => {
    const restoredItem = undoDelete(section, item);
    if (section === 'continueWatching') {
      restoreToContinueWatching(restoredItem);
    } else if (section === 'watchlist') {
      restoreToWatchlist(restoredItem);
    }
  };

  const handleToastDismiss = (section, item, direction = 'down') => {
    const keyToRemove = `${section}-${item.deletedAt || '0'}`;
    // Mark the toast as exiting with direction, then remove after animation duration
    setActiveToasts(prev => prev.map(toast => {
      const key = `${toast.section}-${toast.deletedAt || '0'}`;
      if (key === keyToRemove) {
        return { ...toast, __exitDirection: direction, __isExiting: true };
      }
      return toast;
    }));

    // Remove after the exit animation completes
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(toast => {
        const key = `${toast.section}-${toast.deletedAt || '0'}`;
        return key !== keyToRemove;
      }));
    }, 300);
  };

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