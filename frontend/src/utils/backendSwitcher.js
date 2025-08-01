// Backend Switcher Utility
// This utility helps you switch between local and deployed backends

import API_CONFIG from '../config/api';

export const switchBackend = (mode) => {
  if (mode !== 'local' && mode !== 'deployed') {
    console.error('Invalid mode. Use "local" or "deployed"');
    return false;
  }
  
  // Update the config
  API_CONFIG.mode = mode;
  
  console.log(`✅ Switched to ${mode} backend:`, API_CONFIG[mode]);
  
  // Reload the page to apply changes
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
  
  return true;
};

export const getCurrentBackend = () => {
  return {
    mode: API_CONFIG.mode,
    url: API_CONFIG[API_CONFIG.mode],
    socketUrl: API_CONFIG[`${API_CONFIG.mode}Socket`]
  };
};

export const isLocalBackend = () => {
  return API_CONFIG.mode === 'local';
};

export const isDeployedBackend = () => {
  return API_CONFIG.mode === 'deployed';
};

// Debug function to log current configuration
export const logBackendConfig = () => {
  console.log('🔧 Current Backend Configuration:');
  console.log('Mode:', API_CONFIG.mode);
  console.log('API URL:', API_CONFIG[API_CONFIG.mode]);
  console.log('Socket URL:', API_CONFIG[`${API_CONFIG.mode}Socket`]);
};

// Make functions available globally for easy debugging
if (typeof window !== 'undefined') {
  window.switchBackend = switchBackend;
  window.getCurrentBackend = getCurrentBackend;
  window.logBackendConfig = logBackendConfig;
  
  console.log('🌐 Backend switcher available:');
  console.log('- switchBackend("local") or switchBackend("deployed")');
  console.log('- getCurrentBackend()');
  console.log('- logBackendConfig()');
} 