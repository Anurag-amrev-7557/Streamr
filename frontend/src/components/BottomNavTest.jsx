import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BottomNavTest = () => {
  const location = useLocation();
  const [deviceInfo, setDeviceInfo] = useState({});
  const [touchEvents, setTouchEvents] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  useEffect(() => {
    // Gather device information
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight
      }
    };
    setDeviceInfo(info);

    // Test touch responsiveness
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      setTouchEvents(prev => [...prev.slice(-9), {
        type: 'touchstart',
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      }]);
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      setTouchEvents(prev => [...prev.slice(-9), {
        type: 'touchmove',
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      }]);
    };

    const handleTouchEnd = (e) => {
      setTouchEvents(prev => [...prev.slice(-9), {
        type: 'touchend',
        timestamp: Date.now()
      }]);
    };

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Performance monitoring
    const startTime = performance.now();
    const checkPerformance = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - startTime;
      
      setPerformanceMetrics({
        frameTime: frameTime.toFixed(2),
        fps: (1000 / frameTime).toFixed(1),
        memory: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : null
      });
    };

    const interval = setInterval(checkPerformance, 1000);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      clearInterval(interval);
    };
  }, []);

  const testBottomNav = () => {
    // Simulate bottom nav interaction
    const event = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: window.innerHeight - 50 }]
    });
    document.dispatchEvent(event);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Bottom Navbar Test - Mid-Tier Phone Debug</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Device Information */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Device Information</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Platform:</strong> {deviceInfo.platform}</div>
              <div><strong>CPU Cores:</strong> {deviceInfo.hardwareConcurrency}</div>
              <div><strong>Memory:</strong> {deviceInfo.deviceMemory}GB</div>
              <div><strong>Touch Points:</strong> {deviceInfo.maxTouchPoints}</div>
              <div><strong>Pixel Ratio:</strong> {deviceInfo.viewport?.devicePixelRatio}</div>
              <div><strong>Viewport:</strong> {deviceInfo.viewport?.width} × {deviceInfo.viewport?.height}</div>
              <div><strong>Screen:</strong> {deviceInfo.screen?.width} × {deviceInfo.screen?.height}</div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Performance</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Frame Time:</strong> {performanceMetrics.frameTime}ms</div>
              <div><strong>FPS:</strong> {performanceMetrics.fps}</div>
              {performanceMetrics.memory && (
                <>
                  <div><strong>Memory Used:</strong> {performanceMetrics.memory.used}MB</div>
                  <div><strong>Memory Total:</strong> {performanceMetrics.memory.total}MB</div>
                  <div><strong>Memory Limit:</strong> {performanceMetrics.memory.limit}MB</div>
                </>
              )}
            </div>
          </div>

          {/* Touch Events */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Touch Events (Last 10)</h2>
            <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
              {touchEvents.map((event, index) => (
                <div key={index} className="text-gray-300">
                  {event.type}: {event.x}, {event.y} ({event.timestamp})
                </div>
              ))}
            </div>
          </div>

          {/* Test Controls */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            <div className="space-y-3">
              <button
                onClick={testBottomNav}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Test Bottom Nav Touch
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
              >
                Reload Page
              </button>
              <button
                onClick={() => setTouchEvents([])}
                className="w-full bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded"
              >
                Clear Touch Events
              </button>
            </div>
          </div>
        </div>

        {/* Current Route */}
        <div className="mt-6 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Current Route</h2>
          <div className="text-lg font-mono">{location.pathname}</div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Testing Instructions</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Navigate between different routes using the bottom navbar</li>
            <li>Check if touch events are being registered properly</li>
            <li>Monitor performance metrics for any lag or stuttering</li>
            <li>Test on different screen orientations</li>
            <li>Check if the indicator moves smoothly between nav items</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BottomNavTest; 