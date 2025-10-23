// Test script to verify TV show detection from different sources
// Run this in the browser console to test TV show data handling

function testTVShowDetection() {
  console.log('🧪 Testing TV Show Detection from Different Sources');
  
  // Test 1: Search result movie data (from Navbar)
  const searchResultMovie = {
    id: 1399,
    name: "Game of Thrones", // TV shows have 'name' instead of 'title'
    media_type: "tv",
    overview: "Seven noble families fight for control of the mythical land of Westeros.",
    poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
    first_air_date: "2011-04-17",
    vote_average: 9.3
  };
  
  console.log('📺 Test 1 - Search Result Movie Data:');
  console.log('Original:', searchResultMovie);
  
  // Simulate Navbar processing
  const processedSearchMovie = {
    ...searchResultMovie,
    title: searchResultMovie.title || searchResultMovie.name || 'Unknown Title',
    name: searchResultMovie.name || searchResultMovie.title || 'Unknown Title',
    type: searchResultMovie.media_type || searchResultMovie.type || 'movie',
    media_type: searchResultMovie.media_type || searchResultMovie.type || 'movie'
  };
  
  // Enhanced TV show detection
  if (processedSearchMovie.media_type === 'tv' || 
      processedSearchMovie.type === 'tv' || 
      (processedSearchMovie.name && !processedSearchMovie.title)) {
    console.log('✅ Detected as TV show');
    processedSearchMovie.media_type = 'tv';
    processedSearchMovie.type = 'tv';
    
    if (!processedSearchMovie.name && processedSearchMovie.title) {
      processedSearchMovie.name = processedSearchMovie.title;
    }
    if (!processedSearchMovie.title && processedSearchMovie.name) {
      processedSearchMovie.title = processedSearchMovie.name;
    }
  }
  
  console.log('Processed:', processedSearchMovie);
  console.log('---');
  
  // Test 2: Similar content movie data (from EnhancedSimilarContent)
  const similarContentMovie = {
    id: 1396,
    name: "Breaking Bad",
    overview: "A high school chemistry teacher turned methamphetamine manufacturer.",
    poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    first_air_date: "2008-01-20",
    vote_average: 9.5
  };
  
  console.log('📺 Test 2 - Similar Content Movie Data:');
  console.log('Original:', similarContentMovie);
  
  // Simulate EnhancedSimilarContent processing
  const processedSimilarMovie = {
    id: similarContentMovie.id,
    title: similarContentMovie.title || similarContentMovie.name || 'Untitled',
    name: similarContentMovie.name || similarContentMovie.title || 'Untitled',
    type: similarContentMovie.media_type || similarContentMovie.type || 'movie',
    poster_path: similarContentMovie.poster_path || similarContentMovie.poster || null,
    backdrop_path: similarContentMovie.backdrop_path || similarContentMovie.backdrop || null,
    overview: similarContentMovie.overview || '',
    year: similarContentMovie.year || (similarContentMovie.first_air_date ? new Date(similarContentMovie.first_air_date).getFullYear() : 'N/A'),
    rating: similarContentMovie.vote_average || 0,
    genres: similarContentMovie.genres || similarContentMovie.genre_ids || [],
    release_date: similarContentMovie.release_date || similarContentMovie.first_air_date || null,
    popularity: similarContentMovie.popularity,
    original_language: similarContentMovie.original_language,
    vote_count: similarContentMovie.vote_count
  };
  
  // Enhanced TV show detection for similar content
  if (processedSimilarMovie.type === 'tv' || 
      (similarContentMovie.name && !similarContentMovie.title) || 
      (similarContentMovie.media_type === 'tv')) {
    console.log('✅ Detected as TV show');
    
    processedSimilarMovie.media_type = 'tv';
    processedSimilarMovie.type = 'tv';
    
    if (!processedSimilarMovie.name && processedSimilarMovie.title) {
      processedSimilarMovie.name = processedSimilarMovie.title;
    }
    if (!processedSimilarMovie.title && processedSimilarMovie.name) {
      processedSimilarMovie.title = processedSimilarMovie.name;
    }
  }
  
  console.log('Processed:', processedSimilarMovie);
  console.log('---');
  
  // Test 3: MovieDetailsOverlay TV detection logic
  console.log('📺 Test 3 - MovieDetailsOverlay TV Detection:');
  
  const testMovies = [processedSearchMovie, processedSimilarMovie];
  
  testMovies.forEach((movie, index) => {
    const isTVShow = movie?.media_type === 'tv' || 
                     movie?.type === 'tv' || 
                     (movie?.id && movie?.name && !movie?.title);
    
    console.log(`Movie ${index + 1}: ${movie.title || movie.name}`);
    console.log(`  - ID: ${movie.id}`);
    console.log(`  - Media Type: ${movie.media_type}`);
    console.log(`  - Type: ${movie.type}`);
    console.log(`  - Has Name: ${!!movie.name}`);
    console.log(`  - Has Title: ${!!movie.title}`);
    console.log(`  - Detected as TV: ${isTVShow ? '✅ YES' : '❌ NO'}`);
    console.log('  ---');
  });
  
  // Test 4: Simulate episode loading conditions
  console.log('📺 Test 4 - Episode Loading Conditions:');
  
  testMovies.forEach((movie, index) => {
    const isTVShow = movie?.media_type === 'tv' || 
                     movie?.type === 'tv' || 
                     (movie?.id && movie?.name && !movie?.title);
    
    if (isTVShow && movie?.id) {
      console.log(`✅ Movie ${index + 1} would trigger episode loading:`);
      console.log(`  - Would call getTVSeasons(${movie.id})`);
      console.log(`  - Would set media_type to 'tv'`);
      console.log(`  - Would ensure both title and name are present`);
    } else {
      console.log(`❌ Movie ${index + 1} would NOT trigger episode loading:`);
      console.log(`  - Missing required fields or not detected as TV`);
    }
    console.log('  ---');
  });
}

// Test with a popular TV show (Game of Thrones)
console.log('🎬 TV Show Detection Test Script Loaded');
console.log('📝 Usage: testTVShowDetection()');
console.log('📝 This tests how TV shows are detected from search and similar content');

// Auto-test
setTimeout(() => {
  testTVShowDetection();
}, 1000); 