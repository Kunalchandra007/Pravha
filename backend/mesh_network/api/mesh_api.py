# disaster_mesh/api/mesh_api.py
"""FastAPI integration for the mesh network"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
import asyncio
from ..core.mesh_node import MeshNode
from ..models.message_models import BaseMessage, SOSMessage, WarningMessage, FloodAlert

class MeshAPI:
    """
    FastAPI wrapper for the mesh network that can be integrated
    with existing systems like Pravha.
    """
    
    def __init__(self, device_id: str):
        self.app = FastAPI(
            title="Disaster Mesh Network API",
            description="Decentralized mesh networking for disaster communication",
            version="1.0.0"
        )
        
        self.device_id = device_id
        self.mesh_node: Optional[MeshNode] = None
        self.received_messages: List[BaseMessage] = []
        
        self._setup_middleware()
        self._setup_routes()
    
    def _setup_middleware(self):
        """Setup CORS and other middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure as needed
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.on_event("startup")
        async def startup_event():
            """Initialize mesh node on startup"""
            await self.start_mesh_network()
        
        @self.app.on_event("shutdown")
        async def shutdown_event():
            """Cleanup mesh node on shutdown"""
            await self.stop_mesh_network()
        
        @self.app.get("/")
        async def root():
            return {"message": "Disaster Mesh Network API", "version": "1.0.0"}
        
        @self.app.get("/status")
        async def get_status():
            """Get mesh network status"""
            if not self.mesh_node:
                raise HTTPException(status_code=503, detail="Mesh network not initialized")
            
            return self.mesh_node.get_network_status()
        
        @self.app.post("/messages/sos")
        async def send_sos(
            emergency_type: str = "GENERAL",
            casualties: Optional[int] = None,
            resources_needed: List[str] = None
        ):
            """Send an SOS message through the mesh network"""
            if not self.mesh_node:
                raise HTTPException(status_code=503, detail="Mesh network not initialized")
            
            success = await self.mesh_node.broadcast_sos(
                emergency_type=emergency_type,
                casualties=casualties,
                resources_needed=resources_needed
            )
            
            if success:
                return {"message": "SOS broadcast successfully"}
            else:
                raise HTTPException(status_code=500, detail="Failed to broadcast SOS")
        
        @self.app.post("/messages/warning")
        async def send_warning(
            warning_text: str,
            warning_type: str = "GENERAL",
            severity: str = "MEDIUM"
        ):
            """Send a warning message through the mesh network"""
            if not self.mesh_node:
                raise HTTPException(status_code=503, detail="Mesh network not initialized")
            
            success = await self.mesh_node.broadcast_warning(
                warning_text=warning_text,
                warning_type=warning_type,
                severity=severity
            )
            
            if success:
                return {"message": "Warning broadcast successfully"}
            else:
                raise HTTPException(status_code=500, detail="Failed to broadcast warning")
        
        @self.app.post("/messages/flood-alert")
        async def send_flood_alert(
            content: str,
            flood_level: float,
            predicted_peak: Optional[str] = None,
            evacuation_zones: List[str] = None,
            safe_routes: List[str] = None
        ):
            """Send a flood alert through the mesh network"""
            if not self.mesh_node:
                raise HTTPException(status_code=503, detail="Mesh network not initialized")
            
            from datetime import datetime
            
            flood_alert = FloodAlert(
                source_device_id=self.device_id,
                content=content,
                flood_level=flood_level,
                predicted_peak=datetime.fromisoformat(predicted_peak) if predicted_peak else None,
                evacuation_zones=evacuation_zones or [],
                safe_routes=safe_routes or []
            )
            
            success = await self.mesh_node.send_message(flood_alert)
            
            if success:
                return {"message": "Flood alert broadcast successfully"}
            else:
                raise HTTPException(status_code=500, detail="Failed to broadcast flood alert")
        
        @self.app.get("/messages")
        async def get_received_messages():
            """Get all received messages"""
            return {
                "messages": [msg.dict() for msg in self.received_messages],
                "count": len(self.received_messages)
            }
        
        @self.app.get("/messages/{message_type}")
        async def get_messages_by_type(message_type: str):
            """Get messages filtered by type"""
            filtered_messages = [
                msg for msg in self.received_messages 
                if msg.type.value.lower() == message_type.lower()
            ]
            
            return {
                "messages": [msg.dict() for msg in filtered_messages],
                "count": len(filtered_messages)
            }
        
        @self.app.get("/network/nodes")
        async def get_connected_nodes():
            """Get list of connected mesh nodes"""
            if not self.mesh_node:
                raise HTTPException(status_code=503, detail="Mesh network not initialized")
            
            return {
                "connected_nodes": list(self.mesh_node.connected_nodes.keys()),
                "count": len(self.mesh_node.connected_nodes)
            }
    
    async def start_mesh_network(self):
        """Start the mesh network"""
        try:
            self.mesh_node = MeshNode(
                device_id=self.device_id,
                message_callback=self._handle_received_message
            )
            
            # Start the mesh node in the background
            asyncio.create_task(self.mesh_node.start_node())
            
        except Exception as e:
            print(f"Failed to start mesh network: {e}")
    
    async def stop_mesh_network(self):
        """Stop the mesh network"""
        if self.mesh_node:
            await self.mesh_node.stop_node()
    
    async def _handle_received_message(self, message: BaseMessage):
        """Handle received messages from the mesh network"""
        self.received_messages.append(message)
        
        # Keep only last 1000 messages to prevent memory issues
        if len(self.received_messages) > 1000:
            self.received_messages = self.received_messages[-1000:]

def create_mesh_api(device_id: str) -> FastAPI:
    """Factory function to create a mesh API instance"""
    mesh_api = MeshAPI(device_id)
    return mesh_api.app
