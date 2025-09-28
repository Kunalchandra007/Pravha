import React, { useState } from 'react';
import './Auth.css';
import { useTranslation } from '../contexts/TranslationContext';
import { getTranslatedText } from '../utils/translations';
import { TokenManager } from '../utils/tokenManager';
import { API_ENDPOINTS } from '../config/api';

interface LoginProps {
  onLogin: (user: any) => void;
  onSwitchToSignup: () => void;
  onBackToLanding: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToSignup, onBackToLanding }) => {
  const { currentLanguage } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Test credentials for bypass authentication
  const TEST_CREDENTIALS = {
    user: {
      email: 'user@pravha.com',
      password: 'user12345',
      role: 'user'
    },
    admin: {
      email: 'admin@pravaha.com',
      password: 'admin123',
      role: 'admin'
    }
  };

  // Check if credentials match test credentials
  const isTestCredentials = (email: string, password: string, role: string) => {
    const testCred = TEST_CREDENTIALS[role as keyof typeof TEST_CREDENTIALS];
    return testCred && testCred.email === email && testCred.password === password;
  };

  // Bypass authentication for test credentials
  const handleTestLogin = (role: 'user' | 'admin') => {
    const testUser = {
      id: role === 'admin' ? 'admin-test-id' : 'user-test-id',
      email: TEST_CREDENTIALS[role].email,
      role: role,
      name: role === 'admin' ? 'Test Admin' : 'Test User',
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    // Create mock tokens for test login
    const mockTokenData = {
      access_token: `test-${role}-token-${Date.now()}`,
      refresh_token: `test-${role}-refresh-${Date.now()}`,
      user: testUser,
      expires_in: 3600
    };

    // Store tokens using TokenManager
    TokenManager.setTokens(
      mockTokenData.access_token,
      mockTokenData.refresh_token,
      mockTokenData.user,
      mockTokenData.expires_in
    );

    console.log(`🎭 Bypass authentication successful for ${role} role`);
    onLogin(testUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check if test credentials are being used
    if (isTestCredentials(formData.email, formData.password, formData.role)) {
      console.log('🎭 Test credentials detected - bypassing authentication');
      setLoading(false);
      handleTestLogin(formData.role);
      return;
    }

    // Debug: Log the API URL being used
    console.log('🔍 API URL being used:', API_ENDPOINTS.AUTH.LOGIN);
    console.log('🔍 Environment variable:', process.env.REACT_APP_API_URL);

    // Test Railway backend health first
    try {
      console.log('🏥 Testing Railway backend health...');
      const healthResponse = await fetch('https://pravha-production.up.railway.app/health');
      console.log('🏥 Health check response:', healthResponse.status);
      if (!healthResponse.ok) {
        throw new Error(`Railway backend health check failed: ${healthResponse.status}`);
      }
    } catch (healthError) {
      console.error('🏥 Railway backend health check failed:', healthError);
      setError(`Railway backend is not responding. Please check if it's running. Error: ${healthError.message}`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const tokenData = await response.json();
        // Store tokens using TokenManager
        TokenManager.setTokens(
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.user,
          tokenData.expires_in
        );
        
        onLogin(tokenData.user);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-wave wave-1"></div>
        <div className="auth-wave wave-2"></div>
        <div className="auth-wave wave-3"></div>
      </div>

      <div className="auth-content">
        <div className="auth-header">
          <button 
            className="back-button"
            onClick={onBackToLanding}
          >
            {getTranslatedText('login', 'backToHome', currentLanguage)}
          </button>
          <div className="auth-logo">
            <span className="logo-icon">🌊</span>
            <span className="logo-text">{getTranslatedText('landing', 'title', currentLanguage)}</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">{getTranslatedText('login', 'welcomeBack', currentLanguage)}</h1>
            <p className="auth-subtitle">{getTranslatedText('login', 'signInToAccount', currentLanguage)}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {/* Demo Credentials Section */}
            <div className="demo-credentials">
              <h3 className="demo-title">🧪 Testing Credentials</h3>
              <div className="demo-accounts">
                <div className="demo-account">
                  <h4>👤 Citizen User</h4>
                  <p><strong>Email:</strong> user@pravha.com</p>
                  <p><strong>Password:</strong> user12345</p>
                  <button 
                    type="button" 
                    className="demo-button"
                    onClick={() => {
                      setFormData({
                        email: 'user@pravha.com',
                        password: 'user12345',
                        role: 'user'
                      });
                      // Direct bypass login for demo
                      handleTestLogin('user');
                    }}
                  >
                    Use Citizen Credentials
                  </button>
                </div>
                <div className="demo-account">
                  <h4>👨‍💼 Admin Panel</h4>
                  <p><strong>Email:</strong> admin@pravaha.com</p>
                  <p><strong>Password:</strong> admin123</p>
                  <button 
                    type="button" 
                    className="demo-button admin"
                    onClick={() => {
                      setFormData({
                        email: 'admin@pravaha.com',
                        password: 'admin123',
                        role: 'admin'
                      });
                      // Direct bypass login for demo
                      handleTestLogin('admin');
                    }}
                  >
                    Use Admin Credentials
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">{getTranslatedText('login', 'emailAddress', currentLanguage)}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder={getTranslatedText('login', 'enterEmail', currentLanguage)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">{getTranslatedText('login', 'password', currentLanguage)}</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder={getTranslatedText('login', 'enterPassword', currentLanguage)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="role" className="form-label">{getTranslatedText('login', 'accountType', currentLanguage)}</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="user">Citizen User</option>
                <option value="admin">Government Admin</option>
              </select>
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" />
                <span className="checkmark"></span>
                {getTranslatedText('login', 'rememberMe', currentLanguage)}
              </label>
              <a href="#forgot" className="forgot-link">{getTranslatedText('login', 'forgotPassword', currentLanguage)}</a>
            </div>

            <button
              type="submit"
              className={`submit-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Signing In...
                </>
              ) : (
                <>
                  <span className="button-icon">🔐</span>
                  {getTranslatedText('login', 'signInButton', currentLanguage)}
                </>
              )}
            </button>


          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <button 
                className="switch-link"
                onClick={onSwitchToSignup}
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature-item">
            <span className="feature-icon">🛡️</span>
            <span>{getTranslatedText('common', 'secure', currentLanguage)}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>{getTranslatedText('common', 'fastReliable', currentLanguage)}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🌍</span>
            <span>{getTranslatedText('common', 'monitoring', currentLanguage)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
