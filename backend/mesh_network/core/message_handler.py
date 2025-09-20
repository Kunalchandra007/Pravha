# disaster_mesh/core/message_handler.py
"""Message handling and routing for the mesh network"""

import asyncio
import logging
from typing import Dict, List, Optional, Callable
from datetime import datetime
from ..models.message_models import BaseMessage, MessageType, Priority

class MessageHandler:
    """
    Handles message routing, prioritization, and delivery
    in the mesh network with flood-aware logic.
    """
    
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.message_queue: Dict[Priority, List[BaseMessage]] = {
            priority: [] for priority in Priority
        }
        self.handlers: Dict[MessageType, Callable] = {}
        self.flood_mode = False
        self.emergency_handlers: List[Callable] = []
        
        self.logger = logging.getLogger(f"MessageHandler-{node_id}")
    
    def register_handler(self, message_type: MessageType, handler: Callable):
        """Register a handler for specific message types"""
        self.handlers[message_type] = handler
        self.logger.info(f"Registered handler for {message_type}")
    
    def register_emergency_handler(self, handler: Callable):
        """Register an emergency handler for critical situations"""
        self.emergency_handlers.append(handler)
    
    async def process_message(self, message: BaseMessage) -> bool:
        """Process an incoming message"""
        try:
            # Add to appropriate priority queue
            self.message_queue[message.priority].append(message)
            
            # Handle emergency messages immediately
            if message.priority >= Priority.EMERGENCY:
                await self._handle_emergency_message(message)
            
            # Process message based on type
            if message.type in self.handlers:
                await self.handlers[message.type](message)
            
            # Special handling for flood alerts
            if message.type == MessageType.FLOOD_ALERT:
                await self._handle_flood_alert(message)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to process message: {e}")
            return False
    
    async def _handle_emergency_message(self, message: BaseMessage):
        """Handle high-priority emergency messages"""
        self.logger.critical(f"EMERGENCY: {message.content}")
        
        # Notify all emergency handlers
        for handler in self.emergency_handlers:
            try:
                await handler(message)
            except Exception as e:
                self.logger.error(f"Emergency handler failed: {e}")
    
    async def _handle_flood_alert(self, message: BaseMessage):
        """Handle flood-specific alert messages"""
        self.flood_mode = True
        self.logger.warning(f"FLOOD ALERT: {message.content}")
        
        # Prioritize evacuation and safety messages
        await self._reprioritize_flood_messages()
    
    async def _reprioritize_flood_messages(self):
        """Reprioritize messages during flood conditions"""
        # Move evacuation and safety messages to highest priority
        for priority in list(Priority):
            messages_to_move = []
            
            for message in self.message_queue[priority]:
                if any(keyword in message.content.lower() for keyword in 
                       ['evacuation', 'safety', 'rescue', 'emergency']):
                    messages_to_move.append(message)
            
            # Move to emergency priority
            for message in messages_to_move:
                self.message_queue[priority].remove(message)
                message.priority = Priority.EMERGENCY
                self.message_queue[Priority.EMERGENCY].append(message)
    
    def get_queue_status(self) -> Dict:
        """Get current message queue status"""
        return {
            priority.name: len(messages) 
            for priority, messages in self.message_queue.items()
        }