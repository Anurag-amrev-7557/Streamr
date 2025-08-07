// Memory Issue Fix Script
// Run this in the browser console to diagnose and fix memory issues

import memoryDiagnostics from './memoryDiagnostics';
import memoryLeakMonitor from './memoryLeakMonitor';
import memoryOptimizationService from './memoryOptimizationService';

// Global function to run from console
window.fixMemoryIssues = async () => {
  console.log('🚀 Starting memory issue fix...');
  
  try {
    // Run diagnostics first
    console.log('\n🔍 Running diagnostics...');
    await memoryDiagnostics.runDiagnostics();
    
    // Apply automatic fixes
    console.log('\n🔧 Applying fixes...');
    await memoryDiagnostics.applyFixes();
    
    // Force cleanup
    console.log('\n🧹 Forcing cleanup...');
    memoryOptimizationService.performCleanup();
    
    // Get final report
    console.log('\n📊 Final report...');
    const report = memoryDiagnostics.getPerformanceReport();
    console.log('Memory fix completed:', report);
    
    return report;
    
  } catch (error) {
    console.error('❌ Memory fix failed:', error);
    throw error;
  }
};

// Quick memory check function
window.checkMemory = () => {
  if (!performance.memory) {
    console.log('⚠️ Performance.memory not available');
    return null;
  }
  
  const used = performance.memory.usedJSHeapSize / 1024 / 1024;
  const limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;
  const percentage = ((used / limit) * 100).toFixed(2);
  
  console.log(`📊 Memory: ${used.toFixed(2)}MB / ${limit.toFixed(2)}MB (${percentage}%)`);
  
  if (percentage > 80) {
    console.error('🚨 CRITICAL: Memory usage is very high!');
  } else if (percentage > 60) {
    console.warn('⚠️ WARNING: Memory usage is high');
  } else {
    console.log('✅ Memory usage is acceptable');
  }
  
  return { used, limit, percentage };
};

// Emergency cleanup function
window.emergencyCleanup = () => {
  console.log('🚨 EMERGENCY CLEANUP STARTED');
  
  try {
    // Stop all monitoring
    memoryLeakMonitor.stop();
    memoryOptimizationService.stop();
    
    // Clear all caches
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear browser caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Clear all timeouts and intervals
    const highestTimeoutId = setTimeout(() => {}, 0);
    const highestIntervalId = setInterval(() => {}, 0);
    
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
    
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    }
    
    // Clear images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.src = '';
      img.removeAttribute('src');
    });
    
    // Force garbage collection multiple times
    if (window.gc) {
      for (let i = 0; i < 5; i++) {
        window.gc();
      }
    }
    
    console.log('✅ Emergency cleanup completed');
    
    // Restart monitoring
    memoryLeakMonitor.start();
    memoryOptimizationService.start();
    
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
  }
};

// Memory monitoring toggle
window.toggleMemoryMonitoring = () => {
  if (memoryLeakMonitor.isMonitoring) {
    memoryLeakMonitor.stop();
    memoryOptimizationService.stop();
    console.log('⏸️ Memory monitoring stopped');
  } else {
    memoryLeakMonitor.start();
    memoryOptimizationService.start();
    console.log('▶️ Memory monitoring started');
  }
};

// Get memory report
window.getMemoryReport = () => {
  const report = memoryDiagnostics.getPerformanceReport();
  console.log('📊 Memory Report:', report);
  return report;
};

// Quick fix for specific issues
window.quickMemoryFix = () => {
  console.log('⚡ Quick memory fix...');
  
  // Clear unnecessary data
  const keysToKeep = ['user', 'auth', 'settings', 'theme'];
  const keysToRemove = Object.keys(localStorage).filter(key => !keysToKeep.includes(key));
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear session storage
  sessionStorage.clear();
  
  // Force garbage collection
  if (window.gc) {
    window.gc();
  }
  
  console.log(`✅ Quick fix completed - cleared ${keysToRemove.length} localStorage items`);
};

// Instructions for console usage
console.log(`
🧠 Memory Management Tools Available:

1. checkMemory() - Quick memory usage check
2. quickMemoryFix() - Quick cleanup without diagnostics
3. fixMemoryIssues() - Full diagnostics and fixes
4. emergencyCleanup() - Aggressive emergency cleanup
5. toggleMemoryMonitoring() - Start/stop monitoring
6. getMemoryReport() - Get detailed memory report

Usage examples:
- checkMemory() // Check current memory usage
- quickMemoryFix() // Quick cleanup
- fixMemoryIssues() // Full diagnostic and fix
- emergencyCleanup() // Emergency cleanup (use if memory is critical)
`);

export default {
  fixMemoryIssues: window.fixMemoryIssues,
  checkMemory: window.checkMemory,
  emergencyCleanup: window.emergencyCleanup,
  toggleMemoryMonitoring: window.toggleMemoryMonitoring,
  getMemoryReport: window.getMemoryReport,
  quickMemoryFix: window.quickMemoryFix
}; 