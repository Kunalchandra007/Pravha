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

# Import the FastAPI app from the backend module
from app_with_mongodb import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )
