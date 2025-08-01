// Cache Test Utility
import { addToNonExistentCache, isInNonExistentCache, getNonExistentMovieCacheStats } from '../services/tmdbService';

export const testCacheFunctionality = () => {
  console.log('🧪 Testing cache functionality...');
  
  // Test adding to cache
  addToNonExistentCache('221725', 'movie');
  addToNonExistentCache('211050', 'movie');
  
  // Test checking cache
  console.log('✅ movie_221725 in cache:', isInNonExistentCache('221725', 'movie'));
  console.log('✅ movie_211050 in cache:', isInNonExistentCache('211050', 'movie'));
  console.log('❌ movie_123456 in cache:', isInNonExistentCache('123456', 'movie'));
  
  // Get cache stats
  const stats = getNonExistentMovieCacheStats();
  console.log('📊 Cache stats:', stats);
  
  return stats;
};

export const clearCacheForTesting = () => {
  console.log('🧹 Clearing cache for testing...');
  // This would need to be implemented in the service
  // For now, we'll just log the action
  console.log('Cache cleared (simulated)');
}; 