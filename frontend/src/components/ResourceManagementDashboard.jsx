import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import enhancedResourceManager from '../services/enhancedResourceManager';
import enhancedImageOptimizationService from '../services/enhancedImageOptimizationService';
import enhancedNetworkOptimizationService from '../services/enhancedNetworkOptimizationService';

const ResourceManagementDashboard = ({ isVisible = false, onClose }) => {
  const [resourceStatus, setResourceStatus] = useState(null);
  const [imageStats, setImageStats] = useState(null);
  const [networkStats, setNetworkStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const updateIntervalRef = useRef(null);

  useEffect(() => {
    if (!isVisible) return;

    // Initial load
    updateStats();

    // Set up update interval
    updateIntervalRef.current = setInterval(updateStats, 2000);

    // Set up event listeners
    const unsubscribeResource = enhancedResourceManager.on('initialized', updateStats);
    const unsubscribeImage = enhancedImageOptimizationService.on('initialized', updateStats);
    const unsubscribeNetwork = enhancedNetworkOptimizationService.on('initialized', updateStats);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      unsubscribeResource?.();
      unsubscribeImage?.();
      unsubscribeNetwork?.();
    };
  }, [isVisible]);

  const updateStats = () => {
    try {
      // Get resource manager status
      const resourceStatus = enhancedResourceManager.getStatus();
      setResourceStatus(resourceStatus);

      // Get image optimization stats
      const imageStats = enhancedImageOptimizationService.getStats();
      setImageStats(imageStats);

      // Get network optimization stats
      const networkStats = enhancedNetworkOptimizationService.getStats();
      setNetworkStats(networkStats);

      // Get optimization recommendations
      const recommendations = enhancedResourceManager.getOptimizationRecommendations();
      setRecommendations(recommendations);
    } catch (error) {
      console.warn('Failed to update resource stats:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'text-green-400';
      case 'fair':
        return 'text-yellow-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return '🟢';
      case 'fair':
        return '🟡';
      case 'poor':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const handleOptimization = (recommendation) => {
    try {
      recommendation.action();
      updateStats();
    } catch (error) {
      console.error('Failed to apply optimization:', error);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'memory', name: 'Memory', icon: '💾' },
    { id: 'network', name: 'Network', icon: '🌐' },
    { id: 'images', name: 'Images', icon: '🖼️' },
    { id: 'recommendations', name: 'Optimize', icon: '⚡' }
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl ${
          isExpanded ? 'w-96 h-[600px]' : 'w-80 h-96'
        } transition-all duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <h3 className="text-white font-semibold">Resource Manager</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? '📉' : '📈'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white bg-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {isExpanded && tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-full">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* System Status */}
                {resourceStatus && (
                  <div className="space-y-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      📊 System Status
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-sm text-gray-400">Memory</div>
                        <div className="text-white font-semibold">
                          {resourceStatus.memoryUsage?.toFixed(1)} MB
                        </div>
                        <div className={`text-xs ${getStatusColor(resourceStatus.memoryStatus)}`}>
                          {getStatusIcon(resourceStatus.memoryStatus)} {resourceStatus.memoryStatus}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-sm text-gray-400">Network</div>
                        <div className="text-white font-semibold">
                          {getStatusIcon(resourceStatus.networkStatus)}
                        </div>
                        <div className={`text-xs ${getStatusColor(resourceStatus.networkStatus)}`}>
                          {resourceStatus.networkStatus}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-sm text-gray-400">Cache</div>
                        <div className="text-white font-semibold">
                          {getStatusIcon(resourceStatus.cacheStatus)}
                        </div>
                        <div className={`text-xs ${getStatusColor(resourceStatus.cacheStatus)}`}>
                          {resourceStatus.cacheStatus}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-sm text-gray-400">Performance</div>
                        <div className="text-white font-semibold">
                          {getStatusIcon(resourceStatus.performanceStatus)}
                        </div>
                        <div className={`text-xs ${getStatusColor(resourceStatus.performanceStatus)}`}>
                          {resourceStatus.performanceStatus}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="space-y-3">
                  <h4 className="text-white font-semibold">📈 Quick Stats</h4>
                  
                  {imageStats && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-sm text-gray-400 mb-2">Image Loading</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Success: {imageStats.successfulLoads}</div>
                        <div>Failed: {imageStats.failedLoads}</div>
                        <div>Cache Hits: {imageStats.cacheHits}</div>
                        <div>Avg Time: {formatTime(imageStats.averageLoadTime)}</div>
                      </div>
                    </div>
                  )}
                  
                  {networkStats && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-sm text-gray-400 mb-2">Network</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Success: {networkStats.successfulRequests}</div>
                        <div>Failed: {networkStats.failedRequests}</div>
                        <div>Cached: {networkStats.cachedRequests}</div>
                        <div>Avg Time: {formatTime(networkStats.averageResponseTime)}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendations Preview */}
                {recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-white font-semibold">⚡ Quick Actions</h4>
                    <div className="space-y-2">
                      {recommendations.slice(0, 2).map((rec, index) => (
                        <button
                          key={index}
                          onClick={() => handleOptimization(rec)}
                          className="w-full text-left bg-yellow-600/20 hover:bg-yellow-600/30 rounded-lg p-2 text-xs text-yellow-300 transition-colors"
                        >
                          {rec.message}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'memory' && (
              <motion.div
                key="memory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h4 className="text-white font-semibold">💾 Memory Management</h4>
                
                {resourceStatus?.resourceUsage?.memory && (
                  <div className="space-y-3">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Current Usage</span>
                        <span className="text-white font-semibold">
                          {resourceStatus.resourceUsage.memory.current?.toFixed(1)} MB
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (resourceStatus.resourceUsage.memory.current / 800) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Peak</div>
                        <div className="text-white font-semibold">
                          {resourceStatus.resourceUsage.memory.peak?.toFixed(1)} MB
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Trend</div>
                        <div className="text-white font-semibold">
                          {resourceStatus.resourceUsage.memory.trend}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <button
                    onClick={() => enhancedResourceManager.performModerateCleanup()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 text-sm transition-colors"
                  >
                    🧽 Moderate Cleanup
                  </button>
                  <button
                    onClick={() => enhancedResourceManager.performAggressiveCleanup()}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-2 text-sm transition-colors"
                  >
                    🔥 Aggressive Cleanup
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'network' && (
              <motion.div
                key="network"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h4 className="text-white font-semibold">🌐 Network Optimization</h4>
                
                {networkStats && (
                  <div className="space-y-3">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Active Requests</span>
                        <span className="text-white font-semibold">
                          {networkStats.activeRequests}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(networkStats.activeRequests / networkStats.maxConcurrentRequests) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Success Rate</div>
                        <div className="text-white font-semibold">
                          {networkStats.totalRequests > 0
                            ? `${((networkStats.successfulRequests / networkStats.totalRequests) * 100).toFixed(1)}%`
                            : '0%'}
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Avg Response</div>
                        <div className="text-white font-semibold">
                          {formatTime(networkStats.averageResponseTime)}
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Cache Hits</div>
                        <div className="text-white font-semibold">
                          {networkStats.cachedRequests}
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Strategy</div>
                        <div className="text-white font-semibold">
                          {networkStats.currentStrategy}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <button
                    onClick={() => enhancedNetworkOptimizationService.clearAllCaches()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 text-sm transition-colors"
                  >
                    🗑️ Clear Network Cache
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'images' && (
              <motion.div
                key="images"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h4 className="text-white font-semibold">🖼️ Image Optimization</h4>
                
                {imageStats && (
                  <div className="space-y-3">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Active Loads</span>
                        <span className="text-white font-semibold">
                          {imageStats.activeLoads}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(imageStats.activeLoads / imageStats.maxConcurrentLoads) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Success Rate</div>
                        <div className="text-white font-semibold">
                          {imageStats.totalRequests > 0
                            ? `${((imageStats.successfulLoads / imageStats.totalRequests) * 100).toFixed(1)}%`
                            : '0%'}
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Cache Hits</div>
                        <div className="text-white font-semibold">
                          {imageStats.cacheHits}
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Avg Load Time</div>
                        <div className="text-white font-semibold">
                          {formatTime(imageStats.averageLoadTime)}
                        </div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-400">Failed Images</div>
                        <div className="text-white font-semibold">
                          {imageStats.failedImagesCount}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <button
                    onClick={() => enhancedImageOptimizationService.clearAllCaches()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 text-sm transition-colors"
                  >
                    🗑️ Clear Image Cache
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'recommendations' && (
              <motion.div
                key="recommendations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h4 className="text-white font-semibold">⚡ Optimization Recommendations</h4>
                
                {recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 rounded-lg p-3 border-l-4 border-yellow-500"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-white font-medium text-sm mb-1">
                              {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)} Optimization
                            </div>
                            <div className="text-gray-400 text-xs mb-2">
                              {rec.message}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                rec.priority === 'high' 
                                  ? 'bg-red-600/20 text-red-300' 
                                  : 'bg-yellow-600/20 text-yellow-300'
                              }`}>
                                {rec.priority} priority
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleOptimization(rec)}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-xs transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">✅</div>
                    <div className="text-gray-400 text-sm">
                      All systems are running optimally!
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <button
                    onClick={() => enhancedResourceManager.performComprehensiveCleanup()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg p-2 text-sm transition-colors"
                  >
                    🧹 Comprehensive Cleanup
                  </button>
                  <button
                    onClick={updateStats}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-lg p-2 text-sm transition-colors"
                  >
                    🔄 Refresh Stats
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ResourceManagementDashboard; 