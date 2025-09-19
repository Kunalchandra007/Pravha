import React, { useState, useEffect } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [stats, setStats] = useState({
    livesSaved: 0,
    alertsSent: 0,
    coverage: 0,
    accuracy: 0
  });

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Prediction',
      description: 'Advanced machine learning models predict flood risks with 85% accuracy up to 48 hours in advance',
      color: '#3B82F6'
    },
    {
      icon: '🚨',
      title: 'Real-time Alerts',
      description: 'Instant multi-channel notifications via SMS, email, and mobile push notifications',
      color: '#EF4444'
    },
    {
      icon: '🗺️',
      title: 'GIS Mapping',
      description: 'Interactive maps showing flood zones, evacuation routes, and real-time sensor data',
      color: '#10B981'
    },
    {
      icon: '🏥',
      title: 'Emergency Response',
      description: 'Automated coordination with emergency services and evacuation center management',
      color: '#F59E0B'
    }
  ];



  useEffect(() => {
    // Animate stats on load
    const animateStats = () => {
      const targets = { livesSaved: 12500, alertsSent: 45000, coverage: 95, accuracy: 85 };
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;

      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);

        setStats({
          livesSaved: Math.floor(targets.livesSaved * easeOut),
          alertsSent: Math.floor(targets.alertsSent * easeOut),
          coverage: Math.floor(targets.coverage * easeOut),
          accuracy: Math.floor(targets.accuracy * easeOut)
        });

        if (step >= steps) {
          clearInterval(timer);
        }
      }, stepDuration);
    };

    setTimeout(animateStats, 1000);

    // Auto-rotate features
    const featureTimer = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => clearInterval(featureTimer);
  }, []);

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="floating-elements">
            <div className="wave wave-1"></div>
            <div className="wave wave-2"></div>
            <div className="wave wave-3"></div>
          </div>
        </div>
        
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="title-main">Pravha</span>
              <span className="title-sub">Flood Management System</span>
            </h1>
            <p className="hero-description">
              AI-powered flood forecasting and emergency response system that predicts, monitors, 
              and coordinates responses to flooding events, saving lives through early warning 
              and efficient response coordination.
            </p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={onSignup}>
                <span className="btn-icon">🚀</span>
                Get Started Free
              </button>
              <button className="btn-secondary" onClick={onLogin}>
                <span className="btn-icon">🔐</span>
                Sign In
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">{stats.livesSaved.toLocaleString()}+</div>
                <div className="stat-label">Lives Saved</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{stats.coverage}%</div>
                <div className="stat-label">Area Coverage</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{stats.accuracy}%</div>
                <div className="stat-label">Prediction Accuracy</div>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="preview-title">Pravha Dashboard</span>
              </div>
              <div className="preview-content">
                <div className="preview-map">
                  <div className="map-marker marker-1"></div>
                  <div className="map-marker marker-2"></div>
                  <div className="map-marker marker-3"></div>
                  <div className="map-pulse"></div>
                </div>
                <div className="preview-alerts">
                  <div className="alerts-scroll">
                    <div className="alert-item alert-high">
                      <span className="alert-icon">🚨</span>
                      <span className="alert-text">High Risk Zone Detected</span>
                    </div>
                    <div className="alert-item alert-moderate">
                      <span className="alert-icon">⚠️</span>
                      <span className="alert-text">Moderate Risk Alert</span>
                    </div>
                    <div className="alert-item alert-low">
                      <span className="alert-icon">✅</span>
                      <span className="alert-text">Area Clear - No Risk</span>
                    </div>
                    <div className="alert-item alert-info">
                      <span className="alert-icon">ℹ️</span>
                      <span className="alert-text">Weather Update Available</span>
                    </div>
                    <div className="alert-item alert-high">
                      <span className="alert-icon">🌊</span>
                      <span className="alert-text">Water Level Rising</span>
                    </div>
                    <div className="alert-item alert-moderate">
                      <span className="alert-icon">🌧️</span>
                      <span className="alert-text">Heavy Rainfall Expected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Powerful Features</h2>
            <p className="section-subtitle">
              Comprehensive flood management tools for citizens and government agencies
            </p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`feature-card ${currentFeature === index ? 'active' : ''}`}
                style={{ '--feature-color': feature.color } as React.CSSProperties}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-indicator"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="impact-section">
        <div className="container">
          <div className="impact-content">
            <div className="impact-text">
              <h2 className="impact-title">Making a Real Impact</h2>
              <p className="impact-description">
                Pravha has been deployed across multiple regions, providing critical flood 
                management capabilities that have saved thousands of lives and prevented 
                millions in property damage.
              </p>
              <div className="impact-stats">
                <div className="impact-stat">
                  <div className="impact-number">{stats.alertsSent.toLocaleString()}+</div>
                  <div className="impact-label">Alerts Sent</div>
                </div>
                <div className="impact-stat">
                  <div className="impact-number">₹2.5Cr+</div>
                  <div className="impact-label">Damage Prevented</div>
                </div>
                <div className="impact-stat">
                  <div className="impact-number">24-48hrs</div>
                  <div className="impact-label">Early Warning</div>
                </div>
              </div>
            </div>
            <div className="impact-visual">
              <div className="impact-chart">
                <div className="chart-bar" style={{ height: '80%' }}>
                  <span className="chart-label">2023</span>
                </div>
                <div className="chart-bar" style={{ height: '60%' }}>
                  <span className="chart-label">2022</span>
                </div>
                <div className="chart-bar" style={{ height: '40%' }}>
                  <span className="chart-label">2021</span>
                </div>
                <div className="chart-bar" style={{ height: '20%' }}>
                  <span className="chart-label">2020</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Protect Your Community?</h2>
            <p className="cta-description">
              Join thousands of users who trust Pravha for comprehensive flood management
            </p>
            <div className="cta-buttons">
              <button className="btn-primary btn-large" onClick={onSignup}>
                <span className="btn-icon">🚀</span>
                Start Free Trial
              </button>
              <button className="btn-outline btn-large" onClick={onLogin}>
                <span className="btn-icon">🔐</span>
                Sign In
              </button>
            </div>
            <div className="cta-features">
              <div className="cta-feature">
                <span className="cta-feature-icon">✅</span>
                <span>Free for citizens</span>
              </div>
              <div className="cta-feature">
                <span className="cta-feature-icon">✅</span>
                <span>No setup required</span>
              </div>
              <div className="cta-feature">
                <span className="cta-feature-icon">✅</span>
                <span>24/7 monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="logo-icon">🌊</span>
                <span className="logo-text">Pravha</span>
              </div>
              <p className="footer-description">
                AI-powered flood management system saving lives through early warning and 
                efficient emergency response coordination.
              </p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4 className="footer-title">Product</h4>
                <ul className="footer-list">
                  <li><a href="#features">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#api">API</a></li>
                  <li><a href="#docs">Documentation</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4 className="footer-title">Support</h4>
                <ul className="footer-list">
                  <li><a href="#help">Help Center</a></li>
                  <li><a href="#contact">Contact Us</a></li>
                  <li><a href="#status">System Status</a></li>
                  <li><a href="#emergency">Emergency</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4 className="footer-title">Company</h4>
                <ul className="footer-list">
                  <li><a href="#about">About</a></li>
                  <li><a href="#careers">Careers</a></li>
                  <li><a href="#privacy">Privacy</a></li>
                  <li><a href="#terms">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2024 Pravha Flood Management System. All rights reserved.
            </p>
            <div className="footer-social">
              <a href="#twitter" className="social-link">🐦</a>
              <a href="#linkedin" className="social-link">💼</a>
              <a href="#github" className="social-link">💻</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
