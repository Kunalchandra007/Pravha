import React, { useState } from 'react';
import './Auth.css';
import { API_ENDPOINTS } from '../config/api';

interface SignupProps {
  onSignup: (user: any) => void;
  onSwitchToLogin: () => void;
  onBackToLanding: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup, onSwitchToLogin, onBackToLanding }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    role: 'user' as 'user' | 'admin'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          location: formData.location,
          role: formData.role
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        // Auto-login after successful registration
        const loginResponse = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            role: formData.role
          }),
        });

        if (loginResponse.ok) {
          const tokenData = await loginResponse.json();
          localStorage.setItem('auth_token', tokenData.access_token);
          localStorage.setItem('user_data', JSON.stringify(tokenData.user));
          onSignup(tokenData.user);
        } else {
          onSignup(userData);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
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

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];

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
            ← Back to Home
          </button>
          <div className="auth-logo">
            <span className="logo-icon">🌊</span>
            <span className="logo-text">Pravha</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join Pravha to protect your community</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name" className="form-label">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone" className="form-label">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="form-group">
                <label htmlFor="location" className="form-label">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="City, State"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="role" className="form-label">Account Type</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="user">Citizen User - Receive alerts and access flood information</option>
                <option value="admin">Government Admin - Manage alerts and emergency response</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Create a strong password"
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
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill"
                      style={{
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor: strengthColors[passwordStrength - 1] || '#ef4444'
                      }}
                    ></div>
                  </div>
                  <span 
                    className="strength-text"
                    style={{ color: strengthColors[passwordStrength - 1] || '#ef4444' }}
                  >
                    {strengthLabels[passwordStrength - 1] || 'Very Weak'}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-container">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className="checkmark"></span>
                I agree to the{' '}
                <a href="#terms" className="terms-link">Terms of Service</a>
                {' '}and{' '}
                <a href="#privacy" className="terms-link">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              className={`submit-button ${loading ? 'loading' : ''}`}
              disabled={loading || !agreedToTerms}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <span className="button-icon">🚀</span>
                  Create Account
                </>
              )}
            </button>


          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <button 
                className="switch-link"
                onClick={onSwitchToLogin}
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature-item">
            <span className="feature-icon">🛡️</span>
            <span>Secure & Encrypted</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Fast & Reliable</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🌍</span>
            <span>24/7 Monitoring</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
