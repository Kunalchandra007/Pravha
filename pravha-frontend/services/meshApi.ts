import axios from 'axios';

const MESH_API_BASE = process.env.REACT_APP_MESH_API_URL || 'http://localhost:8002';

export const meshApi = {
  // Get mesh network status
  async getStatus() {
    const response = await axios.get(`${MESH_API_BASE}/api/mesh/status`);
    return response.data;
  },

  // Get coverage data
  async getCoverage() {
    const response = await axios.get(`${MESH_API_BASE}/api/mesh/coverage`);
    return response.data;
  },

  // Get emergency reports
  async getEmergencyReports() {
    const response = await axios.get(`${MESH_API_BASE}/api/mesh/emergency-reports`);
    return response.data;
  },

  // Broadcast alert
  async broadcastAlert(alertData: any) {
    const response = await axios.post(`${MESH_API_BASE}/api/mesh/broadcast-alert`, alertData);
    return response.data;
  }
};