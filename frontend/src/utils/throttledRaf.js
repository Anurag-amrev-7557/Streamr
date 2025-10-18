// Improved, per-caller throttled requestAnimationFrame helper
// Exports scheduleRaf(cb, options) and cancelRaf(id)
// scheduleRaf returns an object id that can be used to cancel via cancelRaf

const defaultTargetFps = 25; // lower default to reduce GPU/CPU churn
let nextId = 1;
const handles = new Map();

/**
 * Schedule a callback on the next animation frame, throttled to a target FPS.
 * Returns an id that can be passed to cancelRaf. If document is hidden, returns null.
 * options: { targetFps, delay, immediate }
 */
export function scheduleRaf(cb, options = {}) {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return null;

  const targetFps = options.targetFps || defaultTargetFps;
  const minMs = 1000 / targetFps;

  // Do not schedule while page is hidden
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return null;

  const id = nextId++;

  let timeoutId = null;
  let rafId = null;
  let finished = false;

  const runCb = (ts) => {
    if (finished) return;
    try {
      cb(ts);
    } catch (e) {
      console.error('scheduleRaf callback error', e);
    } finally {
      // cleanup handle once executed to avoid unbounded growth
      finished = true;
      handles.delete(id);
    }
  };

  const schedule = () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      // don't schedule while hidden
      finished = true;
      handles.delete(id);
      return;
    }

    try {
      rafId = requestAnimationFrame((ts) => runCb(ts));
    } catch (e) {
      // Fallback to setTimeout if rAF throws
      timeoutId = setTimeout(() => runCb(performance.now()), Math.max(0, minMs));
    }
  };

  if (options.immediate) {
    // schedule on next tick immediately
    schedule();
  } else {
    const delay = Math.max(0, (options.delay || minMs));
    timeoutId = setTimeout(schedule, delay);
  }

  handles.set(id, { timeoutId, rafId });
  return id;
}

export function cancelRaf(id) {
  if (!id) return;
  const handle = handles.get(id);
  if (!handle) return;
  try {
    if (handle.rafId) cancelAnimationFrame(handle.rafId);
    if (handle.timeoutId) clearTimeout(handle.timeoutId);
  } catch (e) {
    // ignore
  }
  handles.delete(id);
}

export default { scheduleRaf, cancelRaf };
