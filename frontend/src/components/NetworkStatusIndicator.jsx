import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { healthCheckService } from '../services/healthCheckService';

const NetworkStatusIndicator = ({ 
  showDetails = false, 
  className = '',
  onNetworkChange 
}) => {
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [connectionType, setConnectionType] = useState('unknown');
  const [downlink, setDownlink] = useState(0);
  const [rtt, setRtt] = useState(0);
  const [effectiveType, setEffectiveType] = useState('unknown');
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const checkNetworkStatusSafe = async () => {
      if (!isMounted) return;
      await checkNetworkStatus();
    };
    
    checkNetworkStatusSafe();
    
    // Check network status less frequently in production and only when tab is visible
    const intervalMs = (import.meta && import.meta.env && import.meta.env.DEV) ? 30000 : 60000;
    const interval = setInterval(() => {
      if (isMounted && document.visibilityState === 'visible') {
        checkNetworkStatusSafe();
      }
    }, intervalMs);
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection changes
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  const checkNetworkStatus = async () => {
    try {
      // Use centralized health check service
      const healthResult = await healthCheckService.checkHealth();
      
      if (healthResult.status === 'online') {
        updateNetworkMetrics(healthResult.responseTime || 0);
        setNetworkStatus('online');
      } else if (healthResult.httpStatus === 429) {
        // Rate limited - set status to slow
        setNetworkStatus('slow');
        console.warn('Health check rate limited');
      } else {
        setNetworkStatus('error');
      }
      
      setLastCheck(new Date());
      
    } catch (error) {
      if (error.name === 'AbortError') {
        setNetworkStatus('slow');
      } else if (!navigator.onLine) {
        setNetworkStatus('offline');
      } else {
        setNetworkStatus('error');
      }
      setLastCheck(new Date());
    }
  };

  const updateNetworkMetrics = (responseTime) => {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      setConnectionType(conn.effectiveType || 'unknown');
      setDownlink(conn.downlink || 0);
      setRtt(conn.rtt || 0);
      setEffectiveType(conn.effectiveType || 'unknown');
    }
  };

  const handleOnline = () => {
    setNetworkStatus('online');
    onNetworkChange?.('online');
  };

  const handleOffline = () => {
    setNetworkStatus('offline');
    onNetworkChange?.('offline');
  };

  const handleConnectionChange = () => {
    updateNetworkMetrics();
  };

  const getStatusColor = () => {
    switch (networkStatus) {
      case 'online':
        return '#10b981'; // Green
      case 'slow':
        return '#f59e0b'; // Yellow
      case 'error':
        return '#ef4444'; // Red
      case 'offline':
        return '#6b7280'; // Gray
      case 'checking':
        return '#3b82f6'; // Blue
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = () => {
    switch (networkStatus) {
      case 'online':
        return '🟢';
      case 'slow':
        return '🟡';
      case 'error':
        return '🔴';
      case 'offline':
        return '⚫';
      case 'checking':
        return '🔄';
      default:
        return '❓';
    }
  };

  const getStatusText = () => {
    switch (networkStatus) {
      case 'online':
        return 'Online';
      case 'slow':
        return 'Slow Connection';
      case 'error':
        return 'Connection Error';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const getConnectionQuality = () => {
    if (effectiveType === '4g') return 'Excellent';
    if (effectiveType === '3g') return 'Good';
    if (effectiveType === '2g') return 'Poor';
    if (effectiveType === 'slow-2g') return 'Very Poor';
    return 'Unknown';
  };

  const getSpeedIndicator = () => {
    if (downlink >= 10) return '🚀';
    if (downlink >= 5) return '⚡';
    if (downlink >= 2) return '📶';
    if (downlink >= 1) return '🐌';
    return '❓';
  };

  const handleRetry = () => {
    setNetworkStatus('checking');
    checkNetworkStatus();
  };

  return (
    <div className={`network-status-indicator ${className}`}>
      {/* Main status display */}
      <div 
        className="status-main"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${getStatusColor()}40`,
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={handleRetry}
        title="Click to retry connection test"
      >
        <span style={{ fontSize: '16px' }}>{getStatusIcon()}</span>
        <span style={{ 
          color: getStatusColor(), 
          fontWeight: '600',
          fontSize: '14px'
        }}>
          {getStatusText()}
        </span>
        
        {networkStatus === 'checking' && (
          <div 
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid transparent',
              borderTop: `2px solid ${getStatusColor()}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        )}
      </div>

      {/* Detailed network information */}
      {showDetails && (
        <div 
          className="network-details"
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: '600' }}>
            Network Details
          </div>
          
          <div style={{ display: 'grid', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Connection:</span>
              <span style={{ color: '#60a5fa' }}>{connectionType}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Quality:</span>
              <span style={{ color: '#34d399' }}>{getConnectionQuality()}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Speed:</span>
              <span style={{ color: '#fbbf24' }}>
                {getSpeedIndicator()} {downlink.toFixed(1)} Mbps
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Latency:</span>
              <span style={{ color: '#a78bfa' }}>{rtt}ms</span>
            </div>
            
            {lastCheck && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Last Check:</span>
                <span style={{ color: '#9ca3af' }}>
                  {lastCheck.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Network tips */}
          {networkStatus === 'slow' && (
            <div style={{ 
              marginTop: '8px', 
              padding: '8px', 
              backgroundColor: 'rgba(245, 158, 11, 0.1)', 
              borderRadius: '4px',
              fontSize: '11px',
              color: '#fbbf24'
            }}>
              💡 Tip: Try refreshing the page or check your connection
            </div>
          )}
          
          {networkStatus === 'offline' && (
            <div style={{ 
              marginTop: '8px', 
              padding: '8px', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '4px',
              fontSize: '11px',
              color: '#f87171'
            }}>
              📱 Check your Wi-Fi or mobile data connection
            </div>
          )}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .network-status-indicator {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .status-main:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
};

NetworkStatusIndicator.propTypes = {
  showDetails: PropTypes.bool,
  className: PropTypes.string,
  onNetworkChange: PropTypes.func
};

export default NetworkStatusIndicator; 