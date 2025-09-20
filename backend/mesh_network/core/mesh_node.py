# disaster_mesh/core/mesh_node.py
"""Core mesh network node implementation"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Set
import hashlib
from bleak import BleakScanner, BleakClient
from ..models.message_models import BaseMessage, MessageType, Priority

class MeshNode:
    """
    Core mesh network node that handles Bluetooth LE communication,
    message routing, and integration with external systems.
    """
    
    def __init__(
        self, 
        device_id: str,
        location_callback: Optional[Callable] = None,
        message_callback: Optional[Callable] = None
    ):
        self.device_id = device_id
        self.location_callback = location_callback
        self.message_callback = message_callback
        
        # Networking state
        self.is_active = False
        self.connected_nodes: Dict[str, Dict] = {}
        self.message_cache: Dict[str, BaseMessage] = {}
        self.routing_table: Dict[str, str] = {}
        
        # Bluetooth LE configuration
        self.service_uuid = "12345678-1234-1234-1234-123456789ABC"
        self.characteristic_uuid = "87654321-4321-4321-4321-CBA987654321"
        
        # Message handling
        self.message_handlers: Dict[MessageType, Callable] = {}
        self.pending_messages: List[BaseMessage] = []
        
        # Performance metrics
        self.messages_sent = 0
        self.messages_received = 0
        self.messages_relayed = 0
        
        self.logger = logging.getLogger(f"MeshNode-{device_id}")
        
    async def start_node(self) -> bool:
        """Start the mesh node and begin networking operations"""
        try:
            self.is_active = True
            self.logger.info(f"Starting mesh node {self.device_id}")
            
            # Start concurrent networking tasks
            await asyncio.gather(
                self._start_scanning(),
                self._start_advertising(),
                self._message_processor_loop(),
                self._cleanup_loop()
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start mesh node: {e}")
            self.is_active = False
            return False
    
    async def stop_node(self):
        """Stop the mesh node and cleanup resources"""
        self.is_active = False
        self.logger.info(f"Stopping mesh node {self.device_id}")
        
        # Disconnect from all nodes
        for node_id in list(self.connected_nodes.keys()):
            await self._disconnect_from_node(node_id)
    
    async def send_message(self, message: BaseMessage) -> bool:
        """Send a message through the mesh network"""
        try:
            message.source_device_id = self.device_id
            message.timestamp = datetime.now()
            
            # Add current location if available
            if self.location_callback:
                location = await self.location_callback()
                if location:
                    message.coordinates = location
            
            # Store in cache to prevent loops
            self.message_cache[message.id] = message
            
            # Add to pending messages for broadcast
            self.pending_messages.append(message)
            
            self.messages_sent += 1
            self.logger.info(f"Queued message {message.id} for broadcast")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")
            return False
    
    async def broadcast_sos(
        self, 
        emergency_type: str = "GENERAL",
        casualties: Optional[int] = None,
        resources_needed: List[str] = None
    ) -> bool:
        """Broadcast an SOS message"""
        from ..models.message_models import SOSMessage
        
        sos_message = SOSMessage(
            source_device_id=self.device_id,
            content=f"SOS from {self.device_id}",
            emergency_type=emergency_type,
            casualties=casualties,
            resources_needed=resources_needed or []
        )
        
        return await self.send_message(sos_message)
    
    async def broadcast_warning(
        self,
        warning_text: str,
        warning_type: str = "GENERAL",
        severity: str = "MEDIUM"
    ) -> bool:
        """Broadcast a warning message"""
        from ..models.message_models import WarningMessage
        
        warning_message = WarningMessage(
            source_device_id=self.device_id,
            content=warning_text,
            warning_type=warning_type,
            severity=severity
        )
        
        return await self.send_message(warning_message)
    
    def register_message_handler(self, message_type: MessageType, handler: Callable):
        """Register a handler for specific message types"""
        self.message_handlers[message_type] = handler
        self.logger.info(f"Registered handler for {message_type}")
    
    async def _start_scanning(self):
        """Start scanning for other mesh nodes"""
        while self.is_active:
            try:
                devices = await BleakScanner.discover(timeout=5.0)
                
                for device in devices:
                    if device.name and device.name.startswith("MESH-"):
                        await self._attempt_connection(device)
                
                await asyncio.sleep(10)  # Scan every 10 seconds
                
            except Exception as e:
                self.logger.error(f"Scanning error: {e}")
                await asyncio.sleep(5)
    
    async def _start_advertising(self):
        """Start advertising this node's presence"""
        # Note: BLE advertising from Python is platform-dependent
        # This is a simplified representation
        self.logger.info(f"Advertising as {self.device_id}")
        
        while self.is_active:
            # Platform-specific advertising implementation would go here
            await asyncio.sleep(30)
    
    async def _attempt_connection(self, device):
        """Attempt to connect to a discovered mesh node"""
        try:
            node_id = device.name
            
            if node_id == self.device_id or node_id in self.connected_nodes:
                return
            
            async with BleakClient(device.address) as client:
                # Exchange messages with the connected node
                await self._exchange_messages(client, node_id)
                
                # Update connected nodes
                self.connected_nodes[node_id] = {
                    "address": device.address,
                    "last_seen": datetime.now(),
                    "signal_strength": device.rssi if hasattr(device, 'rssi') else None
                }
                
        except Exception as e:
            self.logger.error(f"Connection attempt failed: {e}")
    
    async def _exchange_messages(self, client, node_id):
        """Exchange messages with a connected node"""
        try:
            # Read messages from the other node
            services = await client.get_services()
            
            for service in services:
                if service.uuid == self.service_uuid:
                    for char in service.characteristics:
                        if char.uuid == self.characteristic_uuid:
                            # Read incoming messages
                            data = await client.read_gatt_char(char)
                            if data:
                                await self._process_received_data(data, node_id)
                            
                            # Send pending messages
                            await self._send_pending_messages(client, char)
                            
        except Exception as e:
            self.logger.error(f"Message exchange failed: {e}")
    
    async def _process_received_data(self, data: bytes, source_node: str):
        """Process received message data"""
        try:
            message_json = data.decode('utf-8')
            message_dict = json.loads(message_json)
            
            # Reconstruct message object
            message = BaseMessage(**message_dict)
            
            # Check if we've seen this message before (loop prevention)
            if message.id in self.message_cache:
                return
            
            # Check TTL
            age = (datetime.now() - message.timestamp).total_seconds()
            if age > message.ttl:
                return
            
            # Check hop count
            if message.hop_count >= message.max_hops:
                return
            
            # Store in cache
            self.message_cache[message.id] = message
            
            # Increment hop count for relay
            message.hop_count += 1
            
            # Process the message
            await self._handle_received_message(message)
            
            # Add to pending for relay
            self.pending_messages.append(message)
            
            self.messages_received += 1
            
        except Exception as e:
            self.logger.error(f"Failed to process received data: {e}")
    
    async def _handle_received_message(self, message: BaseMessage):
        """Handle a received message based on its type"""
        try:
            # Call registered handler if available
            if message.type in self.message_handlers:
                await self.message_handlers[message.type](message)
            
            # Call general message callback
            if self.message_callback:
                await self.message_callback(message)
                
            self.logger.info(f"Processed {message.type} message from {message.source_device_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to handle message: {e}")
    
    async def _send_pending_messages(self, client, characteristic):
        """Send pending messages to a connected node"""
        try:
            if not self.pending_messages:
                return
            
            # Send up to 3 messages per connection to avoid overwhelming
            messages_to_send = self.pending_messages[:3]
            
            for message in messages_to_send:
                message_json = json.dumps(message.dict(), default=str)
                message_bytes = message_json.encode('utf-8')
                
                # Write message to characteristic
                await client.write_gatt_char(characteristic, message_bytes)
                
                self.messages_relayed += 1
                
        except Exception as e:
            self.logger.error(f"Failed to send pending messages: {e}")
    
    async def _message_processor_loop(self):
        """Background loop for processing messages"""
        while self.is_active:
            try:
                # Process pending messages
                if self.pending_messages:
                    self.logger.debug(f"Processing {len(self.pending_messages)} pending messages")
                
                # Clean up old pending messages
                current_time = datetime.now()
                self.pending_messages = [
                    msg for msg in self.pending_messages
                    if (current_time - msg.timestamp).total_seconds() < msg.ttl
                ]
                
                await asyncio.sleep(1)
                
            except Exception as e:
                self.logger.error(f"Message processor error: {e}")
                await asyncio.sleep(5)
    
    async def _cleanup_loop(self):
        """Background cleanup of old data"""
        while self.is_active:
            try:
                current_time = datetime.now()
                
                # Clean old messages from cache (older than 1 hour)
                old_messages = [
                    msg_id for msg_id, msg in self.message_cache.items()
                    if (current_time - msg.timestamp).total_seconds() > 3600
                ]
                
                for msg_id in old_messages:
                    del self.message_cache[msg_id]
                
                # Clean disconnected nodes (not seen for 5 minutes)
                old_nodes = [
                    node_id for node_id, node_info in self.connected_nodes.items()
                    if (current_time - node_info["last_seen"]).total_seconds() > 300
                ]
                
                for node_id in old_nodes:
                    del self.connected_nodes[node_id]
                    self.logger.info(f"Removed stale node: {node_id}")
                
                await asyncio.sleep(60)  # Cleanup every minute
                
            except Exception as e:
                self.logger.error(f"Cleanup error: {e}")
                await asyncio.sleep(60)
    
    async def _disconnect_from_node(self, node_id: str):
        """Disconnect from a specific node"""
        if node_id in self.connected_nodes:
            del self.connected_nodes[node_id]
            self.logger.info(f"Disconnected from {node_id}")
    
    def get_network_status(self) -> Dict:
        """Get current network status and statistics"""
        return {
            "device_id": self.device_id,
            "is_active": self.is_active,
            "connected_nodes": len(self.connected_nodes),
            "cached_messages": len(self.message_cache),
            "pending_messages": len(self.pending_messages),
            "messages_sent": self.messages_sent,
            "messages_received": self.messages_received,
            "messages_relayed": self.messages_relayed,
            "connected_node_list": list(self.connected_nodes.keys())
        }
