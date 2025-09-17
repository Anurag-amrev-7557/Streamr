import { switchBackendMode, getCurrentBackendMode, getApiUrl, getBaseUrl } from '../config/api';

/**
 * Utility class for managing backend configuration
 */
class BackendSwitcher {
  /**
   * Switch to local backend for development
   */
  static switchToLocal() {
    const success = switchBackendMode('local');
    if (success) {
      console.log('🔄 Switched to LOCAL backend');
      console.log(`📍 API URL: ${getApiUrl()}`);
      console.log(`📍 Base URL: ${getBaseUrl()}`);
      console.log('💡 Note: Local uploads directory may be empty');
      console.log('💡 Use /api/upload/proxy/:filename to fetch files from deployed backend');
    }
    return success;
  }

  /**
   * Switch to deployed backend for production
   */
  static switchToDeployed() {
    const success = switchBackendMode('deployed');
    if (success) {
      console.log('🔄 Switched to DEPLOYED backend');
      console.log(`📍 API URL: ${getApiUrl()}`);
      console.log(`📍 Base URL: ${getBaseUrl()}`);
      console.log('💡 Note: All files and data will come from deployed backend');
    }
    return success;
  }

  /**
   * Get current backend status and configuration
   */
  static getStatus() {
    const mode = getCurrentBackendMode();
    const apiUrl = getApiUrl();
    const baseUrl = getBaseUrl();
    
    return {
      mode,
      apiUrl,
      baseUrl,
      isLocal: mode === 'local',
      isDeployed: mode === 'deployed',
      uploadsUrl: `${baseUrl}/uploads`,
      proxyUrl: mode === 'local' ? `${baseUrl}/api/upload/proxy` : null
    };
  }

  /**
   * Display current backend configuration in console
   */
  static logStatus() {
    const status = this.getStatus();
    
    console.log('🔧 Backend Configuration:');
    console.log(`   Mode: ${status.mode.toUpperCase()}`);
    console.log(`   API URL: ${status.apiUrl}`);
    console.log(`   Base URL: ${status.baseUrl}`);
    console.log(`   Uploads: ${status.uploadsUrl}`);
    
    if (status.proxyUrl) {
      console.log(`   Proxy: ${status.proxyUrl}/:filename`);
      console.log('💡 Use proxy endpoint to fetch files from deployed backend when running locally');
    }
    
    console.log('');
  }

  /**
   * Test connectivity to current backend
   */
  static async testConnectivity() {
    try {
      const response = await fetch(`${getApiUrl()}/health`);
      const data = await response.json();
      
      console.log('✅ Backend connectivity test: SUCCESS');
      console.log(`   Status: ${data.status}`);
      console.log(`   Timestamp: ${data.timestamp}`);
      
      return true;
    } catch (error) {
      console.error('❌ Backend connectivity test: FAILED');
      console.error(`   Error: ${error.message}`);
      
      return false;
    }
  }

  /**
   * Quick setup for development
   */
  static setupForDevelopment() {
    console.log('🚀 Setting up for development...');
    
    // Switch to local backend
    this.switchToLocal();
    
    // Log status
    this.logStatus();
    
    // Test connectivity
    this.testConnectivity();
    
    console.log('💡 Development setup complete!');
    console.log('💡 If you need files from deployed backend, use the proxy endpoint');
  }

  /**
   * Quick setup for production
   */
  static setupForProduction() {
    console.log('🚀 Setting up for production...');
    
    // Switch to deployed backend
    this.switchToDeployed();
    
    // Log status
    this.logStatus();
    
    // Test connectivity
    this.testConnectivity();
    
    console.log('💡 Production setup complete!');
  }
}

export default BackendSwitcher; 