// Environment Configuration
// Handles different environments: local development, production, etc.

export interface EnvironmentConfig {
  apiUrl: string;
  useLocalBackend: boolean;
  useMongoDB: boolean;
  environment: 'development' | 'production' | 'staging';
  debugMode: boolean;
  survamApiKey: string;
}

// Get environment configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalBackend = process.env.REACT_APP_USE_LOCAL_BACKEND === 'true' || isDevelopment;
  
  return {
    apiUrl: process.env.REACT_APP_API_URL || (isDevelopment ? 'http://localhost:8002' : 'https://pravha-backend.railway.app'),
    useLocalBackend: isLocalBackend,
    useMongoDB: process.env.REACT_APP_USE_MONGODB === 'true' || isDevelopment,
    environment: (process.env.REACT_APP_ENVIRONMENT as any) || (isDevelopment ? 'development' : 'production'),
    debugMode: process.env.REACT_APP_DEBUG_MODE === 'true' || isDevelopment,
    survamApiKey: process.env.REACT_APP_SURVAM_AI_API_KEY || 'sk_vykquazm_WGrJMKiI4Nn8rQKYV2LXv9NQ'
  };
};

// Current environment configuration
export const env = getEnvironmentConfig();

// Log environment info in development
if (env.debugMode) {
  console.log('🌍 Environment Configuration:', env);
}
