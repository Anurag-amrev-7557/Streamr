import React, { useState, useEffect } from 'react';
import rateLimitService from '../services/rateLimitService.js';

const RateLimitStatus = () => {
  const [status, setStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = rateLimitService.getStatus();
      setStatus(currentStatus);
      
      // Show status if there are queued requests or rate limits are being hit
      setIsVisible(
        currentStatus.queueLength > 0 || 
        currentStatus.requestCount > 60 || // Show when approaching limit
        !currentStatus.canMakeRequest
      );
    };

    // Update status every second
    const interval = setInterval(updateStatus, 1000);
    updateStatus(); // Initial update

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !status) return null;

  const getStatusColor = () => {
    if (status.requestCount >= 75) return 'text-red-600';
    if (status.requestCount >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusMessage = () => {
    if (status.requestCount >= 75) {
      return 'Rate limit nearly reached. Requests may be delayed.';
    }
    if (status.queueLength > 0) {
      return `${status.queueLength} requests queued. Please wait...`;
    }
    if (!status.canMakeRequest) {
      return 'Rate limit reached. Please wait before making more requests.';
    }
    return 'API requests are being managed efficiently.';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          API Status
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Requests:</span>
          <span className={getStatusColor()}>
            {status.requestCount} / {status.maxRequestsPerWindow}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Active:</span>
          <span className="text-blue-600">
            {status.activeRequests} / {status.maxConcurrentRequests}
          </span>
        </div>
        
        {status.queueLength > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Queued:</span>
            <span className="text-orange-600">{status.queueLength}</span>
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {getStatusMessage()}
        </div>
      </div>
    </div>
  );
};

export default RateLimitStatus; 