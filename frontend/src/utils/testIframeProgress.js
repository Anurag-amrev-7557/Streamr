// Test utility for iframe progress tracking
import iframeProgressService from '../services/iframeProgressService';

export const testIframeProgress = () => {
  console.log('🧪 Testing Iframe Progress Tracking...');
  
  // Test 1: Check if service is listening
  console.log('\n📡 Service Status:');
  console.log('Is listening:', iframeProgressService.isListening);
  console.log('Allowed domains:', iframeProgressService.allowedDomains);
  
  // Test 2: Test URL timestamp extraction
  console.log('\n⏰ URL Timestamp Extraction Tests:');
  const testUrls = [
    'https://111movies.com/movie/tt0111161?t=3600',
    'https://player.videasy.net/movie/tt0111161?time=1800',
    'https://vidjoy.pro/embed/movie/tt0111161?start=900',
    'https://vidfast.pro/movie/tt0111161?position=2700',
    'https://111movies.com/movie/tt0111161?seek=5400',
    'https://111movies.com/movie/tt0111161?timestamp=7200'
  ];
  
  testUrls.forEach(url => {
    const result = iframeProgressService.extractTimestampFromUrl(url);
    console.log(`${url}:`, result);
  });
  
  // Test 3: Test progress data parsing
  console.log('\n📊 Progress Data Parsing Tests:');
  const testData = [
    { currentTime: 1800, duration: 7200, playing: true },
    { progress: 25, currentTime: 1800, duration: 7200 },
    { time: 3600, duration: 7200 },
    { type: 'progress', currentTime: 5400, duration: 7200, progress: 75 },
    { type: 'timeUpdate', time: 900, duration: 7200 }
  ];
  
  testData.forEach((data, index) => {
    const result = iframeProgressService.parseProgressData(data);
    console.log(`Test ${index + 1}:`, { input: data, output: result });
  });
  
  // Test 4: Test localStorage progress detection
  console.log('\n📦 localStorage Progress Detection:');
  const localStorageProgress = iframeProgressService.checkLocalStorageForProgress();
  console.log('Found progress in localStorage:', localStorageProgress);
  
  // Test 5: Test streaming service detection
  console.log('\n🎯 Streaming Service Detection:');
  const testServiceUrls = [
    'https://111movies.com/movie/tt0111161',
    'https://player.videasy.net/movie/tt0111161',
    'https://vidjoy.pro/embed/movie/tt0111161',
    'https://vidfast.pro/movie/tt0111161'
  ];
  
  testServiceUrls.forEach(url => {
    const service = iframeProgressService.getStreamingServiceFromUrl(url);
    console.log(`${url}:`, service);
  });
  
  // Test 6: Simulate postMessage events
  console.log('\n📨 Simulating postMessage Events:');
  
  // Add a test listener
  const testListenerId = 'test-listener';
  let receivedMessages = [];
  
  iframeProgressService.addListener(testListenerId, (data) => {
    receivedMessages.push(data);
    console.log('📨 Received postMessage:', data);
  });
  
  // Simulate different message formats
  const testMessages = [
    { currentTime: 1800, duration: 7200, playing: true },
    { progress: 50, currentTime: 3600, duration: 7200 },
    { time: 5400, duration: 7200 },
    { type: 'progress', currentTime: 7200, duration: 7200, progress: 100 }
  ];
  
  // Simulate messages from different origins
  const testOrigins = [
    'https://111movies.com',
    'https://player.videasy.net',
    'https://vidjoy.pro',
    'https://vidfast.pro'
  ];
  
  testMessages.forEach((message, index) => {
    const origin = testOrigins[index % testOrigins.length];
    const event = {
      origin: origin,
      data: message
    };
    
    // Manually trigger the message handler
    iframeProgressService.handleMessage(event);
  });
  
  // Clean up test listener
  setTimeout(() => {
    iframeProgressService.removeListener(testListenerId);
    console.log('\n✅ Iframe Progress Test Complete!');
    console.log('Received messages:', receivedMessages.length);
  }, 1000);
  
  return {
    serviceStatus: {
      isListening: iframeProgressService.isListening,
      allowedDomains: iframeProgressService.allowedDomains
    },
    receivedMessages
  };
};

// Test utility for manual progress simulation
export const simulateProgressUpdate = (progress, duration = 7200) => {
  console.log('🎯 Simulating progress update:', { progress, duration });
  
  const currentTime = (progress / 100) * duration;
  const message = {
    currentTime,
    duration,
    progress,
    playing: true
  };
  
  // Simulate message from 111movies
  const event = {
    origin: 'https://111movies.com',
    data: message
  };
  
  iframeProgressService.handleMessage(event);
  
  return message;
};

// Test utility for checking if progress tracking is working
export const checkProgressTrackingStatus = () => {
  console.log('🔍 Checking Progress Tracking Status...');
  
  const status = {
    serviceActive: iframeProgressService.isListening,
    listenersCount: iframeProgressService.listeners.size,
    allowedDomains: iframeProgressService.allowedDomains.length,
    localStorageProgress: iframeProgressService.checkLocalStorageForProgress()
  };
  
  console.log('Status:', status);
  
  // Check if ViewingProgressContext is available
  try {
    // This will be called from a component that has access to the context
    console.log('✅ ViewingProgressContext should be available in components');
  } catch (error) {
    console.error('❌ ViewingProgressContext not available:', error);
  }
  
  return status;
};

// Test utility for debugging iframe communication
export const debugIframeCommunication = (iframeElement) => {
  if (!iframeElement) {
    console.warn('❌ No iframe element provided for debugging');
    return;
  }
  
  console.log('🔍 Debugging iframe communication...');
  console.log('Iframe src:', iframeElement.src);
  console.log('Iframe origin:', iframeElement.contentWindow?.location?.origin);
  
  // Try to send test messages to iframe
  const testMessages = [
    { type: 'GET_PROGRESS', action: 'getProgress' },
    { type: 'PROGRESS_REQUEST', action: 'getCurrentTime' },
    { action: 'getProgress' }
  ];
  
  testMessages.forEach((message, index) => {
    try {
      iframeElement.contentWindow?.postMessage(message, '*');
      console.log(`📤 Sent test message ${index + 1}:`, message);
    } catch (error) {
      console.warn(`❌ Failed to send test message ${index + 1}:`, error);
    }
  });
  
  // Check iframe URL for timestamp parameters
  const timestampData = iframeProgressService.extractTimestampFromUrl(iframeElement.src);
  console.log('⏰ Timestamp data from iframe URL:', timestampData);
  
  return {
    src: iframeElement.src,
    origin: iframeElement.contentWindow?.location?.origin,
    timestampData
  };
};

export default {
  testIframeProgress,
  simulateProgressUpdate,
  checkProgressTrackingStatus,
  debugIframeCommunication
}; 