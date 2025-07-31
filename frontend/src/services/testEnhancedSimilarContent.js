// Test script for enhanced similar content service
import { similarContentUtils } from './enhancedSimilarContentService.js';

// Clear all similar content cache to ensure fresh results
console.log('🧹 Clearing all similar content cache...');
similarContentUtils.clearAllSimilarContentCache();

// Test with a few different movies to verify different results
const testMovies = [
  { id: 550, type: 'movie', name: 'Fight Club' },
  { id: 13, type: 'movie', name: 'Forrest Gump' },
  { id: 238, type: 'movie', name: 'The Godfather' },
  { id: 680, type: 'movie', name: 'Pulp Fiction' }
];

console.log('🧪 Testing similar content for different movies...');

for (const movie of testMovies) {
  console.log(`\n📽️ Testing similar content for: ${movie.name} (ID: ${movie.id})`);
  
  try {
    const results = await similarContentUtils.getSimilarContent(movie.id, movie.type, {
      limit: 10,
      minScore: 0.1,
      forceRefresh: true // Force refresh to bypass cache
    });
    
    console.log(`✅ Found ${results.length} similar movies:`);
    results.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title || item.name} (Score: ${item.similarityScore?.toFixed(2) || 'N/A'})`);
    });
    
    // Check for duplicate IDs
    const ids = results.map(item => item.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.warn(`⚠️ Found ${ids.length - uniqueIds.size} duplicate IDs in results`);
    }
    
  } catch (error) {
    console.error(`❌ Error testing ${movie.name}:`, error);
  }
}

console.log('\n✅ Test completed! Check the results above to verify different similar content for each movie.'); 