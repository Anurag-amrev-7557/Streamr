import React, { useState } from 'react';
import debugAuth from '../utils/debugAuth';

const AuthDebugger = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  const handleCookieTest = async () => {
    setLoading(true);
    try {
      const result = await debugAuth.testCookieSending();
      setResults({ type: 'cookie', ...result });
    } catch (error) {
      setResults({ type: 'cookie', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginTest = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    
    setLoading(true);
    try {
      const result = await debugAuth.testLoginFlow(email, password);
      setResults({ type: 'login', ...result });
    } catch (error) {
      setResults({ type: 'login', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthHeaderTest = async () => {
    if (!refreshToken) {
      alert('Please enter a refresh token');
      return;
    }
    
    setLoading(true);
    try {
      const result = await debugAuth.testWithAuthHeader(refreshToken);
      setResults({ type: 'authHeader', ...result });
    } catch (error) {
      setResults({ type: 'authHeader', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCookies = () => {
    const cookies = debugAuth.checkCookies();
    setResults({ type: 'cookies', cookies });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debugger</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cookie Test */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-3">Cookie Test</h2>
          <button
            onClick={handleCookieTest}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Cookie Sending'}
          </button>
        </div>

        {/* Login Test */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-3">Login Flow Test</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          <button
            onClick={handleLoginTest}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Login Flow'}
          </button>
        </div>

        {/* Auth Header Test */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-3">Auth Header Test</h2>
          <input
            type="text"
            placeholder="Refresh Token"
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          <button
            onClick={handleAuthHeaderTest}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Auth Header'}
          </button>
        </div>

        {/* Check Cookies */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-3">Check Cookies</h2>
          <button
            onClick={handleCheckCookies}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Check Current Cookies
          </button>
        </div>


      </div>

      {/* Results */}
      {results && (
        <div className="mt-6 bg-white p-4 rounded border">
          <h3 className="text-lg font-semibold mb-3">Results</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AuthDebugger; 