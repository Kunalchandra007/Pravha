import React, { useState, useEffect } from 'react';
import './ShelterFinder.css';

interface Shelter {
  id: string;
  name: string;
  location: [number, number];
  capacity: number;
  currentOccupancy: number;
  facilities: string[];
  status: 'READY' | 'OCCUPIED' | 'FULL' | 'MAINTENANCE';
  contact: string;
  accessibility: boolean;
  distance?: number;
  estimatedTime?: string;
}

interface ShelterFinderProps {
  user: {
    id: string;
    name: string;
    location?: string;
  };
  onBack?: () => void;
}

const ShelterFinder: React.FC<ShelterFinderProps> = ({ user, onBack }) => {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('distance');
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [showDirections, setShowDirections] = useState(false);

  useEffect(() => {
    fetchShelters();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location (Delhi) if geolocation fails
          setUserLocation([28.6139, 77.2090]);
        }
      );
    } else {
      // Use default location if geolocation is not supported
      setUserLocation([28.6139, 77.2090]);
    }
  };

  const fetchShelters = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8002/gis/evacuation-centers');
      const data = await response.json();
      
      if (response.ok) {
        const sheltersData: Shelter[] = data.evacuation_centers.map((center: any) => ({
          id: center.id,
          name: center.name,
          location: center.location,
          capacity: center.capacity,
          currentOccupancy: center.current_occupancy || 0,
          facilities: center.facilities,
          status: center.status,
          contact: center.contact,
          accessibility: center.accessibility !== false
        }));
        
        // Calculate distances if user location is available
        if (userLocation) {
          sheltersData.forEach(shelter => {
            shelter.distance = calculateDistance(userLocation, shelter.location);
            shelter.estimatedTime = calculateEstimatedTime(shelter.distance);
          });
        }
        
        setShelters(sheltersData);
      } else {
        throw new Error('Failed to fetch shelters');
      }
    } catch (error) {
      console.error('Error fetching shelters:', error);
      setError('Failed to load shelter information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (loc1: [number, number], loc2: [number, number]): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (loc2[0] - loc1[0]) * Math.PI / 180;
    const dLon = (loc2[1] - loc1[1]) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1[0] * Math.PI / 180) * Math.cos(loc2[0] * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateEstimatedTime = (distance: number): string => {
    // Assuming average walking speed of 5 km/h
    const walkingTime = (distance / 5) * 60; // in minutes
    if (walkingTime < 60) {
      return `${Math.round(walkingTime)} min walk`;
    } else {
      const hours = Math.floor(walkingTime / 60);
      const minutes = Math.round(walkingTime % 60);
      return `${hours}h ${minutes}m walk`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY': return '#10b981';
      case 'OCCUPIED': return '#f59e0b';
      case 'FULL': return '#ef4444';
      case 'MAINTENANCE': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY': return '✅';
      case 'OCCUPIED': return '⚠️';
      case 'FULL': return '🚫';
      case 'MAINTENANCE': return '🔧';
      default: return '❓';
    }
  };

  const getOccupancyPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage < 50) return '#10b981';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  const filteredShelters = shelters.filter(shelter => {
    if (filterStatus === 'ALL') return true;
    return shelter.status === filterStatus;
  });

  const sortedShelters = [...filteredShelters].sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return (a.distance || 0) - (b.distance || 0);
      case 'availability':
        return (b.capacity - b.currentOccupancy) - (a.capacity - a.currentOccupancy);
      case 'capacity':
        return b.capacity - a.capacity;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const openDirections = (shelter: Shelter) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${shelter.location[0]},${shelter.location[1]}`;
      window.open(url, '_blank');
    }
  };

  const callShelter = (contact: string) => {
    window.open(`tel:${contact}`, '_self');
  };

  if (loading) {
    return (
      <div className="shelter-finder-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading shelters...</h2>
          <p>Finding evacuation centers near you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shelter-finder-container">
      <div className="shelter-header">
        <div className="header-content">
          <div className="header-icon">🏥</div>
          <div className="header-text">
            <h1>Emergency Shelter Finder</h1>
            <p>Find nearby evacuation centers and emergency shelters</p>
          </div>
        </div>
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      <div className="shelter-content">
        {/* Filters and Controls */}
        <div className="controls-section">
          <div className="controls-card">
            <div className="filter-group">
              <label>Filter by Status:</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Shelters</option>
                <option value="READY">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="FULL">Full</option>
                <option value="MAINTENANCE">Under Maintenance</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sort by:</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="distance">Distance</option>
                <option value="availability">Availability</option>
                <option value="capacity">Capacity</option>
                <option value="name">Name</option>
              </select>
            </div>

            <div className="location-info">
              {userLocation ? (
                <div className="location-status">
                  <span className="location-icon">📍</span>
                  <span>Using your current location</span>
                </div>
              ) : (
                <div className="location-status">
                  <span className="location-icon">📍</span>
                  <span>Using default location (Delhi)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shelters List */}
        <div className="shelters-section">
          {error ? (
            <div className="error-message">
              <div className="error-icon">❌</div>
              <h3>Error Loading Shelters</h3>
              <p>{error}</p>
              <button className="retry-btn" onClick={fetchShelters}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="shelters-header">
                <h2>Available Shelters ({sortedShelters.length})</h2>
                <div className="shelters-summary">
                  <div className="summary-item">
                    <span className="summary-icon">✅</span>
                    <span>{shelters.filter(s => s.status === 'READY').length} Available</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">⚠️</span>
                    <span>{shelters.filter(s => s.status === 'OCCUPIED').length} Occupied</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">🚫</span>
                    <span>{shelters.filter(s => s.status === 'FULL').length} Full</span>
                  </div>
                </div>
              </div>

              <div className="shelters-list">
                {sortedShelters.map((shelter) => (
                  <div key={shelter.id} className="shelter-card">
                    <div className="shelter-header-card">
                      <div className="shelter-info">
                        <h3 className="shelter-name">{shelter.name}</h3>
                        <div className="shelter-status">
                          <span className="status-icon">{getStatusIcon(shelter.status)}</span>
                          <span 
                            className="status-text"
                            style={{ color: getStatusColor(shelter.status) }}
                          >
                            {shelter.status}
                          </span>
                        </div>
                      </div>
                      {shelter.distance && (
                        <div className="shelter-distance">
                          <div className="distance-value">{shelter.distance.toFixed(1)} km</div>
                          <div className="distance-time">{shelter.estimatedTime}</div>
                        </div>
                      )}
                    </div>

                    <div className="shelter-details">
                      <div className="capacity-info">
                        <div className="capacity-bar">
                          <div className="capacity-label">Occupancy</div>
                          <div className="capacity-progress">
                            <div 
                              className="capacity-fill"
                              style={{ 
                                width: `${getOccupancyPercentage(shelter.currentOccupancy, shelter.capacity)}%`,
                                backgroundColor: getOccupancyColor(getOccupancyPercentage(shelter.currentOccupancy, shelter.capacity))
                              }}
                            ></div>
                          </div>
                          <div className="capacity-text">
                            {shelter.currentOccupancy} / {shelter.capacity} people
                          </div>
                        </div>
                      </div>

                      <div className="facilities-info">
                        <div className="facilities-label">Facilities:</div>
                        <div className="facilities-list">
                          {shelter.facilities.map((facility, index) => (
                            <span key={index} className="facility-tag">
                              {facility}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="accessibility-info">
                        <span className={`accessibility-badge ${shelter.accessibility ? 'accessible' : 'not-accessible'}`}>
                          {shelter.accessibility ? '♿ Accessible' : '🚫 Not Accessible'}
                        </span>
                      </div>
                    </div>

                    <div className="shelter-actions">
                      <button 
                        className="action-btn primary"
                        onClick={() => openDirections(shelter)}
                        disabled={!userLocation}
                      >
                        <span className="action-icon">🗺️</span>
                        <span>Get Directions</span>
                      </button>
                      <button 
                        className="action-btn secondary"
                        onClick={() => callShelter(shelter.contact)}
                      >
                        <span className="action-icon">📞</span>
                        <span>Call Shelter</span>
                      </button>
                      <button 
                        className="action-btn info"
                        onClick={() => setSelectedShelter(shelter)}
                      >
                        <span className="action-icon">ℹ️</span>
                        <span>More Info</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Emergency Contacts */}
        <div className="emergency-contacts-section">
          <div className="contacts-card">
            <h2>🚨 Emergency Contacts</h2>
            <div className="contacts-grid">
              <div className="contact-item">
                <div className="contact-icon">🚨</div>
                <div className="contact-info">
                  <div className="contact-name">National Emergency</div>
                  <div className="contact-number">112</div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">🏥</div>
                <div className="contact-info">
                  <div className="contact-name">Medical Emergency</div>
                  <div className="contact-number">108</div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">🚒</div>
                <div className="contact-info">
                  <div className="contact-name">Fire Department</div>
                  <div className="contact-number">101</div>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">👮</div>
                <div className="contact-info">
                  <div className="contact-name">Police</div>
                  <div className="contact-number">100</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shelter Details Modal */}
      {selectedShelter && (
        <div className="modal-overlay" onClick={() => setSelectedShelter(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedShelter.name}</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedShelter(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="modal-section">
                <h3>📍 Location</h3>
                <p>{selectedShelter.location[0].toFixed(6)}, {selectedShelter.location[1].toFixed(6)}</p>
              </div>
              
              <div className="modal-section">
                <h3>👥 Capacity</h3>
                <p>{selectedShelter.currentOccupancy} / {selectedShelter.capacity} people</p>
                <div className="capacity-bar">
                  <div 
                    className="capacity-fill"
                    style={{ 
                      width: `${getOccupancyPercentage(selectedShelter.currentOccupancy, selectedShelter.capacity)}%`,
                      backgroundColor: getOccupancyColor(getOccupancyPercentage(selectedShelter.currentOccupancy, selectedShelter.capacity))
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="modal-section">
                <h3>🏢 Facilities</h3>
                <div className="facilities-list">
                  {selectedShelter.facilities.map((facility, index) => (
                    <span key={index} className="facility-tag">
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="modal-section">
                <h3>📞 Contact</h3>
                <p>{selectedShelter.contact}</p>
              </div>
              
              <div className="modal-section">
                <h3>♿ Accessibility</h3>
                <p>{selectedShelter.accessibility ? 'Wheelchair accessible' : 'Not wheelchair accessible'}</p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-btn primary"
                onClick={() => openDirections(selectedShelter)}
                disabled={!userLocation}
              >
                Get Directions
              </button>
              <button 
                className="modal-btn secondary"
                onClick={() => callShelter(selectedShelter.contact)}
              >
                Call Shelter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShelterFinder;
