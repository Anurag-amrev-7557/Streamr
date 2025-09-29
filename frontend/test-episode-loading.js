// Test script to debug episode loading issues
// Run this in the browser console to test episode fetching

async function testEpisodeLoading(tvShowId = 1399, seasonNumber = 1) {
  console.log(`🧪 Testing episode loading for TV Show ID: ${tvShowId}, Season: ${seasonNumber}`);
  
  try {
    // Test direct TMDB API call
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    if (!apiKey) {
      console.error('❌ No TMDB API key found in environment variables');
      return;
    }
    
    const url = `https://api.themoviedb.org/3/tv/${tvShowId}/season/${seasonNumber}?api_key=${apiKey}&language=en-US&append_to_response=credits,videos,images`;
    
    console.log('📡 Fetching from URL:', url);
    
    const response = await fetch(url);
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📦 Raw API response:', data);
    
    // Check episode data structure
    if (data.episodes) {
      console.log('✅ Episodes found:', data.episodes.length);
      console.log('📺 First episode:', data.episodes[0]);
      console.log('📺 Last episode:', data.episodes[data.episodes.length - 1]);
    } else {
      console.warn('⚠️ No episodes array in response');
    }
    
    // Check season data
    console.log('📺 Season info:', {
      id: data.id,
      name: data.name,
      season_number: data.season_number,
      episode_count: data.episodes?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Error testing episode loading:', error);
  }
}

// Test with a popular TV show (Game of Thrones)
console.log('🎬 Episode Loading Test Script Loaded');
console.log('📝 Usage: testEpisodeLoading(tvShowId, seasonNumber)');
console.log('📝 Example: testEpisodeLoading(1399, 1) for Game of Thrones Season 1');

// Auto-test with default values
setTimeout(() => {
  testEpisodeLoading(1399, 1);
}, 1000); 