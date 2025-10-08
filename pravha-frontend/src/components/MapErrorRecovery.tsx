import React, { useState, useEffect, useCallback } from 'react';

interface MapErrorRecoveryProps {
  onRetry: () => void;
  error?: string | null;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Map Error Recovery Component
 * Handles map errors gracefully and provides recovery mechanisms
 */
const MapErrorRecovery: React.FC<MapErrorRecoveryProps> = ({
  onRetry,
  error,
  maxRetries = 3,
  retryDelay = 2000
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorHistory, setErrorHistory] = useState<string[]>([]);

  // Track error history
  useEffect(() => {
    if (error && !errorHistory.includes(error)) {
      setErrorHistory(prev => [...prev.slice(-4), error]); // Keep last 5 errors
    }
  }, [error, errorHistory]);

  // Auto-retry mechanism
  const autoRetry = useCallback(async () => {
    if (retryCount >= maxRetries || isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      // Add exponential backoff
      const delay = retryDelay * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      await onRetry();
      setIsRetrying(false);
    } catch (err) {
      setIsRetrying(false);
      console.error('Auto-retry failed:', err);
    }
  }, [retryCount, maxRetries, isRetrying, retryDelay, onRetry]);

  // Manual retry
  const handleManualRetry = useCallback(() => {
    setRetryCount(0);
    autoRetry();
  }, [autoRetry]);

  // Reset retry count when error is resolved
  useEffect(() => {
    if (!error) {
      setRetryCount(0);
      setIsRetrying(false);
    }
  }, [error]);

  // Auto-retry for non-critical errors
  useEffect(() => {
    if (error && retryCount < maxRetries && !isRetrying) {
      const isCriticalError = error.includes('_leaflet_pos') || error.includes('critical');
      
      if (!isCriticalError) {
        autoRetry();
      }
    }
  }, [error, retryCount, maxRetries, isRetrying, autoRetry]);

  if (!error) return null;

  const isCriticalError = error.includes('_leaflet_pos') || error.includes('critical');
  const canAutoRetry = retryCount < maxRetries && !isCriticalError;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      zIndex: 1000,
      maxWidth: '400px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
        {isCriticalError ? '🚨' : '⚠️'}
      </div>
      
      <h3 style={{ 
        margin: '0 0 8px 0', 
        color: isCriticalError ? '#dc2626' : '#d97706',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        {isCriticalError ? 'Critical Map Error' : 'Map Loading Issue'}
      </h3>
      
      <p style={{ 
        margin: '0 0 16px 0', 
        color: '#6b7280',
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        {error}
      </p>

      {retryCount > 0 && (
        <p style={{ 
          margin: '0 0 16px 0', 
          color: '#9ca3af',
          fontSize: '12px'
        }}>
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={handleManualRetry}
          disabled={isRetrying}
          style={{
            background: isCriticalError ? '#dc2626' : '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: isRetrying ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: isRetrying ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
        
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Reload Page
        </button>
      </div>

      {errorHistory.length > 1 && (
        <details style={{ 
          marginTop: '16px', 
          textAlign: 'left',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
            Previous Errors ({errorHistory.length - 1})
          </summary>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {errorHistory.slice(0, -1).map((err, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {err}
              </li>
            ))}
          </ul>
        </details>
      )}

      {canAutoRetry && !isRetrying && (
        <p style={{ 
          margin: '12px 0 0 0', 
          color: '#10b981',
          fontSize: '12px',
          fontStyle: 'italic'
        }}>
          Auto-retrying in {retryDelay / 1000}s...
        </p>
      )}
    </div>
  );
};

export default MapErrorRecovery;
