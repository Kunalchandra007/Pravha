"""
MongoDB Database Models for Pravha Flood Management System
"""

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

class AlertSeverity(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class SOSStatus(str, Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"

class ShelterStatus(str, Enum):
    READY = "READY"
    OCCUPIED = "OCCUPIED"
    FULL = "FULL"
    MAINTENANCE = "MAINTENANCE"

# User Models
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')
    location: Optional[str] = Field(None, max_length=200)
    role: UserRole = UserRole.USER
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')
    location: Optional[str] = Field(None, max_length=200)
    preferences: Optional[Dict[str, Any]] = None

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    registered_at: datetime = Field(default_factory=datetime.now)
    last_login: Optional[datetime] = None
    password_hash: str

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: str
    is_active: bool
    registered_at: datetime
    last_login: Optional[datetime] = None

# Alert Models
class AlertBase(BaseModel):
    alert_type: str = Field(..., max_length=100)
    severity: AlertSeverity
    location: str = Field(..., max_length=200)
    message: str = Field(..., max_length=1000)
    affected_users: List[str] = Field(default_factory=list)
    government_response: Optional[str] = Field(None, max_length=1000)

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=50)
    government_response: Optional[str] = Field(None, max_length=1000)
    resolved_at: Optional[datetime] = None

class Alert(AlertBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)
    status: str = "ACTIVE"
    resolved_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True

class AlertResponse(AlertBase):
    id: str
    timestamp: datetime
    status: str
    resolved_at: Optional[datetime] = None
    created_by: Optional[str] = None

# SOS Request Models
class SOSRequestBase(BaseModel):
    location: List[float] = Field(..., min_items=2, max_items=2)  # [latitude, longitude]
    message: Optional[str] = Field(None, max_length=500)
    emergency_type: str = Field(default="FLOOD", max_length=50)

class SOSRequestCreate(SOSRequestBase):
    pass

class SOSRequestUpdate(BaseModel):
    status: Optional[SOSStatus] = None
    assigned_officer: Optional[str] = Field(None, max_length=100)
    response_time: Optional[int] = None  # in minutes
    resolution_notes: Optional[str] = Field(None, max_length=1000)

class SOSRequest(SOSRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    status: SOSStatus = SOSStatus.PENDING
    assigned_officer: Optional[str] = Field(None, max_length=100)
    response_time: Optional[int] = None  # in minutes
    resolution_notes: Optional[str] = Field(None, max_length=1000)
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SOSRequestResponse(SOSRequestBase):
    id: str
    user_id: str
    timestamp: datetime
    status: SOSStatus
    assigned_officer: Optional[str] = None
    response_time: Optional[int] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None

# Shelter Models
class ShelterBase(BaseModel):
    name: str = Field(..., max_length=200)
    location: List[float] = Field(..., min_items=2, max_items=2)  # [latitude, longitude]
    capacity: int = Field(..., gt=0)
    facilities: List[str] = Field(default_factory=list)
    contact: str = Field(..., max_length=100)
    accessibility: bool = True

class ShelterCreate(ShelterBase):
    pass

class ShelterUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    capacity: Optional[int] = Field(None, gt=0)
    facilities: Optional[List[str]] = None
    contact: Optional[str] = Field(None, max_length=100)
    accessibility: Optional[bool] = None
    current_occupancy: Optional[int] = Field(None, ge=0)
    status: Optional[ShelterStatus] = None

class Shelter(ShelterBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_occupancy: int = 0
    status: ShelterStatus = ShelterStatus.READY
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

class ShelterResponse(ShelterBase):
    id: str
    current_occupancy: int
    status: ShelterStatus
    created_at: datetime
    updated_at: datetime

# Sensor Data Models
class SensorDataBase(BaseModel):
    name: str = Field(..., max_length=200)
    location: List[float] = Field(..., min_items=2, max_items=2)
    sensor_type: str = Field(..., max_length=50)
    value: float
    unit: str = Field(..., max_length=20)
    status: str = Field(..., max_length=20)

class SensorDataCreate(SensorDataBase):
    pass

class SensorData(SensorDataBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_reading: datetime = Field(default_factory=datetime.now)
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

class SensorDataResponse(SensorDataBase):
    id: str
    last_reading: datetime
    created_at: datetime

# Flood Risk Zone Models
class FloodRiskZoneBase(BaseModel):
    name: str = Field(..., max_length=200)
    center: List[float] = Field(..., min_items=2, max_items=2)
    radius: float = Field(..., gt=0)
    risk_level: AlertSeverity
    probability: float = Field(..., ge=0, le=100)

class FloodRiskZoneCreate(FloodRiskZoneBase):
    pass

class FloodRiskZone(FloodRiskZoneBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_updated: datetime = Field(default_factory=datetime.now)
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

class FloodRiskZoneResponse(FloodRiskZoneBase):
    id: str
    last_updated: datetime
    created_at: datetime

# Authentication Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.USER

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

# Statistics Models
class SystemStats(BaseModel):
    total_users: int
    active_users: int
    total_alerts: int
    active_alerts: int
    total_sos_requests: int
    pending_sos_requests: int
    total_shelters: int
    available_shelters: int
    last_updated: datetime = Field(default_factory=datetime.now)

class UserStats(BaseModel):
    user_id: str
    alerts_received: int
    sos_requests_made: int
    last_activity: datetime
    risk_level: AlertSeverity = AlertSeverity.LOW

# Notification Models
class NotificationBase(BaseModel):
    title: str = Field(..., max_length=200)
    message: str = Field(..., max_length=1000)
    notification_type: str = Field(..., max_length=50)
    priority: str = Field(default="NORMAL", max_length=20)

class NotificationCreate(NotificationBase):
    user_ids: List[str] = Field(default_factory=list)

class Notification(NotificationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    is_read: bool = False
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    timestamp: datetime
    is_read: bool
    read_at: Optional[datetime] = None
