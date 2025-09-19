import React, { useState, useEffect } from 'react';

interface Subscriber {
  id: number;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  subscribed_at: string;
  active: boolean;
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
  sent_channels: string[];
  delivery_results?: {
    email_sent: number;
    sms_sent: number;
    push_sent: number;
    total_subscribers: number;
    failed_deliveries: string[];
  };
}

interface AlertStats {
  total_alerts: number;
  high_risk_alerts: number;
  moderate_risk_alerts: number;
  low_risk_alerts: number;
  total_subscribers: number;
  last_alert?: Alert;
}

interface AlertSystemProps {
  onBack?: () => void;
}

const AlertSystem: React.FC<AlertSystemProps> = ({ onBack }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [newSubscriber, setNewSubscriber] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });

  useEffect(() => {
    fetchSubscribers();
    fetchAlerts();
    fetchStats();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8002/subscribers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.subscribers || []);
      } else {
        console.log('Subscribers endpoint returned:', response.status);
        setSubscribers([]);
      }
    } catch (error) {
      console.error('Failed to fetch subscribers:', error);
      setSubscribers([]);
    }
  };

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8002/alerts/history?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8002/alerts/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // API endpoint doesn't exist, set default stats
        setStats({
          total_alerts: 0,
          high_risk_alerts: 0,
          moderate_risk_alerts: 0,
          low_risk_alerts: 0,
          total_subscribers: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({
        total_alerts: 0,
        high_risk_alerts: 0,
        moderate_risk_alerts: 0,
        low_risk_alerts: 0,
        total_subscribers: 0
      });
    }
  };

  const addSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8002/subscribers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSubscriber),
      });

      if (response.ok) {
        setNewSubscriber({ name: '', email: '', phone: '', location: '' });
        setShowAddSubscriber(false);
        fetchSubscribers();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to add subscriber:', error);
    }
  };

  const broadcastTestAlert = async (riskLevel: string, probability: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8002/alerts/broadcast', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          risk_level: riskLevel,
          probability: probability,
          location: 'Test Location'
        }),
      });

      if (response.ok) {
        fetchAlerts();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to broadcast alert:', error);
    }
  };

  // const getRiskColor = (riskLevel: string) => {
  //   switch (riskLevel) {
  //     case 'HIGH': return '#dc2626';
  //     case 'MODERATE': return '#d97706';
  //     case 'LOW': return '#059669';
  //     default: return '#6b7280';
  //   }
  // };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'normal': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1f2937, #374151)', 
        color: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        marginBottom: '24px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <button
          onClick={onBack || (() => window.history.back())}
          style={{
            position: 'absolute',
            left: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>🚨 Alert Management System</h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>Manage subscribers and monitor flood alerts</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Total Alerts</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{stats.total_alerts}</p>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>High Risk Alerts</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{stats.high_risk_alerts}</p>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Subscribers</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{stats.total_subscribers}</p>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Last Alert</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
              {stats.last_alert ? new Date(stats.last_alert.timestamp).toLocaleString() : 'None'}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Subscribers Section */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Subscribers ({subscribers?.length || 0})</h2>
            <button
              onClick={() => setShowAddSubscriber(true)}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              + Add Subscriber
            </button>
          </div>

          {showAddSubscriber && (
            <div style={{ 
              background: '#f9fafb', 
              padding: '20px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Add New Subscriber</h3>
              <form onSubmit={addSubscriber}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={newSubscriber.name}
                    onChange={(e) => setNewSubscriber({...newSubscriber, name: e.target.value})}
                    required
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newSubscriber.email}
                    onChange={(e) => setNewSubscriber({...newSubscriber, email: e.target.value})}
                    required
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={newSubscriber.phone}
                    onChange={(e) => setNewSubscriber({...newSubscriber, phone: e.target.value})}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Location (optional)"
                    value={newSubscriber.location}
                    onChange={(e) => setNewSubscriber({...newSubscriber, location: e.target.value})}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    style={{
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Add Subscriber
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSubscriber(false)}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {(subscribers || []).map((subscriber) => (
              <div key={subscriber.id} style={{ 
                padding: '16px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                marginBottom: '12px',
                background: subscriber.active ? 'white' : '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>{subscriber.name}</h4>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>{subscriber.email}</p>
                    {subscriber.phone && (
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>{subscriber.phone}</p>
                    )}
                    {subscriber.location && (
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>📍 {subscriber.location}</p>
                    )}
                  </div>
                  <span style={{
                    background: subscriber.active ? '#059669' : '#6b7280',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {subscriber.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Section */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Recent Alerts</h2>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280' }}>
                <strong>How to test alerts:</strong> Click the buttons below to send test alerts to all subscribers.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => broadcastTestAlert('HIGH', 0.8)}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Test High Risk
              </button>
              <button
                onClick={() => broadcastTestAlert('MODERATE', 0.5)}
                style={{
                  background: '#d97706',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Test Moderate
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {(alerts || []).map((alert) => (
              <div key={alert.id} style={{ 
                padding: '16px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                marginBottom: '12px',
                borderLeft: `4px solid ${alert.color}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: alert.color }}>
                    {getPriorityIcon(alert.priority)} {alert.title}
                  </h4>
                  <span style={{
                    background: alert.color,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {alert.risk_level}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                  {new Date(alert.timestamp).toLocaleString()} • {alert.location}
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1f2937' }}>
                  Probability: {(alert.probability * 100).toFixed(1)}%
                </p>
                {alert.delivery_results && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    📧 {alert.delivery_results.email_sent} emails • 
                    📱 {alert.delivery_results.sms_sent} SMS • 
                    🔔 {alert.delivery_results.push_sent} push notifications
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertSystem;
