import React, { useState, useEffect } from 'react';
import { useViewingProgress } from '../contexts/ViewingProgressContext';

const ProgressTestComponent = () => {
  const { 
    startWatchingMovie, 
    updateProgress, 
    continueWatching, 
    hasContinueWatching
  } = useViewingProgress();
  
  const [testProgress, setTestProgress] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  const testMovie = {
    id: 'tt0111161',
    title: 'The Shawshank Redemption',
    type: 'movie',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg'
  };

  const handleStartTracking = () => {
    console.log('🎬 Starting to watch test movie');
    startWatchingMovie(testMovie);
    setIsTracking(true);
  };

  const handleUpdateProgress = (progress) => {
    console.log('📊 Updating progress to:', progress);
    updateProgress(testMovie.id, 'movie', null, null, progress);
    setTestProgress(progress);
  };

  const handleSimulateWatching = () => {
    setIsTracking(true);
    startWatchingMovie(testMovie);
    
    // Simulate watching progress
    const intervals = [10, 25, 50, 75, 90];
    intervals.forEach((progress, index) => {
      setTimeout(() => {
        handleUpdateProgress(progress);
      }, (index + 1) * 2000); // Update every 2 seconds
    });
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Progress Tracking Test</h2>
      
      <div className="space-y-4">
        {/* Test Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleStartTracking}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
          >
            Start Watching
          </button>
          
          <button
            onClick={handleSimulateWatching}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Simulate Watching
          </button>
          

          
          <button
            onClick={() => handleUpdateProgress(Math.floor(Math.random() * 100))}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
          >
            Random Progress
          </button>
        </div>

        {/* Manual Progress Slider */}
        <div>
          <label className="block text-white mb-2">Manual Progress: {testProgress}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={testProgress}
            onChange={(e) => handleUpdateProgress(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>Current Progress</span>
            <span>{testProgress}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-4">
            <div 
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${testProgress}%` }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="text-white">
          <p>Tracking: <span className={isTracking ? 'text-green-400' : 'text-red-400'}>
            {isTracking ? 'Active' : 'Inactive'}
          </span></p>
          <p>Has Continue Watching: <span className={hasContinueWatching() ? 'text-green-400' : 'text-red-400'}>
            {hasContinueWatching() ? 'Yes' : 'No'}
          </span></p>
          <p>Items in Continue Watching: {continueWatching.length}</p>
        </div>

        {/* Continue Watching Items */}
        {hasContinueWatching() && (
          <div>
            <h3 className="text-white font-semibold mb-2">Continue Watching Items:</h3>
            <div className="space-y-2">
              {continueWatching.map((item, index) => (
                <div key={index} className="bg-gray-700 p-2 rounded text-white text-sm">
                  <p><strong>{item.title}</strong></p>
                  <p>Type: {item.type}</p>
                  <p>Progress: {item.progress ? `${item.progress.toFixed(1)}%` : '0%'}</p>
                  <p>Last Watched: {new Date(item.lastWatched).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTestComponent; 