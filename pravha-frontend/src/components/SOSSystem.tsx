import React, { useState, useEffect, useCallback } from 'react';
import './SOSSystem.css';

interface SOSRequest {
  id: string;
  userId: string;
  location: [number, number];
  message?: string;
  emergencyType: string;
  timestamp: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  assignedOfficer?: string;
  responseTime?: number;
  resolutionNotes?: string;
  resolvedAt?: string;
}

interface SOSSystemProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  onBack?: () => void;
}

const SOSSystem: React.FC<SOSSystemProps> = ({ user, onBack }) => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sosMessage, setSosMessage] = useState('');
  const [emergencyType, setEmergencyType] = useState('FLOOD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sosHistory, setSosHistory] = useState<SOSRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const checkLocationPermission = async () => {
    if ('geolocation' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setLocationPermission(permission.state);
      } catch (error) {
        console.log('Permission API not supported');
      }
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsSubmitting(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        setLocationPermission('granted');
        setIsSubmitting(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            setLocationPermission('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:            errorMessage = 'Location request timed out';
            break;
        }
        setLocationError(errorMessage);
        setIsSubmitting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const fetchSOSHistory = useCallback(async () => {
    try {
      // This would typically fetch from the backend
      // For now, we'll use mock data
      const mockHistory: SOSRequest[] = [
        {
          id: 'sos_001',
          userId: user.id,
          location: [28.6139, 77.2090],
          message: 'Trapped in flooded building, need immediate rescue',
          emergencyType: 'FLOOD',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          status: 'RESOLVED',
          assignedOfficer: 'Officer Rajesh Kumar',
          responseTime: 15,
          resolutionNotes: 'Successfully rescued and evacuated to safety',
          resolvedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
        }
      ];
      setSosHistory(mockHistory);
    } catch (error) {
      console.error('Failed to fetch SOS history:', error);
    }
  }, [user.id]);

  useEffect(() => {
    checkLocationPermission();
    fetchSOSHistory();
  }, [fetchSOSHistory]);

  const submitSOSRequest = async () => {
    if (!currentLocation) {
      setLocationError('Please get your current location first');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      
      if (!token || !userData.id) {
        alert('Please log in to send SOS request');
        return;
      }

      const sosRequest = {
        location: currentLocation,
        message: sosMessage || 'Emergency assistance needed',
        emergency_type: emergencyType,
        user_id: userData.id
      };

      console.log('Sending SOS request:', sosRequest);

      // Send to the backend
      const response = await fetch('http://localhost:8002/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sosRequest),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('SOS request sent successfully:', result);
        alert(`🚨 Emergency SOS sent successfully!\n\nRequest ID: ${result.sos?.id || 'N/A'}\nLocation: ${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)}\n\nEmergency services have been notified and are on their way.`);
        
        // Reset form
        setSosMessage('');
        setCurrentLocation(null);
        
        // Refresh history
        fetchSOSHistory();
      } else {
        const error = await response.json();
        console.error('SOS request failed:', error);
        throw new Error(error.detail || 'Failed to send SOS request');
      }
    } catch (error) {
      console.error('SOS request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to send emergency SOS: ${errorMessage}\n\nPlease try again or contact emergency services directly at 112.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'ASSIGNED': return '#3b82f6';
      case 'IN_PROGRESS': return '#8b5cf6';
      case 'RESOLVED': return '#10b981';
      case 'CANCELLED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return '⏳';
      case 'ASSIGNED': return '👮';
      case 'IN_PROGRESS': return '🚁';
      case 'RESOLVED': return '✅';
      case 'CANCELLED': return '❌';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="sos-container">
      <div className="sos-header">
        <div className="header-content">
          <div className="header-icon">🆘</div>
          <div className="header-text">
            <h1>Emergency SOS System</h1>
            <p>Send emergency alerts with your GPS location to government authorities</p>
          </div>
        </div>
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      <div className="sos-content">
        {/* Emergency SOS Form */}
        <div className="sos-form-section">
          <div className="form-card">
            <h2>🚨 Send Emergency SOS</h2>
            <p className="form-description">
              Use this only in genuine emergencies. Your location will be automatically captured and sent to emergency services.
            </p>

            {/* Location Section */}
            <div className="location-section">
              <h3>📍 Your Location</h3>
              {currentLocation ? (
                <div className="location-success">
                  <div className="location-icon">✅</div>
                  <div className="location-details">
                    <div className="location-coords">
                      {currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}
                    </div>
                    <div className="location-status">Location captured successfully</div>
                  </div>
                  <button 
                    className="refresh-location-btn"
                    onClick={getCurrentLocation}
                    disabled={isSubmitting}
                  >
                    🔄 Refresh
                  </button>
                </div>
              ) : (
                <div className="location-prompt">
                  <button 
                    className="get-location-btn"
                    onClick={getCurrentLocation}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading-spinner"></span>
                        Getting Location...
                      </>
                    ) : (
                      <>
                        📍 Get My Location
                      </>
                    )}
                  </button>
                  {locationError && (
                    <div className="location-error">
                      ❌ {locationError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Emergency Type */}
            <div className="emergency-type-section">
              <h3>🚨 Emergency Type</h3>
              <select 
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                className="emergency-type-select"
              >
                <option value="FLOOD">Flood Emergency</option>
                <option value="MEDICAL">Medical Emergency</option>
                <option value="FIRE">Fire Emergency</option>
                <option value="STRUCTURAL">Structural Collapse</option>
                <option value="OTHER">Other Emergency</option>
              </select>
            </div>

            {/* Message */}
            <div className="message-section">
              <h3>💬 Additional Information (Optional)</h3>
              <textarea
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                placeholder="Describe your emergency situation, number of people affected, immediate dangers, etc."
                className="sos-message-textarea"
                rows={4}
                maxLength={500}
              />
              <div className="char-count">{sosMessage.length}/500 characters</div>
            </div>

            {/* Submit Button */}
            <button 
              className="sos-submit-btn"
              onClick={submitSOSRequest}
              disabled={!currentLocation || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner"></span>
                  Sending Emergency SOS...
                </>
              ) : (
                <>
                  🚨 Send Emergency SOS
                </>
              )}
            </button>

            <div className="emergency-notice">
              <strong>⚠️ Important:</strong> This will immediately notify emergency services. Only use for genuine emergencies.
            </div>
          </div>
        </div>

        {/* SOS History */}
        <div className="sos-history-section">
          <div className="history-header">
            <h2>📋 Your SOS History</h2>
            <button 
              className="toggle-history-btn"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          {showHistory && (
            <div className="history-list">
              {sosHistory.length > 0 ? (
                sosHistory.map((sos) => (
                  <div key={sos.id} className="history-item">
                    <div className="history-header-item">
                      <div className="history-status">
                        <span className="status-icon">{getStatusIcon(sos.status)}</span>
                        <span 
                          className="status-text"
                          style={{ color: getStatusColor(sos.status) }}
                        >
                          {sos.status}
                        </span>
                      </div>
                      <div className="history-time">
                        {formatTimestamp(sos.timestamp)}
                      </div>
                    </div>
                    
                    <div className="history-details">
                      <div className="history-type">
                        <strong>Emergency Type:</strong> {sos.emergencyType}
                      </div>
                      {sos.message && (
                        <div className="history-message">
                          <strong>Message:</strong> {sos.message}
                        </div>
                      )}
                      <div className="history-location">
                        <strong>Location:</strong> {sos.location[0].toFixed(4)}, {sos.location[1].toFixed(4)}
                      </div>
                      {sos.assignedOfficer && (
                        <div className="history-officer">
                          <strong>Assigned Officer:</strong> {sos.assignedOfficer}
                        </div>
                      )}
                      {sos.responseTime && (
                        <div className="history-response-time">
                          <strong>Response Time:</strong> {sos.responseTime} minutes
                        </div>
                      )}
                      {sos.resolutionNotes && (
                        <div className="history-resolution">
                          <strong>Resolution:</strong> {sos.resolutionNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-history">
                  <div className="no-history-icon">📝</div>
                  <div className="no-history-text">
                    <h3>No SOS requests yet</h3>
                    <p>Your emergency requests will appear here</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Emergency Contacts */}
        <div className="emergency-contacts-section">
          <div className="contacts-card">
            <h2>📞 Emergency Contacts</h2>
            <div className="contacts-grid">
              <div className="contact-item">
                <div className="contact-icon">🚨</div>
                <div className="contact-info">
                  <div className="contact-name">National Emergency</div>
                  <div className="contact-number">112</div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">🚑</div>
                <div className="contact-info">
                  <div className="contact-name">Medical Emergency</div>
                  <div className="contact-number">108</div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">🚒</div>
                <div className="contact-info">
                  <div className="contact-name">Fire Department</div>
                  <div className="contact-number">101</div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">👮</div>
                <div className="contact-info">
                  <div className="contact-name">Police</div>
                  <div className="contact-number">100</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOSSystem;
