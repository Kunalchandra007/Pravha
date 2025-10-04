import React, { useState, useEffect, useCallback } from 'react';

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  location: string;
  lastUpdated: string;
}

interface WeatherWidgetProps {
  latitude?: number;
  longitude?: number;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ latitude, longitude }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock weather data for demo purposes
  const mockWeatherData: WeatherData = {
    temperature: 28,
    description: 'Partly Cloudy',
    humidity: 75,
    windSpeed: 12,
    icon: '⛅',
    location: 'Current Location',
    lastUpdated: new Date().toLocaleTimeString()
  };

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For demo purposes, we'll use mock data
      // In a real implementation, you would call a weather API here
      // Example: OpenWeatherMap API, WeatherAPI, etc.
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setWeather(mockWeatherData);
    } catch (err) {
      setError('Failed to fetch weather data');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (latitude && longitude) {
      fetchWeatherData();
    }
  }, [latitude, longitude, fetchWeatherData]);


  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('sun') || desc.includes('clear')) return '☀️';
    if (desc.includes('cloud')) return '⛅';
    if (desc.includes('rain')) return '🌧️';
    if (desc.includes('storm')) return '⛈️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('fog') || desc.includes('mist')) return '🌫️';
    return '🌤️';
  };

  const getWeatherColor = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('storm')) return '#3b82f6';
    if (desc.includes('sun') || desc.includes('clear')) return '#f59e0b';
    if (desc.includes('cloud')) return '#6b7280';
    return '#059669';
  };

  if (loading) {
    return (
      <div className="weather-widget">
        <h3>🌤️ Weather</h3>
        <div className="weather-loading">
          <div className="loading-spinner"></div>
          <p>Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget">
        <h3>🌤️ Weather</h3>
        <div className="weather-error">
          <p>⚠️ {error}</p>
          <button onClick={fetchWeatherData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="weather-widget">
        <h3>🌤️ Weather</h3>
        <div className="weather-unavailable">
          <p>📍 Location required for weather data</p>
          <p className="weather-note">Get your location to see current weather conditions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <h3>🌤️ Weather</h3>
        <span className="weather-location">{weather.location}</span>
      </div>
      
      <div className="weather-main">
        <div className="weather-icon" style={{ color: getWeatherColor(weather.description) }}>
          {getWeatherIcon(weather.description)}
        </div>
        <div className="weather-temp">
          <span className="temperature">{weather.temperature}°C</span>
          <span className="description">{weather.description}</span>
        </div>
      </div>

      <div className="weather-details">
        <div className="weather-detail">
          <span className="detail-icon">💧</span>
          <span className="detail-label">Humidity</span>
          <span className="detail-value">{weather.humidity}%</span>
        </div>
        <div className="weather-detail">
          <span className="detail-icon">💨</span>
          <span className="detail-label">Wind</span>
          <span className="detail-value">{weather.windSpeed} km/h</span>
        </div>
      </div>

      <div className="weather-footer">
        <span className="last-updated">Updated: {weather.lastUpdated}</span>
        <button onClick={fetchWeatherData} className="refresh-btn" title="Refresh weather">
          🔄
        </button>
      </div>
    </div>
  );
};

export default WeatherWidget;
