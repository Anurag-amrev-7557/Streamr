import React, { useState, useEffect } from 'react';
import enhancedCache, { enhancedCacheUtils } from '../services/enhancedCacheService.js';

const TestCachePage = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    testCacheService();
  }, []);

  const testCacheService = async () => {
    setIsLoading(true);
    setMessage('');
    setError(null);
    
    try {
      // Wait for cache service to be ready
      const isReady = await enhancedCache.waitForReady(5000);
      
      if (isReady) {
        setMessage('✅ Cache service is ready and working');
        
        // Get cache statistics
        const stats = enhancedCache.getStats();
        setCacheStats(stats);
      } else {
        setMessage('⚠️ Cache service is not ready');
      }
    } catch (err) {
      setError(err.message);
      setMessage('❌ Cache service test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testCacheOperations = async () => {
    setIsLoading(true);
    setMessage('');
    setError(null);
    
    try {
      // Test basic cache operations
      const testKey = 'test_cache_key';
      const testData = { message: 'Hello from cache test', timestamp: Date.now() };
      
      // Set data
      await enhancedCache.set(testKey, testData, { namespace: 'test', ttl: 60000 });
      setMessage('✅ Cache set operation successful');
      
      // Get data
      const retrievedData = await enhancedCache.get(testKey, { namespace: 'test' });
      if (retrievedData) {
        setMessage('✅ Cache get operation successful');
      } else {
        setMessage('⚠️ Cache get operation returned no data');
      }
      
      // Update stats
      const stats = enhancedCache.getStats();
      setCacheStats(stats);
      
    } catch (err) {
      setError(err.message);
      setMessage('❌ Cache operations test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async () => {
    setIsLoading(true);
    setMessage('');
    setError(null);
    
    try {
      await enhancedCache.clear();
      setMessage('✅ Cache cleared successfully');
      
      // Update stats
      const stats = enhancedCache.getStats();
      setCacheStats(stats);
      
    } catch (err) {
      setError(err.message);
      setMessage('❌ Cache clear operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testPrefetchQueue = async () => {
    setIsLoading(true);
    setMessage('');
    setError(null);
    
    try {
      // This should not throw an error now
      const stats = enhancedCache.getStats();
      setMessage('✅ Prefetch queue access successful');
      setCacheStats(stats);
      
    } catch (err) {
      setError(err.message);
      setMessage('❌ Prefetch queue test failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Cache Service Test Page
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This page tests the enhanced cache service to ensure it's working properly
            and the previous errors are resolved.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Cache Service Tests
            </h2>
            
            <div className="space-y-3">
              <button
                onClick={testCacheService}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                {isLoading ? 'Testing...' : 'Test Cache Service'}
              </button>
              
              <button
                onClick={testCacheOperations}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600"
              >
                {isLoading ? 'Testing...' : 'Test Cache Operations'}
              </button>
              
              <button
                onClick={testPrefetchQueue}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600"
              >
                {isLoading ? 'Testing...' : 'Test Prefetch Queue'}
              </button>
              
              <button
                onClick={clearCache}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600"
              >
                {isLoading ? 'Clearing...' : 'Clear Cache'}
              </button>
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded text-sm ${
                message.includes('✅') ? 'bg-green-100 text-green-800' :
                message.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-800 rounded text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Cache Statistics
            </h2>
            
            {cacheStats ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Hits:</span>
                    <span className="font-mono">{cacheStats.hits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Misses:</span>
                    <span className="font-mono">{cacheStats.misses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <span className="font-mono">{cacheStats.hitRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory Usage:</span>
                    <span className="font-mono">{cacheStats.memoryUsageMB} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prefetch Queue:</span>
                    <span className="font-mono">{cacheStats.prefetchQueueSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Warmup Queue:</span>
                    <span className="font-mono">{cacheStats.warmupQueueSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ML Predictions:</span>
                    <span className="font-mono">{cacheStats.mlPredictions}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 p-6 rounded-lg text-center text-gray-500">
                No cache statistics available
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            What This Page Tests
          </h2>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>• <strong>Cache Service Initialization:</strong> Ensures the service starts without errors</p>
            <p>• <strong>Basic Operations:</strong> Tests set/get operations work properly</p>
            <p>• <strong>Prefetch Queue:</strong> Verifies the previous error is fixed</p>
            <p>• <strong>Statistics Access:</strong> Ensures stats can be retrieved safely</p>
            <p>• <strong>Error Handling:</strong> Tests that errors are handled gracefully</p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              💡 <strong>Note:</strong> If you see no errors and the cache operations work, 
              the previous "Cannot read properties of undefined (reading 'size')" error has been resolved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCachePage; 