import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMetrics, getReport } from '../services/performanceOptimizationService';

const PerformanceDashboard = ({ isVisible = false, onClose }) => {
  const [metrics, setMetrics] = useState(null);
  const [report, setReport] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update metrics every 2 seconds
  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const currentMetrics = getMetrics();
      const currentReport = getReport();
      setMetrics(currentMetrics);
      setReport(currentReport);
    };

    updateMetrics(); // Initial call
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const getPerformanceScore = useCallback(() => {
    if (!metrics) return 0;

    let score = 100;
    
    // Deduct points for poor performance
    if (metrics.fcp > 1500) score -= 20;
    if (metrics.lcp > 2500) score -= 20;
    if (metrics.fid > 100) score -= 15;
    if (metrics.cls > 0.1) score -= 15;
    if (metrics.averageImageLoadTime > 1000) score -= 10;
    if (metrics.averageApiCallTime > 500) score -= 10;
    
    return Math.max(0, score);
  }, [metrics]);

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMetricColor = (value, threshold, type = 'lower') => {
    const isGood = type === 'lower' ? value <= threshold : value >= threshold;
    return isGood ? 'text-green-400' : 'text-red-400';
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl max-w-sm">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-white font-semibold">Performance</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-1 text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Performance Score */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/80 text-sm">Overall Score</span>
              <span className={`text-lg font-bold ${getScoreColor(getPerformanceScore())}`}>
                {getPerformanceScore()}/100
              </span>
            </div>

            {/* Core Web Vitals */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">FCP</span>
                <span className={`text-xs font-mono ${getMetricColor(metrics?.fcp || 0, 1500)}`}>
                  {metrics?.fcp ? `${Math.round(metrics.fcp)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">LCP</span>
                <span className={`text-xs font-mono ${getMetricColor(metrics?.lcp || 0, 2500)}`}>
                  {metrics?.lcp ? `${Math.round(metrics.lcp)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">FID</span>
                <span className={`text-xs font-mono ${getMetricColor(metrics?.fid || 0, 100)}`}>
                  {metrics?.fid ? `${Math.round(metrics.fid)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">CLS</span>
                <span className={`text-xs font-mono ${getMetricColor(metrics?.cls || 0, 0.1)}`}>
                  {metrics?.cls ? metrics.cls.toFixed(3) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-white/10"
                >
                  {/* Optimization Metrics */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Image Load Time</span>
                      <span className={`text-xs font-mono ${getMetricColor(metrics?.averageImageLoadTime || 0, 1000)}`}>
                        {metrics?.averageImageLoadTime ? `${Math.round(metrics.averageImageLoadTime)}ms` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">API Call Time</span>
                      <span className={`text-xs font-mono ${getMetricColor(metrics?.averageApiCallTime || 0, 500)}`}>
                        {metrics?.averageApiCallTime ? `${Math.round(metrics.averageApiCallTime)}ms` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Cache Hit Rate</span>
                      <span className={`text-xs font-mono ${getMetricColor(metrics?.cacheStats?.hits / (metrics?.cacheStats?.hits + metrics?.cacheStats?.misses) || 0, 0.8, 'higher')}`}>
                        {metrics?.cacheStats ? `${Math.round((metrics.cacheStats.hits / (metrics.cacheStats.hits + metrics.cacheStats.misses)) * 100)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {report?.recommendations && report.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-white/80 text-xs font-semibold">Recommendations</h4>
                      <div className="space-y-1">
                        {report.recommendations.slice(0, 3).map((rec, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <svg className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            <span className="text-white/60 text-xs leading-relaxed">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PerformanceDashboard; 