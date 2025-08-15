// Test utility for Continue Watching functionality
export const testContinueWatching = () => {
  console.log('🧪 Testing Continue Watching functionality...');
  
  // Test localStorage
  const savedProgress = localStorage.getItem('viewingProgress');
  console.log('📦 Saved viewing progress:', savedProgress ? JSON.parse(savedProgress) : 'None');
  
  // Test if ViewingProgressContext is available
  try {
    // This will be called from a component that has access to the context
    console.log('✅ ViewingProgressContext should be available in components');
  } catch (error) {
    console.error('❌ ViewingProgressContext not available:', error);
  }
  
  // Test continue watching data structure
  const testMovie = {
    id: 12345,
    title: 'Test Movie',
    type: 'movie',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    lastWatched: new Date().toISOString(),
    progress: 0
  };
  
  const testEpisode = {
    id: 67890,
    title: 'Test TV Show',
    type: 'tv',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    lastWatched: new Date().toISOString(),
    season: 1,
    episode: 5,
    episodeTitle: 'Test Episode',
    progress: 0
  };
  
  console.log('🎬 Test movie data:', testMovie);
  console.log('📺 Test episode data:', testEpisode);
  
  return {
    testMovie,
    testEpisode,
    savedProgress: savedProgress ? JSON.parse(savedProgress) : null
  };
};

// Function to manually add test data to localStorage
export const addTestContinueWatchingData = () => {
  const testData = {
    movie_12345: {
      id: 12345,
      title: 'The Dark Knight',
      type: 'movie',
      poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdrop_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      lastWatched: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      progress: 0
    },
    movie_550: {
      id: 550,
      title: 'Fight Club',
      type: 'movie',
      poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      backdrop_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      lastWatched: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      progress: 0
    },
    tv_1399_1_5: {
      id: 1399,
      title: 'Game of Thrones',
      type: 'tv',
      poster_path: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
      backdrop_path: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
      lastWatched: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      season: 1,
      episode: 5,
      episodeTitle: 'The Wolf and the Lion',
      progress: 0
    },
    tv_1399_2_3: {
      id: 1399,
      title: 'Game of Thrones',
      type: 'tv',
      poster_path: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
      backdrop_path: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
      lastWatched: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      season: 2,
      episode: 3,
      episodeTitle: 'What is Dead May Never Die',
      progress: 0
    },
    movie_299536: {
      id: 299536,
      title: 'Avengers: Infinity War',
      type: 'movie',
      poster_path: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
      backdrop_path: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
      lastWatched: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      progress: 0
    }
  };
  
  localStorage.setItem('viewingProgress', JSON.stringify(testData));
  console.log('✅ Added test continue watching data to localStorage');
  
  // Try to refresh the context if it's available
  if (window.refreshContinueWatching) {
    window.refreshContinueWatching();
  }
  
  return testData;
};

// Function to clear test data
export const clearTestContinueWatchingData = () => {
  localStorage.removeItem('viewingProgress');
  console.log('🗑️ Cleared test continue watching data from localStorage');
}; 