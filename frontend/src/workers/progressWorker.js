/**
 * Progress Calculation Web Worker
 * Offloads heavy progress calculations from main thread
 * for better UI responsiveness during streaming
 */

let progressHistory = [];
let performanceMetrics = {
  avgUpdateInterval: 0,
  stallEvents: 0,
  bufferEvents: 0,
  qualityChanges: 0
};

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CALCULATE_PROGRESS':
      handleProgressCalculation(data);
      break;
      
    case 'ANALYZE_PERFORMANCE':
      handlePerformanceAnalysis(data);
      break;
      
    case 'PREDICT_BUFFER':
      handleBufferPrediction(data);
      break;
      
    case 'CALCULATE_QUALITY':
      handleQualityCalculation(data);
      break;
      
    case 'RESET':
      resetWorker();
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

/**
 * Calculate progress percentage and related metrics
 */
function handleProgressCalculation(data) {
  const { currentTime, duration, timestamp } = data;
  
  if (!duration || duration === 0) {
    self.postMessage({
      type: 'PROGRESS_RESULT',
      data: {
        progress: 0,
        estimatedTimeRemaining: 0,
        playbackRate: 1.0
      }
    });
    return;
  }
  
  const progress = Math.min((currentTime / duration) * 100, 100);
  const timeRemaining = duration - currentTime;
  
  // Calculate average playback rate from history
  let playbackRate = 1.0;
  if (progressHistory.length > 1) {
    const recent = progressHistory.slice(-10);
    const timeDelta = recent[recent.length - 1].timestamp - recent[0].timestamp;
    const progressDelta = recent[recent.length - 1].currentTime - recent[0].currentTime;
    
    if (timeDelta > 0) {
      playbackRate = (progressDelta * 1000) / timeDelta;
    }
  }
  
  // Add to history
  progressHistory.push({ currentTime, duration, timestamp, progress });
  
  // Keep only last 100 entries to prevent memory growth
  if (progressHistory.length > 100) {
    progressHistory = progressHistory.slice(-100);
  }
  
  self.postMessage({
    type: 'PROGRESS_RESULT',
    data: {
      progress: Math.round(progress * 10) / 10, // Round to 1 decimal
      estimatedTimeRemaining: Math.round(timeRemaining),
      playbackRate: Math.round(playbackRate * 100) / 100,
      currentTime: Math.round(currentTime),
      duration: Math.round(duration)
    }
  });
}

/**
 * Analyze performance metrics
 */
function handlePerformanceAnalysis(data) {
  const { eventType, eventData } = data;
  
  // Track different event types
  switch (eventType) {
    case 'stall':
      performanceMetrics.stallEvents++;
      break;
    case 'buffer':
      performanceMetrics.bufferEvents++;
      break;
    case 'quality_change':
      performanceMetrics.qualityChanges++;
      break;
  }
  
  // Calculate average update interval
  if (progressHistory.length > 1) {
    const intervals = [];
    for (let i = 1; i < progressHistory.length; i++) {
      intervals.push(progressHistory[i].timestamp - progressHistory[i - 1].timestamp);
    }
    performanceMetrics.avgUpdateInterval = 
      intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }
  
  self.postMessage({
    type: 'PERFORMANCE_RESULT',
    data: {
      metrics: performanceMetrics,
      healthScore: calculateHealthScore(),
      recommendations: generateRecommendations()
    }
  });
}

/**
 * Predict buffer behavior based on historical data
 */
function handleBufferPrediction(data) {
  const { currentBuffer, downloadSpeed, quality } = data;
  
  // Simple linear prediction model
  let prediction = 'healthy';
  let confidence = 0;
  
  if (progressHistory.length > 10) {
    // Analyze recent stall patterns
    const recentStalls = performanceMetrics.stallEvents;
    const recentBuffers = performanceMetrics.bufferEvents;
    
    if (recentStalls > 5 || recentBuffers > 10) {
      prediction = 'critical';
      confidence = 0.8;
    } else if (recentStalls > 2 || recentBuffers > 5) {
      prediction = 'warning';
      confidence = 0.6;
    } else {
      prediction = 'healthy';
      confidence = 0.9;
    }
  }
  
  self.postMessage({
    type: 'BUFFER_PREDICTION',
    data: {
      prediction,
      confidence,
      recommendedQuality: calculateRecommendedQuality(downloadSpeed, quality)
    }
  });
}

/**
 * Calculate optimal quality based on network conditions
 */
function handleQualityCalculation(data) {
  const { downlink, rtt, effectiveType, saveData } = data;
  
  let recommendedQuality = '1080p';
  let reason = 'default';
  
  // Data saver mode
  if (saveData) {
    recommendedQuality = '360p';
    reason = 'data_saver_enabled';
  }
  // Network-based quality
  else if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1 || rtt > 500) {
    recommendedQuality = '480p';
    reason = 'slow_connection';
  } else if (effectiveType === '3g' || downlink < 5 || rtt > 200) {
    recommendedQuality = '720p';
    reason = 'moderate_connection';
  } else if (downlink >= 10) {
    recommendedQuality = '1080p';
    reason = 'fast_connection';
  }
  
  // Consider historical performance
  if (performanceMetrics.stallEvents > 3) {
    // Downgrade quality if frequent stalls
    if (recommendedQuality === '1080p') recommendedQuality = '720p';
    else if (recommendedQuality === '720p') recommendedQuality = '480p';
    reason = 'frequent_stalls';
  }
  
  self.postMessage({
    type: 'QUALITY_RESULT',
    data: {
      recommendedQuality,
      reason,
      metrics: {
        downlink,
        rtt,
        effectiveType,
        stallEvents: performanceMetrics.stallEvents
      }
    }
  });
}

/**
 * Calculate overall health score
 */
function calculateHealthScore() {
  let score = 100;
  
  // Deduct for stalls
  score -= performanceMetrics.stallEvents * 5;
  
  // Deduct for buffer events
  score -= performanceMetrics.bufferEvents * 2;
  
  // Deduct for frequent quality changes (indicates unstable connection)
  score -= performanceMetrics.qualityChanges * 3;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate performance recommendations
 */
function generateRecommendations() {
  const recommendations = [];
  
  if (performanceMetrics.stallEvents > 3) {
    recommendations.push({
      type: 'warning',
      message: 'Frequent stalls detected. Consider lowering video quality.',
      action: 'lower_quality'
    });
  }
  
  if (performanceMetrics.bufferEvents > 10) {
    recommendations.push({
      type: 'info',
      message: 'High buffer activity. Network may be unstable.',
      action: 'check_network'
    });
  }
  
  if (performanceMetrics.qualityChanges > 5) {
    recommendations.push({
      type: 'info',
      message: 'Frequent quality changes. Enable adaptive quality.',
      action: 'enable_adaptive'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'Streaming performance is optimal.',
      action: 'none'
    });
  }
  
  return recommendations;
}

/**
 * Reset worker state
 */
function resetWorker() {
  progressHistory = [];
  performanceMetrics = {
    avgUpdateInterval: 0,
    stallEvents: 0,
    bufferEvents: 0,
    qualityChanges: 0
  };
  
  self.postMessage({
    type: 'RESET_COMPLETE',
    data: { success: true }
  });
}

// Handle errors
self.addEventListener('error', (error) => {
  self.postMessage({
    type: 'ERROR',
    data: {
      message: error.message,
      stack: error.stack
    }
  });
});

// Notify that worker is ready
self.postMessage({
  type: 'WORKER_READY',
  data: { timestamp: Date.now() }
});
