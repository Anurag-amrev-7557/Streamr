// Memory Leak Debug Script
// Add this to your browser console to monitor memory usage

(function() {
  'use strict';
  
  let memoryLog = [];
  let intervalId = null;
  
  function logMemory() {
    if (performance.memory) {
      const memory = performance.memory;
      const usage = {
        timestamp: Date.now(),
        used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
        total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
        limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
        percentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
      };
      
      memoryLog.push(usage);
      
      // Keep only last 100 entries
      if (memoryLog.length > 100) {
        memoryLog = memoryLog.slice(-100);
      }
      
      console.log(`Memory Usage: ${usage.used} / ${usage.limit} (${usage.percentage})`);
      
      // Check for memory growth
      if (memoryLog.length > 10) {
        const recent = memoryLog.slice(-10);
        const first = parseFloat(recent[0].used);
        const last = parseFloat(recent[recent.length - 1].used);
        const growth = last - first;
        
        if (growth > 10) {
          console.warn(`⚠️ Memory growth detected: +${growth.toFixed(2)}MB in last 10 checks`);
        }
      }
    }
  }
  
  function startMonitoring() {
    if (intervalId) {
      console.log('Memory monitoring already running');
      return;
    }
    
    console.log('🔍 Starting memory leak monitoring...');
    console.log('📊 Memory usage will be logged every 5 seconds');
    console.log('⚠️ Watch for increasing numbers in the console');
    
    intervalId = setInterval(logMemory, 5000);
    logMemory(); // Initial log
  }
  
  function stopMonitoring() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('🛑 Memory monitoring stopped');
    }
  }
  
  function getMemoryReport() {
    if (memoryLog.length === 0) {
      console.log('No memory data available. Start monitoring first.');
      return;
    }
    
    const first = memoryLog[0];
    const last = memoryLog[memoryLog.length - 1];
    const growth = parseFloat(last.used) - parseFloat(first.used);
    
    console.log('📊 Memory Report:');
    console.log(`   Initial: ${first.used}`);
    console.log(`   Current: ${last.used}`);
    console.log(`   Growth: ${growth > 0 ? '+' : ''}${growth.toFixed(2)}MB`);
    console.log(`   Duration: ${((last.timestamp - first.timestamp) / 1000).toFixed(0)}s`);
    
    if (growth > 50) {
      console.error('🚨 Significant memory leak detected!');
    } else if (growth > 10) {
      console.warn('⚠️ Moderate memory growth detected');
    } else {
      console.log('✅ Memory usage appears stable');
    }
  }
  
  function clearMemoryLog() {
    memoryLog = [];
    console.log('🗑️ Memory log cleared');
  }
  
  // Expose functions globally
  window.memoryDebug = {
    start: startMonitoring,
    stop: stopMonitoring,
    report: getMemoryReport,
    clear: clearMemoryLog,
    log: memoryLog
  };
  
  console.log('🔧 Memory debug tools loaded:');
  console.log('   memoryDebug.start() - Start monitoring');
  console.log('   memoryDebug.stop() - Stop monitoring');
  console.log('   memoryDebug.report() - Get memory report');
  console.log('   memoryDebug.clear() - Clear memory log');
  console.log('   memoryDebug.log - View memory log');
  
})(); 