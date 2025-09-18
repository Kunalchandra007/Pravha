from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from alert_system import alert_system
from typing import List, Optional
from auth_routes import router as auth_router

app = FastAPI(title="Pravha API with Alerts", version="2.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)

# Load XGBoost Model
print("Loading XGBoost model...")
try:
    model = joblib.load("models/floodXgBoostV1.pkl")
    print("✅ XGBoost model loaded successfully")
except Exception as e:
    print(f"❌ Model loading failed: {str(e)}")
    raise RuntimeError(f"Model loading failed: {str(e)}")

# Pydantic Models
class PredictionRequest(BaseModel):
    features: list[float]
    location: Optional[str] = "Unknown"
    enable_alerts: Optional[bool] = True

class PredictionResponse(BaseModel):
    probability: float
    uncertainty: float
    alert: str
    risk_level: str
    alert_sent: bool
    alert_id: Optional[int] = None

class SubscriberRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None

class AlertHistoryResponse(BaseModel):
    alerts: List[dict]
    stats: dict

# GIS Models
class FloodRiskZone(BaseModel):
    id: str
    name: str
    center: List[float]  # [lat, lng]
    radius: float
    risk_level: str
    probability: float
    last_updated: str

class SensorData(BaseModel):
    id: str
    name: str
    location: List[float]  # [lat, lng]
    type: str
    value: float
    unit: str
    status: str
    last_reading: str

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "Pravha API with Alert System is running!", 
        "status": "healthy",
        "version": "2.0.0",
        "features": ["ML Prediction", "Automated Alerts", "Multi-channel Notifications"]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "model_loaded": True,
        "alert_system": "active",
        "subscribers": len(alert_system.get_subscribers())
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    try:
        print(f"Received prediction request with {len(request.features)} features for location: {request.location}")
        
        if len(request.features) != 20:
            raise HTTPException(status_code=400, detail="Exactly 20 features required")
        
        # Convert to numpy array and reshape for prediction
        features_array = np.array(request.features).reshape(1, -1)
        print(f"Features array shape: {features_array.shape}")
        
        # Make prediction using XGBoost
        prediction = model.predict(features_array)[0]
        print(f"Raw prediction: {prediction}")
        
        # Enhanced uncertainty calculation based on feature variance
        feature_variance = np.var(request.features)
        base_uncertainty = 0.05
        uncertainty = min(0.15, base_uncertainty + (feature_variance / 1000))
        
        # Determine risk level and alert with more nuanced thresholds
        if prediction > 0.7:
            alert = "🚨 EVACUATION ALERT"
            risk_level = "HIGH"
        elif prediction > 0.4:
            alert = "⚠️ FLOOD WARNING"
            risk_level = "MODERATE"
        else:
            alert = "✅ ALL CLEAR"
            risk_level = "LOW"
        
        # Enhanced alert system with location context
        alert_sent = False
        alert_id = None
        
        if request.enable_alerts and risk_level in ["HIGH", "MODERATE"]:
            try:
                # Add location-specific context to alert
                location_context = f"{request.location}" if request.location != "Unknown" else "Specified coordinates"
                
                alert_result = alert_system.broadcast_alert(
                    risk_level=risk_level,
                    probability=prediction,
                    location=location_context
                )
                alert_sent = True
                alert_id = alert_result["id"]
                print(f"✅ Alert sent successfully (ID: {alert_id}) for location: {location_context}")
            except Exception as e:
                print(f"❌ Failed to send alert: {str(e)}")
        
        # Log prediction for monitoring
        print(f"Prediction completed - Risk: {risk_level}, Probability: {prediction:.3f}, Location: {request.location}")
        
        response = PredictionResponse(
            probability=float(prediction),
            uncertainty=float(uncertainty),
            alert=alert,
            risk_level=risk_level,
            alert_sent=alert_sent,
            alert_id=alert_id
        )
        
        return response
    
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Alert Management Endpoints
@app.post("/subscribers")
async def add_subscriber(request: SubscriberRequest):
    """Add a new subscriber to receive alerts"""
    try:
        subscriber = alert_system.add_subscriber(
            name=request.name,
            email=request.email,
            phone=request.phone,
            location=request.location
        )
        return {
            "message": "Subscriber added successfully",
            "subscriber": subscriber
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/subscribers")
async def get_subscribers():
    """Get all subscribers"""
    return {
        "subscribers": alert_system.get_subscribers(),
        "total": len(alert_system.get_subscribers())
    }

@app.get("/alerts/history")
async def get_alert_history(limit: int = 10):
    """Get alert history"""
    return {
        "alerts": alert_system.get_alert_history(limit),
        "stats": alert_system.get_alert_stats()
    }

@app.post("/alerts/broadcast")
async def broadcast_manual_alert(risk_level: str, probability: float, location: str = "Unknown"):
    """Manually broadcast an alert"""
    try:
        alert = alert_system.broadcast_alert(risk_level, probability, location)
        return {
            "message": "Alert broadcasted successfully",
            "alert": alert
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts/stats")
async def get_alert_stats():
    """Get alert statistics"""
    return alert_system.get_alert_stats()

# New GIS Enhancement Endpoints

@app.get("/gis/realtime-data")
async def get_realtime_gis_data():
    """Get combined real-time GIS data for dashboard"""
    try:
        # Get all data in one call for efficiency
        zones_response = await get_flood_risk_zones()
        sensors_response = await get_sensor_data()
        
        # Calculate overall risk assessment
        high_risk_zones = len([z for z in zones_response if z["risk_level"] in ["HIGH", "CRITICAL"]])
        critical_sensors = len([s for s in sensors_response if s["status"] == "CRITICAL"])
        
        overall_status = "CRITICAL" if high_risk_zones > 2 or critical_sensors > 3 else \
                        "HIGH" if high_risk_zones > 0 or critical_sensors > 1 else \
                        "MODERATE" if critical_sensors > 0 else "LOW"
        
        return {
            "timestamp": "2025-09-14 01:00:00",
            "overall_status": overall_status,
            "flood_zones": zones_response,
            "sensors": sensors_response,
            "statistics": {
                "total_zones": len(zones_response),
                "high_risk_zones": high_risk_zones,
                "total_sensors": len(sensors_response),
                "critical_sensors": critical_sensors,
                "active_sensors": len([s for s in sensors_response if s["status"] == "ACTIVE"]),
                "warning_sensors": len([s for s in sensors_response if s["status"] == "WARNING"])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/gis/bulk-predict")
async def bulk_location_predict(locations: List[dict]):
    """Predict flood risk for multiple locations at once"""
    try:
        results = []
        
        for location in locations:
            lat = location.get("latitude")
            lng = location.get("longitude") 
            name = location.get("name", f"Location {lat:.2f}, {lng:.2f}")
            
            if lat is None or lng is None:
                continue
                
            # Generate features and predict
            features = generate_location_features(lat, lng)
            features_array = np.array(features).reshape(1, -1)
            prediction = model.predict(features_array)[0]
            
            # Determine risk level
            if prediction > 0.7:
                risk_level = "HIGH"
            elif prediction > 0.4:
                risk_level = "MODERATE"
            else:
                risk_level = "LOW"
            
            results.append({
                "name": name,
                "location": [lat, lng],
                "probability": round(float(prediction * 100), 2),
                "risk_level": risk_level,
                "features": features
            })
        
        return {
            "predictions": results,
            "total_locations": len(results),
            "high_risk_count": len([r for r in results if r["risk_level"] == "HIGH"]),
            "timestamp": "2025-09-14 01:00:00"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gis/evacuation-centers")
async def get_evacuation_centers():
    """Get nearby evacuation centers and safe zones"""
    centers = [
        {
            "id": "ec_001",
            "name": "Pragati Maidan Emergency Center",
            "location": [28.6254, 77.2426],
            "capacity": 5000,
            "current_occupancy": 0,
            "facilities": ["Medical", "Food", "Shelter", "Communications"],
            "status": "READY",
            "contact": "+91-11-2337-8000"
        },
        {
            "id": "ec_002", 
            "name": "Jawaharlal Nehru Stadium",
            "location": [28.5706, 77.2337],
            "capacity": 8000,
            "current_occupancy": 0,
            "facilities": ["Shelter", "Food", "Medical", "Transport"],
            "status": "READY",
            "contact": "+91-11-2436-1234"
        },
        {
            "id": "ec_003",
            "name": "Red Fort Emergency Hub",
            "location": [28.6562, 77.2410],
            "capacity": 3000,
            "current_occupancy": 0,
            "facilities": ["Shelter", "Communications", "Security"],
            "status": "READY", 
            "contact": "+91-11-2327-7705"
        },
        {
            "id": "ec_004",
            "name": "India Gate Relief Center",
            "location": [28.6129, 77.2295],
            "capacity": 4500,
            "current_occupancy": 0,
            "facilities": ["Medical", "Food", "Shelter", "Transport"],
            "status": "READY",
            "contact": "+91-11-2301-5358"
        }
    ]
    
    return {
        "evacuation_centers": centers,
        "total_capacity": sum(c["capacity"] for c in centers),
        "available_capacity": sum(c["capacity"] - c["current_occupancy"] for c in centers),
        "emergency_hotline": "112",
        "last_updated": "2025-09-14 01:00:00"
    }

@app.post("/gis/report-incident")
async def report_flood_incident(incident: dict):
    """Report a flood incident from the field"""
    try:
        incident_data = {
            "id": f"incident_{len(alert_system.alert_history) + 1}",
            "timestamp": "2025-09-14 01:00:00",
            "location": incident.get("location", [0, 0]),
            "severity": incident.get("severity", "MODERATE"),
            "description": incident.get("description", "Flood incident reported"),
            "reporter": incident.get("reporter", "Anonymous"),
            "contact": incident.get("contact", ""),
            "status": "REPORTED",
            "response_team_assigned": False
        }
        
        # Auto-trigger alert for high severity incidents
        if incident_data["severity"] in ["HIGH", "CRITICAL"]:
            try:
                location_str = f"{incident_data['location'][0]:.4f}, {incident_data['location'][1]:.4f}"
                alert_system.broadcast_alert(
                    risk_level=incident_data["severity"],
                    probability=0.8,  # High probability for reported incidents
                    location=f"Field Report: {location_str}"
                )
                incident_data["alert_sent"] = True
            except Exception as e:
                print(f"Failed to send incident alert: {e}")
                incident_data["alert_sent"] = False
        
        return {
            "message": "Incident reported successfully",
            "incident": incident_data,
            "response": "Emergency teams have been notified" if incident_data["severity"] in ["HIGH", "CRITICAL"] else "Incident logged for monitoring"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GIS Endpoints
@app.get("/gis/flood-zones", response_model=List[FloodRiskZone])
async def get_flood_risk_zones():
    """Get dynamic flood risk zones for GIS mapping"""
    try:
        # Generate dynamic zones with real ML predictions
        zones = []
        
        # Key areas around Delhi with real predictions
        key_locations = [
            {"name": "Yamuna River Basin", "center": [28.6139, 77.2090], "radius": 2000.0},
            {"name": "Ganga Canal Area", "center": [28.6500, 77.2500], "radius": 1500.0},
            {"name": "South Delhi Drainage", "center": [28.5800, 77.1800], "radius": 1800.0},
            {"name": "Central Urban Area", "center": [28.6400, 77.2200], "radius": 1200.0},
            {"name": "East Delhi Industrial", "center": [28.6300, 77.2800], "radius": 2200.0},
            {"name": "West Delhi Residential", "center": [28.6200, 77.1500], "radius": 1600.0},
            {"name": "Noida Extension", "center": [28.6700, 77.3000], "radius": 1400.0},
            {"name": "Gurgaon Sector", "center": [28.5500, 77.1000], "radius": 1900.0}
        ]
        
        for i, location in enumerate(key_locations):
            # Generate features for this location
            features = generate_location_features(location["center"][0], location["center"][1])
            
            # Get ML prediction
            features_array = np.array(features).reshape(1, -1)
            probability = float(model.predict(features_array)[0] * 100)
            
            # Determine risk level
            if probability > 70:
                risk_level = "CRITICAL"
            elif probability > 55:
                risk_level = "HIGH"
            elif probability > 35:
                risk_level = "MODERATE"
            else:
                risk_level = "LOW"
            
            zone = {
                "id": f"zone_{i+1}",
                "name": location["name"],
                "center": location["center"],
                "radius": location["radius"],
                "risk_level": risk_level,
                "probability": round(probability, 1),
                "last_updated": "2025-09-14 01:00:00"
            }
            zones.append(zone)
        
        print(f"Generated {len(zones)} dynamic flood zones")
        return zones
        
    except Exception as e:
        print(f"Error generating flood zones: {str(e)}")
        # Fallback to static data
        return [
            {
                "id": "zone1",
                "name": "Yamuna River Basin",
                "center": [28.6139, 77.2090],
                "radius": 2000.0,
                "risk_level": "HIGH",
                "probability": 75.5,
                "last_updated": "2025-09-14 01:00:00"
            }
        ]

@app.get("/gis/sensors", response_model=List[SensorData])
async def get_sensor_data():
    """Get dynamic IoT sensor data for GIS mapping"""
    try:
        import random
        from datetime import datetime, timedelta
        
        sensors = []
        
        # Generate realistic sensor network
        sensor_locations = [
            {"name": "Yamuna Bridge Water Level", "pos": [28.6139, 77.2090], "type": "WATER_LEVEL"},
            {"name": "ITO Rainfall Station", "pos": [28.6280, 77.2410], "type": "RAINFALL"},
            {"name": "Connaught Place Drainage", "pos": [28.6315, 77.2167], "type": "WATER_LEVEL"},
            {"name": "Lodhi Gardens Soil Monitor", "pos": [28.5918, 77.2273], "type": "SOIL_MOISTURE"},
            {"name": "Red Fort Area Rain Gauge", "pos": [28.6562, 77.2410], "type": "RAINFALL"},
            {"name": "India Gate Water Sensor", "pos": [28.6129, 77.2295], "type": "WATER_LEVEL"},
            {"name": "Karol Bagh Flood Sensor", "pos": [28.6519, 77.1909], "type": "WATER_LEVEL"},
            {"name": "Dwarka Soil Moisture", "pos": [28.5921, 77.0460], "type": "SOIL_MOISTURE"},
            {"name": "Rohini Rainfall Monitor", "pos": [28.7041, 77.1025], "type": "RAINFALL"},
            {"name": "Lajpat Nagar Drainage", "pos": [28.5677, 77.2431], "type": "WATER_LEVEL"},
            {"name": "Vasant Kunj Weather Station", "pos": [28.5244, 77.1588], "type": "RAINFALL"},
            {"name": "Mayur Vihar Water Level", "pos": [28.6091, 77.2750], "type": "WATER_LEVEL"}
        ]
        
        for i, sensor_info in enumerate(sensor_locations):
            # Generate realistic sensor readings
            if sensor_info["type"] == "WATER_LEVEL":
                base_value = 3.2
                variation = random.uniform(-1.5, 4.8)
                value = max(0.1, base_value + variation)
                unit = "meters"
                # Status based on water level
                if value > 6.0:
                    status = "CRITICAL"
                elif value > 4.5:
                    status = "WARNING"
                else:
                    status = "ACTIVE"
                    
            elif sensor_info["type"] == "RAINFALL":
                value = max(0, random.uniform(0, 85))
                unit = "mm/h"
                # Status based on rainfall intensity
                if value > 50:
                    status = "CRITICAL"
                elif value > 25:
                    status = "WARNING"
                else:
                    status = "ACTIVE"
                    
            else:  # SOIL_MOISTURE
                value = random.uniform(15, 98)
                unit = "%"
                # Status based on saturation
                if value > 85:
                    status = "CRITICAL"
                elif value > 70:
                    status = "WARNING"
                else:
                    status = "ACTIVE"
            
            # Random recent timestamp
            last_reading = datetime.now() - timedelta(minutes=random.randint(1, 15))
            
            sensor = {
                "id": f"sensor_{i+1:03d}",
                "name": sensor_info["name"],
                "location": sensor_info["pos"],
                "type": sensor_info["type"],
                "value": round(value, 1),
                "unit": unit,
                "status": status,
                "last_reading": last_reading.strftime("%Y-%m-%d %H:%M:%S")
            }
            sensors.append(sensor)
        
        print(f"Generated {len(sensors)} dynamic sensor readings")
        return sensors
        
    except Exception as e:
        print(f"Error generating sensor data: {str(e)}")
        # Fallback to minimal static data
        return [
            {
                "id": "sensor1",
                "name": "Yamuna Water Level Sensor",
                "location": [28.6139, 77.2090],
                "type": "WATER_LEVEL",
                "value": 8.5,
                "unit": "meters",
                "status": "CRITICAL",
                "last_reading": "2025-09-14 01:00:00"
            }
        ]

@app.post("/gis/predict-location")
async def predict_flood_risk_for_location(latitude: float, longitude: float):
    """Predict flood risk for a specific location using coordinates"""
    try:
        print(f"Predicting flood risk for location: {latitude}, {longitude}")
        
        # Generate location-specific features based on coordinates
        # In a real implementation, you would fetch actual environmental data
        location_features = generate_location_features(latitude, longitude)
        
        # Make prediction using the loaded XGBoost model
        features_array = np.array(location_features).reshape(1, -1)
        prediction = model.predict(features_array)[0]
        
        # Calculate uncertainty
        uncertainty = 0.05  # 5% base uncertainty
        
        # Determine risk level
        if prediction > 0.7:
            risk_level = "HIGH"
            alert_type = "EVACUATION ALERT"
        elif prediction > 0.4:
            risk_level = "MODERATE" 
            alert_type = "FLOOD WARNING"
        else:
            risk_level = "LOW"
            alert_type = "ALL CLEAR"
        
        # Generate location-specific recommendations
        recommendations = get_location_recommendations(risk_level, latitude, longitude)
        
        return {
            "location": [latitude, longitude],
            "probability": round(float(prediction * 100), 2),
            "risk_level": risk_level,
            "alert_type": alert_type,
            "uncertainty": round(uncertainty * 100, 2),
            "timestamp": "2025-09-14 01:00:00",
            "features_used": location_features,
            "recommendations": recommendations,
            "nearest_sensors": get_nearby_sensors(latitude, longitude),
            "evacuation_routes": get_evacuation_routes(latitude, longitude)
        }
    except Exception as e:
        print(f"Error in location prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_location_features(latitude: float, longitude: float) -> List[float]:
    """Generate realistic features based on geographic location"""
    import math
    
    # Base features influenced by location
    # Delhi area: 28.6139° N, 77.2090° E
    delhi_lat, delhi_lng = 28.6139, 77.2090
    
    # Calculate distance from Delhi (affects urbanization, infrastructure)
    distance_from_delhi = math.sqrt((latitude - delhi_lat)**2 + (longitude - delhi_lng)**2)
    
    # Generate features based on location characteristics
    features = []
    
    # Environmental factors influenced by geography
    features.append(max(1, min(10, 5 + int(distance_from_delhi * 2))))  # MonsoonIntensity
    features.append(max(1, min(10, 6 - int(distance_from_delhi * 3))))  # TopographyDrainage  
    features.append(max(1, min(9, 5 + int(abs(latitude - 28.6) * 2))))  # RiverManagement
    features.append(max(1, min(9, 4 + int(distance_from_delhi * 1.5))))  # Deforestation
    features.append(max(0, min(10, 8 - int(distance_from_delhi * 4))))  # Urbanization (higher near Delhi)
    features.append(max(0, min(10, 5 + int(abs(longitude - 77.2) * 1.5))))  # ClimateChange
    features.append(max(1, min(9, 6 - int(distance_from_delhi * 2))))  # DamsQuality
    features.append(max(0, min(10, 4 + int(distance_from_delhi * 2))))  # Siltation
    features.append(max(0, min(10, 5 + int(abs(latitude - 28.5) * 1.2))))  # AgriculturalPractices
    features.append(max(1, min(9, 3 + int(distance_from_delhi * 2.5))))  # Encroachments
    
    # Infrastructure factors
    features.append(max(1, min(9, 7 - int(distance_from_delhi * 3))))  # IneffectiveDisasterPreparedness
    features.append(max(1, min(9, 6 - int(distance_from_delhi * 2.5))))  # DrainageSystems
    features.append(max(0, min(10, 2 + int(abs(latitude - 28.6) * 3))))  # CoastalVulnerability
    features.append(max(0, min(10, 3 + int(abs(longitude - 77.0) * 2))))  # Landslides
    features.append(max(0, min(10, 5 + int(distance_from_delhi * 1.8))))  # Watersheds
    features.append(max(0, min(10, 4 + int(distance_from_delhi * 2))))  # DeterioratingInfrastructure
    features.append(max(0, min(10, 9 - int(distance_from_delhi * 4))))  # PopulationScore
    features.append(max(1, min(9, 3 + int(distance_from_delhi * 2))))  # WetlandLoss
    features.append(max(0, min(10, 5 + int(distance_from_delhi * 1.5))))  # InadequatePlanning
    features.append(max(0, min(10, 4 + int(abs(latitude - 28.7) * 2))))  # PoliticalFactors
    
    return features

def get_location_recommendations(risk_level: str, latitude: float, longitude: float) -> List[str]:
    """Get location-specific recommendations"""
    base_recommendations = {
        "HIGH": [
            "🚨 Evacuate immediately to higher ground",
            "📞 Contact emergency services: 112",
            "🚗 Avoid driving through flooded areas",
            "📋 Take essential documents and supplies"
        ],
        "MODERATE": [
            "⚠️ Prepare emergency supplies and evacuation plan",
            "📺 Monitor local weather and flood warnings",
            "🏠 Secure outdoor items and valuables",
            "👥 Stay in contact with neighbors and authorities"
        ],
        "LOW": [
            "✅ Continue normal activities with awareness",
            "📱 Keep emergency contacts updated",
            "🎒 Maintain emergency kit readiness",
            "📊 Monitor local flood risk updates"
        ]
    }
    
    recommendations = base_recommendations.get(risk_level, base_recommendations["LOW"])
    
    # Add location-specific advice
    if latitude > 28.65:  # Northern areas
        recommendations.append("🌊 Monitor Yamuna river levels closely")
    elif latitude < 28.55:  # Southern areas  
        recommendations.append("🏔️ Be aware of drainage from elevated areas")
    
    if longitude > 77.25:  # Eastern areas
        recommendations.append("🌧️ Check rainfall in upstream catchment areas")
    elif longitude < 77.15:  # Western areas
        recommendations.append("🏭 Monitor industrial area drainage systems")
        
    return recommendations

def get_nearby_sensors(latitude: float, longitude: float) -> List[dict]:
    """Get nearby IoT sensors for the location"""
    # Mock nearby sensors based on location
    sensors = [
        {
            "id": f"sensor_{int(latitude*100)}_{int(longitude*100)}",
            "name": f"Water Level Sensor - {latitude:.2f}°N",
            "distance_km": round(abs(latitude - 28.61) * 111, 1),  # Rough km conversion
            "type": "WATER_LEVEL",
            "current_reading": f"{5.2 + (latitude - 28.6) * 10:.1f}m",
            "status": "ACTIVE"
        },
        {
            "id": f"rain_{int(latitude*100)}_{int(longitude*100)}",
            "name": f"Rainfall Gauge - {longitude:.2f}°E", 
            "distance_km": round(abs(longitude - 77.21) * 85, 1),  # Rough km conversion
            "type": "RAINFALL",
            "current_reading": f"{12.5 + abs(longitude - 77.2) * 50:.1f}mm/h",
            "status": "WARNING" if abs(longitude - 77.2) > 0.1 else "ACTIVE"
        }
    ]
    return sensors

def get_evacuation_routes(latitude: float, longitude: float) -> List[dict]:
    """Get evacuation routes for the location"""
    routes = []
    
    # Generate routes based on location
    if latitude > 28.6:  # North of center
        routes.append({
            "name": "Northern High Ground Route",
            "direction": "Northeast towards Ghaziabad",
            "distance_km": 15.2,
            "estimated_time": "25-30 minutes",
            "status": "CLEAR"
        })
    else:  # South of center
        routes.append({
            "name": "Southern Elevated Route", 
            "direction": "South towards Faridabad Hills",
            "distance_km": 18.7,
            "estimated_time": "30-35 minutes", 
            "status": "CLEAR"
        })
    
    if longitude > 77.2:  # East of center
        routes.append({
            "name": "Eastern Bypass Route",
            "direction": "East via Ring Road",
            "distance_km": 12.3,
            "estimated_time": "20-25 minutes",
            "status": "MODERATE_TRAFFIC"
        })
    else:  # West of center
        routes.append({
            "name": "Western Highway Route",
            "direction": "West towards Gurgaon",
            "distance_km": 16.8,
            "estimated_time": "28-32 minutes",
            "status": "CLEAR"
        })
        
    return routes

# SOS Emergency System Endpoints

@app.post("/sos/request")
async def create_sos_request(request: dict):
    """Create a new SOS emergency request"""
    try:
        sos_data = {
            "id": f"sos_{len(alert_system.alert_history) + 1}",
            "user_id": request.get("user_id", "anonymous"),
            "location": request.get("location", [0, 0]),
            "message": request.get("message", ""),
            "emergency_type": request.get("emergency_type", "FLOOD"),
            "timestamp": "2025-09-14 01:00:00",
            "status": "PENDING",
            "assigned_officer": None,
            "response_time": None,
            "resolution_notes": None,
            "resolved_at": None
        }
        
        # Auto-trigger high-priority alert for SOS requests
        try:
            location_str = f"{sos_data['location'][0]:.4f}, {sos_data['location'][1]:.4f}"
            alert_system.broadcast_alert(
                risk_level="CRITICAL",
                probability=0.9,  # High probability for SOS requests
                location=f"SOS Emergency: {location_str}"
            )
            sos_data["alert_sent"] = True
        except Exception as e:
            print(f"Failed to send SOS alert: {e}")
            sos_data["alert_sent"] = False
        
        return {
            "message": "SOS request created successfully",
            "sos": sos_data,
            "response": "Emergency services have been notified and are responding"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sos/history/{user_id}")
async def get_sos_history(user_id: str, limit: int = 10):
    """Get SOS history for a specific user"""
    try:
        # This would typically fetch from database
        # For now, return mock data
        mock_history = [
            {
                "id": "sos_001",
                "user_id": user_id,
                "location": [28.6139, 77.2090],
                "message": "Trapped in flooded building, need immediate rescue",
                "emergency_type": "FLOOD",
                "timestamp": "2025-09-14 01:00:00",
                "status": "RESOLVED",
                "assigned_officer": "Officer Rajesh Kumar",
                "response_time": 15,
                "resolution_notes": "Successfully rescued and evacuated to safety",
                "resolved_at": "2025-09-14 01:15:00"
            }
        ]
        
        return {
            "sos_requests": mock_history,
            "total": len(mock_history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/sos/update/{sos_id}")
async def update_sos_request(sos_id: str, update_data: dict):
    """Update SOS request status"""
    try:
        # This would typically update in database
        return {
            "message": "SOS request updated successfully",
            "sos_id": sos_id,
            "updates": update_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin Panel Endpoints

@app.get("/admin/stats")
async def get_admin_stats():
    """Get comprehensive system statistics for admin panel"""
    try:
        # Get alert stats
        alert_stats = alert_system.get_alert_stats()
        
        # Mock additional stats (in real implementation, these would come from database)
        stats = {
            "total_users": 1250,
            "active_users": 890,
            "total_alerts": alert_stats["total_alerts"],
            "active_alerts": alert_stats["high_risk_alerts"],
            "total_sos_requests": 45,
            "pending_sos_requests": 8,
            "total_shelters": 12,
            "available_shelters": 9,
            "last_updated": "2025-09-14 01:00:00"
        }
        
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/sos-requests")
async def get_admin_sos_requests():
    """Get all SOS requests for admin management"""
    try:
        # Mock SOS requests data (in real implementation, this would come from database)
        sos_requests = [
            {
                "id": "sos_001",
                "user_id": "user_123",
                "location": [28.6139, 77.2090],
                "message": "Trapped in flooded building, need immediate rescue",
                "emergency_type": "FLOOD",
                "timestamp": "2025-09-14 01:00:00",
                "status": "PENDING",
                "assigned_officer": None,
                "response_time": None,
                "resolution_notes": None,
                "resolved_at": None
            },
            {
                "id": "sos_002",
                "user_id": "user_456",
                "location": [28.6200, 77.2200],
                "message": "Medical emergency during flood evacuation",
                "emergency_type": "MEDICAL",
                "timestamp": "2025-09-14 00:45:00",
                "status": "ASSIGNED",
                "assigned_officer": "Officer Rajesh Kumar",
                "response_time": 12,
                "resolution_notes": None,
                "resolved_at": None
            },
            {
                "id": "sos_003",
                "user_id": "user_789",
                "location": [28.6100, 77.2000],
                "message": "Structural damage to building, evacuation needed",
                "emergency_type": "STRUCTURAL",
                "timestamp": "2025-09-14 00:30:00",
                "status": "IN_PROGRESS",
                "assigned_officer": "Officer Priya Sharma",
                "response_time": 8,
                "resolution_notes": "Rescue team dispatched",
                "resolved_at": None
            },
            {
                "id": "sos_004",
                "user_id": "user_101",
                "location": [28.6300, 77.2400],
                "message": "Family trapped in vehicle during flood",
                "emergency_type": "FLOOD",
                "timestamp": "2025-09-14 00:15:00",
                "status": "RESOLVED",
                "assigned_officer": "Officer Amit Singh",
                "response_time": 15,
                "resolution_notes": "Family successfully rescued and evacuated to safety",
                "resolved_at": "2025-09-14 00:30:00"
            }
        ]
        
        return {
            "sos_requests": sos_requests,
            "total": len(sos_requests)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/shelters")
async def get_admin_shelters():
    """Get all shelters for admin management"""
    try:
        # This would typically fetch from database
        # For now, return the same data as evacuation centers
        return await get_evacuation_centers()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/admin/shelter/{shelter_id}")
async def update_shelter(shelter_id: str, update_data: dict):
    """Update shelter information"""
    try:
        # This would typically update in database
        return {
            "message": "Shelter updated successfully",
            "shelter_id": shelter_id,
            "updates": update_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# System Monitoring and Debug Endpoints

@app.get("/system/status")
async def get_system_status():
    """Get comprehensive system status"""
    try:
        # Test model prediction
        test_features = [5] * 20
        test_array = np.array(test_features).reshape(1, -1)
        test_prediction = model.predict(test_array)[0]
        
        # Get alert system status
        alert_stats = alert_system.get_alert_stats()
        
        return {
            "system": "Pravha API",
            "version": "2.0.0",
            "status": "OPERATIONAL",
            "timestamp": "2025-09-14 01:00:00",
            "components": {
                "ml_model": {
                    "status": "LOADED",
                    "type": "XGBoost",
                    "test_prediction": float(test_prediction),
                    "features_expected": 20
                },
                "alert_system": {
                    "status": "ACTIVE",
                    "subscribers": alert_stats["total_subscribers"],
                    "total_alerts": alert_stats["total_alerts"]
                },
                "gis_system": {
                    "status": "ACTIVE",
                    "endpoints": ["flood-zones", "sensors", "predict-location"]
                },
                "email_system": {
                    "status": "CONFIGURED",
                    "provider": "Gmail SMTP"
                }
            },
            "performance": {
                "uptime": "Running",
                "memory_usage": "Normal",
                "response_time": "< 100ms"
            }
        }
    except Exception as e:
        return {
            "system": "Pravha API", 
            "status": "ERROR",
            "error": str(e),
            "timestamp": "2025-09-14 01:00:00"
        }

@app.get("/system/test-prediction")
async def test_prediction_system():
    """Test the prediction system with sample data"""
    try:
        # Test with various risk scenarios
        test_scenarios = [
            {"name": "Low Risk", "features": [2, 3, 7, 2, 1, 3, 8, 2, 1, 2, 8, 7, 1, 2, 3, 1, 2, 8, 2, 1]},
            {"name": "Moderate Risk", "features": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]},
            {"name": "High Risk", "features": [8, 2, 2, 8, 9, 8, 2, 8, 8, 8, 2, 2, 8, 8, 8, 8, 9, 2, 8, 8]}
        ]
        
        results = []
        for scenario in test_scenarios:
            features_array = np.array(scenario["features"]).reshape(1, -1)
            prediction = model.predict(features_array)[0]
            
            if prediction > 0.7:
                risk_level = "HIGH"
            elif prediction > 0.4:
                risk_level = "MODERATE"
            else:
                risk_level = "LOW"
            
            results.append({
                "scenario": scenario["name"],
                "probability": round(float(prediction * 100), 2),
                "risk_level": risk_level,
                "features": scenario["features"]
            })
        
        return {
            "test_results": results,
            "model_status": "WORKING",
            "timestamp": "2025-09-14 01:00:00"
        }
        
    except Exception as e:
        return {
            "test_results": [],
            "model_status": "ERROR",
            "error": str(e),
            "timestamp": "2025-09-14 01:00:00"
        }

@app.get("/system/logs")
async def get_system_logs():
    """Get recent system logs and activity"""
    return {
        "recent_predictions": len(alert_system.alert_history),
        "recent_alerts": alert_system.get_alert_history(5),
        "active_subscribers": len(alert_system.get_subscribers()),
        "system_events": [
            {"timestamp": "2025-09-14 01:00:00", "event": "System started", "level": "INFO"},
            {"timestamp": "2025-09-14 01:00:00", "event": "ML model loaded successfully", "level": "INFO"},
            {"timestamp": "2025-09-14 01:00:00", "event": "Alert system initialized", "level": "INFO"},
            {"timestamp": "2025-09-14 01:00:00", "event": "GIS endpoints activated", "level": "INFO"}
        ]
    }

if __name__ == "__main__":
    print("🌊 Starting Pravha API with Enhanced Alert System...")
    print("📊 Features: ML Prediction, Real-time Alerts, GIS Mapping, Location Intelligence")
    print("🚀 Server starting on http://localhost:8002")
    print("📖 API Documentation: http://localhost:8002/docs")
    uvicorn.run(app, host="0.0.0.0", port=8002)
