import React, { useState, useRef } from 'react';
import { useIframeProgress } from '../hooks/useIframeProgress';
import { testIframeProgress, simulateProgressUpdate } from '../utils/testIframeProgress';

const IframeProgressDemo = () => {
  const [testUrl, setTestUrl] = useState('https://111movies.com/movie/tt0111161');
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef(null);

  // Mock content for testing
  const testContent = {
    id: 'tt0111161',
    title: 'The Shawshank Redemption',
    type: 'movie',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg'
  };

  // Use the iframe progress hook
  const {
    startTracking,
    stopTracking,
    getCurrentProgress,
    setProgress: setManualProgress,
    isTracking,
    progress: trackedProgress,
    duration
  } = useIframeProgress(testContent, iframeRef, {
    autoStart: false, // Don't auto-start for demo
    updateInterval: 5000,
    urlCheckInterval: 3000,
    minProgressChange: 1
  });

  const handleTestProgress = () => {
    testIframeProgress();
  };

  const handleSimulateProgress = () => {
    const newProgress = Math.floor(Math.random() * 100);
    simulateProgressUpdate(newProgress);
    setProgress(newProgress);
  };

  const handleManualProgress = () => {
    const newProgress = Math.floor(Math.random() * 100);
    setManualProgress(newProgress);
    setProgress(newProgress);
  };

  const handleStartTracking = () => {
    startTracking();
    setIsPlaying(true);
  };

  const handleStopTracking = () => {
    stopTracking();
    setIsPlaying(false);
  };

  const currentProgressData = getCurrentProgress();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Iframe Progress Tracking Demo</h1>
      
      {/* Test Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
        <div className="flex flex-wrap gap-2">
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
            Simulate Progress Update
          </button>
          <button
            onClick={handleManualProgress}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
          >
            Set Manual Progress
          </button>
        </div>
      </div>

      {/* Progress Tracking Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Progress Tracking</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleStartTracking}
            disabled={isTracking}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white"
          >
            Start Tracking
          </button>
          <button
            onClick={handleStopTracking}
            disabled={!isTracking}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-white"
          >
            Stop Tracking
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-700 rounded p-3">
            <h3 className="font-medium mb-2">Tracking Status</h3>
            <p>Is Tracking: <span className={isTracking ? 'text-green-400' : 'text-red-400'}>
              {isTracking ? 'Yes' : 'No'}
            </span></p>
            <p>Is Playing: <span className={isPlaying ? 'text-green-400' : 'text-red-400'}>
              {isPlaying ? 'Yes' : 'No'}
            </span></p>
          </div>
          
          <div className="bg-gray-700 rounded p-3">
            <h3 className="font-medium mb-2">Current Progress</h3>
            <p>Tracked Progress: <span className="text-blue-400">{trackedProgress.toFixed(1)}%</span></p>
            <p>Duration: <span className="text-blue-400">{duration}s</span></p>
            <p>Manual Progress: <span className="text-purple-400">{progress.toFixed(1)}%</span></p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Progress Visualization</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tracked Progress</label>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${trackedProgress}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-400">{trackedProgress.toFixed(1)}%</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Manual Progress</label>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className="bg-purple-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-400">{progress.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Test Iframe */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Iframe</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Test URL</label>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
            placeholder="Enter streaming URL"
          />
        </div>
        
        <div className="relative aspect-video bg-black rounded overflow-hidden">
          <iframe
            ref={iframeRef}
            src={testUrl}
            className="w-full h-full"
            title="Test iframe"
            allow="autoplay; fullscreen; picture-in-picture"
          />
        </div>
      </div>

      {/* Debug Information */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        <div className="bg-gray-900 rounded p-3 font-mono text-sm overflow-auto">
          <pre>
            {JSON.stringify({
              content: testContent,
              trackingStatus: {
                isTracking,
                isPlaying,
                currentProgress: currentProgressData
              },
              progress: {
                tracked: trackedProgress,
                manual: progress,
                duration
              },
              iframe: {
                src: testUrl,
                ref: iframeRef.current ? 'Available' : 'Not available'
              }
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default IframeProgressDemo; 