#!/usr/bin/env python3
"""
Railway-compatible FastAPI app with SSL handling
"""

import os
import ssl
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Pravha API")

# Disable SSL verification for Railway (if needed)
if os.getenv("RAILWAY_ENVIRONMENT"):
    # Railway environment - disable SSL verification
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    os.environ["PYTHONHTTPSVERIFY"] = "0"

@app.get("/")
async def root():
    return {
        "message": "Pravha API is running!", 
        "status": "success",
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "local")
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "Pravha API is working",
        "port": os.environ.get("PORT", 8000),
        "ssl_disabled": os.getenv("PYTHONHTTPSVERIFY") == "0"
    }

@app.get("/test-mongodb")
async def test_mongodb():
    """Test MongoDB connection with SSL handling"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import ssl
        
        mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        
        # Create SSL context for Railway
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # Try connection with SSL disabled
        client = AsyncIOMotorClient(mongodb_url, ssl_context=ssl_context)
        
        # Test connection
        await client.admin.command('ping')
        
        return {
            "status": "success",
            "message": "MongoDB connection successful",
            "mongodb_url": mongodb_url
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"MongoDB connection failed: {str(e)}",
            "mongodb_url": os.getenv("MONGODB_URL", "not_set")
        }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting Pravha API on port {port}")
    print(f"🔒 SSL verification: {'disabled' if os.getenv('PYTHONHTTPSVERIFY') == '0' else 'enabled'}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
