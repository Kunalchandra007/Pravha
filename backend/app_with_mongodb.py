"""
Enhanced Pravha API with MongoDB Integration
Complete flood management system with database persistence
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import joblib
import numpy as np
import uvicorn
import jwt
from datetime import datetime, timedelta
import os
from contextlib import asynccontextmanager

# Import our database modules
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database_config import db_config, check_database_health, get_collection
from database_service import DatabaseService
from alert_system import alert_system

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

# Pydantic Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    location: Optional[str] = None
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AlertCreate(BaseModel):
    alert_type: str
    severity: str
    location: str
    message: str
    affected_users: List[str] = []

class SOSCreate(BaseModel):
    location: List[float]  # [latitude, longitude]
    message: Optional[str] = None
    emergency_type: str = "FLOOD"
    user_id: str

class ShelterCreate(BaseModel):
    name: str
    address: str
    location: List[float]  # [latitude, longitude]
    capacity: int
    contact: str
    phone: str
    facilities: List[str] = []

class PredictionRequest(BaseModel):
    features: List[float]
    location: Optional[str] = "Unknown"
    enable_alerts: Optional[bool] = True
    user_id: Optional[str] = None

class SubscriberRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None

# Database lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Pravha API with MongoDB...")
    
    # Connect to MongoDB
    connected = await db_config.connect_to_mongo()
    if not connected:
        raise Exception("Failed to connect to MongoDB")
    
    # Load ML Model
    try:
        app.state.model = joblib.load("models/floodXgBoostV1.pkl")
        print("✅ XGBoost model loaded successfully")
    except Exception as e:
        print(f"❌ Model loading failed: {str(e)}")
        raise RuntimeError(f"Model loading failed: {str(e)}")
    
    # Create default admin user if it doesn't exist
    try:
        admin_user = await DatabaseService.get_user_by_email("admin@pravaha.com")
        if not admin_user:
            admin_data = {
                "name": "Government Administrator",
                "email": "admin@pravaha.com",
                "password": "admin12345",
                "role": "admin",
                "phone": "+91-11-2345-6789",
                "location": "New Delhi, India"
            }
            await DatabaseService.create_user(admin_data)
            print("✅ Default admin user created (admin@pravaha.com / admin12345)")
        else:
            print("✅ Admin user already exists")
    except Exception as e:
        print(f"⚠️ Failed to create admin user: {str(e)}")
    
    # Create default regular user if it doesn't exist
    try:
        test_user = await DatabaseService.get_user_by_email("user@pravaha.com")
        if not test_user:
            user_data = {
                "name": "Citizen User",
                "email": "user@pravaha.com",
                "password": "user12345",
                "role": "user",
                "phone": "+91-11-9876-5432",
                "location": "Mumbai, India"
            }
            await DatabaseService.create_user(user_data)
            print("✅ Default test user created (user@pravaha.com / user12345)")
        else:
            print("✅ Test user already exists")
    except Exception as e:
        print(f"⚠️ Failed to create test user: {str(e)}")
    
    print("✅ Pravha API startup complete")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Pravha API...")
    await db_config.close_mongo_connection()
    print("✅ Pravha API shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Pravha Flood Management API",
    description="Complete flood management system with MongoDB integration",
    version="3.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Helper Functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"🔐 Attempting to decode JWT token...")
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        print(f"🔐 JWT decoded successfully. User ID: {user_id}, Email: {email}")
        
        if user_id is None:
            print("❌ User ID is None in JWT payload")
            raise credentials_exception
        
        # Get user from database
        print(f"🔍 Looking up user by email: {email}")
        user = await DatabaseService.get_user_by_email(email)
        if user is None:
            print(f"❌ User not found in database: {email}")
            raise credentials_exception
        
        print(f"✅ User authenticated successfully: {user.get('name', 'Unknown')}")
        return user
    except jwt.PyJWTError as e:
        print(f"❌ JWT decode error: {str(e)}")
        raise credentials_exception
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        raise credentials_exception

# API Endpoints

@app.get("/")
async def root():
    return {
        "message": "Pravha Flood Management API with MongoDB",
        "status": "healthy",
        "version": "3.0.0",
        "features": [
            "ML Prediction with Database Storage",
            "User Authentication & Management",
            "Alert System with Persistence",
            "SOS Request Management",
            "Shelter Management",
            "Real-time Sensor Data",
            "MongoDB Integration"
        ]
    }

@app.get("/health")
async def health_check():
    db_health = await check_database_health()
    return {
        "status": "healthy",
        "model_loaded": hasattr(app.state, 'model'),
        "database": db_health,
        "alert_system": "active",
        "timestamp": datetime.now()
    }

@app.get("/debug/users")
async def debug_users():
    """Debug endpoint to check what users exist (remove in production)"""
    try:
        users = await DatabaseService.get_all_users()
        return {
            "total_users": len(users),
            "users": [{"email": user["email"], "role": user["role"], "name": user["name"]} for user in users]
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/debug/reset-admin")
async def reset_admin_user():
    """Debug endpoint to reset admin user (remove in production)"""
    try:
        # Delete existing admin user if exists
        collection = await get_collection(db_config.USERS_COLLECTION)
        await collection.delete_one({"email": "admin@pravha.gov.in"})
        
        # Create new admin user
        admin_data = {
            "name": "System Administrator",
            "email": "admin@pravha.gov.in",
            "password": "admin123",
            "role": "admin",
            "phone": "+91-11-2345-6789",
            "location": "New Delhi, India"
        }
        await DatabaseService.create_user(admin_data)
        return {"message": "Admin user reset successfully", "email": "admin@pravha.gov.in", "password": "admin123"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/debug/fix-database")
async def fix_database():
    """Debug endpoint to fix database issues (remove in production)"""
    try:
        collection = await get_collection(db_config.USERS_COLLECTION)
        
        # Drop problematic indexes
        try:
            await collection.drop_index("username_1")
            print("✅ Dropped username_1 index")
        except Exception as e:
            print(f"⚠️ Could not drop username_1 index: {str(e)}")
        
        # Clear all users
        await collection.delete_many({})
        print("✅ Cleared all users")
        
        # Recreate proper indexes
        await collection.create_index("email", unique=True)
        await collection.create_index("role")
        print("✅ Recreated proper indexes")
        
        # Create admin user
        admin_data = {
            "name": "System Administrator",
            "email": "admin@pravha.gov.in",
            "password": "admin123",
            "role": "admin",
            "phone": "+91-11-2345-6789",
            "location": "New Delhi, India"
        }
        await DatabaseService.create_user(admin_data)
        print("✅ Created admin user")
        
        # Create test user
        user_data = {
            "name": "Test User",
            "email": "user@pravha.gov.in",
            "password": "user123",
            "role": "user",
            "phone": "+91-11-9876-5432",
            "location": "Mumbai, India"
        }
        await DatabaseService.create_user(user_data)
        print("✅ Created test user")
        
        return {
            "message": "Database fixed successfully",
            "admin": {"email": "admin@pravha.gov.in", "password": "admin123"},
            "user": {"email": "user@pravha.gov.in", "password": "user123"}
        }
    except Exception as e:
        return {"error": str(e)}

# Authentication Endpoints
@app.post("/auth/register")
async def register_user(user: UserCreate):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await DatabaseService.get_user_by_email(user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        user_data = user.dict()
        created_user = await DatabaseService.create_user(user_data)
        
        # Remove sensitive data from response
        if 'password_hash' in created_user:
            del created_user['password_hash']
        
        return {
            "message": "User registered successfully",
            "user": created_user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
async def login_user(user_login: UserLogin):
    """Login user and return JWT token"""
    try:
        print(f"🔐 Login attempt for: {user_login.email}")
        
        # Verify user credentials
        user = await DatabaseService.verify_user_password(user_login.email, user_login.password)
        if not user:
            print(f"❌ Login failed for: {user_login.email} - Invalid credentials")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        print(f"✅ Login successful for: {user_login.email} (Role: {user.get('role', 'unknown')})")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["id"], "email": user["email"], "role": user["role"]},
            expires_delta=access_token_expires
        )
        
        # Remove sensitive data
        if 'password_hash' in user:
            del user['password_hash']
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# User Management Endpoints
@app.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await DatabaseService.get_all_users()
    return {"users": users, "total": len(users)}

# Prediction Endpoints
@app.post("/predict")
async def predict_flood_risk(request: PredictionRequest, current_user: dict = Depends(get_current_user)):
    """Predict flood risk and store in database"""
    try:
        print(f"🔮 Received prediction request with {len(request.features)} features for location: {request.location}")
        
        if len(request.features) != 20:
            print(f"❌ Feature count mismatch: expected 20, got {len(request.features)}")
            raise HTTPException(status_code=400, detail=f"Exactly 20 features required, got {len(request.features)}")
        
        # Make prediction using XGBoost
        features_array = np.array(request.features).reshape(1, -1)
        prediction = app.state.model.predict(features_array)[0]
        
        # Calculate uncertainty
        feature_variance = np.var(request.features)
        base_uncertainty = 0.05
        uncertainty = min(0.15, base_uncertainty + (feature_variance / 1000))
        
        # Determine risk level
        if prediction > 0.7:
            alert = "🚨 EVACUATION ALERT"
            risk_level = "HIGH"
        elif prediction > 0.4:
            alert = "⚠️ FLOOD WARNING"
            risk_level = "MODERATE"
        else:
            alert = "✅ ALL CLEAR"
            risk_level = "LOW"
        
        # Store prediction in database
        prediction_data = {
            "user_id": current_user["id"],
            "features": request.features,
            "location": request.location,
            "probability": float(prediction),
            "uncertainty": float(uncertainty),
            "risk_level": risk_level,
            "alert_message": alert
        }
        
        stored_prediction = await DatabaseService.store_prediction(prediction_data)
        
        # Send alert if enabled and risk is significant
        alert_sent = False
        alert_id = None
        
        if request.enable_alerts and risk_level in ["HIGH", "MODERATE"]:
            try:
                alert_result = alert_system.broadcast_alert(
                    risk_level=risk_level,
                    probability=prediction,
                    location=request.location
                )
                alert_sent = True
                alert_id = alert_result["id"]
                
                # Store alert in database
                alert_data = {
                    "alert_type": "FLOOD_PREDICTION",
                    "severity": risk_level,
                    "location": request.location,
                    "message": alert,
                    "created_by": current_user["id"],
                    "probability": float(prediction)
                }
                await DatabaseService.create_alert(alert_data)
                
            except Exception as e:
                print(f"❌ Failed to send alert: {str(e)}")
        
        return {
            "probability": float(prediction),
            "uncertainty": float(uncertainty),
            "alert": alert,
            "risk_level": risk_level,
            "alert_sent": alert_sent,
            "alert_id": alert_id,
            "prediction_id": stored_prediction["id"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predictions/history")
async def get_prediction_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get prediction history"""
    predictions = await DatabaseService.get_prediction_history(limit)
    return {"predictions": predictions, "total": len(predictions)}

# Alert Management Endpoints
@app.post("/alerts")
async def create_alert(alert: AlertCreate, current_user: dict = Depends(get_current_user)):
    """Create a new alert (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        alert_data = alert.dict()
        alert_data["created_by"] = current_user["id"]
        
        created_alert = await DatabaseService.create_alert(alert_data)
        
        # Broadcast alert
        try:
            alert_system.broadcast_alert(
                risk_level=alert.severity,
                probability=0.8,  # Default probability for manual alerts
                location=alert.location
            )
        except Exception as e:
            print(f"❌ Failed to broadcast alert: {str(e)}")
        
        return {"message": "Alert created successfully", "alert": created_alert}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts/active")
async def get_active_alerts():
    """Get all active alerts"""
    alerts = await DatabaseService.get_active_alerts()
    return {"alerts": alerts, "total": len(alerts)}

@app.put("/alerts/{alert_id}/status")
async def update_alert_status(
    alert_id: str,
    status: str,
    resolution_notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update alert status (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    success = await DatabaseService.update_alert_status(alert_id, status, resolution_notes)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert status updated successfully"}

# SOS Request Endpoints
@app.post("/sos")
async def create_sos_request(sos: SOSCreate):
    """Create a new SOS request"""
    try:
        sos_data = sos.dict()
        created_sos = await DatabaseService.create_sos_request(sos_data)
        
        # Auto-broadcast high priority alert for SOS
        try:
            location_str = f"{sos.location[0]:.4f}, {sos.location[1]:.4f}"
            alert_system.broadcast_alert(
                risk_level="HIGH",
                probability=0.9,
                location=f"SOS Emergency: {location_str}"
            )
        except Exception as e:
            print(f"❌ Failed to broadcast SOS alert: {str(e)}")
        
        return {"message": "SOS request created successfully", "sos": created_sos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/sos-requests")
async def get_sos_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get SOS requests (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sos_requests = await DatabaseService.get_sos_requests(status)
    return {"sos_requests": sos_requests, "total": len(sos_requests)}

@app.put("/admin/sos-requests/{sos_id}")
async def update_sos_request(
    sos_id: str,
    update_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update SOS request (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    success = await DatabaseService.update_sos_request(sos_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="SOS request not found")
    
    return {"message": "SOS request updated successfully"}

# Shelter Management Endpoints
@app.post("/shelters")
async def create_shelter(shelter: ShelterCreate, current_user: dict = Depends(get_current_user)):
    """Create a new shelter (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        shelter_data = shelter.dict()
        created_shelter = await DatabaseService.create_shelter(shelter_data)
        return {"message": "Shelter created successfully", "shelter": created_shelter}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/shelters")
async def get_all_shelters():
    """Get all shelters"""
    shelters = await DatabaseService.get_all_shelters()
    return {"shelters": shelters, "total": len(shelters)}

@app.put("/shelters/{shelter_id}")
async def update_shelter(
    shelter_id: str,
    update_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update shelter information (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    success = await DatabaseService.update_shelter(shelter_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Shelter not found")
    
    return {"message": "Shelter updated successfully"}

# Subscriber Management Endpoints
@app.post("/subscribers")
async def add_subscriber(subscriber: SubscriberRequest):
    """Add a new subscriber"""
    try:
        subscriber_data = subscriber.dict()
        result = await DatabaseService.add_subscriber(subscriber_data)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {"message": "Subscriber added successfully", "subscriber": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/subscribers")
async def get_subscribers(current_user: dict = Depends(get_current_user)):
    """Get all subscribers (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    subscribers = await DatabaseService.get_all_subscribers()
    return {"subscribers": subscribers, "total": len(subscribers)}

# Statistics Endpoints
@app.get("/admin/stats")
async def get_system_statistics(current_user: dict = Depends(get_current_user)):
    """Get system statistics (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    stats = await DatabaseService.get_system_stats()
    return stats

# Sensor Data Endpoints
@app.post("/sensors/data")
async def update_sensor_data(sensor_data: dict, current_user: dict = Depends(get_current_user)):
    """Update sensor data (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        updated_sensor = await DatabaseService.create_sensor_data(sensor_data)
        return {"message": "Sensor data updated successfully", "sensor": updated_sensor}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sensors")
async def get_all_sensors():
    """Get all sensor data"""
    sensors = await DatabaseService.get_all_sensors()
    return {"sensors": sensors, "total": len(sensors)}

# Legacy alert system endpoints for backward compatibility
@app.get("/alerts/history")
async def get_alert_history(limit: int = 10):
    """Get alert history from legacy system"""
    return {
        "alerts": alert_system.get_alert_history(limit),
        "stats": alert_system.get_alert_stats()
    }

@app.post("/alerts/broadcast")
async def broadcast_manual_alert(
    risk_level: str,
    probability: float,
    location: str = "Unknown",
    current_user: dict = Depends(get_current_user)
):
    """Manually broadcast an alert (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        alert = alert_system.broadcast_alert(risk_level, probability, location)
        
        # Store in database
        alert_data = {
            "alert_type": "MANUAL_BROADCAST",
            "severity": risk_level,
            "location": location,
            "message": f"Manual alert: {risk_level} risk at {location}",
            "created_by": current_user["id"],
            "probability": probability
        }
        await DatabaseService.create_alert(alert_data)
        
        return {"message": "Alert broadcasted successfully", "alert": alert}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(
        "app_with_mongodb:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )