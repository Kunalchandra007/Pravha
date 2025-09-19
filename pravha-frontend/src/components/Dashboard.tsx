import React, { useState, useEffect } from 'react';
import './Dashboard.css';

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

interface DashboardStats {
  totalAlerts: number;
  activeAlerts: number;
  nearbyShelters: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  lastUpdate: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [weatherData, setWeatherData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch alert stats
      const alertsResponse = await fetch('http://localhost:8002/alerts/stats');
      const alertsData = await alertsResponse.json();
      
      // Fetch recent alerts
      const recentResponse = await fetch('http://localhost:8002/alerts/history?limit=5');
      const recentData = await recentResponse.json();
      
      // Fetch evacuation centers for nearby shelters count
      const sheltersResponse = await fetch('http://localhost:8002/gis/evacuation-centers');
      const sheltersData = await sheltersResponse.json();

      setStats({
        totalAlerts: alertsData.total_alerts || 0,
        activeAlerts: alertsData.high_risk_alerts || 0,
        nearbyShelters: sheltersData.evacuation_centers?.length || 0,
        riskLevel: 'LOW', // This would be calculated based on user location
        lastUpdate: new Date().toLocaleTimeString()
      });

      setRecentAlerts(recentData.alerts || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MODERATE': return '⚡';
      case 'LOW': return '✅';
      default: return 'ℹ️';
    }
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: '🏠', adminOnly: false },
    { id: 'gis', label: 'GIS Mapping', icon: '🗺️', adminOnly: false },
    { id: 'alerts', label: 'Alert Center', icon: '🚨', adminOnly: false },
    { id: 'precautions', label: 'Safety Guide', icon: '🛡️', adminOnly: false },
    { id: 'sos', label: 'Emergency SOS', icon: '🆘', adminOnly: false },
    { id: 'shelters', label: 'Shelter Finder', icon: '🏥', adminOnly: false },
    { id: 'admin', label: 'Admin Panel', icon: '⚙️', adminOnly: true },
    { id: 'analytics', label: 'Analytics', icon: '📊', adminOnly: true },
    { id: 'settings', label: 'Settings', icon: '🔧', adminOnly: false }
  ];

  const filteredNavItems = navigationItems.filter(item => 
    !item.adminOnly || user.role === 'admin'
  );

  const renderOverview = () => (
    <div className="dashboard-content">
      <div className="content-header">
        <h2>Welcome back, {user.name}</h2>
        <p>Here's your flood risk overview and quick actions</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalAlerts || 0}</div>
            <div className="stat-label">Total Alerts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.activeAlerts || 0}</div>
            <div className="stat-label">Active Alerts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏥</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.nearbyShelters || 0}</div>
            <div className="stat-label">Nearby Shelters</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">{getRiskIcon(stats?.riskLevel || 'LOW')}</div>
          <div className="stat-content">
            <div className="stat-number" style={{ color: getRiskColor(stats?.riskLevel || 'LOW') }}>
              {stats?.riskLevel || 'LOW'}
            </div>
            <div className="stat-label">Current Risk</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button 
            className="action-btn secondary"
            onClick={() => onNavigate('gis')}
          >
            <span className="action-icon">🗺️</span>
            <span className="action-label">View Map</span>
          </button>
          <button 
            className="action-btn warning"
            onClick={() => onNavigate('sos')}
          >
            <span className="action-icon">🆘</span>
            <span className="action-label">Emergency SOS</span>
          </button>
          <button 
            className="action-btn info"
            onClick={() => onNavigate('shelters')}
          >
            <span className="action-icon">🏥</span>
            <span className="action-label">Find Shelters</span>
          </button>
          <button 
            className="action-btn primary"
            onClick={() => onNavigate('alerts')}
          >
            <span className="action-icon">🚨</span>
            <span className="action-label">View Alerts</span>
          </button>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="recent-alerts">
        <h3>Recent Alerts</h3>
        <div className="alerts-list">
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert, index) => (
              <div key={index} className="alert-item">
                <div className="alert-icon">{getRiskIcon(alert.risk_level)}</div>
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-meta">
                    {new Date(alert.timestamp).toLocaleString()} • {alert.location}
                  </div>
                </div>
                <div className="alert-risk" style={{ color: getRiskColor(alert.risk_level) }}>
                  {alert.risk_level}
                </div>
              </div>
            ))
          ) : (
            <div className="no-alerts">
              <span className="no-alerts-icon">✅</span>
              <span>No recent alerts</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'gis':
      case 'alerts':
      case 'precautions':
      case 'sos':
      case 'shelters':
      case 'admin':
      case 'analytics':
      case 'settings':
        // Navigate to the specific view
        onNavigate(activeTab);
        return renderOverview(); // Return overview as fallback
      default:
        return (
          <div className="dashboard-content">
            <div className="content-header">
              <h2>{navigationItems.find(item => item.id === activeTab)?.label}</h2>
              <p>This feature is coming soon...</p>
            </div>
            <div className="coming-soon">
              <div className="coming-soon-icon">🚧</div>
              <h3>Feature Under Development</h3>
              <p>This section is being enhanced as part of our ongoing development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🌊</span>
            {!sidebarCollapsed && <span className="logo-text">Pravha</span>}
          </div>
          <button 
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="user-details">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role === 'admin' ? 'Admin' : 'User'}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <span className="logout-icon">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <div className="breadcrumb">
            <span className="breadcrumb-item">Dashboard</span>
            {activeTab !== 'overview' && (
              <>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-item">
                  {navigationItems.find(item => item.id === activeTab)?.label}
                </span>
              </>
            )}
          </div>
          <div className="top-bar-actions">
            <div className="last-update">
              Last updated: {stats?.lastUpdate || 'Never'}
            </div>
            <button 
              className="refresh-btn"
              onClick={fetchDashboardData}
              title="Refresh data"
            >
              🔄
            </button>
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
