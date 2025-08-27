import { useEffect, useRef, useCallback } from 'react';
import performanceOptimizationService from '../services/performanceOptimizationService';

/**
 * Hook to manage persistent cache and prevent unnecessary re-fetching
 * when navigating back to the homepage
 */
export const usePersistentCache = () => {
  const isInitialized = useRef(false);
  const cacheInitialized = useRef(false);

  // Initialize cache if not already done
  const initializeCache = useCallback(() => {
    if (cacheInitialized.current) return;
    
    try {
      // Check if we have cached data
      const hasCachedData = performanceOptimizationService.getCacheStats().totalEntries > 0;
      
      if (hasCachedData) {
        console.log('🔄 Using existing persistent cache');
        cacheInitialized.current = true;
        return true;
      }
      
      cacheInitialized.current = true;
      return false;
    } catch (error) {
      console.warn('Failed to initialize cache:', error);
      return false;
    }
  }, []);

  // Check if section is cached
  const isSectionCached = useCallback((sectionKey) => {
    return performanceOptimizationService.isSectionCached(sectionKey);
  }, []);

  // Get cached data for a section
  const getCachedSection = useCallback((sectionKey) => {
    return performanceOptimizationService.getCachedSection(sectionKey);
  }, []);

  // Set cached data for a section
  const setCachedSection = useCallback((sectionKey, data) => {
    performanceOptimizationService.setCachedSection(sectionKey, data);
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return performanceOptimizationService.getCacheStats();
  }, []);

  // Clear cache (useful for testing or manual refresh)
  const clearCache = useCallback(() => {
    performanceOptimizationService.clearPersistentCache();
    cacheInitialized.current = false;
    console.log('🗑️ Persistent cache cleared');
  }, []);

  // Check if we should skip initial loading (all critical sections cached)
  const shouldSkipInitialLoading = useCallback(() => {
    const criticalSections = ['featured', 'trending'];
    return criticalSections.every(section => isSectionCached(section));
  }, [isSectionCached]);

  // Initialize on mount
  useEffect(() => {
    if (isInitialized.current) return;
    
    initializeCache();
    isInitialized.current = true;
    
    // Cleanup on unmount
    return () => {
      // Save cache before unmounting
      try {
        performanceOptimizationService.savePersistentCache();
      } catch (error) {
        console.warn('Failed to save cache on unmount:', error);
      }
    };
  }, [initializeCache]);

  return {
    isSectionCached,
    getCachedSection,
    setCachedSection,
    getCacheStats,
    clearCache,
    shouldSkipInitialLoading,
    isInitialized: isInitialized.current
  };
}; 