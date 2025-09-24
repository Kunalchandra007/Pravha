import React, { useState } from 'react';
import './App.css';
import LandingPage from './LandingPage';
import Login from './Auth/Login';
import Signup from './Auth/Signup';
import AlertSystem from './AlertSystem';
import GISMapping from './GISMapping';
import Precautions from './Precautions';
// import Dashboard from './components/Dashboard'; // Unused
import SOSSystem from './components/SOSSystem';
import ShelterFinder from './components/ShelterFinder';
import AdminPanel from './components/AdminPanel';
import CitizenPanel from './components/CitizenPanel';
import LanguageSelector from './components/LanguageSelector';
import { TranslationProvider } from './contexts/TranslationContext';
import { getSurvamApiKey } from './config/api';

interface PredictionResponse {
  probability: number;
  uncertainty: number;
  alert: string;
  risk_level: string;
  alert_sent: boolean;
  alert_id?: number;
}

type ViewType = 'landing' | 'login' | 'signup' | 'prediction' | 'alerts' | 'gis' | 'dashboard' | 'precautions' | 'sos' | 'shelters' | 'admin';

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

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  phone?: string;
  location?: string;
  registeredAt: string;
  isActive: boolean;
}

function App() {
  const [featureValues, setFeatureValues] = useState<Record<string, number>>(
    features.reduce((acc, feature) => ({ ...acc, [feature.name]: feature.defaultValue }), {})
  );
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [location, setLocation] = useState<string>('Unknown');
  const [enableAlerts, setEnableAlerts] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [predictionLocation, setPredictionLocation] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const handleFeatureChange = (name: string, value: number) => {
    setFeatureValues(prev => ({ ...prev, [name]: value }));
  };

  // Authentication handlers
  const handleLogin = (userData: User) => {
    setUser(userData);
    // Route admin users directly to admin panel, regular users to citizen panel
    setCurrentView(userData.role === 'admin' ? 'admin' as ViewType : 'dashboard' as ViewType);
  };

  const handleSignup = (userData: User) => {
    setUser(userData);
    // Route admin users directly to admin panel, regular users to citizen panel
    setCurrentView(userData.role === 'admin' ? 'admin' as ViewType : 'dashboard' as ViewType);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setCurrentView('landing' as ViewType);
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
    let predictionCoords: [number, number] | null = null;
    
    if (userLocation) {
      predictionCoords = userLocation;
      console.log('Using user location for prediction:', userLocation);
    } else if (location && location.includes(',')) {
      // Parse location string to coordinates
      const coords = location.split(',').map(c => parseFloat(c.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        predictionCoords = [coords[0], coords[1]];
        console.log('Using parsed location string for prediction:', predictionCoords);
      }
    }
    
    if (predictionCoords) {
      setPredictionLocation(predictionCoords);
      console.log('Prediction location set:', predictionCoords);
    }
    
    try {
        const requestBody = {
          features: features.map(f => featureValues[f.name]),
          location: location,
          enable_alerts: enableAlerts
        };
        
        console.log('Sending prediction request:', requestBody);
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('Authentication token not found. Please log in again.');
        }

        const response = await fetch('http://localhost:8002/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data: PredictionResponse = await response.json();
      console.log('Prediction response:', data);
      setPrediction(data);
      
      // Automatically open GIS map to show prediction location
      if (predictionCoords) {
        console.log('🎯 Opening GIS map to show prediction location:', predictionCoords);
        setCurrentView('gis' as ViewType);
      }
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

  // Render different views based on current state
  if ((currentView as ViewType) === 'landing') {
    return (
      <LandingPage 
        onLogin={() => setCurrentView('login' as ViewType)}
        onSignup={() => setCurrentView('signup' as ViewType)}
      />
    );
  }

  if ((currentView as ViewType) === 'login') {
    return (
      <Login 
        onLogin={handleLogin}
        onSwitchToSignup={() => setCurrentView('signup' as ViewType)}
        onBackToLanding={() => setCurrentView('landing' as ViewType)}
      />
    );
  }

  if ((currentView as ViewType) === 'signup') {
    return (
      <Signup 
        onSignup={handleSignup}
        onSwitchToLogin={() => setCurrentView('login' as ViewType)}
        onBackToLanding={() => setCurrentView('landing' as ViewType)}
      />
    );
  }

  if ((currentView as ViewType) === 'precautions') {
    return (
      <Precautions onBack={() => setCurrentView('dashboard' as ViewType)} />
    );
  }

  if ((currentView as ViewType) === 'sos') {
    return (
      <SOSSystem 
        user={user!}
        onBack={() => setCurrentView('dashboard' as ViewType)} 
      />
    );
  }

  if ((currentView as ViewType) === 'shelters') {
    return (
      <ShelterFinder 
        user={user!}
        onBack={() => setCurrentView('dashboard' as ViewType)} 
      />
    );
  }

  if ((currentView as ViewType) === 'admin') {
    return (
      <AdminPanel 
        user={user}
        onBack={() => setCurrentView('dashboard' as ViewType)}
      />
    );
  }

  if ((currentView as ViewType) === 'alerts') {
    return (
      <AlertSystem 
        onBack={() => setCurrentView('dashboard' as ViewType)} 
      />
    );
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
          alert(`Location selected: ${location[0].toFixed(4)}, ${location[1].toFixed(4)}\nClick "Back to Dashboard" to use this location.`);
        }}
        onBack={() => {
          console.log('Returning to dashboard with location:', userLocation); // Debug log
          setCurrentView('dashboard' as ViewType);
        }}
        predictionLocation={predictionLocation}
        prediction={prediction}
        user={user}
      />
    );
  }

  if ((currentView as ViewType) === 'dashboard') {
    // Use CitizenPanel for regular users, keep Dashboard for backward compatibility
    if (user?.role === 'admin') {
      return (
        <AdminPanel 
          user={user}
          onBack={() => setCurrentView('landing' as ViewType)}
        />
      );
    } else {
      return (
        <CitizenPanel 
          user={user!}
          onBack={() => setCurrentView('landing' as ViewType)}
        />
      );
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h1 style={{ color: 'white', fontSize: '48px', marginBottom: '20px' }}>Welcome to Pravha</h1>
        <p style={{ color: 'white', fontSize: '20px', marginBottom: '40px' }}>AI-Powered Flood Management System</p>
        <button
          onClick={() => setCurrentView('dashboard' as ViewType)}
          style={{
            background: 'white',
            color: '#3b82f6',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// Main App wrapper with Translation Provider
const AppWithTranslation: React.FC = () => {
  return (
    <TranslationProvider apiKey={getSurvamApiKey()}>
      <LanguageSelector />
      <App />
    </TranslationProvider>
  );
};

export default AppWithTranslation;