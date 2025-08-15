import React from 'react';
import BackendSwitcher from '../components/BackendSwitcher.jsx';

const TestBackendPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Backend Management & Testing
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This page helps you manage your backend connections and switch between local and deployed backends.
            Use it to resolve rate limiting issues or test connectivity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Backend Switcher
            </h2>
            <BackendSwitcher />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Quick Actions
            </h2>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-3 text-gray-700">Console Commands</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-gray-100 p-2 rounded font-mono">
                  switchToLocalBackend()
                </div>
                <div className="bg-gray-100 p-2 rounded font-mono">
                  switchToDeployedBackend()
                </div>
                <div className="bg-gray-100 p-2 rounded font-mono">
                  testBackendConnection()
                </div>
                <div className="bg-gray-100 p-2 rounded font-mono">
                  getBackendStatus()
                </div>
                <div className="bg-gray-100 p-2 rounded font-mono">
                  autoSwitchBackend()
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Open your browser console and use these commands to quickly switch backends or test connectivity.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border mt-4">
              <h3 className="font-medium mb-3 text-gray-700">Current Status</h3>
              <div className="text-sm text-gray-600">
                <p>• Check the left panel for real-time backend status</p>
                <p>• Use the switcher to change between local and deployed</p>
                <p>• Test connectivity before switching</p>
                <p>• Auto-switch will find the best available backend</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Troubleshooting Guide
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Rate Limiting (429 Errors)</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Switch to local backend to avoid rate limits</p>
                <p>• Check if your deployed backend is working properly</p>
                <p>• Consider implementing better caching strategies</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Local Backend Not Working</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Ensure your backend is running on port 3001</p>
                <p>• Check terminal for any error messages</p>
                <p>• Verify your backend dependencies are installed</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Deployed Backend Issues</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Check your internet connection</p>
                <p>• Verify the deployed URL is correct</p>
                <p>• Check if the service is online (Render, Heroku, etc.)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestBackendPage; 