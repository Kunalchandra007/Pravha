#!/usr/bin/env python3
"""
Railway entry point for Pravha FastAPI application
This file helps Railway automatically detect and start the FastAPI app
"""

import sys
import os
import uvicorn

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    # Import the FastAPI app from the backend module
    from app_with_mongodb import app
    print("✅ Successfully imported FastAPI app")
except Exception as e:
    print(f"❌ Error importing app: {e}")
    # Create a simple fallback app for testing
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/")
    async def root():
        return {"message": "Pravha API - Import Error", "error": str(e)}
    
    @app.get("/health")
    async def health():
        return {"status": "unhealthy", "error": "Import failed"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting Pravha API on port {port}")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )
