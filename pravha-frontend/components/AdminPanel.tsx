import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalAlerts: number;
  activeAlerts: number;
  totalSOSRequests: number;
  pendingSOSRequests: number;
  totalShelters: number;
  availableShelters: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

interface PredictionResponse {
  probability: number;
  uncertainty: number;
  alert: string;
  risk_level: string;
  alert_sent: boolean;
  alert_id?: number;
}

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

const AdminPanel = ({ user, onBack }: {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  } | null;
  onBack?: () => void;
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // GPS and Location states
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Prediction states
  const [featureValues, setFeatureValues] = useState<Record<string, number>>(
    features.reduce((acc, feature) => ({ ...acc, [feature.name]: feature.defaultValue }), {})
  );
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Alerts and SOS states
  const [currentAlerts, setCurrentAlerts] = useState<any[]>([]);
  const [currentSOS, setCurrentSOS] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // GIS states
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center

  // Shelter form states
  const [shelterForm, setShelterForm] = useState({
    name: '',
    address: '',
    capacity: '',
    contact: '',
    phone: '',
    facilities: ['Food', 'Water']
  });

  // Shelter list state
  const [shelters, setShelters] = useState<any[]>([]);
  const [sheltersLoading, setSheltersLoading] = useState(false);

  // Hardcoded shelters for demo
  const hardcodedShelters = [
    {
      id: '1',
      name: 'Central Community Center',
      address: '123 Main Street, New Delhi',
      location: [28.6139, 77.2090],
      capacity: 200,
      current_occupancy: 45,
      contact: 'Rajesh Kumar',
      phone: '+91-9876543210',
      facilities: ['Food', 'Water', 'Medical', 'Family-Friendly'],
      status: 'available'
    },
    {
      id: '2',
      name: 'Government School Shelter',
      address: '456 School Road, New Delhi',
      location: [28.6289, 77.2065],
      capacity: 150,
      current_occupancy: 30,
      contact: 'Priya Sharma',
      phone: '+91-9876543211',
      facilities: ['Food', 'Water', 'Family-Friendly'],
      status: 'available'
    },
    {
      id: '3',
      name: 'Sports Complex Emergency Center',
      address: '789 Sports Avenue, New Delhi',
      location: [28.6019, 77.2295],
      capacity: 300,
      current_occupancy: 120,
      contact: 'Amit Singh',
      phone: '+91-9876543212',
      facilities: ['Food', 'Water', 'Medical', 'Pet-Friendly'],
      status: 'available'
    },
    {
      id: '4',
      name: 'Community Hall Shelter',
      address: '321 Community Lane, New Delhi',
      location: [28.5955, 77.2183],
      capacity: 100,
      current_occupancy: 85,
      contact: 'Sunita Devi',
      phone: '+91-9876543213',
      facilities: ['Food', 'Water'],
      status: 'nearly_full'
    },
    {
      id: '5',
      name: 'Temple Emergency Shelter',
      address: '654 Temple Street, New Delhi',
      location: [28.6169, 77.2295],
      capacity: 80,
      current_occupancy: 80,
      contact: 'Pandit Sharma',
      phone: '+91-9876543214',
      facilities: ['Food', 'Water', 'Family-Friendly'],
      status: 'full'
    }
  ];

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAdminStats();
      fetchCurrentAlertsAndSOS();
      fetchShelters();
      const interval = setInterval(() => {
        fetchAdminStats();
        fetchCurrentAlertsAndSOS();
        fetchShelters();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check admin access after all hooks
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="access-denied">
          <div className="access-denied-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>Administrator privileges required to access this panel.</p>
          {onBack && (
            <button className="back-btn" onClick={onBack}>
              ← Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8002/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalUsers: data.total_users || 0,
          activeUsers: data.active_users || 0,
          totalAlerts: data.total_alerts || 0,
          activeAlerts: data.active_alerts || 0,
          totalSOSRequests: data.total_sos_requests || 0,
          pendingSOSRequests: data.pending_sos_requests || 0,
          totalShelters: (data.total_shelters || 0) + hardcodedShelters.length,
          availableShelters: (data.available_shelters || 0) + hardcodedShelters.filter(s => s.status === 'available').length
        });
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      // Set mock data for demo with hardcoded shelters
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalAlerts: 0,
        activeAlerts: 0,
        totalSOSRequests: 0,
        pendingSOSRequests: 0,
        totalShelters: hardcodedShelters.length,
        availableShelters: hardcodedShelters.filter(s => s.status === 'available').length
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentAlertsAndSOS = async () => {
    try {
      setAlertsLoading(true);
      const token = localStorage.getItem('auth_token');

      // Fetch current alerts
      const alertsResponse = await fetch('http://localhost:8002/alerts/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setCurrentAlerts(alertsData.alerts || []);
      }

      // Fetch current SOS requests
      const sosResponse = await fetch('http://localhost:8002/admin/sos-requests?status=PENDING', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (sosResponse.ok) {
        const sosData = await sosResponse.json();
        setCurrentSOS(sosData.sos_requests || []);
      }

    } catch (error) {
      console.error('Failed to fetch alerts and SOS:', error);
      // Set empty arrays for demo
      setCurrentAlerts([]);
      setCurrentSOS([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchShelters = async () => {
    try {
      setSheltersLoading(true);
      const token = localStorage.getItem('auth_token');

      const response = await fetch('http://localhost:8002/shelters', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Shelter API response:', data);
        console.log('Individual shelters:', data.shelters);
        // Combine API shelters with hardcoded ones
        const apiShelters = data.shelters || [];
        const combinedShelters = [...hardcodedShelters, ...apiShelters];
        setShelters(combinedShelters);
      } else {
        console.error('Failed to fetch shelters:', response.status);
        // Use hardcoded shelters if API fails
        setShelters(hardcodedShelters);
      }
    } catch (error) {
      console.error('Failed to fetch shelters:', error);
      // Use hardcoded shelters if API fails
      setShelters(hardcodedShelters);
    } finally {
      setSheltersLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        try {
          // Reverse geocoding to get address
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${locationData.latitude}+${locationData.longitude}&key=YOUR_API_KEY`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results[0]) {
              locationData.address = data.results[0].formatted;
            }
          }
        } catch (error) {
          console.log('Reverse geocoding failed, using coordinates only');
        }

        setCurrentLocation(locationData);
        setLocationLoading(false);
      },
      (error: GeolocationPositionError) => {
        setLocationError(`Location error: ${error.message}`);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleFeatureChange = (name: string, value: number) => {
    setFeatureValues(prev => ({ ...prev, [name]: value }));
  };

  const handlePredict = async () => {
    setPredictionLoading(true);
    setPredictionError(null);

    try {
      const location = currentLocation
        ? `${currentLocation.latitude}, ${currentLocation.longitude}`
        : 'Government Office Location';

      const requestBody = {
        features: features.map(f => featureValues[f.name]),
        location: location,
        enable_alerts: true
      };

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
          throw new Error('Access denied. Admin privileges required.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data: PredictionResponse = await response.json();
      setPrediction(data);
    } catch (err) {
      console.error('Prediction error:', err);
      setPredictionError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.reload();
  };

  const getPredictionRiskColor = (riskLevel: string) => {
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

  const resendAlert = async (alertId: string, location: [number, number]) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8002/alerts/broadcast`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          risk_level: 'HIGH',
          probability: 0.8,
          location: `${location[0]}, ${location[1]}`
        }),
      });

      if (response.ok) {
        alert('Alert resent successfully!');
        fetchCurrentAlertsAndSOS(); // Refresh data
      } else {
        alert('Failed to resend alert');
      }
    } catch (error) {
      console.error('Error resending alert:', error);
      alert('Error resending alert');
    }
  };

  const handleCreateShelter = async () => {
    try {
      // Validate form data
      if (!shelterForm.name || !shelterForm.address || !shelterForm.capacity || !shelterForm.contact || !shelterForm.phone) {
        alert('Please fill in all required fields');
        return;
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }

      // Use form data instead of hardcoded values
      const shelterData = {
        name: shelterForm.name,
        address: shelterForm.address,
        location: [28.6139, 77.2090], // Default location - in real app, this would come from address geocoding
        capacity: parseInt(shelterForm.capacity),
        contact: shelterForm.contact,
        phone: shelterForm.phone,
        facilities: shelterForm.facilities
      };

      const response = await fetch('http://localhost:8002/shelters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shelterData),
      });

      if (response.ok) {
        alert('Shelter registered successfully!');
        // Reset form
        setShelterForm({
          name: '',
          address: '',
          capacity: '',
          contact: '',
          phone: '',
          facilities: ['Food', 'Water']
        });
        // Refresh stats and shelter list
        fetchAdminStats();
        fetchShelters();
      } else {
        console.error('Response status:', response.status, response.statusText);
        try {
          const error = await response.json();
          alert(`Failed to register shelter: ${error.detail || error.message || 'Unknown error'}`);
        } catch (parseError) {
          alert(`Failed to register shelter: HTTP ${response.status} - ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error creating shelter:', error);
      alert('Error registering shelter');
    }
  };

  const handleCreateAlert = async (alertData: any) => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('http://localhost:8002/alerts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
      });

      if (response.ok) {
        alert('Alert created and broadcasted successfully!');
        fetchCurrentAlertsAndSOS(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Failed to create alert: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Error creating alert');
    }
  };

  const handleUpdateSOSRequest = async (sosId: string, updateData: any) => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`http://localhost:8002/admin/sos-requests/${sosId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('SOS request updated successfully!');
        fetchCurrentAlertsAndSOS(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Failed to update SOS request: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error updating SOS request:', error);
      alert('Error updating SOS request');
    }
  };

  const renderSidebar = () => (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🏛️</div>
        <div className="sidebar-title">
          <h3>Admin Panel</h3>
          <p>Flood Management</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="nav-icon">📊</span>
          <span>Overview</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'sos' ? 'active' : ''}`}
          onClick={() => setActiveTab('sos')}
        >
          <span className="nav-icon">🆘</span>
          <span>SOS Management</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <span className="nav-icon">🚨</span>
          <span>Alert Management</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'shelters' ? 'active' : ''}`}
          onClick={() => setActiveTab('shelters')}
        >
          <span className="nav-icon">🏥</span>
          <span>Shelter Management</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'prediction' ? 'active' : ''}`}
          onClick={() => setActiveTab('prediction')}
        >
          <span className="nav-icon">🤖</span>
          <span>AI Prediction</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'gis' ? 'active' : ''}`}
          onClick={() => setActiveTab('gis')}
        >
          <span className="nav-icon">🗺️</span>
          <span>GIS Mapping</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">Admin User</div>
            <div className="user-status">Government Official</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>System Overview</h2>
        <p>Real-time monitoring of flood management system</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalUsers || 0}</div>
            <div className="stat-label">TOTAL USERS</div>
            <div className="stat-sub">{stats?.activeUsers || 0} active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalAlerts || 0}</div>
            <div className="stat-label">TOTAL ALERTS</div>
            <div className="stat-sub">{stats?.activeAlerts || 0} active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🆘</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalSOSRequests || 0}</div>
            <div className="stat-label">SOS REQUESTS</div>
            <div className="stat-sub">{stats?.pendingSOSRequests || 0} pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏥</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalShelters || 0}</div>
            <div className="stat-label">SHELTERS</div>
            <div className="stat-sub">{stats?.availableShelters || 0} available</div>
          </div>
        </div>
      </div>

      {/* Current Alerts Section */}
      <div className="current-alerts-section">
        <h3>🚨 Current Active Alerts</h3>
        {alertsLoading ? (
          <div className="loading-message">Loading alerts...</div>
        ) : currentAlerts.length > 0 ? (
          <div className="alerts-list">
            {currentAlerts.slice(0, 3).map((alert, index) => (
              <div key={index} className="alert-item">
                <div className="alert-header">
                  <span className="alert-icon">🚨</span>
                  <span className="alert-title">{alert.title || 'Flood Alert'}</span>
                  <span className={`alert-level ${alert.risk_level?.toLowerCase()}`}>
                    {alert.risk_level || 'MODERATE'}
                  </span>
                </div>
                <div className="alert-details">
                  <div className="alert-location">📍 {alert.location || 'Unknown Location'}</div>
                  <div className="alert-time">⏰ {new Date(alert.timestamp).toLocaleString()}</div>
                  <div className="alert-probability">📊 {((alert.probability || 0.5) * 100).toFixed(1)}% Risk</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data-message">
            <span className="no-data-icon">✅</span>
            <span>No active alerts at this time</span>
          </div>
        )}
      </div>

      {/* Current SOS Section */}
      <div className="current-sos-section">
        <h3>🆘 Pending SOS Requests</h3>
        {alertsLoading ? (
          <div className="loading-message">Loading SOS requests...</div>
        ) : currentSOS.length > 0 ? (
          <div className="sos-list">
            {currentSOS.slice(0, 3).map((sos, index) => (
              <div key={index} className="sos-item">
                <div className="sos-header">
                  <span className="sos-icon">🆘</span>
                  <span className="sos-id">SOS #{sos.id || `REQ-${index + 1}`}</span>
                  <span className="sos-status pending">PENDING</span>
                </div>
                <div className="sos-details">
                  <div className="sos-location">📍 {sos.location ? `${sos.location[0]?.toFixed(4)}, ${sos.location[1]?.toFixed(4)}` : 'Unknown Location'}</div>
                  <div className="sos-time">⏰ {new Date(sos.timestamp).toLocaleString()}</div>
                  <div className="sos-type">🚨 {sos.emergencyType || 'Emergency'}</div>
                  {sos.message && <div className="sos-message">💬 {sos.message}</div>}
                </div>
                <div className="sos-actions">
                  <button
                    className="sos-action-btn"
                    onClick={() => setActiveTab('sos')}
                  >
                    Manage Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data-message">
            <span className="no-data-icon">✅</span>
            <span>No pending SOS requests</span>
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="quick-navigation">
        <h3>Quick Navigation</h3>
        <div className="nav-grid">
          <button className="nav-btn primary" onClick={() => setActiveTab('sos')}>
            <span className="nav-icon">🆘</span>
            <span>SOS Management</span>
          </button>
          <button className="nav-btn secondary" onClick={() => setActiveTab('alerts')}>
            <span className="nav-icon">🚨</span>
            <span>Alert Management</span>
          </button>
          <button className="nav-btn warning" onClick={() => setActiveTab('shelters')}>
            <span className="nav-icon">🏥</span>
            <span>Shelter Management</span>
          </button>
          <button className="nav-btn info" onClick={() => setActiveTab('prediction')}>
            <span className="nav-icon">🤖</span>
            <span>AI Prediction</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPredictionAnalysis = () => {
    const groupedFeatures = features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, FeatureInput[]>);

    return (
      <div className="admin-content">
        <div className="content-header">
          <h2>Flood Risk Prediction Analysis</h2>
          <p>AI-powered flood risk assessment using environmental and infrastructure parameters</p>
        </div>

        <div className="prediction-container">
          {/* GPS Location Section */}
          <div className="location-section">
            <h3>📍 Current GPS Location</h3>
            <div className="location-controls">
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="location-btn"
              >
                {locationLoading ? '📡 Getting Location...' : '🌍 Get Current GPS Location'}
              </button>

              {currentLocation && (
                <div className="location-display">
                  <div className="location-info">
                    <div className="coordinates">
                      <strong>Coordinates:</strong> {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </div>
                    <div className="accuracy">
                      <strong>Accuracy:</strong> ±{currentLocation.accuracy.toFixed(0)}m
                    </div>
                    {currentLocation.address && (
                      <div className="address">
                        <strong>Address:</strong> {currentLocation.address}
                      </div>
                    )}
                    <div className="timestamp">
                      <strong>Updated:</strong> {new Date(currentLocation.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="location-actions">
                    <button
                      onClick={() => window.open(`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`, '_blank')}
                      className="map-btn"
                    >
                      🗺️ View on Map
                    </button>
                  </div>
                </div>
              )}

              {locationError && (
                <div className="location-error">
                  <span className="error-icon">❌</span>
                  <span>{locationError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Location */}
          <div className="analysis-location">
            <h3>Analysis Location:</h3>
            <div className="location-input">
              <input
                type="text"
                value={currentLocation
                  ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                  : 'Government Office Location'
                }
                readOnly
                className="location-field"
              />
            </div>
          </div>

          {/* Environmental Factors */}
          {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
            <div key={category} className="feature-category">
              <h3>{category} Factors</h3>
              <div className="features-grid">
                {categoryFeatures.map((feature) => (
                  <div key={feature.name} className="feature-control">
                    <label className="feature-label">
                      {feature.label}
                      <span className="feature-value">{featureValues[feature.name]}</span>
                    </label>
                    <input
                      type="range"
                      min={feature.min}
                      max={feature.max}
                      value={featureValues[feature.name]}
                      onChange={(e) => handleFeatureChange(feature.name, Number(e.target.value))}
                      className="feature-slider"
                    />
                    <div className="slider-labels">
                      <span>{feature.min}</span>
                      <span>{feature.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="prediction-actions">
            <button
              onClick={handlePredict}
              disabled={predictionLoading}
              className="predict-btn"
            >
              {predictionLoading ? '🔄 Analyzing...' : '🤖 Run AI Prediction'}
            </button>
          </div>

          {/* Prediction Results */}
          {prediction && (
            <div className="prediction-results">
              <div className="result-header">
                <h3>Prediction Results</h3>
                <div className="result-timestamp">
                  Generated: {new Date().toLocaleString()}
                </div>
              </div>

              <div className="result-card">
                <div className="risk-indicator">
                  <div
                    className="risk-icon"
                    style={{ color: getPredictionRiskColor(prediction.risk_level) }}
                  >
                    {getAlertIcon(prediction.risk_level)}
                  </div>
                  <div className="risk-details">
                    <div className="risk-level" style={{ color: getPredictionRiskColor(prediction.risk_level) }}>
                      {prediction.risk_level} RISK
                    </div>
                    <div className="risk-probability">
                      {(prediction.probability * 100).toFixed(1)}% Probability
                    </div>
                  </div>
                </div>

                <div className="prediction-metrics">
                  <div className="metric">
                    <span className="metric-label">Uncertainty:</span>
                    <span className="metric-value">{(prediction.uncertainty * 100).toFixed(1)}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Location:</span>
                    <span className="metric-value">
                      {currentLocation
                        ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                        : 'Government Office Location'
                      }
                    </span>
                  </div>
                  {prediction.alert_sent && (
                    <div className="metric">
                      <span className="metric-label">Alert Status:</span>
                      <span className="metric-value alert-sent">✅ Alert Sent</span>
                    </div>
                  )}
                </div>

                <div className="alert-message">
                  <strong>Analysis:</strong> {prediction.alert}
                </div>

                {/* GIS Mapping Section */}
                {currentLocation && (
                  <div className="gis-mapping">
                    <h4>🗺️ GIS Location Mapping</h4>
                    <div className="map-container">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.longitude - 0.01},${currentLocation.latitude - 0.01},${currentLocation.longitude + 0.01},${currentLocation.latitude + 0.01}&layer=mapnik&marker=${currentLocation.latitude},${currentLocation.longitude}`}
                        width="100%"
                        height="300"
                        style={{ border: 'none', borderRadius: '8px' }}
                        title="Location Map"
                      ></iframe>
                    </div>
                    <div className="map-actions">
                      <button
                        onClick={() => window.open(`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}&z=15`, '_blank')}
                        className="map-action-btn"
                      >
                        🌍 Google Maps
                      </button>
                      <button
                        onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${currentLocation.latitude}&mlon=${currentLocation.longitude}&zoom=15`, '_blank')}
                        className="map-action-btn"
                      >
                        🗺️ OpenStreetMap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {predictionError && (
            <div className="prediction-error">
              <h3>❌ Prediction Error</h3>
              <p>{predictionError}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdminGIS = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>🗺️ GIS Alert Mapping</h2>
        <p>Monitor and manage flood alerts on interactive map</p>
      </div>

      <div className="gis-container">
        {/* Alert Locations Panel */}
        <div className="alert-locations-panel">
          <h3>📍 Alert Locations</h3>
          {currentAlerts.length > 0 ? (
            <div className="alert-locations-list">
              {currentAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`location-item ${selectedAlert?.id === alert.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedAlert(alert);
                    if (alert.coordinates) {
                      setMapCenter([alert.coordinates[0], alert.coordinates[1]]);
                    }
                  }}
                >
                  <div className="location-header">
                    <span className="location-icon">{getAlertIcon(alert.risk_level)}</span>
                    <span className="location-title">{alert.title || 'Flood Alert'}</span>
                    <span className={`location-risk ${alert.risk_level?.toLowerCase()}`}>
                      {alert.risk_level || 'MODERATE'}
                    </span>
                  </div>
                  <div className="location-details">
                    <div className="location-coords">
                      📍 {alert.coordinates ?
                        `${alert.coordinates[0].toFixed(4)}, ${alert.coordinates[1].toFixed(4)}` :
                        alert.location || 'Unknown Location'
                      }
                    </div>
                    <div className="location-time">
                      ⏰ {new Date(alert.timestamp).toLocaleString()}
                    </div>
                    <div className="location-probability">
                      📊 {((alert.probability || 0.5) * 100).toFixed(1)}% Risk
                    </div>
                  </div>
                  <div className="location-actions">
                    <button
                      className="resend-alert-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (alert.coordinates) {
                          resendAlert(alert.id, alert.coordinates);
                        } else {
                          alert('No coordinates available for this alert');
                        }
                      }}
                    >
                      📢 Resend Alert
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-alerts-message">
              <span className="no-alerts-icon">✅</span>
              <span>No active alerts to display on map</span>
            </div>
          )}
        </div>

        {/* Map Display */}
        <div className="map-display">
          <div className="map-header">
            <h3>🌍 Interactive Map</h3>
            {selectedAlert && (
              <div className="selected-alert-info">
                <span>Selected: {selectedAlert.title || 'Flood Alert'}</span>
                <span className={`selected-risk ${selectedAlert.risk_level?.toLowerCase()}`}>
                  {selectedAlert.risk_level}
                </span>
              </div>
            )}
          </div>

          <div className="map-container">
            {/* OpenStreetMap Embed */}
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter[1] - 0.1},${mapCenter[0] - 0.1},${mapCenter[1] + 0.1},${mapCenter[0] + 0.1}&layer=mapnik${selectedAlert?.coordinates ? `&marker=${selectedAlert.coordinates[0]},${selectedAlert.coordinates[1]}` : ''}`}
              width="100%"
              height="500"
              style={{ border: 'none', borderRadius: '8px' }}
              title="Alert Locations Map"
            ></iframe>
          </div>

          <div className="map-controls">
            <button
              onClick={() => {
                if (currentLocation) {
                  setMapCenter([currentLocation.latitude, currentLocation.longitude]);
                } else {
                  getCurrentLocation();
                }
              }}
              className="map-control-btn"
            >
              📍 Center on My Location
            </button>
            <button
              onClick={() => setMapCenter([20.5937, 78.9629])}
              className="map-control-btn"
            >
              🇮🇳 Center on India
            </button>
            {selectedAlert && (
              <button
                onClick={() => window.open(`https://www.google.com/maps?q=${selectedAlert.coordinates[0]},${selectedAlert.coordinates[1]}&z=15`, '_blank')}
                className="map-control-btn"
              >
                🗺️ Open in Google Maps
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert Details Panel */}
      {selectedAlert && (
        <div className="alert-details-panel">
          <h3>📋 Alert Details</h3>
          <div className="alert-detail-card">
            <div className="alert-detail-header">
              <span className="detail-icon">{getAlertIcon(selectedAlert.risk_level)}</span>
              <span className="detail-title">{selectedAlert.title || 'Flood Alert'}</span>
              <span className={`detail-risk ${selectedAlert.risk_level?.toLowerCase()}`}>
                {selectedAlert.risk_level} RISK
              </span>
            </div>
            <div className="alert-detail-content">
              <div className="detail-row">
                <span className="detail-label">Location:</span>
                <span className="detail-value">
                  {selectedAlert.coordinates ?
                    `${selectedAlert.coordinates[0].toFixed(6)}, ${selectedAlert.coordinates[1].toFixed(6)}` :
                    selectedAlert.location || 'Unknown'
                  }
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Risk Probability:</span>
                <span className="detail-value">{((selectedAlert.probability || 0.5) * 100).toFixed(1)}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Generated:</span>
                <span className="detail-value">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Alert ID:</span>
                <span className="detail-value">{selectedAlert.id || 'N/A'}</span>
              </div>
              {selectedAlert.message && (
                <div className="detail-row">
                  <span className="detail-label">Message:</span>
                  <span className="detail-value">{selectedAlert.message}</span>
                </div>
              )}
            </div>
            <div className="alert-detail-actions">
              <button
                className="detail-action-btn primary"
                onClick={() => {
                  if (selectedAlert.coordinates) {
                    resendAlert(selectedAlert.id, selectedAlert.coordinates);
                  }
                }}
              >
                📢 Resend Alert
              </button>
              <button
                className="detail-action-btn secondary"
                onClick={() => setActiveTab('alerts')}
              >
                📝 Manage Alert
              </button>
              <button
                className="detail-action-btn info"
                onClick={() => {
                  if (selectedAlert.coordinates) {
                    window.open(`https://www.google.com/maps?q=${selectedAlert.coordinates[0]},${selectedAlert.coordinates[1]}&z=15`, '_blank');
                  }
                }}
              >
                🗺️ View on Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSOSManagement = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>🆘 SOS Request Management</h2>
        <p>Monitor and respond to emergency SOS requests from citizens</p>
      </div>

      <div className="sos-management-container">
        {/* SOS Statistics */}
        <div className="sos-stats">
          <div className="stat-card urgent">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-number">{currentSOS.length}</div>
              <div className="stat-label">PENDING SOS</div>
              <div className="stat-sub">Requires immediate attention</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.totalSOSRequests || 0}</div>
              <div className="stat-label">TOTAL REQUESTS</div>
              <div className="stat-sub">All time</div>
            </div>
          </div>
        </div>

        {/* SOS Requests List */}
        <div className="sos-requests-section">
          <h3>📋 Active SOS Requests</h3>
          {alertsLoading ? (
            <div className="loading-message">Loading SOS requests...</div>
          ) : currentSOS.length > 0 ? (
            <div className="sos-requests-grid">
              {currentSOS.map((sos, index) => (
                <div key={index} className="sos-request-card">
                  <div className="sos-card-header">
                    <div className="sos-id-badge">
                      <span className="sos-icon">🆘</span>
                      <span>SOS #{sos.id || `REQ-${index + 1}`}</span>
                    </div>
                    <div className="sos-priority high">HIGH PRIORITY</div>
                  </div>

                  <div className="sos-card-content">
                    <div className="sos-info-grid">
                      <div className="sos-info-item">
                        <span className="info-label">📍 Location:</span>
                        <span className="info-value">
                          {sos.location ?
                            `${sos.location[0]?.toFixed(4)}, ${sos.location[1]?.toFixed(4)}` :
                            'Unknown Location'
                          }
                        </span>
                      </div>
                      <div className="sos-info-item">
                        <span className="info-label">⏰ Time:</span>
                        <span className="info-value">{new Date(sos.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="sos-info-item">
                        <span className="info-label">🚨 Type:</span>
                        <span className="info-value">{sos.emergencyType || 'Emergency'}</span>
                      </div>
                      <div className="sos-info-item">
                        <span className="info-label">👤 User:</span>
                        <span className="info-value">{sos.userId || 'Anonymous'}</span>
                      </div>
                    </div>

                    {sos.message && (
                      <div className="sos-message">
                        <span className="message-label">💬 Message:</span>
                        <p className="message-text">{sos.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="sos-card-actions">
                    <button
                      className="sos-action-btn respond"
                      onClick={() => handleUpdateSOSRequest(sos.id, { status: 'IN_PROGRESS', assigned_officer: user?.name })}
                    >
                      � Resspond
                    </button>
                    <button
                      className="sos-action-btn dispatch"
                      onClick={() => handleUpdateSOSRequest(sos.id, { status: 'ASSIGNED', assigned_officer: 'Emergency Team Alpha' })}
                    >
                      🚑 Dispatch Team
                    </button>
                    <button
                      className="sos-action-btn map"
                      onClick={() => {
                        if (sos.location) {
                          window.open(`https://www.google.com/maps?q=${sos.location[0]},${sos.location[1]}&z=15`, '_blank');
                        }
                      }}
                    >
                      🗺️ View Location
                    </button>
                    <button
                      className="sos-action-btn resolve"
                      onClick={() => handleUpdateSOSRequest(sos.id, { status: 'RESOLVED', resolution_notes: 'Emergency resolved successfully' })}
                    >
                      ✅ Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data-message">
              <span className="no-data-icon">✅</span>
              <span>No pending SOS requests at this time</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAlertManagement = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>🚨 Alert Management System</h2>
        <p>Manage flood alerts, notifications, and emergency communications</p>
      </div>

      <div className="alert-management-container">
        {/* Alert Statistics */}
        <div className="alert-stats">
          <div className="stat-card">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-number">{currentAlerts.length}</div>
              <div className="stat-label">ACTIVE ALERTS</div>
              <div className="stat-sub">Currently broadcasting</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.totalAlerts || 0}</div>
              <div className="stat-label">TOTAL ALERTS</div>
              <div className="stat-sub">All time</div>
            </div>
          </div>
        </div>

        {/* Create New Alert */}
        <div className="create-alert-section">
          <h3>📝 Create New Alert</h3>
          <div className="alert-form">
            <div className="form-row">
              <div className="form-group">
                <label>Alert Type:</label>
                <select className="form-select">
                  <option value="flood">Flood Warning</option>
                  <option value="evacuation">Evacuation Notice</option>
                  <option value="weather">Weather Alert</option>
                  <option value="emergency">Emergency Broadcast</option>
                </select>
              </div>
              <div className="form-group">
                <label>Risk Level:</label>
                <select className="form-select">
                  <option value="LOW">Low Risk</option>
                  <option value="MODERATE">Moderate Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Alert Message:</label>
              <textarea
                className="form-textarea"
                placeholder="Enter alert message for citizens..."
                rows={3}
              ></textarea>
            </div>
            <div className="form-actions">
              <button
                className="create-alert-btn"
                onClick={() => {
                  const alertData = {
                    alert_type: "FLOOD_WARNING",
                    severity: "MODERATE",
                    location: "New Delhi Area",
                    message: "Flood warning issued for the area. Please take necessary precautions.",
                    affected_users: []
                  };
                  handleCreateAlert(alertData);
                }}
              >
                📢 Create & Broadcast Alert
              </button>
            </div>
          </div>
        </div>

        {/* Active Alerts Management */}
        <div className="active-alerts-section">
          <h3>📋 Active Alerts Management</h3>
          {alertsLoading ? (
            <div className="loading-message">Loading active alerts...</div>
          ) : currentAlerts.length > 0 ? (
            <div className="alerts-management-grid">
              {currentAlerts.map((alert, index) => (
                <div key={index} className="alert-management-card">
                  <div className="alert-card-header">
                    <div className="alert-title-section">
                      <span className="alert-icon">{getAlertIcon(alert.risk_level)}</span>
                      <span className="alert-title">{alert.title || 'Flood Alert'}</span>
                    </div>
                    <div className={`alert-risk-badge ${alert.risk_level?.toLowerCase()}`}>
                      {alert.risk_level || 'MODERATE'}
                    </div>
                  </div>

                  <div className="alert-card-content">
                    <div className="alert-info-grid">
                      <div className="alert-info-item">
                        <span className="info-label">📍 Location:</span>
                        <span className="info-value">{alert.location || 'Multiple Areas'}</span>
                      </div>
                      <div className="alert-info-item">
                        <span className="info-label">⏰ Created:</span>
                        <span className="info-value">{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="alert-info-item">
                        <span className="info-label">📊 Risk Probability:</span>
                        <span className="info-value">{((alert.probability || 0.5) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="alert-info-item">
                        <span className="info-label">🎯 Status:</span>
                        <span className="info-value status-active">Active</span>
                      </div>
                    </div>

                    {alert.message && (
                      <div className="alert-message-preview">
                        <span className="message-label">💬 Message:</span>
                        <p className="message-text">{alert.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="alert-card-actions">
                    <button className="alert-action-btn edit">
                      ✏️ Edit
                    </button>
                    <button className="alert-action-btn resend">
                      📢 Resend
                    </button>
                    <button className="alert-action-btn pause">
                      ⏸️ Pause
                    </button>
                    <button className="alert-action-btn stop">
                      🛑 Stop Alert
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data-message">
              <span className="no-data-icon">✅</span>
              <span>No active alerts currently broadcasting</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderShelterManagement = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>🏥 Shelter Management System</h2>
        <p>Manage emergency shelters, capacity, and resource allocation</p>
      </div>

      <div className="shelter-management-container">
        {/* Shelter Statistics */}
        <div className="shelter-stats">
          <div className="stat-card">
            <div className="stat-icon">🏥</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.totalShelters || 0}</div>
              <div className="stat-label">TOTAL SHELTERS</div>
              <div className="stat-sub">Registered facilities</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.availableShelters || 0}</div>
              <div className="stat-label">AVAILABLE</div>
              <div className="stat-sub">Ready for occupancy</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">0</div>
              <div className="stat-label">CURRENT OCCUPANCY</div>
              <div className="stat-sub">People sheltered</div>
            </div>
          </div>
        </div>

        {/* Add New Shelter */}
        <div className="add-shelter-section">
          <h3>🏗️ Register New Shelter</h3>
          <div className="shelter-form">
            <div className="form-row">
              <div className="form-group">
                <label>Shelter Name: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter shelter name..."
                  value={shelterForm.name}
                  onChange={(e) => setShelterForm({ ...shelterForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Capacity: *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Maximum occupancy..."
                  value={shelterForm.capacity}
                  onChange={(e) => setShelterForm({ ...shelterForm, capacity: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Address: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Full address..."
                  value={shelterForm.address}
                  onChange={(e) => setShelterForm({ ...shelterForm, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Person: *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Manager/Contact name..."
                  value={shelterForm.contact}
                  onChange={(e) => setShelterForm({ ...shelterForm, contact: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone: *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Contact number..."
                  value={shelterForm.phone}
                  onChange={(e) => setShelterForm({ ...shelterForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Facilities:</label>
                <div className="facilities-checkboxes">
                  {['Food', 'Water', 'Medical', 'Family-Friendly', 'Pet-Friendly'].map(facility => (
                    <label key={facility} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={shelterForm.facilities.includes(facility)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setShelterForm({ ...shelterForm, facilities: [...shelterForm.facilities, facility] });
                          } else {
                            setShelterForm({ ...shelterForm, facilities: shelterForm.facilities.filter(f => f !== facility) });
                          }
                        }}
                      />
                      {facility}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button
                className="add-shelter-btn"
                onClick={handleCreateShelter}
              >
                🏥 Register Shelter
              </button>
              <button
                className="test-api-btn"
                onClick={async () => {
                  try {
                    const response = await fetch('http://localhost:8002/health');
                    if (response.ok) {
                      const data = await response.json();
                      alert(`API is working! Status: ${data.status}`);
                    } else {
                      alert(`API responded with status: ${response.status}`);
                    }
                  } catch (error) {
                    alert(`API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  marginLeft: '0.5rem'
                }}
              >
                🔧 Test API
              </button>
            </div>
          </div>
        </div>

        {/* Shelter Directory */}
        <div className="shelter-directory-section">
          <h3>📋 Shelter Directory</h3>
          <div className="shelter-directory">
            {sheltersLoading ? (
              <div className="loading-message">Loading shelters...</div>
            ) : shelters.length > 0 ? (
              shelters.map((shelter) => {
                console.log('Rendering shelter:', shelter.name || 'Unnamed shelter');
                return (
                  <div key={shelter.id || shelter._id} className="shelter-card">
                    <div className="shelter-card-header">
                      <div className="shelter-name-section">
                        <span className="shelter-icon">🏥</span>
                        <span className="shelter-name">{shelter.name || 'Unnamed Shelter'}</span>
                      </div>
                      <div className={`shelter-status-badge ${(shelter.status || 'available').toLowerCase()}`}>
                        {(shelter.status || 'AVAILABLE').toUpperCase()}
                      </div>
                    </div>

                    <div className="shelter-card-content">
                      <div className="shelter-info-grid">
                        <div className="shelter-info-item">
                          <span className="info-label">📍 Address:</span>
                          <span className="info-value">{shelter.address || 'Address not available'}</span>
                        </div>
                        <div className="shelter-info-item">
                          <span className="info-label">👥 Capacity:</span>
                          <span className="info-value">{shelter.capacity || 'N/A'} people</span>
                        </div>
                        <div className="shelter-info-item">
                          <span className="info-label">📊 Occupancy:</span>
                          <span className="info-value">
                            {shelter.current_occupancy || 0}/{shelter.capacity || 'N/A'}
                            {shelter.capacity ? ` (${(((shelter.current_occupancy || 0) / shelter.capacity) * 100).toFixed(0)}%)` : ''}
                          </span>
                        </div>
                        <div className="shelter-info-item">
                          <span className="info-label">👤 Contact:</span>
                          <span className="info-value">{shelter.contact || 'Contact not available'}</span>
                        </div>
                        <div className="shelter-info-item">
                          <span className="info-label">📞 Phone:</span>
                          <span className="info-value">{shelter.phone || 'Phone not available'}</span>
                        </div>
                      </div>

                      <div className="shelter-facilities">
                        <span className="facilities-label">🏠 Facilities:</span>
                        <div className="facilities-tags">
                          {(Array.isArray(shelter.facilities) ? shelter.facilities : []).map((facility: any, idx: number) => (
                            <span key={idx} className="facility-tag">{typeof facility === 'string' ? facility : String(facility)}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="shelter-card-actions">
                      <button className="shelter-action-btn edit">
                        ✏️ Edit
                      </button>
                      <button className="shelter-action-btn capacity">
                        👥 Manage Capacity
                      </button>
                      <button className="shelter-action-btn contact">
                        📞 Contact
                      </button>
                      <button className="shelter-action-btn map">
                        🗺️ View Location
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-data-message">
                <span className="no-data-icon">🏥</span>
                <span>No shelters registered yet. Add your first shelter above.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'sos':
        return renderSOSManagement();
      case 'alerts':
        return renderAlertManagement();
      case 'shelters':
        return renderShelterManagement();
      case 'prediction':
        return renderPredictionAnalysis();
      case 'gis':
        return renderAdminGIS();
      default:
        return (
          <div className="admin-content">
            <div className="coming-soon">
              <div className="coming-soon-icon">🚧</div>
              <h3>Feature Under Development</h3>
              <p>This section is being enhanced as part of our ongoing development.</p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading admin panel...</h2>
          <p>Fetching system data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Top Header */}
      <div className="admin-header">
        <div className="header-content">
          <div className="header-icon">🏛️</div>
          <div className="header-text">
            <h1>Government Flood Management Center</h1>
            <p>National Disaster Management Authority - Flood Control Division</p>
          </div>
        </div>
        <div className="header-controls">
          <div className="current-time">
            <div className="time-display">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="date-display">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-layout">
        {renderSidebar()}
        <div className="admin-main">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;