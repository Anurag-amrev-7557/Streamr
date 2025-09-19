// Enhanced API Configuration with environment, versioning, and utility helpers

// --- API Configuration Object ---
const API_CONFIG = {
  // Set to 'local' for local development, 'deployed' for production backend
  mode: 'deployed', // Default: use local backend for development

  // API URLs
  local: 'http://localhost:3001/api',
  deployed: 'https://streamr-jjj9.onrender.com/api',

  // Socket URLs
  localSocket: 'http://localhost:3001',
  deployedSocket: 'https://streamr-jjj9.onrender.com',

  // API Versioning (optional, can be used for future upgrades)
  apiVersion: 'v1',

  // Environment
  env: import.meta.env.MODE || process.env.NODE_ENV || 'development'
};

// --- Utility: Get current environment ---
export const getEnv = () => API_CONFIG.env;

// --- Utility: Get API version ---
export const getApiVersion = () => API_CONFIG.apiVersion;

// --- Get the appropriate API URL based on mode and environment variable ---
export const getApiUrl = () => {
  // Prefer environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback to config-based URL
  return API_CONFIG[API_CONFIG.mode];
};

// --- Get the appropriate Socket URL based on mode and environment variable ---
export const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  return API_CONFIG[`${API_CONFIG.mode}Socket`];
};

// --- Get the appropriate base URL for file uploads and static assets ---
export const getBaseUrl = () => {
  if (import.meta.env.VITE_BASE_URL) {
    return import.meta.env.VITE_BASE_URL;
  }
  // Remove trailing '/api' if present
  return API_CONFIG[API_CONFIG.mode].replace(/\/api\/?$/, '');
};

// --- Get the correct file URL for uploads, with support for absolute, proxy, and fallback ---
export const getFileUrl = (filePath) => {
  if (!filePath) return null;

  // If already absolute URL, return as is
  if (/^https?:\/\//.test(filePath)) {
    return filePath;
  }

  // If in local mode and referencing uploads, use proxy to fetch from deployed if missing locally
  if (
    API_CONFIG.mode === 'local' &&
    (filePath.startsWith('/uploads/') || filePath.startsWith('uploads/'))
  ) {
    const filename = filePath.split('/').pop();
    return `${getApiUrl()}/upload/proxy/${filename}`;
  }

  // Remove leading slash if present
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

  // Return the full URL
  return `${getBaseUrl()}/${cleanPath}`;
};

// --- Check if we're using local backend ---
export const isLocalBackend = () => API_CONFIG.mode === 'local';

// --- Check if we're using deployed backend ---
export const isDeployedBackend = () => API_CONFIG.mode === 'deployed';

// --- Switch backend mode (local <-> deployed) ---
export const switchBackendMode = (mode) => {
  if (mode === 'local' || mode === 'deployed') {
    API_CONFIG.mode = mode;
    console.log(`Switched to ${mode} backend`);
    return true;
  }
  console.error('Invalid backend mode. Use "local" or "deployed"');
  return false;
};

// --- Get current backend mode ---
export const getCurrentBackendMode = () => API_CONFIG.mode;

// --- Test backend connectivity with timeout and error details ---
export const testBackendConnectivity = async (options = {}) => {
  const { timeout = 5000, path = '/health' } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${getApiUrl()}${path}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(id);
    return response.ok;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.warn('Backend connectivity test timed out');
    } else {
      console.warn('Backend connectivity test failed:', error.message);
    }
    return false;
  }
};

// --- Export the config for debugging and inspection ---
export const getApiConfig = () => ({ ...API_CONFIG });

// --- Utility: Print current API config (for debugging) ---
export const printApiConfig = () => {
  // eslint-disable-next-line no-console
  console.table(getApiConfig());
};

// --- Utility: Get full API endpoint with versioning (optional) ---
export const getApiEndpoint = (endpoint = '') => {
  // Optionally add versioning to the endpoint
  // e.g., /v1/resource
  const version = getApiVersion();
  let base = getApiUrl();
  if (version && !base.endsWith(`/${version}`) && !endpoint.startsWith(version)) {
    base = `${base.replace(/\/$/, '')}/${version}`;
  }
  return `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
};

export default API_CONFIG;