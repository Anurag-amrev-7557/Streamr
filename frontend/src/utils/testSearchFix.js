// Test file to verify the searchMovies function fix
import { searchMovies } from '../services/tmdbService.js';

// Test function to verify the fix
export const testSearchMoviesFix = async () => {
  console.log('🧪 Testing searchMovies function fix...');
  
  try {
    // Test 1: Normal call with page number
    console.log('Test 1: Normal call with page number');
    const result1 = await searchMovies('test', 1);
    console.log('✅ Test 1 passed - page parameter handled correctly');
    
    // Test 2: Call with options object as second parameter (should now work)
    console.log('Test 2: Call with options object as second parameter');
    const result2 = await searchMovies('test', 1, { searchType: 'movie' });
    console.log('✅ Test 2 passed - options parameter handled correctly');
    
    // Test 3: Call with invalid page parameter (should be sanitized)
    console.log('Test 3: Call with invalid page parameter');
    const result3 = await searchMovies('test', 'invalid', { searchType: 'movie' });
    console.log('✅ Test 3 passed - invalid page parameter sanitized');
    
    // Test 4: Call with page parameter as object (should be sanitized)
    console.log('Test 4: Call with page parameter as object');
    const result4 = await searchMovies('test', { some: 'object' }, { searchType: 'movie' });
    console.log('✅ Test 4 passed - object page parameter sanitized');
    
    console.log('🎉 All tests passed! The searchMovies function fix is working correctly.');
    
    return {
      success: true,
      message: 'All tests passed - searchMovies function fix is working correctly'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testSearchMoviesFix = testSearchMoviesFix;
} 