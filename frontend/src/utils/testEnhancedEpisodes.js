// Test utility for enhanced episode fetching
import enhancedEpisodeService from '../services/enhancedEpisodeService.js';

// Test TV show IDs (popular shows with multiple seasons)
const TEST_TV_SHOWS = [
  { id: 1399, name: 'Game of Thrones' },
  { id: 1396, name: 'Breaking Bad' },
  { id: 1398, name: 'Stranger Things' },
  { id: 1390, name: 'The Walking Dead' },
  { id: 1392, name: 'The Big Bang Theory' }
];

export const testEnhancedEpisodeFetching = async () => {
  console.log('🧪 Testing Enhanced Episode Fetching...');
  
  const results = {
    success: 0,
    failed: 0,
    details: []
  };

  for (const show of TEST_TV_SHOWS) {
    try {
      console.log(`\n📺 Testing: ${show.name} (ID: ${show.id})`);
      
      // Test 1: Get all seasons metadata
      console.log('  → Fetching seasons metadata...');
      const seasons = await enhancedEpisodeService.getAllSeasons(show.id);
      console.log(`  ✅ Found ${seasons.length} seasons`);
      
      // Test 2: Get first season details
      if (seasons.length > 0) {
        const firstSeason = seasons[0];
        console.log(`  → Fetching season ${firstSeason.season_number} details...`);
        const seasonDetails = await enhancedEpisodeService.getSeason(show.id, firstSeason.season_number);
        console.log(`  ✅ Found ${seasonDetails.episodes?.length || 0} episodes`);
        
        // Test 3: Get season stats
        console.log('  → Fetching season stats...');
        const stats = await enhancedEpisodeService.getSeasonStats(show.id, firstSeason.season_number);
        console.log(`  ✅ Stats: ${stats?.total_episodes} episodes, avg rating: ${stats?.average_rating?.toFixed(1) || 'N/A'}`);
        
        // Test 4: Progressive loading
        console.log('  → Testing progressive loading...');
        const progressive = await enhancedEpisodeService.getEpisodesProgressive(show.id, firstSeason.season_number, {
          page: 1,
          pageSize: 5
        });
        console.log(`  ✅ Progressive: ${progressive.episodes.length} episodes, hasMore: ${progressive.hasMore}`);
        
        // Test 5: Search episodes
        if (seasonDetails.episodes?.length > 0) {
          console.log('  → Testing episode search...');
          const searchResults = await enhancedEpisodeService.searchEpisodes(show.id, firstSeason.season_number, 'episode');
          console.log(`  ✅ Search results: ${searchResults.length} episodes`);
        }
        
        results.success++;
        results.details.push({
          show: show.name,
          seasons: seasons.length,
          episodes: seasonDetails.episodes?.length || 0,
          status: 'success'
        });
      }
      
    } catch (error) {
      console.error(`  ❌ Error testing ${show.name}:`, error.message);
      results.failed++;
      results.details.push({
        show: show.name,
        error: error.message,
        status: 'failed'
      });
    }
  }
  
  // Test cache functionality
  console.log('\n🗄️ Testing cache functionality...');
  try {
    const cacheStats = enhancedEpisodeService.getCacheStats();
    console.log(`  ✅ Cache size: ${cacheStats.size} entries`);
    console.log(`  ✅ Memory usage: ~${Math.round(cacheStats.memoryUsage / 1024)}KB`);
  } catch (error) {
    console.error('  ❌ Cache test failed:', error.message);
  }
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.success / (results.success + results.failed)) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detailed Results:');
  results.details.forEach(detail => {
    if (detail.status === 'success') {
      console.log(`  ✅ ${detail.show}: ${detail.seasons} seasons, ${detail.episodes} episodes`);
    } else {
      console.log(`  ❌ ${detail.show}: ${detail.error}`);
    }
  });
  
  return results;
};

export const testEpisodePerformance = async () => {
  console.log('\n⚡ Testing Episode Fetching Performance...');
  
  const testShow = TEST_TV_SHOWS[0]; // Use Game of Thrones for performance test
  const iterations = 3;
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    console.log(`\n🔄 Iteration ${i + 1}/${iterations}`);
    
    const startTime = performance.now();
    
    try {
      // Clear cache for fair testing
      enhancedEpisodeService.clearCache();
      
      // Fetch seasons
      const seasons = await enhancedEpisodeService.getAllSeasons(testShow.id);
      
      // Fetch first season
      if (seasons.length > 0) {
        await enhancedEpisodeService.getSeason(testShow.id, seasons[0].season_number);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      results.push(duration);
      console.log(`  ✅ Completed in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      console.error(`  ❌ Iteration ${i + 1} failed:`, error.message);
    }
  }
  
  if (results.length > 0) {
    const avgDuration = results.reduce((sum, time) => sum + time, 0) / results.length;
    const minDuration = Math.min(...results);
    const maxDuration = Math.max(...results);
    
    console.log('\n📊 Performance Results:');
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min: ${minDuration.toFixed(2)}ms`);
    console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
    
    // Performance rating
    let rating = 'Excellent';
    if (avgDuration > 2000) rating = 'Poor';
    else if (avgDuration > 1000) rating = 'Fair';
    else if (avgDuration > 500) rating = 'Good';
    
    console.log(`  Rating: ${rating}`);
  }
  
  return results;
};

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - expose to window for manual testing
  window.testEnhancedEpisodes = {
    testEnhancedEpisodeFetching,
    testEpisodePerformance,
    enhancedEpisodeService
  };
  
  console.log('🧪 Enhanced Episode Tests available at window.testEnhancedEpisodes');
  console.log('Run: window.testEnhancedEpisodes.testEnhancedEpisodeFetching()');
  console.log('Run: window.testEnhancedEpisodes.testEpisodePerformance()');
} 