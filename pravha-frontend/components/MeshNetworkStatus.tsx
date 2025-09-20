import React, { useState, useEffect } from 'react';
import { meshApi } from '../services/meshApi';
import { MeshNetworkStatus } from '../types/mesh';

const MeshNetworkStatusComponent: React.FC = () => {
  const [status, setStatus] = useState<MeshNetworkStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await meshApi.getStatus();
        setStatus(data.mesh_network);
      } catch (error) {
        console.error('Failed to fetch mesh status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading mesh status...</div>;
  if (!status) return <div>Mesh network unavailable</div>;

  return (
    <div className="mesh-status-panel">
      <h3>Mesh Network Status</h3>
      <div className="status-grid">
        <div className="status-item">
          <span className={`status-indicator ${status.is_active ? 'active' : 'inactive'}`}></span>
          <label>Network Status</label>
          <value>{status.is_active ? 'Active' : 'Inactive'}</value>
        </div>
        <div className="status-item">
          <label>Connected Nodes</label>
          <value>{status.connected_nodes}</value>
        </div>
        <div className="status-item">
          <label>Messages Processed</label>
          <value>{status.messages_received}</value>
        </div>
      </div>
    </div>
  );
};

export default MeshNetworkStatusComponent;