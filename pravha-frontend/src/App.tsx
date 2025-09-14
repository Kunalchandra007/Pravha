import React, { useState } from 'react';
import './App.css';
import AlertSystem from './AlertSystem';
import GISMapping from './GISMapping';

interface PredictionResponse {
  probability: number;
  uncertainty: number;
  alert: string;
  risk_level: string;
  alert_sent: boolean;
  alert_id?: number;
}

type ViewType = 'prediction' | 'alerts' | 'gis';

interface FeatureInput {
  name: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  category: string;
}

const features: FeatureInput[] = [
  // Environmental Factors
  { name: 'MonsoonIntensity', label: 'Monsoon Intensity', min: 0, max: 10, defaultValue: 5, category: 'Environmental' },
  { name: 'TopographyDrainage', label: 'Topography Drainage', min: 0, max: 10, defaultValue: 5, category: 'Environmental' },
  { name: 'RiverManagement', label: 'River Management', min: 1, max: 9, defaultValue: 5, category: 'Environmental' },
  { name: 'Deforestation', label: 'Deforestation', min: 1, max: 9, defaultValue: 5, category: 'Environmental' },
  { name: 'Urbanization', label: 'Urbanization', min: 0, max: 10, defaultValue: 5, category: 'Environmental' },
  { name: 'ClimateChange', label: 'Climate Change', min: 0, max: 10, defaultValue: 5, category: 'Environmental' },
  { name: 'DamsQuality', label: 'Dams Quality', min: 1, max: 9, defaultValue: 5, category: 'Environmental' },
  { name: 'Siltation', label: 'Siltation', min: 0, max: 10, defaultValue: 5, category: 'Environmental' },
  { name: 'AgriculturalPractices', label: 'Agricultural Practices', min: 0, max: 10, defaultValue: 5, category: 'Environmental' },
  { name: 'Encroachments', label: 'Encroachments', min: 1, max: 9, defaultValue: 5, category: 'Environmental' },
  
  // Infrastructure & Risk Factors
  { name: 'IneffectiveDisasterPreparedness', label: 'Disaster Preparedness', min: 1, max: 9, defaultValue: 5, category: 'Infrastructure' },
  { name: 'DrainageSystems', label: 'Drainage Systems', min: 1, max: 9, defaultValue: 5, category: 'Infrastructure' },
  { name: 'CoastalVulnerability', label: 'Coastal Vulnerability', min: 0, max: 10, defaultValue: 5, category: 'Infrastructure' },
  { name: 'Landslides', label: 'Landslides', min: 0, max: 10, defaultValue: 5, category: 'Infrastructure' },
  { name: 'Watersheds', label: 'Watersheds', min: 0, max: 10, defaultValue: 5, category: 'Infrastructure' },
  { name: 'DeterioratingInfrastructure', label: 'Infrastructure Deterioration', min: 0, max: 10, defaultValue: 5, category: 'Infrastructure' },
  { name: 'PopulationScore', label: 'Population Score', min: 0, max: 10, defaultValue: 5, category: 'Infrastructure' },
  { name: 'WetlandLoss', label: 'Wetland Loss', min: 1, max: 9, defaultValue: 5, category: 'Infrastructure' },
  { name: 'InadequatePlanning', label: 'Inadequate Planning', min: 0, max: 10, defaultValue: 5, category: 'Infrastructure' },
  { name: 'PoliticalFactors', label: 'Political Factors', min: 0, max: 10, defaultValue: 5, category: 'Infrastructure' },
];

function App() {
  const [featureValues, setFeatureValues] = useState<Record<string, number>>(
    features.reduce((acc, feature) => ({ ...acc, [feature.name]: feature.defaultValue }), {})
  );
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('prediction' as ViewType);
  const [location, setLocation] = useState<string>('Unknown');
  const [enableAlerts, setEnableAlerts] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [predictionLocation, setPredictionLocation] = useState<[number, number] | null>(null);

  const handleFeatureChange = (name: string, value: number) => {
    setFeatureValues(prev => ({ ...prev, [name]: value }));
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setPredictionLocation([latitude, longitude]);
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocation('Location access denied');
        }
      );
    } else {
      setLocation('Geolocation not supported');
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    
    // Store the current prediction location
    if (userLocation) {
      setPredictionLocation(userLocation);
      console.log('Using location for prediction:', userLocation, 'Location string:', location);
    }
    
    try {
        const requestBody = {
          features: features.map(f => featureValues[f.name]),
          location: location,
          enable_alerts: enableAlerts
        };
        
        console.log('Sending prediction request:', requestBody);
        
        const response = await fetch('http://localhost:8002/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PredictionResponse = await response.json();
      console.log('Prediction response:', data);
      setPrediction(data);
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return '#dc2626';
      case 'MODERATE': return '#d97706';
      case 'LOW': return '#059669';
      default: return '#6b7280';
    }
  };

  const getAlertIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return '🚨';
      case 'MODERATE': return '⚠️';
      case 'LOW': return '✅';
      default: return 'ℹ️';
    }
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureInput[]>);

  if ((currentView as ViewType) === 'alerts') {
    return <AlertSystem />;
  }

  if ((currentView as ViewType) === 'gis') {
    return (
      <GISMapping 
        onLocationSelect={(location) => {
          // Handle location selection for prediction
          console.log('Location selected in App:', location); // Debug log
          setUserLocation(location);
          setPredictionLocation(location);
          setLocation(`${location[0].toFixed(4)}, ${location[1].toFixed(4)}`);
          // Show confirmation message
          alert(`Location selected: ${location[0].toFixed(4)}, ${location[1].toFixed(4)}\nClick "Back to Prediction" to use this location for analysis.`);
        }}
        onBack={() => {
          console.log('Returning to prediction with location:', userLocation); // Debug log
          setCurrentView('prediction' as ViewType);
        }}
        predictionLocation={predictionLocation}
        prediction={prediction}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        background: 'white', 
        borderRadius: '16px', 
        padding: '24px', 
        marginBottom: '24px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🌊
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>Pravha</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>AI-Powered Flood Management System</p>
          </div>
        </div>
        
        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button
            onClick={() => setCurrentView('prediction' as ViewType)}
            style={{
              background: (currentView as ViewType) === 'prediction' ? '#3b82f6' : '#f3f4f6',
              color: (currentView as ViewType) === 'prediction' ? 'white' : '#6b7280',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔮 Flood Prediction
          </button>
          <button
            onClick={() => setCurrentView('alerts' as ViewType)}
            style={{
              background: (currentView as ViewType) === 'alerts' ? '#3b82f6' : '#f3f4f6',
              color: (currentView as ViewType) === 'alerts' ? 'white' : '#6b7280',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🚨 Alert Management
          </button>
          <button
            onClick={() => setCurrentView('gis' as ViewType)}
            style={{
              background: (currentView as ViewType) === 'gis' ? '#3b82f6' : '#f3f4f6',
              color: (currentView as ViewType) === 'gis' ? 'white' : '#6b7280',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🗺️ GIS Mapping
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Input Panel */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '24px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', 
            color: 'white', 
            padding: '16px 24px', 
            borderRadius: '12px', 
            marginBottom: '24px'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Flood Risk Parameters</h2>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>Adjust the parameters below to analyze flood risk</p>
          </div>
          
          {/* Location and Alert Settings */}
          <div style={{ 
            background: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  Location
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location name or use GPS/Map"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: userLocation ? '2px solid #10B981' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: userLocation ? '#f0fdf4' : 'white'
                    }}
                  />
                  <button
                    onClick={getCurrentLocation}
                    title="Get current GPS location"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📍 GPS
                  </button>
                  <button
                    onClick={() => setCurrentView('gis' as ViewType)}
                    title="Select location on map"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🗺️ Map
                  </button>
                </div>
                {userLocation && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#059669', fontWeight: '500' }}>
                    ✅ Location set: {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                    {predictionLocation && predictionLocation[0] === userLocation[0] && predictionLocation[1] === userLocation[1] && (
                      <span style={{ marginLeft: '8px', color: '#3b82f6' }}>📍 Map Selected</span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="enableAlerts"
                  checked={enableAlerts}
                  onChange={(e) => setEnableAlerts(e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <label htmlFor="enableAlerts" style={{ fontSize: '14px', fontWeight: '500' }}>
                  Enable Automated Alerts
                </label>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
              <div key={category}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }}></span>
                  {category} Factors
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  {categoryFeatures.map((feature) => (
                    <div key={feature.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        {feature.label}
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <input
                          type="range"
                          min={feature.min}
                          max={feature.max}
                          value={featureValues[feature.name]}
                          onChange={(e) => handleFeatureChange(feature.name, parseInt(e.target.value))}
                          style={{
                            flex: 1,
                            height: '8px',
                            background: '#e5e7eb',
                            borderRadius: '4px',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        />
                        <div style={{ 
                          width: '64px', 
                          textAlign: 'center',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {featureValues[feature.name]}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
                        <span>{feature.min}</span>
                        <span>{feature.max}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={handlePredict}
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  color: 'white',
                  fontWeight: '600',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s ease',
                  transform: loading ? 'scale(1)' : 'scale(1)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid white', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Analyzing Risk...</span>
                  </div>
                ) : (
                  'Analyze Flood Risk'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '24px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          height: 'fit-content',
          position: 'sticky',
          top: '20px'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1f2937, #374151)', 
            color: 'white', 
            padding: '16px 24px', 
            borderRadius: '12px', 
            marginBottom: '24px'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Risk Assessment</h2>
            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '14px' }}>AI-powered flood prediction results</p>
          </div>
          
          <div>
            {error && (
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '20px' }}>❌</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: '600', color: '#991b1b' }}>Error</h4>
                  <p style={{ margin: '4px 0 0 0', color: '#dc2626', fontSize: '14px' }}>{error}</p>
                </div>
              </div>
            )}

            {prediction ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Alert Card */}
                    <div style={{ 
                      padding: '24px', 
                      borderRadius: '12px', 
                      border: '2px solid',
                      borderColor: getRiskColor(prediction.risk_level),
                      background: prediction.risk_level === 'HIGH' ? '#fef2f2' : 
                                 prediction.risk_level === 'MODERATE' ? '#fffbeb' : '#f0fdf4'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '32px' }}>{getAlertIcon(prediction.risk_level)}</span>
                        <div>
                          <h3 style={{ 
                            margin: 0, 
                            fontSize: '24px', 
                            fontWeight: 'bold',
                            color: getRiskColor(prediction.risk_level)
                          }}>
                            {prediction.alert}
                          </h3>
                          <p style={{ 
                            margin: '4px 0 0 0', 
                            fontSize: '14px',
                            color: getRiskColor(prediction.risk_level),
                            opacity: 0.8
                          }}>
                            Risk Level: {prediction.risk_level}
                          </p>
                        </div>
                      </div>
                      
                      {/* Alert Status */}
                      {prediction.alert_sent && (
                        <div style={{ 
                          background: '#059669', 
                          color: 'white', 
                          padding: '8px 12px', 
                          borderRadius: '6px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '12px'
                        }}>
                          <span>✅</span>
                          <span>Alert sent successfully (ID: {prediction.alert_id})</span>
                        </div>
                      )}
                      
                      {!prediction.alert_sent && enableAlerts && prediction.risk_level !== 'LOW' && (
                        <div style={{ 
                          background: '#fbbf24', 
                          color: '#92400e', 
                          padding: '8px 12px', 
                          borderRadius: '6px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '12px'
                        }}>
                          <span>⚠️</span>
                          <span>Alert system not available</span>
                        </div>
                      )}
                    </div>

                {/* Probability Card */}
                <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '24px' }}>
                  <h4 style={{ fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>Prediction Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Flood Probability</span>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                          {(prediction.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '4px', height: '12px' }}>
                        <div
                          style={{
                            height: '12px',
                            borderRadius: '4px',
                            background: getRiskColor(prediction.risk_level),
                            width: `${prediction.probability * 100}%`,
                            transition: 'width 0.5s ease'
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid #e5e7eb' 
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                          {(prediction.uncertainty * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Uncertainty</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                          {prediction.risk_level}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Risk Level</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '24px' }}>
                  <h4 style={{ fontWeight: '600', color: '#1e40af', marginBottom: '12px' }}>Recommendations</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#1e40af' }}>
                    {prediction.risk_level === 'HIGH' && (
                      <>
                        <p style={{ margin: 0 }}>• Evacuate immediately to higher ground</p>
                        <p style={{ margin: 0 }}>• Follow emergency evacuation routes</p>
                        <p style={{ margin: 0 }}>• Take essential documents and supplies</p>
                        <p style={{ margin: 0 }}>• Avoid driving through flooded areas</p>
                      </>
                    )}
                    {prediction.risk_level === 'MODERATE' && (
                      <>
                        <p style={{ margin: 0 }}>• Prepare emergency supplies</p>
                        <p style={{ margin: 0 }}>• Monitor weather updates closely</p>
                        <p style={{ margin: 0 }}>• Secure outdoor items</p>
                        <p style={{ margin: 0 }}>• Have evacuation plan ready</p>
                      </>
                    )}
                    {prediction.risk_level === 'LOW' && (
                      <>
                        <p style={{ margin: 0 }}>• Continue normal activities</p>
                        <p style={{ margin: 0 }}>• Stay informed about weather</p>
                        <p style={{ margin: 0 }}>• Keep emergency kit updated</p>
                        <p style={{ margin: 0 }}>• Review evacuation plans</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: '#f3f4f6', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px',
                  fontSize: '32px'
                }}>
                  🌊
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>Ready to Analyze</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                  Adjust the parameters and click "Analyze Flood Risk" to get AI-powered predictions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        background: '#1f2937', 
        color: 'white', 
        padding: '32px', 
        marginTop: '64px',
        borderRadius: '16px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#9ca3af' }}>
          © 2024 Pravha - AI-Powered Flood Management System
        </p>
        <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
          Built with React, TypeScript, and Machine Learning
        </p>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;