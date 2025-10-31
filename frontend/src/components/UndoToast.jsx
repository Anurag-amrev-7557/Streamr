import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useUndo } from '../contexts/UndoContext';
import { getTmdbImageUrl } from '../utils/imageUtils';

const H_SWIPE_DISMISS_THRESHOLD = 35; // Optimized threshold for smooth dismissal

const UndoToast = ({ section, item, onUndo, onDismiss }) => {
  const { getCountdown, undoDelete } = useUndo();
  const [isDragging, setIsDragging] = useState(false);
  const durationMsRef = useRef(5000);
  const keyframesNameRef = useRef('');
  const styleElRef = useRef(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const onDismissRef = useRef(null);
  const onUndoRef = useRef(null);
  const [animState, setAnimState] = useState({ name: '', durationMs: 0 });
  // Respect user reduced-motion preference when available
  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (e) {
        return false;
      }
    }
    return false;
  }, []);

  // Setup progress keyframes and auto-dismiss timer
  // Keep refs to latest callbacks to avoid stale closures
  useEffect(() => {
    onDismissRef.current = onDismiss;
    onUndoRef.current = onUndo;
  }, [onDismiss, onUndo]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const keyframesName = useMemo(() => {
    const unique = `${section}-${item?.id || 'x'}-${item?.deletedAt || '0'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `undo_progress_${unique}`;
  }, [section, item?.id, item?.deletedAt]);

  useEffect(() => {
    const { remainingMs } = getCountdown(section, item) || {};
    const ms = Math.max(0, remainingMs || 0);
    durationMsRef.current = ms;
    keyframesNameRef.current = keyframesName;

    // Only recreate style element when name changed
    if (!styleElRef.current || styleElRef.current.getAttribute('data-undo-progress') !== keyframesName) {
      if (styleElRef.current && styleElRef.current.parentNode) {
        styleElRef.current.parentNode.removeChild(styleElRef.current);
      }
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-undo-progress', keyframesName);
      styleEl.textContent = `@keyframes ${keyframesName} { 0% { transform: scaleX(1) } 100% { transform: scaleX(0) } }`;
      document.head.appendChild(styleEl);
      styleElRef.current = styleEl;
    }

    setAnimState({ name: keyframesName, durationMs: ms });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (ms > 0 && !prefersReducedMotion) {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) onDismissRef.current?.('down');
      }, ms + 50);
    } else if (ms <= 0) {
      // If there's no time remaining, dismiss immediately (next tick) to avoid leaving stale toasts
      setTimeout(() => {
        if (isMountedRef.current) onDismissRef.current?.('down');
      }, 0);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // keep style element until replaced by another with a new name to avoid flicker
    };
  }, [section, item, getCountdown, keyframesName, prefersReducedMotion]);

  const sectionLabel = useMemo(() => (
    section === 'continueWatching' ? 'Removed from Continue Watching' : 'Removed from Watchlist'
  ), [section]);

  const thumbnailUrl = useMemo(() => {
    if (item?.thumbnailUrl) return item.thumbnailUrl;
    const path = item?.poster_path || item?.backdrop_path || null;
    if (!path) return null;
    return getTmdbImageUrl(path, 'w154');
  }, [item?.thumbnailUrl, item?.poster_path, item?.backdrop_path]);

  // Progress is driven by CSS keyframes; timer triggers onDismiss when complete.

  const handleUndo = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      const maybePromise = undoDelete(section, item);
      const restoredItem = await Promise.resolve(maybePromise);
      onUndoRef.current?.(restoredItem);
    } catch (err) {
      // swallow errors from undoDelete here; parent may surface if needed
      // eslint-disable-next-line no-console
      console.error('undoDelete failed', err);
    } finally {
      onDismissRef.current?.('right');
    }
  }, [section, item, undoDelete]);

  const handleDismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onDismissRef.current?.('down');
  }, []);



  return (
    <motion.div
      role="status"
      aria-live="polite"
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
          if (info.offset.x >= H_SWIPE_DISMISS_THRESHOLD) {
            handleUndo();
          } else if (info.offset.x <= -H_SWIPE_DISMISS_THRESHOLD) {
            onDismissRef.current?.('left');
          }
        }}
        className="relative mx-auto max-w-7xl bg-white/90 dark:bg-black/75 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-xl px-3.5 py-3 md:px-4 md:py-3.5 text-sm md:text-[13px] text-black dark:text-white cursor-grab active:cursor-grabbing"
        tabIndex={0}
        onKeyDown={(e) => {
          const isActivate = e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space';
          if (isActivate) {
            e.preventDefault();
            handleUndo();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            handleDismiss();
          }
        }}
      >
        <div className="absolute left-2 md:left-2.5 top-[0.3px] md:top-[0.3px] right-2 md:right-2.5 h-[2px] bg-black/10 dark:bg-white/10 overflow-hidden rounded-full" aria-hidden="true">
          <div
              style={{
              transformOrigin: 'left',
              animationName: animState.name,
              animationDuration: `${prefersReducedMotion ? 0 : animState.durationMs}ms`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
              animationIterationCount: 1,
              animationDirection: 'normal',
              animationDelay: '0ms',
              animationPlayState: (isDragging || prefersReducedMotion) ? 'paused' : 'running',
              willChange: 'transform'
            }}
            className="h-full bg-black/70 dark:bg-white/80 rounded-full"
          />
        </div>

        <div className="flex items-center gap-3 md:gap-3.5 min-w-0 relative">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-r from-transparent to-black/20 dark:to-white/20 rounded-r-full opacity-60" />
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-l from-transparent to-black/20 dark:to-white/20 rounded-l-full opacity-60" />
          <div className="shrink-0 rounded-md overflow-hidden bg-black/10 dark:bg-white/10 w-12 h-12 md:w-10 md:h-10">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={(item?.title || item?.name || 'Thumbnail') + ' poster'}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
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
  );
  };

export default UndoToast; 