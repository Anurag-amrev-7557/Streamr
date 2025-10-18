/**
 * useVirtualScroll - Virtual scrolling implementation for large lists
 * Only renders visible items for better performance
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const DEFAULT_ITEM_HEIGHT = 300;
const DEFAULT_OVERSCAN = 3;
const DEFAULT_SCROLL_THROTTLE = 16;

export const useVirtualScroll = (options = {}) => {
  const {
    items = [],
    itemHeight = DEFAULT_ITEM_HEIGHT,
    containerHeight = 600,
    overscan = DEFAULT_OVERSCAN,
    scrollThrottle = DEFAULT_SCROLL_THROTTLE,
  } = options;

  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTimeoutRef = useRef(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index,
      style: {
        position: 'absolute',
        top: (visibleRange.startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    }));
  }, [items, visibleRange, itemHeight]);

  // Handle scroll with throttling
  const handleScroll = useCallback((event) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const target = event.target;
      if (target) {
        setScrollTop(target.scrollTop);
      }
    }, scrollThrottle);
  }, [scrollThrottle]);

  // Total height of the virtual list
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTop = scrollTop;
      setScrollTop(scrollTop);
    }
  }, [itemHeight]);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    handleScroll,
    scrollToIndex,
    visibleRange,
  };
};

export default useVirtualScroll;
