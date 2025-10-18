import React, { useState, useEffect, useCallback } from 'react';
import enhancedCache, { enhancedCacheUtils } from '../services/enhancedCacheService.js';
import enhancedApiServiceV2, { apiUtils } from '../services/enhancedApiServiceV2.js';

const CacheManagementDashboard = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [apiStats, setApiStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch cache statistics
  const fetchStats = useCallback(async () => {
    try {
      // Check if enhanced cache service is ready
      if (!enhancedCache || !enhancedCache.isReady()) {
        console.warn('Enhanced cache service not ready');
        setCacheStats(enhancedCache?.getFallbackStats?.() || null);
      } else {
        const cacheData = await enhancedCache.getStats();
        setCacheStats(cacheData);
      }
      
      if (!apiUtils || typeof apiUtils.getStats !== 'function') {
        console.warn('API utils not available');
        setApiStats(null);
      } else {
        const apiData = await apiUtils.getStats();
        setApiStats(apiData);
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
      // Set fallback values
      setCacheStats(null);
      setApiStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh stats
  useEffect(() => {
    fetchStats();
    
    if (autoRefresh) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStats, autoRefresh, refreshInterval]);

  // Clear all caches
  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear all caches? This will remove all cached data.')) {
      try {
        await Promise.all([
          enhancedCache.clear(),
          apiUtils.clearCache()
        ]);
        await fetchStats();
        alert('All caches cleared successfully!');
      } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('Failed to clear cache. Please try again.');
      }
    }
  };

  // Warm up cache
  const handleWarmupCache = async () => {
    try {
      await enhancedCacheUtils.warmup();
      await fetchStats();
      alert('Cache warmup initiated!');
    } catch (error) {
      console.error('Failed to warmup cache:', error);
      alert('Failed to warmup cache. Please try again.');
    }
  };

  // Preload specific data
  const handlePreloadData = async () => {
    const endpoints = [
      '/api/trending',
      '/api/popular',
      '/api/top-rated',
      '/api/upcoming'
    ];
    
    try {
      await apiUtils.preload(endpoints, { priority: 'high' });
      await fetchStats();
      alert('Data preload completed!');
    } catch (error) {
      console.error('Failed to preload data:', error);
      alert('Failed to preload data. Please try again.');
    }
  };

  // Invalidate cache by pattern
  const handleInvalidateCache = async (pattern) => {
    try {
      const count = await enhancedCache.invalidate(pattern);
      await fetchStats();
      alert(`Invalidated ${count} cache entries!`);
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      alert('Failed to invalidate cache. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cache statistics...</p>
        </div>
      </div>
    );
  }

  // Show fallback if no stats are available
  if (!cacheStats && !apiStats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Cache Management Dashboard</h1>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Cache Service Not Available</h3>
                <p className="text-yellow-700 mb-4">
                  The enhanced cache service is not currently available. This might be due to:
                </p>
                <ul className="text-yellow-700 text-left max-w-md mx-auto space-y-1">
                  <li>• Service still initializing</li>
                  <li>• Browser compatibility issues</li>
                  <li>• IndexedDB not available</li>
                </ul>
                <button
                  onClick={fetchStats}
                  className="mt-4 bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cache Management Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor and control the enhanced caching system</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-600">
                  Auto-refresh
                </label>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="border rounded px-3 py-1 text-sm"
                disabled={!autoRefresh}
              >
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
              <button
                onClick={fetchStats}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={handleWarmupCache}
            className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 transition-colors"
          >
            <div className="text-lg font-semibold">Warmup Cache</div>
            <div className="text-sm opacity-90">Preload critical data</div>
          </button>
          
          <button
            onClick={handlePreloadData}
            className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition-colors"
          >
            <div className="text-lg font-semibold">Preload Data</div>
            <div className="text-sm opacity-90">Load trending content</div>
          </button>
          
          <button
            onClick={() => handleInvalidateCache({ namespace: 'api' })}
            className="bg-orange-500 text-white p-4 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <div className="text-lg font-semibold">Invalidate API</div>
            <div className="text-sm opacity-90">Clear API cache</div>
          </button>
          
          <button
            onClick={handleClearCache}
            className="bg-red-500 text-white p-4 rounded-lg hover:bg-red-600 transition-colors"
          >
            <div className="text-lg font-semibold">Clear All</div>
            <div className="text-sm opacity-90">Remove all cached data</div>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'performance', label: 'Performance', icon: '⚡' },
                { id: 'analytics', label: 'Analytics', icon: '📈' },
                { id: 'settings', label: 'Settings', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab cacheStats={cacheStats} apiStats={apiStats} />}
            {activeTab === 'performance' && <PerformanceTab cacheStats={cacheStats} apiStats={apiStats} />}
            {activeTab === 'analytics' && <AnalyticsTab cacheStats={cacheStats} apiStats={apiStats} />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ cacheStats, apiStats }) => {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Cache Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{cacheStats?.size || 0}</div>
            <div className="text-sm text-blue-800">Total Entries</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatBytes(cacheStats?.memoryUsageMB * 1024 * 1024 || 0)}
            </div>
            <div className="text-sm text-green-800">Memory Usage</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {cacheStats?.hitRate || '0%'}
            </div>
            <div className="text-sm text-purple-800">Hit Rate</div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatPercentage(cacheStats?.efficiency / 100 || 0)}
            </div>
            <div className="text-sm text-orange-800">Efficiency</div>
          </div>
        </div>
      </div>

      {/* API Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{apiStats?.total || 0}</div>
            <div className="text-sm text-indigo-800">Total Requests</div>
          </div>
          
          <div className="bg-teal-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-teal-600">{apiStats?.cached || 0}</div>
            <div className="text-sm text-teal-800">Cached Requests</div>
          </div>
          
          <div className="bg-pink-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-pink-600">{apiStats?.network || 0}</div>
            <div className="text-sm text-pink-800">Network Requests</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{apiStats?.errors || 0}</div>
            <div className="text-sm text-red-800">Errors</div>
          </div>
        </div>
      </div>

      {/* Cache Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Details</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Hits:</strong> {cacheStats?.hits || 0}
            </div>
            <div>
              <strong>Misses:</strong> {cacheStats?.misses || 0}
            </div>
            <div>
              <strong>Sets:</strong> {cacheStats?.sets || 0}
            </div>
            <div>
              <strong>Deletes:</strong> {cacheStats?.deletes || 0}
            </div>
            <div>
              <strong>Average Entry Size:</strong> {formatBytes(cacheStats?.averageEntrySize * 1024 || 0)}
            </div>
            <div>
              <strong>Rate Limit Tokens:</strong> {apiStats?.rateLimitTokens || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Performance Tab Component
const PerformanceTab = ({ cacheStats, apiStats }) => {
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Cache Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Hit Rate:</span>
                <span className="font-medium">{cacheStats?.hitRate || '0%'}</span>
              </div>
              <div className="flex justify-between">
                <span>Efficiency:</span>
                <span className="font-medium">{(cacheStats?.efficiency || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Memory Usage:</span>
                <span className="font-medium">{(cacheStats?.memoryUsageMB || 0).toFixed(2)} MB</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">API Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Average Response Time:</span>
                <span className="font-medium">{(apiStats?.averageResponseTime || 0).toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Cache Hit Rate:</span>
                <span className="font-medium">
                  {apiStats?.total > 0 ? ((apiStats.cached / apiStats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Error Rate:</span>
                <span className="font-medium">
                  {apiStats?.total > 0 ? ((apiStats.errors / apiStats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">📊</div>
            <p>Performance charts will be implemented here</p>
            <p className="text-sm">Real-time monitoring of cache and API performance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ cacheStats, apiStats }) => {
  return (
    <div className="space-y-6">
      {/* User Behavior Analytics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Behavior Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{cacheStats?.accessPatterns || 0}</div>
            <div className="text-sm text-gray-600">Access Patterns</div>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{cacheStats?.mlPredictions || 0}</div>
            <div className="text-sm text-gray-600">ML Predictions</div>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{cacheStats?.analyticsEntries || 0}</div>
            <div className="text-sm text-gray-600">Analytics Entries</div>
          </div>
        </div>
      </div>

      {/* Cache Analytics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Analytics</h3>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">📈</div>
            <p>Detailed analytics will be implemented here</p>
            <p className="text-sm">Access patterns, user behavior, and ML insights</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = () => {
  const [settings, setSettings] = useState({
    cacheEnabled: true,
    compressionEnabled: true,
    prefetchEnabled: true,
    mlEnabled: true,
    analyticsEnabled: true
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Settings</h3>
      
      <div className="bg-white border rounded-lg p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable Caching</div>
              <div className="text-sm text-gray-500">Enable the enhanced caching system</div>
            </div>
            <input
              type="checkbox"
              checked={settings.cacheEnabled}
              onChange={(e) => handleSettingChange('cacheEnabled', e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable Compression</div>
              <div className="text-sm text-gray-500">Compress cached data to save memory</div>
            </div>
            <input
              type="checkbox"
              checked={settings.compressionEnabled}
              onChange={(e) => handleSettingChange('compressionEnabled', e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable Prefetching</div>
              <div className="text-sm text-gray-500">Automatically prefetch related content</div>
            </div>
            <input
              type="checkbox"
              checked={settings.prefetchEnabled}
              onChange={(e) => handleSettingChange('prefetchEnabled', e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable ML Predictions</div>
              <div className="text-sm text-gray-500">Use machine learning for intelligent caching</div>
            </div>
            <input
              type="checkbox"
              checked={settings.mlEnabled}
              onChange={(e) => handleSettingChange('mlEnabled', e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable Analytics</div>
              <div className="text-sm text-gray-500">Track cache performance and user behavior</div>
            </div>
            <input
              type="checkbox"
              checked={settings.analyticsEnabled}
              onChange={(e) => handleSettingChange('analyticsEnabled', e.target.checked)}
              className="rounded"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default CacheManagementDashboard; 