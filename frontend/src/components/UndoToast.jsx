import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useAnimationFrame } from 'framer-motion';
import { useUndo } from '../contexts/UndoContext';
import { getTmdbImageUrl } from '../utils/imageUtils';

const H_SWIPE_DISMISS_THRESHOLD = 35; // Optimized threshold for smooth dismissal
const FINISH_ANIMATION_MS = 300; // Slightly longer for smoother animation


const variants = {
  initial: { opacity: 0, y: 20, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exitDown: { opacity: 0, y: 20, scale: 0.9 },
  exitLeft: { opacity: 0, y: 20, scale: 0.9 },
  exitRight: { opacity: 0, y: 20, scale: 0.9 },
};

const UndoToast = ({ section, item, onUndo, onDismiss }) => {
  const { getCountdown, undoDelete } = useUndo();
  const [animateOut, setAnimateOut] = useState(null); // null| 'exitDown' | 'exitLeft' | 'exitRight'
  const [progressPercent, setProgressPercent] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [shouldRemove, setShouldRemove] = useState(false);
  const hasScheduledFinishRef = useRef(false);

  // Reset state when movie changes
  useEffect(() => {
    setShouldRemove(false);
    setAnimateOut(null);
  }, [item?.id]);

  const sectionLabel = useMemo(() => (
    section === 'continueWatching' ? 'Removed from Continue Watching' : 'Removed from Watchlist'
  ), [section]);

  const thumbnailUrl = useMemo(() => {
    if (item?.thumbnailUrl) return item.thumbnailUrl;
    const path = item?.poster_path || item?.backdrop_path || null;
    if (!path) return null;
    return getTmdbImageUrl(path, 'w154');
  }, [item?.thumbnailUrl, item?.poster_path, item?.backdrop_path]);

  // Drive progress with animation frame for smoothness
  useAnimationFrame(() => {
    if (animateOut || isDragging) return;
    const { remainingMs, totalMs } = getCountdown(section, item);
    if (totalMs <= 0) return;
    const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
    setProgressPercent(pct);

    if (pct <= 0.01 && !hasScheduledFinishRef.current) {
      hasScheduledFinishRef.current = true;
      setAnimateOut('exitDown');
      // Wait for animation to complete before removing
      setTimeout(() => {
        setShouldRemove(true);
      }, 500);
      // Call onDismiss after component is removed
      setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 600);
    }
  });

  const handleUndo = useCallback(() => {
    const restoredItem = undoDelete(section, item);
    if (onUndo) onUndo(restoredItem);
    setAnimateOut('exitDown');
    // Wait for animation to complete before removing
    setTimeout(() => {
      setShouldRemove(true);
    }, 500);
    // Call onDismiss after component is removed
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 600);
  }, [section, item, undoDelete, onUndo, onDismiss]);

  const handleDismiss = useCallback(() => {
    setAnimateOut('exitDown');
    // Wait for animation to complete before removing
    setTimeout(() => {
      setShouldRemove(true);
    }, 500);
    // Call onDismiss after component is removed
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 600);
  }, [onDismiss]);



  return (
    <AnimatePresence mode="wait">
      {!shouldRemove && (
        <motion.div
          key="undo-toast"
          role="status"
          aria-live="polite"
          variants={variants}
          initial="initial"
          animate={animateOut ? animateOut : "animate"}
          exit={animateOut || 'exitDown'}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pointer-events-auto"
        >
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            dragTransition={{ 
              bounceStiffness: 600, 
              bounceDamping: 20
            }}
            onDragStart={() => {
              setIsDragging(true);
            }}
            onDragEnd={(_, info) => {
              setIsDragging(false);
              // Any horizontal drag will dismiss the toast
              if (Math.abs(info.offset.x) > 5) { // Small threshold to detect intentional drag
                const direction = info.offset.x > 0 ? 'exitRight' : 'exitLeft';
                setAnimateOut(direction);
                // Wait for animation to complete before removing
                setTimeout(() => {
                  setShouldRemove(true);
                }, 500);
                // Call onDismiss after component is removed
                setTimeout(() => {
                  if (onDismiss) onDismiss();
                }, 600);
              }
            }}
            className="relative mx-auto max-w-7xl bg-white/90 dark:bg-black/75 backdrop-blur-xl border border.black/10 dark:border-white/10 rounded-2xl shadow-xl px-3.5 py-3 md:px-4 md:py-3.5 text-sm md:text-[13px] text-black dark:text-white cursor-grab active:cursor-grabbing"
          >
            <div className="absolute left-2 md:left-2.5 top-[0.3px] md:top-[0.3px] right-2 md:right-2.5 h-[2px] bg-black/10 dark:bg-white/10 overflow-hidden rounded-full" aria-hidden="true">
                              <motion.div
                  className="h-full bg-black/70 dark:bg-white/80 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
            </div>
            


                          <div className="flex items-center gap-3 md:gap-3.5 min-w-0 relative">
                {/* Enhanced swipe hint indicator */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-r from-transparent to-black/20 dark:to-white/20 rounded-r-full opacity-60" />
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-l from-transparent to-black/20 dark:to-white/20 rounded-l-full opacity-60" />
              {/* Thumbnail */}
              <div className="shrink-0 rounded-md overflow-hidden bg-black/10 dark:bg-white/10 w-12 h-12 md:w-10 md:h-10">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={(item?.title || item?.name || 'Thumbnail') + ' poster'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />)
                  : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] md:text-[9px] opacity-60">
                    No image
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium leading-5 truncate opacity-90">
                  {sectionLabel}
                </p>
                <p className="text-xs opacity-70 truncate">
                  {item.title || item.name || 'Untitled'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleUndo}
                  className="px-3 md:px-3.5 h-9 md:h-8 min-w-[64px] md:min-w-[56px] rounded-lg border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors text-[13px] md:text-xs font-semibold tracking-wide"
                >
                  Undo
                </motion.button>
                {/* Cross button - only visible on desktop */}
                <button
                  onClick={handleDismiss}
                  aria-label="Dismiss notification"
                  className="hidden md:flex p-2 md:p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    );
  };

export default UndoToast; 