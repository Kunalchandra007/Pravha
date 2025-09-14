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
}

const FloodRiskLegend: React.FC = () => (
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
  </div>
);

const MapController: React.FC<{ center: [number, number]; onLocationSelect?: (location: [number, number]) => void }> = ({ center, onLocationSelect }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 13);

    // Add click event listener
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

    map.on('click', handleClick);

    // Cleanup
    return () => {
      map.off('click', handleClick);
    };
  }, [map, center, onLocationSelect]);

  return null;
};

const GISMapping: React.FC<GISMappingProps> = ({ onLocationSelect, onBack, predictionLocation, prediction }) => {
  const [floodRiskZones, setFloodRiskZones] = useState<FloodRiskZone[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [selectedZone, setSelectedZone] = useState<FloodRiskZone | null>(null);
  const [mapCenter] = useState<[number, number]>([28.6139, 77.2090]); // New Delhi coordinates

  // Fetch data from backend APIs
  useEffect(() => {
    const fetchGISData = async () => {
      try {
        // Fetch flood risk zones
        const zonesResponse = await fetch('http://localhost:8002/gis/flood-zones');
        const zonesData = await zonesResponse.json();

        // Fetch sensor data
        const sensorsResponse = await fetch('http://localhost:8002/gis/sensors');
        const sensorsData = await sensorsResponse.json();

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
  }, []);

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
      {/* CSS Animations for Prediction Markers */}
      <style>{`
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
                      const response = await fetch(`http://localhost:8002/gis/predict-location?latitude=${zone.center[0]}&longitude=${zone.center[1]}`, {
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

            {/* Your Custom Prediction Marker - Pulsing Animation */}
            <Marker
              position={predictionLocation}
              icon={L.divIcon({
                html: `
                  <div class="prediction-marker-container">
                    <div class="prediction-pulse"></div>
                    <div style="
                      background: ${getPredictionRiskColor(prediction.risk_level)};
                      width: 35px;
                      height: 35px;
                      border-radius: 50%;
                      border: 4px solid white;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 18px;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                      position: relative;
                      z-index: 10;
                    ">🎯</div>
                    <div style="
                      position: absolute;
                      top: -5px;
                      right: -5px;
                      background: #3b82f6;
                      color: white;
                      border-radius: 50%;
                      width: 16px;
                      height: 16px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 10px;
                      font-weight: bold;
                      border: 2px solid white;
                    ">AI</div>
                  </div>
                `,
                className: 'custom-prediction-marker',
                iconSize: [35, 35],
                iconAnchor: [17.5, 17.5]
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
      <FloodRiskLegend />

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
    </div>
  );
};

export default GISMapping;
