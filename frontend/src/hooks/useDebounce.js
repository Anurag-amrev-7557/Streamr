import { useState, useRef, useEffect } from 'react';

/**
 * useDebounce hook
 * 
 * Returns a debounced value that only updates after the specified delay
 * has passed without the value changing. Also provides a cancel method
 * to clear any pending debounce.
 * 
 * @param {*} value - The value to debounce
 * @param {number} delay - The debounce delay in milliseconds
 * @returns {[any, Function]} - [debouncedValue, cancelDebounce]
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const handlerRef = useRef(null);

  // Cancel function to clear the timeout
  const cancel = () => {
    if (handlerRef.current) {
      clearTimeout(handlerRef.current);
      handlerRef.current = null;
    }
  };

  useEffect(() => {
    cancel();
    handlerRef.current = setTimeout(() => {
      setDebouncedValue(value);
      handlerRef.current = null;
    }, delay);

    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  // Optionally, update debouncedValue immediately if delay is 0
  useEffect(() => {
    if (delay === 0) {
      setDebouncedValue(value);
      cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  return [debouncedValue, cancel];
};