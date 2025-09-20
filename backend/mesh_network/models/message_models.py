# disaster_mesh/models/message_models.py
"""Message data models for the mesh network"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid

class MessageType(str, Enum):
    """Types of messages in the mesh network"""
    SOS = "SOS"
    WARNING = "WARNING"
    LOCATION_UPDATE = "LOCATION_UPDATE"
    FLOOD_ALERT = "FLOOD_ALERT"
    EVACUATION_ORDER = "EVACUATION_ORDER"
    RESOURCE_REQUEST = "RESOURCE_REQUEST"
    STATUS_UPDATE = "STATUS_UPDATE"

class Priority(int, Enum):
    """Message priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    EMERGENCY = 4
    CRITICAL = 5

class BaseMessage(BaseModel):
    """Base message model for all mesh network messages"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: MessageType
    priority: Priority = Priority.NORMAL
    timestamp: datetime = Field(default_factory=datetime.now)
    source_device_id: str
    content: str
    coordinates: Optional[Dict[str, float]] = None
    hop_count: int = 0
    max_hops: int = 10
    ttl: int = 3600  # Time to live in seconds
    signature: Optional[str] = None  # For message authentication

class SOSMessage(BaseMessage):
    """SOS emergency message"""
    type: MessageType = MessageType.SOS
    priority: Priority = Priority.CRITICAL
    emergency_type: str = "GENERAL"
    casualties: Optional[int] = None
    resources_needed: List[str] = []
    
class WarningMessage(BaseMessage):
    """Warning/alert message"""
    type: MessageType = MessageType.WARNING
    priority: Priority = Priority.HIGH
    warning_type: str = "GENERAL"
    affected_area: Optional[str] = None
    severity: str = "MEDIUM"
    
class FloodAlert(BaseMessage):
    """Flood-specific alert message"""
    type: MessageType = MessageType.FLOOD_ALERT
    priority: Priority = Priority.CRITICAL
    flood_level: float
    predicted_peak: Optional[datetime] = None
    evacuation_zones: List[str] = []
    safe_routes: List[str] = []
    
class LocationUpdate(BaseMessage):
    """Location update message"""
    type: MessageType = MessageType.LOCATION_UPDATE
    priority: Priority = Priority.LOW
    device_status: str = "ACTIVE"
    battery_level: Optional[int] = None
    signal_strength: Optional[int] = None