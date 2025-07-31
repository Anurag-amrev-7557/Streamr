import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  checkNetworkConnectivity, 
  simulateNetworkError, 
  classifyNetworkError,
  calculateRetryDelay,
  networkMonitor,
  fetchWithRetry
} from '../utils/networkUtils';

const NetworkTestPage = () => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = networkMonitor.addListener((status) => {
      setNetworkStatus(status);
      console.log('Network status changed:', status);
    });

    // Initial network check
    checkNetworkConnectivity().then(setNetworkStatus);

    return unsubscribe;
  }, []);

  const runNetworkTest = async () => {
    setIsLoading(true);
    const results = [];

    try {
      // Test 1: Basic connectivity
      const connectivity = await checkNetworkConnectivity();
      results.push({
        test: 'Network Connectivity',
        status: connectivity.isConnected ? '✅ Connected' : '❌ Disconnected',
        details: connectivity
      });

      // Test 2: Error classification
      const testErrors = [
        simulateNetworkError('CONNECTION_RESET'),
        simulateNetworkError('TIMEOUT'),
        simulateNetworkError('DNS_FAILURE'),
        simulateNetworkError('SSL_ERROR')
      ];

      testErrors.forEach((error, index) => {
        const classification = classifyNetworkError(error);
        results.push({
          test: `Error Classification ${index + 1}`,
          status: '✅ Classified',
          details: {
            originalError: error.message,
            classification: classification
          }
        });
      });

      // Test 3: Retry delay calculation
      const retryDelays = [];
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = calculateRetryDelay(attempt, 'CONNECTION_RESET');
        retryDelays.push({ attempt, delay });
      }
      
      results.push({
        test: 'Retry Delay Calculation',
        status: '✅ Calculated',
        details: { delays: retryDelays }
      });

      // Test 4: Enhanced fetch with retry
      try {
        const response = await fetchWithRetry('https://httpbin.org/status/200', {}, {
          maxRetries: 2,
          timeout: 5000
        });
        results.push({
          test: 'Enhanced Fetch with Retry',
          status: '✅ Success',
          details: { status: response.status }
        });
      } catch (error) {
        results.push({
          test: 'Enhanced Fetch with Retry',
          status: '❌ Failed',
          details: { error: error.message }
        });
      }

    } catch (error) {
      results.push({
        test: 'Test Suite',
        status: '❌ Error',
        details: { error: error.message }
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const simulateError = (errorType) => {
    const error = simulateNetworkError(errorType);
    const classification = classifyNetworkError(error);
    
    setTestResults([{
      test: `Simulated ${errorType}`,
      status: '✅ Simulated',
      details: {
        originalError: error.message,
        classification: classification
      }
    }]);
  };

  return (
    <div className="min-h-screen bg-[#121417] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-8">Network Error Handling Test</h1>
          
          {/* Network Status */}
          <div className="bg-white/5 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Network Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-medium mb-2">Current Status</h3>
                <p className={`text-lg ${networkStatus?.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {networkStatus?.isConnected ? '🟢 Online' : '🔴 Offline'}
                </p>
                {networkStatus?.details && (
                  <div className="mt-2 text-sm text-white/60">
                    <p>Latency: {networkStatus.details.latency || 'N/A'}ms</p>
                    <p>Status: {networkStatus.details.status || 'N/A'}</p>
                  </div>
                )}
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-medium mb-2">Last Update</h3>
                <p className="text-sm text-white/60">
                  {networkStatus?.timestamp ? new Date(networkStatus.timestamp).toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="bg-white/5 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={runNetworkTest}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Running Tests...' : 'Run Full Test Suite'}
              </button>
              
              <button
                onClick={() => simulateError('CONNECTION_RESET')}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Simulate Connection Reset
              </button>
              
              <button
                onClick={() => simulateError('TIMEOUT')}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors"
              >
                Simulate Timeout
              </button>
              
              <button
                onClick={() => simulateError('DNS_FAILURE')}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors"
              >
                Simulate DNS Failure
              </button>
            </div>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Test Results</h2>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/10 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{result.test}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.status.includes('✅') ? 'bg-green-500/20 text-green-400' :
                        result.status.includes('❌') ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                    
                    {result.details && (
                      <div className="text-sm text-white/60">
                        <pre className="whitespace-pre-wrap bg-black/20 rounded p-2 mt-2 text-xs">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Error Handling Info */}
          <div className="bg-white/5 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">Error Handling Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Enhanced Error Classification</h3>
                <ul className="text-sm text-white/60 space-y-1">
                  <li>• Connection Reset Detection</li>
                  <li>• Timeout Error Handling</li>
                  <li>• DNS Failure Recognition</li>
                  <li>• SSL/TLS Error Detection</li>
                  <li>• Rate Limiting Response</li>
                  <li>• Server Error Classification</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Retry Mechanisms</h3>
                <ul className="text-sm text-white/60 space-y-1">
                  <li>• Exponential Backoff</li>
                  <li>• Jitter for Load Distribution</li>
                  <li>• Error-Type Specific Delays</li>
                  <li>• Maximum Retry Limits</li>
                  <li>• Network Connectivity Checks</li>
                  <li>• User-Friendly Error Messages</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NetworkTestPage; 