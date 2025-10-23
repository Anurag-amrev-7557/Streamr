import React, { useState, useEffect } from 'react';
import { 
  switchToLocalBackend, 
  switchToDeployedBackend, 
  testBackendConnection, 
  getBackendStatus,
  autoSwitchBackend 
} from '../utils/backendSwitcher.js';

const BackendSwitcher = () => {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    updateStatus();
  }, []);

  const updateStatus = async () => {
    const currentStatus = getBackendStatus();
    setStatus(currentStatus);
  };

  const handleSwitch = async (mode) => {
    setIsLoading(true);
    setMessage('');
    
    try {
      let result;
      if (mode === 'local') {
        result = await switchToLocalBackend();
      } else if (mode === 'deployed') {
        result = await switchToDeployedBackend();
      }
      
      if (result.success) {
        setMessage(`✅ Successfully switched to ${mode} backend`);
        await updateStatus();
        
        // Reload the page to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage(`❌ Failed to switch: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const isConnected = await testBackendConnection();
      setMessage(isConnected ? '✅ Backend is accessible' : '❌ Backend is not accessible');
      await updateStatus();
    } catch (error) {
      setMessage(`❌ Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSwitch = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await autoSwitchBackend();
      if (result.success) {
        setMessage(`🔄 Auto-switched to ${result.mode} backend`);
        await updateStatus();
        
        // Reload the page to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage(`❌ Auto-switch failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!status) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Backend Switcher</h3>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Current Mode:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            status.mode === 'local' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>
            {status.mode}
          </span>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Status:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            status.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {status.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          Last updated: {new Date(status.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => handleSwitch('local')}
          disabled={isLoading || status.mode === 'local'}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
        >
          {isLoading ? 'Switching...' : 'Switch to Local'}
        </button>
        
        <button
          onClick={() => handleSwitch('deployed')}
          disabled={isLoading || status.mode === 'deployed'}
          className="w-full px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600"
        >
          {isLoading ? 'Switching...' : 'Switch to Deployed'}
        </button>
        
        <button
          onClick={handleTestConnection}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>
        
        <button
          onClick={handleAutoSwitch}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600"
        >
          {isLoading ? 'Switching...' : 'Auto-Switch'}
        </button>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded text-sm ${
          message.includes('✅') ? 'bg-green-100 text-green-800' :
          message.includes('❌') ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default BackendSwitcher; 