#!/usr/bin/env python3
"""
Simple script to run the MongoDB server from the backend directory
"""

import uvicorn
import os
import sys

# Change to the backend directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)

# Add backend directory to Python path
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("🚀 Starting Pravha API with MongoDB from backend directory...")
    print(f"📁 Working directory: {os.getcwd()}")
    
    uvicorn.run(
        "app_with_mongodb:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )