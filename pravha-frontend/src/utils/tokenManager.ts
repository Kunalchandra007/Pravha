import { API_ENDPOINTS } from '../config/api';

interface DecodedToken {
  exp: number;
  [key: string]: any;
}

// Helper function to decode JWT token
const decodeJWT = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

// Token Management Utility
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_DATA_KEY = 'user_data';
  private static readonly TOKEN_EXPIRY_TIME_KEY = 'token_expiry_time'; // Unix timestamp in seconds

  // Store tokens and user data
  static setTokens(accessToken: string, refreshToken: string, userData: any, expiresIn: number) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
    const expiryTime = Math.floor(Date.now() / 1000) + expiresIn; // expiresIn is in seconds
    localStorage.setItem(this.TOKEN_EXPIRY_TIME_KEY, expiryTime.toString());
    console.log('Tokens set. Access token expires at:', new Date(expiryTime * 1000));
  }

  // Get access token
  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  // Get refresh token
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // Get user data
  static getUserData(): any | null {
    const userData = localStorage.getItem(this.USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // Check if token is expired
  static isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    const decoded = decodeJWT(token);
    if (!decoded) return true;
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  }

  // Check if access token is expiring soon (within 5 minutes)
  static isAccessTokenExpiringSoon(): boolean {
    const accessToken = this.getAccessToken();
    if (!accessToken) return true;
    const decoded = decodeJWT(accessToken);
    if (!decoded) return true;
    const currentTime = Date.now() / 1000;
    // Check if token expires within the next 5 minutes (300 seconds)
    return decoded.exp - currentTime < 300;
  }

  // Refresh access token
  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      console.log('No refresh token available. User needs to log in.');
      this.logout();
      return null;
    }

    try {
      console.log('Attempting to refresh access token...');
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        },
      });

      if (response.ok) {
        const tokenData = await response.json();
        this.setTokens(
          tokenData.access_token,
          tokenData.refresh_token || refreshToken, // Use new refresh token if provided, else keep old
          tokenData.user,
          tokenData.expires_in
        );
        console.log('Access token refreshed successfully.');
        return tokenData.access_token;
      } else {
        const errorData = await response.json();
        console.error('Failed to refresh token:', errorData.detail || response.statusText);
        this.logout(); // Refresh token might be invalid or expired
        return null;
      }
    } catch (error) {
      console.error('Network error during token refresh:', error);
      this.logout();
      return null;
    }
  }

  // Get valid access token (refresh if needed)
  static async getValidToken(): Promise<string | null> {
    let accessToken = this.getAccessToken();

    if (!accessToken || this.isTokenExpired(accessToken)) {
      console.log('Access token is missing or expired. Attempting to refresh...');
      accessToken = await this.refreshAccessToken();
    } else if (this.isAccessTokenExpiringSoon()) {
      console.log('Access token expiring soon. Proactively refreshing...');
      // Refresh in background, but return current token for immediate use
      this.refreshAccessToken();
    }
    return accessToken;
  }

  // Clear all tokens and user data
  static clearTokens() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_TIME_KEY);
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired(token);
  }

  // Logout user
  static logout() {
    console.log('Logging out user...');
    this.clearTokens();
    // Optionally redirect to login page
    window.location.href = '/login'; // Or your login route
  }
}

// API request wrapper with automatic token refresh
export const apiRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let token = await TokenManager.getValidToken();
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...options, headers });

  // If 401 and not a refresh attempt, try to refresh token and retry once
  if (response.status === 401 && url !== API_ENDPOINTS.AUTH.REFRESH) {
    console.log('API request failed with 401. Attempting to refresh token and retry...');
    token = await TokenManager.refreshAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(url, { ...options, headers }); // Retry the original request
    } else {
      console.error('Token refresh failed after 401. User needs to re-authenticate.');
      TokenManager.logout();
    }
  }

  return response;
};
