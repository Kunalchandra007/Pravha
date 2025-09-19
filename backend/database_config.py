"""
MongoDB Database Configuration and Connection
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import asyncio
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConfig:
    def __init__(self):
        # MongoDB connection settings
        self.MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        self.DATABASE_NAME = os.getenv("DATABASE_NAME", "pravha_flood_management")
        
        # Collections
        self.USERS_COLLECTION = "users"
        self.ALERTS_COLLECTION = "alerts"
        self.SOS_REQUESTS_COLLECTION = "sos_requests"
        self.SHELTERS_COLLECTION = "shelters"
        self.SENSORS_COLLECTION = "sensors"
        self.FLOOD_ZONES_COLLECTION = "flood_zones"
        self.NOTIFICATIONS_COLLECTION = "notifications"
        self.PREDICTIONS_COLLECTION = "predictions"
        self.SUBSCRIBERS_COLLECTION = "subscribers"
        
        # Database instances
        self.client: Optional[AsyncIOMotorClient] = None
        self.database = None

    async def connect_to_mongo(self):
        """Create database connection"""
        try:
            self.client = AsyncIOMotorClient(self.MONGODB_URL)
            self.database = self.client[self.DATABASE_NAME]
            
            # Test the connection
            await self.client.admin.command('ping')
            logger.info(f"✅ Connected to MongoDB at {self.MONGODB_URL}")
            logger.info(f"✅ Using database: {self.DATABASE_NAME}")
            
            # Create indexes for better performance
            await self.create_indexes()
            
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {str(e)}")
            return False

    async def close_mongo_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            logger.info("✅ MongoDB connection closed")

    async def create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Users collection indexes
            await self.database[self.USERS_COLLECTION].create_index("email", unique=True)
            await self.database[self.USERS_COLLECTION].create_index("role")
            
            # Alerts collection indexes
            await self.database[self.ALERTS_COLLECTION].create_index("timestamp")
            await self.database[self.ALERTS_COLLECTION].create_index("risk_level")
            await self.database[self.ALERTS_COLLECTION].create_index("status")
            
            # SOS requests collection indexes
            await self.database[self.SOS_REQUESTS_COLLECTION].create_index("timestamp")
            await self.database[self.SOS_REQUESTS_COLLECTION].create_index("status")
            await self.database[self.SOS_REQUESTS_COLLECTION].create_index("user_id")
            
            # Shelters collection indexes
            await self.database[self.SHELTERS_COLLECTION].create_index("status")
            await self.database[self.SHELTERS_COLLECTION].create_index([("location", "2dsphere")])
            
            # Sensors collection indexes
            await self.database[self.SENSORS_COLLECTION].create_index([("location", "2dsphere")])
            await self.database[self.SENSORS_COLLECTION].create_index("sensor_type")
            await self.database[self.SENSORS_COLLECTION].create_index("last_reading")
            
            logger.info("✅ Database indexes created successfully")
        except Exception as e:
            logger.error(f"❌ Failed to create indexes: {str(e)}")

    def get_collection(self, collection_name: str):
        """Get a specific collection"""
        if self.database is None:
            raise Exception("Database not connected")
        return self.database[collection_name]

# Global database instance
db_config = DatabaseConfig()

# Helper functions for database operations
async def get_database():
    """Get database instance"""
    if db_config.database is None:
        await db_config.connect_to_mongo()
    return db_config.database

async def get_collection(collection_name: str):
    """Get a specific collection"""
    database = await get_database()
    return database[collection_name]

# Database health check
async def check_database_health():
    """Check if database is healthy"""
    try:
        database = await get_database()
        await database.command('ping')
        
        # Get collection stats
        stats = {}
        collections = [
            db_config.USERS_COLLECTION,
            db_config.ALERTS_COLLECTION,
            db_config.SOS_REQUESTS_COLLECTION,
            db_config.SHELTERS_COLLECTION,
            db_config.SENSORS_COLLECTION,
            db_config.FLOOD_ZONES_COLLECTION,
            db_config.NOTIFICATIONS_COLLECTION,
            db_config.PREDICTIONS_COLLECTION,
            db_config.SUBSCRIBERS_COLLECTION
        ]
        
        for collection_name in collections:
            collection = database[collection_name]
            count = await collection.count_documents({})
            stats[collection_name] = count
        
        return {
            "status": "healthy",
            "database": db_config.DATABASE_NAME,
            "collections": stats,
            "total_documents": sum(stats.values())
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }