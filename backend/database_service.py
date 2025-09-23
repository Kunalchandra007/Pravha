"""
Database Service Layer for Pravha Flood Management System
Handles all database operations for different collections
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from bson import ObjectId
import bcrypt
import uuid
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database_config import get_collection, db_config
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    
    # User Management
    @staticmethod
    async def create_user(user_data: dict) -> dict:
        """Create a new user"""
        try:
            collection = await get_collection(db_config.USERS_COLLECTION)
            
            # Check if user already exists by email
            existing_user = await collection.find_one({"email": user_data.get("email")})
            if existing_user:
                logger.info(f"✅ User already exists: {user_data['email']}")
                existing_user['_id'] = str(existing_user['_id'])
                return existing_user
            
            # Hash password
            if 'password' in user_data:
                password_hash = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt())
                user_data['password_hash'] = password_hash.decode('utf-8')
                del user_data['password']
            
            # Ensure username is set and unique (use email if not provided)
            if 'username' not in user_data or user_data['username'] is None:
                base_username = user_data['email'].split('@')[0]
                username = base_username
                
                # Check if username already exists, make it unique if needed
                counter = 1
                while await collection.find_one({"username": username}):
                    username = f"{base_username}_{counter}"
                    counter += 1
                
                user_data['username'] = username
            
            # Add metadata
            user_data.update({
                'id': str(uuid.uuid4()),
                'created_at': datetime.now(),
                'is_active': True,
                'last_login': None
            })
            
            result = await collection.insert_one(user_data)
            user_data['_id'] = str(result.inserted_id)
            
            logger.info(f"✅ User created: {user_data['email']}")
            return user_data
        except Exception as e:
            logger.error(f"❌ Failed to create user: {str(e)}")
            raise

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[dict]:
        """Get user by email"""
        try:
            collection = await get_collection(db_config.USERS_COLLECTION)
            user = await collection.find_one({"email": email})
            if user:
                user['_id'] = str(user['_id'])
            return user
        except Exception as e:
            logger.error(f"❌ Failed to get user by email: {str(e)}")
            return None

    @staticmethod
    async def verify_user_password(email: str, password: str) -> Optional[dict]:
        """Verify user password and return user data"""
        try:
            user = await DatabaseService.get_user_by_email(email)
            if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                # Update last login
                collection = await get_collection(db_config.USERS_COLLECTION)
                await collection.update_one(
                    {"email": email},
                    {"$set": {"last_login": datetime.now()}}
                )
                return user
            return None
        except Exception as e:
            logger.error(f"❌ Failed to verify user password: {str(e)}")
            return None

    @staticmethod
    async def get_all_users() -> List[dict]:
        """Get all users"""
        try:
            collection = await get_collection(db_config.USERS_COLLECTION)
            users = []
            async for user in collection.find({}):
                user['_id'] = str(user['_id'])
                # Remove password hash from response
                if 'password_hash' in user:
                    del user['password_hash']
                users.append(user)
            return users
        except Exception as e:
            logger.error(f"❌ Failed to get all users: {str(e)}")
            return []

    # Alert Management
    @staticmethod
    async def create_alert(alert_data: dict) -> dict:
        """Create a new alert"""
        try:
            collection = await get_collection(db_config.ALERTS_COLLECTION)
            
            alert_data.update({
                'id': str(uuid.uuid4()),
                'timestamp': datetime.now(),
                'status': 'ACTIVE',
                'resolved_at': None
            })
            
            result = await collection.insert_one(alert_data)
            alert_data['_id'] = str(result.inserted_id)
            
            logger.info(f"✅ Alert created: {alert_data['id']}")
            return alert_data
        except Exception as e:
            logger.error(f"❌ Failed to create alert: {str(e)}")
            raise

    @staticmethod
    async def get_active_alerts() -> List[dict]:
        """Get all active alerts"""
        try:
            collection = await get_collection(db_config.ALERTS_COLLECTION)
            alerts = []
            async for alert in collection.find({"status": "ACTIVE"}).sort("timestamp", -1):
                alert['_id'] = str(alert['_id'])
                alerts.append(alert)
            return alerts
        except Exception as e:
            logger.error(f"❌ Failed to get active alerts: {str(e)}")
            return []

    @staticmethod
    async def update_alert_status(alert_id: str, status: str, resolution_notes: str = None) -> bool:
        """Update alert status"""
        try:
            collection = await get_collection(db_config.ALERTS_COLLECTION)
            update_data = {"status": status}
            
            if status == "RESOLVED":
                update_data["resolved_at"] = datetime.now()
                if resolution_notes:
                    update_data["resolution_notes"] = resolution_notes
            
            result = await collection.update_one(
                {"id": alert_id},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Failed to update alert status: {str(e)}")
            return False

    # SOS Request Management
    @staticmethod
    async def create_sos_request(sos_data: dict) -> dict:
        """Create a new SOS request"""
        try:
            collection = await get_collection(db_config.SOS_REQUESTS_COLLECTION)
            
            sos_data.update({
                'id': str(uuid.uuid4()),
                'timestamp': datetime.now(),
                'status': 'PENDING',
                'assigned_officer': None,
                'response_time': None,
                'resolution_notes': None,
                'resolved_at': None
            })
            
            result = await collection.insert_one(sos_data)
            sos_data['_id'] = str(result.inserted_id)
            
            logger.info(f"✅ SOS request created: {sos_data['id']}")
            return sos_data
        except Exception as e:
            logger.error(f"❌ Failed to create SOS request: {str(e)}")
            raise

    @staticmethod
    async def get_sos_requests(status: str = None) -> List[dict]:
        """Get SOS requests, optionally filtered by status"""
        try:
            collection = await get_collection(db_config.SOS_REQUESTS_COLLECTION)
            query = {"status": status} if status else {}
            
            sos_requests = []
            async for sos in collection.find(query).sort("timestamp", -1):
                sos['_id'] = str(sos['_id'])
                sos_requests.append(sos)
            return sos_requests
        except Exception as e:
            logger.error(f"❌ Failed to get SOS requests: {str(e)}")
            return []

    @staticmethod
    async def update_sos_request(sos_id: str, update_data: dict) -> bool:
        """Update SOS request"""
        try:
            collection = await get_collection(db_config.SOS_REQUESTS_COLLECTION)
            
            if update_data.get('status') == 'RESOLVED':
                update_data['resolved_at'] = datetime.now()
            
            result = await collection.update_one(
                {"id": sos_id},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Failed to update SOS request: {str(e)}")
            return False

    # Shelter Management
    @staticmethod
    async def create_shelter(shelter_data: dict) -> dict:
        """Create a new shelter"""
        try:
            collection = await get_collection(db_config.SHELTERS_COLLECTION)
            
            shelter_data.update({
                'id': str(uuid.uuid4()),
                'current_occupancy': 0,
                'status': 'AVAILABLE',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            })
            
            result = await collection.insert_one(shelter_data)
            shelter_data['_id'] = str(result.inserted_id)
            
            logger.info(f"✅ Shelter created: {shelter_data['name']}")
            return shelter_data
        except Exception as e:
            logger.error(f"❌ Failed to create shelter: {str(e)}")
            raise

    @staticmethod
    async def get_all_shelters() -> List[dict]:
        """Get all shelters"""
        try:
            collection = await get_collection(db_config.SHELTERS_COLLECTION)
            shelters = []
            async for shelter in collection.find({}):
                shelter['_id'] = str(shelter['_id'])
                shelters.append(shelter)
            return shelters
        except Exception as e:
            logger.error(f"❌ Failed to get shelters: {str(e)}")
            return []

    @staticmethod
    async def update_shelter(shelter_id: str, update_data: dict) -> bool:
        """Update shelter information"""
        try:
            collection = await get_collection(db_config.SHELTERS_COLLECTION)
            update_data['updated_at'] = datetime.now()
            
            result = await collection.update_one(
                {"id": shelter_id},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Failed to update shelter: {str(e)}")
            return False

    # Sensor Data Management
    @staticmethod
    async def create_sensor_data(sensor_data: dict) -> dict:
        """Create or update sensor data"""
        try:
            collection = await get_collection(db_config.SENSORS_COLLECTION)
            
            # Check if sensor already exists
            existing_sensor = await collection.find_one({"sensor_id": sensor_data.get("sensor_id")})
            
            if existing_sensor:
                # Update existing sensor
                update_data = {
                    'value': sensor_data['value'],
                    'status': sensor_data['status'],
                    'last_reading': datetime.now(),
                    'updated_at': datetime.now()
                }
                
                await collection.update_one(
                    {"sensor_id": sensor_data["sensor_id"]},
                    {"$set": update_data}
                )
                
                existing_sensor.update(update_data)
                existing_sensor['_id'] = str(existing_sensor['_id'])
                return existing_sensor
            else:
                # Create new sensor
                sensor_data.update({
                    'id': str(uuid.uuid4()),
                    'last_reading': datetime.now(),
                    'created_at': datetime.now(),
                    'updated_at': datetime.now()
                })
                
                result = await collection.insert_one(sensor_data)
                sensor_data['_id'] = str(result.inserted_id)
                
                logger.info(f"✅ Sensor data created: {sensor_data['name']}")
                return sensor_data
        except Exception as e:
            logger.error(f"❌ Failed to create/update sensor data: {str(e)}")
            raise

    @staticmethod
    async def get_all_sensors() -> List[dict]:
        """Get all sensor data"""
        try:
            collection = await get_collection(db_config.SENSORS_COLLECTION)
            sensors = []
            async for sensor in collection.find({}).sort("last_reading", -1):
                sensor['_id'] = str(sensor['_id'])
                sensors.append(sensor)
            return sensors
        except Exception as e:
            logger.error(f"❌ Failed to get sensor data: {str(e)}")
            return []

    # Prediction Storage
    @staticmethod
    async def store_prediction(prediction_data: dict) -> dict:
        """Store ML prediction result"""
        try:
            collection = await get_collection(db_config.PREDICTIONS_COLLECTION)
            
            prediction_data.update({
                'id': str(uuid.uuid4()),
                'timestamp': datetime.now()
            })
            
            result = await collection.insert_one(prediction_data)
            prediction_data['_id'] = str(result.inserted_id)
            
            logger.info(f"✅ Prediction stored: {prediction_data['risk_level']}")
            return prediction_data
        except Exception as e:
            logger.error(f"❌ Failed to store prediction: {str(e)}")
            raise

    @staticmethod
    async def get_prediction_history(limit: int = 50) -> List[dict]:
        """Get prediction history"""
        try:
            collection = await get_collection(db_config.PREDICTIONS_COLLECTION)
            predictions = []
            async for prediction in collection.find({}).sort("timestamp", -1).limit(limit):
                prediction['_id'] = str(prediction['_id'])
                predictions.append(prediction)
            return predictions
        except Exception as e:
            logger.error(f"❌ Failed to get prediction history: {str(e)}")
            return []

    # Subscriber Management
    @staticmethod
    async def add_subscriber(subscriber_data: dict) -> dict:
        """Add a new subscriber"""
        try:
            collection = await get_collection(db_config.SUBSCRIBERS_COLLECTION)
            
            # Check if subscriber already exists
            existing = await collection.find_one({"email": subscriber_data["email"]})
            if existing:
                return {"error": "Subscriber already exists"}
            
            subscriber_data.update({
                'id': str(uuid.uuid4()),
                'subscribed_at': datetime.now(),
                'is_active': True
            })
            
            result = await collection.insert_one(subscriber_data)
            subscriber_data['_id'] = str(result.inserted_id)
            
            logger.info(f"✅ Subscriber added: {subscriber_data['email']}")
            return subscriber_data
        except Exception as e:
            logger.error(f"❌ Failed to add subscriber: {str(e)}")
            raise

    @staticmethod
    async def get_all_subscribers() -> List[dict]:
        """Get all subscribers"""
        try:
            collection = await get_collection(db_config.SUBSCRIBERS_COLLECTION)
            subscribers = []
            async for subscriber in collection.find({"is_active": True}):
                subscriber['_id'] = str(subscriber['_id'])
                subscribers.append(subscriber)
            return subscribers
        except Exception as e:
            logger.error(f"❌ Failed to get subscribers: {str(e)}")
            return []

    # Statistics
    @staticmethod
    async def get_system_stats() -> dict:
        """Get system statistics"""
        try:
            stats = {}
            
            # User stats
            users_collection = await get_collection(db_config.USERS_COLLECTION)
            stats['total_users'] = await users_collection.count_documents({})
            stats['active_users'] = await users_collection.count_documents({"is_active": True})
            
            # Alert stats
            alerts_collection = await get_collection(db_config.ALERTS_COLLECTION)
            stats['total_alerts'] = await alerts_collection.count_documents({})
            stats['active_alerts'] = await alerts_collection.count_documents({"status": "ACTIVE"})
            
            # SOS stats
            sos_collection = await get_collection(db_config.SOS_REQUESTS_COLLECTION)
            stats['total_sos_requests'] = await sos_collection.count_documents({})
            stats['pending_sos_requests'] = await sos_collection.count_documents({"status": "PENDING"})
            
            # Shelter stats
            shelters_collection = await get_collection(db_config.SHELTERS_COLLECTION)
            stats['total_shelters'] = await shelters_collection.count_documents({})
            stats['available_shelters'] = await shelters_collection.count_documents({"status": "AVAILABLE"})
            
            # Subscriber stats
            subscribers_collection = await get_collection(db_config.SUBSCRIBERS_COLLECTION)
            stats['total_subscribers'] = await subscribers_collection.count_documents({"is_active": True})
            
            stats['last_updated'] = datetime.now()
            
            return stats
        except Exception as e:
            logger.error(f"❌ Failed to get system stats: {str(e)}")
            return {}

    # Notification Management
    @staticmethod
    async def create_notification(notification_data: dict) -> dict:
        """Create a new notification"""
        try:
            collection = await get_collection(db_config.NOTIFICATIONS_COLLECTION)
            
            notification_data.update({
                'id': str(uuid.uuid4()),
                'timestamp': datetime.now(),
                'is_read': False,
                'read_at': None
            })
            
            result = await collection.insert_one(notification_data)
            notification_data['_id'] = str(result.inserted_id)
            
            logger.info(f"✅ Notification created: {notification_data['title']}")
            return notification_data
        except Exception as e:
            logger.error(f"❌ Failed to create notification: {str(e)}")
            raise

    @staticmethod
    async def get_user_notifications(user_id: str, limit: int = 20) -> List[dict]:
        """Get notifications for a specific user"""
        try:
            collection = await get_collection(db_config.NOTIFICATIONS_COLLECTION)
            notifications = []
            async for notification in collection.find({"user_id": user_id}).sort("timestamp", -1).limit(limit):
                notification['_id'] = str(notification['_id'])
                notifications.append(notification)
            return notifications
        except Exception as e:
            logger.error(f"❌ Failed to get user notifications: {str(e)}")
            return []