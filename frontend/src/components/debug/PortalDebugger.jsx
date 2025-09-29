import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import portalManagerService from '../../services/portalManagerService';

/**
 * Portal Debugger Component
 * 
 * A development-only component that provides real-time monitoring
 * and debugging capabilities for portal management.
 * 
 * Features:
 * - Real-time portal stack visualization
 * - Performance metrics display
 * - Memory usage monitoring
 * - Portal lifecycle tracking
 * - Interactive portal management
 */

const PortalDebugger = ({ isOpen, onClose }) => {
  const [portalInfo, setPortalInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(1000);

  // Update portal information periodically
  useEffect(() => {
    if (!isOpen) return;

    const updateInfo = () => {
      const stackInfo = portalManagerService.getStackInfo();
      const performanceMetrics = portalManagerService.getPerformanceMetrics();
      
      setPortalInfo(stackInfo);
      setMetrics(performanceMetrics);
    };

    updateInfo();
    const interval = setInterval(updateInfo, refreshInterval);

    return () => clearInterval(interval);
  }, [isOpen, refreshInterval]);

  // Handle portal actions
  const handlePortalAction = (action, portalId) => {
    const portal = portalManagerService.getPortalInfo(portalId);
    if (!portal) return;

    switch (action) {
      case 'focus':
        portal.focus();
        break;
      case 'bringToFront':
        portal.bringToFront();
        break;
      case 'sendToBack':
        portal.sendToBack();
        break;
      case 'remove':
        portal.cleanup();
        break;
      default:
        console.warn(`Unknown portal action: ${action}`);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.normal;
  };

  const getGroupColor = (group) => {
    const colors = {
      'movie-overlays': 'bg-purple-100 text-purple-800',
      'streaming': 'bg-green-100 text-green-800',
      'navigation': 'bg-indigo-100 text-indigo-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return colors[group] || colors.default;
  };

  if (!isOpen || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const debuggerContent = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999999999] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Portal Debugger</h2>
                <p className="text-blue-100 mt-1">Real-time portal management monitoring</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Performance Metrics */}
            {metrics && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {metrics.activePortals}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Active Portals</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {metrics.portalsCreated}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Created</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {metrics.portalsDestroyed}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">Destroyed</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {metrics.memoryUsage}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">Memory Usage</div>
                  </div>
                </div>
              </div>
            )}

            {/* Portal Stack */}
            {portalInfo && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Portal Stack ({portalInfo.stack.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Refresh:</label>
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      <option value={500}>500ms</option>
                      <option value={1000}>1s</option>
                      <option value={2000}>2s</option>
                      <option value={5000}>5s</option>
                    </select>
                  </div>
                </div>

                {portalInfo.stack.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No active portals
                  </div>
                ) : (
                  <div className="space-y-2">
                    {portalInfo.stack.map((portal, index) => (
                      <motion.div
                        key={portal.id}
                        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                #{index + 1}
                              </span>
                              <span className="font-mono text-sm bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                                {portal.id}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(portal.priority)}`}>
                                {portal.priority}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGroupColor(portal.group)}`}>
                                {portal.group}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Z-Index: <span className="font-mono">{portal.zIndex}</span>
                              {portal.createdAt && (
                                <span className="ml-4">
                                  Created: {new Date(portal.createdAt).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handlePortalAction('focus', portal.id)}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 rounded transition-colors"
                            >
                              Focus
                            </button>
                            <button
                              onClick={() => handlePortalAction('bringToFront', portal.id)}
                              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded transition-colors"
                            >
                              Front
                            </button>
                            <button
                              onClick={() => handlePortalAction('sendToBack', portal.id)}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 rounded transition-colors"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => handlePortalAction('remove', portal.id)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => portalManagerService.debugPortals()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Debug to Console
              </button>
              <button
                onClick={() => portalManagerService.cleanupAll()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cleanup All
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Create portal for debugger itself
  return createPortal(debuggerContent, document.body);
};

export default PortalDebugger;
