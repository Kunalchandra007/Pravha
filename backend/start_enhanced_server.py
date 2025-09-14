#!/usr/bin/env python3
"""
Enhanced Pravha Server Startup Script
Starts the server with all enhanced features and performs initial checks
"""

import os
import sys
import subprocess
import time
import requests

def check_dependencies():
    """Check if all required packages are installed"""
    required_packages = [
        'fastapi', 'uvicorn', 'numpy', 'joblib', 
        'pydantic', 'python-multipart'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"❌ Missing packages: {', '.join(missing)}")
        print("📦 Install with: pip install " + " ".join(missing))
        return False
    
    print("✅ All dependencies installed")
    return True

def check_model_files():
    """Check if ML model files exist"""
    model_files = [
        "models/floodXgBoostV1.pkl",
        "models/floodNN.pt"
    ]
    
    missing = []
    for model_file in model_files:
        if not os.path.exists(model_file):
            missing.append(model_file)
    
    if missing:
        print(f"❌ Missing model files: {', '.join(missing)}")
        print("🔧 Make sure model files are in the models/ directory")
        return False
    
    print("✅ Model files found")
    return True

def check_email_config():
    """Check if email configuration exists"""
    try:
        from email_config import get_email_config
        config = get_email_config()
        if config["sender_email"] and config["sender_password"]:
            print("✅ Email configuration found")
            return True
        else:
            print("⚠️  Email configuration incomplete")
            return False
    except Exception as e:
        print(f"⚠️  Email configuration issue: {e}")
        return False

def start_server():
    """Start the enhanced Pravha server"""
    print("🚀 Starting Enhanced Pravha Server...")
    print("📍 Location-based predictions enabled")
    print("🗺️  Dynamic GIS mapping active")
    print("📧 Real-time alert system ready")
    print("🔄 Enhanced API endpoints loaded")
    print()
    
    try:
        # Import and run the app
        from app_with_alerts import app
        import uvicorn
        
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8002,
            log_level="info",
            reload=False  # Disable reload for production-like behavior
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

def test_server_health():
    """Test if server is responding"""
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            response = requests.get("http://localhost:8002/health", timeout=2)
            if response.status_code == 200:
                print("✅ Server health check passed")
                return True
        except:
            pass
        
        if attempt < max_attempts - 1:
            print(f"⏳ Waiting for server... ({attempt + 1}/{max_attempts})")
            time.sleep(1)
    
    print("❌ Server health check failed")
    return False

def main():
    print("🌊 Pravha Enhanced Server Startup")
    print("=" * 40)
    
    # Pre-flight checks
    print("🔍 Running pre-flight checks...")
    
    if not check_dependencies():
        sys.exit(1)
    
    if not check_model_files():
        print("⚠️  Continuing without some model files...")
    
    check_email_config()
    
    print("\n🎯 All systems ready!")
    print("📊 Enhanced features:")
    print("   • Dynamic flood zone generation")
    print("   • Real-time sensor simulation")
    print("   • Location-based ML predictions")
    print("   • Bulk prediction capabilities")
    print("   • Incident reporting system")
    print("   • Evacuation center mapping")
    print("   • Enhanced alert system")
    
    print("\n🌐 API will be available at:")
    print("   • Main API: http://localhost:8002")
    print("   • Documentation: http://localhost:8002/docs")
    print("   • Health Check: http://localhost:8002/health")
    print("   • System Status: http://localhost:8002/system/status")
    
    print("\n🚀 Starting server in 3 seconds...")
    time.sleep(3)
    
    start_server()

if __name__ == "__main__":
    main()