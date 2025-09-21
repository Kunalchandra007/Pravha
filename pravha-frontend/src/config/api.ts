// API Configuration
// Replace 'YOUR_SURVAM_AI_API_KEY_HERE' with your actual Survam AI API key

export const SURVAM_AI_API_KEY = 'sk_vykquazm_WGrJMKiI4Nn8rQKYV2LXv9NQ';

// You can also set this via environment variables
// Create a .env file in the frontend root with:
// REACT_APP_SURVAM_AI_API_KEY=your_actual_api_key_here

export const getSurvamApiKey = (): string => {
  // Check environment variable first
  const envKey = process.env.REACT_APP_SURVAM_AI_API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // Fallback to hardcoded key
  return SURVAM_AI_API_KEY;
};
