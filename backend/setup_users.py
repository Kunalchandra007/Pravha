#!/usr/bin/env python3
"""
Setup script to create specific users for Pravha system
"""

import asyncio
import sys
import os

# Add backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from database_config import db_config
from database_service import DatabaseService

async def setup_users():
    """Setup specific users for the system"""
    try:
        # Connect to database
        await db_config.connect_to_mongo()
        print("✅ Connected to database")
        
        # Admin user data
        admin_data = {
            "name": "Government Administrator",
            "email": "admin@pravaha.com",
            "password": "admin12345",
            "role": "admin",
            "phone": "+91-11-2345-6789",
            "location": "New Delhi, India"
        }
        
        # Check if admin user already exists
        existing_admin = await DatabaseService.get_user_by_email("admin@pravaha.com")
        if existing_admin:
            print("✅ Admin user already exists: admin@pravaha.com")
        else:
            await DatabaseService.create_user(admin_data)
            print("✅ Created admin user: admin@pravaha.com / admin12345")
        
        # Normal user data
        user_data = {
            "name": "Citizen User",
            "email": "user@pravaha.com",
            "password": "user12345",
            "role": "user",
            "phone": "+91-11-9876-5432",
            "location": "Mumbai, India"
        }
        
        # Check if normal user already exists
        existing_user = await DatabaseService.get_user_by_email("user@pravaha.com")
        if existing_user:
            print("✅ Normal user already exists: user@pravaha.com")
        else:
            await DatabaseService.create_user(user_data)
            print("✅ Created normal user: user@pravaha.com / user12345")
        
        # List all users to verify
        print("\n📋 All users in database:")
        all_users = await DatabaseService.get_all_users()
        for user in all_users:
            name = user.get('name', 'Unknown')
            role = user.get('role', 'user')
            print(f"  - {user['email']} ({role}) - {name}")
        
        await db_config.close_mongo_connection()
        print("\n✅ User setup complete!")
        
    except Exception as e:
        print(f"❌ Setup failed: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(setup_users())
    sys.exit(0 if success else 1)