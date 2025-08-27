import React, { useState } from 'react';
import { testRefreshTokenFlow, testCookies, testApiConnectivity, testCurrentAuthState } from '../utils/testRefreshToken';
import { getApiUrl } from '../config/api';

const TestRefreshToken = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    addResult('🧪 Starting refresh token tests...', 'info');
    
    try {
      // Test 1: Current Auth State
      addResult('🔍 Testing current authentication state...', 'info');
      const authState = testCurrentAuthState();
      addResult(`🔑 Access token: ${authState.hasAccessToken ? 'Available' : 'Not found'}`, authState.hasAccessToken ? 'success' : 'info');
      addResult(`💾 Refresh token: ${authState.hasRefreshToken ? 'Available' : 'Not found'}`, authState.hasRefreshToken ? 'success' : 'info');
      addResult(`🍪 Cookies: ${authState.cookieCount} found`, authState.hasCookies ? 'success' : 'info');
      
      // Test 2: API Connectivity
      addResult('🌐 Testing API connectivity...', 'info');
      const apiConnected = await testApiConnectivity();
      if (apiConnected) {
        addResult('✅ API connectivity test passed', 'success');
      } else {
        addResult('❌ API connectivity test failed', 'error');
      }
      
      // Test 3: Cookies
      addResult('🍪 Testing cookies...', 'info');
      const cookies = testCookies();
      addResult(`📋 Found ${Object.keys(cookies).length} cookies`, 'info');
      
      // Test 4: Refresh Token Flow (only if we have tokens)
      if (authState.hasRefreshToken || authState.hasCookies) {
        addResult('🔄 Testing refresh token flow...', 'info');
        await testRefreshTokenFlow();
      } else {
        addResult('⚠️ Skipping refresh token test - no tokens available', 'info');
      }
      
    } catch (error) {
      addResult(`❌ Test error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      addResult('🏁 Tests completed', 'info');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Refresh Token Test</h2>
      
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          Current API URL: <code className="bg-gray-100 px-2 py-1 rounded">{getApiUrl()}</code>
        </p>
        <p className="text-gray-600 mb-4">
          This test will help debug the refresh token issue by testing the authentication flow.
        </p>
      </div>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={runTests}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {isLoading ? 'Running Tests...' : 'Run Tests'}
        </button>
        
        <button
          onClick={clearResults}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Clear Results
        </button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
        
        {testResults.length === 0 ? (
          <p className="text-gray-500">No test results yet. Click "Run Tests" to start.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded text-sm font-mono ${
                  result.type === 'error' ? 'bg-red-100 text-red-800' :
                  result.type === 'success' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                <span className="text-gray-500 text-xs">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
                {' '}
                {result.message}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-semibold text-yellow-800 mb-2">Debugging Tips:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Check browser console for additional error details</li>
          <li>• Verify that cookies are enabled in your browser</li>
          <li>• Check if the backend is running and accessible</li>
          <li>• Look for CORS errors in the network tab</li>
          <li>• Verify that the API URL is correct</li>
        </ul>
      </div>
    </div>
  );
};

export default TestRefreshToken; 