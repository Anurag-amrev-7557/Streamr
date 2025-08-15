// API Configuration
// Change this to switch between local and deployed backend
const API_CONFIG = {
  // Set to 'local' for local development, 'deployed' for production backend
  mode: 'deployed', // Use deployed backend for production
  
  // API URLs
  local: 'http://localhost:3001/api',
  deployed: 'https://streamr-jjj9.onrender.com/api',
  
  // Socket URLs
  localSocket: 'http://localhost:3001/community',
  deployedSocket: 'https://streamr-jjj9.onrender.com/community'
};

// Get the appropriate API URL based on mode
export const getApiUrl = () => {
  // Check for environment variable first (for deployment)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fall back to config-based URL
  return API_CONFIG[API_CONFIG.mode];
};

// Get the appropriate Socket URL based on mode
export const getSocketUrl = () => {
  // Check for environment variable first (for deployment)
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // Fall back to config-based URL
  return API_CONFIG[`${API_CONFIG.mode}Socket`];
};

// Check if we're using local backend
export const isLocalBackend = () => {
  return API_CONFIG.mode === 'local';
};

// Check if we're using deployed backend
export const isDeployedBackend = () => {
  return API_CONFIG.mode === 'deployed';
};

// Switch backend mode
export const switchBackendMode = (mode) => {
  if (mode === 'local' || mode === 'deployed') {
    API_CONFIG.mode = mode;
    console.log(`Switched to ${mode} backend`);
    return true;
  }
  console.error('Invalid backend mode. Use "local" or "deployed"');
  return false;
};

// Get current backend mode
export const getCurrentBackendMode = () => {
  return API_CONFIG.mode;
};

// Test backend connectivity
export const testBackendConnectivity = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend connectivity test failed:', error.message);
    return false;
  }
};

// Export the config for debugging
export const getApiConfig = () => {
  return { ...API_CONFIG };
};

export default API_CONFIG; 