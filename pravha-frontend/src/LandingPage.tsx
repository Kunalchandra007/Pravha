import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import { useTranslation } from './contexts/TranslationContext';
import { getTranslatedText } from './utils/translations';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup }) => {
  const { currentLanguage } = useTranslation();
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
      description: 'Advanced machine learning models predict flood risks with 86.5% accuracy up to 48 hours in advance',
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
      const targets = { livesSaved: 12500, alertsSent: 45000, coverage: 95, accuracy: 86.5 };
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
  }, [features.length]);

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
              <span className="title-main">{getTranslatedText('landing', 'title', currentLanguage)}</span>
              <span className="title-sub">{getTranslatedText('landing', 'subtitle', currentLanguage)}</span>
            </h1>
            <p className="hero-description">
              {getTranslatedText('landing', 'description', currentLanguage)}
            </p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={onSignup}>
                {getTranslatedText('landing', 'getStarted', currentLanguage)}
              </button>
              <button className="btn-secondary" onClick={onLogin}>
                {getTranslatedText('landing', 'signIn', currentLanguage)}
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">{stats.livesSaved.toLocaleString()}+</div>
                <div className="stat-label">{getTranslatedText('landing', 'livesSaved', currentLanguage)}</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{stats.coverage}%</div>
                <div className="stat-label">{getTranslatedText('landing', 'areaCoverage', currentLanguage)}</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{stats.accuracy}%</div>
                <div className="stat-label">{getTranslatedText('landing', 'predictionAccuracy', currentLanguage)}</div>
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
                      <span className="alert-text">High Risk Zone Detected</span>
                    </div>
                    <div className="alert-item alert-moderate">
                      <span className="alert-text">Moderate Risk Alert</span>
                    </div>
                    <div className="alert-item alert-low">
                      <span className="alert-text">Area Clear - No Risk</span>
                    </div>
                    <div className="alert-item alert-info">
                      <span className="alert-text">Weather Update Available</span>
                    </div>
                    <div className="alert-item alert-high">
                      <span className="alert-text">Water Level Rising</span>
                    </div>
                    <div className="alert-item alert-moderate">
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



      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">PRAVHA Impact & Benefits</h2>
            <p className="section-subtitle">
              Comprehensive analysis of economic and social benefits through AI-driven flood management
            </p>
          </div>
          
          <div className="benefits-grid">
            {/* Impact Analysis */}
            <div className="benefit-card impact-analysis">
              <div className="benefit-header">
                <h3>Project Impact & ROI Analysis</h3>
                <p>Estimated Annual Economic & Social Benefits</p>
              </div>
              <div className="benefit-content">
                <div className="impact-flowchart">
                  <div className="flowchart-title">Impact Distribution Flow</div>
                  <div className="flowchart-container">
                    <div className="flow-start">
                      <div className="flow-node start-node">
                        <div className="node-title">PRAVHA System</div>
                        <div className="node-subtitle">AI-Powered Flood Management</div>
                      </div>
                    </div>
                    
                    <div className="flow-arrows">
                      <div className="arrow-down"></div>
                    </div>
                    
                    <div className="flow-categories">
                      <div className="impact-category economic">
                        <div className="category-header">Economic Prevention</div>
                        <div className="category-impact">40%</div>
                        <div className="category-value">₹10,500 crore</div>
                        <div className="category-description">
                          Proactive damage prevention through early warning systems and infrastructure protection
                        </div>
                        <ul className="category-benefits">
                          <li>Property damage reduction</li>
                          <li>Agricultural loss prevention</li>
                          <li>Infrastructure protection</li>
                          <li>Business continuity savings</li>
                        </ul>
                      </div>
                      
                      <div className="impact-category lifesaving">
                        <div className="category-header">Life-Saving Impact</div>
                        <div className="category-impact">35%</div>
                        <div className="category-value">₹9,187 crore</div>
                        <div className="category-description">
                          Direct human life preservation through timely alerts and emergency response coordination
                        </div>
                        <ul className="category-benefits">
                          <li>960-1,280 lives saved annually</li>
                          <li>Reduced medical emergency costs</li>
                          <li>Prevented injury treatment costs</li>
                          <li>Family economic security</li>
                        </ul>
                      </div>
                      
                      <div className="impact-category efficiency">
                        <div className="category-header">Response Efficiency</div>
                        <div className="category-impact">15%</div>
                        <div className="category-value">₹3,937 crore</div>
                        <div className="category-description">
                          Streamlined emergency operations through AI-driven resource allocation and coordination
                        </div>
                        <ul className="category-benefits">
                          <li>95% faster alert generation</li>
                          <li>60% better resource coordination</li>
                          <li>Optimized emergency management</li>
                        </ul>
                      </div>
                      
                      <div className="impact-category communication">
                        <div className="category-header">Communication Enhancement</div>
                        <div className="category-impact">10%</div>
                        <div className="category-value">₹2,625 crore</div>
                        <div className="category-description">
                          Inclusive communication through multi-language support and mesh network connectivity
                        </div>
                        <ul className="category-benefits">
                          <li>95% population coverage via 12 languages</li>
                          <li>100% connectivity via mesh network</li>
                          <li>Eliminated communication disruption</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flow-arrows">
                      <div className="arrow-down"></div>
                    </div>
                    
                    <div className="flow-end">
                      <div className="flow-node end-node">
                        <div className="node-title">Total Impact</div>
                        <div className="node-value">₹26,250 crore</div>
                        <div className="node-subtitle">Annual Economic & Social Benefits</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost-Benefit Analysis */}
            <div className="benefit-card cost-benefit">
              <div className="benefit-header">
                <h3>Cost-Benefit Analysis</h3>
                <p>High ROI for Disaster Resilience</p>
              </div>
              <div className="benefit-content">
                <div className="roi-flowchart">
                  <div className="flowchart-title">ROI Calculation Flow</div>
                  <div className="roi-flowchart-container">
                    <div className="roi-input-section">
                      <div className="roi-node input-node">
                        <div className="node-title">Investment</div>
                        <div className="node-value">₹550 crore</div>
                        <div className="node-subtitle">Total Implementation Cost</div>
                        <div className="node-breakdown">
                          <div className="breakdown-item">
                            <span className="breakdown-label">Implementation:</span>
                            <span className="breakdown-value">₹500 crore (one-time)</span>
                          </div>
                          <div className="breakdown-item">
                            <span className="breakdown-label">Annual Operations:</span>
                            <span className="breakdown-value">₹50 crore</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="roi-arrow">
                      <div className="arrow-right"></div>
                      <div className="arrow-label">Generates</div>
                    </div>
                    
                    <div className="roi-output-section">
                      <div className="roi-node output-node">
                        <div className="node-title">Annual Benefits</div>
                        <div className="node-value">₹26,250 crore</div>
                        <div className="node-subtitle">Economic & Social Value</div>
                        <div className="benefit-breakdown">
                          <div className="benefit-item">
                            <span className="benefit-label">Direct Economic Savings:</span>
                            <span className="benefit-value">₹15,000 crore</span>
                          </div>
                          <div className="benefit-item">
                            <span className="benefit-label">Life Preservation Value:</span>
                            <span className="benefit-value">₹9,187 crore</span>
                          </div>
                          <div className="benefit-item">
                            <span className="benefit-label">Efficiency Improvements:</span>
                            <span className="benefit-value">₹2,063 crore</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="roi-arrow">
                      <div className="arrow-right"></div>
                      <div className="arrow-label">Results in</div>
                    </div>
                    
                    <div className="roi-result-section">
                      <div className="roi-node result-node">
                        <div className="node-title">Net Annual Benefit</div>
                        <div className="node-value">₹25,700 crore</div>
                        <div className="node-subtitle">After Deducting Annual Costs</div>
                      </div>
                    </div>
                    
                    <div className="roi-arrow">
                      <div className="arrow-right"></div>
                      <div className="arrow-label">ROI</div>
                    </div>
                    
                    <div className="roi-final-section">
                      <div className="roi-node final-node">
                        <div className="node-title">Return on Investment</div>
                        <div className="node-value">47.7X</div>
                        <div className="node-subtitle">Every ₹1 invested returns ₹47.7</div>
                        <div className="roi-explanation">
                          Exceptional ROI demonstrating the high value of proactive disaster management
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lives & Economy Impact */}
            <div className="benefit-card lives-economy">
              <div className="benefit-header">
                <h3>Lives & Economy Impact</h3>
                <p>Estimated Reduction in Casualties & Damage</p>
              </div>
              <div className="benefit-content">
                <div className="impact-flowchart">
                  <div className="flowchart-title">Before vs After PRAVHA Implementation</div>
                  <div className="comparison-flowchart">
                    <div className="before-section">
                      <div className="section-title">Before PRAVHA</div>
                      <div className="before-metrics">
                        <div className="metric-card before-lives">
                          <div className="metric-title">Annual Flood Casualties</div>
                          <div className="metric-value">1,600 lives</div>
                          <div className="metric-description">Average annual flood-related deaths</div>
                        </div>
                        <div className="metric-card before-economy">
                          <div className="metric-title">Economic Damage</div>
                          <div className="metric-value">₹65,625 crore</div>
                          <div className="metric-description">Annual flood-related economic losses</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="arrow-section">
                      <div className="arrow-right-large"></div>
                      <div className="arrow-label">PRAVHA Implementation</div>
                    </div>
                    
                    <div className="after-section">
                      <div className="section-title">After PRAVHA</div>
                      <div className="after-metrics">
                        <div className="metric-card after-lives">
                          <div className="metric-title">Lives Saved</div>
                          <div className="metric-value">70% Reduction</div>
                          <div className="metric-description">960-1,280 lives saved annually</div>
                          <div className="remaining-impact">
                            <div className="remaining-label">Remaining Casualties:</div>
                            <div className="remaining-value">320-640 lives (30%)</div>
                          </div>
                        </div>
                        <div className="metric-card after-economy">
                          <div className="metric-title">Economic Savings</div>
                          <div className="metric-value">60% Reduction</div>
                          <div className="metric-description">₹26,250 crore saved annually</div>
                          <div className="remaining-impact">
                            <div className="remaining-label">Remaining Impact:</div>
                            <div className="remaining-value">₹21,000 crore (40%)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="impact-summary">
                    <div className="summary-title">Total Annual Impact</div>
                    <div className="summary-content">
                      <div className="summary-item">
                        <span className="summary-label">Lives Saved:</span>
                        <span className="summary-value">960-1,280 lives</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Economic Savings:</span>
                        <span className="summary-value">₹26,250 crore</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Combined Value:</span>
                        <span className="summary-value">Priceless human life + ₹26,250 crore</span>
                      </div>
                    </div>
                  </div>
                </div>
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
                <span className="logo-text">Pravha</span>
              </div>
              <p className="footer-description">
                AI-powered flood management system saving lives through early warning and 
                efficient emergency response coordination.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2024 Pravha Flood Management System. All rights reserved.
            </p>
            <div className="footer-social">
              <span className="made-by">Made by Cyberknights</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
