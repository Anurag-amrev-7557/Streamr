// Backend Switcher Utility
import { switchBackendMode, getCurrentBackendMode, testBackendConnectivity } from '../config/api.js';

class BackendSwitcher {
  constructor() {
    this.currentMode = getCurrentBackendMode();
    this.connectionStatus = null;
  }

  // Switch to local backend
  async switchToLocal() {
    try {
      const success = switchBackendMode('local');
      if (success) {
        this.currentMode = 'local';
        console.log('✅ Switched to local backend');
        
        // Test connectivity
        const isConnected = await this.testConnection();
        if (isConnected) {
          console.log('✅ Local backend is accessible');
        } else {
          console.warn('⚠️ Local backend is not accessible. Make sure it\'s running on port 3001');
        }
        
        return { success: true, mode: 'local', connected: isConnected };
      }
      return { success: false, error: 'Failed to switch to local backend' };
    } catch (error) {
      console.error('Error switching to local backend:', error);
      return { success: false, error: error.message };
    }
  }

  // Switch to deployed backend
  async switchToDeployed() {
    try {
      const success = switchBackendMode('deployed');
      if (success) {
        this.currentMode = 'deployed';
        console.log('✅ Switched to deployed backend');
        
        // Test connectivity
        const isConnected = await this.testConnection();
        if (isConnected) {
          console.log('✅ Deployed backend is accessible');
        } else {
          console.warn('⚠️ Deployed backend is not accessible. Check your internet connection');
        }
        
        return { success: true, mode: 'deployed', connected: isConnected };
      }
      return { success: false, error: 'Failed to switch to deployed backend' };
    } catch (error) {
      console.error('Error switching to deployed backend:', error);
      return { success: false, error: error.message };
    }
  }

  // Test current backend connectivity
  async testConnection() {
    try {
      const isConnected = await testBackendConnectivity();
      this.connectionStatus = isConnected;
      return isConnected;
    } catch (error) {
      console.error('Error testing backend connectivity:', error);
      this.connectionStatus = false;
      return false;
    }
  }

  // Get current status
  getStatus() {
    return {
      mode: this.currentMode,
      connected: this.connectionStatus,
      timestamp: new Date().toISOString()
    };
  }

  // Auto-switch based on connectivity
  async autoSwitch() {
    const localConnected = await this.testConnection();
    
    if (!localConnected && this.currentMode === 'local') {
      console.log('🔄 Local backend not accessible, switching to deployed...');
      return await this.switchToDeployed();
    } else if (!localConnected && this.currentMode === 'deployed') {
      console.log('🔄 Deployed backend not accessible, switching to local...');
      return await this.switchToLocal();
    }
    
    return { success: true, mode: this.currentMode, connected: localConnected };
  }
}

// Create singleton instance
const backendSwitcher = new BackendSwitcher();

// Export functions for easy use
export const switchToLocalBackend = () => backendSwitcher.switchToLocal();
export const switchToDeployedBackend = () => backendSwitcher.switchToDeployed();
export const testBackendConnection = () => backendSwitcher.testConnection();
export const getBackendStatus = () => backendSwitcher.getStatus();
export const autoSwitchBackend = () => backendSwitcher.autoSwitch();

// Make functions available globally for easy debugging
if (typeof window !== 'undefined') {
  window.switchToLocalBackend = switchToLocalBackend;
  window.switchToDeployedBackend = switchToDeployedBackend;
  window.testBackendConnection = testBackendConnection;
  window.getBackendStatus = getBackendStatus;
  window.autoSwitchBackend = autoSwitchBackend;
  
  console.log('🌐 Backend switcher available globally:');
  console.log('- switchToLocalBackend()');
  console.log('- switchToDeployedBackend()');
  console.log('- testBackendConnection()');
  console.log('- getBackendStatus()');
  console.log('- autoSwitchBackend()');
}

export default backendSwitcher; 