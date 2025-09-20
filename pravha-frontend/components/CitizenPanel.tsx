import React, { useState, useEffect } from 'react';
import './CitizenPanel.css';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

interface Shelter {
  id: string;
  name: string;
  address: string;
  location: [number, number];
  capacity: number;
  current_occupancy: number;
  contact: string;
  phone: string;
  facilities: string[];
  status: string;
  distance?: number;
}

interface Alert {
  id: number;
  timestamp: string;
  risk_level: string;
  probability: number;
  location: string;
  title: string;
  message: string;
  priority: string;
  color: string;
}

const CitizenPanel = ({ user, onBack }: {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  } | null;
  onBack?: () => void;
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Precautions state
  const [emergencyKit, setEmergencyKit] = useState([
    { id: 'water', label: 'Drinking water (3-day supply)', checked: false },
    { id: 'food', label: 'Non-perishable food (3-day supply)', checked: false },
    { id: 'meds', label: 'Prescription medicines', checked: false },
    { id: 'firstaid', label: 'First-aid kit', checked: false },
    { id: 'torch', label: 'Flashlight + batteries', checked: false },
    { id: 'radio', label: 'Battery/hand-crank radio', checked: false },
    { id: 'docs', label: 'Important documents (waterproof)', checked: false },
    { id: 'cash', label: 'Cash and essentials', checked: false },
    { id: 'clothes', label: 'Warm clothes & blankets', checked: false },
    { id: 'hygiene', label: 'Hygiene items & sanitizer', checked: false },
  ]);

  // Hardcoded shelters for demo
  const hardcodedShelters: Shelter[] = [
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
      status: 'available',
      distance: 2.5
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
      status: 'available',
      distance: 3.2
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
      status: 'available',
      distance: 4.1
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
      status: 'nearly_full',
      distance: 5.0
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
      status: 'full',
      distance: 1.8
    }
  ];

  useEffect(() => {
    setShelters(hardcodedShelters);
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8002/alerts/history?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
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
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
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
        maximumAge: 300000
      }
    );
  };

  const sendSOSRequest = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const location = currentLocation 
        ? [currentLocation.latitude, currentLocation.longitude]
        : [28.6139, 77.2090]; // Default Delhi location

      const response = await fetch('http://localhost:8002/sos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          emergency_type: 'FLOOD_EMERGENCY',
          message: 'Emergency assistance needed due to flooding'
        }),
      });

      if (response.ok) {
        alert('SOS request sent successfully! Emergency services have been notified.');
      } else {
        alert('Failed to send SOS request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending SOS:', error);
      alert('Error sending SOS request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#059669';
      case 'nearly_full': return '#d97706';
      case 'full': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'nearly_full': return 'Nearly Full';
      case 'full': return 'Full';
      default: return 'Unknown';
    }
  };

  const renderSidebar = () => (
    <div className="citizen-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🏠</div>
        <div className="sidebar-title">
          <h3>Citizen Portal</h3>
          <p>Flood Safety Dashboard</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="nav-icon">🏠</span>
          <span>Dashboard</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <span className="nav-icon">🚨</span>
          <span>Active Alerts</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'shelters' ? 'active' : ''}`}
          onClick={() => setActiveTab('shelters')}
        >
          <span className="nav-icon">🏥</span>
          <span>Find Shelters</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'precautions' ? 'active' : ''}`}
          onClick={() => {
            console.log('Precautions button clicked'); // Debug log
            setActiveTab('precautions');
          }}
        >
          <span className="nav-icon">🛡️</span>
          <span>Safety Guide</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'sos' ? 'active' : ''}`}
          onClick={() => setActiveTab('sos')}
        >
          <span className="nav-icon">🆘</span>
          <span>Emergency SOS</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">Citizen</div>
          </div>
        </div>
        <button className="logout-btn" onClick={() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          window.location.reload();
        }}>
          🚪 Logout
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="citizen-content">
      <div className="content-header">
        <h2>Welcome, {user?.name}</h2>
        <p>Stay informed about flood conditions and emergency resources in your area</p>
      </div>

      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="dashboard-card emergency-actions">
          <h3>🚨 Emergency Actions</h3>
          <div className="action-buttons">
            <button className="action-btn sos" onClick={sendSOSRequest}>
              🆘 Send SOS
            </button>
            <button className="action-btn location" onClick={getCurrentLocation}>
              📍 Get Location
            </button>
            <button className="action-btn shelters" onClick={() => setActiveTab('shelters')}>
              🏥 Find Shelters
            </button>
            <button className="action-btn precautions" onClick={() => setActiveTab('precautions')}>
              🛡️ Safety Guide
            </button>
          </div>
        </div>

        {/* Current Location */}
        <div className="dashboard-card location-info">
          <h3>📍 Your Location</h3>
          {currentLocation ? (
            <div className="location-display">
              <p><strong>Coordinates:</strong> {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}</p>
              <p><strong>Accuracy:</strong> ±{currentLocation.accuracy.toFixed(0)}m</p>
              <p><strong>Updated:</strong> {new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
            </div>
          ) : (
            <div className="no-location">
              <p>Location not available</p>
              <button onClick={getCurrentLocation} disabled={locationLoading}>
                {locationLoading ? 'Getting Location...' : 'Get Current Location'}
              </button>
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="dashboard-card recent-alerts">
          <h3>🚨 Recent Alerts</h3>
          {alerts.length > 0 ? (
            <div className="alerts-list">
              {alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="alert-item">
                  <div className="alert-header">
                    <span className={`alert-level ${alert.risk_level?.toLowerCase()}`}>
                      {alert.risk_level}
                    </span>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="alert-location">📍 {alert.location}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-alerts">No recent alerts</p>
          )}
        </div>

        {/* Nearby Shelters */}
        <div className="dashboard-card nearby-shelters">
          <h3>🏥 Nearby Shelters</h3>
          <div className="shelters-preview">
            {shelters.slice(0, 3).map((shelter) => (
              <div key={shelter.id} className="shelter-preview">
                <div className="shelter-name">{shelter.name}</div>
                <div className="shelter-distance">{shelter.distance}km away</div>
                <div className={`shelter-status ${shelter.status}`}>
                  {getStatusText(shelter.status)}
                </div>
              </div>
            ))}
          </div>
          <button className="view-all-btn" onClick={() => setActiveTab('shelters')}>
            View All Shelters
          </button>
        </div>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="citizen-content">
      <div className="content-header">
        <h2>🚨 Active Alerts</h2>
        <p>Current flood alerts and warnings in your area</p>
      </div>

      <div className="alerts-container">
        {alerts.length > 0 ? (
          alerts.map((alert, index) => (
            <div key={index} className="alert-card">
              <div className="alert-card-header">
                <span className={`alert-level-badge ${alert.risk_level?.toLowerCase()}`}>
                  {alert.risk_level} RISK
                </span>
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
              <h3 className="alert-title">{alert.title || 'Flood Alert'}</h3>
              <p className="alert-location">📍 {alert.location}</p>
              <p className="alert-probability">Risk Probability: {((alert.probability || 0.5) * 100).toFixed(1)}%</p>
              {alert.message && <p className="alert-message">{alert.message}</p>}
            </div>
          ))
        ) : (
          <div className="no-alerts-message">
            <span className="no-alerts-icon">✅</span>
            <h3>No Active Alerts</h3>
            <p>There are currently no flood alerts in your area.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderShelters = () => (
    <div className="citizen-content">
      <div className="content-header">
        <h2>🏥 Emergency Shelters</h2>
        <p>Find nearby emergency shelters and evacuation centers</p>
      </div>

      <div className="shelters-container">
        <div className="shelters-grid">
          {shelters.map((shelter) => (
            <div key={shelter.id} className="shelter-card">
              <div className="shelter-card-header">
                <h3 className="shelter-name">{shelter.name}</h3>
                <span 
                  className="shelter-status-badge"
                  style={{ backgroundColor: getStatusColor(shelter.status) }}
                >
                  {getStatusText(shelter.status)}
                </span>
              </div>

              <div className="shelter-info">
                <p className="shelter-address">📍 {shelter.address}</p>
                <p className="shelter-distance">🚶 {shelter.distance}km away</p>
                <p className="shelter-capacity">
                  👥 {shelter.current_occupancy}/{shelter.capacity} occupied 
                  ({((shelter.current_occupancy / shelter.capacity) * 100).toFixed(0)}%)
                </p>
                <p className="shelter-contact">📞 {shelter.phone}</p>
                <p className="shelter-manager">👤 Contact: {shelter.contact}</p>
              </div>

              <div className="shelter-facilities">
                <h4>Facilities:</h4>
                <div className="facilities-tags">
                  {shelter.facilities.map((facility, idx) => (
                    <span key={idx} className="facility-tag">{facility}</span>
                  ))}
                </div>
              </div>

              <div className="shelter-actions">
                <button 
                  className="shelter-action-btn directions"
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${shelter.location[0]},${shelter.location[1]}`, '_blank')}
                >
                  🗺️ Get Directions
                </button>
                <button 
                  className="shelter-action-btn call"
                  onClick={() => window.open(`tel:${shelter.phone}`)}
                >
                  📞 Call Shelter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const toggleKitItem = (id: string) => {
    setEmergencyKit(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const renderPrecautions = () => (
    <div className="citizen-content">
      <div className="content-header">
        <h2>🛡️ Flood Safety Guide</h2>
        <p>Essential precautions and emergency preparedness information</p>
      </div>

      <div className="precautions-container">
        {/* Safety Guidelines */}
        <div className="safety-guidelines">
          <div className="guideline-card general">
            <h3>🌟 General Safety Guidelines</h3>
            <ul>
              <li>Stay informed using official channels and Pravha alerts</li>
              <li>Never walk or drive through flood waters</li>
              <li>Turn off electricity at main breaker if instructed</li>
              <li>Move valuables and hazardous materials to higher ground</li>
              <li>Keep emergency kit ready and accessible</li>
            </ul>
          </div>

          <div className="guidelines-grid">
            <div className="guideline-card before">
              <h4>⚠️ Before Flood</h4>
              <ul>
                <li>Prepare emergency kit</li>
                <li>Create evacuation plan</li>
                <li>Store drinking water</li>
                <li>Secure outdoor items</li>
                <li>Identify nearest shelters</li>
              </ul>
            </div>

            <div className="guideline-card during">
              <h4>🚨 During Flood</h4>
              <ul>
                <li>Evacuate if instructed</li>
                <li>Avoid flood water contact</li>
                <li>Use battery radio</li>
                <li>Stay on higher ground</li>
                <li>Follow official guidance</li>
              </ul>
            </div>

            <div className="guideline-card after">
              <h4>✅ After Flood</h4>
              <ul>
                <li>Return only when safe</li>
                <li>Document damage</li>
                <li>Disinfect water sources</li>
                <li>Clean safely</li>
                <li>Check for hazards</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Emergency Kit Checklist */}
        <div className="emergency-kit-section">
          <h3>📦 Emergency Kit Checklist</h3>
          <p>Check off items as you prepare your emergency kit:</p>
          
          <div className="kit-checklist">
            {emergencyKit.map((item) => (
              <div key={item.id} className={`kit-item ${item.checked ? 'checked' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleKitItem(item.id)}
                  />
                  <span className="checkmark"></span>
                  <span className="item-label">{item.label}</span>
                </label>
              </div>
            ))}
          </div>

          <div className="kit-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${(emergencyKit.filter(item => item.checked).length / emergencyKit.length) * 100}%` 
                }}
              ></div>
            </div>
            <p className="progress-text">
              {emergencyKit.filter(item => item.checked).length} of {emergencyKit.length} items ready
            </p>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="emergency-contacts-section">
          <h3>📞 Emergency Contacts</h3>
          <div className="contacts-grid">
            <div className="contact-card">
              <div className="contact-icon">🚨</div>
              <div className="contact-info">
                <div className="contact-name">National Emergency</div>
                <div className="contact-number">
                  <a href="tel:112">112</a>
                </div>
              </div>
            </div>
            <div className="contact-card">
              <div className="contact-icon">🏥</div>
              <div className="contact-info">
                <div className="contact-name">Medical Emergency</div>
                <div className="contact-number">
                  <a href="tel:108">108</a>
                </div>
              </div>
            </div>
            <div className="contact-card">
              <div className="contact-icon">🚒</div>
              <div className="contact-info">
                <div className="contact-name">Fire Department</div>
                <div className="contact-number">
                  <a href="tel:101">101</a>
                </div>
              </div>
            </div>
            <div className="contact-card">
              <div className="contact-icon">👮</div>
              <div className="contact-info">
                <div className="contact-name">Police</div>
                <div className="contact-number">
                  <a href="tel:100">100</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="precautions-actions">
          <h3>🎯 Quick Actions</h3>
          <div className="action-buttons">
            <button 
              className="action-btn primary"
              onClick={() => setActiveTab('shelters')}
            >
              🏥 Find Nearby Shelters
            </button>
            <button 
              className="action-btn secondary"
              onClick={() => setActiveTab('alerts')}
            >
              🚨 Check Active Alerts
            </button>
            <button 
              className="action-btn info"
              onClick={() => window.open('https://mausam.imd.gov.in/', '_blank')}
            >
              🌦️ Weather Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSOS = () => (
    <div className="citizen-content">
      <div className="content-header">
        <h2>🆘 Emergency SOS</h2>
        <p>Send emergency distress signal to authorities</p>
      </div>

      <div className="sos-container">
        <div className="sos-warning">
          <h3>⚠️ Emergency Use Only</h3>
          <p>Use this feature only in case of actual emergencies. False alarms may result in penalties.</p>
        </div>

        <div className="sos-actions">
          <button className="sos-btn primary" onClick={sendSOSRequest}>
            🆘 SEND SOS SIGNAL
          </button>
          
          <div className="sos-info">
            <h4>What happens when you send SOS:</h4>
            <ul>
              <li>Your location is immediately sent to emergency services</li>
              <li>Local authorities are notified</li>
              <li>Rescue teams are dispatched to your location</li>
              <li>You will receive confirmation of the request</li>
            </ul>
          </div>

          <div className="emergency-contacts">
            <h4>Emergency Contacts:</h4>
            <div className="contact-list">
              <div className="contact-item">
                <span>🚨 Emergency Services:</span>
                <a href="tel:112">112</a>
              </div>
              <div className="contact-item">
                <span>🚒 Fire Department:</span>
                <a href="tel:101">101</a>
              </div>
              <div className="contact-item">
                <span>👮 Police:</span>
                <a href="tel:100">100</a>
              </div>
              <div className="contact-item">
                <span>🏥 Medical Emergency:</span>
                <a href="tel:108">108</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    console.log('Current activeTab:', activeTab); // Debug log
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'alerts':
        return renderAlerts();
      case 'shelters':
        return renderShelters();
      case 'precautions':
        console.log('Rendering precautions section'); // Debug log
        return renderPrecautions();
      case 'sos':
        return renderSOS();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="citizen-container">
      {/* Top Header */}
      <div className="citizen-header">
        <div className="header-content">
          <div className="header-icon">🏠</div>
          <div className="header-text">
            <h1>Flood Safety Portal</h1>
            <p>Citizen Emergency Management System</p>
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

      <div className="citizen-layout">
        {renderSidebar()}
        <div className="citizen-main">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CitizenPanel;