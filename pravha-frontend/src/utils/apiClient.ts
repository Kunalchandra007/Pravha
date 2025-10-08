// API Client with Environment-aware Configuration
import { env } from '../config/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Removed unused interface

class ApiClient {
  private baseUrl: string;
  private useLocalBackend: boolean;
  private debugMode: boolean;

  constructor() {
    this.baseUrl = env.apiUrl;
    this.useLocalBackend = env.useLocalBackend;
    this.debugMode = env.debugMode;
    
    if (this.debugMode) {
      console.log('🔧 API Client initialized:', {
        baseUrl: this.baseUrl,
        useLocalBackend: this.useLocalBackend,
        environment: env.environment
      });
    }
  }

  // Health check for backend connectivity
  async checkBackendHealth(): Promise<boolean> {
    try {
      if (this.debugMode) {
        console.log('🏥 Checking backend health at:', `${this.baseUrl}/health`);
      }
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      } as any);
      
      const isHealthy = response.ok;
      
      if (this.debugMode) {
        console.log('🏥 Backend health check result:', {
          url: this.baseUrl,
          status: response.status,
          healthy: isHealthy
        });
      }
      
      return isHealthy;
    } catch (error) {
      if (this.debugMode) {
        console.error('🏥 Backend health check failed:', error);
      }
      return false;
    }
  }

  // Generic API request method
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (this.debugMode) {
      console.log('🌐 API Request:', {
        url,
        method: options.method || 'GET',
        useLocalBackend: this.useLocalBackend
      });
    }

    try {
      // Add default headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // Add authorization header if token exists
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (this.debugMode) {
        console.log('🌐 API Response:', {
          url,
          status: response.status,
          ok: response.ok
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiClientError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      if (this.debugMode) {
        console.error('🌐 API Request failed:', error);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Authentication methods
  async login(email: string, password: string, role: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyToken(token: string) {
    return this.request('/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Prediction methods
  async predictFloodRisk(predictionData: any) {
    return this.request('/predict', {
      method: 'POST',
      body: JSON.stringify(predictionData),
    });
  }

  // Alert methods
  async getActiveAlerts() {
    return this.request('/alerts/active');
  }

  async getAlertHistory(limit?: number) {
    const endpoint = limit ? `/alerts/history?limit=${limit}` : '/alerts/history';
    return this.request(endpoint);
  }

  async createAlert(alertData: any) {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  // Shelter methods
  async getShelters() {
    return this.request('/shelters');
  }

  async getNearbyShelters(latitude: number, longitude: number, radius?: number) {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
    });
    if (radius) params.append('radius', radius.toString());
    
    return this.request(`/shelters/nearby?${params}`);
  }

  // SOS methods
  async createSOS(sosData: any) {
    return this.request('/sos', {
      method: 'POST',
      body: JSON.stringify(sosData),
    });
  }

  // Admin methods
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getSOSRequests() {
    return this.request('/admin/sos-requests');
  }

  // GIS methods
  async getFloodZones() {
    return this.request('/gis/flood-zones');
  }

  async getSensorData() {
    return this.request('/gis/sensors');
  }

  async predictLocation(locationData: any) {
    return this.request('/gis/predict-location', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }
}

// Custom error class
class ApiClientError extends Error {
  public status?: number;
  public details?: any;

  constructor(message: string, status?: number, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export { ApiClientError as ApiError };
