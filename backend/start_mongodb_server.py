#!/usr/bin/env python3
"""
Startup script for Pravha API with MongoDB Integration
"""

import asyncio
import sys
import os
import subprocess
from pathlib import Path

# Add backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

def check_mongodb_connection():
    """Check if MongoDB is running and accessible"""
    try:
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        client.close()
        print("✅ MongoDB connection successful")
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {str(e)}")
        print("💡 Make sure MongoDB is running on localhost:27017")
        return False

def install_dependencies():
    """Install required dependencies"""
    try:
        print("📦 Installing MongoDB dependencies...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", "requirements_mongodb.txt"
        ])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {str(e)}")
        return False

def check_model_file():
    """Check if the ML model file exists"""
    model_path = Path("models/floodXgBoostV1.pkl")
    if model_path.exists():
        print("✅ ML model file found")
        return True
    else:
        print(f"❌ ML model file not found at {model_path}")
        print("💡 Make sure the model file is in the correct location")
        return False

def create_env_file():
    """Create environment file with default settings"""
    env_path = Path(".env")
    if not env_path.exists():
        env_content = """# Pravha API Environment Configuration
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=pravha_flood_management
SECRET_KEY=your-secret-key-change-in-production-please
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
"""
        with open(env_path, "w") as f:
            f.write(env_content)
        print("✅ Created .env file with default settings")
    else:
        print("✅ Environment file already exists")

async def initialize_database():
    """Initialize database with sample data"""
    try:
        from database_config import db_config
        from database_service import DatabaseService
        
        # Connect to database
        connected = await db_config.connect_to_mongo()
        if not connected:
            return False
        
        print("✅ Database connection established")
        
        # Check if admin user exists, create if not
        admin_user = await DatabaseService.get_user_by_email("admin@pravha.gov.in")
        if not admin_user:
            admin_data = {
                "name": "System Administrator",
                "email": "admin@pravha.gov.in",
                "password": "admin123",  # Change this in production!
                "role": "admin",
                "phone": "+91-11-2345-6789",
                "location": "New Delhi, India"
            }
            await DatabaseService.create_user(admin_data)
            print("✅ Default admin user created (admin@pravha.gov.in / admin123)")
        
        # Create sample shelter data
        shelters = await DatabaseService.get_all_shelters()
        if len(shelters) == 0:
            sample_shelters = [
                {
                    "name": "Central Community Center",
                    "address": "123 Main Street, City Center, New Delhi",
                    "location": [28.6139, 77.2090],
                    "coordinates": [28.6139, 77.2090],
                    "latitude": 28.6139,
                    "longitude": 77.2090,
                    "capacity": 200,
                    "current_occupancy": 45,
                    "contact": "John Manager",
                    "phone": "+91-11-2345-0123",
                    "facilities": ["Food", "Water", "Medical", "Family-Friendly"],
                    "status": "AVAILABLE",
                    "accessibility": True
                },
                {
                    "name": "Sports Complex Shelter",
                    "address": "456 Sports Ave, North District, New Delhi",
                    "location": [28.6500, 77.2500],
                    "coordinates": [28.6500, 77.2500],
                    "latitude": 28.6500,
                    "longitude": 77.2500,
                    "capacity": 500,
                    "current_occupancy": 120,
                    "contact": "Sarah Director",
                    "phone": "+91-11-2345-0456",
                    "facilities": ["Food", "Water", "Pet-Friendly"],
                    "status": "AVAILABLE",
                    "accessibility": True
                },
                {
                    "name": "School Emergency Shelter",
                    "address": "789 Education Blvd, South Area, New Delhi",
                    "location": [28.5800, 77.1800],
                    "coordinates": [28.5800, 77.1800],
                    "latitude": 28.5800,
                    "longitude": 77.1800,
                    "capacity": 150,
                    "current_occupancy": 30,
                    "contact": "Mike Principal",
                    "phone": "+91-11-2345-0789",
                    "facilities": ["Food", "Water", "Family-Friendly"],
                    "status": "AVAILABLE",
                    "accessibility": True
                },
                {
                    "name": "Community Relief Center",
                    "address": "Connaught Place, New Delhi",
                    "location": [28.6315, 77.2167],
                    "coordinates": [28.6315, 77.2167],
                    "latitude": 28.6315,
                    "longitude": 77.2167,
                    "capacity": 150,
                    "current_occupancy": 80,
                    "contact": "Emergency Coordinator",
                    "phone": "+91-11-2345-0900",
                    "facilities": ["Food", "Water", "First Aid"],
                    "status": "AVAILABLE",
                    "accessibility": True
                },
                {
                    "name": "Flood Relief Camp",
                    "address": "India Gate Area, New Delhi",
                    "location": [28.6129, 77.2295],
                    "coordinates": [28.6129, 77.2295],
                    "latitude": 28.6129,
                    "longitude": 77.2295,
                    "capacity": 300,
                    "current_occupancy": 120,
                    "contact": "Relief Coordinator",
                    "phone": "+91-11-2345-0901",
                    "facilities": ["Food", "Water", "Medical", "Transport"],
                    "status": "AVAILABLE",
                    "accessibility": True
                }
            ]
            
            for shelter_data in sample_shelters:
                await DatabaseService.create_shelter(shelter_data)
            
            print(f"✅ Created {len(sample_shelters)} sample shelters")
        
        await db_config.close_mongo_connection()
        print("✅ Database initialization complete")
        return True
        
    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        return False

def main():
    """Main startup function"""
    print("🚀 Starting Pravha API with MongoDB Integration")
    print("=" * 50)
    
    # Check prerequisites
    print("🔍 Checking prerequisites...")
    
    # Check MongoDB connection
    if not check_mongodb_connection():
        print("\n💡 To start MongoDB:")
        print("   - Windows: Start MongoDB service or run 'mongod'")
        print("   - macOS: brew services start mongodb-community")
        print("   - Linux: sudo systemctl start mongod")
        return False
    
    # Check model file
    if not check_model_file():
        return False
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Create environment file
    create_env_file()
    
    # Initialize database
    print("\n🗄️ Initializing database...")
    if not asyncio.run(initialize_database()):
        return False
    
    print("\n" + "=" * 50)
    print("✅ All checks passed! Starting the API server...")
    print("🌐 API will be available at: http://localhost:8002")
    print("📚 API Documentation: http://localhost:8002/docs")
    print("🔧 Admin Panel: Use admin@pravha.gov.in / admin123")
    print("=" * 50)
    
    # Start the server
    try:
        import uvicorn
        import os
        
        # Change to backend directory to fix import issues
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(backend_dir)
        print(f"📁 Changed working directory to: {os.getcwd()}")
        
        uvicorn.run(
            "app_with_mongodb:app",
            host="0.0.0.0",
            port=8002,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server failed to start: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)