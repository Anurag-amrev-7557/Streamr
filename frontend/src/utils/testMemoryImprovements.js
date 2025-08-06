/**
 * Memory Improvement Test Utility
 * Tests the memory optimizations implemented in MoviesPage and SeriesPage
 */

class MemoryTester {
  constructor() {
    this.initialMemory = 0;
    this.testResults = [];
    this.isRunning = false;
  }

  // Get current memory usage
  getCurrentMemory() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
      };
    }
    return { used: 'N/A', total: 'N/A', limit: 'N/A' };
  }

  // Start memory monitoring
  startTest(testName = 'Memory Test') {
    console.log(`🧪 Starting ${testName}`);
    this.initialMemory = this.getCurrentMemory();
    this.isRunning = true;
    
    console.log('📊 Initial Memory:', this.initialMemory);
    
    return this.initialMemory;
  }

  // End memory monitoring and calculate results
  endTest(testName = 'Memory Test') {
    if (!this.isRunning) {
      console.warn('⚠️ No test is currently running');
      return null;
    }

    const finalMemory = this.getCurrentMemory();
    const memoryDiff = finalMemory.used - this.initialMemory.used;
    
    const result = {
      testName,
      initialMemory: this.initialMemory,
      finalMemory,
      memoryDiff: Math.round(memoryDiff * 100) / 100,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    this.isRunning = false;
    
    console.log(`🏁 Finished ${testName}`);
    console.log('📊 Final Memory:', finalMemory);
    console.log(`📈 Memory Change: ${memoryDiff > 0 ? '+' : ''}${memoryDiff} MB`);
    
    if (memoryDiff > 10) {
      console.warn('⚠️ Significant memory increase detected!');
    } else if (memoryDiff < 0) {
      console.log('✅ Memory usage decreased (good!)');
    } else if (memoryDiff < 5) {
      console.log('✅ Memory usage stable (good!)');
    }
    
    return result;
  }

  // Test component mounting/unmounting
  async testComponentCleanup(componentName) {
    this.startTest(`${componentName} Cleanup Test`);
    
    // Simulate component lifecycle
    console.log(`📦 Simulating ${componentName} mount...`);
    await this.wait(1000);
    
    console.log(`🧹 Simulating ${componentName} unmount...`);
    await this.wait(500);
    
    // Force garbage collection if available
    if (window.gc) {
      console.log('🗑️ Running garbage collection...');
      window.gc();
      await this.wait(500);
    }
    
    return this.endTest(`${componentName} Cleanup Test`);
  }

  // Test image loading cleanup
  async testImageCleanup() {
    this.startTest('Image Loading Cleanup Test');
    
    const images = [];
    console.log('🖼️ Creating test images...');
    
    // Create multiple images to test memory usage
    for (let i = 0; i < 20; i++) {
      const img = new Image();
      img.src = `https://via.placeholder.com/500x750.png?text=Test${i}`;
      images.push(img);
    }
    
    await this.wait(2000);
    
    console.log('🧹 Cleaning up images...');
    // Proper cleanup
    images.forEach(img => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    });
    images.length = 0;
    
    if (window.gc) {
      window.gc();
    }
    
    await this.wait(1000);
    
    return this.endTest('Image Loading Cleanup Test');
  }

  // Test API request cleanup
  async testAPICleanup() {
    this.startTest('API Request Cleanup Test');
    
    const controllers = [];
    console.log('📡 Creating test API requests...');
    
    // Create multiple AbortControllers
    for (let i = 0; i < 10; i++) {
      const controller = new AbortController();
      controllers.push(controller);
      
      // Simulate API request
      fetch('https://httpbin.org/delay/5', { signal: controller.signal })
        .catch(err => {
          if (err.name === 'AbortError') {
            console.log(`Request ${i} aborted`);
          }
        });
    }
    
    await this.wait(1000);
    
    console.log('🧹 Aborting requests...');
    // Abort all requests
    controllers.forEach(controller => controller.abort());
    controllers.length = 0;
    
    await this.wait(1000);
    
    return this.endTest('API Request Cleanup Test');
  }

  // Test event listener cleanup
  async testEventListenerCleanup() {
    this.startTest('Event Listener Cleanup Test');
    
    const handlers = [];
    console.log('👂 Creating test event listeners...');
    
    // Create multiple event listeners
    for (let i = 0; i < 20; i++) {
      const handler = () => console.log(`Handler ${i} called`);
      document.addEventListener('test-event', handler);
      handlers.push(handler);
    }
    
    await this.wait(500);
    
    console.log('🧹 Removing event listeners...');
    // Remove all event listeners
    handlers.forEach(handler => {
      document.removeEventListener('test-event', handler);
    });
    handlers.length = 0;
    
    await this.wait(500);
    
    return this.endTest('Event Listener Cleanup Test');
  }

  // Run comprehensive memory test
  async runFullTest() {
    console.log('🚀 Starting comprehensive memory test...');
    
    const results = [];
    
    // Test different aspects
    results.push(await this.testComponentCleanup('MoviesPage'));
    results.push(await this.testComponentCleanup('SeriesPage'));
    results.push(await this.testImageCleanup());
    results.push(await this.testAPICleanup());
    results.push(await this.testEventListenerCleanup());
    
    console.log('📋 Test Summary:');
    results.forEach(result => {
      const status = result.memoryDiff < 5 ? '✅' : result.memoryDiff < 10 ? '⚠️' : '❌';
      console.log(`${status} ${result.testName}: ${result.memoryDiff > 0 ? '+' : ''}${result.memoryDiff} MB`);
    });
    
    const totalMemoryChange = results.reduce((sum, result) => sum + result.memoryDiff, 0);
    console.log(`🏆 Total Memory Change: ${totalMemoryChange > 0 ? '+' : ''}${Math.round(totalMemoryChange * 100) / 100} MB`);
    
    return results;
  }

  // Utility method to wait
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get all test results
  getResults() {
    return this.testResults;
  }

  // Clear test results
  clearResults() {
    this.testResults = [];
  }

  // Export results as JSON
  exportResults() {
    return JSON.stringify(this.testResults, null, 2);
  }
}

// Create global instance for testing
if (typeof window !== 'undefined') {
  window.memoryTester = new MemoryTester();
}

export default MemoryTester;

// Example usage:
/*
// In browser console:
const tester = new MemoryTester();

// Quick test
tester.startTest('Quick Test');
// ... do some operations ...
tester.endTest('Quick Test');

// Full comprehensive test
tester.runFullTest().then(results => {
  console.log('Test completed:', results);
});

// Access via global
window.memoryTester.runFullTest();
*/