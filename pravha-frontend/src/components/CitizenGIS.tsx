import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateDemoShelters, generateDemoAlerts, getStateFromCoordinates } from '../data/demoData';
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
  // Hardcoded demo shelters to ensure visibility
  const defaultShelters: Shelter[] = [
    {
      id: 'default-1',
      name: 'Central Emergency Shelter',
      address: 'Central Delhi, New Delhi',
      capacity: 200,
      currentOccupancy: 45,
      coordinates: [28.6139, 77.2090],
      facilities: ['Food', 'Water', 'Medical', 'Beds'],
      contact: '+91-9876543210',
      isDemo: true
    },
    {
      id: 'default-2', 
      name: 'Community Relief Center',
      address: 'Connaught Place, New Delhi',
      capacity: 150,
      currentOccupancy: 80,
      coordinates: [28.6315, 77.2167],
      facilities: ['Food', 'Water', 'First Aid'],
      contact: '+91-9876543211',
      isDemo: true
    },
    {
      id: 'default-3',
      name: 'Flood Relief Camp',
      address: 'India Gate Area, New Delhi', 
      capacity: 300,
      currentOccupancy: 120,
      coordinates: [28.6129, 77.2295],
      facilities: ['Food', 'Water', 'Medical', 'Transport'],
      contact: '+91-9876543212',
      isDemo: true
    }
  ];

  const [shelters, setShelters] = useState<Shelter[]>(defaultShelters);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]); // Delhi center
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [forceMapUpdate, setForceMapUpdate] = useState(false);
  
  // Debouncing refs to prevent rapid updates
  const alertClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shelterClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  

  // Generate random coordinates around Delhi for demo purposes
  const generateRandomCoordinates = (baseLat: number = 28.6139, baseLng: number = 77.2090, radius: number = 0.1) => {
    const randomLat = baseLat + (Math.random() - 0.5) * radius;
    const randomLng = baseLng + (Math.random() - 0.5) * radius;
    return [randomLat, randomLng] as [number, number];
  };

  // Demo shelters are now generated from the imported demoData.ts file

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
  }, [alerts, shelters]);

  // Fetch alerts and shelters from backend
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
          
          // Generate comprehensive demo shelters from multiple states
          const demoShelters = generateDemoShelters();
          
          // Fetch real shelters from backend
          try {
            const sheltersResponse = await apiRequest('http://localhost:8002/shelters');
            
            if (sheltersResponse.ok) {
              const sheltersData = await sheltersResponse.json();
              console.log('Raw shelters data from API:', sheltersData);
              
              const realShelters = (sheltersData.shelters || []).map((shelter: any) => {
                // Handle different coordinate formats
                let coordinates = [28.6139, 77.2090]; // Default to Delhi
                
                if (shelter.coordinates && Array.isArray(shelter.coordinates) && shelter.coordinates.length === 2) {
                  coordinates = shelter.coordinates;
                } else if (shelter.location && Array.isArray(shelter.location) && shelter.location.length === 2) {
                  coordinates = shelter.location;
                } else if (shelter.latitude && shelter.longitude) {
                  coordinates = [shelter.latitude, shelter.longitude];
                }
                
                console.log(`Processing shelter: ${shelter.name}, coordinates:`, coordinates);
                
                return {
                  ...shelter,
                  coordinates,
                  currentOccupancy: shelter.current_occupancy || shelter.currentOccupancy || 0,
                  isDemo: false,
                  state: getStateFromCoordinates(coordinates[0], coordinates[1])
                };
              });
              
              console.log('Processed real shelters:', realShelters);
              setShelters([...defaultShelters, ...realShelters, ...demoShelters]);
            } else {
              console.log('Shelters API failed, using default shelters');
              setShelters([...defaultShelters, ...demoShelters]);
            }
          } catch (shelterError) {
            console.error('Error fetching shelters:', shelterError);
            console.log('Using default shelters due to API error');
            setShelters([...defaultShelters, ...demoShelters]);
          }
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

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Find nearest shelter to an alert
  const findNearestShelter = (alertCoordinates: [number, number]): Shelter | null => {
    let nearestShelter: Shelter | null = null;
    let minDistance = Infinity;

    shelters.forEach(shelter => {
      if (shelter.coordinates && shelter.coordinates.length === 2) {
        const distance = calculateDistance(
          alertCoordinates[0], alertCoordinates[1],
          shelter.coordinates[0], shelter.coordinates[1]
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestShelter = shelter;
        }
      }
    });

    return nearestShelter;
  };

  // Generate route between two points (optimized for performance)
  const generateRoute = (start: [number, number], end: [number, number]) => {
    const points: [number, number][] = [start];
    
    // Reduced steps for better performance while maintaining visual quality
    const steps = 5; // Reduced from 10 to 5
    for (let i = 1; i < steps; i++) {
      const lat = start[0] + (end[0] - start[0]) * (i / steps);
      const lng = start[1] + (end[1] - start[1]) * (i / steps);
      points.push([lat, lng]);
    }
    
    points.push(end);
    return points;
  };

  // Handle alert click - find nearest shelter and show route (optimized with debouncing)
  const handleAlertClick = (alert: Alert) => {
    // Clear any existing timeout
    if (alertClickTimeoutRef.current) {
      clearTimeout(alertClickTimeoutRef.current);
    }
    
    // Debounce rapid clicks
    alertClickTimeoutRef.current = setTimeout(() => {
      setSelectedAlert(alert);
      setMapCenter(alert.coordinates);
      setIsNavigating(true);
      setForceMapUpdate(true);
      
      const nearestShelter = findNearestShelter(alert.coordinates);
      if (nearestShelter) {
        setSelectedShelter(nearestShelter);
        const routePoints = generateRoute(alert.coordinates, nearestShelter.coordinates);
        setRoute(routePoints);
      }
      
      // Optimized timing - single timeout for all operations
      setTimeout(() => {
        setForceMapUpdate(false);
        setIsNavigating(false);
      }, 200); // Further reduced to 200ms for even faster response
    }, 100); // 100ms debounce delay
  };

  // Handle shelter click (optimized with debouncing)
  const handleShelterClick = (shelter: Shelter) => {
    // Clear any existing timeout
    if (shelterClickTimeoutRef.current) {
      clearTimeout(shelterClickTimeoutRef.current);
    }
    
    // Debounce rapid clicks
    shelterClickTimeoutRef.current = setTimeout(() => {
      setSelectedShelter(shelter);
      setMapCenter(shelter.coordinates);
      setRoute(null);
      setIsNavigating(true);
      setForceMapUpdate(true);
      
      // Optimized timing - single timeout for all operations
      setTimeout(() => {
        setForceMapUpdate(false);
        setIsNavigating(false);
      }, 200); // Further reduced to 200ms for even faster response
    }, 100); // 100ms debounce delay
  };

  const MapController: React.FC<{ center: [number, number], forceUpdate?: boolean }> = ({ center, forceUpdate = false }) => {
    const map = useMap();
    const [isUserInteracting, setIsUserInteracting] = useState(false);
    const [lastCenter, setLastCenter] = useState<[number, number] | null>(null);
    const [shouldUpdate, setShouldUpdate] = useState(true);
    const [userZoomLevel, setUserZoomLevel] = useState<number | null>(null);
    
    useEffect(() => {
      // Force update when explicitly requested (e.g., clicking on alerts/shelters)
      if (forceUpdate) {
        const zoomLevel = userZoomLevel || 15; // Use user's zoom level if available
        map.setView(center, zoomLevel, {
          animate: true,
          duration: 0.4, // Reduced from 1.0 to 0.4 for faster animation
          easeLinearity: 0.25 // Improved easing for smoother animation
        });
        setLastCenter(center);
        setShouldUpdate(false);
        return;
      }
      
      // Only update map center if user is not manually interacting and we should update
      if (!isUserInteracting && shouldUpdate && lastCenter && 
          (Math.abs(center[0] - lastCenter[0]) > 0.001 || Math.abs(center[1] - lastCenter[1]) > 0.001)) {
        const zoomLevel = userZoomLevel || map.getZoom(); // Preserve current zoom level
        map.setView(center, zoomLevel, {
          animate: true,
          duration: 0.4, // Reduced from 1.0 to 0.4 for faster animation
          easeLinearity: 0.25 // Improved easing for smoother animation
        });
        setLastCenter(center);
        setShouldUpdate(false); // Prevent further updates until user interaction
      } else if (!lastCenter) {
        // Initial center setting
        map.setView(center, 13, {
          animate: true,
          duration: 0.4, // Reduced from 1.0 to 0.4 for faster animation
          easeLinearity: 0.25 // Improved easing for smoother animation
        });
        setLastCenter(center);
        setShouldUpdate(false);
      }
    }, [map, center, isUserInteracting, lastCenter, shouldUpdate, forceUpdate, userZoomLevel]);
    
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
        }, 3000); // Increased to 3 seconds to give users more time
      };

      const handleZoomEnd = () => {
        // Store user's zoom level when they zoom
        setUserZoomLevel(map.getZoom());
        // Don't immediately end interaction after zoom - let user continue
        interactionTimeout = setTimeout(() => {
          setIsUserInteracting(false);
          setShouldUpdate(true);
        }, 2000); // 2 second delay after zoom
      };
      
      // Track all possible user interactions
      map.on('zoomstart', handleInteractionStart);
      map.on('zoomend', handleZoomEnd);
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
        map.off('zoomend', handleZoomEnd);
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
          ← Back to Dashboard
        </button>
      )}

      {/* Clear Selection Button */}
      {(selectedAlert || selectedShelter) && (
        <button
          onClick={() => {
            setSelectedAlert(null);
            setSelectedShelter(null);
            setRoute(null);
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
                  onClick={() => handleAlertClick(alert)}
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
            radius={1000} // 1km radius
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
                
                {selectedAlert?.id === alert.id && selectedShelter && (
                  <div style={{
                    background: '#e0f2fe',
                    padding: '8px',
                    borderRadius: '6px',
                    marginTop: '12px',
                    border: '1px solid #0ea5e9'
                  }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '600', color: '#0c4a6e' }}>
                      🏠 Nearest Shelter: {selectedShelter.name}
                    </p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#0c4a6e' }}>
                      Click to see route to shelter
                    </p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

          {/* Shelter Markers */}
          {mapReady && shelters.filter(shelter => {
            const hasValidCoords = shelter.coordinates && 
              Array.isArray(shelter.coordinates) && 
              shelter.coordinates.length === 2 &&
              typeof shelter.coordinates[0] === 'number' &&
              typeof shelter.coordinates[1] === 'number' &&
              !isNaN(shelter.coordinates[0]) &&
              !isNaN(shelter.coordinates[1]);
            
            if (!hasValidCoords) {
              console.log(`Shelter ${shelter.name} has invalid coordinates:`, shelter.coordinates);
            }
            
            return hasValidCoords;
          }).map((shelter) => (
          <Marker
            key={`shelter-${shelter.id}`}
            position={shelter.coordinates}
            icon={L.divIcon({
              html: `
                <div style="
                  background: ${shelter.isDemo ? '#10B981' : '#3B82F6'};
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
                    <h3 style={{ margin: '0', color: shelter.isDemo ? '#10B981' : '#3B82F6' }}>
                      {shelter.name}
                    </h3>
                    {shelter.isDemo && (
                      <span style={{
                        fontSize: '10px',
                        color: '#10B981',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        DEMO SHELTER
                      </span>
                    )}
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
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route Line */}
        {mapReady && route && route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: '#EF4444',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 10'
            }}
          />
        )}
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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#3B82F6', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🏠</div>
          <span style={{ fontSize: '12px' }}>Shelters</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🏠</div>
          <span style={{ fontSize: '12px' }}>Demo Shelters</span>
        </div>
        {route && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ width: '20px', height: '4px', backgroundColor: '#EF4444', marginRight: '8px', border: '1px solid #EF4444', backgroundImage: 'repeating-linear-gradient(90deg, #EF4444, #EF4444 5px, transparent 5px, transparent 10px)' }}></div>
            <span style={{ fontSize: '12px' }}>Route to Shelter</span>
          </div>
        )}
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
