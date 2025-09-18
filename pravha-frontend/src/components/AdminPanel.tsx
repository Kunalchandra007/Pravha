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
  lastUpdated: string;
}

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

interface Alert {
  id: string;
  timestamp: string;
  riskLevel: string;
  probability: number;
  location: string;
  title: string;
  message: string;
  status: string;
  affectedUsers: number;
}

interface Shelter {
  id: string;
  name: string;
  location: [number, number];
  capacity: number;
  currentOccupancy: number;
  status: 'READY' | 'OCCUPIED' | 'FULL' | 'MAINTENANCE';
  facilities: string[];
  contact: string;
}

interface AdminPanelProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  } | null;
  onBack?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequest | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Check if user has admin access
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="access-denied">
          <div className="access-denied-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>You need administrator privileges to access this panel.</p>
          {onBack && (
            <button className="back-btn" onClick={onBack}>
              ← Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch system stats
      const statsResponse = await fetch('http://localhost:8002/admin/stats');
      const statsData = await statsResponse.json();
      
      // Fetch SOS requests
      const sosResponse = await fetch('http://localhost:8002/admin/sos-requests');
      const sosData = await sosResponse.json();
      
      // Fetch alerts
      const alertsResponse = await fetch('http://localhost:8002/alerts/history?limit=20');
      const alertsData = await alertsResponse.json();
      
      // Fetch shelters
      const sheltersResponse = await fetch('http://localhost:8002/gis/evacuation-centers');
      const sheltersData = await sheltersResponse.json();

      setStats(statsData);
      setSosRequests(sosData.sos_requests || []);
      setAlerts(alertsData.alerts || []);
      setShelters(sheltersData.evacuation_centers || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSOSStatus = async (sosId: string, status: string, officer?: string, notes?: string) => {
    try {
      const response = await fetch(`http://localhost:8002/sos/update/${sosId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          assigned_officer: officer,
          resolution_notes: notes,
          resolved_at: status === 'RESOLVED' ? new Date().toISOString() : null
        }),
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
        setShowSOSModal(false);
        setSelectedSOS(null);
      }
    } catch (error) {
      console.error('Failed to update SOS status:', error);
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

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#ef4444';
      case 'MODERATE': return '#f59e0b';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderOverview = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>System Overview</h2>
        <p>Real-time monitoring of flood management system</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalUsers || 0}</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-sub">{stats?.activeUsers || 0} active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalAlerts || 0}</div>
            <div className="stat-label">Total Alerts</div>
            <div className="stat-sub">{stats?.activeAlerts || 0} active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🆘</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalSOSRequests || 0}</div>
            <div className="stat-label">SOS Requests</div>
            <div className="stat-sub">{stats?.pendingSOSRequests || 0} pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏥</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalShelters || 0}</div>
            <div className="stat-label">Shelters</div>
            <div className="stat-sub">{stats?.availableShelters || 0} available</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button 
            className="action-btn primary"
            onClick={() => setActiveTab('sos')}
          >
            <span className="action-icon">🆘</span>
            <span>Manage SOS Requests</span>
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => setActiveTab('alerts')}
          >
            <span className="action-icon">🚨</span>
            <span>Alert Management</span>
          </button>
          <button 
            className="action-btn warning"
            onClick={() => setActiveTab('shelters')}
          >
            <span className="action-icon">🏥</span>
            <span>Shelter Management</span>
          </button>
          <button 
            className="action-btn info"
            onClick={() => setActiveTab('analytics')}
          >
            <span className="action-icon">📊</span>
            <span>System Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderSOSManagement = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>SOS Emergency Management</h2>
        <p>Monitor and manage emergency SOS requests</p>
      </div>

      <div className="sos-requests-list">
        {sosRequests.map((sos) => (
          <div key={sos.id} className="sos-request-card">
            <div className="sos-header">
              <div className="sos-info">
                <h3>SOS Request #{sos.id}</h3>
                <div className="sos-meta">
                  <span className="sos-time">{new Date(sos.timestamp).toLocaleString()}</span>
                  <span className="sos-type">{sos.emergencyType}</span>
                </div>
              </div>
              <div className="sos-status">
                <span className="status-icon">{getStatusIcon(sos.status)}</span>
                <span 
                  className="status-text"
                  style={{ color: getStatusColor(sos.status) }}
                >
                  {sos.status}
                </span>
              </div>
            </div>

            <div className="sos-details">
              <div className="sos-location">
                <strong>Location:</strong> {sos.location[0].toFixed(4)}, {sos.location[1].toFixed(4)}
              </div>
              {sos.message && (
                <div className="sos-message">
                  <strong>Message:</strong> {sos.message}
                </div>
              )}
              {sos.assignedOfficer && (
                <div className="sos-officer">
                  <strong>Assigned Officer:</strong> {sos.assignedOfficer}
                </div>
              )}
              {sos.responseTime && (
                <div className="sos-response-time">
                  <strong>Response Time:</strong> {sos.responseTime} minutes
                </div>
              )}
            </div>

            <div className="sos-actions">
              <button 
                className="action-btn primary"
                onClick={() => {
                  setSelectedSOS(sos);
                  setShowSOSModal(true);
                }}
              >
                Manage Request
              </button>
              <button 
                className="action-btn secondary"
                onClick={() => window.open(`https://www.google.com/maps?q=${sos.location[0]},${sos.location[1]}`, '_blank')}
              >
                View Location
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAlertManagement = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>Alert Management</h2>
        <p>Monitor and manage flood alerts</p>
      </div>

      <div className="alerts-list">
        {alerts.map((alert) => (
          <div key={alert.id} className="alert-card">
            <div className="alert-header">
              <div className="alert-info">
                <h3>{alert.title}</h3>
                <div className="alert-meta">
                  <span className="alert-time">{new Date(alert.timestamp).toLocaleString()}</span>
                  <span className="alert-location">{alert.location}</span>
                </div>
              </div>
              <div className="alert-risk">
                <span 
                  className="risk-level"
                  style={{ color: getRiskColor(alert.riskLevel) }}
                >
                  {alert.riskLevel}
                </span>
                <span className="risk-probability">
                  {(alert.probability * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="alert-details">
              <p>{alert.message}</p>
              <div className="alert-stats">
                <span>Affected Users: {alert.affectedUsers}</span>
                <span>Status: {alert.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderShelterManagement = () => (
    <div className="admin-content">
      <div className="content-header">
        <h2>Shelter Management</h2>
        <p>Monitor evacuation centers and shelter capacity</p>
      </div>

      <div className="shelters-grid">
        {shelters.map((shelter) => (
          <div key={shelter.id} className="shelter-card">
            <div className="shelter-header">
              <h3>{shelter.name}</h3>
              <div className={`shelter-status ${shelter.status.toLowerCase()}`}>
                {shelter.status}
              </div>
            </div>

            <div className="shelter-details">
              <div className="capacity-info">
                <div className="capacity-bar">
                  <div className="capacity-label">Occupancy</div>
                  <div className="capacity-progress">
                    <div 
                      className="capacity-fill"
                      style={{ 
                        width: `${(shelter.currentOccupancy / shelter.capacity) * 100}%`,
                        backgroundColor: shelter.currentOccupancy / shelter.capacity > 0.8 ? '#ef4444' : 
                                       shelter.currentOccupancy / shelter.capacity > 0.5 ? '#f59e0b' : '#10b981'
                      }}
                    ></div>
                  </div>
                  <div className="capacity-text">
                    {shelter.currentOccupancy} / {shelter.capacity}
                  </div>
                </div>
              </div>

              <div className="shelter-facilities">
                <strong>Facilities:</strong>
                <div className="facilities-list">
                  {shelter.facilities.map((facility, index) => (
                    <span key={index} className="facility-tag">
                      {facility}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shelter-contact">
                <strong>Contact:</strong> {shelter.contact}
              </div>
            </div>
          </div>
        ))}
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
      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <div className="header-icon">⚙️</div>
          <div className="header-text">
            <h1>Government Admin Panel</h1>
            <p>Flood management system administration and monitoring</p>
          </div>
        </div>
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="admin-nav">
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
          className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="nav-icon">📈</span>
          <span>Analytics</span>
        </button>
      </div>

      {/* Content */}
      {renderContent()}

      {/* SOS Management Modal */}
      {showSOSModal && selectedSOS && (
        <div className="modal-overlay" onClick={() => setShowSOSModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage SOS Request #{selectedSOS.id}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowSOSModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="sos-details-modal">
                <div className="detail-row">
                  <strong>Emergency Type:</strong> {selectedSOS.emergencyType}
                </div>
                <div className="detail-row">
                  <strong>Location:</strong> {selectedSOS.location[0].toFixed(4)}, {selectedSOS.location[1].toFixed(4)}
                </div>
                <div className="detail-row">
                  <strong>Message:</strong> {selectedSOS.message || 'No additional message'}
                </div>
                <div className="detail-row">
                  <strong>Current Status:</strong> {selectedSOS.status}
                </div>
                {selectedSOS.assignedOfficer && (
                  <div className="detail-row">
                    <strong>Assigned Officer:</strong> {selectedSOS.assignedOfficer}
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-btn primary"
                onClick={() => updateSOSStatus(selectedSOS.id, 'ASSIGNED', 'Officer Rajesh Kumar')}
              >
                Assign Officer
              </button>
              <button 
                className="modal-btn secondary"
                onClick={() => updateSOSStatus(selectedSOS.id, 'IN_PROGRESS')}
              >
                Mark In Progress
              </button>
              <button 
                className="modal-btn success"
                onClick={() => updateSOSStatus(selectedSOS.id, 'RESOLVED', undefined, 'Emergency resolved successfully')}
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
