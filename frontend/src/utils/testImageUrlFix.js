// Test utility to verify image URL fix
import { getTmdbImageUrl } from './imageUtils.js';

// Test cases for the image URL fix
export const testImageUrlFix = () => {
  console.log('🧪 Testing Image URL Fix...');
  
  // Test 1: Relative path (should work as before)
  const relativePath = '/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg';
  const result1 = getTmdbImageUrl(relativePath, 'w500');
  console.log('✅ Relative path test:', {
    input: relativePath,
    output: result1,
    expected: 'https://image.tmdb.org/t/p/w500/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg',
    passed: result1 === 'https://image.tmdb.org/t/p/w500/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg'
  });
  
  // Test 2: Full TMDB URL (should return as-is, preventing duplication)
  const fullTmdbUrl = 'https://image.tmdb.org/t/p/w500/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg';
  const result2 = getTmdbImageUrl(fullTmdbUrl, 'w500');
  console.log('✅ Full TMDB URL test:', {
    input: fullTmdbUrl,
    output: result2,
    expected: fullTmdbUrl,
    passed: result2 === fullTmdbUrl
  });
  
  // Test 3: Full non-TMDB URL (should return as-is)
  const fullNonTmdbUrl = 'https://example.com/image.jpg';
  const result3 = getTmdbImageUrl(fullNonTmdbUrl, 'w500');
  console.log('✅ Full non-TMDB URL test:', {
    input: fullNonTmdbUrl,
    output: result3,
    expected: fullNonTmdbUrl,
    passed: result3 === fullNonTmdbUrl
  });
  
  // Test 4: Path without leading slash (should add leading slash)
  const pathWithoutSlash = 'abWOCrIo7bbAORxcQyOFNJdnnmR.jpg';
  const result4 = getTmdbImageUrl(pathWithoutSlash, 'w500');
  console.log('✅ Path without slash test:', {
    input: pathWithoutSlash,
    output: result4,
    expected: 'https://image.tmdb.org/t/p/w500/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg',
    passed: result4 === 'https://image.tmdb.org/t/p/w500/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg'
  });
  
  // Test 5: Null/undefined path (should return null)
  const nullPath = null;
  const result5 = getTmdbImageUrl(nullPath, 'w500');
  console.log('✅ Null path test:', {
    input: nullPath,
    output: result5,
    expected: null,
    passed: result5 === null
  });
  
  // Test 6: Empty string path (should return null)
  const emptyPath = '';
  const result6 = getTmdbImageUrl(emptyPath, 'w500');
  console.log('✅ Empty path test:', {
    input: emptyPath,
    output: result6,
    expected: null,
    passed: result6 === null
  });
  
  // Test 7: Different size (should work with different sizes)
  const result7 = getTmdbImageUrl(relativePath, 'w780');
  console.log('✅ Different size test:', {
    input: relativePath,
    size: 'w780',
    output: result7,
    expected: 'https://image.tmdb.org/t/p/w780/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg',
    passed: result7 === 'https://image.tmdb.org/t/p/w780/abWOCrIo7bbAORxcQyOFNJdnnmR.jpg'
  });
  
  console.log('🎯 Image URL Fix Test Complete!');
  return {
    relativePath: result1,
    fullTmdbUrl: result2,
    fullNonTmdbUrl: result3,
    pathWithoutSlash: result4,
    nullPath: result5,
    emptyPath: result6,
    differentSize: result7
  };
};

// Export for use in components
export default testImageUrlFix; 