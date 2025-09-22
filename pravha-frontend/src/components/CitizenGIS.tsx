import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface Alert {
  id: string;
  title: string;
  message: string;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  coordinates: [number, number];
  timestamp: string;
  status: 'ACTIVE' | 'RESOLVED';
}

interface CitizenGISProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  };
  onBack?: () => void;
}

const CitizenGIS: React.FC<CitizenGISProps> = ({ user, onBack }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]); // Delhi center

  // Fetch alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:8002/alerts/active', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Transform alerts to ensure they have coordinates
          const transformedAlerts = (data.alerts || []).map((alert: any) => {
            let coordinates = [28.6139, 77.2090]; // Default to Delhi
            
            // Check if alert has coordinates array
            if (alert.coordinates && Array.isArray(alert.coordinates) && alert.coordinates.length === 2) {
              coordinates = [
                typeof alert.coordinates[0] === 'number' ? alert.coordinates[0] : parseFloat(alert.coordinates[0]) || 28.6139,
                typeof alert.coordinates[1] === 'number' ? alert.coordinates[1] : parseFloat(alert.coordinates[1]) || 77.2090
              ];
            }
            // Check if alert has location as coordinate string
            else if (alert.location && typeof alert.location === 'string' && alert.location.includes(',')) {
              const coords = alert.location.split(',').map((c: string) => parseFloat(c.trim()));
              if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                coordinates = coords;
              }
            }
            // Check if alert has location as array
            else if (alert.location && Array.isArray(alert.location) && alert.location.length === 2) {
              coordinates = [
                typeof alert.location[0] === 'number' ? alert.location[0] : parseFloat(alert.location[0]) || 28.6139,
                typeof alert.location[1] === 'number' ? alert.location[1] : parseFloat(alert.location[1]) || 77.2090
              ];
            }
            
            return {
              ...alert,
              coordinates,
              title: alert.message || alert.alert_type || 'Flood Alert'
            };
          });
          setAlerts(transformedAlerts);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const getAlertColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return '#10B981'; // Green
      case 'MODERATE': return '#F59E0B'; // Yellow
      case 'HIGH': return '#EF4444'; // Red
      case 'CRITICAL': return '#7C2D12'; // Dark red
      default: return '#6B7280'; // Gray
    }
  };

  const getAlertIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return '✅';
      case 'MODERATE': return '⚠️';
      case 'HIGH': return '🚨';
      case 'CRITICAL': return '🆘';
      default: return '📢';
    }
  };

  const formatCoordinates = (coordinates: [number, number] | undefined | null) => {
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return 'Location not available';
    }
    const lat = typeof coordinates[0] === 'number' ? coordinates[0] : parseFloat(coordinates[0]);
    const lng = typeof coordinates[1] === 'number' ? coordinates[1] : parseFloat(coordinates[1]);
    
    if (isNaN(lat) || isNaN(lng)) {
      return 'Location not available';
    }
    
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    
    useEffect(() => {
      map.setView(center, 13);
    }, [map, center]);
    
    return null;
  };

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            zIndex: 1000,
            fontSize: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Dashboard
        </button>
      )}

      {/* Alert Sidebar */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '350px',
        maxHeight: '80vh',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f8fafc'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
            🚨 Active Alerts
          </h3>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
            Real-time flood alerts in your area
          </p>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              Loading alerts...
            </div>
          ) : alerts.length > 0 ? (
            <div style={{ padding: '10px' }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '15px',
                    margin: '8px',
                    borderRadius: '8px',
                    border: `2px solid ${getAlertColor(alert.risk_level)}`,
                    background: `${getAlertColor(alert.risk_level)}10`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    ...(selectedAlert?.id === alert.id && {
                      background: `${getAlertColor(alert.risk_level)}20`,
                      transform: 'scale(1.02)'
                    })
                  }}
                  onClick={() => {
                    setSelectedAlert(alert);
                    if (alert.coordinates && alert.coordinates.length === 2) {
                      setMapCenter(alert.coordinates);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px', marginRight: '8px' }}>
                      {getAlertIcon(alert.severity || alert.risk_level)}
                    </span>
                    <div>
                      <h4 style={{ margin: '0', fontSize: '16px', color: '#1f2937' }}>
                        {alert.title}
                      </h4>
                      <span style={{
                        fontSize: '12px',
                        color: getAlertColor(alert.severity || alert.risk_level),
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {(alert.severity || alert.risk_level)} RISK
                      </span>
                    </div>
                  </div>
                  
                  <p style={{
                    margin: '8px 0',
                    fontSize: '14px',
                    color: '#4b5563',
                    lineHeight: '1.4'
                  }}>
                    {alert.message}
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                        <span>📍 {formatCoordinates(alert.coordinates)}</span>
                    <span>{formatTimeAgo(alert.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h4 style={{ margin: '0 0 8px 0' }}>No Active Alerts</h4>
              <p style={{ margin: '0', fontSize: '14px' }}>
                All clear! No flood alerts in your area.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Current Location Marker */}
        {currentLocation && (
          <Marker position={currentLocation}>
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>📍 Your Location</h4>
                <p style={{ margin: '0', fontSize: '14px' }}>
                  {currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Alert Circles */}
        {alerts.filter(alert => alert.coordinates && alert.coordinates.length === 2).map((alert) => (
          <Circle
            key={alert.id}
            center={alert.coordinates}
            radius={1000} // 1km radius
            pathOptions={{
              color: getAlertColor(alert.severity || alert.risk_level),
              fillColor: getAlertColor(alert.severity || alert.risk_level),
              fillOpacity: 0.3,
              weight: 3,
              dashArray: (alert.severity || alert.risk_level) === 'CRITICAL' ? '5, 5' : '10, 10'
            }}
            eventHandlers={{
              click: () => setSelectedAlert(alert)
            }}
          >
            <Popup>
              <div style={{ minWidth: '250px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', marginRight: '8px' }}>
                    {getAlertIcon(alert.severity || alert.risk_level)}
                  </span>
                  <div>
                    <h3 style={{ margin: '0', color: getAlertColor(alert.risk_level) }}>
                      {alert.title}
                    </h3>
                    <span style={{
                      fontSize: '12px',
                      color: getAlertColor(alert.severity || alert.risk_level),
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {(alert.severity || alert.risk_level)} RISK
                    </span>
                  </div>
                </div>
                
                <p style={{ margin: '8px 0', fontSize: '14px', lineHeight: '1.4' }}>
                  {alert.message}
                </p>
                
                <div style={{
                  background: '#f8fafc',
                  padding: '8px',
                  borderRadius: '6px',
                  marginTop: '12px'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Location:</strong> {alert.coordinates[0].toFixed(4)}, {alert.coordinates[1].toFixed(4)}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Time:</strong> {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Alert Markers */}
        {alerts.filter(alert => alert.coordinates && alert.coordinates.length === 2).map((alert) => (
          <Marker
            key={`marker-${alert.id}`}
            position={alert.coordinates}
            icon={L.divIcon({
              html: `
                <div style="
                  background: ${getAlertColor(alert.risk_level)};
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  border: 3px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  animation: ${alert.risk_level === 'CRITICAL' ? 'pulse 1s infinite' : 'none'};
                ">${getAlertIcon(alert.risk_level)}</div>
              `,
              className: 'alert-marker',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
          >
            <Popup>
              <div style={{ minWidth: '250px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', marginRight: '8px' }}>
                    {getAlertIcon(alert.severity || alert.risk_level)}
                  </span>
                  <div>
                    <h3 style={{ margin: '0', color: getAlertColor(alert.risk_level) }}>
                      {alert.title}
                    </h3>
                    <span style={{
                      fontSize: '12px',
                      color: getAlertColor(alert.severity || alert.risk_level),
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {(alert.severity || alert.risk_level)} RISK
                    </span>
                  </div>
                </div>
                
                <p style={{ margin: '8px 0', fontSize: '14px', lineHeight: '1.4' }}>
                  {alert.message}
                </p>
                
                <div style={{
                  background: '#f8fafc',
                  padding: '8px',
                  borderRadius: '6px',
                  marginTop: '12px'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Location:</strong> {alert.coordinates[0].toFixed(4)}, {alert.coordinates[1].toFixed(4)}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Time:</strong> {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        minWidth: '200px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>
          Alert Risk Levels
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '8px' }}></div>
          <span style={{ fontSize: '12px' }}>Low Risk</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#F59E0B', borderRadius: '50%', marginRight: '8px' }}></div>
          <span style={{ fontSize: '12px' }}>Moderate Risk</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#EF4444', borderRadius: '50%', marginRight: '8px' }}></div>
          <span style={{ fontSize: '12px' }}>High Risk</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#7C2D12', borderRadius: '50%', marginRight: '8px' }}></div>
          <span style={{ fontSize: '12px' }}>Critical Risk</span>
        </div>
        <hr style={{ margin: '10px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#3B82F6', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>📍</div>
          <span style={{ fontSize: '12px' }}>Your Location</span>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default CitizenGIS;
