// API Configuration
// Change this to switch between local and deployed backend
const API_CONFIG = {
  // Set to 'local' for local development, 'deployed' for production backend
  mode: 'local',
  
  // API URLs
  local: 'http://localhost:3001/api',
  deployed: 'https://streamr-jjj9.onrender.com/api',
  
  // Socket URLs
  localSocket: 'http://localhost:3001/community',
  deployedSocket: 'https://streamr-jjj9.onrender.com/community'
};

// Get the appropriate API URL based on mode
export const getApiUrl = () => {
  return API_CONFIG[API_CONFIG.mode];
};

// Get the appropriate Socket URL based on mode
export const getSocketUrl = () => {
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

// Export the config for debugging
export const getApiConfig = () => {
  return { ...API_CONFIG };
};

export default API_CONFIG; 