import React, { useState } from 'react';
import './Auth.css';
import { useTranslation } from '../contexts/TranslationContext';
import { getTranslatedText } from '../utils/translations';
import { TokenManager } from '../utils/tokenManager';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8002/auth/login', {
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
