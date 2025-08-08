import React, { useState } from 'react';
import { useViewingProgress } from '../contexts/ViewingProgressContext';

const TestProgressUpdate = () => {
  const { 
    startWatchingMovie, 
    startWatchingEpisode, 
    updateProgress, 
    continueWatching, 
    hasContinueWatching,
    refreshFromStorage 
  } = useViewingProgress();

  const [testProgress, setTestProgress] = useState(0);

  const testMovie = {
    id: 12345,
    title: "Test Movie",
    type: "movie",
    poster_path: "/9P6D1d6d0N8JijgMSOND04FnQad.jpg",
    backdrop_path: "/9P6D1d6d0N8JijgMSOND04FnQad.jpg"
  };

  const testTVShow = {
    id: 67890,
    name: "Test TV Show",
    title: "Test TV Show",
    type: "tv",
    poster_path: "/9P6D1d6d0N8JijgMSOND04FnQad.jpg",
    backdrop_path: "/9P6D1d6d0N8JijgMSOND04FnQad.jpg"
  };

  const testWithRealImages = () => {
    const realMovie = {
      id: 550,
      title: "Fight Club",
      type: "movie",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      backdrop_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg"
    };
    
    const realTVShow = {
      id: 1399,
      name: "Game of Thrones",
      title: "Game of Thrones",
      type: "tv",
      poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
      backdrop_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg"
    };
    
    console.log('🎬 Testing with real TMDB images...');
    startWatchingMovie(realMovie);
    setTimeout(() => {
      startWatchingEpisode(realTVShow, 1, 1, { name: "Winter Is Coming" });
    }, 100);
  };

  const testWithDifferentImageFormats = () => {
    // Test with different image path formats
    const tvShowWithFullUrl = {
      id: 1399,
      name: "Game of Thrones (Full URL)",
      title: "Game of Thrones (Full URL)",
      type: "tv",
      poster_path: "https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
      backdrop_path: "https://image.tmdb.org/t/p/original/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg"
    };

    const tvShowWithPath = {
      id: 1399,
      name: "Game of Thrones (Path)",
      title: "Game of Thrones (Path)",
      type: "tv",
      poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
      backdrop_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg"
    };

    const tvShowWithNoSlash = {
      id: 1399,
      name: "Game of Thrones (No Slash)",
      title: "Game of Thrones (No Slash)",
      type: "tv",
      poster_path: "u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
      backdrop_path: "u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg"
    };

    console.log('🎬 Testing with different image formats...');
    
    // Test with full URL format
    startWatchingEpisode(tvShowWithFullUrl, 1, 1, { name: "Full URL Test" });
    
    setTimeout(() => {
      // Test with path format
      startWatchingEpisode(tvShowWithPath, 1, 2, { name: "Path Test" });
    }, 200);
    
    setTimeout(() => {
      // Test with no slash format
      startWatchingEpisode(tvShowWithNoSlash, 1, 3, { name: "No Slash Test" });
    }, 400);
  };

  const startTestMovie = () => {
    console.log('🎬 Starting test movie...');
    startWatchingMovie(testMovie);
  };

  const startTestTVEpisode = () => {
    console.log('📺 Starting test TV episode...');
    startWatchingEpisode(testTVShow, 1, 1, { name: "Test Episode" });
  };

  const updateTestProgress = () => {
    console.log('📊 Updating test progress to:', testProgress);
    updateProgress(testMovie.id, 'movie', null, null, testProgress);
  };

  const updateTestTVProgress = () => {
    console.log('📊 Updating test TV progress to:', testProgress);
    updateProgress(testTVShow.id, 'tv', 1, 1, testProgress);
  };

  const manualRefresh = () => {
    console.log('🔄 Manual refresh...');
    refreshFromStorage();
  };

  const debugContinueWatching = () => {
    console.log('🔍 Debug Continue Watching Data:');
    console.log('Continue watching items:', continueWatching);
    continueWatching.forEach((item, index) => {
      console.log(`Item ${index}:`, {
        id: item.id,
        title: item.title,
        type: item.type,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        progress: item.progress,
        lastWatched: item.lastWatched
      });
    });
  };

  const testTVShowWithPersistentImage = () => {
    const tvShowWithProperPaths = {
      id: 1399,
      name: "Game of Thrones (Persistent Test)",
      title: "Game of Thrones (Persistent Test)",
      type: "tv",
      poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
      backdrop_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg"
    };
    
    console.log('🎬 Testing TV show with persistent image...');
    console.log('🎬 TV show data:', tvShowWithProperPaths);
    
    // Start watching the TV show
    startWatchingEpisode(tvShowWithProperPaths, 1, 1, { name: "Winter Is Coming" });
    
    // Update progress after a delay to simulate watching
    setTimeout(() => {
      updateProgress(tvShowWithProperPaths.id, 'tv', 1, 1, 25);
    }, 1000);
  };

  const testMobileTVShowImage = () => {
    const tvShowWithKnownPaths = {
      id: 1399,
      name: "Game of Thrones (Mobile Test)",
      title: "Game of Thrones (Mobile Test)",
      type: "tv",
      poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
      backdrop_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg"
    };
    
    console.log('📱 Testing mobile TV show image with known paths...');
    console.log('📱 TV show data:', tvShowWithKnownPaths);
    console.log('📱 Window width:', window.innerWidth);
    console.log('📱 Is mobile:', window.innerWidth < 768);
    
    // Start watching the TV show
    startWatchingEpisode(tvShowWithKnownPaths, 1, 1, { name: "Mobile Test Episode" });
    
    // Update progress after a delay to simulate watching
    setTimeout(() => {
      updateProgress(tvShowWithKnownPaths.id, 'tv', 1, 1, 30);
    }, 1000);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg m-4">
      <h3 className="text-white text-lg font-semibold mb-4">Test Progress Update</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-white font-medium mb-2">Test Movie</h4>
          <div className="flex gap-2 mb-2">
            <button 
              onClick={startTestMovie}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Start Watching Movie
            </button>
            <button 
              onClick={updateTestProgress}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Update Progress
            </button>
            <button onClick={testWithRealImages} className="bg-blue-500 text-white px-4 py-2 rounded">
              Test with Real Images
            </button>
            <button onClick={testWithDifferentImageFormats} className="bg-green-500 text-white px-4 py-2 rounded">
              Test Different Image Formats
            </button>
            <button onClick={testTVShowWithPersistentImage} className="bg-purple-500 text-white px-4 py-2 rounded">
              Test Persistent Image
            </button>
            <button onClick={testMobileTVShowImage} className="bg-yellow-500 text-white px-4 py-2 rounded">
              Test Mobile TV Image
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-2">Test TV Show</h4>
          <div className="flex gap-2 mb-2">
            <button 
              onClick={startTestTVEpisode}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Start Watching TV Episode
            </button>
            <button 
              onClick={updateTestTVProgress}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Update TV Progress
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-2">Progress Control</h4>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="range"
              min="0"
              max="100"
              value={testProgress}
              onChange={(e) => setTestProgress(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-white min-w-[3rem]">{testProgress}%</span>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-2">Debug & Refresh</h4>
          <div className="flex gap-2">
            <button 
              onClick={manualRefresh}
              className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Refresh Continue Watching
            </button>
            <button 
              onClick={debugContinueWatching}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Debug Data
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-2">Current Status</h4>
          <p className="text-white text-sm">
            Has Continue Watching: <span className={hasContinueWatching() ? 'text-green-400' : 'text-red-400'}>
              {hasContinueWatching() ? 'Yes' : 'No'}
            </span>
          </p>
          <p className="text-white text-sm">
            Items in Continue Watching: {continueWatching.length}
          </p>
          {continueWatching.length > 0 && (
            <div className="mt-2">
              <p className="text-white text-sm font-medium">Current Items:</p>
              {continueWatching.map((item, index) => (
                <div key={index} className="text-white text-xs ml-2">
                  • {item.title} ({item.type}) - {item.progress?.toFixed(1) || 0}% watched
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestProgressUpdate; 