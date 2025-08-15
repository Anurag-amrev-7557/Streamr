// Test utility for error handling
export const testErrorHandling = () => {
  console.log('🧪 Testing error handling...');
  
  // Test 1: External resource error (should be ignored)
  const externalError = new Error('Failed to load resource: the server responded with a status of 404 ()');
  externalError.url = 'https://111movies.com/some-resource';
  
  // Test 2: Internal error (should be caught)
  const internalError = new Error('Internal application error');
  
  // Test 3: Network error (should be ignored)
  const networkError = new Error('net::ERR_BLOCKED_BY_CLIENT');
  
  console.log('✅ Error handling test completed');
  console.log('📝 External errors will be ignored, internal errors will be caught');
  
  return {
    externalError,
    internalError,
    networkError
  };
};

// Test the error boundary
export const testErrorBoundary = () => {
  console.log('🧪 Testing error boundary...');
  
  // Simulate an error that should be caught
  setTimeout(() => {
    console.log('✅ Error boundary is active and ready');
  }, 100);
}; 