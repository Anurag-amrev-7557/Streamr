import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { testAuthFlow, testLoginFlow } from '../utils/testAuth';
import { getApiUrl } from '../config/api';

const TestAuthPage = () => {
  const { user, loading, login, logout, switchBackendMode, getCurrentBackendMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (message) => {
    setTestResults(prev => [...prev, { message, timestamp: new Date().toISOString() }]);
  };

  const runAuthTest = async () => {
    setTestResults([]);
    addTestResult('Starting authentication test...');
    await testAuthFlow();
    addTestResult('Authentication test completed. Check console for details.');
  };

  const runLoginTest = async () => {
    if (!email || !password) {
      addTestResult('Please enter email and password');
      return;
    }
    
    setTestResults([]);
    addTestResult('Starting login test...');
    const result = await testLoginFlow(email, password);
    addTestResult(`Login test completed: ${result.success ? 'Success' : 'Failed'}`);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setTestResults([]);
    addTestResult('Attempting login...');
    
    const result = await login(email, password);
    if (result.success) {
      addTestResult('Login successful!');
    } else {
      addTestResult(`Login failed: ${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1114] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
        
        {/* Current Auth Status */}
        <div className="bg-[#1a1d21] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>User:</strong> {user ? `${user.username} (${user.email})` : 'Not logged in'}</p>
            <p><strong>Access Token:</strong> {localStorage.getItem('accessToken') ? 'Present' : 'Not found'}</p>
            <p><strong>Cookies:</strong> {document.cookie || 'No cookies'}</p>
            <p><strong>Backend Mode:</strong> {getCurrentBackendMode()}</p>
            <p><strong>API URL:</strong> {getApiUrl()}</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-[#1a1d21] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Login Test</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2d31] border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2d31] border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter password"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Login
              </button>
              <button
                type="button"
                onClick={runLoginTest}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Test Login API
              </button>
            </div>
          </form>
        </div>

        {/* Test Controls */}
        <div className="bg-[#1a1d21] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={runAuthTest}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Run Auth Flow Test
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('accessToken');
                addTestResult('Access token cleared from localStorage');
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
            >
              Clear Access Token
            </button>
            <button
              onClick={() => {
                const newMode = getCurrentBackendMode() === 'local' ? 'deployed' : 'local';
                switchBackendMode(newMode);
                addTestResult(`Switched to ${newMode} backend`);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Switch Backend ({getCurrentBackendMode() === 'local' ? 'Deployed' : 'Local'})
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-[#1a1d21] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-400">No test results yet. Run a test to see results here.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm">
                  <span className="text-gray-400">[{result.timestamp}]</span> {result.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestAuthPage; 