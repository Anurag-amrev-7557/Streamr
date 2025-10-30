import { useEffect, useState } from 'react';

// Hook to respect the user's reduced-motion preference and fall back safely
export default function useReducedMotion() {
  const isClient = typeof window !== 'undefined';
  const getPref = () => {
    if (!isClient) return true;
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      return false;
    }
  };

  const [reduced, setReduced] = useState(getPref);

  useEffect(() => {
    if (!isClient || !window.matchMedia) return undefined;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(!!e.matches);

    if (mql.addEventListener) mql.addEventListener('change', handler);
    else if (mql.addListener) mql.addListener(handler);

    // sync
    setReduced(!!mql.matches);

    return () => {
      try {
        if (mql.removeEventListener) mql.removeEventListener('change', handler);
        else if (mql.removeListener) mql.removeListener(handler);
      } catch (_) {}
    };
  }, [isClient]);

  return reduced;
}
