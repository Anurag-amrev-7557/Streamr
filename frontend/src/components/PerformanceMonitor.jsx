/**
 * PerformanceMonitor - Real-time performance monitoring component
 * Tracks Core Web Vitals and custom metrics
 */
import React, { useState, useEffect, useCallback, memo } from 'react';

const PerformanceMonitor = memo(({ enabled = false }) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    renderCount: 0,
    apiCalls: 0,
    cacheHitRate: 0,
  });

  const [isVisible, setIsVisible] = useState(false);

  // Monitor FPS
  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime)),
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enabled]);

  // Monitor memory usage
  useEffect(() => {
    if (!enabled || !performance.memory) return;

    const measureMemory = () => {
      const usedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
      setMetrics(prev => ({
        ...prev,
        memory: usedMB.toFixed(2),
      }));
    };

    const intervalId = setInterval(measureMemory, 2000);
    return () => clearInterval(intervalId);
  }, [enabled]);

  // Track render count - use a ref to avoid infinite loops
  const renderCountRef = React.useRef(0);
  useEffect(() => {
    if (!enabled) return;
    renderCountRef.current += 1;
    setMetrics(prev => ({
      ...prev,
      renderCount: renderCountRef.current,
    }));
  }, [enabled]);

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all"
        title="Toggle Performance Monitor"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </button>

      {/* Metrics panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-xl font-mono text-sm min-w-[250px]">
          <div className="flex justify-between items-center mb-3 border-b border-white/20 pb-2">
            <h3 className="font-bold text-blue-400">Performance</h3>
            <button
              onClick={toggleVisibility}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <MetricRow
              label="FPS"
              value={metrics.fps}
              suffix=""
              good={metrics.fps >= 55}
              warning={metrics.fps >= 30 && metrics.fps < 55}
            />
            
            {performance.memory && (
              <MetricRow
                label="Memory"
                value={metrics.memory}
                suffix="MB"
                good={metrics.memory < 100}
                warning={metrics.memory >= 100 && metrics.memory < 200}
              />
            )}
            
            <MetricRow
              label="Renders"
              value={metrics.renderCount}
              suffix=""
            />
          </div>

          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs text-white/60">
              Press Shift+P to toggle
            </p>
          </div>
        </div>
      )}
    </>
  );
});

const MetricRow = memo(({ label, value, suffix, good, warning }) => {
  const getColor = () => {
    if (good) return 'text-green-400';
    if (warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-white/70">{label}:</span>
      <span className={`font-bold ${getColor()}`}>
        {value}{suffix}
      </span>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';
MetricRow.displayName = 'MetricRow';

export default PerformanceMonitor;
