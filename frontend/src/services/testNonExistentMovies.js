import { getMovieDetails, getSimilarMovies, checkMovieExists, clearNonExistentMovieCache, getNonExistentMovieCacheStats, addToNonExistentCache, isInNonExistentCache } from './tmdbService.js';

// Test script for non-existent movie handling
const testNonExistentMovies = async () => {
  console.log('🧪 Testing non-existent movie handling...');
  
  // Test movie IDs that don't exist
  const testMovieIds = [109974, 206992, 999999];
  
  console.log('\n📊 Current cache stats:');
  const stats = getNonExistentMovieCacheStats();
  console.log('Cache size:', stats.size);
  console.log('Known non-existent movies:', stats.knownNonExistent);
  
  console.log('\n🔍 Testing movie existence checks...');
  
  for (const movieId of testMovieIds) {
    console.log(`\n--- Testing movie ID: ${movieId} ---`);
    
    // Check if already in cache
    const isCached = isInNonExistentCache(movieId);
    console.log(`In non-existent cache: ${isCached}`);
    
    // Try to get movie details
    try {
      const details = await getMovieDetails(movieId);
      console.log(`Movie details result: ${details ? 'Found' : 'Not found'}`);
    } catch (error) {
      console.log(`Movie details error: ${error.message}`);
    }
    
    // Try to get similar movies
    try {
      const similar = await getSimilarMovies(movieId);
      console.log(`Similar movies result: ${similar ? 'Found' : 'Not found'}`);
    } catch (error) {
      console.log(`Similar movies error: ${error.message}`);
    }
    
    // Check if movie exists
    try {
      const exists = await checkMovieExists(movieId);
      console.log(`Movie exists check: ${exists}`);
    } catch (error) {
      console.log(`Exists check error: ${error.message}`);
    }
  }
  
  console.log('\n📊 Final cache stats:');
  const finalStats = getNonExistentMovieCacheStats();
  console.log('Cache size:', finalStats.size);
  console.log('Cached entries:', finalStats.entries);
  
  console.log('\n✅ Test completed!');
};

// Function to manually add a movie ID to the cache
const addMovieToCache = (movieId) => {
  console.log(`🔧 Manually adding movie ${movieId} to non-existent cache...`);
  addToNonExistentCache(movieId);
  console.log(`✅ Movie ${movieId} added to cache`);
};

// Function to clear cache and show results
const clearCache = () => {
  console.log('🧹 Clearing non-existent movie cache...');
  const clearedCount = clearNonExistentMovieCache();
  console.log(`✅ Cleared ${clearedCount} entries from cache`);
};

// Export functions for manual testing
export { testNonExistentMovies, addMovieToCache, clearCache };

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - make functions available globally
  window.testNonExistentMovies = testNonExistentMovies;
  window.addMovieToCache = addMovieToCache;
  window.clearCache = clearCache;
  
  console.log('🧪 Non-existent movie test functions available:');
  console.log('- testNonExistentMovies()');
  console.log('- addMovieToCache(movieId)');
  console.log('- clearCache()');
} 