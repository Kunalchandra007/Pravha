import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateDemoShelters, generateDemoAlerts, generateDemoSOS, getStateFromCoordinates } from '../data/demoData';
import { apiRequest } from '../utils/tokenManager';

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

interface SOSRequest {
  id: string;
  location: [number, number];
  message: string;
  emergency_type: string;
  timestamp: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  user_id: string;
}

interface Shelter {
  id: string;
  name: string;
  address: string;
  capacity: number;
  currentOccupancy: number;
  coordinates: [number, number];
  facilities: string[];
  contact: string;
  isDemo?: boolean;
}

interface AdminGISProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  };
  onBack?: () => void;
}

const AdminGIS: React.FC<AdminGISProps> = ({ user, onBack }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequest | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [showAddShelter, setShowAddShelter] = useState(false);
  const [newShelter, setNewShelter] = useState({
    name: '',
    address: '',
    capacity: 100,
    contact: '',
    facilities: '',
    latitude: '',
    longitude: ''
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]);
  const [activeTab, setActiveTab] = useState<'alerts' | 'sos' | 'shelters'>('alerts');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [forceMapUpdate, setForceMapUpdate] = useState(false);

  // Generate random coordinates around Delhi for demo purposes
  const generateRandomCoordinates = (baseLat: number = 28.6139, baseLng: number = 77.2090, radius: number = 0.1) => {
    const randomLat = baseLat + (Math.random() - 0.5) * radius;
    const randomLng = baseLng + (Math.random() - 0.5) * radius;
    return [randomLat, randomLng] as [number, number];
  };

  // Handle alert click with smooth zoom
  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setMapCenter(alert.coordinates);
    setIsNavigating(true);
    setForceMapUpdate(true); // Force map update
    
    // Reset force update after a short delay
    setTimeout(() => {
      setForceMapUpdate(false);
    }, 100);
    
    // Smooth zoom to alert location
    setTimeout(() => {
      const mapElement = document.querySelector('.leaflet-container');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setIsNavigating(false);
    }, 1000);
  };

  // Handle shelter click with smooth zoom
  const handleShelterClick = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setMapCenter(shelter.coordinates);
    setIsNavigating(true);
    setForceMapUpdate(true); // Force map update
    
    // Reset force update after a short delay
    setTimeout(() => {
      setForceMapUpdate(false);
    }, 100);
    
    // Smooth zoom to shelter location
    setTimeout(() => {
      const mapElement = document.querySelector('.leaflet-container');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setIsNavigating(false);
    }, 1000);
  };

  // Handle SOS click with smooth zoom
  const handleSOSClick = (sos: any) => {
    setMapCenter(sos.location);
    setIsNavigating(true);
    setForceMapUpdate(true); // Force map update
    
    // Reset force update after a short delay
    setTimeout(() => {
      setForceMapUpdate(false);
    }, 100);
    
    // Smooth zoom to SOS location
    setTimeout(() => {
      const mapElement = document.querySelector('.leaflet-container');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setIsNavigating(false);
    }, 1000);
  };

  // Add error boundary for map errors
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      if (error.message && error.message.includes('_leaflet_pos')) {
        console.error('Leaflet positioning error:', error);
        setMapError('Map positioning error. Please refresh the page.');
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Reset error when data changes
  useEffect(() => {
    setMapError(null);
  }, [alerts, sosRequests, shelters]);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch alerts
        const alertsResponse = await apiRequest('http://localhost:8002/alerts/active');

        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          console.log('Raw alerts data:', alertsData);
          
          // Transform real alerts to ensure they have coordinates
          const realAlerts = (alertsData.alerts || []).map((alert: any, index: number) => {
            let coordinates = [28.6139, 77.2090]; // Default to Delhi
            let coordinateSource = 'default';
            
            console.log(`Processing real alert ${index}:`, {
              id: alert.id,
              location: alert.location,
              coordinates: alert.coordinates,
              message: alert.message
            });
            
            // Check if alert has coordinates array
            if (alert.coordinates && Array.isArray(alert.coordinates) && alert.coordinates.length === 2) {
              coordinates = [
                typeof alert.coordinates[0] === 'number' ? alert.coordinates[0] : parseFloat(alert.coordinates[0]) || 28.6139,
                typeof alert.coordinates[1] === 'number' ? alert.coordinates[1] : parseFloat(alert.coordinates[1]) || 77.2090
              ];
              coordinateSource = 'coordinates_array';
            }
            // Check if alert has location as coordinate string (lat,lng format)
            else if (alert.location && typeof alert.location === 'string') {
              // Try to parse as coordinates first
              if (alert.location.includes(',') && !isNaN(parseFloat(alert.location.split(',')[0]))) {
                const coords = alert.location.split(',').map((c: string) => parseFloat(c.trim()));
                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                  coordinates = coords;
                  coordinateSource = 'location_string_coords';
                }
              }
              // If location is a descriptive string, generate random coordinates around Delhi
              else {
                console.log(`Alert location is descriptive: ${alert.location}, generating random coordinates`);
                coordinates = generateRandomCoordinates();
                coordinateSource = 'random_generated';
              }
            }
            // Check if alert has location as array
            else if (alert.location && Array.isArray(alert.location) && alert.location.length === 2) {
              coordinates = [
                typeof alert.location[0] === 'number' ? alert.location[0] : parseFloat(alert.location[0]) || 28.6139,
                typeof alert.location[1] === 'number' ? alert.location[1] : parseFloat(alert.location[1]) || 77.2090
              ];
              coordinateSource = 'location_array';
            }
            
            console.log(`Real alert ${index} final coordinates:`, coordinates, `(source: ${coordinateSource})`);
            
            return {
              ...alert,
              coordinates,
              title: alert.message || alert.alert_type || 'Flood Alert',
              state: getStateFromCoordinates(coordinates[0], coordinates[1])
            };
          });
          
          // Generate comprehensive demo alerts from multiple states
          const demoAlerts = generateDemoAlerts().map(alert => ({
            ...alert,
            title: alert.message
          }));
          
          // Combine real and demo alerts
          const allAlerts = [...realAlerts, ...demoAlerts];
          setAlerts(allAlerts);
        }

        // Fetch SOS requests
        const sosResponse = await apiRequest('http://localhost:8002/admin/sos-requests?status=PENDING');

        if (sosResponse.ok) {
          const sosData = await sosResponse.json();
          // Transform real SOS requests to ensure they have proper location data
          const realSOS = (sosData.sos_requests || []).map((sos: any) => {
            let location = sos.location || [28.6139, 77.2090];
            
            // Ensure location coordinates are numbers
            if (Array.isArray(location) && location.length === 2) {
              location = [
                typeof location[0] === 'number' ? location[0] : parseFloat(location[0]) || 28.6139,
                typeof location[1] === 'number' ? location[1] : parseFloat(location[1]) || 77.2090
              ];
            } else {
              location = [28.6139, 77.2090]; // Default to Delhi
            }
            
            return {
              ...sos,
              location,
              state: getStateFromCoordinates(location[0], location[1])
            };
          });
          
          // Generate comprehensive demo SOS requests from multiple states
          const demoSOS = generateDemoSOS().map(sos => ({
            ...sos,
            location: sos.location,
            state: sos.state
          }));
          
          // Combine real and demo SOS requests
          const allSOS = [...realSOS, ...demoSOS];
          setSosRequests(allSOS);
        }

        // Fetch shelters
        const sheltersResponse = await apiRequest('http://localhost:8002/shelters');

        if (sheltersResponse.ok) {
          const sheltersData = await sheltersResponse.json();
          const realShelters = (sheltersData.shelters || []).map((shelter: any) => ({
            ...shelter,
            coordinates: shelter.coordinates || [shelter.latitude || 28.6139, shelter.longitude || 77.2090],
            facilities: shelter.facilities || [],
            isDemo: false,
            state: getStateFromCoordinates(
              shelter.coordinates?.[0] || shelter.latitude || 28.6139,
              shelter.coordinates?.[1] || shelter.longitude || 77.2090
            )
          }));
          
          // Generate comprehensive demo shelters from multiple states
          const demoShelters = generateDemoShelters();
          
          // Combine real and demo shelters
          const allShelters = [...realShelters, ...demoShelters];
          setShelters(allShelters);
        } else {
          // If backend shelters fail, use demo shelters
          const demoShelters = generateDemoShelters();
          setShelters(demoShelters);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const getAlertColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return '#10B981';
      case 'MODERATE': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      case 'CRITICAL': return '#7C2D12';
      default: return '#6B7280';
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

  const handleCloseAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8002/alerts/${alertId}/status?status=RESOLVED&resolution_notes=Alert closed by admin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('✅ Alert closed successfully!');
        // Remove alert from local state
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        setSelectedAlert(null);
      } else {
        const error = await response.json();
        alert(`❌ Failed to close alert: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error closing alert:', error);
      alert('❌ Error closing alert. Please check your connection.');
    }
  };

  const handleAddShelter = async () => {
    try {
      const shelterData = {
        name: newShelter.name,
        address: newShelter.address,
        capacity: parseInt(newShelter.capacity.toString()),
        contact: newShelter.contact,
        facilities: newShelter.facilities.split(',').map(f => f.trim()).filter(f => f),
        latitude: parseFloat(newShelter.latitude),
        longitude: parseFloat(newShelter.longitude)
      };

      const response = await apiRequest('http://localhost:8002/shelters', {
        method: 'POST',
        body: JSON.stringify(shelterData)
      });

      if (response.ok) {
        alert('✅ Shelter added successfully!');
        setShowAddShelter(false);
        setNewShelter({
          name: '',
          address: '',
          capacity: 100,
          contact: '',
          facilities: '',
          latitude: '',
          longitude: ''
        });
        // Refresh shelters
        const sheltersResponse = await apiRequest('http://localhost:8002/shelters');
        if (sheltersResponse.ok) {
          const sheltersData = await sheltersResponse.json();
          const transformedShelters = (sheltersData.shelters || []).map((shelter: any) => ({
            ...shelter,
            coordinates: shelter.coordinates || [shelter.latitude || 28.6139, shelter.longitude || 77.2090],
            facilities: shelter.facilities || [],
            isDemo: false
          }));
          setShelters(transformedShelters);
        }
      } else {
        const error = await response.json();
        alert(`❌ Failed to add shelter: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding shelter:', error);
      alert('❌ Error adding shelter. Please check your connection.');
    }
  };

  const handleDeleteShelter = async (shelterId: string) => {
    if (!window.confirm('Are you sure you want to delete this shelter?')) return;
    
    try {
      const response = await apiRequest(`http://localhost:8002/shelters/${shelterId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Shelter deleted successfully!');
        setShelters(prev => prev.filter(shelter => shelter.id !== shelterId));
        setSelectedShelter(null);
      } else {
        const error = await response.json();
        alert(`❌ Failed to delete shelter: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting shelter:', error);
      alert('❌ Error deleting shelter. Please check your connection.');
    }
  };

  const handleUpdateSOS = async (sosId: string, status: string) => {
    try {
      const response = await apiRequest(`http://localhost:8002/admin/sos-requests/${sosId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        alert(`SOS request ${status.toLowerCase()} successfully!`);
        // Remove resolved SOS from local state
        if (status === 'RESOLVED') {
          setSosRequests(prev => prev.filter(sos => sos.id !== sosId));
          setSelectedSOS(null);
        }
      } else {
        alert('Failed to update SOS request');
      }
    } catch (error) {
      console.error('Error updating SOS:', error);
      alert('Error updating SOS request');
    }
  };

  const MapController: React.FC<{ center: [number, number], forceUpdate?: boolean }> = ({ center, forceUpdate = false }) => {
    const map = useMap();
    const [isUserInteracting, setIsUserInteracting] = useState(false);
    const [lastCenter, setLastCenter] = useState<[number, number] | null>(null);
    const [shouldUpdate, setShouldUpdate] = useState(true);
    
    useEffect(() => {
      // Force update when explicitly requested (e.g., clicking on alerts/shelters)
      if (forceUpdate) {
        map.setView(center, 15, {
          animate: true,
          duration: 1.0,
          easeLinearity: 0.1
        });
        setLastCenter(center);
        setShouldUpdate(false);
        return;
      }
      
      // Only update map center if user is not manually interacting and we should update
      if (!isUserInteracting && shouldUpdate && lastCenter && 
          (Math.abs(center[0] - lastCenter[0]) > 0.001 || Math.abs(center[1] - lastCenter[1]) > 0.001)) {
        map.setView(center, 15, {
          animate: true,
          duration: 1.0,
          easeLinearity: 0.1
        });
        setLastCenter(center);
        setShouldUpdate(false); // Prevent further updates until user interaction
      } else if (!lastCenter) {
        // Initial center setting
        map.setView(center, 15, {
          animate: true,
          duration: 1.0,
          easeLinearity: 0.1
        });
        setLastCenter(center);
        setShouldUpdate(false);
      }
    }, [map, center, isUserInteracting, lastCenter, shouldUpdate, forceUpdate]);
    
    useEffect(() => {
      // Track user interactions
      let interactionTimeout: NodeJS.Timeout;
      
      const handleInteractionStart = () => {
        setIsUserInteracting(true);
        clearTimeout(interactionTimeout);
      };
      
      const handleInteractionEnd = () => {
        // Add a longer delay before allowing programmatic updates
        interactionTimeout = setTimeout(() => {
          setIsUserInteracting(false);
          setShouldUpdate(true); // Re-enable updates after user interaction
        }, 1000); // 1 second delay
      };
      
      // Track all possible user interactions
      map.on('zoomstart', handleInteractionStart);
      map.on('zoomend', handleInteractionEnd);
      map.on('dragstart', handleInteractionStart);
      map.on('dragend', handleInteractionEnd);
      map.on('moveend', handleInteractionEnd);
      map.on('click', handleInteractionStart);
      map.on('dblclick', handleInteractionStart);
      map.on('mousedown', handleInteractionStart);
      map.on('mouseup', handleInteractionEnd);
      
      return () => {
        clearTimeout(interactionTimeout);
        map.off('zoomstart', handleInteractionStart);
        map.off('zoomend', handleInteractionEnd);
        map.off('dragstart', handleInteractionStart);
        map.off('dragend', handleInteractionEnd);
        map.off('moveend', handleInteractionEnd);
        map.off('click', handleInteractionStart);
        map.off('dblclick', handleInteractionStart);
        map.off('mousedown', handleInteractionStart);
        map.off('mouseup', handleInteractionEnd);
      };
    }, [map]);
    
    return null;
  };

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
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
          ← Back to Admin Panel
        </button>
      )}

      {/* Clear Selection Button */}
      {(selectedAlert || selectedShelter) && (
        <button
          onClick={() => {
            setSelectedAlert(null);
            setSelectedShelter(null);
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'rgba(239, 68, 68, 0.9)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            color: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ✕ Clear Selection
        </button>
      )}

      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '80vh',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              background: activeTab === 'alerts' ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === 'alerts' ? '#1f2937' : '#6b7280'
            }}
          >
            🚨 Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('sos')}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              background: activeTab === 'sos' ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === 'sos' ? '#1f2937' : '#6b7280'
            }}
          >
            🆘 SOS ({sosRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('shelters')}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              background: activeTab === 'shelters' ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === 'shelters' ? '#1f2937' : '#6b7280'
            }}
          >
            🏠 Shelters ({shelters.length})
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'alerts' ? (
            <div>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                  🚨 Active Alerts
                </h3>
                <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                  Manage and close flood alerts
                </p>
              </div>

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
                        border: `2px solid ${getAlertColor(alert.severity || alert.risk_level)}`,
                        background: `${getAlertColor(alert.severity || alert.risk_level)}10`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        ...(selectedAlert?.id === alert.id && {
                          background: `${getAlertColor(alert.severity || alert.risk_level)}20`,
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
                        <div style={{ flex: 1 }}>
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
                        color: '#6b7280',
                        marginTop: '8px'
                      }}>
                        <span>📍 {formatCoordinates(alert.coordinates)}</span>
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to close this alert?')) {
                              handleCloseAlert(alert.id);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          ❌ Close Alert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                  <h4 style={{ margin: '0 0 8px 0' }}>No Active Alerts</h4>
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    All alerts have been resolved.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'sos' ? (
            <div>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                  🆘 SOS Requests
                </h3>
                <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                  Manage emergency SOS requests
                </p>
              </div>

              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  Loading SOS requests...
                </div>
              ) : sosRequests.length > 0 ? (
                <div style={{ padding: '10px' }}>
                  {sosRequests.map((sos) => (
                    <div
                      key={sos.id}
                      style={{
                        padding: '15px',
                        margin: '8px',
                        borderRadius: '8px',
                        border: '2px solid #dc2626',
                        background: '#fef2f2',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        ...(selectedSOS?.id === sos.id && {
                          background: '#fef2f2',
                          transform: 'scale(1.02)'
                        })
                      }}
                      onClick={() => {
                        setSelectedSOS(sos);
                        if (sos.location && sos.location.length === 2) {
                          setMapCenter(sos.location);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px', marginRight: '8px' }}>🆘</span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0', fontSize: '16px', color: '#1f2937' }}>
                            Emergency SOS Request
                          </h4>
                          <span style={{
                            fontSize: '12px',
                            color: '#dc2626',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {sos.status}
                          </span>
                        </div>
                      </div>
                      
                      <p style={{
                        margin: '8px 0',
                        fontSize: '14px',
                        color: '#4b5563',
                        lineHeight: '1.4'
                      }}>
                        {sos.message || 'Emergency assistance needed'}
                      </p>
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '8px'
                      }}>
                        <span>📍 {formatCoordinates(sos.location)}</span>
                        <span>{formatTimeAgo(sos.timestamp)}</span>
                      </div>

                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateSOS(sos.id, 'IN_PROGRESS');
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          🚑 Respond
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateSOS(sos.id, 'RESOLVED');
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          ✅ Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                  <h4 style={{ margin: '0 0 8px 0' }}>No Pending SOS Requests</h4>
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    All SOS requests have been handled.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                      🏠 Shelter Management
                    </h3>
                    <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                      Manage emergency shelters
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddShelter(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    + Add Shelter
                  </button>
                </div>
              </div>

              {showAddShelter && (
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>Add New Shelter</h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Shelter Name"
                      value={newShelter.name}
                      onChange={(e) => setNewShelter({...newShelter, name: e.target.value})}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={newShelter.address}
                      onChange={(e) => setNewShelter({...newShelter, address: e.target.value})}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="Capacity"
                        value={newShelter.capacity}
                        onChange={(e) => setNewShelter({...newShelter, capacity: parseInt(e.target.value) || 100})}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Contact"
                        value={newShelter.contact}
                        onChange={(e) => setNewShelter({...newShelter, contact: e.target.value})}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        value={newShelter.latitude}
                        onChange={(e) => setNewShelter({...newShelter, latitude: e.target.value})}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        value={newShelter.longitude}
                        onChange={(e) => setNewShelter({...newShelter, longitude: e.target.value})}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Facilities (comma separated)"
                      value={newShelter.facilities}
                      onChange={(e) => setNewShelter({...newShelter, facilities: e.target.value})}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setShowAddShelter(false)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddShelter}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        Add Shelter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  Loading shelters...
                </div>
              ) : shelters.length > 0 ? (
                <div style={{ padding: '10px' }}>
                  {shelters.map((shelter) => (
                    <div
                      key={shelter.id}
                      style={{
                        padding: '15px',
                        margin: '8px',
                        borderRadius: '8px',
                        border: '2px solid #3B82F6',
                        background: '#f0f9ff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        ...(selectedShelter?.id === shelter.id && {
                          background: '#e0f2fe',
                          transform: 'scale(1.02)'
                        })
                      }}
                      onClick={() => {
                        setSelectedShelter(shelter);
                        if (shelter.coordinates && shelter.coordinates.length === 2) {
                          setMapCenter(shelter.coordinates);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px', marginRight: '8px' }}>🏠</span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0', fontSize: '16px', color: '#1f2937' }}>
                            {shelter.name}
                          </h4>
                          <span style={{
                            fontSize: '12px',
                            color: '#3B82F6',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            SHELTER
                          </span>
                        </div>
                      </div>
                      
                      <p style={{
                        margin: '8px 0',
                        fontSize: '14px',
                        color: '#4b5563',
                        lineHeight: '1.4'
                      }}>
                        {shelter.address}
                      </p>
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '8px'
                      }}>
                        <span>📍 {formatCoordinates(shelter.coordinates)}</span>
                        <span>{shelter.currentOccupancy}/{shelter.capacity} people</span>
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteShelter(shelter.id);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
                  <h4 style={{ margin: '0 0 8px 0' }}>No Shelters Found</h4>
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    Add your first shelter to get started.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      {isNavigating && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #3b82f6',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Navigating to location...
        </div>
      )}
      {mapError ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#f8fafc',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Map Loading Error</h3>
          <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>{mapError}</p>
          <button
            onClick={() => {
              setMapError(null);
              window.location.reload();
            }}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          whenReady={() => {
            console.log('Map is ready');
            setMapReady(true);
          }}
        >
        <MapController center={mapCenter} forceUpdate={forceMapUpdate} />
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
        {mapReady && alerts.filter(alert => alert.coordinates && alert.coordinates.length === 2).map((alert) => (
          <Circle
            key={alert.id}
            center={alert.coordinates}
            radius={1000}
            pathOptions={{
              color: getAlertColor(alert.severity || alert.risk_level),
              fillColor: getAlertColor(alert.severity || alert.risk_level),
              fillOpacity: 0.3,
              weight: 3,
              dashArray: (alert.severity || alert.risk_level) === 'CRITICAL' ? '5, 5' : '10, 10'
            }}
            eventHandlers={{
              click: () => handleAlertClick(alert)
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

                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to close this alert?')) {
                        handleCloseAlert(alert.id);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      width: '100%'
                    }}
                  >
                    ❌ Close Alert
                  </button>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* SOS Request Markers */}
        {mapReady && sosRequests.filter(sos => sos.location && sos.location.length === 2).map((sos) => (
          <Marker
            key={sos.id}
            position={sos.location}
            icon={L.divIcon({
              html: `
                <div style="
                  background: #dc2626;
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  border: 3px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  animation: pulse 1s infinite;
                ">🆘</div>
              `,
              className: 'sos-marker',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
            eventHandlers={{
              click: () => handleSOSClick(sos)
            }}
          >
            <Popup>
              <div style={{ minWidth: '250px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', marginRight: '8px' }}>🆘</span>
                  <div>
                    <h3 style={{ margin: '0', color: '#dc2626' }}>
                      Emergency SOS Request
                    </h3>
                    <span style={{
                      fontSize: '12px',
                      color: '#dc2626',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {sos.status}
                    </span>
                  </div>
                </div>
                
                <p style={{ margin: '8px 0', fontSize: '14px', lineHeight: '1.4' }}>
                  {sos.message || 'Emergency assistance needed'}
                </p>
                
                <div style={{
                  background: '#f8fafc',
                  padding: '8px',
                  borderRadius: '6px',
                  marginTop: '12px'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Location:</strong> {sos.location[0].toFixed(4)}, {sos.location[1].toFixed(4)}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Time:</strong> {formatTimeAgo(sos.timestamp)} ({new Date(sos.timestamp).toLocaleString()})
                  </p>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleUpdateSOS(sos.id, 'IN_PROGRESS')}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      flex: 1
                    }}
                  >
                    🚑 Respond
                  </button>
                  <button
                    onClick={() => handleUpdateSOS(sos.id, 'RESOLVED')}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      flex: 1
                    }}
                  >
                    ✅ Resolve
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Shelter Markers */}
        {mapReady && shelters.filter(shelter => shelter.coordinates && shelter.coordinates.length === 2).map((shelter) => (
          <Marker
            key={`shelter-${shelter.id}`}
            position={shelter.coordinates}
            icon={L.divIcon({
              html: `
                <div style="
                  background: #3B82F6;
                  width: 25px;
                  height: 25px;
                  border-radius: 50%;
                  border: 2px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  ${selectedShelter?.id === shelter.id ? 'transform: scale(1.2);' : ''}
                ">🏠</div>
              `,
              className: 'shelter-marker',
              iconSize: [25, 25],
              iconAnchor: [12, 12]
            })}
            eventHandlers={{
              click: () => handleShelterClick(shelter)
            }}
          >
            <Popup>
              <div style={{ minWidth: '250px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>🏠</span>
                  <div>
                    <h3 style={{ margin: '0', color: '#3B82F6' }}>
                      {shelter.name}
                    </h3>
                  </div>
                </div>
                
                <p style={{ margin: '8px 0', fontSize: '14px', lineHeight: '1.4' }}>
                  {shelter.address}
                </p>
                
                <div style={{
                  background: '#f8fafc',
                  padding: '8px',
                  borderRadius: '6px',
                  marginTop: '12px'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Capacity:</strong> {shelter.currentOccupancy}/{shelter.capacity} people
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Contact:</strong> {shelter.contact}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Facilities:</strong> {shelter.facilities.join(', ')}
                  </p>
                </div>
                
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDeleteShelter(shelter.id)}
                    style={{
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        </MapContainer>
      )}

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
          Map Legend
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '8px' }}></div>
          <span style={{ fontSize: '12px' }}>Low Risk Alert</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#F59E0B', borderRadius: '50%', marginRight: '8px' }}></div>
          <span style={{ fontSize: '12px' }}>Moderate Risk Alert</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#EF4444', borderRadius: '50%', marginRight: '8px' }}></div>
          <span style={{ fontSize: '12px' }}>High Risk Alert</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#7C2D12', borderRadius: '50%', marginRight: '8px' }}></div>
          <span style={{ fontSize: '12px' }}>Critical Risk Alert</span>
        </div>
        <hr style={{ margin: '10px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#dc2626', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🆘</div>
          <span style={{ fontSize: '12px' }}>SOS Request</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#3B82F6', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🏠</div>
          <span style={{ fontSize: '12px' }}>Shelters</span>
        </div>
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

export default AdminGIS;
