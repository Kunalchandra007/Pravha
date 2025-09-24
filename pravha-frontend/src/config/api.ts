// API Configuration
// Replace 'YOUR_SURVAM_AI_API_KEY_HERE' with your actual Survam AI API key

export const SURVAM_AI_API_KEY = 'sk_vykquazm_WGrJMKiI4Nn8rQKYV2LXv9NQ';

// Backend API URL configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    VERIFY_TOKEN: `${API_BASE_URL}/auth/verify-token`,
  },
  PREDICTIONS: {
    PREDICT: `${API_BASE_URL}/predict`,
    BULK_PREDICT: `${API_BASE_URL}/predict/bulk`,
  },
  ALERTS: {
    ACTIVE: `${API_BASE_URL}/alerts/active`,
    SUBSCRIBE: `${API_BASE_URL}/alerts/subscribe`,
  },
  SHELTERS: {
    LIST: `${API_BASE_URL}/shelters`,
    NEARBY: `${API_BASE_URL}/shelters/nearby`,
  },
  ADMIN: {
    STATS: `${API_BASE_URL}/admin/stats`,
    SOS_REQUESTS: `${API_BASE_URL}/admin/sos-requests`,
  },
  HEALTH: `${API_BASE_URL}/health`,
};

// You can also set this via environment variables
// Create a .env file in the frontend root with:
// REACT_APP_SURVAM_AI_API_KEY=your_actual_api_key_here
// REACT_APP_API_URL=https://your-backend-url.com

export const getSurvamApiKey = (): string => {
  // Check environment variable first
  const envKey = process.env.REACT_APP_SURVAM_AI_API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // Fallback to hardcoded key
  return SURVAM_AI_API_KEY;
};
