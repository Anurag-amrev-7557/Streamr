import React, { useState } from 'react';
import { useViewingProgress } from '../contexts/ViewingProgressContext';
import { testIframeProgress, simulateProgressUpdate } from '../utils/testIframeProgress';
import IframeProgressDemo from '../components/IframeProgressDemo';
import ProgressTestComponent from '../components/ProgressTestComponent';

const TestProgressPage = () => {
  const { 
    continueWatching, 
    hasContinueWatching, 
    startWatchingMovie, 
    updateProgress,
    clearAllProgress,
    refreshFromStorage 
  } = useViewingProgress();

  const [showDemo, setShowDemo] = useState(false);

  const handleTestProgress = () => {
    testIframeProgress();
  };

  const handleSimulateProgress = () => {
    // Simulate progress for a test movie
    const testMovie = {
      id: 'tt0111161',
      title: 'The Shawshank Redemption',
      type: 'movie',
      poster_path: '/test-poster.jpg',
      backdrop_path: '/test-backdrop.jpg'
    };

    // Start watching the movie
    startWatchingMovie(testMovie);

    // Simulate progress updates
    setTimeout(() => simulateProgressUpdate(25), 1000);
    setTimeout(() => simulateProgressUpdate(50), 2000);
    setTimeout(() => simulateProgressUpdate(75), 3000);
    setTimeout(() => simulateProgressUpdate(90), 4000);
  };

  const handleClearProgress = () => {
    clearAllProgress();
  };

  const handleRefreshStorage = () => {
    refreshFromStorage();
  };

  return (
    <div className="min-h-screen bg-[#121417] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Iframe Progress Tracking Test</h1>

        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleTestProgress}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              Run Progress Tests
            </button>
            <button
              onClick={handleSimulateProgress}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
            >
              Simulate Progress Updates
            </button>
            <button
              onClick={handleClearProgress}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
            >
              Clear All Progress
            </button>
            <button
              onClick={handleRefreshStorage}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
            >
              Refresh from Storage
            </button>
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-white"
            >
              {showDemo ? 'Hide' : 'Show'} Demo Component
            </button>
          </div>
        </div>

        {/* Continue Watching Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Continue Watching Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-300">Has Continue Watching:</p>
              <p className={`text-lg font-semibold ${hasContinueWatching() ? 'text-green-400' : 'text-red-400'}`}>
                {hasContinueWatching() ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-gray-300">Items Count:</p>
              <p className="text-lg font-semibold text-blue-400">
                {continueWatching.length}
              </p>
            </div>
          </div>
        </div>

        {/* Continue Watching Items */}
        {hasContinueWatching() && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Continue Watching Items</h2>
            <div className="space-y-4">
              {continueWatching.map((item, index) => (
                <div key={`${item.id}-${item.type}-${index}`} className="bg-gray-700 rounded p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-gray-400 text-sm">
                        {item.type === 'tv' 
                          ? `TV Show - S${item.season} E${item.episode}`
                          : 'Movie'
                        }
                      </p>
                      <p className="text-gray-400 text-sm">
                        Progress: {item.progress ? `${item.progress.toFixed(1)}%` : '0%'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Last watched: {new Date(item.lastWatched).toLocaleString()}
                      </p>
                    </div>
                    {item.progress > 0 && (
                      <div className="w-32">
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 text-center">
                          {item.progress.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Test Component */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Progress Tracking Test</h2>
          <ProgressTestComponent />
        </div>

        {/* Demo Component */}
        {showDemo && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Iframe Progress Demo</h2>
            <IframeProgressDemo />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How to Test</h2>
          <div className="space-y-2 text-gray-300">
            <p>1. <strong>Run Progress Tests</strong> - Tests the iframe progress service</p>
            <p>2. <strong>Simulate Progress Updates</strong> - Creates test progress data</p>
            <p>3. <strong>Open a movie</strong> - Go to any movie and click "Watch Now"</p>
            <p>4. <strong>Watch for progress</strong> - Look for progress indicators in the streaming player</p>
            <p>5. <strong>Check Continue Watching</strong> - Return to home page to see progress saved</p>
            <p>6. <strong>Use Demo Component</strong> - Test with the interactive demo</p>
          </div>
          
          <div className="mt-6 p-4 bg-blue-900/20 rounded border border-blue-500/20">
            <h3 className="font-semibold text-blue-400 mb-2">Expected Behavior</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Progress should be tracked when watching movies/shows</li>
              <li>• Progress bars should appear in Continue Watching section</li>
              <li>• Progress should persist across browser sessions</li>
              <li>• Console should show progress tracking logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestProgressPage; 