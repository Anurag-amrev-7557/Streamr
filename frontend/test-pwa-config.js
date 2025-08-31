#!/usr/bin/env node

/**
 * Test PWA Configuration
 * 
 * This script tests the PWA configuration to ensure everything is set up correctly.
 * Run this in the browser console or as a module.
 */

import { PWA_CONFIG, PWA_SUPPORT, getPWAStatus } from './src/config/pwa.js';

console.log('🧪 Testing PWA Configuration...\n');

// Test configuration
console.log('📋 PWA Configuration:');
console.log('  App Name:', PWA_CONFIG.APP_NAME);
console.log('  App Short Name:', PWA_CONFIG.APP_SHORT_NAME);
console.log('  App Description:', PWA_CONFIG.APP_DESCRIPTION);
console.log('  VAPID Key Configured:', !!PWA_CONFIG.VAPID_PUBLIC_KEY);
console.log('  Push Notifications Enabled:', PWA_CONFIG.ENABLE_PUSH_NOTIFICATIONS);
console.log('  Background Sync Enabled:', PWA_CONFIG.ENABLE_BACKGROUND_SYNC);
console.log('  Periodic Sync Enabled:', PWA_CONFIG.ENABLE_PERIODIC_SYNC);

console.log('\n🔧 Feature Support:');
console.log('  Service Worker:', PWA_SUPPORT.serviceWorker);
console.log('  Push Manager:', PWA_SUPPORT.pushManager);
console.log('  Background Sync:', PWA_SUPPORT.backgroundSync);
console.log('  Periodic Sync:', PWA_SUPPORT.periodicSync);
console.log('  Notifications:', PWA_SUPPORT.notifications);
console.log('  Install Prompt:', PWA_SUPPORT.installPrompt);

console.log('\n📊 PWA Status:');
const status = getPWAStatus();
console.log('  Is Supported:', status.isSupported);
console.log('  Is Configured:', status.isConfigured);
console.log('  Features Available:', Object.keys(status.features).filter(key => status.features[key]).length);

console.log('\n✅ PWA Configuration Test Complete!');

// Export for use in other modules
export { PWA_CONFIG, PWA_SUPPORT, getPWAStatus }; 