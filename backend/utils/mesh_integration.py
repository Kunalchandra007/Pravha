"""Mesh network integration manager for Pravha"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional

class MeshIntegrationManager:
    """Manages integration between Pravha and mesh network"""
    
    def __init__(self, mesh_node, pravha_bridge):
        self.mesh_node = mesh_node
        self.pravha_bridge = pravha_bridge
        self.emergency_reports = []
        self.coverage_data = {}
        self.is_running = False
        
        self.logger = logging.getLogger("MeshIntegrationManager")
    
    async def start(self):
        """Start the integration manager"""
        self.is_running = True
        asyncio.create_task(self._update_coverage_loop())
        asyncio.create_task(self._process_reports_loop())
    
    async def stop(self):
        """Stop the integration manager"""
        self.is_running = False
    
    async def broadcast_alert(self, alert_data: Dict) -> bool:
        """Broadcast alert through mesh network"""
        try:
            if alert_data.get('type') == 'flood':
                await self.pravha_bridge._broadcast_flood_prediction(alert_data)
            else:
                await self.pravha_bridge._broadcast_emergency_alert(alert_data)
            return True
        except Exception as e:
            self.logger.error(f"Failed to broadcast alert: {e}")
            return False
    
    def get_status(self) -> Dict:
        """Get overall mesh network status"""
        mesh_status = self.mesh_node.get_network_status()
        bridge_status = self.pravha_bridge.get_bridge_status()
        
        return {
            "mesh_network": mesh_status,
            "pravha_bridge": bridge_status,
            "integration_status": "active" if self.is_running else "inactive",
            "emergency_reports_count": len(self.emergency_reports),
            "last_update": datetime.now().isoformat()
        }
    
    def get_coverage_data(self) -> Dict:
        """Get mesh network coverage data"""
        return {
            "coverage_area_km2": self._calculate_coverage_area(),
            "active_nodes": len(self.mesh_node.connected_nodes),
            "network_topology": self._get_topology_data(),
            "signal_strength_map": self._get_signal_map()
        }
    
    def get_emergency_reports(self) -> List[Dict]:
        """Get all emergency reports from mesh network"""
        return [
            {
                "id": report.id,
                "type": report.type,
                "device_id": report.source_device_id,
                "timestamp": report.timestamp.isoformat(),
                "location": report.coordinates,
                "content": report.content,
                "priority": report.priority.value
            }
            for report in self.emergency_reports
        ]
    
    async def _update_coverage_loop(self):
        """Update coverage data periodically"""
        while self.is_running:
            try:
                self.coverage_data = self._calculate_coverage()
                await asyncio.sleep(60)  # Update every minute
            except Exception as e:
                self.logger.error(f"Coverage update error: {e}")
                await asyncio.sleep(60)
    
    async def _process_reports_loop(self):
        """Process incoming reports"""
        while self.is_running:
            try:
                # Process any pending emergency reports
                # Your processing logic here
                await asyncio.sleep(10)
            except Exception as e:
                self.logger.error(f"Report processing error: {e}")
                await asyncio.sleep(10)
    
    def _calculate_coverage_area(self) -> float:
        """Calculate total coverage area"""
        # Each node covers ~0.5 km² in urban areas
        return len(self.mesh_node.connected_nodes) * 0.5
    
    def _get_topology_data(self) -> Dict:
        """Get network topology information"""
        return {
            "nodes": list(self.mesh_node.connected_nodes.keys()),
            "connections": len(self.mesh_node.connected_nodes),
            "hub_nodes": [],  # Identify nodes with many connections
            "edge_nodes": []  # Identify edge nodes
        }
    
    def _get_signal_map(self) -> Dict:
        """Get signal strength mapping"""
        return {
            node_id: {
                "signal_strength": info.get("signal_strength", 0),
                "last_seen": info.get("last_seen").isoformat()
            }
            for node_id, info in self.mesh_node.connected_nodes.items()
        }
    
    def _calculate_coverage(self) -> Dict:
        """Calculate detailed coverage metrics"""
        return {
            "total_area": self._calculate_coverage_area(),
            "node_density": len(self.mesh_node.connected_nodes) / max(self._calculate_coverage_area(), 1),
            "redundancy_factor": self._calculate_redundancy(),
            "weak_zones": self._identify_weak_zones()
        }
    
    def _calculate_redundancy(self) -> float:
        """Calculate network redundancy factor"""
        # Simple calculation based on connection count
        total_connections = sum(1 for _ in self.mesh_node.connected_nodes)
        optimal_connections = len(self.mesh_node.connected_nodes) * 3
        return min(total_connections / max(optimal_connections, 1), 1.0)
    
    def _identify_weak_zones(self) -> List[str]:
        """Identify areas with weak mesh coverage"""
        weak_zones = []
        for node_id, info in self.mesh_node.connected_nodes.items():
            if info.get("signal_strength", 100) < 30:
                weak_zones.append(node_id)
        return weak_zones