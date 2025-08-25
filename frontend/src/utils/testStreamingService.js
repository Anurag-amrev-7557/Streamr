// Test utility for streaming service
import { 
  getMovieStreamingUrl, 
  getTVStreamingUrl, 
  getAllStreamingUrls,
  getAvailableStreamingServices,
  STREAMING_SERVICES 
} from '../services/streamingService';

export const testStreamingService = () => {
  console.log('🧪 Testing Streaming Service...');
  
  // Test movie URLs
  const movieId = 'tt0111161'; // The Shawshank Redemption
  console.log('\n📽️ Testing Movie URLs:');
  console.log('Movie ID:', movieId);
  
  Object.keys(STREAMING_SERVICES).forEach(serviceKey => {
    const url = getMovieStreamingUrl(movieId, serviceKey);
    console.log(`${serviceKey}:`, url);
  });
  
  // Test TV show URLs
  const tvShowId = 'tt0944947'; // Game of Thrones
  const season = 1;
  const episode = 1;
  console.log('\n📺 Testing TV Show URLs:');
  console.log('TV Show ID:', tvShowId, 'Season:', season, 'Episode:', episode);
  
  Object.keys(STREAMING_SERVICES).forEach(serviceKey => {
    const url = getTVStreamingUrl(tvShowId, season, episode, serviceKey);
    console.log(`${serviceKey}:`, url);
  });
  
  // Test getAllStreamingUrls
  console.log('\n🔗 Testing getAllStreamingUrls:');
  const movieContent = { id: movieId, type: 'movie' };
  const tvContent = { id: tvShowId, type: 'tv', season, episode };
  
  console.log('Movie URLs:', getAllStreamingUrls(movieContent));
  console.log('TV Show URLs:', getAllStreamingUrls(tvContent));
  
  // Test getAvailableStreamingServices
  console.log('\n🎯 Testing getAvailableStreamingServices:');
  console.log('Movie Services:', getAvailableStreamingServices(movieContent));
  console.log('TV Show Services:', getAvailableStreamingServices(tvContent));
  
  console.log('\n✅ Streaming Service Test Complete!');
};

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Add to window for easy testing in browser console
  window.testStreamingService = testStreamingService;
} 