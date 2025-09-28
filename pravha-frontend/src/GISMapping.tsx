import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_ENDPOINTS } from '../config/api';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface FloodRiskZone {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  probability: number;
  lastUpdated: string;
}

interface SensorData {
  id: string;
  name: string;
  location: [number, number];
  type: 'WATER_LEVEL' | 'RAINFALL' | 'SOIL_MOISTURE';
  value: number;
  unit: string;
  status: 'ACTIVE' | 'WARNING' | 'CRITICAL';
  lastReading: string;
}

interface PredictionResponse {
  probability: number;
  uncertainty: number;
  alert: string;
  risk_level: string;
  alert_sent: boolean;
  alert_id?: number;
}

interface GISMappingProps {
  onLocationSelect?: (location: [number, number]) => void;
  onBack?: () => void;
  predictionLocation?: [number, number] | null;
  prediction?: PredictionResponse | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  } | null;
}

const FloodRiskLegend: React.FC<{user?: {role: string} | null}> = ({user}) => (
  <div style={{
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    zIndex: 1000,
    minWidth: '200px'
  }}>
    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Flood Risk Levels</h4>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '8px' }}></div>
      <span style={{ fontSize: '12px' }}>Low Risk (0-30%)</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#F59E0B', borderRadius: '50%', marginRight: '8px' }}></div>
      <span style={{ fontSize: '12px' }}>Moderate Risk (30-60%)</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#EF4444', borderRadius: '50%', marginRight: '8px' }}></div>
      <span style={{ fontSize: '12px' }}>High Risk (60-80%)</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#7C2D12', borderRadius: '50%', marginRight: '8px' }}></div>
      <span style={{ fontSize: '12px' }}>Critical Risk (80-100%)</span>
    </div>
    <hr style={{ margin: '10px 0' }} />
    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>IoT Sensors</h4>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#3B82F6', borderRadius: '50%', marginRight: '8px' }}></div>
      <span style={{ fontSize: '12px' }}>Water Level</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#8B5CF6', borderRadius: '50%', marginRight: '8px' }}></div>
      <span style={{ fontSize: '12px' }}>Rainfall</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#06B6D4', borderRadius: '50%', marginRight: '8px' }}></div>
      <span style={{ fontSize: '12px' }}>Soil Moisture</span>
    </div>
    <hr style={{ margin: '10px 0' }} />
    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Your Analysis</h4>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#DC2626', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🎯</div>
      <span style={{ fontSize: '12px' }}>AI Prediction (Your Location)</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#6b7280', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>📍</div>
      <span style={{ fontSize: '12px' }}>Selected Location</span>
    </div>
    <hr style={{ margin: '10px 0' }} />
    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Zone Types</h4>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '3px', backgroundColor: '#f59e0b', marginRight: '8px', borderRadius: '2px', border: '1px dashed #d97706' }}></div>
      <span style={{ fontSize: '12px' }}>Historical Flood Zones</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '3px', backgroundColor: '#ef4444', marginRight: '8px', borderRadius: '2px', border: '2px dashed #dc2626' }}></div>
      <span style={{ fontSize: '12px' }}>Your Prediction Zone</span>
    </div>
    <hr style={{ margin: '10px 0' }} />
    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Emergency Locations</h4>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#ef4444', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>⚠️</div>
      <span style={{ fontSize: '12px' }}>Flood-Prone Areas</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#10b981', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🏥</div>
      <span style={{ fontSize: '12px' }}>Emergency Shelters</span>
    </div>
    {user?.role === 'admin' && (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ width: '20px', height: '20px', backgroundColor: '#dc2626', borderRadius: '50%', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🆘</div>
        <span style={{ fontSize: '12px' }}>Active SOS Requests</span>
      </div>
    )}
  </div>
);

const MapController: React.FC<{ center: [number, number]; onLocationSelect?: (location: [number, number]) => void }> = ({ center, onLocationSelect }) => {
  const map = useMap();
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [lastCenter, setLastCenter] = useState<[number, number] | null>(null);
  const [userZoomLevel, setUserZoomLevel] = useState<number | null>(null);

  useEffect(() => {
    // Only update map center if user is not manually interacting
    if (!isUserInteracting && lastCenter && 
        (Math.abs(center[0] - lastCenter[0]) > 0.001 || Math.abs(center[1] - lastCenter[1]) > 0.001)) {
      const zoomLevel = userZoomLevel || map.getZoom(); // Preserve current zoom level
      map.setView(center, zoomLevel, {
        animate: true,
        duration: 0.3, // Reduced from 0.5 to 0.3 for faster animation
        easeLinearity: 0.25 // Added better easing
      });
      setLastCenter(center);
    } else if (!lastCenter) {
      // Initial center setting
      map.setView(center, 13, {
        animate: true,
        duration: 0.3, // Reduced from 0.5 to 0.3 for faster animation
        easeLinearity: 0.25 // Added better easing
      });
      setLastCenter(center);
    }
  }, [map, center, isUserInteracting, lastCenter, userZoomLevel]);

  useEffect(() => {
    // Track user interactions
    let interactionTimeout: NodeJS.Timeout;
    
    const handleInteractionStart = () => {
      setIsUserInteracting(true);
      clearTimeout(interactionTimeout);
    };
    
    const handleInteractionEnd = () => {
      // Add a delay before allowing programmatic updates
      interactionTimeout = setTimeout(() => {
        setIsUserInteracting(false);
      }, 3000); // Increased to 3 seconds to give users more time
    };

    const handleZoomEnd = () => {
      // Store user's zoom level when they zoom
      setUserZoomLevel(map.getZoom());
      // Don't immediately end interaction after zoom - let user continue
      interactionTimeout = setTimeout(() => {
        setIsUserInteracting(false);
      }, 2000); // 2 second delay after zoom
    };

    // Add click event listener for location selection
    const handleClick = (e: any) => {
      const { lat, lng } = e.latlng;
      console.log('Map clicked at:', lat, lng); // Debug log
      if (onLocationSelect) {
        onLocationSelect([lat, lng]);
        // Show a temporary popup to confirm selection
        L.popup()
          .setLatLng([lat, lng])
          .setContent(`<div style="text-align: center;">
            <strong>📍 Location Selected</strong><br/>
            Lat: ${lat.toFixed(4)}<br/>
            Lng: ${lng.toFixed(4)}<br/>
            <small>Click "Back to Prediction" to use this location</small>
          </div>`)
          .openOn(map);
      }
    };
    
    // Track all possible user interactions
    map.on('zoomstart', handleInteractionStart);
    map.on('zoomend', handleZoomEnd);
    map.on('dragstart', handleInteractionStart);
    map.on('dragend', handleInteractionEnd);
    map.on('moveend', handleInteractionEnd);
    map.on('click', handleClick);
    map.on('dblclick', handleInteractionStart);
    map.on('mousedown', handleInteractionStart);
    map.on('mouseup', handleInteractionEnd);

    // Cleanup
    return () => {
      clearTimeout(interactionTimeout);
      map.off('zoomstart', handleInteractionStart);
      map.off('zoomend', handleZoomEnd);
      map.off('dragstart', handleInteractionStart);
      map.off('dragend', handleInteractionEnd);
      map.off('moveend', handleInteractionEnd);
      map.off('click', handleClick);
      map.off('dblclick', handleInteractionStart);
      map.off('mousedown', handleInteractionStart);
      map.off('mouseup', handleInteractionEnd);
    };
  }, [map, onLocationSelect]);

  return null;
};

const GISMapping: React.FC<GISMappingProps> = ({ onLocationSelect, onBack, predictionLocation, prediction, user }) => {
  const [floodRiskZones, setFloodRiskZones] = useState<FloodRiskZone[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [selectedZone, setSelectedZone] = useState<FloodRiskZone | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]); // New Delhi coordinates
  const [sosRequests, setSosRequests] = useState<any[]>([]);
  const [showSendAlert, setShowSendAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  // Auto-center map on prediction location when prediction is made
  useEffect(() => {
    if (predictionLocation && prediction) {
      console.log('🎯 Auto-centering map on prediction location:', predictionLocation);
      setMapCenter(predictionLocation);
    }
  }, [predictionLocation, prediction]);

  // Flood-prone places and shelter data
  const floodPronePlaces: Array<{name: string; location: [number, number]; state: string; type: string}> = [
    // Assam
    { name: 'Majuli Island', location: [26.9500, 94.1667], state: 'Assam', type: 'flood-prone' },
    { name: 'Barpeta District', location: [26.3229, 91.0062], state: 'Assam', type: 'flood-prone' },
    { name: 'Dhemaji District', location: [27.4833, 94.5833], state: 'Assam', type: 'flood-prone' },
    { name: 'Lakhimpur District', location: [27.3500, 94.1167], state: 'Assam', type: 'flood-prone' },
    { name: 'Morigaon District', location: [26.2500, 92.3500], state: 'Assam', type: 'flood-prone' },
    
    // Odisha
    { name: 'Puri District', location: [19.8139, 85.8312], state: 'Odisha', type: 'flood-prone' },
    { name: 'Ganjam District', location: [19.3167, 84.7833], state: 'Odisha', type: 'flood-prone' },
    { name: 'Balasore District', location: [21.4942, 86.9336], state: 'Odisha', type: 'flood-prone' },
    { name: 'Khordha District', location: [20.1797, 85.6167], state: 'Odisha', type: 'flood-prone' },
    { name: 'Kendrapara District', location: [20.5000, 86.4167], state: 'Odisha', type: 'flood-prone' },
    { name: 'Bhadrak District', location: [21.0667, 86.5000], state: 'Odisha', type: 'flood-prone' },
    
    // Tripura
    { name: 'Tripura Low-lying Areas', location: [23.9408, 91.9882], state: 'Tripura', type: 'flood-prone' },
    
    // Bihar
    { name: 'Bhagalpur District', location: [25.2445, 86.9718], state: 'Bihar', type: 'flood-prone' },
    { name: 'East Champaran', location: [26.5833, 84.9167], state: 'Bihar', type: 'flood-prone' },
    { name: 'Sitamarhi District', location: [26.6000, 85.4833], state: 'Bihar', type: 'flood-prone' },
    { name: 'Muzaffarpur District', location: [26.1167, 85.4000], state: 'Bihar', type: 'flood-prone' },
    { name: 'Khagaria District', location: [25.5000, 86.4833], state: 'Bihar', type: 'flood-prone' }
  ];

  const shelterLocations: Array<{name: string; location: [number, number]; state: string; capacity: number; type: string}> = [
    // Assam Shelters
    { name: 'Karatipar Shelter (Majuli)', location: [26.9500, 94.1667], state: 'Assam', capacity: 200, type: 'shelter' },
    { name: 'Kanaragaon Shelter (Barpeta)', location: [26.3229, 91.0062], state: 'Assam', capacity: 150, type: 'shelter' },
    { name: 'Bahgarh Shelter (Lakhimpur)', location: [27.3500, 94.1167], state: 'Assam', capacity: 180, type: 'shelter' },
    { name: 'Baksa School Shelter', location: [26.7000, 91.4333], state: 'Assam', capacity: 100, type: 'shelter' },
    { name: 'Sonitpur School Shelter', location: [26.6167, 92.8000], state: 'Assam', capacity: 120, type: 'shelter' },
    { name: 'Biswanath School Shelter', location: [26.7167, 93.1500], state: 'Assam', capacity: 100, type: 'shelter' },
    { name: 'Golaghat School Shelter', location: [26.5167, 93.9667], state: 'Assam', capacity: 110, type: 'shelter' },
    { name: 'Dibrugarh School Shelter', location: [27.4833, 94.9167], state: 'Assam', capacity: 130, type: 'shelter' },
    { name: 'Sivasagar School Shelter', location: [26.9833, 94.6333], state: 'Assam', capacity: 120, type: 'shelter' },
    
    // Odisha Shelters
    { name: 'Puri Multipurpose Shelter', location: [19.8139, 85.8312], state: 'Odisha', capacity: 300, type: 'shelter' },
    { name: 'Ganjam Multipurpose Shelter', location: [19.3167, 84.7833], state: 'Odisha', capacity: 250, type: 'shelter' },
    { name: 'Balasore Multipurpose Shelter', location: [21.4942, 86.9336], state: 'Odisha', capacity: 200, type: 'shelter' },
    { name: 'Khurda Multipurpose Shelter', location: [20.1797, 85.6167], state: 'Odisha', capacity: 180, type: 'shelter' },
    { name: 'Kendrapara Multipurpose Shelter', location: [20.5000, 86.4167], state: 'Odisha', capacity: 220, type: 'shelter' },
    { name: 'Bhadrak Multipurpose Shelter', location: [21.0667, 86.5000], state: 'Odisha', capacity: 190, type: 'shelter' },
    { name: 'Anji Shelter (Balasore)', location: [21.5000, 86.9000], state: 'Odisha', capacity: 150, type: 'shelter' },
    { name: 'Ganthiapali Shelter (Baragada)', location: [20.2000, 85.5000], state: 'Odisha', capacity: 160, type: 'shelter' },
    { name: 'Nandapur Shelter (Bhadrak)', location: [21.1000, 86.4000], state: 'Odisha', capacity: 140, type: 'shelter' },
    
    // Tripura Shelters
    { name: 'Tripura Relief Camp 1', location: [23.9408, 91.9882], state: 'Tripura', capacity: 100, type: 'shelter' },
    { name: 'Tripura Relief Camp 2', location: [23.8000, 91.8000], state: 'Tripura', capacity: 80, type: 'shelter' },
    
    // Bihar Shelters
    { name: 'Urdu Middle School (Bhagalpur)', location: [25.2445, 86.9718], state: 'Bihar', capacity: 200, type: 'shelter' },
    { name: 'Saraswati Vidya Mandir (Bhagalpur)', location: [25.2500, 86.9800], state: 'Bihar', capacity: 150, type: 'shelter' },
    { name: 'CTS Ground (Nath Nagar)', location: [25.2400, 86.9700], state: 'Bihar', capacity: 300, type: 'shelter' },
    { name: 'Rain Basera Lalbagh (Darbhanga)', location: [26.1667, 85.9000], state: 'Bihar', capacity: 120, type: 'shelter' },
    { name: 'Rain Basera Katihar', location: [25.5333, 87.5833], state: 'Bihar', capacity: 100, type: 'shelter' },
    { name: 'Rain Basera Khagaria', location: [25.5000, 86.4833], state: 'Bihar', capacity: 110, type: 'shelter' }
  ];

  // Fetch data from backend APIs
  useEffect(() => {
    const fetchGISData = async () => {
      try {
        // Fetch flood risk zones
        const zonesResponse = await fetch(`${API_ENDPOINTS.HEALTH.replace('/health', '')}/gis/flood-zones`);
        const zonesData = await zonesResponse.json();

        // Fetch sensor data
        const sensorsResponse = await fetch(`${API_ENDPOINTS.HEALTH.replace('/health', '')}/gis/sensors`);
        const sensorsData = await sensorsResponse.json();

        // Fetch SOS requests for admin
        if (user?.role === 'admin') {
          const sosResponse = await fetch(API_ENDPOINTS.ADMIN.SOS_REQUESTS);
          const sosData = await sosResponse.json();
          setSosRequests(sosData.sos_requests || []);
        }

        // Transform data to match component interfaces
        const transformedZones: FloodRiskZone[] = zonesData.map((zone: any) => ({
          id: zone.id,
          name: zone.name,
          center: zone.center as [number, number],
          radius: zone.radius,
          riskLevel: zone.risk_level as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
          probability: zone.probability,
          lastUpdated: zone.last_updated
        }));

        const transformedSensors: SensorData[] = sensorsData.map((sensor: any) => ({
          id: sensor.id,
          name: sensor.name,
          location: sensor.location as [number, number],
          type: sensor.type as 'WATER_LEVEL' | 'RAINFALL' | 'SOIL_MOISTURE',
          value: sensor.value,
          unit: sensor.unit,
          status: sensor.status as 'ACTIVE' | 'WARNING' | 'CRITICAL',
          lastReading: sensor.last_reading
        }));

        setFloodRiskZones(transformedZones);
        setSensorData(transformedSensors);
      } catch (error) {
        console.error('Error fetching GIS data:', error);
        // Fallback to sample data if API fails
        const sampleFloodZones: FloodRiskZone[] = [
          {
            id: 'zone1',
            name: 'Yamuna River Basin',
            center: [28.6139, 77.2090],
            radius: 2000,
            riskLevel: 'HIGH',
            probability: 75.5,
            lastUpdated: '2025-09-14 01:00:00'
          }
        ];
        setFloodRiskZones(sampleFloodZones);
      }
    };

    fetchGISData();
  }, [user?.role]);

  const sendAlertToLocation = async (location: [number, number], message: string) => {
    if (!user || user.role !== 'admin') return;
    
    setIsSendingAlert(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.HEALTH.replace('/health', '')}/admin/send-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          message: message,
          admin_id: user.id,
          alert_type: 'LOCATION_SPECIFIC'
        }),
      });

      if (response.ok) {
        alert('✅ Alert sent successfully to the selected location!');
        setShowSendAlert(false);
        setAlertMessage('');
      } else {
        throw new Error('Failed to send alert');
      }
    } catch (error) {
      console.error('Error sending alert:', error);
      alert('❌ Failed to send alert. Please try again.');
    } finally {
      setIsSendingAlert(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return '#10B981';
      case 'MODERATE': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      case 'CRITICAL': return '#7C2D12';
      default: return '#6B7280';
    }
  };

  // const getSensorColor = (type: string) => {
  //   switch (type) {
  //     case 'WATER_LEVEL': return '#3B82F6';
  //     case 'RAINFALL': return '#8B5CF6';
  //     case 'SOIL_MOISTURE': return '#06B6D4';
  //     default: return '#6B7280';
  //   }
  // };

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'WATER_LEVEL': return '💧';
      case 'RAINFALL': return '🌧️';
      case 'SOIL_MOISTURE': return '🌱';
      default: return '📡';
    }
  };

  const getPredictionRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return '#10B981';
      case 'MODERATE': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      case 'CRITICAL': return '#DC2626';
      default: return '#DC2626';
    }
  };

  const getPredictionRadius = (probability: number) => {
    // Calculate radius based on probability (in meters)
    // Higher probability = larger affected area
    const baseRadius = 500; // 500m base radius
    const maxRadius = 3000; // 3km max radius
    const probabilityFactor = probability * 100; // Convert to percentage

    // Scale radius based on probability: 0-30% = 500-1000m, 30-60% = 1000-2000m, 60%+ = 2000-3000m
    if (probabilityFactor <= 30) {
      return baseRadius + (probabilityFactor / 30) * 500;
    } else if (probabilityFactor <= 60) {
      return 1000 + ((probabilityFactor - 30) / 30) * 1000;
    } else {
      return 2000 + ((probabilityFactor - 60) / 40) * 1000;
    }
  };


  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Prediction Notification Banner */}
      {predictionLocation && prediction && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #dc2626, #ef4444)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '16px',
          fontWeight: '600',
          animation: 'slideDown 0.5s ease-out',
          border: '2px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '24px' }}>🎯</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              AI Prediction Complete!
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {prediction.risk_level} Risk ({prediction.probability ? (prediction.probability * 100).toFixed(1) : 'N/A'}%) - Location marked on map
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations for Prediction Markers */}
      <style>{`
        @keyframes slideDown {
          0% {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          100% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        
        .prediction-pulse {
          position: absolute;
          top: -10px;
          left: -10px;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          background: ${prediction ? getPredictionRiskColor(prediction.risk_level) : '#3b82f6'};
          opacity: 0.3;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.2;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes markerBounce {
          0%, 20%, 50%, 80%, 100% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.1);
          }
          60% {
            transform: scale(1.05);
          }
        }
        
        @keyframes fadeInOut {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
        
        .prediction-circle-animation {
          animation: dashMove 3s linear infinite;
        }
        
        @keyframes dashMove {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 25;
          }
        }
      `}</style>
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
          ← Back to Prediction
        </button>
      )}

      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController center={mapCenter} onLocationSelect={onLocationSelect} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* HISTORICAL FLOOD ZONES - Based on past data and continuous monitoring */}
        {floodRiskZones.map((zone) => (
          <Circle
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            pathOptions={{
              color: getRiskColor(zone.riskLevel),
              fillColor: getRiskColor(zone.riskLevel),
              fillOpacity: 0.15, // Lower opacity for historical data
              weight: 2,
              dashArray: '5, 5' // Dashed line for historical zones
            }}
            eventHandlers={{
              click: () => setSelectedZone(zone)
            }}
          >
            <Popup>
              <div style={{ minWidth: '220px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: getRiskColor(zone.riskLevel) }}>
                  📊 {zone.name}
                </h3>
                <div style={{
                  background: '#fef3c7',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #f59e0b',
                  marginBottom: '10px'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#92400e', fontWeight: '500' }}>
                    📈 Historical Flood-Prone Area
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#78350f' }}>
                    Based on continuous monitoring & past data
                  </p>
                </div>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>Current Risk Level:</strong>
                  <span style={{ color: getRiskColor(zone.riskLevel), fontWeight: 'bold', marginLeft: '5px' }}>
                    {zone.riskLevel}
                  </span>
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>Probability:</strong> {zone.probability}%
                </p>
                <p style={{ margin: '5px 0', fontSize: '12px', color: '#6b7280' }}>
                  <strong>Last Updated:</strong> {zone.lastUpdated}
                </p>
                <button
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: getRiskColor(zone.riskLevel),
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                  onClick={async () => {
                    // Trigger fresh AI prediction for this historical zone
                    try {
                      const response = await fetch(`${API_ENDPOINTS.HEALTH.replace('/health', '')}/gis/predict-location?latitude=${zone.center[0]}&longitude=${zone.center[1]}`, {
                        method: 'POST'
                      });
                      const prediction = await response.json();
                      console.log('Fresh AI prediction for zone:', prediction);
                      alert(`🤖 Fresh AI Analysis for ${zone.name}:
                      
Historical Risk: ${zone.probability}% (${zone.riskLevel})
Current AI Prediction: ${prediction.probability}% (${prediction.risk_level})

${prediction.probability > zone.probability ? '⚠️ Risk has INCREASED' :
                          prediction.probability < zone.probability ? '✅ Risk has DECREASED' :
                            '➡️ Risk remains SIMILAR'}`);
                    } catch (error) {
                      console.error('Error getting fresh prediction:', error);
                      alert('Unable to get fresh AI prediction. Please try again.');
                    }
                  }}
                >
                  🤖 Get Fresh AI Analysis
                </button>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* IoT Sensors */}
        {sensorData.map((sensor) => (
          <Marker key={sensor.id} position={sensor.location}>
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>{getSensorIcon(sensor.type)}</span>
                  {sensor.name}
                </h3>
                <p style={{ margin: '5px 0' }}><strong>Type:</strong> {sensor.type.replace('_', ' ')}</p>
                <p style={{ margin: '5px 0' }}><strong>Value:</strong> {sensor.value} {sensor.unit}</p>
                <p style={{ margin: '5px 0' }}><strong>Status:</strong>
                  <span style={{
                    color: sensor.status === 'ACTIVE' ? '#10B981' :
                      sensor.status === 'WARNING' ? '#F59E0B' : '#EF4444',
                    marginLeft: '5px'
                  }}>
                    {sensor.status}
                  </span>
                </p>
                <p style={{ margin: '5px 0' }}><strong>Last Reading:</strong> {sensor.lastReading}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Flood-Prone Places */}
        {floodPronePlaces.map((place, index) => (
          <Marker 
            key={`flood-prone-${index}`} 
            position={place.location}
            icon={L.divIcon({
              html: `
                <div style="
                  background: #ef4444;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 3px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">⚠️</div>
              `,
              className: 'flood-prone-marker',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>
                  ⚠️ {place.name}
                </h3>
                <p style={{ margin: '5px 0' }}><strong>State:</strong> {place.state}</p>
                <p style={{ margin: '5px 0' }}><strong>Type:</strong> Flood-Prone Area</p>
                <p style={{ margin: '5px 0' }}><strong>Coordinates:</strong> {place.location[0].toFixed(4)}, {place.location[1].toFixed(4)}</p>
                <div style={{
                  background: '#fef2f2',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  marginTop: '10px'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#991b1b', fontWeight: '500' }}>
                    ⚠️ High flood risk area - Monitor closely during monsoon
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Shelter Locations */}
        {shelterLocations.map((shelter, index) => (
          <Marker 
            key={`shelter-${index}`} 
            position={shelter.location}
            icon={L.divIcon({
              html: `
                <div style="
                  background: #10b981;
                  width: 25px;
                  height: 25px;
                  border-radius: 50%;
                  border: 3px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">🏥</div>
              `,
              className: 'shelter-marker',
              iconSize: [25, 25],
              iconAnchor: [12.5, 12.5]
            })}
          >
            <Popup>
              <div style={{ minWidth: '220px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#10b981' }}>
                  🏥 {shelter.name}
                </h3>
                <p style={{ margin: '5px 0' }}><strong>State:</strong> {shelter.state}</p>
                <p style={{ margin: '5px 0' }}><strong>Capacity:</strong> {shelter.capacity} people</p>
                <p style={{ margin: '5px 0' }}><strong>Type:</strong> {shelter.type === 'shelter' ? 'Emergency Shelter' : 'Relief Camp'}</p>
                <p style={{ margin: '5px 0' }}><strong>Coordinates:</strong> {shelter.location[0].toFixed(4)}, {shelter.location[1].toFixed(4)}</p>
                <div style={{
                  background: '#f0fdf4',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                  marginTop: '10px'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#166534', fontWeight: '500' }}>
                    ✅ Safe evacuation center - Available for emergency use
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* SOS Requests (Admin Only) */}
        {user?.role === 'admin' && sosRequests.map((sos) => (
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
                  border: 4px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
                  animation: pulse 2s infinite;
                ">🆘</div>
              `,
              className: 'sos-marker',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
          >
            <Popup>
              <div style={{ minWidth: '250px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>
                  🆘 Emergency SOS Request
                </h3>
                <p style={{ margin: '5px 0' }}><strong>Request ID:</strong> {sos.id}</p>
                <p style={{ margin: '5px 0' }}><strong>Emergency Type:</strong> {sos.emergencyType}</p>
                <p style={{ margin: '5px 0' }}><strong>Status:</strong> 
                  <span style={{ 
                    color: sos.status === 'PENDING' ? '#f59e0b' : 
                           sos.status === 'RESOLVED' ? '#10b981' : '#3b82f6',
                    marginLeft: '5px'
                  }}>
                    {sos.status}
                  </span>
                </p>
                <p style={{ margin: '5px 0' }}><strong>Time:</strong> {new Date(sos.timestamp).toLocaleString()}</p>
                {sos.message && (
                  <p style={{ margin: '5px 0' }}><strong>Message:</strong> {sos.message}</p>
                )}
                <div style={{
                  background: '#fef2f2',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  marginTop: '10px'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#991b1b', fontWeight: '500' }}>
                    🚨 Active emergency - Requires immediate attention
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* YOUR SPECIFIC PREDICTION - Shows when you click and predict */}
        {predictionLocation && prediction && (
          <>
            {/* Your Prediction Risk Circle - Animated and Distinct */}
            <Circle
              center={predictionLocation}
              radius={getPredictionRadius(prediction.probability)}
              pathOptions={{
                color: getPredictionRiskColor(prediction.risk_level),
                fillColor: getPredictionRiskColor(prediction.risk_level),
                fillOpacity: 0.3,
                weight: 4,
                dashArray: '15, 10', // Different dash pattern for your prediction
                className: 'prediction-circle-animation' // Add animation class
              }}
            >
              <Popup>
                <div style={{ minWidth: '220px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: getPredictionRiskColor(prediction.risk_level) }}>
                    🎯 YOUR PREDICTION ZONE
                  </h4>
                  <div style={{
                    background: '#f0f9ff',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '2px solid #3b82f6',
                    marginBottom: '10px'
                  }}>
                    <p style={{ margin: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>
                      🤖 AI Prediction: {(prediction.probability * 100).toFixed(1)}%
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      Risk Level: {prediction.risk_level}
                    </p>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}>
                    <strong>Impact Radius:</strong> {(getPredictionRadius(prediction.probability) / 1000).toFixed(1)} km
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}>
                    <strong>Affected Area:</strong> ~{Math.round(Math.PI * Math.pow(getPredictionRadius(prediction.probability) / 1000, 2))} km²
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '11px', color: '#6b7280' }}>
                    Based on current environmental conditions
                  </p>
                </div>
              </Popup>
            </Circle>

            {/* Your Custom Prediction Marker - Enhanced Pulsing Animation */}
            <Marker
              position={predictionLocation}
              icon={L.divIcon({
                html: `
                  <div class="prediction-marker-container" style="position: relative;">
                    <div class="prediction-pulse"></div>
                    <div class="prediction-pulse" style="animation-delay: 0.5s;"></div>
                    <div class="prediction-pulse" style="animation-delay: 1s;"></div>
                    <div style="
                      background: ${getPredictionRiskColor(prediction.risk_level)};
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      border: 4px solid white;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 20px;
                      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
                      position: relative;
                      z-index: 10;
                      animation: markerBounce 2s infinite;
                    ">🎯</div>
                    <div style="
                      position: absolute;
                      top: -8px;
                      right: -8px;
                      background: #3b82f6;
                      color: white;
                      border-radius: 50%;
                      width: 20px;
                      height: 20px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 12px;
                      font-weight: bold;
                      border: 3px solid white;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">AI</div>
                    <div style="
                      position: absolute;
                      bottom: -25px;
                      left: 50%;
                      transform: translateX(-50%);
                      background: rgba(0,0,0,0.8);
                      color: white;
                      padding: 4px 8px;
                      border-radius: 4px;
                      font-size: 10px;
                      font-weight: bold;
                      white-space: nowrap;
                      animation: fadeInOut 3s infinite;
                    ">${prediction.risk_level} RISK</div>
                  </div>
                `,
                className: 'custom-prediction-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              })}
            >
              <Popup>
                <div style={{ minWidth: '280px' }}>
                  <h3 style={{
                    margin: '0 0 15px 0',
                    display: 'flex',
                    alignItems: 'center',
                    color: prediction ? getPredictionRiskColor(prediction.risk_level) : '#DC2626'
                  }}>
                    <span style={{ marginRight: '8px', fontSize: '20px' }}>🎯</span>
                    {prediction ? 'Your Flood Risk Prediction' : 'Selected Location'}
                  </h3>

                  <div style={{
                    background: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '15px'
                  }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                      <strong>📍 Coordinates:</strong> {predictionLocation[0].toFixed(4)}, {predictionLocation[1].toFixed(4)}
                    </p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                      Click and drag to adjust location
                    </p>
                  </div>

                  {prediction && (
                    <>
                      <div style={{
                        background: prediction.risk_level === 'HIGH' ? '#fef2f2' :
                          prediction.risk_level === 'MODERATE' ? '#fffbeb' : '#f0fdf4',
                        border: `2px solid ${getPredictionRiskColor(prediction.risk_level)}`,
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '15px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '24px', marginRight: '8px' }}>
                            {prediction.risk_level === 'HIGH' ? '🚨' :
                              prediction.risk_level === 'MODERATE' ? '⚠️' : '✅'}
                          </span>
                          <div>
                            <div style={{
                              fontSize: '18px',
                              fontWeight: 'bold',
                              color: getPredictionRiskColor(prediction.risk_level)
                            }}>
                              {(prediction.probability * 100).toFixed(1)}% Flood Risk
                            </div>
                            <div style={{
                              fontSize: '14px',
                              color: getPredictionRiskColor(prediction.risk_level),
                              opacity: 0.8
                            }}>
                              {prediction.risk_level} Risk Level
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>
                          {prediction.alert}
                        </div>

                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Uncertainty: ±{(prediction.uncertainty * 100).toFixed(1)}%
                        </div>
                      </div>

                      <div style={{
                        background: '#f8f9fa',
                        borderRadius: '6px',
                        padding: '10px',
                        marginBottom: '10px'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                          📊 Risk Analysis Details:
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
                          • Risk Zone Radius: {(getPredictionRadius(prediction.probability) / 1000).toFixed(1)} km<br />
                          • Potential Impact Area: ~{Math.round(Math.PI * Math.pow(getPredictionRadius(prediction.probability) / 1000, 2))} km²<br />
                          • Confidence Level: {(100 - prediction.uncertainty * 100).toFixed(1)}%
                        </div>
                      </div>

                      {prediction.alert_sent && (
                        <div style={{
                          background: '#10B981',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '10px'
                        }}>
                          <span>✅</span>
                          <span>Emergency alerts sent to {prediction.alert_id ? 'subscribers' : 'system'}</span>
                        </div>
                      )}

                      {/* Send Alert Button for Admin */}
                      {user?.role === 'admin' && (
                        <div style={{ marginTop: '15px' }}>
                          <button
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                            onClick={() => setShowSendAlert(true)}
                          >
                            🚨 Send Alert to This Location
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {!prediction && (
                    <div style={{
                      background: '#f3f4f6',
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <p style={{ margin: '0 0 8px 0', color: '#6B7280', fontSize: '14px' }}>
                        📊 No prediction data available
                      </p>
                      <p style={{ margin: '0', color: '#9CA3AF', fontSize: '12px' }}>
                        Return to prediction page and analyze this location
                      </p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* SELECTED LOCATION MARKER - Shows when you click but haven't predicted yet */}
        {predictionLocation && !prediction && (
          <Marker
            position={predictionLocation}
            icon={L.divIcon({
              html: `
                <div style="
                  background: #6b7280;
                  width: 25px;
                  height: 25px;
                  border-radius: 50%;
                  border: 3px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  animation: bounce 2s infinite;
                ">📍</div>
              `,
              className: 'selected-location-marker',
              iconSize: [25, 25],
              iconAnchor: [12.5, 12.5]
            })}
          >
            <Popup>
              <div style={{ minWidth: '200px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#6b7280' }}>
                  📍 Selected Location
                </h4>
                <div style={{
                  background: '#f9fafb',
                  padding: '10px',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                    <strong>Coordinates:</strong> {predictionLocation[0].toFixed(4)}, {predictionLocation[1].toFixed(4)}
                  </p>
                </div>
                <div style={{
                  background: '#eff6ff',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #dbeafe'
                }}>
                  <p style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '14px', fontWeight: '500' }}>
                    🤖 Ready for AI Analysis
                  </p>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '12px' }}>
                    Click "Back to Prediction" to analyze flood risk for this location
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Legend */}
      <FloodRiskLegend user={user} />

      {/* Zone Details Panel */}
      {selectedZone && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          minWidth: '300px',
          maxWidth: '400px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: getRiskColor(selectedZone.riskLevel) }}>
              {selectedZone.name}
            </h3>
            <button
              onClick={() => setSelectedZone(null)}
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Risk Level:</span>
              <span style={{
                color: getRiskColor(selectedZone.riskLevel),
                fontWeight: 'bold'
              }}>
                {selectedZone.riskLevel}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Probability:</span>
              <span style={{ fontWeight: 'bold' }}>{selectedZone.probability}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Last Updated:</span>
              <span>{selectedZone.lastUpdated}</span>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Recommended Actions:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {selectedZone.riskLevel === 'CRITICAL' && (
                <>
                  <li>Immediate evacuation required</li>
                  <li>Emergency services notified</li>
                  <li>Flood barriers activated</li>
                </>
              )}
              {selectedZone.riskLevel === 'HIGH' && (
                <>
                  <li>Prepare for evacuation</li>
                  <li>Monitor water levels closely</li>
                  <li>Alert nearby residents</li>
                </>
              )}
              {selectedZone.riskLevel === 'MODERATE' && (
                <>
                  <li>Stay alert for updates</li>
                  <li>Prepare emergency supplies</li>
                  <li>Avoid flood-prone areas</li>
                </>
              )}
              {selectedZone.riskLevel === 'LOW' && (
                <>
                  <li>Continue monitoring</li>
                  <li>Normal operations</li>
                </>
              )}
            </ul>
          </div>

          <button
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: getRiskColor(selectedZone.riskLevel),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
            onClick={() => {
              // Send alert for this zone
              console.log('Send alert for zone:', selectedZone.name);
            }}
          >
            Send Alert to Zone
          </button>
        </div>
      )}

      {/* Send Alert Modal */}
      {showSendAlert && predictionLocation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>
                🚨 Send Emergency Alert
              </h2>
              <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                Send an emergency alert to the selected location: {predictionLocation[0].toFixed(4)}, {predictionLocation[1].toFixed(4)}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                Alert Message
              </label>
              <textarea
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="Enter emergency alert message for this location..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
                maxLength={500}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {alertMessage.length}/500 characters
              </div>
            </div>

            <div style={{
              background: '#fef3c7',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #f59e0b',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0', fontSize: '13px', color: '#92400e' }}>
                ⚠️ <strong>Warning:</strong> This alert will be sent to all users in the vicinity of this location. 
                Only use for genuine emergencies.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSendAlert(false);
                  setAlertMessage('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => sendAlertToLocation(predictionLocation, alertMessage)}
                disabled={!alertMessage.trim() || isSendingAlert}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !alertMessage.trim() || isSendingAlert ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !alertMessage.trim() || isSendingAlert ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isSendingAlert ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Sending...
                  </>
                ) : (
                  <>
                    🚨 Send Alert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GISMapping;
