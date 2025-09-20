# disaster_mesh/integration/pravha_bridge.py
"""Integration bridge between mesh network and Pravha system"""

import asyncio
import logging
import requests
from typing import Dict, List, Optional, Callable
from datetime import datetime
from ..core.mesh_node import MeshNode
from ..models.message_models import BaseMessage, FloodAlert, SOSMessage, WarningMessage

class PravhaBridge:
    """
    Bridge component that integrates the mesh network
    with Pravha's flood forecasting system.
    """
    
    def __init__(
        self,
        mesh_node: MeshNode,
        pravha_api_url: str = "http://localhost:8002",
        bridge_id: str = "PRAVHA_BRIDGE"
    ):
        self.mesh_node = mesh_node
        self.pravha_api_url = pravha_api_url
        self.bridge_id = bridge_id
        
        self.is_active = False
        self.flood_alerts_enabled = True
        self.auto_relay_enabled = True
        
        self.logger = logging.getLogger(f"PravhaBridge-{bridge_id}")
        
        # Register message handlers
        self._register_handlers()
    
    def _register_handlers(self):
        """Register handlers for different message types"""
        from ..models.message_models import MessageType
        
        self.mesh_node.register_message_handler(
            MessageType.SOS, 
            self._handle_sos_message
        )
        
        self.mesh_node.register_message_handler(
            MessageType.FLOOD_ALERT, 
            self._handle_flood_alert
        )