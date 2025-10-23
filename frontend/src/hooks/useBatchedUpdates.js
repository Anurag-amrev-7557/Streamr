/**
 * useBatchedUpdates - Batch multiple state updates to reduce re-renders
 */
import { useCallback, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom';

const DEFAULT_BATCH_DELAY = 50;

export const useBatchedUpdates = (options = {}) => {
  const {
    batchDelay = DEFAULT_BATCH_DELAY,
  } = options;

  const updateQueueRef = useRef([]);
  const batchTimeoutRef = useRef(null);

  // Execute all queued updates
  const executeBatch = useCallback(() => {
    if (updateQueueRef.current.length === 0) return;

    unstable_batchedUpdates(() => {
      updateQueueRef.current.forEach(updateFn => {
        try {
          updateFn();
        } catch (error) {
          console.error('Error executing batched update:', error);
        }
      });
    });

    updateQueueRef.current = [];
  }, []);

  // Queue an update
  const queueUpdate = useCallback((updateFn) => {
    updateQueueRef.current.push(updateFn);

    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Schedule batch execution
    batchTimeoutRef.current = setTimeout(() => {
      executeBatch();
    }, batchDelay);
  }, [batchDelay, executeBatch]);

  // Force immediate batch execution
  const flushUpdates = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    executeBatch();
  }, [executeBatch]);

  return {
    queueUpdate,
    flushUpdates,
  };
};

export default useBatchedUpdates;
